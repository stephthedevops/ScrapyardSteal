import Phaser from "phaser";
import { WavedashSDK } from "@wvdsh/sdk-js";
import { MenuScene } from "./scenes/MenuScene";
import { TutorialScene } from "./scenes/TutorialScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 800,
  height: 600,
  backgroundColor: "#1a1a2e",
  scene: [MenuScene, TutorialScene, LobbyScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    postBoot: () => {
      const Wavedash = (window as unknown as { Wavedash: WavedashSDK }).Wavedash;
      if (Wavedash) {
        Wavedash.init();
      }
    },
  },
};

new Phaser.Game(config);
