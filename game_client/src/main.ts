import Phaser from "phaser";
import "./style.css";
import { gameConfig } from "./phaser/config";

declare global {
  interface Window {
    __GAME__?: Phaser.Game;
  }
}

const existingGame = window.__GAME__;
if (existingGame) {
  existingGame.destroy(true);
}

window.__GAME__ = new Phaser.Game(gameConfig);
