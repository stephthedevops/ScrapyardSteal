import Phaser from "phaser";

/** Scrapyard-themed HUD colors */
const AMBER = "#e0a030";
const GOLD = "#ffcc44";
const DARK_BG = 0x1a1a1a;
const DARK_BG_ALPHA = 0.75;
const BUTTON_BG = 0x3a3a2a;
const BUTTON_HOVER = 0x5a5a3a;
const FONT_FAMILY = "monospace";
const HUD_DEPTH = 100;

/** Game dimensions (matching Phaser config) */
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

/**
 * HUD layout zones — must stay in sync with GridRenderer margins.
 * Left panel:  0 → 136
 * Right panel:  664 → 800
 * Bottom strip: 554 → 600
 * Top strip:    0 → 8  (leaderboard floats top-center, above grid)
 */
const LEFT_PANEL_W = 136;
const RIGHT_PANEL_W = 136;
const BOTTOM_STRIP_Y = 554;

export class HUDManager {
  private scene: Phaser.Scene;

  // Stats panel (left gutter)
  private statsBg: Phaser.GameObjects.Rectangle;
  private statsTitle: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;

  // Leaderboard (top-center, above grid)
  private leaderboardBg: Phaser.GameObjects.Rectangle;
  private leaderboardTitle: Phaser.GameObjects.Text;
  private leaderboardText: Phaser.GameObjects.Text;

  // Upgrade buttons (right gutter)
  private attackButton: Phaser.GameObjects.Container;
  private defenseButton: Phaser.GameObjects.Container;
  private collectionButton: Phaser.GameObjects.Container;
  private attackCostText: Phaser.GameObjects.Text;
  private defenseCostText: Phaser.GameObjects.Text;
  private collectionCostText: Phaser.GameObjects.Text;

  // Notification (center)
  private notificationText: Phaser.GameObjects.Text;
  private notificationTimer?: Phaser.Time.TimerEvent;

  // Player identity (bottom strip)
  private identityText: Phaser.GameObjects.Text;

  // Collector icons (⚒) displayed above identity line
  private collectorIcons: Phaser.GameObjects.Text[] = [];
  private collectorCount: number = 0;
  private placedCollectorCount: number = 0;

  // Callbacks for upgrade buttons
  public onUpgradeAttack: (() => void) | null = null;
  public onUpgradeDefense: (() => void) | null = null;
  public onUpgradeCollection: (() => void) | null = null;
  public onCollectorClick: ((index: number) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // ─── LEFT GUTTER: Stats panel ───────────────────────────────────
    const statsX = 4;
    const statsY = 8;

    this.statsBg = scene.add
      .rectangle(statsX, statsY, LEFT_PANEL_W - 8, 200, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH);

    this.statsTitle = scene.add
      .text(statsX + 6, statsY + 6, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
        wordWrap: { width: LEFT_PANEL_W - 20 },
      })
      .setDepth(HUD_DEPTH + 1);

