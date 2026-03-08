import Phaser from "phaser";

type LoadingScenePayload = {
  nextScene?: string;
  title?: string;
  subtitle?: string;
  tip?: string;
  accent?: number;
};

export class LoadingScene extends Phaser.Scene {
  private nextScene = "CharacterSelect";

  constructor() {
    super("Loading");
  }

  init(data: LoadingScenePayload): void {
    this.nextScene = data.nextScene ?? "CharacterSelect";
  }

  create(data: LoadingScenePayload): void {
    const { width, height } = this.scale;
    const title = data.title ?? "Loading";
    const subtitle = data.subtitle ?? "객잔과 필드를 준비하는 중";
    const tip = data.tip ?? "작은 HUD와 넓은 전투면을 먼저 맞춥니다.";
    const accent = data.accent ?? 0x5bb7ff;

    this.cameras.main.setBackgroundColor("#101723");

    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x0a0f15, 0.94);
    this.add.rectangle(width * 0.5, height * 0.5, width * 0.78, height * 0.62, 0x121b27, 0.92);
    this.add.rectangle(width * 0.5, height * 0.5, width * 0.72, height * 0.52, accent, 0.08);

    this.add
      .text(width * 0.5, height * 0.36, title, {
        fontFamily: "Segoe UI",
        fontSize: "38px",
        color: "#f2f6fb"
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.45, subtitle, {
        fontFamily: "Segoe UI",
        fontSize: "16px",
        color: "#a8b7c8"
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.62, tip, {
        fontFamily: "Segoe UI",
        fontSize: "14px",
        color: "#d8e2f0",
        backgroundColor: "#0d131c",
        padding: { left: 18, right: 18, top: 10, bottom: 10 }
      })
      .setOrigin(0.5);

    const trackWidth = width * 0.34;
    this.add.rectangle(width * 0.5, height * 0.74, trackWidth, 10, 0x243243, 1);
    const fill = this.add.rectangle(width * 0.5 - trackWidth * 0.5, height * 0.74, 4, 10, accent, 1).setOrigin(0, 0.5);

    this.tweens.add({
      targets: fill,
      width: trackWidth,
      duration: 520,
      ease: "Sine.Out"
    });

    this.time.delayedCall(580, () => {
      this.scene.start(this.nextScene);
    });
  }
}
