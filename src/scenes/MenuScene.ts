import Phaser from "phaser";

const AMBER = "#e0a030";
const GOLD = "#ffcc44";
const FONT = "monospace";
const BUTTON_BG = 0x3a3a2a;
const BUTTON_HOVER = 0x5a5a3a;

export class MenuScene extends Phaser.Scene {
  private roomCodeInput: string = "";
  private roomCodeText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private joinMode = false;
  private createBtn!: Phaser.GameObjects.Container;
  private joinBtn!: Phaser.GameObjects.Container;
  private backBtn!: Phaser.GameObjects.Container;
  private enterLobbyBtn!: Phaser.GameObjects.Container;
  private howToPlayBtn!: Phaser.GameObjects.Container;
  private quickPlayBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    this.joinMode = false;
    this.roomCodeInput = "";

    this.add.text(400, 80, "SCRAPYARD STEAL", {
      fontSize: "40px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5);

    this.add.text(400, 130, "expand. absorb. dominate the scrapyard.", {
      fontSize: "14px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5);

    this.createBtn = this.makeButton(400, 250, "CREATE GAME", () => {
      this.scene.start("LobbyScene", { mode: "create" });
    });
    this.joinBtn = this.makeButton(400, 320, "JOIN GAME", () => {
      this.showJoinInput();
    });

    // How to Play button
    this.howToPlayBtn = this.makeButton(400, 390, "HOW TO PLAY", () => {
      this.scene.start("TutorialScene");
    });

    // Quick Play button (hidden initially, shown in join mode)
    this.quickPlayBtn = this.makeButton(400, 490, "QUICK PLAY", () => {
      this.scene.start("LobbyScene", { mode: "quickplay" });
    });
    this.quickPlayBtn.setAlpha(0).setVisible(false);

    // Join mode elements (hidden initially)
    this.add.text(400, 220, "ENTER ROOM CODE:", {
      fontSize: "13px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setAlpha(0).setName("joinLabel");

    this.roomCodeText = this.add.text(400, 260, "_ _ _ _ _", {
      fontSize: "28px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5).setAlpha(0);

    this.errorText = this.add.text(400, 380, "", {
      fontSize: "13px", color: "#ff4444", fontFamily: FONT,
    }).setOrigin(0.5);

    const pasteBtn = this.add.text(400, 300, "[PASTE]", {
      fontSize: "14px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .setAlpha(0).setName("pasteBtn");
    pasteBtn.on("pointerover", () => pasteBtn.setColor("#ffffff"));
    pasteBtn.on("pointerout", () => pasteBtn.setColor(AMBER));
    pasteBtn.on("pointerdown", () => {
      if (!this.joinMode || !navigator.clipboard) return;
      navigator.clipboard.readText().then((text) => {
        const cleaned = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5);
        if (cleaned.length > 0) {
          this.roomCodeInput = cleaned;
          this.updateRoomCodeDisplay();
        }
      });
    });

    this.enterLobbyBtn = this.makeButton(400, 350, "ENTER LOBBY", () => this.tryJoin());
    this.enterLobbyBtn.setAlpha(0).setVisible(false);
    this.backBtn = this.makeButton(400, 420, "BACK", () => this.hideJoinInput());
    this.backBtn.setAlpha(0).setVisible(false);

    // About button — half height, always at bottom
    const aboutBg = this.add.rectangle(0, 0, 260, 25, BUTTON_BG, 0.7)
      .setInteractive({ useHandCursor: true });
    const aboutLabel = this.add.text(0, 0, "About the Game", {
      fontSize: "11px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5);
    aboutBg.on("pointerover", () => aboutBg.setFillStyle(BUTTON_HOVER, 0.9));
    aboutBg.on("pointerout", () => aboutBg.setFillStyle(BUTTON_BG, 0.7));
    aboutBg.on("pointerdown", () => this.showAboutPopup());
    this.add.container(400, 575, [aboutBg, aboutLabel]).setSize(260, 25);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (!this.joinMode) return;
      if (event.key === "Backspace") {
        this.roomCodeInput = this.roomCodeInput.slice(0, -1);
        this.updateRoomCodeDisplay();
      } else if (event.key === "Enter") {
        this.tryJoin();
      } else if (event.key === "Escape") {
        this.hideJoinInput();
      } else if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key) && this.roomCodeInput.length < 5) {
        this.roomCodeInput += event.key.toUpperCase();
        this.updateRoomCodeDisplay();
      }
    });
  }

  private tryJoin(): void {
    if (this.roomCodeInput.length !== 5) return;
    this.scene.start("LobbyScene", { mode: "join", roomId: this.roomCodeInput.toUpperCase() });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 260, 50, BUTTON_BG, 0.85).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, { fontSize: "18px", color: AMBER, fontFamily: FONT }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", onClick);
    const container = this.add.container(x, y, [bg, text]);
    container.setSize(260, 50);
    return container;
  }

  private showJoinInput(): void {
    this.joinMode = true;
    this.roomCodeInput = "";
    this.updateRoomCodeDisplay();
    this.createBtn.setAlpha(0).setVisible(false);
    this.joinBtn.setAlpha(0).setVisible(false);
    this.howToPlayBtn.setAlpha(0).setVisible(false);
    this.quickPlayBtn.setAlpha(1).setVisible(true);
    (this.children.getByName("joinLabel") as Phaser.GameObjects.Text)?.setAlpha(1);
    this.roomCodeText.setAlpha(1);
    (this.children.getByName("pasteBtn") as Phaser.GameObjects.Text)?.setAlpha(1);
    this.enterLobbyBtn.setAlpha(1).setVisible(true);
    this.backBtn.setAlpha(1).setVisible(true);
  }

  private hideJoinInput(): void {
    this.joinMode = false;
    (this.children.getByName("joinLabel") as Phaser.GameObjects.Text)?.setAlpha(0);
    this.roomCodeText.setAlpha(0);
    this.errorText.setText("");
    (this.children.getByName("pasteBtn") as Phaser.GameObjects.Text)?.setAlpha(0);
    this.enterLobbyBtn.setAlpha(0).setVisible(false);
    this.backBtn.setAlpha(0).setVisible(false);
    this.createBtn.setAlpha(1).setVisible(true);
    this.joinBtn.setAlpha(1).setVisible(true);
    this.howToPlayBtn.setAlpha(1).setVisible(true);
    this.quickPlayBtn.setAlpha(0).setVisible(false);
  }

  private updateRoomCodeDisplay(): void {
    this.roomCodeText.setText(
      this.roomCodeInput.length === 0 ? "_ _ _ _ _" : this.roomCodeInput.split("").join(" ")
    );
  }

  private showAboutPopup(): void {
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200).setInteractive();
    const box = this.add.rectangle(400, 280, 360, 260, 0x1a1a2e, 0.95)
      .setDepth(201).setStrokeStyle(2, 0x3a3a2a);
    const title = this.add.text(400, 180, "SCRAPYARD STEAL", {
      fontSize: "18px", color: "#ffcc44", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202);
    const version = this.add.text(400, 205, `v${__APP_VERSION__}`, {
      fontSize: "11px", color: "#e0a030", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202);
    const team = this.add.text(400, 250, [
      "Team:",
      "  Steph Hicks",
      "  Nathan Engert",
      "  Valokor",
      "",
      "github.com/stephthedevops/ScrapyardSteal",
      "",
      "Built for Gamedev.js Jam 2026",
    ].join("\n"), {
      fontSize: "11px", color: "#e0a030", fontFamily: "monospace",
      align: "center", lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(202);
    const closeBtn = this.add.text(400, 380, "[CLOSE]", {
      fontSize: "13px", color: "#ffcc44", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => {
      overlay.destroy(); box.destroy(); title.destroy();
      version.destroy(); team.destroy(); closeBtn.destroy();
    });
  }
}
