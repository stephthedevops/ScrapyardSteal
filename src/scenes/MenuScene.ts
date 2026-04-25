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
  private publicGamesBtn!: Phaser.GameObjects.Container;
  private publicGamesPopupElements: Phaser.GameObjects.GameObject[] = [];

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

    // Public Games button (hidden initially, shown in join mode)
    this.publicGamesBtn = this.makeButton(400, 550, "PUBLIC GAMES", () => {
      this.showPublicGamesPopup();
    });
    this.publicGamesBtn.setAlpha(0).setVisible(false);

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
    this.publicGamesBtn.setAlpha(1).setVisible(true);
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
    this.publicGamesBtn.setAlpha(0).setVisible(false);
  }

  private updateRoomCodeDisplay(): void {
    this.roomCodeText.setText(
      this.roomCodeInput.length === 0 ? "_ _ _ _ _" : this.roomCodeInput.split("").join(" ")
    );
  }

  private publicGamesContentElements: Phaser.GameObjects.GameObject[] = [];

  private showPublicGamesPopup(): void {
    // Don't open multiple popups
    if (this.publicGamesPopupElements.length > 0) return;

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200).setInteractive();
    this.publicGamesPopupElements.push(overlay);

    const box = this.add.rectangle(400, 300, 400, 350, 0x1a1a2e, 0.95)
      .setDepth(201).setStrokeStyle(2, 0x3a3a2a);
    this.publicGamesPopupElements.push(box);

    const title = this.add.text(400, 150, "PUBLIC OPEN GAMES", {
      fontSize: "18px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(202);
    this.publicGamesPopupElements.push(title);

    const closeBtn = this.add.text(585, 140, "✕", {
      fontSize: "18px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
    this.publicGamesPopupElements.push(closeBtn);
    closeBtn.on("pointerdown", () => this.dismissPublicGamesPopup());

    const refreshBtn = this.add.text(230, 140, "↻", {
      fontSize: "18px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
    this.publicGamesPopupElements.push(refreshBtn);
    refreshBtn.on("pointerover", () => refreshBtn.setColor("#ffffff"));
    refreshBtn.on("pointerout", () => refreshBtn.setColor(GOLD));
    refreshBtn.on("pointerdown", () => this.fetchPublicGames());

    this.fetchPublicGames();
  }

  private fetchPublicGames(): void {
    // Clear previous content rows
    this.publicGamesContentElements.forEach((el) => {
      if (el.active) el.destroy();
    });
    this.publicGamesContentElements = [];

    const loadingText = this.add.text(400, 300, "Loading...", {
      fontSize: "14px", color: AMBER, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(202);
    this.publicGamesContentElements.push(loadingText);

    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || "ws://localhost:2567";
    const httpUrl = serverUrl.replace("ws://", "http://").replace("wss://", "https://");

    fetch(`${httpUrl}/public/list`)
      .then((res) => res.json())
      .then((data: { rooms: { code: string; roomId: string; playerCount: number }[] }) => {
        if (loadingText.active) loadingText.destroy();

        if (!data.rooms || data.rooms.length === 0) {
          const noGames = this.add.text(400, 280, "No public games available.\nCreate one and toggle Public!", {
            fontSize: "13px", color: AMBER, fontFamily: FONT, align: "center",
          }).setOrigin(0.5).setDepth(202);
          this.publicGamesContentElements.push(noGames);
          return;
        }

        // Header row
        const headerY = 185;
        const hCode = this.add.text(260, headerY, "CODE", {
          fontSize: "11px", color: GOLD, fontFamily: FONT,
        }).setDepth(202);
        const hPlayers = this.add.text(400, headerY, "PLAYERS", {
          fontSize: "11px", color: GOLD, fontFamily: FONT,
        }).setOrigin(0.5, 0).setDepth(202);
        const hAction = this.add.text(520, headerY, "", {
          fontSize: "11px", color: GOLD, fontFamily: FONT,
        }).setDepth(202);
        this.publicGamesContentElements.push(hCode, hPlayers, hAction);

        // Room rows
        data.rooms.forEach((room, idx) => {
          const y = 215 + idx * 35;
          if (y > 430) return; // don't overflow the box

          const codeText = this.add.text(260, y, room.code, {
            fontSize: "14px", color: AMBER, fontFamily: FONT,
          }).setDepth(202);

          const countText = this.add.text(400, y, `${room.playerCount}`, {
            fontSize: "14px", color: AMBER, fontFamily: FONT,
          }).setOrigin(0.5, 0).setDepth(202);

          const joinText = this.add.text(520, y, "[JOIN]", {
            fontSize: "14px", color: GOLD, fontFamily: FONT,
          }).setDepth(202).setInteractive({ useHandCursor: true });
          joinText.on("pointerover", () => joinText.setColor("#ffffff"));
          joinText.on("pointerout", () => joinText.setColor(GOLD));
          joinText.on("pointerdown", () => {
            this.dismissPublicGamesPopup();
            this.scene.start("LobbyScene", { mode: "join", roomId: room.code });
          });

          this.publicGamesContentElements.push(codeText, countText, joinText);
        });
      })
      .catch(() => {
        if (loadingText.active) loadingText.setText("Failed to load.\nCheck your connection.");
      });
  }

  private dismissPublicGamesPopup(): void {
    this.publicGamesContentElements.forEach((el) => {
      if (el.active) el.destroy();
    });
    this.publicGamesContentElements = [];
    this.publicGamesPopupElements.forEach((el) => {
      if (el.active) el.destroy();
    });
    this.publicGamesPopupElements = [];
  }

  private showAboutPopup(): void {
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200).setInteractive();
    const title = this.add.text(400, 180, "SCRAPYARD STEAL", {
      fontSize: "18px", color: "#ffcc44", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202);
    const version = this.add.text(400, 205, `v${__APP_VERSION__}`, {
      fontSize: "11px", color: "#e0a030", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202);
    const team = this.add.text(400, 250, [
      "Team:",
      "  Steph Hicks (Felar)",
      "  Nathan Engert (Valokor)",
      "",
      "QA:",
      "  Evan Kuhlmann",
      "  Pete Wanamaker",
      "",
      "github.com/stephthedevops/ScrapyardSteal",
      "",
      "Built for Gamedev.js Jam 2026",
    ].join("\n"), {
      fontSize: "11px", color: "#e0a030", fontFamily: "monospace",
      align: "center", lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(202);
    const closeBtnY = team.y + team.height + 20;
    const boxHeight = (closeBtnY + 20) - 160;
    const boxCenterY = 160 + boxHeight / 2;
    const box = this.add.rectangle(400, boxCenterY, 360, boxHeight, 0x1a1a2e, 0.95)
      .setDepth(201).setStrokeStyle(2, 0x3a3a2a);
    const closeBtn = this.add.text(400, closeBtnY, "[CLOSE]", {
      fontSize: "13px", color: "#ffcc44", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => {
      overlay.destroy(); box.destroy(); title.destroy();
      version.destroy(); team.destroy(); closeBtn.destroy();
    });
  }
}
