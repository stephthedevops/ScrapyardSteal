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

export class HUDManager {
  private scene: Phaser.Scene;

  // Stats panel (top-left)
  private statsBg: Phaser.GameObjects.Rectangle;
  private statsText: Phaser.GameObjects.Text;

  // Leaderboard (top-right)
  private leaderboardBg: Phaser.GameObjects.Rectangle;
  private leaderboardTitle: Phaser.GameObjects.Text;
  private leaderboardText: Phaser.GameObjects.Text;

  // Upgrade buttons (bottom-center)
  private attackButton: Phaser.GameObjects.Container;
  private defenseButton: Phaser.GameObjects.Container;
  private attackCostText: Phaser.GameObjects.Text;
  private defenseCostText: Phaser.GameObjects.Text;

  // Notification (center)
  private notificationText: Phaser.GameObjects.Text;
  private notificationTimer?: Phaser.Time.TimerEvent;

  // Callbacks for upgrade buttons
  public onUpgradeAttack: (() => void) | null = null;
  public onUpgradeDefense: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // --- Stats panel (top-left) ---
    this.statsBg = scene.add
      .rectangle(8, 8, 200, 110, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH);

    this.statsText = scene.add
      .text(16, 14, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: AMBER,
        lineSpacing: 4,
      })
      .setDepth(HUD_DEPTH + 1);

    // --- Leaderboard (top-right) ---
    this.leaderboardBg = scene.add
      .rectangle(GAME_WIDTH - 8, 8, 180, 160, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.leaderboardTitle = scene.add
      .text(GAME_WIDTH - 180, 14, "LEADERBOARD", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: GOLD,
      })
      .setDepth(HUD_DEPTH + 1);

    this.leaderboardText = scene.add
      .text(GAME_WIDTH - 180, 32, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: AMBER,
        lineSpacing: 2,
      })
      .setDepth(HUD_DEPTH + 1);

    // --- Upgrade buttons (bottom-center) ---
    this.attackCostText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: GOLD,
      })
      .setOrigin(0.5, 0.5);

    this.defenseCostText = scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: GOLD,
      })
      .setOrigin(0.5, 0.5);

    this.attackButton = this.createUpgradeButton(
      GAME_WIDTH / 2 - 80,
      GAME_HEIGHT - 50,
      "⚔ ATK",
      this.attackCostText,
      () => this.onUpgradeAttack?.()
    );

    this.defenseButton = this.createUpgradeButton(
      GAME_WIDTH / 2 + 80,
      GAME_HEIGHT - 50,
      "🛡 DEF",
      this.defenseCostText,
      () => this.onUpgradeDefense?.()
    );

    // --- Notification (center of screen) ---
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
    const bg = this.scene.add
      .rectangle(0, 0, 130, 36, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });

    const labelText = this.scene.add
      .text(0, -6, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: AMBER,
      })
      .setOrigin(0.5, 0.5);

    costText.setPosition(0, 10);

    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", onClick);

    const container = this.scene.add.container(x, y, [bg, labelText, costText]);
    container.setDepth(HUD_DEPTH + 1);
    container.setSize(130, 36);

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
    incomeRate: number
  ): void {
    this.statsText.setText(
      [
        `Scrap:   ${scrap}`,
        `Attack:  ${attack}`,
        `Defense: ${defense}`,
        `Tiles:   ${tileCount}`,
        `Income:  +${incomeRate}/s`,
      ].join("\n")
    );
  }

  /**
   * Update the leaderboard. Sorts players by tileCount descending.
   */
  updateLeaderboard(players: { id: string; tileCount: number }[]): void {
    const sorted = [...players].sort((a, b) => b.tileCount - a.tileCount);
    const lines = sorted.map(
      (p, i) => `${i + 1}. ${p.id.slice(0, 8)} — ${p.tileCount}`
    );
    this.leaderboardText.setText(lines.join("\n"));

    // Resize background to fit content
    const textHeight = this.leaderboardText.height;
    this.leaderboardBg.setSize(180, textHeight + 30);
  }

  /**
   * Update the cost labels shown on upgrade buttons.
   */
  updateUpgradeCosts(attackCost: number, defenseCost: number): void {
    this.attackCostText.setText(`Cost: ${attackCost}`);
    this.defenseCostText.setText(`Cost: ${defenseCost}`);
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
