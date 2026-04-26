import Phaser from "phaser";
import { NetworkManager } from "../network/NetworkManager";
import { GridRenderer } from "../rendering/GridRenderer";
import { HUDManager } from "../ui/HUDManager";
import { addMusicToggle } from "../ui/MusicToggle";
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export class GameScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private gridRenderer: GridRenderer | null = null;
  private hudManager: HUDManager | null = null;
  private room: any = null;
  private localSessionId: string = "";
  private currentTileCost: number = 10;
  private absorbedPlayerIds: Set<string> = new Set();
  private playerNameCache: Map<string, string> = new Map();
  private gameEnded = false;
  private tooltipText!: Phaser.GameObjects.Text;
  private connectingText: Phaser.GameObjects.Text | null = null;
  private hintPopupElements: Phaser.GameObjects.GameObject[] = [];
  private placingCollector: boolean = false;
  private placingDefenseBot: boolean = false;
  private countdownPlayed: boolean = false;
  private endCountdownPlayed: boolean = false;

  // Absorbed-player idle nudge
  private lastActionTime: number = 0;
  private idleNudgeTimer?: Phaser.Time.TimerEvent;
  private idleNudgeElements: Phaser.GameObjects.GameObject[] = [];
  // Active attack sounds keyed by "x,y"
  private attackSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private static readonly IDLE_NUDGE_MESSAGES = [
    "Help your team, you can mine, expand, defend!",
    "Your team is counting on you! Scrap, place bots, claim new tiles!",
    "You are a part of an amazing team! Scrap, expand, build the bots!",
  ];

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    this.load.audio("errorSfx", "sounds/error_01.wav");
    this.load.audio("mineSfx", "sounds/closing-the-metal-drawer-004.wav");
    this.load.audio("attackSfx", "sounds/machine-gtrs-loop.mp3");
  }

  create(data?: { room: any; networkManager: NetworkManager; sessionId: string }): void {
    // Reset all state from previous session
    this.gridRenderer = null;
    this.hudManager = null;
    this.room = null;
    this.localSessionId = "";
    this.currentTileCost = 10;
    this.absorbedPlayerIds = new Set();
    this.playerNameCache = new Map();
    this.gameEnded = false;
    this.connectingText = null;
    this.hintPopupElements = [];
    this.placingCollector = false;
    this.placingDefenseBot = false;
    this.spawnTilesRegistered = false;
    this.countdownPlayed = false;
    this.endCountdownPlayed = false;
    this.lastActionTime = 0;
    this.idleNudgeTimer?.remove(false);
    this.idleNudgeTimer = undefined;
    this.idleNudgeElements = [];

    if (data?.room && data?.networkManager) {
      // Came from LobbyScene with an existing connection
      this.room = data.room;
      this.networkManager = data.networkManager;
      this.localSessionId = data.sessionId;
      this.setupStateListener();
    } else {
      // Direct connection fallback
      this.connectingText = this.add
        .text(400, 300, "Connecting...", {
          fontSize: "24px",
          color: "#e0a030",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);

      this.networkManager = new NetworkManager();
      this.networkManager.joinGame().then((room) => {
        this.room = room;
        this.localSessionId = room.sessionId;
        this.setupStateListener();
      });
    }

    // Set up tile click handler
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleTileClick(pointer);
    });

    // Tooltip on hover
    this.tooltipText = this.add
      .text(0, 0, "", {
        fontSize: "11px",
        color: "#e0a030",
        fontFamily: "monospace",
        backgroundColor: "#1a1a1acc",
        padding: { x: 6, y: 4 },
      })
      .setDepth(150)
      .setAlpha(0);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.handleTooltip(pointer);
    });

    // Hint button
    this.createHintButton();

    addMusicToggle(this);
  }

  private setupStateListener(): void {
    // Listen for battle flash broadcasts
    this.room.onMessage("battleFlash", (data: { x: number; y: number; attackerId: string }) => {
      if (!this.gridRenderer) return;
      const localPlayer = this.room.state?.players?.get(this.localSessionId);
      const isAttacker = localPlayer && (localPlayer.id === data.attackerId || localPlayer.teamId === data.attackerId);
      const flashColor = isAttacker
        ? ((localPlayer?.color ?? -1) >= 0 ? localPlayer!.color : 0xffd700)
        : 0xffffff;
      this.gridRenderer.playMineFlash(data.x, data.y, flashColor);
    });

    // Capture choice — show modal when player's factory falls
    this.room.onMessage("captureChoice", (data: { captorTeamName: string; timeoutSeconds: number }) => {
      if (this.gameEnded) return;
      this.hudManager?.showCaptureChoice(data.captorTeamName, data.timeoutSeconds, (choice) => {
        this.networkManager.sendCaptureResponse(choice);
      });
    });

    // Capture resolved — dismiss the modal
    this.room.onMessage("captureResolved", () => {
      this.hudManager?.dismissCaptureChoice();
    });

    // Factory captured broadcast — show notification
    this.room.onMessage("factoryCaptured", (data: { claimingTeamName: string; factoryAdj: string }) => {
      if (this.gameEnded) return;
      this.hudManager?.showNotification(`${data.claimingTeamName} claimed the ${data.factoryAdj} Factory`);
    });

    this.room.onStateChange((state: any) => {
      // On first state change with valid grid: initialize renderer and HUD
      if (!this.gridRenderer && state.gridWidth > 0) {
        // Remove connecting text
        if (this.connectingText) {
          this.connectingText.destroy();
          this.connectingText = null;
        }

        this.gridRenderer = new GridRenderer(
          this,
          state.gridWidth,
          state.gridHeight
        );

        this.hudManager = new HUDManager(this);

        // Wire upgrade button callbacks
        this.hudManager.onUpgradeAttack = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.attack ?? 0))) return;
          this.networkManager.sendUpgradeAttack();
        };
        this.hudManager.onUpgradeDefense = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.defense ?? 0))) return;
          this.networkManager.sendUpgradeDefense();
        };
        this.hudManager.onUpgradeCollection = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.collection ?? 0))) return;
          this.networkManager.sendUpgradeCollection();
        };
        this.hudManager.onCollectorClick = () => {
          this.placingCollector = true;
        };
        this.hudManager.onDefenseBotClick = () => {
          this.placingDefenseBot = true;
        };

        // Play start countdown on first grid initialization
        if (!this.countdownPlayed) {
          this.countdownPlayed = true;
          this.playCountdown(3, "GO!", "#44ff44");
        }
      }

      this.onStateUpdate(state);
    });

    // Process current state immediately in case we missed the first event
    if (this.room.state) {
      const state = this.room.state;
      if (!this.gridRenderer && state.gridWidth > 0) {
        if (this.connectingText) {
          this.connectingText.destroy();
          this.connectingText = null;
        }

        this.gridRenderer = new GridRenderer(
          this,
          state.gridWidth,
          state.gridHeight
        );

        this.hudManager = new HUDManager(this);

        this.hudManager.onUpgradeAttack = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.attack ?? 0))) return;
          this.networkManager.sendUpgradeAttack();
        };
        this.hudManager.onUpgradeDefense = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.defense ?? 0))) return;
          this.networkManager.sendUpgradeDefense();
        };
        this.hudManager.onUpgradeCollection = () => {
          const ep = this.room.state.players.get(this.getEffectivePlayerId(this.room.state));
          if (!this.canAffordOrError(50 + 5 * (ep?.collection ?? 0))) return;
          this.networkManager.sendUpgradeCollection();
        };
        this.hudManager.onCollectorClick = () => {
          this.placingCollector = true;
        };
        this.hudManager.onDefenseBotClick = () => {
          this.placingDefenseBot = true;
        };

        // Play start countdown on first grid initialization
        if (!this.countdownPlayed) {
          this.countdownPlayed = true;
          this.playCountdown(3, "GO!", "#44ff44");
        }
      }
      this.onStateUpdate(state);
    }
  }

  /** Check if the effective player can afford a cost; play error sound if not. */
  private canAffordOrError(cost: number): boolean {
    const effectiveId = this.getEffectivePlayerId(this.room.state);
    const player = this.room.state.players.get(effectiveId);
    if (!player || player.resources < cost) {
      this.sound.play("errorSfx", { volume: 0.5 });
      return false;
    }
    return true;
  }

  private spawnTilesRegistered = false;

  /** Get the effective player ID — team leader if absorbed */
  private getEffectivePlayerId(state: any): string {
    const localPlayer = state.players.get(this.localSessionId);
    if (localPlayer?.absorbed && localPlayer?.teamId) {
      return localPlayer.teamId;
    }
    return this.localSessionId;
  }

  private onStateUpdate(state: any): void {
    if (!this.gridRenderer || !this.hudManager) return;

    // Register spawn and gear tiles once
    if (!this.spawnTilesRegistered) {
      state.tiles.forEach((tile: any) => {
        if (tile.isSpawn) {
          this.gridRenderer!.setSpawnTile(tile.x, tile.y);
        }
        if (tile.hasGear) {
          this.gridRenderer!.setGearTile(tile.x, tile.y);
        }
      });
      this.spawnTilesRegistered = true;
    }

    // Update gear tiles — add newly spawned ones, remove depleted ones
    state.tiles.forEach((tile: any) => {
      if (tile.hasGear) {
        this.gridRenderer!.setGearTile(tile.x, tile.y);
      } else {
        this.gridRenderer!.removeGearTile(tile.x, tile.y);
      }
    });

    // Sync player colors from server state
    // Override: render your team's tiles in YOUR original color so you always know your team
    const localPlayer = state.players.get(this.localSessionId);
    const myOriginalColor = localPlayer?.color ?? -1;
    const myTeamId = this.getEffectivePlayerId(state);

    state.players.forEach((player: any, key: string) => {
      if (player.color >= 0) {
        const playerId = player.id || key;
        if (playerId === myTeamId && myOriginalColor >= 0) {
          // My team leader's tiles render in MY chosen color
          this.gridRenderer!.setPlayerColor(playerId, myOriginalColor);
        } else {
          this.gridRenderer!.setPlayerColor(playerId, player.color);
        }
      }
    });

    // Clear and re-render all tiles
    this.gridRenderer.clear();
    state.tiles.forEach((tile: any) => {
      this.gridRenderer!.renderTile(tile.x, tile.y, tile.ownerId);
    });

    // Stop attack sounds for tiles no longer under attack (captured, lost, or no longer enemy)
    for (const [atkKey, snd] of this.attackSounds) {
      const [ax, ay] = atkKey.split(",").map(Number);
      let stillEnemy = false;
      state.tiles.forEach((tile: any) => {
        if (tile.x === ax && tile.y === ay && tile.ownerId !== "" && tile.ownerId !== myTeamId) {
          stillEnemy = true;
        }
      });
      if (!stillEnemy) {
        snd.stop();
        snd.destroy();
        this.attackSounds.delete(atkKey);
      }
    }

    // Get effective player stats (team leader if absorbed)
    const effectiveId = this.getEffectivePlayerId(state);
    const effectivePlayer = state.players.get(effectiveId);
    if (effectivePlayer) {
      // Count factories owned by team leader
      let factoryCount = 0;
      state.tiles.forEach((tile: any) => {
        if (tile.isSpawn && tile.ownerId === effectiveId) factoryCount++;
      });

      this.hudManager.updateStats(
        effectivePlayer.resources,
        effectivePlayer.attack,
        effectivePlayer.defense,
        effectivePlayer.tileCount,
        factoryCount,
        state.players.get(this.localSessionId)?.isTeamLead,
        effectivePlayer.collection
      );

      // Calculate upgrade costs
      const attackCost = 50 + (5 * effectivePlayer.attack);
      const defenseCost = 50 + (5 * effectivePlayer.defense);
      const collectionCost = 50 + (5 * (effectivePlayer.collection || 0));
      this.hudManager.updateUpgradeCosts(attackCost, defenseCost, collectionCost);
      this.currentTileCost = Math.floor(10 * (1 + 0.02 * effectivePlayer.tileCount));
      this.hudManager.updateTeamName(effectivePlayer.teamName || "");

      // Update collector icons above identity line
      let placedCount = 0;
      try {
        const collectors = JSON.parse(effectivePlayer.collectorsJSON || "[]");
        placedCount = collectors.length;

        // Update grid renderer with collector positions
        this.gridRenderer!.clearCollectorTiles();
        for (const c of collectors) {
          this.gridRenderer!.setCollectorTile(c.x, c.y);
        }
      } catch { /* ignore parse errors */ }
      this.hudManager.updateCollectors(effectivePlayer.collection || 0, placedCount);

      // Update defense bot positions on grid renderer
      let placedDefBots = 0;
      try {
        const defenseBots: { x: number; y: number }[] = JSON.parse(effectivePlayer.defenseBotsJSON || "[]");
        placedDefBots = defenseBots.length;

        // Build a map of tile -> bot count for the renderer
        const defBotCounts = new Map<string, number>();
        for (const b of defenseBots) {
          const key = `${b.x},${b.y}`;
          defBotCounts.set(key, (defBotCounts.get(key) ?? 0) + 1);
        }
        this.gridRenderer!.setDefenseBotData(defBotCounts);
      } catch { /* ignore parse errors */ }
      this.hudManager.updateDefenseBots(effectivePlayer.defense || 0, placedDefBots);

      // Update player identity below grid
      const localP = state.players.get(this.localSessionId);
      this.hudManager.updateIdentity(
        localP?.isTeamLead ?? true,
        effectivePlayer.teamName || "",
        localP?.nameAdj || ""
      );
    }

    // Build leaderboard from non-absorbed players
    const leaderboardData: { id: string; tileCount: number }[] = [];
    const teamStats: { name: string; tiles: number; attack: number; defense: number; collection: number; factories: number; scrap: number }[] = [];
    state.players.forEach((player: any, key: string) => {
      if (!player.absorbed) {
        const name = player.teamName || `${player.nameAdj} ${player.nameNoun}`.trim() || key.slice(0, 10);
        leaderboardData.push({ id: name, tileCount: player.tileCount });
        let fCount = 0;
        state.tiles.forEach((t: any) => { if (t.isSpawn && t.ownerId === (player.id || key)) fCount++; });
        teamStats.push({
          name, tiles: player.tileCount, attack: player.attack,
          defense: player.defense, collection: player.collection ?? 0,
          factories: fCount, scrap: player.resources,
        });
      }
    });
    this.hudManager.updateTeamStats(teamStats);
    this.hudManager.updateLeaderboard(
      leaderboardData,
      state.timeRemaining,
      state.matchFormat,
      state.seriesScoresJSON
    );

    // Detect new absorptions and show notifications / effects
    this.detectAbsorptions(state);

    // Absorbed-player idle nudge: if local player is absorbed and idle for 7s, show a message
    const localP = state.players.get(this.localSessionId);
    if (localP?.absorbed && !this.gameEnded) {
      // Seed the timer on first absorbed frame
      if (this.lastActionTime === 0) {
        this.lastActionTime = this.time.now;
      }
      if (!this.idleNudgeTimer) {
        this.idleNudgeTimer = this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => this.checkIdleNudge(),
        });
      }
    } else {
      // Not absorbed (or game ended) — tear down nudge tracking
      this.idleNudgeTimer?.remove(false);
      this.idleNudgeTimer = undefined;
      this.dismissIdleNudge();
    }

    // Check for game end
    if (state.phase === "ended" && !this.gameEnded) {
      this.gameEnded = true;
      this.showEndScreen(state);
    }

    // End-game countdown: flash 3-2-1-TIME! when timer hits 3
    if (state.timeRemaining > 0 && state.timeRemaining <= 3 && !this.endCountdownPlayed && !this.gameEnded) {
      this.endCountdownPlayed = true;
      this.playCountdown(state.timeRemaining, "TIME!", "#ff4444");
    }

    // Highlight claimable tiles for local player
    this.highlightClaimableTiles(state);
  }

  private highlightClaimableTiles(state: any): void {
    if (!this.gridRenderer) return;

    // Collect player's tiles and all neutral tiles
    const playerTiles: { x: number; y: number }[] = [];
    const neutralTiles: { x: number; y: number }[] = [];

    state.tiles.forEach((tile: any) => {
      if (tile.ownerId === this.getEffectivePlayerId(state)) {
        playerTiles.push({ x: tile.x, y: tile.y });
      } else if (tile.ownerId === "") {
        neutralTiles.push({ x: tile.x, y: tile.y });
      }
    });

    // Find claimable tiles: neutral tiles adjacent to player's territory
    const playerTileSet = new Set(
      playerTiles.map((t) => `${t.x},${t.y}`)
    );
    const claimable = neutralTiles.filter((tile) => {
      const neighbors = [
        { x: tile.x - 1, y: tile.y },
        { x: tile.x + 1, y: tile.y },
        { x: tile.x, y: tile.y - 1 },
        { x: tile.x, y: tile.y + 1 },
      ];
      return neighbors.some((n) => playerTileSet.has(`${n.x},${n.y}`));
    });

    // Read local player color for highlight tinting
    const localPlayer = state.players.get(this.localSessionId);
    const playerColor = (localPlayer?.color ?? -1) >= 0 ? localPlayer!.color : 0xffcc44;

    this.gridRenderer.highlightClaimable(claimable, this.currentTileCost, playerColor);
  }

  private detectAbsorptions(state: any): void {
    // Cache names of non-absorbed players so we have the original name when they get absorbed
    state.players.forEach((player: any, key: string) => {
      const playerId = player.id || key;
      if (!player.absorbed && player.teamName) {
        this.playerNameCache.set(playerId, player.teamName);
      }
    });

    state.players.forEach((player: any, key: string) => {
      const playerId = player.id || key;
      if (player.absorbed && !this.absorbedPlayerIds.has(playerId)) {
        this.absorbedPlayerIds.add(playerId);

        // Use just the noun (last word) from the cached original name
        const originalName = this.playerNameCache.get(playerId) || playerId.slice(0, 8);
        const originalNoun = originalName.split(" ").pop() || originalName;
        const absorberName = player.teamId
          ? (state.players.get(player.teamId)?.teamName || "someone")
          : "someone";
        const absorberNoun = absorberName.split(" ").pop() || absorberName;

        this.hudManager?.showNotification(
          `${absorberNoun} scrapped ${originalNoun}`
        );

        // Collect tiles that were just absorbed (now neutral or transferred)
        // Play absorption effect on tiles at the absorbed player's last known positions
        const absorbedTiles: { x: number; y: number }[] = [];
        state.tiles.forEach((tile: any) => {
          // Tiles that just changed from the absorbed player are now owned by someone else
          // We can't know exactly which tiles were theirs, but we can flash tiles
          // that border the absorber's territory as a visual cue
          if (tile.ownerId === playerId) {
            absorbedTiles.push({ x: tile.x, y: tile.y });
          }
        });

        if (absorbedTiles.length > 0) {
          this.gridRenderer?.playAbsorptionEffect(absorbedTiles);
        }
      }
    });
  }

  private handleTileClick(pointer: Phaser.Input.Pointer): void {
    if (!this.gridRenderer || !this.room) return;
    if (this.hudManager?.isCaptureChoiceVisible()) return;

    // Record activity for idle nudge tracking
    this.lastActionTime = this.time.now;
    this.dismissIdleNudge();

    const gridPos = this.gridRenderer.pixelToGrid(pointer.x, pointer.y);
    if (!gridPos) return;

    // If in collector placement mode, place a collector instead of normal action
    if (this.placingCollector) {
      this.placingCollector = false;
      this.networkManager.sendPlaceCollector(gridPos.x, gridPos.y);
      return;
    }

    // If in defense bot placement mode, place a defense bot
    if (this.placingDefenseBot) {
      this.placingDefenseBot = false;
      this.networkManager.sendPlaceDefenseBot(gridPos.x, gridPos.y);
      return;
    }

    // Check tile state for gear handling
    let tileHasGear = false;
    let tileOwnerId = "";
    const effectiveId = this.getEffectivePlayerId(this.room.state);
    this.room.state.tiles.forEach((tile: any) => {
      if (tile.x === gridPos.x && tile.y === gridPos.y) {
        if (tile.hasGear && tile.gearScrap > 0) tileHasGear = true;
        tileOwnerId = tile.ownerId;
      }
    });

    let actionTaken = false;

    if (tileOwnerId === "") {
      // Unclaimed tile — try to claim it
      this.networkManager.sendClaimTile(gridPos.x, gridPos.y);
      actionTaken = true;
    } else if (tileOwnerId !== effectiveId) {
      // Enemy tile — initiate attack
      this.networkManager.sendAttackTile(gridPos.x, gridPos.y);
      // Start attack sound loop for this tile (if not already playing)
      const atkKey = `${gridPos.x},${gridPos.y}`;
      if (!this.attackSounds.has(atkKey)) {
        const snd = this.sound.add("attackSfx", { loop: true, volume: 0.3 });
        snd.play();
        this.attackSounds.set(atkKey, snd);
      }
      actionTaken = true;
    }

    if (tileHasGear && (tileOwnerId === "" || tileOwnerId === effectiveId)) {
      // Optimistic mine flash before sending network message
      console.log("[mineGear] client sending mineGear at", gridPos, "tileOwnerId:", tileOwnerId, "effectiveId:", effectiveId);
      const localPlayer = this.room.state.players.get(this.localSessionId);
      const mineFlashColor = (localPlayer?.color ?? -1) >= 0 ? localPlayer!.color : 0xffd700;
      this.gridRenderer!.playMineFlash(gridPos.x, gridPos.y, mineFlashColor);
      this.networkManager.sendMineGear(gridPos.x, gridPos.y);
      this.sound.play("mineSfx", { volume: 0.6 });
      actionTaken = true;
    }

    if (!actionTaken) {
      console.log("[click] no action taken at", gridPos, "tileOwnerId:", tileOwnerId, "tileHasGear:", tileHasGear, "effectiveId:", effectiveId);
      this.sound.play("errorSfx", { volume: 0.5 });
    }
  }

  private handleTooltip(pointer: Phaser.Input.Pointer): void {
    if (!this.gridRenderer || !this.room) {
      this.tooltipText.setAlpha(0);
      return;
    }

    const gridPos = this.gridRenderer.pixelToGrid(pointer.x, pointer.y);
    if (!gridPos) {
      this.tooltipText.setAlpha(0);
      return;
    }

    let info = "";
    this.room.state.tiles.forEach((tile: any) => {
      if (tile.x === gridPos.x && tile.y === gridPos.y) {
        if (tile.ownerId) {
          const owner = this.room.state.players.get(tile.ownerId);
          const ownerName = owner?.teamName || tile.ownerId.slice(0, 8);
          info = `${ownerName}`;
          if (tile.hasGear && tile.gearScrap > 0) {
            info += ` | ⚙ ${tile.gearScrap}`;
          }
        } else if (tile.hasGear && tile.gearScrap > 0) {
          info = `Unclaimed | ⚙ ${tile.gearScrap}`;
        }
      }
    });

    if (info) {
      this.tooltipText.setText(info);
      // Clamp tooltip to game bounds
      let tx = pointer.x + 12;
      let ty = pointer.y - 20;
      const tw = this.tooltipText.width;
      const th = this.tooltipText.height;
      if (tx + tw > 800) tx = pointer.x - tw - 8;
      if (ty < 0) ty = pointer.y + 12;
      if (ty + th > 600) ty = 600 - th;
      this.tooltipText.setPosition(tx, ty);
      this.tooltipText.setAlpha(1);
    } else {
      this.tooltipText.setAlpha(0);
    }
  }

  private showEndScreen(state: any): void {
    // Find the winner (most tiles among non-absorbed players)
    let winnerName = "";
    let maxTiles = 0;
    state.players.forEach((player: any) => {
      if (!player.absorbed && player.tileCount > maxTiles) {
        maxTiles = player.tileCount;
        winnerName = player.teamName || "Unknown";
      }
    });

    // Dark overlay
    this.add
      .rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200);

    // Winner announcement
    this.add
      .text(400, 220, "GAME OVER", {
        fontSize: "40px",
        color: "#ffcc44",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.add
      .text(400, 280, `${winnerName} wins with ${maxTiles} tiles!`, {
        fontSize: "18px",
        color: "#e0a030",
        fontFamily: "monospace",
        wordWrap: { width: 600 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(201);

    // Back to menu button
    const bg = this.add
      .rectangle(400, 370, 220, 50, 0x3a6a2a, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(201);

    this.add
      .text(400, 370, "BACK TO MENU", {
        fontSize: "18px",
        color: "#ffcc44",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(202);

    bg.on("pointerover", () => bg.setFillStyle(0x4a8a3a, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x3a6a2a, 0.9));
    bg.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }

  private createHintButton(): void {
    const btn = this.add
      .text(10, GAME_HEIGHT - 36, "💡 Help", {
        fontSize: "18px",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    btn.on("pointerdown", () => this.showHintPopup());

    const leaveBtn = this.add
      .text(10, GAME_HEIGHT - 14, "🚪 Leave", {
        fontSize: "14px",
        color: "#ff4444",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    leaveBtn.on("pointerover", () => leaveBtn.setColor("#ff8888"));
    leaveBtn.on("pointerout", () => leaveBtn.setColor("#ff4444"));
    leaveBtn.on("pointerdown", () => this.showLeaveConfirmation());
  }

  private leaveConfirmElements: Phaser.GameObjects.GameObject[] = [];

  private showLeaveConfirmation(): void {
    if (this.leaveConfirmElements.length > 0) return;

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(400).setInteractive();
    this.leaveConfirmElements.push(overlay);

    const box = this.add.rectangle(400, 280, 380, 140, 0x1a1a2e, 0.95)
      .setDepth(401).setStrokeStyle(2, 0x3a3a2a);
    this.leaveConfirmElements.push(box);

    const msg = this.add.text(400, 250, "Are you sure?\nYou will not be able to reenter this game.", {
      fontSize: "13px", color: "#e0a030", fontFamily: "monospace",
      align: "center",
    }).setOrigin(0.5).setDepth(402);
    this.leaveConfirmElements.push(msg);

    const yesBtn = this.add.text(340, 310, "[YES]", {
      fontSize: "16px", color: "#ff4444", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(402).setInteractive({ useHandCursor: true });
    yesBtn.on("pointerover", () => yesBtn.setColor("#ff8888"));
    yesBtn.on("pointerout", () => yesBtn.setColor("#ff4444"));
    yesBtn.on("pointerdown", () => {
      this.networkManager.sendLeaveGame();
      this.time.delayedCall(200, () => {
        if (this.room) this.room.leave();
        this.scene.start("MenuScene");
      });
    });
    this.leaveConfirmElements.push(yesBtn);

    const noBtn = this.add.text(460, 310, "[NO]", {
      fontSize: "16px", color: "#ffcc44", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(402).setInteractive({ useHandCursor: true });
    noBtn.on("pointerover", () => noBtn.setColor("#ffffff"));
    noBtn.on("pointerout", () => noBtn.setColor("#ffcc44"));
    noBtn.on("pointerdown", () => {
      this.leaveConfirmElements.forEach((el) => el.destroy());
      this.leaveConfirmElements = [];
    });
    this.leaveConfirmElements.push(noBtn);
  }

  private showHintPopup(): void {
    // Don't open multiple popups
    if (this.hintPopupElements.length > 0) return;

    const overlay = this.add
      .rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200)
      .setInteractive();
    this.hintPopupElements.push(overlay);

    const box = this.add
      .rectangle(400, 280, 340, 260, 0x1a1a2e, 0.95)
      .setDepth(201)
      .setStrokeStyle(2, 0x3a3a2a);
    this.hintPopupElements.push(box);

    const title = this.add
      .text(400, 180, "CONTROLS", {
        fontSize: "16px",
        color: "#ffcc44",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(202);
    this.hintPopupElements.push(title);

    const controlLines = [
      { text: "Click neutral    → Claim tile (costs scrap)", color: "#e0a030" },
      { text: "Click gear ⚙️    → Mine scrap", color: "#e0a030" },
      { text: "Click enemy tile → Attack (team lead only)", color: "#e0a030" },
      { text: "⚔️ ATK Bot       → Max additional simultaneous attacks", color: "#ff3b30" },
      { text: "🛡️ DEF Bot       → Buy defense bot", color: "#4682b4" },
      { text: "Click 🛡️ then tile → Place +5 defense (max 4)", color: "#4682b4" },
      { text: "⚙️ COL Bot       → Buy collector", color: "#e0a030" },
      { text: "Click ⚒ then tile → Place automine", color: "#e0a030" },
    ];

    let lineY = 230;
    for (const line of controlLines) {
      const lineText = this.add
        .text(240, lineY, line.text, {
          fontSize: "12px",
          color: line.color,
          fontFamily: "monospace",
        })
        .setDepth(202);
      this.hintPopupElements.push(lineText);
      lineY += 20;
    }

    const closeBtn = this.add
      .text(555, 165, "✕", {
        fontSize: "18px",
        color: "#ffcc44",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(202)
      .setInteractive({ useHandCursor: true });
    this.hintPopupElements.push(closeBtn);

    closeBtn.on("pointerdown", () => {
      this.hintPopupElements.forEach((el) => el.destroy());
      this.hintPopupElements = [];
    });
  }

  /** Check if the absorbed player has been idle long enough to show a nudge */
  private checkIdleNudge(): void {
    if (this.gameEnded) return;
    if (this.idleNudgeElements.length > 0) return; // already showing
    const elapsed = this.time.now - this.lastActionTime;
    if (elapsed >= 7000) {
      this.showIdleNudge();
    }
  }

  /** Display a random nudge message for absorbed idle players */
  private showIdleNudge(): void {
    const msgs = GameScene.IDLE_NUDGE_MESSAGES;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    const bg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 500, 44, 0x1a1a2e, 0.92)
      .setDepth(300)
      .setStrokeStyle(2, 0xe0a030)
      .setInteractive({ useHandCursor: true });
    this.idleNudgeElements.push(bg);

    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, msg, {
        fontSize: "12px",
        color: "#ffcc44",
        fontFamily: "monospace",
        align: "center",
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.idleNudgeElements.push(text);

    // Dismiss on click
    bg.on("pointerdown", () => {
      this.dismissIdleNudge();
      this.lastActionTime = this.time.now;
    });

    // Auto-dismiss after 3 seconds
    const autoTimer = this.time.delayedCall(3000, () => {
      this.dismissIdleNudge();
      // Reset so another nudge can fire after 7 more idle seconds
      this.lastActionTime = this.time.now;
    });
    this.idleNudgeElements.push(autoTimer as unknown as Phaser.GameObjects.GameObject);
  }

  /** Remove the idle nudge banner if visible */
  private dismissIdleNudge(): void {
    for (const el of this.idleNudgeElements) {
      if (el instanceof Phaser.Time.TimerEvent) {
        el.remove(false);
      } else {
        el.destroy();
      }
    }
    this.idleNudgeElements = [];
  }

  /**
   * Play a giant countdown overlay: 3 → 2 → 1 → label.
   * Each number appears at 50% opacity, scales up, and fades out over 1 second.
   * @param startFrom Number to count down from (e.g. 3)
   * @param finalLabel Text to show after reaching 0 (e.g. "GO!" or "TIME!")
   * @param finalColor Color for the final label
   */
  private playCountdown(startFrom: number, finalLabel: string, finalColor: string = "#ffcc44"): void {
    const steps: string[] = [];
    for (let i = startFrom; i >= 1; i--) {
      steps.push(String(i));
    }
    steps.push(finalLabel);

    let stepIndex = 0;
    const showNext = () => {
      if (stepIndex >= steps.length) return;

      const label = steps[stepIndex];
      const isLast = stepIndex === steps.length - 1;
      const color = isLast ? finalColor : "#ffffff";
      const fontSize = isLast ? "120px" : "160px";

      const text = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, label, {
          fontSize,
          color,
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0.5)
        .setDepth(500)
        .setScale(0.5);

      this.tweens.add({
        targets: text,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0,
        duration: 900,
        ease: "Power2",
        onComplete: () => text.destroy(),
      });

      stepIndex++;
      if (stepIndex < steps.length) {
        this.time.delayedCall(1000, showNext);
      }
    };

    showNext();
  }

}
