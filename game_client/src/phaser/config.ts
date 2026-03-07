import Phaser from "phaser";
import { BeginnerFieldScene } from "../scenes/BeginnerFieldScene";
import { BootScene } from "../scenes/BootScene";
import { LoadingScene } from "../scenes/LoadingScene";
import { TavernHubScene } from "../scenes/TavernHubScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#0b1119",
  pixelArt: true,
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, LoadingScene, TavernHubScene, BeginnerFieldScene]
};
