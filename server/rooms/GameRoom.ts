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

  onCreate() {
    this.setState(new GameState());
    this.state.phase = "waiting";
    console.log("GameRoom created");

    // --- Message Handlers ---

    this.onMessage("claimTile", (client, data: { x: number; y: number }) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const { x, y } = data;

      // Find the tile at (x, y)
      const tile = this.state.tiles.find((t) => t.x === x && t.y === y);
      if (!tile || tile.ownerId !== "") return;

      // Gather player's owned tiles for adjacency check
      const playerTiles = this.state.tiles.filter(
        (t) => t.ownerId === client.sessionId
      );
      if (!isAdjacent(x, y, playerTiles)) return;

      // Calculate cost and validate resources
      const cost = calculateTileClaimCost(player.tileCount);
      if (player.resources < cost) return;

      // Apply the claim
      player.resources -= cost;
      tile.ownerId = player.id;
      player.tileCount += 1;
    });

    this.onMessage("upgradeAttack", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const cost = calculateUpgradeCost(player.attack);
      if (player.resources < cost) return;

      player.resources -= cost;
      player.attack += 1;
    });

    this.onMessage("upgradeDefense", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.absorbed) return;

      const cost = calculateUpgradeCost(player.defense);
      if (player.resources < cost) return;

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
  }

  onJoin(client: Client) {
    const player = new Player();
    player.id = client.sessionId;
    player.resources = 0;
    player.attack = 1;
    player.defense = 1;
    player.tileCount = 1;
    player.absorbed = false;
    player.direction = "";

    this.state.players.set(client.sessionId, player);
    console.log(`${client.sessionId} joined`);

    if (this.state.players.size >= 2 && this.state.phase === "waiting") {
      this.startGame();
    }
  }

  onLeave(client: Client) {
    // Convert all of the leaving player's tiles to neutral
    this.state.tiles.forEach((tile) => {
      if (tile.ownerId === client.sessionId) {
        tile.ownerId = "";
      }
    });

    // Update tileCount before removal
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.tileCount = 0;
    }

    this.state.players.delete(client.sessionId);
    console.log(`${client.sessionId} left`);
  }

  onDispose() {
    if (this.gameLoopInterval) {
      this.gameLoopInterval.clear();
      this.gameLoopInterval = null;
    }
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

    // Set starting tiles' ownerId to the player id
    for (const [playerId, pos] of startingPositions) {
      const tile = tiles.find((t) => t.x === pos.x && t.y === pos.y);
      if (tile) {
        tile.ownerId = playerId;
      }
    }

    // Populate state
    this.state.tiles.clear();
    for (const tile of tiles) {
      this.state.tiles.push(tile);
    }

    this.state.gridWidth = gridSize;
    this.state.gridHeight = gridSize;
    this.state.phase = "active";

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

    const { gridWidth, gridHeight } = this.state;

    // Build internal TileGrid lookup: [y][x] → ownerId
    const tileGrid: string[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      tileGrid[y] = new Array(gridWidth).fill("");
    }
    for (const tile of this.state.tiles) {
      tileGrid[tile.y][tile.x] = tile.ownerId;
    }

    // 1. Award resource income: each non-absorbed player gains scrap = tileCount
    this.state.players.forEach((player) => {
      if (!player.absorbed) {
        player.resources += player.tileCount;
      }
    });

    // 2. Evaluate all borders
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
          // Award bonus scrap: floor(0.25 * absorbed player's resources)
          if (toPlayer) {
            toPlayer.resources += Math.floor(0.25 * fromPlayer.resources);
          }
        }
      }
    }
  }
}
