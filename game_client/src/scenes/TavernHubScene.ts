import Phaser from "phaser";

export class TavernHubScene extends Phaser.Scene {
  constructor() {
    super("TavernHub");
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#1b2530");

    this.add.rectangle(width * 0.5, height * 0.5, width * 0.9, height * 0.82, 0x223246, 0.95);
    this.add.rectangle(width * 0.5, height * 0.82, width * 0.9, height * 0.12, 0x111925, 0.98);

    this.add
      .text(width * 0.08, height * 0.08, "TavernHub", {
        fontFamily: "Segoe UI",
        fontSize: "28px",
        color: "#f4f7fb"
      });

    this.add
      .text(width * 0.08, height * 0.16, "빈 껍데기 씬: 허브 / 상점 / 퀘스트 / 던전 입구", {
        fontFamily: "Segoe UI",
        fontSize: "16px",
        color: "#b5c0d0"
      });

    const domNode = document.createElement("div");
    domNode.className = "hud-shell";
    domNode.innerHTML = `
      <p class="hud-shell__eyebrow">DOM Overlay</p>
      <h2 class="hud-shell__title">Small HUD Placeholder</h2>
      <p class="hud-shell__body">pixelArt + dom.createContainer 설정이 살아 있는 상태입니다.</p>
    `;

    this.add.dom(width * 0.78, height * 0.18, domNode);

    const enterField = this.add
      .text(width * 0.5, height * 0.82, "Tap / Click to go BeginnerField", {
        fontFamily: "Segoe UI",
        fontSize: "18px",
        color: "#7fd0ff",
        backgroundColor: "#0f1722",
        padding: { left: 16, right: 16, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    enterField.on("pointerdown", () => {
      this.scene.start("BeginnerField");
    });
  }
}
