import Phaser from "phaser";
import { NetworkManager } from "../network/NetworkManager";
import { GridRenderer } from "../rendering/GridRenderer";
import { HUDManager } from "../ui/HUDManager";
import { filterByDirection } from "../logic/DirectionFilter";

export class GameScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private gridRenderer: GridRenderer | null = null;
  private hudManager: HUDManager | null = null;
  private room: any = null;
  private localSessionId: string = "";
  private currentDirection: string = "";
  private absorbedPlayerIds: Set<string> = new Set();
  private connectingText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // Show connecting message
    this.connectingText = this.add
      .text(400, 300, "Connecting...", {
        fontSize: "24px",
        color: "#e0a030",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Instantiate NetworkManager and join game
    this.networkManager = new NetworkManager();
    this.networkManager.joinGame().then((room) => {
      this.room = room;
      this.localSessionId = room.sessionId;
      this.setupStateListener();
    });

    // Set up keyboard listeners for direction selection
    this.setupDirectionKeys();

    // Set up tile click handler
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleTileClick(pointer);
    });
  }

  private setupStateListener(): void {
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
          this.networkManager.sendUpgradeAttack();
        };
        this.hudManager.onUpgradeDefense = () => {
          this.networkManager.sendUpgradeDefense();
        };
      }

      this.onStateUpdate(state);
    });
  }

  private onStateUpdate(state: any): void {
    if (!this.gridRenderer || !this.hudManager) return;

    // Clear and re-render all tiles
    this.gridRenderer.clear();
    state.tiles.forEach((tile: any) => {
      this.gridRenderer!.renderTile(tile.x, tile.y, tile.ownerId);
    });

    // Get local player stats
    const localPlayer = state.players.get(this.localSessionId);
    if (localPlayer) {
      this.hudManager.updateStats(
        localPlayer.resources,
        localPlayer.attack,
        localPlayer.defense,
        localPlayer.tileCount,
        localPlayer.tileCount // income rate = tileCount (1 scrap/tile/sec)
      );

      // Calculate upgrade costs
      const attackCost = 50 * localPlayer.attack;
      const defenseCost = 50 * localPlayer.defense;
      this.hudManager.updateUpgradeCosts(attackCost, defenseCost);
    }

    // Build leaderboard from non-absorbed players
    const leaderboardData: { id: string; tileCount: number }[] = [];
    state.players.forEach((player: any, key: string) => {
      if (!player.absorbed) {
        leaderboardData.push({ id: player.id || key, tileCount: player.tileCount });
      }
    });
    this.hudManager.updateLeaderboard(leaderboardData);

    // Detect new absorptions and show notifications / effects
    this.detectAbsorptions(state);

    // Highlight claimable tiles for local player
    this.highlightClaimableTiles(state);
  }

  private highlightClaimableTiles(state: any): void {
    if (!this.gridRenderer) return;

    // Collect player's tiles and all neutral tiles
    const playerTiles: { x: number; y: number }[] = [];
    const neutralTiles: { x: number; y: number }[] = [];

    state.tiles.forEach((tile: any) => {
      if (tile.ownerId === this.localSessionId) {
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

    // Filter by direction if one is selected
    const filtered = filterByDirection(
      claimable,
      playerTiles,
      this.currentDirection
    );

    this.gridRenderer.highlightClaimable(filtered, this.currentDirection);
  }

  private detectAbsorptions(state: any): void {
    state.players.forEach((player: any, key: string) => {
      const playerId = player.id || key;
      if (player.absorbed && !this.absorbedPlayerIds.has(playerId)) {
        this.absorbedPlayerIds.add(playerId);

        // Show notification
        this.hudManager?.showNotification(
          `${playerId.slice(0, 8)} has been absorbed!`
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
    if (!this.gridRenderer) return;

    const gridPos = this.gridRenderer.pixelToGrid(pointer.x, pointer.y);
    if (gridPos) {
      this.networkManager.sendClaimTile(gridPos.x, gridPos.y);
    }
  }

  private setupDirectionKeys(): void {
    const cursors = this.input.keyboard?.createCursorKeys();
    if (!cursors) return;

    const directionMap: Record<string, string> = {
      up: "north",
      down: "south",
      left: "west",
      right: "east",
    };

    for (const [keyName, direction] of Object.entries(directionMap)) {
      const key = cursors[keyName as keyof Phaser.Types.Input.Keyboard.CursorKeys] as Phaser.Input.Keyboard.Key;
      key.on("down", () => {
        if (this.currentDirection === direction) {
          // Press same direction again to clear
          this.currentDirection = "";
          this.networkManager.sendSetDirection("");
        } else {
          this.currentDirection = direction;
          this.networkManager.sendSetDirection(direction);
        }
      });
    }

    // Escape to clear direction
    this.input.keyboard?.on("keydown-ESC", () => {
      this.currentDirection = "";
      this.networkManager.sendSetDirection("");
    });
  }
}
