import Phaser from "phaser";
import { NetworkManager } from "../network/NetworkManager";
import { generateName, formatName } from "../utils/nameGenerator";

/** Available colors players can pick */
const COLOR_OPTIONS: { name: string; hex: number }[] = [
  { name: "Copper", hex: 0xb87333 },
  { name: "Corroded Copper", hex: 0x4a8a5e },
  { name: "Gold", hex: 0xffd700 },
  { name: "Tarnished Silver", hex: 0x8a8a7a },
  { name: "Titanium", hex: 0x7a3ea0 },
  { name: "Cobalt", hex: 0x0047ab },
  { name: "Bismuth", hex: 0xff00ff },
  { name: "Rusty Iron", hex: 0x8b4513 },
  { name: "Chromium", hex: 0xdbe4eb },
  { name: "Tungsten", hex: 0x36454f },
];

const AMBER = "#e0a030";
const GOLD = "#ffcc44";
const FONT = "monospace";
const HUD_DEPTH = 100;
const BUTTON_BG = 0x3a3a2a;
const BUTTON_HOVER = 0x5a5a3a;

export class LobbyScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private room: any = null;
  private localSessionId: string = "";

  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private startButton: Phaser.GameObjects.Container | null = null;
  private colorSwatches: Phaser.GameObjects.Container[] = [];
  private selectedColorIndex: number = -1;
  private roomCodeDisplay!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "LobbyScene" });
  }

  create(): void {
    this.titleText = this.add
      .text(400, 40, "SCRAPYARD STEAL", {
        fontSize: "36px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Easter egg tagline: "Machines built to smash, weld, absorb, and boom."
    // Secret letters: M(acawbot), B(eebot), T(igerbot), S(eahorsebot), W(olfbot), A(xolotebot), B(unnybot), M(ambabot)
    this.createEasterEggTagline();

    this.statusText = this.add
      .text(400, 90, "Connecting...", {
        fontSize: "16px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Player list
    this.add
      .text(400, 130, "PLAYERS", {
        fontSize: "14px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Your name display with reroll button
    this.add
      .text(310, 155, "♻", {
        fontSize: "18px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const taken = this.getTakenNames();
        const newName = generateName(taken.adjs, taken.nouns);
        this.networkManager.sendSetName(newName.adj, newName.noun);
      })
      .on("pointerover", function (this: Phaser.GameObjects.Text) {
        this.setColor("#ffffff");
      })
      .on("pointerout", function (this: Phaser.GameObjects.Text) {
        this.setColor(AMBER);
      });

    this.playerListText = this.add
      .text(400, 175, "", {
        fontSize: "13px",
        color: AMBER,
        fontFamily: FONT,
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    // Color picker label
    this.add
      .text(400, 310, "CHOOSE YOUR COLOR", {
        fontSize: "14px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Color swatches
    this.createColorPicker();

    // Room code display (shown after connecting)
    this.roomCodeDisplay = this.add
      .text(370, 560, "", {
        fontSize: "14px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Copy button next to room code
    const copyBtn = this.add
      .text(470, 560, "[COPY]", {
        fontSize: "14px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    copyBtn.setName("copyBtn");

    copyBtn.on("pointerover", () => copyBtn.setColor("#ffffff"));
    copyBtn.on("pointerout", () => copyBtn.setColor(AMBER));
    copyBtn.on("pointerdown", () => {
      const code = this.roomCodeDisplay.text.replace("Room Code: ", "");
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.setText("[COPIED]");
          this.time.delayedCall(1500, () => copyBtn.setText("[COPY]"));
        });
      }
    });

    // Connect based on mode
    const mode = (this.scene.settings.data as any)?.mode || "create";
    const roomId = (this.scene.settings.data as any)?.roomId || "";

    this.networkManager = new NetworkManager();

    let connectPromise: Promise<any>;
    if (mode === "join" && roomId) {
      connectPromise = this.networkManager.joinByShortCode(roomId);
    } else if (mode === "quickplay") {
      connectPromise = this.networkManager.joinPublicRoom();
    } else {
      connectPromise = this.networkManager.createGame();
    }

    connectPromise
      .then((room) => {
        this.room = room;
        this.localSessionId = room.sessionId;
        this.statusText.setText("Waiting for host to start...");

        // Generate and send initial random name (no taken names yet since we just joined)
        const initialName = generateName();
        this.networkManager.sendSetName(initialName.adj, initialName.noun);

        this.setupStateListener();

        // Poll for phase change as a fallback (in case onStateChange misses it)
        this.time.addEvent({
          delay: 500,
          loop: true,
          callback: () => {
            if (this.transitioned) return;
          if (this.room?.state?.phase === "active") {
            this.transitioned = true;
            this.scene.start("GameScene", {
              room: this.room,
              networkManager: this.networkManager,
              sessionId: this.localSessionId,
            });
          }
        },
      });
    })
      .catch((err: Error) => {
        this.statusText.setText("Failed to connect: " + err.message);
        this.time.delayedCall(3000, () => {
          this.scene.start("MenuScene");
        });
      });
  }

  private createEasterEggTagline(): void {
    // Tagline: "Machines built to smash, weld, absorb, and boom."
    // Secret letters map to bots (first letter of each word with a secret)
    const SECRET_BOTS: Record<number, { adj: string; noun: string; image: string }> = {
      0:  { adj: "Prismatic", noun: "Macawbot", image: "images/macawbot-stats.png" },
      9:  { adj: "Phantom", noun: "Bunnybot", image: "images/bunnybot-stats.png" },
      15: { adj: "Apex", noun: "Tigerbot", image: "images/tigerbot-stats.png" },
      18: { adj: "Abyssal", noun: "Seahorsebot", image: "images/seahorsebot-stats.png" },
      25: { adj: "Feral", noun: "Wolfbot", image: "images/wolfbot-stats.png" },
      31: { adj: "Mythic", noun: "Axolotebot", image: "images/axolotebot-stats.png" },
      42: { adj: "Venomous", noun: "Beebot", image: "images/beebot-stats.png" },
      46: { adj: "Lethal", noun: "Mambabot", image: "images/mambabot-stats.png" },
    };

    const tagline = "Machines built to smash, weld, absorb, and kaboom.";
    const y = 68;
    const fontSize = 11;
    const startX = 400 - (tagline.length * fontSize * 0.3);

    // Render each character, making secret ones interactive
    for (let i = 0; i < tagline.length; i++) {
      const ch = tagline[i];
      const x = startX + i * (fontSize * 0.6);
      const isSecret = SECRET_BOTS[i] !== undefined;

      const charText = this.add
        .text(x, y, ch, {
          fontSize: `${fontSize}px`,
          color: AMBER,
          fontFamily: FONT,
        })
        .setDepth(50);

      if (isSecret) {
        const bot = SECRET_BOTS[i];
        charText.setInteractive({ useHandCursor: true });
        charText.on("pointerover", () => charText.setColor("#c8b060"));
        charText.on("pointerout", () => charText.setColor(AMBER));
        charText.on("pointerdown", () => {
          // Check if this elite bot noun is already taken in the lobby
          if (this.room?.state) {
            let taken = false;
            this.room.state.players.forEach((p: any, key: string) => {
              if (key !== this.localSessionId && p.nameNoun === bot.noun) {
                taken = true;
              }
            });
            if (taken) return;
          }

          // Set the player's name to the secret bot with unique elite adjective
          this.networkManager.sendSetName(bot.adj, bot.noun);

          // Show the bot image on the right side
          const existing = this.children.getByName("secretBotImage");
          if (existing) existing.destroy();

          // Load and display the image
          const key = `secret_${bot.noun}`;
          if (!this.textures.exists(key)) {
            this.load.image(key, bot.image);
            this.load.once("complete", () => {
              this.add.image(700, 200, key)
                .setDisplaySize(200, 200)
                .setDepth(150)
                .setName("secretBotImage");
            });
            this.load.start();
          } else {
            this.add.image(700, 200, key)
              .setDisplaySize(200, 200)
              .setDepth(50)
              .setName("secretBotImage");
          }
        });
      }
    }
  }

  private createColorPicker(): void {
    const startX = 400 - (COLOR_OPTIONS.length * 40) / 2 + 20;
    const y = 345;

    COLOR_OPTIONS.forEach((color, i) => {
      const x = startX + i * 40;

      const swatch = this.add
        .rectangle(0, 0, 30, 30, color.hex)
        .setInteractive({ useHandCursor: true });

      const border = this.add.rectangle(0, 0, 34, 34).setStrokeStyle(2, 0x333333);

      // Red X overlay for taken colors (hidden by default)
      const xMark = this.add
        .text(0, 0, "✕", {
          fontSize: "22px",
          color: "#ff2222",
          fontFamily: FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0);

      const container = this.add.container(x, y, [border, swatch, xMark]);
      container.setSize(34, 34);
      container.setDepth(HUD_DEPTH);

      swatch.on("pointerdown", () => {
        this.selectedColorIndex = i;
        this.networkManager.sendSelectColor(color.hex);
        this.updateColorSelection();
      });

      this.colorSwatches.push(container);
    });
  }

  private updateColorSelection(): void {
    this.colorSwatches.forEach((container, i) => {
      const border = container.getAt(0) as Phaser.GameObjects.Rectangle;
      if (i === this.selectedColorIndex) {
        border.setStrokeStyle(3, 0xffffff);
      } else {
        border.setStrokeStyle(2, 0x333333);
      }
    });
  }

  private transitioned = false;

  /** Get taken adjectives and nouns from other players in the room */
  private getTakenNames(): { adjs: Set<string>; nouns: Set<string> } {
    const adjs = new Set<string>();
    const nouns = new Set<string>();
    if (this.room?.state) {
      this.room.state.players.forEach((player: any, key: string) => {
        if (key === this.localSessionId) return;
        if (player.nameAdj) adjs.add(player.nameAdj);
        if (player.nameNoun) nouns.add(player.nameNoun);
      });
    }
    return { adjs, nouns };
  }

  private setupStateListener(): void {
    // Handle name rejection — auto-reroll with taken names excluded
    this.room.onMessage("nameRejected", () => {
      const taken = this.getTakenNames();
      const newName = generateName(taken.adjs, taken.nouns);
      this.networkManager.sendSetName(newName.adj, newName.noun);
    });

    // Handle start error — show message to host
    this.room.onMessage("startError", (data: { message: string }) => {
      this.statusText.setText(data.message);
      this.time.delayedCall(3000, () => {
        this.statusText.setText("Fix names and try again");
      });
    });

    this.room.onStateChange((state: any) => {
      if (this.transitioned) return;

      // If game started, switch to GameScene
      if (state.phase === "active") {
        this.transitioned = true;
        this.scene.start("GameScene", {
          room: this.room,
          networkManager: this.networkManager,
          sessionId: this.localSessionId,
        });
        return;
      }

      // Update player list
      const players: string[] = [];
      const takenColors = new Set<number>();
      state.players.forEach((player: any, key: string) => {
        const displayName = player.teamName || `${player.nameAdj} ${player.nameNoun}`.trim() || key.slice(0, 10);
        const host = player.isHost ? " (HOST)" : "";
        const you = key === this.localSessionId ? " ← you" : "";
        const colorName =
          player.color >= 0
            ? COLOR_OPTIONS.find((c) => c.hex === player.color)?.name || "?"
            : "no color";
        players.push(`${displayName}${host}${you}  [${colorName}]`);
        if (player.color >= 0) takenColors.add(player.color);
      });
      this.playerListText.setText(players.join("\n"));

      // Show short code
      if (state.shortCode) {
        this.roomCodeDisplay.setText(`Room Code: ${state.shortCode}`);
        const copyBtn = this.children.getByName("copyBtn") as Phaser.GameObjects.Text;
        if (copyBtn) copyBtn.setAlpha(1);
      }

      // Show red X on taken color swatches
      this.colorSwatches.forEach((container, i) => {
        const xMark = container.getAt(2) as Phaser.GameObjects.Text;
        const isTaken =
          takenColors.has(COLOR_OPTIONS[i].hex) &&
          COLOR_OPTIONS[i].hex !==
            (this.selectedColorIndex >= 0
              ? COLOR_OPTIONS[this.selectedColorIndex].hex
              : -1);
        xMark.setAlpha(isTaken ? 1 : 0);
      });

      // Show/hide start button for host
      const isHost = state.hostId === this.localSessionId;
      if (isHost && !this.startButton) {
        this.createStartButton();
      }
      if (!isHost && this.startButton) {
        this.startButton.destroy();
        this.startButton = null;
      }

      // Update public toggle label
      const pubToggle = this.children.getByName("publicToggle") as Phaser.GameObjects.Container;
      if (pubToggle) {
        const pubLabel = pubToggle.getAt(1) as Phaser.GameObjects.Text;
        pubLabel.setText(state.isPublic ? "🌐 PUBLIC" : "🔒 PRIVATE");
      }

      // Update status
      const count = state.players.size;
      if (isHost) {
        this.statusText.setText(`${count} player${count !== 1 ? "s" : ""} in lobby — press START when ready`);
      } else {
        this.statusText.setText(`${count} player${count !== 1 ? "s" : ""} in lobby — waiting for host...`);
      }
    });
  }

  private createStartButton(): void {
    const bg = this.add
      .rectangle(0, 0, 200, 50, 0x3a6a2a, 0.9)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(0, 0, "START GAME", {
        fontSize: "20px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(0x4a8a3a, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x3a6a2a, 0.9));
    bg.on("pointerdown", () => {
      this.networkManager.sendStartGame();
    });

    this.startButton = this.add.container(400, 500, [bg, label]);
    this.startButton.setSize(200, 50);
    this.startButton.setDepth(HUD_DEPTH);

    // Public toggle button
    const pubBg = this.add
      .rectangle(0, 0, 200, 36, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });

    const pubLabel = this.add
      .text(0, 0, "🔒 PRIVATE", {
        fontSize: "14px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    pubBg.on("pointerover", () => pubBg.setFillStyle(BUTTON_HOVER, 0.9));
    pubBg.on("pointerout", () => pubBg.setFillStyle(BUTTON_BG, 0.85));
    pubBg.on("pointerdown", () => {
      this.networkManager.sendTogglePublic();
    });

    const pubContainer = this.add.container(400, 450, [pubBg, pubLabel]);
    pubContainer.setSize(200, 36);
    pubContainer.setDepth(HUD_DEPTH);
    pubContainer.setName("publicToggle");
  }
}
