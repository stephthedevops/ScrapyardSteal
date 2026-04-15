import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.add
      .text(400, 300, "Scrapyard Steal", {
        fontSize: "32px",
        color: "#e0a030",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
