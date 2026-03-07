import Phaser from "phaser";

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super("Loading");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#101723");

    this.add
      .text(width * 0.5, height * 0.45, "Loading", {
        fontFamily: "Segoe UI",
        fontSize: "34px",
        color: "#f2f6fb"
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.53, "Boot -> Loading -> TavernHub", {
        fontFamily: "Segoe UI",
        fontSize: "15px",
        color: "#93a4ba"
      })
      .setOrigin(0.5);

    this.time.delayedCall(450, () => {
      this.scene.start("TavernHub");
    });
  }
}
