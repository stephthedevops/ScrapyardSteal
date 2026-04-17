import { Room, Client } from "colyseus";
import { GameState, Player, Tile } from "../state/GameState";
import {
  calculateGridSize,
  initializeGrid,
  assignStartingPositions,
  isAdjacent,
} from "../logic/GridManager";
import {
  calculateTileClaimCost,
  calculateUpgradeCost,
  findBorders,
  resolveBorder,
} from "../logic/ConflictEngine";

export class GameRoom extends Room<GameState> {
  maxClients = 20;
  private gameLoopInterval: ReturnType<typeof this.clock.setInterval> | null = null;
  private hostId: string = "";
  private soloTeamTicks: number = 0;

  /** Global map of shortCode → roomId for lookups */
  static shortCodeMap = new Map<string, string>();
  /** Set of shortCodes that are public and waiting */
  static publicRooms = new Set<string>();

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
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Determine the team leader — if absorbed, act on behalf of team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }

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
    });

    this.onMessage("upgradeAttack", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const cost = calculateUpgradeCost(player.attack);
      if (player.resources < cost) return;
      if (player.attack >= 50) return; // max cap

      player.resources -= cost;
      player.attack += 1;
    });

    this.onMessage("upgradeDefense", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const cost = calculateUpgradeCost(player.defense);
      if (player.resources < cost) return;
      if (player.defense >= 50) return; // max cap

      player.resources -= cost;
      player.defense += 1;
    });

    this.onMessage("setDirection", (client, data: { direction: string }) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const validDirections = ["north", "south", "east", "west", ""];
      if (!validDirections.includes(data.direction)) return;

      player.direction = data.direction;
    });

    // Mine scrap from a gear tile
    this.onMessage("mineGear", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Determine the team leader
      let leader = player;
      if (player.absorbed && player.teamId) {
        const teamLeader = this.state.players.get(player.teamId);
        if (!teamLeader || teamLeader.absorbed) return;
        leader = teamLeader;
      }

      // Bounds check
      if (data.x < 0 || data.x >= this.state.gridWidth || data.y < 0 || data.y >= this.state.gridHeight) return;

      const tile = this.state.tiles.find((t) => t.x === data.x && t.y === data.y);
      if (!tile || !tile.hasGear || tile.gearScrap <= 0) return;

      // Only mine if tile is unclaimed or owned by the team leader
      if (tile.ownerId !== "" && tile.ownerId !== leader.id) return;

      // Count factories (spawn tiles) owned by the team leader
      let factoryCount = 0;
      this.state.tiles.forEach((t) => {
        if (t.isSpawn && t.ownerId === leader.id) factoryCount++;
      });
      const multiplier = Math.max(1, factoryCount);

      // Extract scrap = attack × factory multiplier, capped by remaining gearScrap
      const baseExtract = leader.attack * multiplier;
      const extracted = Math.min(baseExtract, tile.gearScrap);
      tile.gearScrap = Math.max(0, tile.gearScrap - extracted);
      leader.resources += extracted;

      // Remove gear when depleted
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

      const adj = (data.adj || "").slice(0, 16);
      const noun = (data.noun || "").slice(0, 16);

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

    // Allowed color palette
    const ALLOWED_COLORS = [
      0xb87333, 0x4a8a5e, 0xffd700, 0x8a8a7a, 0x7a3ea0,
      0x0047ab, 0xff00ff, 0x8b4513, 0xdbe4eb, 0x36454f,
    ];

    // Player selects a color
    this.onMessage("selectColor", (client, data: { color: number }) => {
      if (this.state.phase !== "waiting") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Validate color is in allowed palette
      if (!ALLOWED_COLORS.includes(data.color)) return;

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
  }

  onJoin(client: Client) {
    const player = new Player();
    player.id = client.sessionId;
    player.teamId = client.sessionId; // starts as own team lead
    player.isTeamLead = true;
    player.resources = 0;
    player.attack = 1;
    player.defense = 1;
    player.tileCount = 1;
    player.absorbed = false;
    player.direction = "";
    player.color = -1;
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
    console.log(`${client.sessionId} joined (host: ${client.sessionId === this.hostId})`);
  }

  onLeave(client: Client) {
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

    this.state.players.delete(client.sessionId);

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
    GameRoom.shortCodeMap.delete(this.state.shortCode);
    GameRoom.publicRooms.delete(this.state.shortCode);
    console.log("GameRoom disposed");
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

    // Place gears on random neutral tiles (3 × player count)
    const gearCount = playerIds.length * 3;
    const neutralTiles = tiles.filter((t) => t.ownerId === "");
    for (let i = neutralTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neutralTiles[i], neutralTiles[j]] = [neutralTiles[j], neutralTiles[i]];
    }
    for (let i = 0; i < Math.min(gearCount, neutralTiles.length); i++) {
      neutralTiles[i].hasGear = true;
      neutralTiles[i].gearScrap = 50;
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

    // Start the 1-second game loop
    this.gameLoopInterval = this.clock.setInterval(() => this.gameTick(), 1000);

    console.log(
      `Game started: ${gridSize}x${gridSize} grid, ${playerIds.length} players`
    );
  }

  /**
   * Runs once per second while the game is active.
   * Awards income, resolves border conflicts, and handles absorption.
   */
  private gameTick() {
    if (this.state.phase !== "active") return;

    // Countdown timer
    this.state.timeRemaining -= 1;
    if (this.state.timeRemaining <= 0) {
      this.state.phase = "ended";
      if (this.gameLoopInterval) {
        this.gameLoopInterval.clear();
        this.gameLoopInterval = null;
      }
      console.log("Game ended — time's up");
      return;
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

    // 1. Evaluate all borders
    const tilesArray: Tile[] = [];
    this.state.tiles.forEach((tile) => tilesArray.push(tile));
    const borders = findBorders(tilesArray, gridWidth, gridHeight);

    // 3. Resolve each border and collect tile transfers
    for (const border of borders) {
      const playerA = this.state.players.get(border.playerAId);
      const playerB = this.state.players.get(border.playerBId);
      if (!playerA || !playerB) continue;
      if (playerA.absorbed || playerB.absorbed) continue;

      const transfer = resolveBorder(
        border,
        { attack: playerA.attack, defense: playerA.defense },
        { attack: playerB.attack, defense: playerB.defense }
      );

      if (transfer) {
        // 4. Apply tile transfer: update tile ownership and both players' tileCounts
        transfer.tile.ownerId = transfer.toId;

        const fromPlayer = this.state.players.get(transfer.fromId);
        const toPlayer = this.state.players.get(transfer.toId);
        if (fromPlayer) fromPlayer.tileCount -= 1;
        if (toPlayer) toPlayer.tileCount += 1;

        // 5. Check for absorption: if fromPlayer's tileCount reaches 0
        if (fromPlayer && fromPlayer.tileCount <= 0) {
          fromPlayer.absorbed = true;
          if (toPlayer) {
            // Award bonus scrap
            toPlayer.resources += Math.floor(0.25 * fromPlayer.resources);

            // Prepend absorbed player's adjective(s) to absorber's team name
            const absorbedAdj = fromPlayer.nameAdj || fromPlayer.teamName.split(" ").slice(0, -1).join(" ");
            if (absorbedAdj) {
              toPlayer.teamName = `${absorbedAdj} ${toPlayer.teamName}`;
            }

            // Move absorbed player to absorber's team
            fromPlayer.teamId = toPlayer.id;
            fromPlayer.isTeamLead = false;
            fromPlayer.teamName = toPlayer.teamName;

            // Update all existing team members' teamName too
            this.state.players.forEach((p) => {
              if (p.teamId === toPlayer.id && p.id !== toPlayer.id) {
                p.teamName = toPlayer.teamName;
              }
            });
          }
        }
      }
    }

    // 6. Check if only one team remains — end game after 2 consecutive seconds
    const activeTeams = new Set<string>();
    this.state.players.forEach((player) => {
      if (!player.absorbed) {
        activeTeams.add(player.id);
      }
    });

    if (activeTeams.size <= 1 && this.state.players.size > 1) {
      this.soloTeamTicks++;
      if (this.soloTeamTicks >= 2) {
        this.state.phase = "ended";
        if (this.gameLoopInterval) {
          this.gameLoopInterval.clear();
          this.gameLoopInterval = null;
        }
        console.log("Game ended — only one team remaining");
      }
    } else {
      this.soloTeamTicks = 0;
    }
  }
}
