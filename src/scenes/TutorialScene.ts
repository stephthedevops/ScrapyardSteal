import Phaser from "phaser";
import { addMusicToggle } from "../ui/MusicToggle";

const AMBER = "#e0a030";
const GOLD = "#ffcc44";
const FONT = "monospace";
const BUTTON_BG = 0x3a3a2a;
const BUTTON_HOVER = 0x5a5a3a;

interface TutorialPage {
  title: string;
  lines: string[];
}

const PAGES: TutorialPage[] = [
  {
    title: "Welcome to Scrapyard Steal",
    lines: [
      "You control a factory-machine 🏭 in a shared scrapyard.",
      "Your goal: own the most tiles when time runs out,",
      "or absorb every opponent to win early!",
      "",
      "Create a game and share the 5-character room code,",
      "or join a friend's game with their code.",
      "You can also Quick Play to join a random public game.",
    ],
  },
  {
    title: "Claiming Tiles",
    lines: [
      "Click any neutral tile next to your territory to claim it.",
      "Each tile costs scrap — the cost goes up as you grow.",
      "",
      "Tiles outlined in your color show where you can expand.",
      "The scrap cost is shown on each claimable tile.",
    ],
  },
  {
    title: "Mining Gears ⚙️",
    lines: [
      "Gear tiles (⚙️) contain scrap (default 1000).",
      "Click a gear to mine it — you extract scrap",
      "equal to 5 × factories owned.",
      "",
      "Gears on unclaimed tiles or your own tiles can be mined.",
      "Gears disappear when empty, and new ones spawn over time.",
    ],
  },
  {
    title: "Bots & Upgrades",
    lines: [
      "⚔️ ATK Bot — Max additional tiles attackable at once.",
      "🛡️ DEF Bot — Place on your tiles for +5 defense each.",
      "  Up to 4 per tile. Permanent once placed.",
      "⚙️ COL Bot — Place on tiles to auto-mine or earn income.",
      "",
      "All bots cost 50 × current count of that type.",
      "ATK bots: team lead only. DEF/COL: anyone.",
    ],
  },
  {
    title: "Attacking ⚔️",
    lines: [
      "Click an enemy tile next to your territory to attack it.",
      "Only the team leader can initiate attacks.",
      "",
      "A battle tick runs twice per second.",
      "Each tick removes 1 defense from the tile.",
      "At 0 defense, the tile becomes unclaimed.",
      "",
      "Every 5 damage you deal, 50% chance to lose an ATK bot.",
    ],
  },
  {
    title: "Defending 🛡",
    lines: [
      "Every tile starts with 5 base defense.",
      "Each DEF bot placed on a tile adds +5 more.",
      "A fully fortified tile has 25 defense (base + 4 bots).",
      "",
      "When defense drops past 5/10/15/20, a DEF bot is lost.",
      "50% chance the bot is repaired (returned unplaced).",
      "",
      "Fortify your borders to slow down attackers!",
    ],
  },
  {
    title: "Collection Bots ⚒",
    lines: [
      "Buy a COL Bot, then click the ⚒ icon and",
      "click a tile you own to place it.",
      "",
      "Collectors auto-mine gear tiles every second.",
      "On factory tiles, they generate passive income.",
      "Lost tiles remove their collectors automatically.",
      "",
      "Place them on gears for scrap or factories for income!",
    ],
  },
  {
    title: "Absorption & Teams",
    lines: [
      "Lose all your tiles? You join the absorber's team.",
      "Your tiles become unclaimed — up for grabs!",
      "Your adjective stacks onto the team name:",
      '  "Turbo Hydraulic Otterbot"',
      "",
      "Lose your factory? You're demoted to non-leader.",
      "The absorber gets 25% of your scrap as a bonus.",
    ],
  },
  {
    title: "Roles & Permissions",
    lines: [
      "Action          Lead  Member",
      "─────────────────────────────",
      "Buy ⚔️ ATK Bots   ✅     ❌",
      "Attack tiles     ✅     ❌",
      "Buy 🛡️ DEF Bots   ✅     ✅",
      "Buy ⚙️ COL Bots   ✅     ✅",
      "Place bots       ✅     ✅",
      "Claim tiles      ✅     ✅",
      "Mine gears       ✅     ✅",
    ],
  },
  {
    title: "Factories 🏭",
    lines: [
      "Each player starts with one factory (spawn tile).",
      "Absorbing opponents frees their factories.",
      "",
      "More factories = higher gear mining multiplier.",
      "Place collectors on factories for passive income.",
      "Protect your factory and claim others!",
    ],
  },
  {
    title: "Host Settings & AI",
    lines: [
      "The host can open ⚙ CONFIG in the lobby to set:",
      "  • Time limit (2, 5, 7, 10 min or Deathmatch)",
      "  • Match format (Single, Best of 3, Best of 5)",
      "  • Scrap supply per gear pile",
      "  • Max players (10 or 20)",
      "",
      "The host can also add up to 6 AI opponents.",
      "AI bots mine, claim tiles, and upgrade each turn.",
    ],
  },
  {
    title: "Winning",
    lines: [
      "The team with the most tiles when time runs out wins!",
      "",
      "Or — if only one team remains for 2 seconds,",
      "the game ends early. Total domination.",
      "",
      "Hover tiles for info. Click 💡 in-game for controls.",
      "Good luck in the scrapyard! 🏭",
    ],
  },
];

