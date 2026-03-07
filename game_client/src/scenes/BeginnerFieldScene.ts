import Phaser from "phaser";

export class BeginnerFieldScene extends Phaser.Scene {
  constructor() {
    super("BeginnerField");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#274a33");

    const tileSize = 64;
    for (let y = 0; y < Math.ceil(height / tileSize); y += 1) {
      for (let x = 0; x < Math.ceil(width / tileSize); x += 1) {
        const color = (x + y) % 2 === 0 ? 0x335d3e : 0x3e6b48;
        this.add.rectangle(
          x * tileSize + tileSize * 0.5,
          y * tileSize + tileSize * 0.5,
          tileSize,
          tileSize,
          color,
          1
        );
      }
    }

    this.add
      .text(width * 0.06, height * 0.08, "BeginnerField", {
        fontFamily: "Segoe UI",
        fontSize: "28px",
        color: "#f5fbf4"
      });

    this.add
      .text(width * 0.06, height * 0.15, "빈 껍데기 씬: 몬스터 스폰 / 데미지 텍스트 / 자동사냥은 다음 단계", {
        fontFamily: "Segoe UI",
        fontSize: "16px",
        color: "#d1e7cf"
      });

    const backButton = this.add
      .text(width * 0.5, height * 0.88, "Back to TavernHub", {
        fontFamily: "Segoe UI",
        fontSize: "18px",
        color: "#15202a",
        backgroundColor: "#9be08e",
        padding: { left: 16, right: 16, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("TavernHub");
    });
  }
}
