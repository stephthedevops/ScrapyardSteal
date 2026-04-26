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
 * Left panel:  0 → 136  (stats)
 * Right panel:  664 → 800  (leaderboard top, purchase bots bottom)
 * Bottom strip: 554 → 600  (identity + bot icons)
 * Top strip:    0 → 8
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

  // Leaderboard (now a popup, triggered by Stats button)
  private statsButton: Phaser.GameObjects.Container;
  private timerText: Phaser.GameObjects.Text;
  private statsPopupElements: Phaser.GameObjects.GameObject[] = [];
  private cachedLeaderboardData: { id: string; tileCount: number; attack: number; defense: number; collection: number; factories: number; resources: number }[] = [];
  private cachedTimeRemaining: number = 0;
  private cachedMatchFormat: string = "";
  private cachedSeriesScoresJSON: string = "";

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

  // Defense bot icons (🛡) displayed above collector icons
  private defenseBotIcons: Phaser.GameObjects.Text[] = [];
  private defenseBotCount: number = 0;
  private placedDefenseBotCount: number = 0;

  // Capture choice modal
  private captureChoiceElements: Phaser.GameObjects.GameObject[] = [];
  private captureChoiceTimer: Phaser.Time.TimerEvent | null = null;
  private captureChoiceVisible: boolean = false;

  // Callbacks for upgrade buttons
  public onUpgradeAttack: (() => void) | null = null;
  public onUpgradeDefense: (() => void) | null = null;
  public onUpgradeCollection: (() => void) | null = null;
  public onCollectorClick: ((index: number) => void) | null = null;
  public onDefenseBotClick: (() => void) | null = null;

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

    // ─── RIGHT GUTTER: Timer + Stats button ────────────────────────
    const rightX = GAME_WIDTH - RIGHT_PANEL_W / 2;

    this.timerText = scene.add
      .text(rightX, 10, "5:00", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: GOLD,
      })
      .setOrigin(0.5, 0)
      .setDepth(HUD_DEPTH + 1);

    // Stats button
    const statsBtnBg = scene.add
      .rectangle(0, 0, RIGHT_PANEL_W - 12, 28, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });
    const statsBtnLabel = scene.add
      .text(0, 0, "📊 Stats", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: AMBER,
      })
      .setOrigin(0.5);
    statsBtnBg.on("pointerover", () => statsBtnBg.setFillStyle(BUTTON_HOVER, 0.9));
    statsBtnBg.on("pointerout", () => statsBtnBg.setFillStyle(BUTTON_BG, 0.85));
    statsBtnBg.on("pointerdown", () => this.toggleStatsPopup());
    this.statsButton = scene.add.container(rightX, 42, [statsBtnBg, statsBtnLabel]);
    this.statsButton.setSize(RIGHT_PANEL_W - 12, 28);
    this.statsButton.setDepth(HUD_DEPTH + 1);

    // ─── BOTTOM-RIGHT: Purchase Bot buttons (vertical) ────────────
    const botPanelX = GAME_WIDTH - RIGHT_PANEL_W / 2;
    const botPanelTopY = GAME_HEIGHT - 160;

    // Background
    scene.add
      .rectangle(botPanelX, botPanelTopY + 60, RIGHT_PANEL_W - 4, 150, DARK_BG, DARK_BG_ALPHA)
      .setDepth(HUD_DEPTH);

    // Title
    scene.add
      .text(botPanelX, botPanelTopY, "PURCHASE BOT", {
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
      botPanelX,
      botPanelTopY + 30,
      "⚔️ ATK Bot",
      this.attackCostText,
      () => this.onUpgradeAttack?.()
    );

    this.defenseButton = this.createUpgradeButton(
      botPanelX,
      botPanelTopY + 70,
      "🛡️ DEF Bot",
      this.defenseCostText,
      () => this.onUpgradeDefense?.()
    );

    this.collectionButton = this.createUpgradeButton(
      botPanelX,
      botPanelTopY + 110,
      "⚙️ COL Bot",
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
   * Update the defense bot (🛡) icons displayed above the collector icons.
   * Unplaced bots are bright and clickable; placed ones are dimmed.
   */
  updateDefenseBots(totalBots: number, placedCount: number): void {
    if (totalBots === this.defenseBotCount && placedCount === this.placedDefenseBotCount) return;
    this.defenseBotCount = totalBots;
    this.placedDefenseBotCount = placedCount;

    this.defenseBotIcons.forEach((icon) => icon.destroy());
    this.defenseBotIcons = [];

    if (totalBots <= 0) return;

    const spacing = 20;
    const totalWidth = totalBots * spacing;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const y = GAME_HEIGHT - 44;

    for (let i = 0; i < totalBots; i++) {
      const isPlaced = i < placedCount;
      const icon = this.scene.add
        .text(startX + i * spacing, y, "🛡", {
          fontSize: "14px",
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0, 0.5)
        .setDepth(HUD_DEPTH + 1)
        .setAlpha(isPlaced ? 0.35 : 1.0);

      if (!isPlaced) {
        icon.setInteractive({ useHandCursor: true });
        icon.on("pointerdown", () => {
          this.onDefenseBotClick?.();
        });
        icon.on("pointerover", () => icon.setScale(1.2));
        icon.on("pointerout", () => icon.setScale(1.0));
      }

      this.defenseBotIcons.push(icon);
    }
  }

  /**
   * Update the leaderboard data and timer display.
   * Data is cached for the stats popup.
   */
  updateLeaderboard(
    players: { id: string; tileCount: number }[],
    timeRemaining?: number,
    matchFormat?: string,
    seriesScoresJSON?: string
  ): void {
    // Cache data for stats popup
    this.cachedTimeRemaining = timeRemaining ?? 0;
    this.cachedMatchFormat = matchFormat ?? "";
    this.cachedSeriesScoresJSON = seriesScoresJSON ?? "";

    // Update timer display
    if (timeRemaining !== undefined && timeRemaining > 0) {
      const timeStr = `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, "0")}`;
      this.timerText.setText(timeStr);
    } else if (timeRemaining === 0) {
      this.timerText.setText("☠ DEATHMATCH");
    }
  }

  /** Store full team data for the stats popup */
  updateTeamStats(teams: { name: string; tiles: number; attack: number; defense: number; collection: number; factories: number; scrap: number }[]): void {
    this.cachedLeaderboardData = teams.map((t) => ({
      id: t.name, tileCount: t.tiles, attack: t.attack, defense: t.defense,
      collection: t.collection, factories: t.factories, resources: t.scrap,
    }));
  }

  /** Toggle the full-screen stats popup */
  private toggleStatsPopup(): void {
    if (this.statsPopupElements.length > 0) {
      this.statsPopupElements.forEach((el) => el.destroy());
      this.statsPopupElements = [];
      return;
    }

    const POPUP_DEPTH = 200;

    const overlay = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8)
      .setDepth(POPUP_DEPTH).setInteractive();
    this.statsPopupElements.push(overlay);

    const box = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 440, 0x1a1a2e, 0.95)
      .setDepth(POPUP_DEPTH + 1).setStrokeStyle(2, 0x3a3a2a);
    this.statsPopupElements.push(box);

    // Title
    let titleStr = "TEAM STATS";
    if (this.cachedMatchFormat && this.cachedMatchFormat !== "single" && this.cachedSeriesScoresJSON) {
      try {
        const scores: Record<string, number> = JSON.parse(this.cachedSeriesScoresJSON);
        const vals = Object.values(scores);
        if (vals.length > 0) titleStr += `  [${vals.join("-")}]`;
      } catch { /* ignore */ }
    }
    const title = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 195, titleStr, {
      fontSize: "18px", color: GOLD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setDepth(POPUP_DEPTH + 2);
    this.statsPopupElements.push(title);

    // Column headers — stat columns right-aligned to leave room for long team names
    const headerY = GAME_HEIGHT / 2 - 165;
    const nameCol = 140;
    // Right edges of each stat column
    const statCols = [380, 420, 460, 500, 530, 580];
    const statHeaders = ["Tiles", "⚔️ATK", "🛡DEF", "⚙COL", "🏭", "Scrap"];

    const teamHeader = this.scene.add.text(nameCol, headerY, "Team", {
      fontSize: "11px", color: GOLD, fontFamily: FONT_FAMILY,
    }).setOrigin(0, 0.5).setDepth(POPUP_DEPTH + 2);
    this.statsPopupElements.push(teamHeader);

    statHeaders.forEach((h, i) => {
      const t = this.scene.add.text(statCols[i], headerY, h, {
        fontSize: "11px", color: GOLD, fontFamily: FONT_FAMILY,
      }).setOrigin(1, 0.5).setDepth(POPUP_DEPTH + 2);
      this.statsPopupElements.push(t);
    });

    // Divider
    const divider = this.scene.add.rectangle(GAME_WIDTH / 2, headerY + 12, 560, 1, 0x3a3a2a)
      .setDepth(POPUP_DEPTH + 2);
    this.statsPopupElements.push(divider);

    // Team rows sorted by tiles — tighter 16px row spacing
    const sorted = [...this.cachedLeaderboardData].sort((a, b) => b.tileCount - a.tileCount);
    let yOffset = 0;
    sorted.forEach((team, idx) => {
      const y = headerY + 28 + yOffset;
      const rank = this.scene.add.text(120, y, `${idx + 1}.`, {
        fontSize: "11px", color: AMBER, fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0.5).setDepth(POPUP_DEPTH + 2);
      this.statsPopupElements.push(rank);

      // Word-wrap name at 30 chars per line
      const words = team.id.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length <= 30) {
          currentLine = candidate;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      const displayName = lines.join("\n");

      const name = this.scene.add.text(nameCol, y, displayName, {
        fontSize: "11px", color: AMBER, fontFamily: FONT_FAMILY,
        lineSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(POPUP_DEPTH + 2);
      this.statsPopupElements.push(name);

      const values = [
        `${team.tileCount}`, `${team.attack}`, `${team.defense}`,
        `${team.collection}`, `${team.factories}`, `${team.resources}`,
      ];
      values.forEach((v, i) => {
        const t = this.scene.add.text(statCols[i], y, v, {
          fontSize: "11px", color: AMBER, fontFamily: FONT_FAMILY,
        }).setOrigin(1, 0.5).setDepth(POPUP_DEPTH + 2);
        this.statsPopupElements.push(t);
      });

      // Advance Y: base row height + 1 blank line per extra wrap line
      const extraLines = lines.length - 1;
      yOffset += 16 + extraLines * 16;
    });

    // Close button
    const closeBtn = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 195, "[CLOSE]", {
      fontSize: "14px", color: GOLD, fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setDepth(POPUP_DEPTH + 2).setInteractive({ useHandCursor: true });
    this.statsPopupElements.push(closeBtn);
    closeBtn.on("pointerdown", () => {
      this.statsPopupElements.forEach((el) => el.destroy());
      this.statsPopupElements = [];
    });
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

  /**
   * Show the capture choice modal when the player's last factory falls.
   * Displays a full-screen overlay with surrender/drop buttons and a countdown timer.
   */
  showCaptureChoice(
    captorTeamName: string,
    timeoutSeconds: number,
    onChoice: (choice: "surrender" | "drop") => void
  ): void {
    this.dismissCaptureChoice(); // Clean up any existing modal
    this.captureChoiceVisible = true;

    const { width, height } = this.scene.cameras.main;

    // Dark overlay
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(300);
    this.captureChoiceElements.push(overlay);

    // Title
    const title = this.scene.add
      .text(width / 2, height / 2 - 80, "YOUR FACTORY HAS FALLEN", {
        fontSize: "24px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.captureChoiceElements.push(title);

    // Captor name
    const captorText = this.scene.add
      .text(width / 2, height / 2 - 40, `Captured by: ${captorTeamName}`, {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.captureChoiceElements.push(captorText);

    // Countdown timer text
    let remaining = timeoutSeconds;
    const timerText = this.scene.add
      .text(width / 2, height / 2, `Time remaining: ${remaining}s`, {
        fontSize: "14px",
        color: "#ffcc00",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.captureChoiceElements.push(timerText);

    // Countdown timer event
    this.captureChoiceTimer = this.scene.time.addEvent({
      delay: 1000,
      repeat: timeoutSeconds - 1,
      callback: () => {
        remaining--;
        if (timerText.active) {
          timerText.setText(`Time remaining: ${remaining}s`);
        }
      },
    });

    // Surrender button
    const surrenderBtn = this.scene.add
      .text(width / 2 - 100, height / 2 + 50, "🏳️ Surrender Tiles", {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#444444",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setInteractive({ useHandCursor: true });
    surrenderBtn.on("pointerover", () => surrenderBtn.setStyle({ backgroundColor: "#666666" }));
    surrenderBtn.on("pointerout", () => surrenderBtn.setStyle({ backgroundColor: "#444444" }));
    surrenderBtn.on("pointerdown", () => {
      this.dismissCaptureChoice();
      onChoice("surrender");
    });
    this.captureChoiceElements.push(surrenderBtn);

    // Self-destruct button
    const dropBtn = this.scene.add
      .text(width / 2 + 100, height / 2 + 50, "💥 Self Destruct", {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#444444",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setInteractive({ useHandCursor: true });
    dropBtn.on("pointerover", () => dropBtn.setStyle({ backgroundColor: "#666666" }));
    dropBtn.on("pointerout", () => dropBtn.setStyle({ backgroundColor: "#444444" }));
    dropBtn.on("pointerdown", () => {
      this.dismissCaptureChoice();
      onChoice("drop");
    });
    this.captureChoiceElements.push(dropBtn);
  }

  /**
   * Dismiss the capture choice modal, destroying all elements and clearing the timer.
   * Safe to call even if no modal is displayed (idempotent).
   */
  dismissCaptureChoice(): void {
    for (const el of this.captureChoiceElements) {
      if (el && el.active) {
        el.destroy();
      }
    }
    this.captureChoiceElements = [];
    if (this.captureChoiceTimer) {
      this.captureChoiceTimer.destroy();
      this.captureChoiceTimer = null;
    }
    this.captureChoiceVisible = false;
  }

  /** Returns true if the capture choice modal is currently displayed. */
  isCaptureChoiceVisible(): boolean {
    return this.captureChoiceVisible;
  }
}
