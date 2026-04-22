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

  // Stats panel (middle-left)
  private statsBg: Phaser.GameObjects.Rectangle;
  private statsTitle: Phaser.GameObjects.Text;
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

  // Player identity (below grid)
  private identityText: Phaser.GameObjects.Text;

  // Callbacks for upgrade buttons
  public onUpgradeAttack: (() => void) | null = null;
  public onUpgradeDefense: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // --- Stats panel (middle-left, outside grid area) ---
    this.statsBg = scene.add
      .rectangle(4, GAME_HEIGHT / 2 - 80, 160, 160, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(0, 0)
      .setDepth(HUD_DEPTH);

    this.statsTitle = scene.add
      .text(12, GAME_HEIGHT / 2 - 74, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: GOLD,
        wordWrap: { width: 148 },
      })
      .setDepth(HUD_DEPTH + 1);

    this.statsText = scene.add
      .text(12, GAME_HEIGHT / 2 - 54, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: AMBER,
        lineSpacing: 4,
      })
      .setDepth(HUD_DEPTH + 1);

    // --- Leaderboard (top-right) ---
    this.leaderboardBg = scene.add
      .rectangle(GAME_WIDTH - 8, 8, 260, 160, DARK_BG, DARK_BG_ALPHA)
      .setOrigin(1, 0)
      .setDepth(HUD_DEPTH);

    this.leaderboardTitle = scene.add
      .text(GAME_WIDTH - 260, 14, "LEADERBOARD", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: GOLD,
      })
      .setDepth(HUD_DEPTH + 1);

    this.leaderboardText = scene.add
      .text(GAME_WIDTH - 260, 32, "", {
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
      GAME_WIDTH - 75,
      GAME_HEIGHT / 2 - 25,
      "⚔ ATK",
      this.attackCostText,
      () => this.onUpgradeAttack?.()
    );

    this.defenseButton = this.createUpgradeButton(
      GAME_WIDTH - 75,
      GAME_HEIGHT / 2 + 25,
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

    // --- Player identity (below grid) ---
    this.identityText = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
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
    factories: number,
    isTeamLead?: boolean
  ): void {
    const role = isTeamLead === false ? "Member" : "Lead";
    this.statsText.setText(
      [
        `Role:    ${role}`,
        `Scrap:   ${scrap}`,
        `Attack:  ${attack}`,
        `Defense: ${defense}`,
        `Tiles:   ${tileCount}`,
        `🏭:      ${factories}x`,
      ].join("\n")
    );
  }

  updateTeamName(name: string): void {
    this.statsTitle.setText(name);
    const titleHeight = this.statsTitle.height;
    this.statsText.setPosition(12, this.statsTitle.y + titleHeight + 6);
    const totalHeight = titleHeight + this.statsText.height + 20;
    this.statsBg.setSize(160, Math.max(140, totalHeight));
  }

  updateIdentity(isTeamLead: boolean, teamName: string, playerAdj: string): void {
    if (isTeamLead) {
      this.identityText.setText(`You are ${teamName}.`);
    } else {
      this.identityText.setText(`You are the ${playerAdj} parts.`);
    }
  }

  /**
   * Update the leaderboard. Sorts players by tileCount descending.
   */
  updateLeaderboard(
    players: { id: string; tileCount: number }[],
    timeRemaining?: number,
    matchFormat?: string,
    seriesScoresJSON?: string
  ): void {
    const sorted = [...players].sort((a, b) => b.tileCount - a.tileCount);
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

    // Resize background to fit content
    const textWidth = this.leaderboardText.width;
    const textHeight = this.leaderboardText.height;
    const bgWidth = Math.max(180, textWidth + 20);
    this.leaderboardBg.setSize(bgWidth, textHeight + 30);
    this.leaderboardBg.setPosition(GAME_WIDTH - 8, 8);
    this.leaderboardTitle.setPosition(GAME_WIDTH - bgWidth, 14);
    this.leaderboardText.setPosition(GAME_WIDTH - bgWidth, 32);
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