    this.statsText = scene.add
      .text(statsX + 6, statsY + 24, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: AMBER,
        lineSpacing: 3,
      })
      .setDepth(HUD_DEPTH + 1);

    // ─── TOP-CENTER: Leaderboard ────────────────────────────────────
    // Positioned above the grid, centered horizontally
    this.leaderboardBg = scene.add
      .rectangle(GAME_WIDTH / 2, 4, 260, 20, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH);

    this.leaderboardTitle = scene.add
      .text(GAME_WIDTH / 2, 6, "LEADERBOARD", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
      })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH + 1);

    this.leaderboardText = scene.add
      .text(GAME_WIDTH / 2, 20, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: AMBER,
        lineSpacing: 1,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH + 1);

    // ─── RIGHT GUTTER: Purchase Bot buttons ─────────────────────────
    const rightX = GAME_WIDTH - RIGHT_PANEL_W / 2;
    const btnStartY = 30;

    // Legend background
    scene.add
      .rectangle(rightX, btnStartY + 70, RIGHT_PANEL_W - 4, 190, DARK_BG, DARK_BG_ALPHA)
      .setDepth(HUD_DEPTH);

    // Legend title
    scene.add
      .text(rightX, btnStartY, "PURCHASE BOT", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    this.attackCostText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
      })
      .setOrigin(0.5, 0.5);

    this.defenseCostText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
      })
      .setOrigin(0.5, 0.5);

    this.collectionCostText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: GOLD,
      })
      .setOrigin(0.5, 0.5);

    this.attackButton = this.createUpgradeButton(
      rightX,
      btnStartY + 30,
      "⚔ ATK Bot",
      this.attackCostText,
      () => this.onUpgradeAttack?.()
    );

    this.defenseButton = this.createUpgradeButton(
      rightX,
      btnStartY + 70,
      "🛡 DEF Bot",
      this.defenseCostText,
      () => this.onUpgradeDefense?.()
    );

    this.collectionButton = this.createUpgradeButton(
      rightX,
      btnStartY + 110,
      "⚙ COL Bot",
      this.collectionCostText,
      () => this.onUpgradeCollection?.()
    );

    // ─── CENTER: Notification ───────────────────────────────────────
    this.notificationText = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: GOLD,
        backgroundColor: "#1a1a1acc",
        padding: { x: 16, y: 10 },
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(HUD_DEPTH + 2)
      .setAlpha(0);

    // ─── BOTTOM STRIP: Player identity ──────────────────────────────
    this.identityText = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: AMBER,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);

    // Set initial stat display
    this.updateStats(0, 1, 1, 1, 1);
  }

  /** Create an upgrade button container with label, cost text, and click handler */
  private createUpgradeButton(
    x: number,
    y: number,
    label: string,
    costText: Phaser.GameObjects.Text,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btnW = RIGHT_PANEL_W - 12;
    const bg = this.scene.add
      .rectangle(0, 0, btnW, 34, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });

    const labelText = this.scene.add
      .text(0, -6, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: AMBER,
      })
      .setOrigin(0.5, 0.5);

    costText.setPosition(0, 10);

    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", onClick);

    const container = this.scene.add.container(x, y, [bg, labelText, costText]);
    container.setDepth(HUD_DEPTH + 1);
    container.setSize(btnW, 34);

    return container;
  }

  /**
   * Update the stats display with current player values.
   */
  updateStats(
    scrap: number,
    attack: number,
    defense: number,
    tileCount: number,
    factories: number,
    isTeamLead?: boolean,
    collection?: number
  ): void {
    const role = isTeamLead === false ? "Member" : "Lead";
    this.statsText.setText(
      [
        `Role:    ${role}`,
        `Scrap:   ${scrap}`,
        `ATK Bots: ${attack}`,
        `DEF Bots: ${defense}`,
        `COL Bots: ${collection ?? 0}`,
        `Tiles:   ${tileCount}`,
        `🏭:      ${factories}x`,
      ].join("\n")
    );
  }

  updateTeamName(name: string): void {
    this.statsTitle.setText(name);
    const titleHeight = this.statsTitle.height;
    this.statsText.setPosition(this.statsTitle.x, this.statsTitle.y + titleHeight + 4);
    const totalHeight = titleHeight + this.statsText.height + 16;
    this.statsBg.setSize(LEFT_PANEL_W - 8, Math.max(140, totalHeight));
  }

  updateIdentity(isTeamLead: boolean, teamName: string, playerAdj: string): void {
    if (isTeamLead) {
      this.identityText.setText(`You are ${teamName}.`);
    } else {
      this.identityText.setText(`You are the ${playerAdj} parts.`);
    }
  }

  /**
   * Update the collector (⚒) icons displayed above the "You are" line.
   * Unplaced collectors are bright gold and clickable; placed ones are dimmed.
   */
  updateCollectors(totalCollectors: number, placedCount: number): void {
    // Only rebuild if counts changed
    if (totalCollectors === this.collectorCount && placedCount === this.placedCollectorCount) return;
    this.collectorCount = totalCollectors;
    this.placedCollectorCount = placedCount;

    // Destroy old icons
    this.collectorIcons.forEach((icon) => icon.destroy());
    this.collectorIcons = [];

    if (totalCollectors <= 0) return;

    const spacing = 20;
    const totalWidth = totalCollectors * spacing;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const y = GAME_HEIGHT - 30;

    for (let i = 0; i < totalCollectors; i++) {
      const isPlaced = i < placedCount;
      const icon = this.scene.add
        .text(startX + i * spacing, y, "⚒", {
          fontSize: "14px",
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0, 0.5)
        .setDepth(HUD_DEPTH + 1)
        .setAlpha(isPlaced ? 0.35 : 1.0);

      if (!isPlaced) {
        icon.setInteractive({ useHandCursor: true });
        const idx = i;
        icon.on("pointerdown", () => {
          this.onCollectorClick?.(idx);
        });
        icon.on("pointerover", () => icon.setScale(1.2));
        icon.on("pointerout", () => icon.setScale(1.0));
      }

      this.collectorIcons.push(icon);
    }
  }

  /**
   * Update the leaderboard. Sorts players by tileCount descending.
   * Renders as a compact horizontal bar above the grid.
   */
  updateLeaderboard(
    players: { id: string; tileCount: number }[],
    timeRemaining?: number,
    matchFormat?: string,
    seriesScoresJSON?: string
  ): void {
    const sorted = [...players].sort((a, b) => b.tileCount - a.tileCount);

    // Compact format: "1. Name 42  2. Name 31  ..."
    const lines = sorted.map(
      (p, i) => `${i + 1}. ${p.id} — ${p.tileCount}`
    );

    const timeStr = timeRemaining !== undefined
      ? `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, "0")}`
      : "";

    let titlePrefix = "LEADERBOARD";
    if (matchFormat && matchFormat !== "single" && seriesScoresJSON) {
      try {
        const scores: Record<string, number> = JSON.parse(seriesScoresJSON);
        const scoreValues = Object.values(scores);
        if (scoreValues.length > 0) {
          const scoreStr = scoreValues.join("-");
          titlePrefix = `LEADERBOARD [${scoreStr}]`;
        }
      } catch {
        // Invalid JSON — fall back to default title
      }
    }

    this.leaderboardTitle.setText(timeStr ? `${titlePrefix}  ${timeStr}` : titlePrefix);
    this.leaderboardText.setText(lines.join("\n"));

    // Resize background to fit content, centered
    const textWidth = Math.max(this.leaderboardTitle.width, this.leaderboardText.width);
    const textHeight = this.leaderboardText.height;
    const bgWidth = Math.max(180, textWidth + 20);
    const bgHeight = textHeight + 24;
    this.leaderboardBg.setSize(bgWidth, bgHeight);
    this.leaderboardBg.setPosition(GAME_WIDTH / 2, 4);
  }

  /**
   * Update the cost labels shown on upgrade buttons.
   */
  updateUpgradeCosts(attackCost: number, defenseCost: number, collectionCost?: number): void {
    this.attackCostText.setText(`Cost: ${attackCost}`);
    this.defenseCostText.setText(`Cost: ${defenseCost}`);
    this.collectionCostText.setText(`Cost: ${collectionCost ?? "—"}`);
  }

  /**
   * Show a temporary notification in the center of the screen.
   * Fades out after 3 seconds.
   */
  showNotification(message: string): void {
    // Cancel any existing notification timer/tween
    if (this.notificationTimer) {
      this.notificationTimer.destroy();
      this.notificationTimer = undefined;
    }
    this.scene.tweens.killTweensOf(this.notificationText);

    this.notificationText.setText(message);
    this.notificationText.setAlpha(1);

    this.notificationTimer = this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: this.notificationText,
        alpha: 0,
        duration: 500,
        ease: "Power2",
      });
    });
  }
}
