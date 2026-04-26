import Phaser from "phaser";

/** Global mute state — persists across scene transitions */
let globalMuted = false;

/**
 * Add a 🔊/🔇 toggle button to the top-right corner of any scene.
 * Call this in each scene's create() method.
 */
export function addMusicToggle(scene: Phaser.Scene): Phaser.GameObjects.Text {
  // Sync initial state — use game-level sound manager so it affects ALL scenes
  scene.game.sound.mute = globalMuted;

  const btn = scene.add
    .text(780, 10, globalMuted ? "🔇" : "🔊", {
      fontSize: "22px",
      fontFamily: "monospace",
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(999);

  btn.on("pointerdown", () => {
    globalMuted = !globalMuted;
    scene.game.sound.mute = globalMuted;
    btn.setText(globalMuted ? "🔇" : "🔊");
  });

  return btn;
}
