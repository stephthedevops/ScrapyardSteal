import Phaser from "phaser";
import { NetworkManager } from "../network/NetworkManager";
import { generateName, formatName } from "../utils/nameGenerator";
import { addMusicToggle } from "../ui/MusicToggle";

/** Available colors players can pick — base set (10) */
const BASE_COLOR_OPTIONS: { name: string; hex: number }[] = [
  { name: "Copper", hex: 0xb87333 },
  { name: "Corroded Copper", hex: 0x4a8a5e },
  { name: "Gold", hex: 0xffd700 },
  { name: "Tarnished Silver", hex: 0x8b5a2b },
  { name: "Titanium", hex: 0x7a3ea0 },
  { name: "Cobalt", hex: 0x0047ab },
  { name: "Bismuth", hex: 0xff00ff },
  { name: "Rusty Iron", hex: 0xff3b30 },
  { name: "Chromium", hex: 0xdbe4eb },
  { name: "Tungsten", hex: 0x36454f },
];

/** Extended colors for 20-player mode */
const EXTENDED_COLOR_OPTIONS: { name: string; hex: number }[] = [
  { name: "Brass", hex: 0xcda434 },
  { name: "Verdigris", hex: 0x00e5ff },
  { name: "Rose Gold", hex: 0xe8a0bf },
  { name: "Gunmetal", hex: 0x5c6670 },
  { name: "Nickel", hex: 0xa8a495 },
  { name: "Oxidized Iron", hex: 0xff375f },
  { name: "Titanium Blue", hex: 0x4682b4 },
  { name: "Molten Steel", hex: 0xff6b35 },
  { name: "Uranium", hex: 0x32d74b },
  { name: "Dark Bronze", hex: 0x6b4226 },
];

