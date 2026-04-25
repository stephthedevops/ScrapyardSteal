import Phaser from "phaser";

/** Industrial/scrapyard player color palette */
const PLAYER_COLORS: number[] = [
  0xb87333, // copper
  0x4a8a5e, // corroded copper (green)
  0xffd700, // gold
  0x8a8a7a, // tarnished silver
  0x7a3ea0, // titanium (purple)
  0x0047ab, // cobalt
  0xff00ff, // bismuth
  0x8b4513, // rusty iron (brick)
  0xdbe4eb, // chromium
  0x36454f, // tungsten
  0xcda434, // brass
  0x2eb8a6, // verdigris
  0xe8a0bf, // rose gold
  0x5c6670, // gunmetal
  0xa8a495, // nickel
  0xc44b2f, // oxidized iron
  0x4682b4, // titanium blue
  0xff6b35, // molten
  0xe6e0d4, // palladium
  0x6b4226, // dark bronze
];

const NEUTRAL_COLOR = 0x3a3a3a;
const GRID_LINE_COLOR = 0x2a2a2a;
const HIGHLIGHT_COLOR = 0xffcc44;
const HIGHLIGHT_DIRECTION_COLOR = 0xffee88;
const ABSORPTION_FLASH_COLOR = 0xffffff;

/** Game area dimensions (matching Phaser config) */
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

/**
 * Layout margins — the grid is constrained to the area between these edges
 * so HUD panels never overlap the playfield.
 */
const LEFT_MARGIN = 140;   // stats panel width
const RIGHT_MARGIN = 140;  // leaderboard + purchase bot panel width
const TOP_MARGIN = 8;      // small top gap
const BOTTOM_MARGIN = 50;  // identity text + bot icons
const GRID_PADDING = 4;    // breathing room inside the margins

