import Phaser from "phaser";

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
      "Create a game and share the room code,",
      "or join a friend's game with their code.",
    ],
  },
  {
    title: "Claiming Tiles",
    lines: [
      "Click any neutral tile next to your territory to claim it.",
      "Each tile costs scrap — the cost goes up as you grow.",
      "",
      "Highlighted tiles show where you can expand.",
      "Use arrow keys (↑↓←→) to steer your growth direction.",
    ],
  },
  {
    title: "Mining Gears ⚙",
    lines: [
      "Gear tiles have 50 scrap each.",
      "Click a gear to mine it — you extract scrap",
      "equal to your attack stat × factories owned.",
      "",
      "Gears on unclaimed tiles or your own tiles can be mined.",
      "Gears disappear when empty.",
    ],
  },
  {
    title: "Upgrades",
    lines: [
      "⚔ ATK — Increases attack strength.",
      "  Helps push borders and mine gears faster.",
      "",
      "🛡 DEF — Increases defense strength.",
      "  Helps hold your borders against attackers.",
      "",
      "Only the team lead can buy upgrades.",
    ],
  },
  {
    title: "Border Conflict",
    lines: [
      "Borders between players resolve every second:",
      "",
      "  Your attack × border tiles = pressure",
      "  Their defense × border tiles = resistance",
      "",
      "If pressure > resistance, you take a tile.",
      "Equal = stalemate. No one moves.",
    ],
  },
  {
    title: "Absorption & Teams",
    lines: [
      "Lose all your tiles? You join the absorber's team.",
      "Your adjective stacks onto the team name:",
      '  "Turbo Hydraulic Otterbot"',
      "",
      "Team members can click to claim and mine,",
      "but only the lead can spend scrap.",
    ],
  },
  {
    title: "Factories 🏭",
    lines: [
      "Each player starts with one factory (spawn tile).",
      "Absorbing opponents captures their factories.",
      "",
      "More factories = higher gear mining multiplier.",
      "Protect your factory and capture others!",
    ],
  },
  {
    title: "Winning",
    lines: [
      "The game lasts 5 minutes.",
      "The team with the most tiles wins!",
      "",
      "Or — if only one team remains for 2 seconds,",
      "the game ends early. Total domination.",
      "",
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

  private renderPage(): void {
    const page = PAGES[this.pageIndex];
    this.titleText.setText(page.title);
    this.bodyText.setText(page.lines.join("\n"));
    this.pageIndicator.setText(`${this.pageIndex + 1} / ${PAGES.length}`);

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