/** All colors combined */
const ALL_COLOR_OPTIONS = [...BASE_COLOR_OPTIONS, ...EXTENDED_COLOR_OPTIONS];

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
  private configButton: Phaser.GameObjects.Container | null = null;
  private configPanelObjects: Phaser.GameObjects.GameObject[] = [];
  private colorSwatches: Phaser.GameObjects.Container[] = [];
  private selectedColorIndex: number = -1;
  private currentMaxPlayers: number = 10;
  private colorPickerLabel!: Phaser.GameObjects.Text;
  private roomCodeDisplay!: Phaser.GameObjects.Text;
  private errorPopupShown = false;

  constructor() {
    super({ key: "LobbyScene" });
  }

  create(): void {
    // Reset all state from previous session
    this.room = null;
    this.localSessionId = "";
    this.startButton = null;
    this.configButton = null;
    this.configPanelObjects = [];
    this.colorSwatches = [];
    this.selectedColorIndex = -1;
    this.currentMaxPlayers = 10;
    this.errorPopupShown = false;
    this.transitioned = false;

    addMusicToggle(this);

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

    // Your name reroll button — positioned just above color picker
    this.add
      .text(400, 295, "🎲 Reroll Name", {
        fontSize: "13px",
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
    this.colorPickerLabel = this.add
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
      .text(370, 540, "", {
        fontSize: "14px",
        color: GOLD,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    // Copy button next to room code
    const copyBtn = this.add
      .text(470, 540, "[COPY]", {
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

    // Task 9.3: BACK button — visible to all players
    this.createBackButton();

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
    })
      .catch((err: Error) => {
        this.showErrorPopup("Connection failed: " + err.message);
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
      45: { adj: "Venomous", noun: "Beebot", image: "images/beebot-stats.png" },
      48: { adj: "Lethal", noun: "Mambabot", image: "images/mambabot-stats.png" },
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
              this.add.image(700, 400, key)
                .setDisplaySize(200, 200)
                .setDepth(150)
                .setName("secretBotImage");
            });
            this.load.start();
          } else {
            this.add.image(700, 400, key)
              .setDisplaySize(200, 200)
              .setDepth(50)
              .setName("secretBotImage");
          }
        });
      }
    }
  }

  /** Get the active color options based on current maxPlayers */
  private getActiveColors(): { name: string; hex: number }[] {
    return this.currentMaxPlayers >= 20 ? ALL_COLOR_OPTIONS : BASE_COLOR_OPTIONS;
  }

  private createColorPicker(): void {
    // Destroy existing swatches
    this.colorSwatches.forEach((c) => c.destroy());
    this.colorSwatches = [];

    const colors = this.getActiveColors();
    const cols = colors.length <= 10 ? 10 : 10; // always 10 per row
    const rows = Math.ceil(colors.length / cols);
    const swatchSpacing = 36;
    const startX = 400 - (cols * swatchSpacing) / 2 + swatchSpacing / 2;
    const baseY = 345;

    colors.forEach((color, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * swatchSpacing;
      const y = baseY + row * 38;

      const swatch = this.add
        .rectangle(0, 0, 28, 28, color.hex)
        .setInteractive({ useHandCursor: true });

      const border = this.add.rectangle(0, 0, 32, 32).setStrokeStyle(2, 0x333333);

      // Red X overlay for taken colors (hidden by default)
      const xMark = this.add
        .text(0, 0, "✕", {
          fontSize: "20px",
          color: "#ff2222",
          fontFamily: FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0);

      const container = this.add.container(x, y, [border, swatch, xMark]);
      container.setSize(32, 32);
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

    // Handle gameStarted broadcast — reliable transition for all clients
    this.room.onMessage("gameStarted", () => {
      if (this.transitioned) return;
      this.transitioned = true;
      this.scene.start("GameScene", {
        room: this.room,
        networkManager: this.networkManager,
        sessionId: this.localSessionId,
      });
    });

    // Task 9.6: Listen for mid-lobby disconnects
    this.room.onLeave((code: number) => {
      if (!this.transitioned) {
        this.showErrorPopup("Disconnected from server");
      }
    });

    this.room.onStateChange((state: any) => {
      if (this.transitioned) return;

      // Update player list in 3 columns
      const playerEntries: { text: string; color: string }[] = [];
      const takenColors = new Set<number>();
      state.players.forEach((player: any, key: string) => {
        const baseName = player.teamName || `${player.nameAdj} ${player.nameNoun}`.trim() || key.slice(0, 10);
        const displayName = player.isAI ? `🤖 ${baseName}` : baseName;
        const you = key === this.localSessionId ? " ←" : "";
        const host = player.isHost ? " ★" : "";
        const colorName =
          player.color >= 0
            ? ALL_COLOR_OPTIONS.find((c) => c.hex === player.color)?.name || "?"
            : "no color";
        const entryColor = player.color >= 0
          ? `#${player.color.toString(16).padStart(6, "0")}`
          : AMBER;
        playerEntries.push({ text: `${displayName}${host}${you} [${colorName}]`, color: entryColor });
        if (player.color >= 0) takenColors.add(player.color);
      });

      // Destroy old player list items
      this.children.getAll().forEach((child) => {
        if ((child as any).name?.startsWith("playerEntry_")) child.destroy();
      });

      // Render in 3 columns
      const colWidth = 240;
      const cols = 3;
      const startX = 400 - ((Math.min(playerEntries.length, cols) - 1) * colWidth) / 2;
      playerEntries.forEach((entry, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = playerEntries.length < cols
          ? 400 - ((playerEntries.length - 1) * colWidth) / 2 + col * colWidth
          : startX + col * colWidth;
        const y = 155 + row * 20;
        this.add.text(x, y, entry.text, {
          fontSize: "11px",
          color: entry.color,
          fontFamily: FONT,
        }).setOrigin(0.5, 0).setName(`playerEntry_${idx}`);
      });

      // Hide the old single-line player list text
      this.playerListText.setText("");

      // Show short code
      if (state.shortCode) {
        this.roomCodeDisplay.setText(`Room Code: ${state.shortCode}`);
        const copyBtn = this.children.getByName("copyBtn") as Phaser.GameObjects.Text;
        if (copyBtn) copyBtn.setAlpha(1);
      }

      // Rebuild color picker if maxPlayers changed
      const newMaxPlayers = state.maxPlayers ?? 10;
      if (newMaxPlayers !== this.currentMaxPlayers) {
        this.currentMaxPlayers = newMaxPlayers;
        // Find current selected color hex before rebuild
        const activeColors = this.getActiveColors();
        const prevColor = this.selectedColorIndex >= 0 && this.selectedColorIndex < activeColors.length
          ? activeColors[this.selectedColorIndex]?.hex
          : -1;
        this.createColorPicker();
        // Restore selection index if color still exists
        if (prevColor >= 0) {
          const newColors = this.getActiveColors();
          this.selectedColorIndex = newColors.findIndex((c) => c.hex === prevColor);
        }
        this.updateColorSelection();
      }

      // Show red X on taken color swatches
      const activeColors = this.getActiveColors();
      // Sync selectedColorIndex from server state (handles auto-assign)
      const localPlayer = state.players.get(this.localSessionId);
      if (localPlayer?.color >= 0 && this.selectedColorIndex === -1) {
        this.selectedColorIndex = activeColors.findIndex((c) => c.hex === localPlayer.color);
        this.updateColorSelection();
      }
      const myColor = this.selectedColorIndex >= 0 && this.selectedColorIndex < activeColors.length
        ? activeColors[this.selectedColorIndex].hex
        : -1;
      this.colorSwatches.forEach((container, i) => {
        const xMark = container.getAt(2) as Phaser.GameObjects.Text;
        if (i >= activeColors.length) return;
        const isTaken = takenColors.has(activeColors[i].hex) && activeColors[i].hex !== myColor;
        xMark.setAlpha(isTaken ? 1 : 0);
      });

      // Show/hide start button and config button for host
      const isHost = state.hostId === this.localSessionId;
      if (isHost && !this.startButton) {
        this.createStartButton();
      }
      if (!isHost && this.startButton) {
        this.startButton.destroy();
        this.startButton = null;
      }
      if (isHost && state.phase === "waiting" && !this.configButton) {
        this.createConfigButton();
      }
      if ((!isHost || state.phase !== "waiting") && this.configButton) {
        this.configButton.destroy();
        this.configButton = null;
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

  /** Task 9.1: Create ⚙ CONFIG button next to START */
  private createConfigButton(): void {
    const bg = this.add
      .rectangle(0, 0, 140, 36, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(0, 0, "⚙ CONFIG", {
        fontSize: "14px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", () => {
      this.openConfigPanel();
    });

    this.configButton = this.add.container(485, 575, [bg, label]);
    this.configButton.setSize(140, 36);
    this.configButton.setDepth(HUD_DEPTH);
  }

  /** Task 9.3: Create BACK button at bottom of lobby */
  private createBackButton(): void {
    const bg = this.add
      .rectangle(0, 0, 160, 36, BUTTON_BG, 0.85)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(0, 0, "BACK", {
        fontSize: "14px",
        color: AMBER,
        fontFamily: FONT,
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(BUTTON_HOVER, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(BUTTON_BG, 0.85));
    bg.on("pointerdown", () => {
      this.room?.leave();
      this.transitioned = true;
      this.scene.start("MenuScene");
    });

    const container = this.add.container(325, 575, [bg, label]);
    container.setSize(160, 36);
    container.setDepth(HUD_DEPTH);
  }

  /** Task 9.6: Show styled error popup overlay */
  private showErrorPopup(message: string): void {
    if (this.errorPopupShown) return;
    this.errorPopupShown = true;

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(200).setInteractive();
    const box = this.add.rectangle(400, 280, 360, 180, 0x1a1a2e, 0.95)
      .setDepth(201).setStrokeStyle(2, 0x3a3a2a);
    this.add.text(400, 240, "CONNECTION ERROR", {
      fontSize: "16px",
      color: GOLD,
      fontFamily: FONT,
    }).setOrigin(0.5).setDepth(202);
    this.add.text(400, 275, message, {
      fontSize: "12px",
      color: AMBER,
      fontFamily: FONT,
      wordWrap: { width: 320 },
      align: "center",
    }).setOrigin(0.5).setDepth(202);

    // BACK TO MENU button
    const btnBg = this.add
      .rectangle(400, 330, 200, 40, BUTTON_BG, 0.85)
      .setDepth(202)
      .setInteractive({ useHandCursor: true });
    this.add.text(400, 330, "BACK TO MENU", {
      fontSize: "14px",
      color: GOLD,
      fontFamily: FONT,
    }).setOrigin(0.5).setDepth(203);

    btnBg.on("pointerover", () => btnBg.setFillStyle(BUTTON_HOVER, 0.9));
    btnBg.on("pointerout", () => btnBg.setFillStyle(BUTTON_BG, 0.85));
    btnBg.on("pointerdown", () => {
      this.transitioned = true;
      this.scene.start("MenuScene");
    });

    // Auto-transition after 5 seconds
    this.time.delayedCall(5000, () => {
      if (!this.transitioned) {
        this.transitioned = true;
        this.scene.start("MenuScene");
      }
    });
  }

  /** Task 9.2: Open the server config panel overlay */
  private openConfigPanel(): void {
    // If panel already open, do nothing
    if (this.configPanelObjects.length > 0) return;

    const PANEL_DEPTH = 150;
    let selectedTime = this.room?.state?.timeRemaining ?? 300;
    let selectedFormat = this.room?.state?.matchFormat ?? "single";

    // Dark overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(PANEL_DEPTH).setInteractive();
    this.configPanelObjects.push(overlay);

    // Panel box
    const panelBox = this.add.rectangle(400, 340, 500, 540, 0x1a1a2e, 0.95)
      .setDepth(PANEL_DEPTH + 1).setStrokeStyle(2, 0x3a3a2a);
    this.configPanelObjects.push(panelBox);

    // Title
    const title = this.add.text(400, 110, "⚙ SERVER CONFIG", {
      fontSize: "18px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(title);

    // --- TIME LIMIT SECTION ---
    const timeLabel = this.add.text(400, 145, "TIME LIMIT", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(timeLabel);

    const TIME_OPTIONS = [
      { label: "2 min", value: 120 },
      { label: "5 min", value: 300 },
      { label: "7 min", value: 420 },
      { label: "10 min", value: 600 },
      { label: "☠ Death", value: 0 },
    ];

    const timeButtons: Phaser.GameObjects.Rectangle[] = [];
    const timeLabels: Phaser.GameObjects.Text[] = [];

    TIME_OPTIONS.forEach((opt, i) => {
      const x = 220 + i * 80;
      const bg = this.add.rectangle(x, 172, 70, 24, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(x, 172, opt.label, {
        fontSize: "11px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);

      if (opt.value === selectedTime) {
        bg.setFillStyle(0x5a8a3a, 1);
        lbl.setColor(GOLD);
      }

      bg.on("pointerdown", () => {
        selectedTime = opt.value;
        this.networkManager.sendSetConfig({ timeLimit: opt.value });
        // Update highlights
        timeButtons.forEach((b, j) => {
          if (j === i) {
            b.setFillStyle(0x5a8a3a, 1);
            timeLabels[j].setColor(GOLD);
          } else {
            b.setFillStyle(BUTTON_BG, 0.85);
            timeLabels[j].setColor(AMBER);
          }
        });
      });

      timeButtons.push(bg);
      timeLabels.push(lbl);
      this.configPanelObjects.push(bg, lbl);
    });

    // --- MATCH FORMAT SECTION ---
    const formatLabel = this.add.text(400, 200, "MATCH FORMAT", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(formatLabel);

    const FORMAT_OPTIONS = [
      { label: "Single Match", value: "single" },
      { label: "Best of 3", value: "bo3" },
      { label: "Best of 5", value: "bo5" },
    ];

    const formatButtons: Phaser.GameObjects.Rectangle[] = [];
    const formatLabels: Phaser.GameObjects.Text[] = [];

    FORMAT_OPTIONS.forEach((opt, i) => {
      const x = 270 + i * 130;
      const bg = this.add.rectangle(x, 227, 110, 24, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(x, 227, opt.label, {
        fontSize: "11px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);

      if (opt.value === selectedFormat) {
        bg.setFillStyle(0x5a8a3a, 1);
        lbl.setColor(GOLD);
      }

      bg.on("pointerdown", () => {
        selectedFormat = opt.value;
        this.networkManager.sendSetConfig({ matchFormat: opt.value });
        formatButtons.forEach((b, j) => {
          if (j === i) {
            b.setFillStyle(0x5a8a3a, 1);
            formatLabels[j].setColor(GOLD);
          } else {
            b.setFillStyle(BUTTON_BG, 0.85);
            formatLabels[j].setColor(AMBER);
          }
        });
      });

      formatButtons.push(bg);
      formatLabels.push(lbl);
      this.configPanelObjects.push(bg, lbl);
    });

    // --- GEAR SCRAP SECTION ---
    let selectedScrap = this.room?.state?.gearScrapSupply ?? 1000;

    const scrapLabel = this.add.text(400, 255, "GEAR SCRAP", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(scrapLabel);

    const SCRAP_OPTIONS = [50, 100, 500, 1000, 2000];

    const scrapButtons: Phaser.GameObjects.Rectangle[] = [];
    const scrapLabels: Phaser.GameObjects.Text[] = [];

    SCRAP_OPTIONS.forEach((val, i) => {
      const x = 220 + i * 90;
      const bg = this.add.rectangle(x, 282, 72, 24, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(x, 282, `${val}`, {
        fontSize: "12px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);

      if (val === selectedScrap) {
        bg.setFillStyle(0x5a8a3a, 1);
        lbl.setColor(GOLD);
      }

      bg.on("pointerdown", () => {
        selectedScrap = val;
        this.networkManager.sendSetConfig({ gearScrapSupply: val });
        scrapButtons.forEach((b, j) => {
          if (j === i) {
            b.setFillStyle(0x5a8a3a, 1);
            scrapLabels[j].setColor(GOLD);
          } else {
            b.setFillStyle(BUTTON_BG, 0.85);
            scrapLabels[j].setColor(AMBER);
          }
        });
      });

      scrapButtons.push(bg);
      scrapLabels.push(lbl);
      this.configPanelObjects.push(bg, lbl);
    });

    // --- MAX PLAYERS SECTION ---
    let selectedMaxPlayers = this.room?.state?.maxPlayers ?? 10;

    const maxPlayersLabel = this.add.text(400, 310, "MAX PLAYERS", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(maxPlayersLabel);

    const MAX_PLAYER_OPTIONS = [10, 20];

    const maxPlayerButtons: Phaser.GameObjects.Rectangle[] = [];
    const maxPlayerLabels: Phaser.GameObjects.Text[] = [];

    MAX_PLAYER_OPTIONS.forEach((val, i) => {
      const x = 350 + i * 100;
      const bg = this.add.rectangle(x, 337, 80, 24, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const lbl = this.add.text(x, 337, `${val}`, {
        fontSize: "12px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);

      if (val === selectedMaxPlayers) {
        bg.setFillStyle(0x5a8a3a, 1);
        lbl.setColor(GOLD);
      }

      bg.on("pointerdown", () => {
        selectedMaxPlayers = val;
        this.networkManager.sendSetConfig({ maxPlayers: val });
        maxPlayerButtons.forEach((b, j) => {
          if (j === i) {
            b.setFillStyle(0x5a8a3a, 1);
            maxPlayerLabels[j].setColor(GOLD);
          } else {
            b.setFillStyle(BUTTON_BG, 0.85);
            maxPlayerLabels[j].setColor(AMBER);
          }
        });
      });

      maxPlayerButtons.push(bg);
      maxPlayerLabels.push(lbl);
      this.configPanelObjects.push(bg, lbl);
    });

    // --- AI PLAYERS SECTION ---
    const aiLabel = this.add.text(400, 370, "AI PLAYERS", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
    this.configPanelObjects.push(aiLabel);

    // Container area for AI entries — we'll track them and rebuild on add/remove
    const aiEntryObjects: Phaser.GameObjects.GameObject[] = [];

    const rebuildAIEntries = () => {
      // Destroy old AI entry objects
      aiEntryObjects.forEach((obj) => obj.destroy());
      aiEntryObjects.length = 0;

      if (!this.room?.state) return;

      const aiPlayers: { id: string; name: string; color: number }[] = [];
      this.room.state.players.forEach((p: any, key: string) => {
        if (p.isAI) {
          aiPlayers.push({
            id: key,
            name: `${p.nameAdj} ${p.nameNoun}`.trim(),
            color: p.color,
          });
        }
      });

      const countLabel = this.add.text(400, 393, `${aiPlayers.length} / 20`, {
        fontSize: "12px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 2);
      aiEntryObjects.push(countLabel);

      // Show each AI entry in two columns
      aiPlayers.forEach((ai, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = col === 0 ? 210 : 410;
        const y = 415 + row * 24;
        const icon = this.add.text(x, y, "🤖", {
          fontSize: "13px", fontFamily: FONT,
        }).setDepth(PANEL_DEPTH + 2);
        const colorSwatch = this.add.rectangle(x + 22, y + 2, 14, 14, ai.color)
          .setDepth(PANEL_DEPTH + 2);
        const nameText = this.add.text(x + 34, y, ai.name, {
          fontSize: "11px", color: AMBER, fontFamily: FONT,
        }).setDepth(PANEL_DEPTH + 2);
        aiEntryObjects.push(icon, colorSwatch, nameText);
      });

      // + button
      const plusBg = this.add.rectangle(350, 393, 28, 22, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const plusLbl = this.add.text(350, 393, "+", {
        fontSize: "14px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);
      aiEntryObjects.push(plusBg, plusLbl);

      plusBg.on("pointerdown", () => {
        if (aiPlayers.length >= 20) return;
        // Find first available color
        const takenColors = new Set<number>();
        this.room.state.players.forEach((p: any) => {
          if (p.color >= 0) takenColors.add(p.color);
        });
        const availableColor = this.getActiveColors().find((c) => !takenColors.has(c.hex));
        if (!availableColor) return;
        this.networkManager.sendAddAI(availableColor.hex);
        // Rebuild after a short delay to let state sync
        this.time.delayedCall(300, rebuildAIEntries);
      });

      // − button
      const minusBg = this.add.rectangle(450, 393, 28, 22, BUTTON_BG, 0.85)
        .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
      const minusLbl = this.add.text(450, 393, "−", {
        fontSize: "14px", color: AMBER, fontFamily: FONT,
      }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);
      aiEntryObjects.push(minusBg, minusLbl);

      minusBg.on("pointerdown", () => {
        if (aiPlayers.length === 0) return;
        const lastAI = aiPlayers[aiPlayers.length - 1];
        this.networkManager.sendRemoveAI(lastAI.id);
        this.time.delayedCall(300, rebuildAIEntries);
      });
    };

    rebuildAIEntries();

    // Store AI entry objects in the panel objects for cleanup
    // We'll wrap rebuildAIEntries cleanup into closeConfigPanel
    const aiCleanup = { entries: aiEntryObjects };

    // --- DONE BUTTON ---
    const doneBg = this.add.rectangle(400, 490, 140, 32, 0x3a6a2a, 0.9)
      .setDepth(PANEL_DEPTH + 2).setInteractive({ useHandCursor: true });
    const doneLbl = this.add.text(400, 490, "DONE", {
      fontSize: "14px", color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5).setDepth(PANEL_DEPTH + 3);
    this.configPanelObjects.push(doneBg, doneLbl);

    doneBg.on("pointerover", () => doneBg.setFillStyle(0x4a8a3a, 1));
    doneBg.on("pointerout", () => doneBg.setFillStyle(0x3a6a2a, 0.9));
    doneBg.on("pointerdown", () => {
      this.closeConfigPanel(aiCleanup.entries);
    });
  }

  /** Close the config panel and destroy all its objects */
  private closeConfigPanel(aiEntryObjects: Phaser.GameObjects.GameObject[]): void {
    this.configPanelObjects.forEach((obj) => obj.destroy());
    this.configPanelObjects = [];
    aiEntryObjects.forEach((obj) => obj.destroy());
    aiEntryObjects.length = 0;
  }
}