export class GridRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private gridWidth: number;
  private gridHeight: number;
  private tileSize: number;
  private offsetX: number;
  private offsetY: number;
  private playerColorMap: Map<string, number> = new Map();
  private nextColorIndex = 0;

  /**
   * Brighten a hex color by blending each RGB channel toward 255.
   * @param color  Numeric hex color (e.g. 0x36454f)
   * @param amount How far to blend toward white (0.0–1.0, default 0.3)
   * @returns      Brightened numeric hex color
   */
  static brightenColor(color: number, amount: number = 0.3): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const newR = Math.min(255, Math.max(0, Math.floor(r + (255 - r) * amount)));
    const newG = Math.min(255, Math.max(0, Math.floor(g + (255 - g) * amount)));
    const newB = Math.min(255, Math.max(0, Math.floor(b + (255 - b) * amount)));

    return (newR << 16) | (newG << 8) | newB;
  }

  constructor(scene: Phaser.Scene, gridWidth: number, gridHeight: number) {
    this.scene = scene;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.graphics = scene.add.graphics();

    // Available area for the grid after reserving space for HUD panels
    const availableWidth = GAME_WIDTH - LEFT_MARGIN - RIGHT_MARGIN - GRID_PADDING * 2;
    const availableHeight = GAME_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN - GRID_PADDING * 2;
    this.tileSize = Math.floor(
      Math.min(availableWidth / gridWidth, availableHeight / gridHeight)
    );

    // Center the grid within the available area
    const totalGridWidth = this.tileSize * gridWidth;
    const totalGridHeight = this.tileSize * gridHeight;
    this.offsetX = LEFT_MARGIN + GRID_PADDING + Math.floor((availableWidth - totalGridWidth) / 2);
    this.offsetY = TOP_MARGIN + GRID_PADDING + Math.floor((availableHeight - totalGridHeight) / 2);
  }

  /** Set a player's color (from lobby selection) */
  setPlayerColor(ownerId: string, color: number): void {
    this.playerColorMap.set(ownerId, color);
  }

  /** Get or assign a color for a player */
  private getPlayerColor(ownerId: string): number {
    if (!ownerId || ownerId === "") {
      return NEUTRAL_COLOR;
    }
    let color = this.playerColorMap.get(ownerId);
    if (color === undefined) {
      color = PLAYER_COLORS[this.nextColorIndex % PLAYER_COLORS.length];
      this.playerColorMap.set(ownerId, color);
      this.nextColorIndex++;
    }
    return color;
  }

  /** Convert grid coordinates to pixel position */
  private gridToPixel(x: number, y: number): { px: number; py: number } {
    return {
      px: this.offsetX + x * this.tileSize,
      py: this.offsetY + y * this.tileSize,
    };
  }

  private spawnTiles: Set<string> = new Set();
  private spawnIcons: Phaser.GameObjects.Text[] = [];
  private gearTiles: Set<string> = new Set();
  private gearIcons: Phaser.GameObjects.Text[] = [];
  private costLabels: Phaser.GameObjects.Text[] = [];
  private collectorTiles: Set<string> = new Set();
  private collectorIcons: Phaser.GameObjects.Text[] = [];
  private defenseIcons: Phaser.GameObjects.Text[] = [];
  private defenseBotCounts: Map<string, number> = new Map();

  /** Mark a tile as having a gear decoration */
  setGearTile(x: number, y: number): void {
    this.gearTiles.add(`${x},${y}`);
  }

  /** Remove a gear tile (depleted) */
  removeGearTile(x: number, y: number): void {
    this.gearTiles.delete(`${x},${y}`);
  }

  /** Mark a tile as a spawn point */
  setSpawnTile(x: number, y: number): void {
    this.spawnTiles.add(`${x},${y}`);
  }

  /** Mark a tile as having a collector (⚒) */
  setCollectorTile(x: number, y: number): void {
    this.collectorTiles.add(`${x},${y}`);
  }

  /** Clear all collector tile markers */
  clearCollectorTiles(): void {
    this.collectorTiles.clear();
  }

  /** Update defense bot counts per tile */
  setDefenseBotData(counts: Map<string, number>): void {
    this.defenseBotCounts = counts;
  }

  /**
   * Draw a tile at grid position with the player's color or neutral color.
   * If animate=true, play a brief scale-pulse tween on the tile.
   */
  renderTile(x: number, y: number, ownerId: string, animate?: boolean): void {
    const color = this.getPlayerColor(ownerId);
    const { px, py } = this.gridToPixel(x, y);

    // Draw filled tile
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(px, py, this.tileSize, this.tileSize);

    // Draw grid line border
    this.graphics.lineStyle(1, GRID_LINE_COLOR, 1);
    this.graphics.strokeRect(px, py, this.tileSize, this.tileSize);

    // Draw defense indicator on owned tiles (shield behind, number in front)
    if (ownerId !== "" && this.tileSize >= 16) {
      const botCount = this.defenseBotCounts.get(`${x},${y}`) ?? 0;
      const tileDefense = 5 + botCount * 5;
      const shieldSize = Math.max(6, Math.floor(this.tileSize * 0.22));
      const shieldIcon = this.scene.add
        .text(px + this.tileSize / 2, py + 2, "🛡", {
          fontSize: `${shieldSize}px`,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.35)
        .setDepth(2);
      this.defenseIcons.push(shieldIcon);

      const defLabel = this.scene.add
        .text(px + this.tileSize / 2, py + 2, `${tileDefense}`, {
          fontSize: `${shieldSize}px`,
          color: "#ffffff",
          fontFamily: "monospace",
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.5)
        .setDepth(3);
      this.defenseIcons.push(defLabel);
    }

    // Draw factory icon on spawn tiles
    if (this.spawnTiles.has(`${x},${y}`) && ownerId !== "") {
      const fontSize = Math.max(6, Math.floor(this.tileSize * 0.5));
      const icon = this.scene.add
        .text(px + this.tileSize / 2, py + this.tileSize / 2, "🏭", {
          fontSize: `${fontSize}px`,
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.spawnIcons.push(icon);
    }

    // Draw gear icon on gear tiles (only if has remaining scrap and unclaimed or no owner)
    if (this.gearTiles.has(`${x},${y}`)) {
      const gearSize = Math.max(6, Math.floor(this.tileSize * 0.5));
      const gearIcon = this.scene.add
        .text(px + this.tileSize / 2, py + this.tileSize / 2, "⚙️", {
          fontSize: `${gearSize}px`,
        })
        .setOrigin(0.5)
        .setDepth(4);
      this.gearIcons.push(gearIcon);
    }

    // Draw collector icon (⚒) on tiles with placed collectors
    if (this.collectorTiles.has(`${x},${y}`)) {
      const colSize = Math.max(6, Math.floor(this.tileSize * 0.4));
      const colIcon = this.scene.add
        .text(px + this.tileSize * 0.75, py + this.tileSize * 0.25, "⚒", {
          fontSize: `${colSize}px`,
          color: "#ffcc44",
        })
        .setOrigin(0.5)
        .setDepth(6);
      this.collectorIcons.push(colIcon);
    }

    if (animate) {
      this.playClaimAnimation(px, py);
    }
  }

  /** Play a gold flash animation on a gear tile being mined */
  playMineFlash(gridX: number, gridY: number, playerColor?: number): void {
    const { px, py } = this.gridToPixel(gridX, gridY);
    const flashColor = playerColor ?? 0xffd700;
    const flash = this.scene.add.rectangle(
      px + this.tileSize / 2,
      py + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      flashColor,
      0.6
    );
    flash.setDepth(10);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }

  /** Play a brief scale-pulse animation on a tile */
  private playClaimAnimation(px: number, py: number): void {
    const flash = this.scene.add.rectangle(
      px + this.tileSize / 2,
      py + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      0xffffff,
      0.6
    );
    flash.setDepth(10);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Draw highlight borders around claimable tiles.
   * Tiles matching the selected direction get a brighter highlight.
   */
  highlightClaimable(
    tiles: { x: number; y: number }[],
    direction: string,
    tileCost?: number,
    playerColor?: number
  ): void {
    const baseColor = playerColor !== undefined ? playerColor : HIGHLIGHT_COLOR;
    const brightColor = playerColor !== undefined
      ? GridRenderer.brightenColor(playerColor)
      : HIGHLIGHT_DIRECTION_COLOR;
    const costColorStr = playerColor !== undefined
      ? `#${playerColor.toString(16).padStart(6, "0")}`
      : "#ffcc44";

    for (const tile of tiles) {
      const { px, py } = this.gridToPixel(tile.x, tile.y);
      const isBright = this.isTileInDirection(tile, direction);
      const color = isBright ? brightColor : baseColor;

      this.graphics.lineStyle(2, color, isBright ? 1 : 0.6);
      this.graphics.strokeRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);

      // Show cost on claimable tiles (only if tile is large enough)
      if (tileCost !== undefined && this.tileSize >= 16) {
        const fontSize = Math.max(6, Math.floor(this.tileSize * 0.22));
        const costText = this.scene.add
          .text(px + this.tileSize / 2, py + this.tileSize - 2, `-${tileCost}`, {
            fontSize: `${fontSize}px`,
            color: costColorStr,
            fontFamily: "monospace",
          })
          .setOrigin(0.5, 1)
          .setAlpha(0.7)
          .setDepth(3);
        this.costLabels.push(costText);
      }
    }
  }

  /** Check if a tile lies in the given direction (simple quadrant check) */
  private isTileInDirection(
    tile: { x: number; y: number },
    direction: string
  ): boolean {
    if (!direction || direction === "") return false;

    // Use grid center as reference when no territory centroid is available
    const cx = this.gridWidth / 2;
    const cy = this.gridHeight / 2;
    const dx = tile.x - cx;
    const dy = tile.y - cy;

    switch (direction) {
      case "north":
        return dy < 0;
      case "south":
        return dy > 0;
      case "east":
        return dx > 0;
      case "west":
        return dx < 0;
      default:
        return false;
    }
  }

  /**
   * Play a visual flash effect on the given tile positions (absorption effect).
   */
  playAbsorptionEffect(tiles: { x: number; y: number }[]): void {
    for (const tile of tiles) {
      const { px, py } = this.gridToPixel(tile.x, tile.y);

      const flash = this.scene.add.rectangle(
        px + this.tileSize / 2,
        py + this.tileSize / 2,
        this.tileSize,
        this.tileSize,
        ABSORPTION_FLASH_COLOR,
        0.8
      );
      flash.setDepth(10);

      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 500,
        ease: "Power2",
        onComplete: () => flash.destroy(),
      });
    }
  }

  /** Get the tile size (useful for click detection) */
  getTileSize(): number {
    return this.tileSize;
  }

  /** Get the grid offset (useful for click detection) */
  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  /** Convert pixel coordinates to grid coordinates, or null if out of bounds */
  pixelToGrid(px: number, py: number): { x: number; y: number } | null {
    const gx = Math.floor((px - this.offsetX) / this.tileSize);
    const gy = Math.floor((py - this.offsetY) / this.tileSize);
    if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) {
      return null;
    }
    return { x: gx, y: gy };
  }

  /** Clear all graphics (call before full re-render) */
  clear(): void {
    this.graphics.clear();
    this.spawnIcons.forEach((icon) => icon.destroy());
    this.spawnIcons = [];
    this.gearIcons.forEach((icon) => icon.destroy());
    this.gearIcons = [];
    this.collectorIcons.forEach((icon) => icon.destroy());
    this.collectorIcons = [];
    this.defenseIcons.forEach((icon) => icon.destroy());
    this.defenseIcons = [];
    this.costLabels.forEach((label) => label.destroy());
    this.costLabels = [];
  }
}
