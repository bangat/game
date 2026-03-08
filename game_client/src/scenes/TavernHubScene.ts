import Phaser from "phaser";

export class TavernHubScene extends Phaser.Scene {
  private overlayNodes: HTMLElement[] = [];

  constructor() {
    super("TavernHub");
  }

  create(): void {
    const { width, height } = this.scale;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearOverlays, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearOverlays, this);

    this.cameras.main.setBackgroundColor("#23180f");

    this.drawBackdrop(width, height);
    this.createTopHud(width, height);
    this.createRightMenu(width, height);
    this.createQuestStrip(width, height);
    this.createBottomNav(width, height);
    this.createEnterFieldAction(width, height);
  }

  private drawBackdrop(width: number, height: number): void {
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x1c120c, 1);
    this.add.rectangle(width * 0.5, height * 0.52, width * 0.92, height * 0.84, 0x3f2918, 1);
    this.add.rectangle(width * 0.5, height * 0.16, width * 0.92, height * 0.15, 0x2b1b10, 1);
    this.add.rectangle(width * 0.5, height * 0.83, width * 0.92, height * 0.14, 0x22150d, 1);

    for (let i = 0; i < 6; i += 1) {
      this.add.rectangle(width * (0.18 + i * 0.12), height * 0.34, 22, height * 0.48, 0x5d3b1d, 1);
      this.add.rectangle(width * (0.18 + i * 0.12), height * 0.14, 36, 36, 0x7a4f28, 1);
    }

    this.add.rectangle(width * 0.24, height * 0.56, width * 0.16, height * 0.12, 0x6c4022, 1);
    this.add.rectangle(width * 0.24, height * 0.5, width * 0.14, height * 0.02, 0x3d240f, 1);
    this.add.rectangle(width * 0.72, height * 0.58, width * 0.22, height * 0.08, 0x6c4022, 1);
    this.add.rectangle(width * 0.72, height * 0.52, width * 0.2, height * 0.02, 0x3d240f, 1);

    const barkeep = this.add.container(width * 0.52, height * 0.46);
    barkeep.add(this.add.rectangle(0, 16, 34, 40, 0x27405f, 1));
    barkeep.add(this.add.circle(0, -10, 16, 0xf0c7a6, 1));
    barkeep.add(this.add.rectangle(0, -20, 26, 8, 0x2f2016, 1));
    barkeep.add(this.add.text(-30, 44, "객잔 주인", { fontFamily: "Segoe UI", fontSize: "14px", color: "#f5e8c8" }));

    this.add.text(width * 0.06, height * 0.14, "TAVERN HUB", {
      fontFamily: "Segoe UI",
      fontSize: "22px",
      color: "#f5ead8"
    });
    this.add.text(width * 0.06, height * 0.19, "MAP-02 기반 허브 배치 목업", {
      fontFamily: "Segoe UI",
      fontSize: "13px",
      color: "#d9bf9d"
    });
  }

  private createTopHud(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "overlay-card overlay-card--top";
    node.innerHTML = `
      <div class="profile-chip">
        <div class="profile-chip__avatar">P</div>
        <div class="profile-chip__meta">
          <div class="profile-chip__zone">객잔 휴식처</div>
          <div class="profile-chip__name">별빛 검사</div>
        </div>
      </div>
      <div class="stat-strip">
        <span><b>Lv</b> 7</span>
        <span><b>전투력</b> 377</span>
        <span><b>골드</b> 1014</span>
      </div>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.23, height * 0.09, node);
  }

  private createRightMenu(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "vertical-menu";
    node.innerHTML = `
      <button>메뉴</button>
      <button>가방</button>
      <button>퀘스트</button>
      <button>설정</button>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.93, height * 0.34, node);
  }

  private createQuestStrip(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "quest-strip";
    node.innerHTML = `
      <span class="quest-strip__label">메인 퀘스트</span>
      <strong>객잔에서 초보 사냥터 준비</strong>
      <small>하단 대화형 퀘스트 UI는 다음 패치에서 연결</small>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.31, height * 0.77, node);
  }

  private createBottomNav(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "bottom-actions";
    node.innerHTML = `
      <button class="bottom-actions__pill">상점</button>
      <button class="bottom-actions__pill">우편</button>
      <button class="bottom-actions__pill">설정</button>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.22, height * 0.9, node);
  }

  private createEnterFieldAction(width: number, height: number): void {
    const button = this.add
      .text(width * 0.78, height * 0.82, "초보 필드로 이동", {
        fontFamily: "Segoe UI",
        fontSize: "17px",
        color: "#eff6ff",
        backgroundColor: "#3984ff",
        padding: { left: 18, right: 18, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => {
      this.scene.start("Loading", {
        nextScene: "BeginnerField",
        title: "Beginner Field",
        subtitle: "MAP-02 허브에서 KIT-03 필드로 이동",
        tip: "MON-01 슬라임과 VFX-01, VFX-02 검수용 전투면을 준비합니다.",
        accent: 0x5aff96
      });
    });
  }

  private clearOverlays(): void {
    this.overlayNodes.forEach((node) => node.remove());
    this.overlayNodes = [];
  }
}
