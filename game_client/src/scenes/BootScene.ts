import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b1119");
    this.scene.start("Loading");
  }
}
