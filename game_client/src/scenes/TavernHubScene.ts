import Phaser from "phaser";
import { gameState, getSelectedHeroClass } from "../state/gameState";
import { backgroundTextures, heroVisuals, npcVisual } from "../state/visuals";

export class TavernHubScene extends Phaser.Scene {
  private overlayNodes: HTMLElement[] = [];

  constructor() {
    super("TavernHub");
  }

  create(): void {
    const { width, height } = this.scale;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearOverlays, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearOverlays, this);

    this.drawBackdrop(width, height);
    this.drawNpc(width, height);
    this.createCompactHud(width, height);
    this.createRightMenu(width, height);
    this.createQuestStrip(width, height);
    this.createBottomActions(width, height);
    this.createMoveButtons(width, height);
  }

  private drawBackdrop(width: number, height: number): void {
    this.add.image(width * 0.5, height * 0.5, backgroundTextures.tavern).setDisplaySize(width, height);
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x0b0e13, 0.34);
    this.add.rectangle(width * 0.5, height * 0.92, width, height * 0.16, 0x140e0a, 0.74);

    this.add.text(width * 0.08, height * 0.15, "객잔 휴식처", {
      fontFamily: "Segoe UI",
      fontSize: "22px",
      color: "#f8ead0"
    });
    this.add.text(width * 0.08, height * 0.19, "필드 진입 전 정비 / 상점 / 우편 / 캐릭터 변경", {
      fontFamily: "Segoe UI",
      fontSize: "12px",
      color: "#e4c9a2"
    });
  }

  private drawNpc(width: number, height: number): void {
    const npc = this.add.image(width * 0.48, height * 0.54, npcVisual.texture);
    npc.setCrop(npcVisual.crop.x, npcVisual.crop.y, npcVisual.crop.width, npcVisual.crop.height);
    npc.setScale(npcVisual.scale);
    npc.setTint(0xf1e2cf);

    const classVisual = heroVisuals[getSelectedHeroClass().id];
    const hero = this.add.image(width * 0.27, height * 0.62, classVisual.texture);
    hero.setCrop(classVisual.crop.x, classVisual.crop.y, classVisual.crop.width, classVisual.crop.height);
    hero.setScale(classVisual.scale);

    this.add.text(width * 0.44, height * 0.69, "객잔 주인", {
      fontFamily: "Segoe UI",
      fontSize: "13px",
      color: "#fff3dc"
    });
  }

  private createCompactHud(width: number, height: number): void {
    const selected = getSelectedHeroClass();
    const node = document.createElement("div");
    node.className = "mini-hud";
    node.innerHTML = `
      <div class="mini-hud__profile">
        <div class="mini-hud__avatar">${selected.label[0]}</div>
        <div>
          <div class="mini-hud__name">${gameState.nickname}</div>
          <div class="mini-hud__meta">${selected.label} / Lv 7 / 전투력 377</div>
        </div>
      </div>
      <div class="mini-hud__bars">
        <div class="mini-bar"><span>HP</span><i style="width:86%"></i></div>
        <div class="mini-bar"><span>MP</span><i style="width:62%"></i></div>
        <div class="mini-bar"><span>CP</span><i style="width:54%"></i></div>
      </div>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.16, height * 0.08, node).setScrollFactor(0);
  }

  private createRightMenu(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "vertical-menu vertical-menu--thin";
    node.innerHTML = `
      <button data-action="menu">메뉴</button>
      <button data-action="bag">가방</button>
      <button data-action="quest">퀘스트</button>
      <button data-action="character">캐선</button>
    `;

    node.querySelector('[data-action="character"]')?.addEventListener("click", () => {
      this.scene.start("Loading", {
        nextScene: "CharacterSelect",
        title: "Character Select",
        subtitle: "캐릭터 슬롯과 직업을 다시 고릅니다.",
        tip: "옵션의 캐릭터 변경으로 돌아온 상태입니다.",
        accent: 0x6ea7ff
      });
    });

    this.overlayNodes.push(node);
    this.add.dom(width * 0.945, height * 0.34, node).setScrollFactor(0);
  }

  private createQuestStrip(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "quest-strip quest-strip--compact";
    node.innerHTML = `
      <span class="quest-strip__label">메인 퀘스트</span>
      <strong>초보 사냥터로 이동</strong>
      <small>객잔 주인이 준비를 마쳤습니다.</small>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.22, height * 0.82, node).setScrollFactor(0);
  }

  private createBottomActions(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "bottom-actions";
    node.innerHTML = `
      <button class="bottom-actions__pill">상점</button>
      <button class="bottom-actions__pill">우편</button>
      <button class="bottom-actions__pill">설정</button>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.18, height * 0.92, node).setScrollFactor(0);
  }

  private createMoveButtons(width: number, height: number): void {
    const toField = this.add
      .text(width * 0.76, height * 0.83, "초보 필드", {
        fontFamily: "Segoe UI",
        fontSize: "16px",
        color: "#eff6ff",
        backgroundColor: "#3879eb",
        padding: { left: 16, right: 16, top: 9, bottom: 9 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    toField.on("pointerdown", () => {
      this.scene.start("Loading", {
        nextScene: "BeginnerField",
        title: "Beginner Field",
        subtitle: `${gameState.nickname} / ${getSelectedHeroClass().label} 초보 사냥터 입장`,
        tip: "좌하단 조이스틱과 우하단 근접 공격 버튼으로 진입합니다.",
        accent: 0x7ee264
      });
    });
  }

  private clearOverlays(): void {
    this.overlayNodes.forEach((node) => node.remove());
    this.overlayNodes = [];
  }
}
