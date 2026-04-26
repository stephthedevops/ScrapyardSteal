import { Room, Client } from "colyseus";
import { GameState, Player, Tile } from "../state/GameState";
import {
  calculateGridSize,
  initializeGrid,
  assignStartingPositions,
  isAdjacent,
  spawnNewGears,
} from "../logic/GridManager";
import {
  calculateTileClaimCost,
  calculateUpgradeCost,
  calculateAttackPressure,
  findBorders,
  resolveBorder,
} from "../logic/ConflictEngine";
import { generateAIName } from "../logic/aiNames";
import { sanitizeName } from "../logic/sanitize";
import {
  RATE_LIMIT_MS,
  BASE_TILE_DEFENSE,
  DEFENSE_PER_BOT,
  MAX_DEFENSE_BOTS_PER_TILE,
  BASE_MINE_EXTRACT,
  MAX_STAT_VALUE,
  GEAR_RESPAWN_DELAY_SECONDS,
  GEAR_CAP_BASE,
  SOLO_TEAM_TICKS_TO_WIN,
  MAX_AI_PLAYERS,
  AI_SURRENDER_DELAY_MS,
  CAPTURE_CHOICE_TIMEOUT_MS,
  GAME_TICK_MS,
  BATTLE_TICK_MS,
  ATTACKER_ATTRITION_THRESHOLD,
  ATTACKER_ATTRITION_CHANCE,
  DEFENSE_BOT_THRESHOLDS,
  DEFENSE_BOT_REPAIR_CHANCE,
  CAPTURE_SCRAP_BONUS_PERCENT,
  SERIES_ROUND_DELAY_MS,
} from "../config/gameConfig";

// Allowed color palette — first 10 are base, next 10 are extended (20-player mode)
export const BASE_COLORS = [
  0xb87333, 0x4a8a5e, 0xffd700, 0x8b5a2b, 0x7a3ea0,
  0x0047ab, 0xff00ff, 0xff3b30, 0xdbe4eb, 0x36454f,
];
export const EXTENDED_COLORS = [
  0xcda434, 0x00e5ff, 0xe8a0bf, 0x5c6670, 0xa8a495,
  0xff375f, 0x4682b4, 0xff6b35, 0x32d74b, 0x6b4226,
];
export const ALL_COLORS = [...BASE_COLORS, ...EXTENDED_COLORS];

export class GameRoom extends Room<GameState> {
  maxClients = 20;
  private gameLoopInterval: ReturnType<typeof this.clock.setInterval> | null = null;
  private battleTickInterval: ReturnType<typeof this.clock.setInterval> | null = null;
  private hostId: string = "";
  private soloTeamTicks: number = 0;
  private gearRespawnCountdown: number = -1;
  private gearSpawnTimer: number = 0;
  private seriesScores: Map<string, number> = new Map();
  private configuredTimeLimit: number = 300;

  /** Active battles: key = "x,y" of the tile being attacked, value = battle info */
  private activeBattles: Map<string, { attackerId: string; tileX: number; tileY: number; currentDefense: number; damageDealt: number }> = new Map();

  /** Pending absorption timers: key = playerId, value = clock timeout reference */
  private pendingTimers: Map<string, ReturnType<typeof this.clock.setTimeout>> = new Map();

  /** Rate limiting: track last action timestamp per player per action type */
  private lastActionTime: Map<string, Map<string, number>> = new Map();

  /** Check if an action is rate-limited for a player. Returns true if allowed. */
  private checkRateLimit(sessionId: string, action: string): boolean {
    const now = Date.now();
    let playerActions = this.lastActionTime.get(sessionId);
    if (!playerActions) {
      playerActions = new Map();
      this.lastActionTime.set(sessionId, playerActions);
    }
    const lastTime = playerActions.get(action) ?? 0;
    if (now - lastTime < RATE_LIMIT_MS) return false;
    playerActions.set(action, now);
    return true;
  }

  /** Global map of shortCode → roomId for lookups */
  static shortCodeMap = new Map<string, string>();
  /** Set of shortCodes that are public and waiting */
  static publicRooms = new Set<string>();
  /** Track player counts per shortCode for the public list endpoint */
  static playerCounts = new Map<string, number>();

  private static generateShortCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  onCreate() {
    this.setState(new GameState());
    this.state.phase = "waiting";

    // Generate unique 5-char short code
    let code = GameRoom.generateShortCode();
    while (GameRoom.shortCodeMap.has(code)) {
      code = GameRoom.generateShortCode();
    }
    this.state.shortCode = code;
    GameRoom.shortCodeMap.set(code, this.roomId);

    console.log(`GameRoom created — code: ${code}, roomId: ${this.roomId}`);

    // --- Message Handlers ---

    this.onMessage("claimTile", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "claimTile")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.pendingAbsorption) return;

      // Determine the team leader — if absorbed, act on behalf of team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) return;

      const { x, y } = data;

      // Bounds check
      if (x < 0 || x >= this.state.gridWidth || y < 0 || y >= this.state.gridHeight) return;
      const tile = this.state.tiles.find((t) => t.x === x && t.y === y);
      if (!tile || tile.ownerId !== "") return;

      // Gather leader's owned tiles for adjacency check
      const leaderTiles = this.state.tiles.filter(
        (t) => t.ownerId === leader.id
      );
      if (!isAdjacent(x, y, leaderTiles)) return;

      // Calculate cost and validate leader's resources
      const cost = calculateTileClaimCost(leader.tileCount);
      if (leader.resources < cost) return;

      // Apply the claim for the leader
      leader.resources -= cost;
      tile.ownerId = leader.id;
      leader.tileCount += 1;