export class TutorialScene extends Phaser.Scene {
  private pageIndex = 0;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private pageIndicator!: Phaser.GameObjects.Text;
  private prevBtn!: Phaser.GameObjects.Container;
  private nextBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "TutorialScene" });
  }

  create(): void {
    this.pageIndex = 0;
    addMusicToggle(this);

    this.add.text(400, 40, "HOW TO PLAY", {
      fontSize: "30px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5);

    this.titleText = this.add.text(400, 100, "", {
      fontSize: "18px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5);

    this.bodyText = this.add.text(400, 180, "", {
      fontSize: "13px", color: AMBER, fontFamily: FONT,
      lineSpacing: 6, align: "center",
    }).setOrigin(0.5, 0);

    this.pageIndicator = this.add.text(400, 500, "", {
      fontSize: "12px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5);

    this.prevBtn = this.makeButton(280, 540, "← PREV", () => {
      if (this.pageIndex > 0) { this.pageIndex--; this.renderPage(); }
    });

    this.nextBtn = this.makeButton(520, 540, "NEXT →", () => {
      if (this.pageIndex < PAGES.length - 1) {
        this.pageIndex++;
        this.renderPage();
      } else {
        this.scene.start("MenuScene");
      }
    });

    // Back button
    this.makeButton(400, 540, "BACK", () => {
      this.scene.start("MenuScene");
    }).setAlpha(0).setVisible(false).setName("backBtn");

    // Keyboard nav
    this.input.keyboard?.on("keydown-LEFT", () => {
      if (this.pageIndex > 0) { this.pageIndex--; this.renderPage(); }
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      if (this.pageIndex < PAGES.length - 1) { this.pageIndex++; this.renderPage(); }
      else { this.scene.start("MenuScene"); }
    });
    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.start("MenuScene");
    });

    this.renderPage();
  }

  private gearDecorations: Phaser.GameObjects.Text[] = [];

  private renderPage(): void {
    const page = PAGES[this.pageIndex];
    this.titleText.setText(page.title);
    this.bodyText.setText(page.lines.join("\n"));
    this.pageIndicator.setText(`${this.pageIndex + 1} / ${PAGES.length}`);

    // Clean up previous gear decorations
    this.gearDecorations.forEach((g) => g.destroy());
    this.gearDecorations = [];

    // Add colorful spinning gear decorations on gear-related pages
    if (page.title.includes("⚙") || page.title.includes("Gear") || page.title.includes("Mining")) {
      const colors = ["#ffd700", "#ff6b35", "#00e5ff", "#32d74b", "#ff00ff"];
      const positions = [
        { x: 60, y: 100 }, { x: 740, y: 100 },
        { x: 60, y: 400 }, { x: 740, y: 400 },
      ];
      positions.forEach((pos, i) => {
        const gear = this.add.text(pos.x, pos.y, "⚙", {
          fontSize: "28px", color: colors[i % colors.length], fontFamily: FONT,
        }).setOrigin(0.5).setAlpha(0.7);
        this.tweens.add({
          targets: gear,
          angle: 360,
          duration: 4000 + i * 500,
          repeat: -1,
        });
        this.gearDecorations.push(gear);
      });
    }

    // Show/hide prev
    this.prevBtn.setAlpha(this.pageIndex > 0 ? 1 : 0.3);

    // Last page: change next to "DONE"
    const nextLabel = this.nextBtn.getAt(1) as Phaser.GameObjects.Text;
    nextLabel.setText(this.pageIndex === PAGES.length - 1 ? "DONE ✓" : "NEXT →");
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 160, 40, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontSize: "14px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", onClick);
    const container = this.add.container(x, y, [bg, text]);
    container.setSize(160, 40);
    return container;
  }
}
