import Phaser from "phaser";
import { gameState, heroClasses, syncSelectedSlot, updateSelectedSlot, type HeroClassId } from "../state/gameState";

export class CharacterSelectScene extends Phaser.Scene {
  private overlayNodes: HTMLElement[] = [];
  private slotButtons: HTMLButtonElement[] = [];
  private classButtons: HTMLButtonElement[] = [];
  private nicknameInput?: HTMLInputElement;

  constructor() {
    super("CharacterSelect");
  }

  create(): void {
    const { width, height } = this.scale;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearOverlays, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearOverlays, this);

    this.add.image(width * 0.5, height * 0.5, "bg-tavern").setDisplaySize(width, height).setAlpha(0.28);
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x081018, 0.8);

    this.add.text(width * 0.08, height * 0.12, "CHARACTER SELECT", {
      fontFamily: "Segoe UI",
      fontSize: "28px",
      color: "#f3f7ff"
    });

    const panel = document.createElement("div");
    panel.className = "character-select";
    panel.innerHTML = `
      <div class="character-select__header">
        <span class="character-select__eyebrow">게임 시작</span>
        <strong>슬롯 3개 중 하나를 선택하고 닉네임 / 직업을 정합니다.</strong>
      </div>
      <div class="character-select__slots"></div>
      <label class="character-select__label">
        <span>닉네임</span>
        <input class="character-select__input" maxlength="12" />
      </label>
      <div class="character-select__classes"></div>
      <div class="character-select__actions">
        <button class="character-select__start">게임 시작</button>
      </div>
    `;

    const slotWrap = panel.querySelector(".character-select__slots") as HTMLElement;
    this.slotButtons = gameState.slots.map((slot) => {
      const button = document.createElement("button");
      button.className = "character-slot";
      button.dataset.slotId = String(slot.id);
      button.innerHTML = `
        <span class="character-slot__index">SLOT ${slot.id}</span>
        <strong>${slot.nickname}</strong>
        <small>${heroClasses.find((heroClass) => heroClass.id === slot.classId)?.label ?? slot.classId}</small>
      `;
      button.addEventListener("click", () => this.selectSlot(slot.id));
      slotWrap.appendChild(button);
      return button;
    });

    this.nicknameInput = panel.querySelector(".character-select__input") as HTMLInputElement;
    this.nicknameInput.value = gameState.nickname;
    this.nicknameInput.addEventListener("input", () => {
      updateSelectedSlot(this.nicknameInput?.value.trim() || "모험가", gameState.selectedClassId);
      this.refreshSlotButtons();
    });

    const classWrap = panel.querySelector(".character-select__classes") as HTMLElement;
    this.classButtons = heroClasses.map((heroClass) => {
      const button = document.createElement("button");
      button.className = "class-card class-card--select";
      button.dataset.classId = heroClass.id;
      button.innerHTML = `
        <span class="class-card__badge" style="background:${heroClass.accentHex}"></span>
        <strong>${heroClass.label}</strong>
        <small>${heroClass.tagline}</small>
        <em>${heroClass.primarySkill}</em>
      `;
      button.addEventListener("click", () => this.selectClass(heroClass.id));
      classWrap.appendChild(button);
      return button;
    });

    const startButton = panel.querySelector(".character-select__start") as HTMLButtonElement;
    startButton.addEventListener("click", () => {
      updateSelectedSlot(this.nicknameInput?.value.trim() || "모험가", gameState.selectedClassId);
      this.scene.start("Loading", {
        nextScene: "TavernHub",
        title: "Tavern Hub",
        subtitle: `${gameState.nickname} / ${heroClasses.find((heroClass) => heroClass.id === gameState.selectedClassId)?.label ?? "모험가"} 입장`,
        tip: "객잔 허브와 작은 HUD를 불러옵니다.",
        accent: 0xf4b24f
      });
    });

    this.overlayNodes.push(panel);
    this.add.dom(width * 0.5, height * 0.57, panel);
    this.refreshUi();
  }

  private selectSlot(slotId: number): void {
    gameState.selectedSlotId = slotId;
    syncSelectedSlot();
    this.refreshUi();
  }

  private selectClass(classId: HeroClassId): void {
    gameState.selectedClassId = classId;
    updateSelectedSlot(this.nicknameInput?.value.trim() || "모험가", classId);
    this.refreshUi();
  }

  private refreshUi(): void {
    if (this.nicknameInput) {
      this.nicknameInput.value = gameState.nickname;
    }
    this.refreshSlotButtons();
    this.classButtons.forEach((button) => {
      button.classList.toggle("class-card--active", button.dataset.classId === gameState.selectedClassId);
    });
  }

  private refreshSlotButtons(): void {
    this.slotButtons.forEach((button) => {
      const slotId = Number(button.dataset.slotId);
      const slot = gameState.slots.find((item) => item.id === slotId);
      if (!slot) {
        return;
      }
      button.classList.toggle("character-slot--active", slot.id === gameState.selectedSlotId);
      button.querySelector("strong")!.textContent = slot.nickname;
      button.querySelector("small")!.textContent =
        heroClasses.find((heroClass) => heroClass.id === slot.classId)?.label ?? slot.classId;
    });
  }

  private clearOverlays(): void {
    this.overlayNodes.forEach((node) => node.remove());
    this.overlayNodes = [];
    this.slotButtons = [];
    this.classButtons = [];
    this.nicknameInput = undefined;
  }
}
