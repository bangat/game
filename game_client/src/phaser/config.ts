import Phaser from "phaser";
import { BeginnerFieldScene } from "../scenes/BeginnerFieldScene";
import { BootScene } from "../scenes/BootScene";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene";
import { LoadingScene } from "../scenes/LoadingScene";
import { TavernHubScene } from "../scenes/TavernHubScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#0b1119",
  pixelArt: true,
  render: {
    antialias: false,
    roundPixels: true
  },
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, LoadingScene, CharacterSelectScene, TavernHubScene, BeginnerFieldScene]
};
