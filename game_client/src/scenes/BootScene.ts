import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.image("bg-tavern", "/assets/backgrounds/village-hub.jpg");
    this.load.image("bg-field", "/assets/backgrounds/dark-field.jpg");
    this.load.image("hero-warrior", "/assets/characters/warrior.png");
    this.load.image("hero-archer", "/assets/characters/ranger.png");
    this.load.image("hero-mage", "/assets/characters/mage.png");
    this.load.image("enemy-goblin", "/assets/enemies/field-goblin.png");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b1119");
    this.scene.start("Loading", {
      nextScene: "CharacterSelect",
      title: "Character Select",
      subtitle: "닉네임과 직업을 정하고 시작합니다.",
      tip: "캐릭터 슬롯 3개와 직업 선택 화면을 먼저 보여줍니다.",
      accent: 0x6ea7ff
    });
  }
}