      // Factory adjective transfer — when claiming a spawn tile
      if (tile.isSpawn) {
        this.transferFactoryAdjective(tile, leader.id);
      }
    });

    this.onMessage("upgradeAttack", (client) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "upgradeAttack")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed || !player.isTeamLead) return;
      if (player.pendingAbsorption) return;

      const cost = calculateUpgradeCost(player.attack);      if (player.resources < cost) return;
      if (player.attack >= MAX_STAT_VALUE) return; // max cap

      player.resources -= cost;
      player.attack += 1;
    });

    this.onMessage("upgradeDefense", (client) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "upgradeDefense")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.pendingAbsorption) return;

      // Members can buy DEF bots — resolve to team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) return;

      const cost = calculateUpgradeCost(leader.defense);
      if (leader.resources < cost) return;
      if (leader.defense >= MAX_STAT_VALUE) return; // max cap

      leader.resources -= cost;
      leader.defense += 1;

      // Give one defense bot to every team member too
      this.state.players.forEach((p) => {
        if (p.id !== leader.id && p.teamId === leader.id) {
          p.defense += 1;
        }
      });
    });

    // Place a defense bot (🛡) on a tile the player's team owns (max 4 per tile)
    this.onMessage("placeDefenseBot", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "placeDefenseBot")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.pendingAbsorption) return;

      // Determine the team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) return;

      // Bounds check
      if (data.x < 0 || data.x >= this.state.gridWidth || data.y < 0 || data.y >= this.state.gridHeight) return;

      const tile = this.state.tiles.find((t) => t.x === data.x && t.y === data.y);
      if (!tile) return;

      // Tile must be owned by the team leader
      if (tile.ownerId !== leader.id) return;

      // Parse existing defense bots
      let defenseBots: { x: number; y: number }[] = [];
      try { defenseBots = JSON.parse(leader.defenseBotsJSON); } catch { defenseBots = []; }

      // Count bots already on this tile (max 4)
      const botsOnTile = defenseBots.filter((b) => b.x === data.x && b.y === data.y).length;
      if (botsOnTile >= MAX_DEFENSE_BOTS_PER_TILE) return;

      // Must have available defense bots (defense count > placed count)
      if (defenseBots.length >= leader.defense) return;

      defenseBots.push({ x: data.x, y: data.y });
      leader.defenseBotsJSON = JSON.stringify(defenseBots);
    });

    // Attack an enemy border tile — initiates a battle
    this.onMessage("attackTile", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "attackTile")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;
      if (player.pendingAbsorption) return;

      // Only team leaders can attack
      if (!player.isTeamLead) return;

      // Must own at least one factory to attack
      let hasFactory = false;
      this.state.tiles.forEach((t) => {
        if (t.isSpawn && t.ownerId === player.id) hasFactory = true;
      });
      if (!hasFactory) return;

      // Bounds check
      if (data.x < 0 || data.x >= this.state.gridWidth || data.y < 0 || data.y >= this.state.gridHeight) return;

      const tile = this.state.tiles.find((t) => t.x === data.x && t.y === data.y);
      if (!tile) return;

      // Tile must be owned by an enemy
      if (tile.ownerId === "" || tile.ownerId === player.id) return;

      // Tile must be adjacent to attacker's territory
      const attackerTiles = this.state.tiles.filter((t) => t.ownerId === player.id);
      if (!isAdjacent(data.x, data.y, attackerTiles)) return;

      const key = `${data.x},${data.y}`;

      // If this specific tile is already being attacked by this player, ignore
      const existing = this.activeBattles.get(key);
      if (existing && existing.attackerId === player.id) return;

      // Limit simultaneous attacks to 1 (team leader) + ATK bot count
      let activeBattleCount = 0;
      for (const [, battle] of this.activeBattles) {
        if (battle.attackerId === player.id) activeBattleCount++;
      }
      if (activeBattleCount >= 1 + player.attack) return;

      // Calculate tile's current defense: base 5 + 5 per defense bot on this tile
      const defender = this.state.players.get(tile.ownerId);
      let tileDefense = BASE_TILE_DEFENSE;
      if (defender) {
        let defenseBots: { x: number; y: number }[] = [];
        try { defenseBots = JSON.parse(defender.defenseBotsJSON); } catch { defenseBots = []; }
        const botsOnTile = defenseBots.filter((b) => b.x === data.x && b.y === data.y).length;
        tileDefense = BASE_TILE_DEFENSE + botsOnTile * DEFENSE_PER_BOT;
      }

      this.activeBattles.set(key, {
        attackerId: player.id,
        tileX: data.x,
        tileY: data.y,
        currentDefense: tileDefense,
        damageDealt: 0,
      });

      // Broadcast battle flash to all clients
      this.broadcast("battleFlash", { x: data.x, y: data.y, attackerId: player.id });
    });

    // Purchase a collection bot — gives one to every team member
    this.onMessage("upgradeCollection", (client) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "upgradeCollection")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.pendingAbsorption) return;

      // Members can buy COL bots — resolve to team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) return;

      const cost = calculateUpgradeCost(leader.collection);
      if (leader.resources < cost) return;
      if (leader.collection >= MAX_STAT_VALUE) return; // max cap

      leader.resources -= cost;
      leader.collection += 1;

      // Give one collection bot to every team member too
      this.state.players.forEach((p) => {
        if (p.id !== leader.id && p.teamId === leader.id) {
          p.collection += 1;
        }
      });
    });

    // Place a collector (⚒) on a tile the player's team owns (spawn or gear tile)
    this.onMessage("placeCollector", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      if (!this.checkRateLimit(client.sessionId, "placeCollector")) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.pendingAbsorption) return;

      // Determine the team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) return;

      // Bounds check
      if (data.x < 0 || data.x >= this.state.gridWidth || data.y < 0 || data.y >= this.state.gridHeight) return;

      const tile = this.state.tiles.find((t) => t.x === data.x && t.y === data.y);
      if (!tile) return;

      // Tile must be owned by the team leader
      if (tile.ownerId !== leader.id) return;

      // Tile must be a spawn or gear tile
      if (!tile.isSpawn && !tile.hasGear) return;

      // Parse existing collectors
      let collectors: { x: number; y: number }[] = [];
      try { collectors = JSON.parse(leader.collectorsJSON); } catch { collectors = []; }

      // Check if already placed here
      if (collectors.some((c) => c.x === data.x && c.y === data.y)) return;

      // Must have available collectors (collection count > placed count)
      if (collectors.length >= leader.collection) return;

      collectors.push({ x: data.x, y: data.y });
      leader.collectorsJSON = JSON.stringify(collectors);
    });

    // Mine scrap from a gear tile
    this.onMessage("mineGear", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") { console.log("[mineGear] rejected: phase =", this.state.phase); return; }
      if (!this.checkRateLimit(client.sessionId, "mineGear")) { console.log("[mineGear] rejected: rate limited"); return; }
      const player = this.state.players.get(client.sessionId);
      if (!player) { console.log("[mineGear] rejected: no player"); return; }
      if (player.pendingAbsorption) { console.log("[mineGear] rejected: pendingAbsorption"); return; }

      // Determine the team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) { console.log("[mineGear] rejected: absorbed leader issue"); return; }
        leader = teamLeader;
      }
      if (leader.pendingAbsorption) { console.log("[mineGear] rejected: leader pendingAbsorption"); return; }

      // Bounds check
      if (data.x < 0 || data.x >= this.state.gridWidth || data.y < 0 || data.y >= this.state.gridHeight) { console.log("[mineGear] rejected: out of bounds", data); return; }

      const tile = this.state.tiles.find((t) => t.x === data.x && t.y === data.y);
      if (!tile || !tile.hasGear || tile.gearScrap <= 0) { console.log("[mineGear] rejected: no gear tile at", data, "tile:", tile ? { hasGear: tile.hasGear, gearScrap: tile.gearScrap } : "null"); return; }

      // Only mine if tile is unclaimed or owned by the team leader
      if (tile.ownerId !== "" && tile.ownerId !== leader.id) { console.log("[mineGear] rejected: ownership mismatch, tile owner:", tile.ownerId, "leader:", leader.id); return; }

      // Count factories (spawn tiles) owned by the team leader
      let factoryCount = 0;
      this.state.tiles.forEach((t) => {
        if (t.isSpawn && t.ownerId === leader.id) factoryCount++;
      });
      const multiplier = Math.max(1, factoryCount);

      // Extract scrap = 5 × factory multiplier, capped by remaining gearScrap
      const baseExtract = BASE_MINE_EXTRACT * multiplier;
      const extracted = Math.min(baseExtract, tile.gearScrap);
      tile.gearScrap = Math.max(0, tile.gearScrap - extracted);
      leader.resources += extracted;
      console.log("[mineGear] SUCCESS: extracted", extracted, "scrap for", leader.id, "at", data, "remaining:", tile.gearScrap, "total resources:", leader.resources);
      if (tile.gearScrap <= 0) {
        tile.hasGear = false;
      }
    });

    // Host starts the game
    this.onMessage("startGame", (client) => {
      if (this.state.phase !== "waiting") return;
      if (client.sessionId !== this.hostId) return;
      if (this.state.players.size < 1) return;

      // Validate all players have unique names
      const adjs = new Set<string>();
      const nouns = new Set<string>();
      let hasDuplicate = false;
      let hasEmpty = false;

      this.state.players.forEach((p) => {
        if (!p.nameAdj || !p.nameNoun) { hasEmpty = true; return; }
        if (adjs.has(p.nameAdj) || nouns.has(p.nameNoun)) { hasDuplicate = true; }
        adjs.add(p.nameAdj);
        nouns.add(p.nameNoun);
      });

      if (hasEmpty) {
        client.send("startError", { message: "All players must have a name" });
        return;
      }
      if (hasDuplicate) {
        client.send("startError", { message: "Duplicate names detected — players must reroll" });
        return;
      }

      this.startGame();
    });

    // Player sets their name (adj + noun) — reject if adj or noun already taken
    this.onMessage("setName", (client, data: { adj: string; noun: string }) => {
      if (this.state.phase !== "waiting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const adj = sanitizeName((data.adj || "").slice(0, 16));
      const noun = sanitizeName((data.noun || "").slice(0, 16));

      // Reject if either field is empty after sanitization
      if (adj === "" || noun === "") {
        client.send("nameRejected", { adj, noun, adjTaken: false, nounTaken: false });
        return;
      }

      // Check for duplicates among other players
      let adjTaken = false;
      let nounTaken = false;
      this.state.players.forEach((p, key) => {
        if (key === client.sessionId) return;
        if (p.nameAdj === adj) adjTaken = true;
        if (p.nameNoun === noun) nounTaken = true;
      });

      if (adjTaken || nounTaken) {
        // Notify client the name was rejected
        client.send("nameRejected", { adj, noun, adjTaken, nounTaken });
        return;
      }

      player.nameAdj = adj;
      player.nameNoun = noun;
      player.teamName = `${adj} ${noun}`;
    });

    // Host toggles public/private
    this.onMessage("togglePublic", (client) => {
      if (this.state.phase !== "waiting") return;
      if (client.sessionId !== this.hostId) return;
      this.state.isPublic = !this.state.isPublic;
      if (this.state.isPublic) {
        GameRoom.publicRooms.add(this.state.shortCode);
      } else {
        GameRoom.publicRooms.delete(this.state.shortCode);
      }
    });

    /** Get the currently allowed colors based on maxPlayers setting */
    const getAllowedColors = () => {
      return this.state.maxPlayers >= 20 ? ALL_COLORS : BASE_COLORS;
    };

    // Player selects a color
    this.onMessage("selectColor", (client, data: { color: number }) => {
      if (this.state.phase !== "waiting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Validate color is in allowed palette (based on maxPlayers)
      const allowedColors = getAllowedColors();
      if (!allowedColors.includes(data.color)) return;

      // Check if color is already taken by another player
      let taken = false;
      this.state.players.forEach((p, key) => {
        if (key !== client.sessionId && p.color === data.color) {
          taken = true;
        }
      });
      if (taken) return;

      player.color = data.color;
    });

    // Host configures match settings (time limit, match format, gear scrap, max players)
    this.onMessage("setConfig", (client, data: { timeLimit?: number; matchFormat?: string; gearScrapSupply?: number; maxPlayers?: number }) => {
      if (this.state.phase !== "waiting") return;
      if (client.sessionId !== this.hostId) return;

      const ALLOWED_TIMES = [0, 120, 300, 420, 600];
      if (data.timeLimit !== undefined && ALLOWED_TIMES.includes(data.timeLimit)) {
        this.state.timeRemaining = data.timeLimit;
      }

      const ALLOWED_FORMATS = ["single", "bo3", "bo5"];
      if (data.matchFormat !== undefined && ALLOWED_FORMATS.includes(data.matchFormat)) {
        this.state.matchFormat = data.matchFormat;
      }

      const ALLOWED_SCRAP_VALUES = [50, 100, 500, 1000, 2000];
      if (data.gearScrapSupply !== undefined && ALLOWED_SCRAP_VALUES.includes(data.gearScrapSupply)) {
        this.state.gearScrapSupply = data.gearScrapSupply;
      }

      const ALLOWED_MAX_PLAYERS = [10, 20];
      if (data.maxPlayers !== undefined && ALLOWED_MAX_PLAYERS.includes(data.maxPlayers)) {
        this.state.maxPlayers = data.maxPlayers;
        // Reset any extended colors that are no longer valid when switching to 10
        if (data.maxPlayers === 10) {
          const baseColors = BASE_COLORS;
          this.state.players.forEach((p) => {
            if (p.color >= 0 && !baseColors.includes(p.color)) {
              p.color = -1; // reset to unselected
            }
          });
        }
      }
    });

    // Host adds an AI player
    this.onMessage("addAI", (client, data: { color: number }) => {
      if (this.state.phase !== "waiting") return;
      if (client.sessionId !== this.hostId) return;

      // Count existing AI players
      let aiCount = 0;
      this.state.players.forEach((p) => { if (p.isAI) aiCount++; });
      if (aiCount >= MAX_AI_PLAYERS) return;

      // Auto-assign color from the allowed palette
      const aiColor = this.getNextAvailableColor();
      if (aiColor === -1) return; // no colors available

      // Generate AI name avoiding duplicates
      const taken = this.getTakenNames();
      const aiName = generateAIName(taken.adjs, taken.nouns);

      const aiId = `ai_${Date.now()}_${aiCount}`;
      const player = new Player();
      player.id = aiId;
      player.isAI = true;
      player.color = aiColor;
      player.nameAdj = aiName.adj;
      player.nameNoun = aiName.noun;
      player.teamName = `${aiName.adj} ${aiName.noun}`;
      player.teamId = aiId;
      player.isTeamLead = true;
      this.state.players.set(aiId, player);
    });

    // Host removes an AI player
    this.onMessage("removeAI", (client, data: { aiPlayerId: string }) => {
      if (this.state.phase !== "waiting") return;
      if (client.sessionId !== this.hostId) return;
      const player = this.state.players.get(data.aiPlayerId);
      if (!player || !player.isAI) return;
      this.state.players.delete(data.aiPlayerId);
    });

    // Player responds to capture choice (surrender or drop)
    this.onMessage("captureResponse", (client, data: { choice: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (!player.pendingAbsorption) return;

      // Validate choice
      if (data.choice !== "surrender" && data.choice !== "drop") return;

      this.resolveCapture(client.sessionId, data.choice as "surrender" | "drop");
    });

    // Player voluntarily leaves — convert to AI takeover
    this.onMessage("leaveGame", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Append "roid" to the noun (e.g. "Falconbot" → "Falconbotroid")
      player.nameNoun = player.nameNoun + "roid";
      player.teamName = `${player.nameAdj} ${player.nameNoun}`;

      // Update team members' names if this player is a team lead
      if (player.isTeamLead) {
        this.state.players.forEach((p) => {
          if (p.teamId === player.id && p.id !== player.id) {
            p.teamName = player.teamName;
          }
        });
      }

      // Convert to AI — the game loop's AI tick will take over
      const aiId = `ai_${client.sessionId}`;
      player.id = aiId;
      player.isAI = true;
      player.teamId = player.absorbed ? player.teamId : aiId;

      // Re-map tiles to the new AI id
      this.state.tiles.forEach((tile) => {
        if (tile.ownerId === client.sessionId) {
          tile.ownerId = aiId;
        }
      });

      // Re-map team members pointing to this player
      this.state.players.forEach((p) => {
        if (p.teamId === client.sessionId) {
          p.teamId = aiId;
        }
      });

      // Move the player entry to the new AI key
      this.state.players.delete(client.sessionId);
      this.state.players.set(aiId, player);

      console.log(`${client.sessionId} left voluntarily — AI takeover as ${aiId}`);
    });
  }

  onJoin(client: Client) {
    // Enforce max player limit
    if (this.state.players.size >= this.state.maxPlayers) {
      client.leave();
      return;
    }

    const player = new Player();
    player.id = client.sessionId;
    player.teamId = client.sessionId; // starts as own team lead
    player.isTeamLead = true;
    player.resources = 0;
    player.attack = 1;
    player.defense = 0;
    player.tileCount = 1;
    player.absorbed = false;
    player.color = -1;
    player.color = this.getNextAvailableColor();
    player.nameAdj = "";
    player.nameNoun = "";
    player.teamName = "";

    // First player to join becomes the host
    if (this.state.players.size === 0) {
      this.hostId = client.sessionId;
      this.state.hostId = client.sessionId;
      player.isHost = true;
    }

    this.state.players.set(client.sessionId, player);
    GameRoom.playerCounts.set(this.state.shortCode, this.state.players.size);
    console.log(`${client.sessionId} joined (host: ${client.sessionId === this.hostId})`);
  }

  onLeave(client: Client) {
    // Clean up rate limit tracking
    this.lastActionTime.delete(client.sessionId);

    // Convert all of the leaving player's tiles to neutral
    this.state.tiles.forEach((tile) => {
      if (tile.ownerId === client.sessionId) {
        tile.ownerId = "";
      }
    });

    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.tileCount = 0;
    }

    // If the leaving player is a captor for any pending player, resolve as "drop"
    this.state.players.forEach((p) => {
      if (p.pendingAbsorption && p.captorId === client.sessionId) {
        this.resolveCapture(p.id, "drop");
      }
    });

    // Also clear any pending timer for the leaving player themselves
    const pendingTimer = this.pendingTimers.get(client.sessionId);
    if (pendingTimer) {
      pendingTimer.clear();
      this.pendingTimers.delete(client.sessionId);
    }

    this.state.players.delete(client.sessionId);
    GameRoom.playerCounts.set(this.state.shortCode, this.state.players.size);

    // If the host left during waiting, assign a new host
    if (client.sessionId === this.hostId && this.state.phase === "waiting") {
      const nextKey = this.state.players.keys().next().value;
      if (nextKey) {
        this.hostId = nextKey;
        this.state.hostId = nextKey;
        const nextHost = this.state.players.get(nextKey);
        if (nextHost) nextHost.isHost = true;
      }
    }

    console.log(`${client.sessionId} left`);
  }

  onDispose() {
    if (this.gameLoopInterval) {
      this.gameLoopInterval.clear();
      this.gameLoopInterval = null;
    }
    if (this.battleTickInterval) {
      this.battleTickInterval.clear();
      this.battleTickInterval = null;
    }
    // Clear all pending absorption timers
    for (const [, timer] of this.pendingTimers) {
      timer.clear();
    }
    this.pendingTimers.clear();

    GameRoom.shortCodeMap.delete(this.state.shortCode);
    GameRoom.publicRooms.delete(this.state.shortCode);
    GameRoom.playerCounts.delete(this.state.shortCode);
    console.log("GameRoom disposed");
  }

  /**
   * Handle adjective transfer when a factory (spawn) tile changes hands.
   * Removes the factory's adjective from the losing team's name and
   * prepends it to the gaining team's name.
   */
  private transferFactoryAdjective(tile: Tile, newOwnerId: string): void {
    if (!tile.isSpawn) return;

    // Find the player whose spawn point this factory is
    let originalOwner: Player | undefined;
    this.state.players.forEach((p) => {
      if (p.spawnX === tile.x && p.spawnY === tile.y) {
        originalOwner = p;
      }
    });
    if (!originalOwner) return;

    const adj = originalOwner.nameAdj;
    if (!adj) return;

    // Determine which team currently "holds" this adjective.
    // The adjective belongs to whichever team the original owner is on.
    const currentTeamLeaderId = originalOwner.absorbed ? originalOwner.teamId : originalOwner.id;
    const currentTeamLeader = this.state.players.get(currentTeamLeaderId);

    // Remove the adjective from the current team's name (if it's a different team)
    if (currentTeamLeader && currentTeamLeaderId !== newOwnerId) {
      // Try removing "adj " first (adjective with trailing space)
      const withSpace = adj + " ";
      if (currentTeamLeader.teamName.includes(withSpace)) {
        currentTeamLeader.teamName = currentTeamLeader.teamName.replace(withSpace, "");
      } else if (currentTeamLeader.teamName.startsWith(adj)) {
        // Edge case: adjective is the entire prefix with no trailing space
        currentTeamLeader.teamName = currentTeamLeader.teamName.slice(adj.length).trimStart();
      }
      // Propagate to all team members
      this.state.players.forEach((p) => {
        if (p.teamId === currentTeamLeaderId) {
          p.teamName = currentTeamLeader.teamName;
        }
      });
    }

    // Transfer the original owner to the new team
    originalOwner.teamId = newOwnerId;
    originalOwner.absorbed = true;

    // Add the adjective to the new team's name
    const newLeader = this.state.players.get(newOwnerId);
    if (newLeader) {
      const alreadyHasAdj = newLeader.teamName.split(" ").includes(adj);
      if (!alreadyHasAdj) {
        newLeader.teamName = `${adj} ${newLeader.teamName}`;
      }
      // Propagate to all team members (including the just-transferred original owner)
      this.state.players.forEach((p) => {
        if (p.teamId === newOwnerId && p.id !== newOwnerId) {
          p.teamName = newLeader.teamName;
        }
      });
    }

    // Broadcast factory capture
    this.broadcast("factoryCaptured", {
      claimingTeamName: newLeader?.teamName || "",
      factoryAdj: adj,
    });
  }

  private enterPendingAbsorption(defenderId: string, captorId: string): void {
    const defender = this.state.players.get(defenderId);
    if (!defender) return;

    const captor = this.state.players.get(captorId);
    if (!captor) return;

    // Set pending state
    defender.pendingAbsorption = true;
    defender.captorId = captorId;
    defender.isTeamLead = false;

    // Cancel all active battles where the pending player is the attacker
    const toCancel: string[] = [];
    for (const [key, battle] of this.activeBattles) {
      if (battle.attackerId === defenderId) {
        toCancel.push(key);
      }
    }
    for (const key of toCancel) {
      this.activeBattles.delete(key);
    }

    if (defender.isAI) {
      // AI auto-surrenders after 2 seconds
      const timer = this.clock.setTimeout(() => {
        this.resolveCapture(defenderId, "surrender");
      }, AI_SURRENDER_DELAY_MS);
      this.pendingTimers.set(defenderId, timer);
    } else {
      // Send choice prompt to the human player's client
      const client = this.clients.find(c => c.sessionId === defenderId);
      if (client) {
        client.send("captureChoice", {
          captorTeamName: captor.teamName,
          timeoutSeconds: 10,
        });
      }
      // Start 10-second timeout — auto-resolves as "drop"
      const timer = this.clock.setTimeout(() => {
        this.resolveCapture(defenderId, "drop");
      }, CAPTURE_CHOICE_TIMEOUT_MS);
      this.pendingTimers.set(defenderId, timer);
    }
  }

  private resolveCapture(pendingPlayerId: string, choice: "surrender" | "drop"): void {
    // Clear the pending timer
    const timer = this.pendingTimers.get(pendingPlayerId);
    if (timer) {
      timer.clear();
      this.pendingTimers.delete(pendingPlayerId);
    }

    const pendingPlayer = this.state.players.get(pendingPlayerId);
    if (!pendingPlayer || !pendingPlayer.pendingAbsorption) return;

    const captorId = pendingPlayer.captorId;
    const captor = this.state.players.get(captorId);

    // If captor no longer exists or is absorbed, default to drop
    if (!captor || captor.absorbed) {
      choice = "drop";
    }

    if (choice === "surrender" && captor && !captor.absorbed) {
      // Transfer all tiles to captor
      let transferCount = 0;
      this.state.tiles.forEach((tile) => {
        if (tile.ownerId === pendingPlayerId) {
          tile.ownerId = captorId;
          transferCount++;
        }
      });
      captor.tileCount += transferCount;
      pendingPlayer.tileCount = 0;
    } else {
      // Self-destruct — drop all tiles as unclaimed and broadcast explosion
      const droppedTiles: { x: number; y: number }[] = [];
      this.state.tiles.forEach((tile) => {
        if (tile.ownerId === pendingPlayerId) {
          droppedTiles.push({ x: tile.x, y: tile.y });
          tile.ownerId = "";
        }
      });
      pendingPlayer.tileCount = 0;

      // Broadcast self-destruct so all clients can play the explosion animation
      if (droppedTiles.length > 0) {
        this.broadcast("selfDestruct", { tiles: droppedTiles });
      }
    }

    // Award captor 25% bonus scrap
    if (captor && !captor.absorbed) {
      captor.resources += Math.floor(CAPTURE_SCRAP_BONUS_PERCENT * pendingPlayer.resources);
    }

    // Send captureResolved to the pending player's client
    const client = this.clients.find(c => c.sessionId === pendingPlayerId);
    if (client) {
      client.send("captureResolved", { result: choice });
    }

    // Finalize absorption
    this.finalizeAbsorption(pendingPlayerId, captorId);
  }

  private finalizeAbsorption(pendingPlayerId: string, captorId: string): void {
    const pendingPlayer = this.state.players.get(pendingPlayerId);
    if (!pendingPlayer) return;

    const captor = this.state.players.get(captorId);

    // Set absorption state
    pendingPlayer.absorbed = true;
    pendingPlayer.pendingAbsorption = false;
    pendingPlayer.teamId = captorId;
    pendingPlayer.isTeamLead = false;

    // Prepend absorbed player's adjective to captor's team name,
    // but only if the captor now owns the player's factory (spawn tile).
    // If the factory was already lost/captured, the adjective was handled
    // by transferFactoryAdjective or the battle resolution.
    if (captor) {
      const absorbedAdj = pendingPlayer.nameAdj;
      if (absorbedAdj) {
        // Check if captor owns this player's factory
        const ownsFactory = this.state.tiles.some(
          (t) => t.isSpawn && t.x === pendingPlayer.spawnX && t.y === pendingPlayer.spawnY && t.ownerId === captorId
        );
        // Also check if the adjective is already in the captor's team name (avoid duplicates)
        const alreadyHasAdj = captor.teamName.split(" ").includes(absorbedAdj);
        if (ownsFactory && !alreadyHasAdj) {
          captor.teamName = `${absorbedAdj} ${captor.teamName}`;
        }
      }

      // Update teamName for all players on the captor's team
      pendingPlayer.teamName = captor.teamName;
      this.state.players.forEach((p) => {
        if (p.teamId === captorId && p.id !== captorId) {
          p.teamName = captor.teamName;
        }
      });
    }

    // Clear defense bots and collectors
    pendingPlayer.defenseBotsJSON = "[]";
    pendingPlayer.collectorsJSON = "[]";

    // Cancel any remaining battles involving the pending player
    const toCancel: string[] = [];
    for (const [key, battle] of this.activeBattles) {
      if (battle.attackerId === pendingPlayerId) {
        toCancel.push(key);
      }
      // Also cancel battles targeting tiles that were owned by the pending player
      const tile = this.state.tiles.find((t) => t.x === battle.tileX && t.y === battle.tileY);
      if (tile && tile.ownerId === "" && battle.attackerId !== captorId) {
        // Tile was dropped/transferred, cancel stale battles
        toCancel.push(key);
      }
    }
    for (const key of toCancel) {
      this.activeBattles.delete(key);
    }

    // Broadcast absorption notification
    const absorbedName = `${pendingPlayer.nameAdj} ${pendingPlayer.nameNoun}`;
    this.broadcast("notification", { message: `team absorbed ${absorbedName}` });
  }

  private getTakenNames(): { adjs: Set<string>; nouns: Set<string> } {
    const adjs = new Set<string>();
    const nouns = new Set<string>();
    this.state.players.forEach((p) => {
      if (p.nameAdj) adjs.add(p.nameAdj);
      if (p.nameNoun) nouns.add(p.nameNoun);
    });
    return { adjs, nouns };
  }

  /** Find the first color from the allowed palette not taken by any player. Returns -1 if all taken. */
  private getNextAvailableColor(): number {
    const allowedColors = this.state.maxPlayers >= 20 ? ALL_COLORS : BASE_COLORS;
    const takenColors = new Set<number>();
    this.state.players.forEach((p) => {
      if (p.color >= 0) takenColors.add(p.color);
    });
    for (const color of allowedColors) {
      if (!takenColors.has(color)) return color;
    }
    return -1;
  }

  private startGame() {
    const playerIds = Array.from(this.state.players.keys());
    const gridSize = calculateGridSize(playerIds.length);

    // Initialize the grid with neutral tiles
    const tiles = initializeGrid(gridSize, gridSize);

    // Assign starting positions with minDistance=5
    const startingPositions = assignStartingPositions(
      playerIds,
      gridSize,
      gridSize,
      5
    );

    // Set starting tiles' ownerId to the player id and store spawn on player
    for (const [playerId, pos] of startingPositions) {
      const tile = tiles.find((t) => t.x === pos.x && t.y === pos.y);
      if (tile) {
        tile.ownerId = playerId;
        tile.isSpawn = true;
      }
      const player = this.state.players.get(playerId);
      if (player) {
        player.spawnX = pos.x;
        player.spawnY = pos.y;
      }
    }

    // Place initial gears (1 per player)
    const gearCount = playerIds.length;
    const neutralTiles = tiles.filter((t) => t.ownerId === "");
    for (let i = neutralTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neutralTiles[i], neutralTiles[j]] = [neutralTiles[j], neutralTiles[i]];
    }
    for (let i = 0; i < Math.min(gearCount, neutralTiles.length); i++) {
      neutralTiles[i].hasGear = true;
      neutralTiles[i].gearScrap = this.state.gearScrapSupply;
    }

    // Populate state
    this.state.tiles.clear();
    for (const tile of tiles) {
      this.state.tiles.push(tile);
    }

    this.state.gridWidth = gridSize;
    this.state.gridHeight = gridSize;
    this.state.phase = "active";
    GameRoom.publicRooms.delete(this.state.shortCode);

    // Save the configured time limit for series resets
    this.configuredTimeLimit = this.state.timeRemaining;

    // Delay per-tick gear spawning for 20 seconds after round start
    this.gearRespawnCountdown = GEAR_RESPAWN_DELAY_SECONDS;
    this.gearSpawnTimer = 0;

    // Start the 1-second game loop
    this.gameLoopInterval = this.clock.setInterval(() => this.gameTick(), GAME_TICK_MS);

    // Start the 500ms battle tick
    this.battleTickInterval = this.clock.setInterval(() => this.battleTick(), BATTLE_TICK_MS);

    console.log(
      `Game started: ${gridSize}x${gridSize} grid, ${playerIds.length} players`
    );

    this.broadcast("gameStarted");
  }

  /**
   * Runs once per second while the game is active.
   * Awards income, resolves border conflicts, and handles absorption.
   */
  private gameTick() {
    if (this.state.phase !== "active") return;

    // Countdown timer (0 = deathmatch / infinite)
    if (this.configuredTimeLimit > 0) {
      this.state.timeRemaining -= 1;
      if (this.state.timeRemaining <= 0) {
        this.handleRoundEnd();
        return;
      }
    }

    const { gridWidth, gridHeight } = this.state;

    // Build internal TileGrid lookup: [y][x] → ownerId
    const tileGrid: string[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      tileGrid[y] = new Array(gridWidth).fill("");
    }
    for (const tile of this.state.tiles) {
      tileGrid[tile.y][tile.x] = tile.ownerId;
    }

    // 1. (Border conflicts are now manual — handled by battleTick)

    // 2. AI player actions — simulate clicking each tick
    this.state.players.forEach((player) => {
      if (!player.isAI) return;
      if (player.pendingAbsorption) return;

      // Determine the effective leader — if absorbed, act for team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }

      // Gather leader's owned tiles
      const ownedTiles = this.state.tiles.filter((t) => t.ownerId === leader.id);

      // Try to mine a gear first (on owned tiles or any unclaimed tile)
      for (const t of this.state.tiles) {
        if (!t.hasGear || t.gearScrap <= 0) continue;
        if (t.ownerId !== "" && t.ownerId !== leader.id) continue; // skip enemy-owned gears
        let factoryCount = 0;
        ownedTiles.forEach((ot) => { if (ot.isSpawn) factoryCount++; });
        const multiplier = Math.max(1, factoryCount);
        const extracted = Math.min(BASE_MINE_EXTRACT * multiplier, t.gearScrap);
        t.gearScrap -= extracted;
        leader.resources += extracted;
        if (t.gearScrap <= 0) t.hasGear = false;
        break; // one mine action per tick
      }

      // Absorbed AI only mines — doesn't claim or upgrade (leader handles that)
      if (player.absorbed) return;

      // Try to claim an adjacent neutral tile
      const claimable: Tile[] = [];
      for (const t of this.state.tiles) {
        if (t.ownerId !== "") continue;
        if (isAdjacent(t.x, t.y, ownedTiles)) {
          claimable.push(t);
        }
      }

      if (claimable.length > 0) {
        const gearTile = claimable.find((t) => t.hasGear && t.gearScrap > 0);
        const target = gearTile || claimable[Math.floor(Math.random() * claimable.length)];
        const cost = calculateTileClaimCost(leader.tileCount);
        if (leader.resources >= cost) {
          leader.resources -= cost;
          target.ownerId = leader.id;
          leader.tileCount += 1;
        }
      }

      // Try to upgrade (prefer attack, then defense)
      const atkCost = calculateUpgradeCost(leader.attack);
      const defCost = calculateUpgradeCost(leader.defense);
      if (leader.resources >= atkCost && leader.attack < MAX_STAT_VALUE) {
        leader.resources -= atkCost;
        leader.attack += 1;
      } else if (leader.resources >= defCost && leader.defense < MAX_STAT_VALUE) {
        leader.resources -= defCost;
        leader.defense += 1;
      }

      // Try to attack enemy border tiles — only if leader with a factory
      let hasFactory = false;
      for (const t of ownedTiles) {
        if (t.isSpawn) { hasFactory = true; break; }
      }

      if (!hasFactory || !leader.isTeamLead) return;

      let aiActiveBattles = 0;
      for (const [, battle] of this.activeBattles) {
        if (battle.attackerId === leader.id) aiActiveBattles++;
      }

      if (aiActiveBattles < 1 + leader.attack) {
        // Find enemy tiles adjacent to our territory (exclude already-attacked tiles)
        const attackedKeys = new Set<string>();
        for (const [, battle] of this.activeBattles) {
          if (battle.attackerId === leader.id) {
            attackedKeys.add(`${battle.tileX},${battle.tileY}`);
          }
        }

        const enemyBorderTiles: Tile[] = [];
        for (const t of this.state.tiles) {
          if (t.ownerId === "" || t.ownerId === leader.id) continue;
          if (attackedKeys.has(`${t.x},${t.y}`)) continue;
          if (isAdjacent(t.x, t.y, ownedTiles)) {
            enemyBorderTiles.push(t);
          }
        }

        // Start as many new attacks as ATK slots allow
        const slotsAvailable = 1 + leader.attack - aiActiveBattles;
        const toAttack = enemyBorderTiles.slice(0, slotsAvailable);

        for (const target of toAttack) {
          const key = `${target.x},${target.y}`;

          // Calculate tile defense
          const defender = this.state.players.get(target.ownerId);
          let tileDefense = BASE_TILE_DEFENSE;
          if (defender) {
            let defenseBots: { x: number; y: number }[] = [];
            try { defenseBots = JSON.parse(defender.defenseBotsJSON); } catch { defenseBots = []; }
            const botsOnTile = defenseBots.filter((b) => b.x === target.x && b.y === target.y).length;
            tileDefense = BASE_TILE_DEFENSE + botsOnTile * DEFENSE_PER_BOT;
          }

          this.activeBattles.set(key, {
            attackerId: leader.id,
            tileX: target.x,
            tileY: target.y,
            currentDefense: tileDefense,
            damageDealt: 0,
          });

          this.broadcast("battleFlash", { x: target.x, y: target.y, attackerId: leader.id });
        }
      }
    });

    // 5c. Automine — collectors placed on tiles automatically mine each tick
    this.state.players.forEach((player) => {
      if (player.absorbed) return;
      if (player.pendingAbsorption) return;

      let collectors: { x: number; y: number }[] = [];
      try { collectors = JSON.parse(player.collectorsJSON); } catch { collectors = []; }
      if (collectors.length === 0) return;

      // Count factories for multiplier
      let factoryCount = 0;
      this.state.tiles.forEach((t) => {
        if (t.isSpawn && t.ownerId === player.id) factoryCount++;
      });
      const multiplier = Math.max(1, factoryCount);

      let changed = false;
      const remaining: { x: number; y: number }[] = [];

      for (const c of collectors) {
        const tile = this.state.tiles.find((t) => t.x === c.x && t.y === c.y);
        if (!tile) continue;

        // Remove collector if tile is no longer owned by this player
        if (tile.ownerId !== player.id) {
          changed = true;
          continue;
        }

        // Mine gear if tile has scrap
        if (tile.hasGear && tile.gearScrap > 0) {
          const baseExtract = BASE_MINE_EXTRACT * multiplier;
          const extracted = Math.min(baseExtract, tile.gearScrap);
          tile.gearScrap = Math.max(0, tile.gearScrap - extracted);
          player.resources += extracted;
          if (tile.gearScrap <= 0) {
            tile.hasGear = false;
          }
        }

        // Spawn tiles generate passive income (1 scrap per tick per collector)
        if (tile.isSpawn) {
          player.resources += 1 * multiplier;
        }

        // Return collector to unplaced pool if tile has no gear and isn't a spawn
        if (!tile.isSpawn && (!tile.hasGear || tile.gearScrap <= 0)) {
          changed = true;
          continue;
        }

        remaining.push(c);
      }

      if (changed || remaining.length !== collectors.length) {
        player.collectorsJSON = JSON.stringify(remaining);
      }
    });

    // 6. Gear spawning — delayed by 20 seconds at round start,
    //    then spawns 1 gear every (21 - playerCount) seconds if
    //    unclaimed gears < (5 + playerCount).
    if (this.gearRespawnCountdown > 0) {
      this.gearRespawnCountdown--;
    } else {
      this.gearSpawnTimer++;
      const activePlayers = Array.from(this.state.players.values()).filter(p => !p.absorbed && !p.pendingAbsorption).length;
      const spawnInterval = Math.max(1, 21 - activePlayers);

      if (this.gearSpawnTimer >= spawnInterval) {
        this.gearSpawnTimer = 0;

        // Count unclaimed gears (gears on tiles with no owner)
        let unclaimedGears = 0;
        this.state.tiles.forEach((t) => {
          if (t.hasGear && t.gearScrap > 0 && t.ownerId === "") unclaimedGears++;
        });

        const gearCap = GEAR_CAP_BASE + activePlayers;
        if (unclaimedGears < gearCap) {
          const tilesArray = [...this.state.tiles].filter((t): t is Tile => t !== undefined);
          const gearIndices = spawnNewGears(tilesArray, 1);
          for (const idx of gearIndices) {
            const tile = this.state.tiles[idx];
            if (tile) {
              tile.hasGear = true;
              tile.gearScrap = this.state.gearScrapSupply;
            }
          }
        }
      }
    }

    // 7. Check if only one team remains — end game after 2 consecutive seconds
    const activeTeams = new Set<string>();
    this.state.players.forEach((player) => {
      if (!player.absorbed || player.pendingAbsorption) {
        activeTeams.add(player.teamId || player.id);
      }
    });

    if (activeTeams.size <= 1 && this.state.players.size > 1) {
      this.soloTeamTicks++;
      if (this.soloTeamTicks >= SOLO_TEAM_TICKS_TO_WIN) {
        this.handleRoundEnd();
      }
    } else {
      this.soloTeamTicks = 0;
    }
  }

  /**
   * Runs 2× per second. Processes all active battles.
   * Each tick: reduce tile defense by 1. If defense crosses a 5-point threshold,
   * remove a defense bot (50% chance to repair). At 0, capture the tile.
   */
  private battleTick() {
    if (this.state.phase !== "active") return;

    const toRemove: string[] = [];

    for (const [key, battle] of this.activeBattles) {
      const tile = this.state.tiles.find((t) => t.x === battle.tileX && t.y === battle.tileY);
      if (!tile) { toRemove.push(key); continue; }

      // If tile is no longer enemy-owned (already captured or changed), cancel battle
      const attacker = this.state.players.get(battle.attackerId);
      if (!attacker || attacker.absorbed || attacker.pendingAbsorption) { toRemove.push(key); continue; }
      if (tile.ownerId === "" || tile.ownerId === battle.attackerId) { toRemove.push(key); continue; }

      // Check attacker still has adjacent tiles
      const attackerTiles = this.state.tiles.filter((t) => t.ownerId === battle.attackerId);
      if (!isAdjacent(battle.tileX, battle.tileY, attackerTiles)) { toRemove.push(key); continue; }

      const defender = this.state.players.get(tile.ownerId);
      if (!defender || defender.pendingAbsorption || defender.absorbed) { toRemove.push(key); continue; }

      // Calculate attack pressure: factories + floor(attackBots / activeBattles)
      let attackerFactories = 0;
      for (const t of this.state.tiles) {
        if (t.isSpawn && t.ownerId === battle.attackerId) attackerFactories++;
      }
      let attackerBattleCount = 0;
      for (const [, b] of this.activeBattles) {
        if (b.attackerId === battle.attackerId) attackerBattleCount++;
      }
      const damage = Math.max(1, calculateAttackPressure(attackerFactories, attacker.attack, attackerBattleCount));

      // Reduce defense by pressure amount
      const prevDefense = battle.currentDefense;
      battle.currentDefense -= damage;
      battle.damageDealt += damage;

      // Every 5 cumulative damage dealt, 50% chance attacker loses an attack bot
      const prevThreshold5 = Math.floor((battle.damageDealt - damage) / ATTACKER_ATTRITION_THRESHOLD);
      const newThreshold5 = Math.floor(battle.damageDealt / ATTACKER_ATTRITION_THRESHOLD);
      if (newThreshold5 > prevThreshold5 && Math.random() < ATTACKER_ATTRITION_CHANCE) {
        if (attacker.attack > 0) {
          attacker.attack -= 1;
        }
      }

      // Check if we crossed a defense bot threshold (20, 15, 10, 5)
      const thresholds = DEFENSE_BOT_THRESHOLDS;
      for (const threshold of thresholds) {
        if (prevDefense > threshold && battle.currentDefense <= threshold) {
          // Remove one defense bot from this tile
          let defenseBots: { x: number; y: number }[] = [];
          try { defenseBots = JSON.parse(defender.defenseBotsJSON); } catch { defenseBots = []; }
          const botIdx = defenseBots.findIndex((b) => b.x === battle.tileX && b.y === battle.tileY);
          if (botIdx >= 0) {
            defenseBots.splice(botIdx, 1);
            defender.defenseBotsJSON = JSON.stringify(defenseBots);

            // 50% chance to repair — adds an unplaced bot back
            if (Math.random() < DEFENSE_BOT_REPAIR_CHANCE) {
              defender.defense += 1;
            }
          }
          break; // only one threshold per tick
        }
      }

      // Broadcast battle flash to all clients
      this.broadcast("battleFlash", { x: battle.tileX, y: battle.tileY, attackerId: battle.attackerId });

      // Tile falls when defense reaches 0 — becomes unclaimed
      if (battle.currentDefense <= 0) {
        const defenderId = tile.ownerId;
        tile.ownerId = "";

        if (defender) defender.tileCount -= 1;

        // If the lost tile was a factory, remove the adjective from the losing team
        if (tile.isSpawn && defender && !defender.absorbed) {
          // Remove the factory's adjective from the defender's team name
          let factoryOwner: Player | undefined;
          this.state.players.forEach((p) => {
            if (p.spawnX === tile.x && p.spawnY === tile.y) {
              factoryOwner = p;
            }
          });
          if (factoryOwner) {
            const adj = factoryOwner.nameAdj;
            if (adj) {
              const withSpace = adj + " ";
              if (defender.teamName.includes(withSpace)) {
                defender.teamName = defender.teamName.replace(withSpace, "");
              } else if (defender.teamName.startsWith(adj)) {
                defender.teamName = defender.teamName.slice(adj.length).trimStart();
              }
              // Propagate to all team members
              this.state.players.forEach((p) => {
                if (p.teamId === defenderId) {
                  p.teamName = defender.teamName;
                }
              });

              // Add the adjective to the attacker's team name
              const alreadyHasAdj = attacker.teamName.split(" ").includes(adj);
              if (!alreadyHasAdj) {
                attacker.teamName = `${adj} ${attacker.teamName}`;
                // Propagate to all attacker's team members
                this.state.players.forEach((p) => {
                  if (p.teamId === battle.attackerId && p.id !== battle.attackerId) {
                    p.teamName = attacker.teamName;
                  }
                });
              }

              // Transfer the factory owner to the attacker's team
              factoryOwner.teamId = battle.attackerId;
              factoryOwner.absorbed = true;
              factoryOwner.isTeamLead = false;
              factoryOwner.teamName = attacker.teamName;
            }
          }

          let hasFactory = false;
          this.state.tiles.forEach((t) => {
            if (t.isSpawn && t.ownerId === defenderId) hasFactory = true;
          });
          if (!hasFactory) {
            // Lost last factory — trigger absorption (surrender or self-destruct)
            defender.isTeamLead = false;

            // Cancel all active battles initiated by this player
            for (const [bKey, bVal] of this.activeBattles) {
              if (bVal.attackerId === defenderId) {
                toRemove.push(bKey);
              }
            }

            // Enter pending absorption — the team lead chooses surrender or self-destruct
            if (!defender.pendingAbsorption) {
              this.enterPendingAbsorption(defenderId, battle.attackerId);
            }
          }
        }

        // Remove all defense bots from the fallen tile
        let defenseBots: { x: number; y: number }[] = [];
        try { defenseBots = JSON.parse(defender.defenseBotsJSON); } catch { defenseBots = []; }
        const before = defenseBots.length;
        defenseBots = defenseBots.filter((b) => !(b.x === battle.tileX && b.y === battle.tileY));
        if (defenseBots.length !== before) {
          defender.defenseBotsJSON = JSON.stringify(defenseBots);
        }

        // Remove any other battles targeting this tile
        toRemove.push(key);

        // Check for absorption — enter pending state instead of instant absorption
        if (defender.tileCount <= 0 && !defender.pendingAbsorption && !defender.absorbed) {
          this.enterPendingAbsorption(defenderId, battle.attackerId);
        }
      }
    }

    for (const key of toRemove) {
      this.activeBattles.delete(key);
    }
  }

  /**
   * Determines the round winner (player with most tiles) and handles
   * series logic for bo3/bo5 or ends the game for single matches.
   */
  private handleRoundEnd() {
    // Stop the game loop
    if (this.gameLoopInterval) {
      this.gameLoopInterval.clear();
      this.gameLoopInterval = null;
    }
    if (this.battleTickInterval) {
      this.battleTickInterval.clear();
      this.battleTickInterval = null;
    }
    this.activeBattles.clear();

    // Determine round winner: player with most tiles
    let winnerId = "";
    let maxTiles = 0;
    this.state.players.forEach((player) => {
      if (!player.absorbed && player.tileCount > maxTiles) {
        maxTiles = player.tileCount;
        winnerId = player.id;
      }
    });

    // For single match, just end
    if (this.state.matchFormat === "single") {
      this.state.phase = "ended";
      console.log("Game ended — single match");
      return;
    }

    // Series match (bo3 or bo5): record round winner
    if (winnerId) {
      const currentScore = this.seriesScores.get(winnerId) || 0;
      this.seriesScores.set(winnerId, currentScore + 1);
    }

    // Sync series scores to state for client
    const scoresObj: Record<string, number> = {};
    this.seriesScores.forEach((wins, playerId) => {
      scoresObj[playerId] = wins;
    });
    this.state.seriesScoresJSON = JSON.stringify(scoresObj);

    // Check win threshold
    const winThreshold = this.state.matchFormat === "bo3" ? 2 : 3;
    let seriesWinner = "";
    this.seriesScores.forEach((wins, playerId) => {
      if (wins >= winThreshold) {
        seriesWinner = playerId;
      }
    });

    if (seriesWinner) {
      // Series is over
      this.state.phase = "ended";
      console.log(`Series ended — winner: ${seriesWinner}`);
    } else {
      // Schedule next round after 5 seconds
      this.state.phase = "ended"; // temporarily ended between rounds
      this.clock.setTimeout(() => {
        this.resetForNextRound();
      }, SERIES_ROUND_DELAY_MS);
      console.log(`Round ${this.state.roundNumber} ended — next round in 5s`);
    }
  }

  /**
   * Re-initializes the grid, reassigns starting positions, resets player stats,
   * increments roundNumber, and sets phase to "active" for the next round.
   */
  private resetForNextRound() {
    this.state.roundNumber += 1;

    const playerIds = Array.from(this.state.players.keys());
    const gridSize = calculateGridSize(playerIds.length);

    // Re-initialize the grid with neutral tiles
    const tiles = initializeGrid(gridSize, gridSize);

    // Reassign starting positions
    const startingPositions = assignStartingPositions(
      playerIds,
      gridSize,
      gridSize,
      5
    );

    // Set starting tiles and player spawn positions
    for (const [playerId, pos] of startingPositions) {
      const tile = tiles.find((t) => t.x === pos.x && t.y === pos.y);
      if (tile) {
        tile.ownerId = playerId;
        tile.isSpawn = true;
      }
      const player = this.state.players.get(playerId);
      if (player) {
        player.spawnX = pos.x;
        player.spawnY = pos.y;
      }
    }

    // Place initial gears (1 per player)
    const gearCount = playerIds.length;
    const neutralTiles = tiles.filter((t) => t.ownerId === "");
    for (let i = neutralTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neutralTiles[i], neutralTiles[j]] = [neutralTiles[j], neutralTiles[i]];
    }
    for (let i = 0; i < Math.min(gearCount, neutralTiles.length); i++) {
      neutralTiles[i].hasGear = true;
      neutralTiles[i].gearScrap = this.state.gearScrapSupply;
    }

    // Populate state tiles
    this.state.tiles.clear();
    for (const tile of tiles) {
      this.state.tiles.push(tile);
    }

    this.state.gridWidth = gridSize;
    this.state.gridHeight = gridSize;

    // Reset player stats for the new round
    this.state.players.forEach((player) => {
      player.resources = 0;
      player.attack = 1;
      player.defense = 0;
      player.defenseBotsJSON = "[]";
      player.collection = 0;
      player.collectorsJSON = "[]";
      player.tileCount = 1;
      player.absorbed = false;
      player.isTeamLead = true;
      player.teamId = player.id;
      player.teamName = `${player.nameAdj} ${player.nameNoun}`;
    });

    // Reset internal counters
    this.soloTeamTicks = 0;
    this.gearRespawnCountdown = GEAR_RESPAWN_DELAY_SECONDS;
    this.gearSpawnTimer = 0;

    // Reset timer to configured time limit
    this.state.timeRemaining = this.configuredTimeLimit;

    // Set phase to active and restart game loop
    this.state.phase = "active";
    this.gameLoopInterval = this.clock.setInterval(() => this.gameTick(), GAME_TICK_MS);
    this.battleTickInterval = this.clock.setInterval(() => this.battleTick(), BATTLE_TICK_MS);

    console.log(`Round ${this.state.roundNumber} started: ${gridSize}x${gridSize} grid`);
  }
}
