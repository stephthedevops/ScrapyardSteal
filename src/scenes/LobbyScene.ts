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
        const newName = generateName();
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

    const connectPromise =
      mode === "join" && roomId
        ? this.networkManager.joinByShortCode(roomId)
        : this.networkManager.createGame();

    connectPromise
      .then((room) => {
        this.room = room;
        this.localSessionId = room.sessionId;
        this.statusText.setText("Waiting for host to start...");

        // Generate and send initial random name
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

  private setupStateListener(): void {
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
  }
}
