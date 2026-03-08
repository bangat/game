import Phaser from "phaser";
import type { HeroClassId } from "../state/gameState";

export type HeroActor = {
  root: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  body: Phaser.GameObjects.Rectangle;
  cape: Phaser.GameObjects.Triangle;
  head: Phaser.GameObjects.Ellipse;
  accent: Phaser.GameObjects.Rectangle;
  weapon: Phaser.GameObjects.Rectangle;
  aura: Phaser.GameObjects.Arc;
};

export type SlimeActor = {
  root: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  blob: Phaser.GameObjects.Ellipse;
  highlight: Phaser.GameObjects.Ellipse;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBack: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

const heroPalettes: Record<
  HeroClassId,
  { body: number; accent: number; cape: number; weapon: number; aura: number }
> = {
  warrior: {
    body: 0x7f98c2,
    accent: 0xe6edf9,
    cape: 0x2d4d84,
    weapon: 0xffd27a,
    aura: 0x6ea7ff
  },
  archer: {
    body: 0x7ca86f,
    accent: 0xeaf6dd,
    cape: 0x315f3c,
    weapon: 0xc6ff96,
    aura: 0x8ce28b
  },
  mage: {
    body: 0x8c79b9,
    accent: 0xf4efff,
    cape: 0x40306a,
    weapon: 0xffd0ff,
    aura: 0xc49dff
  }
};

export function createHeroActor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  classId: HeroClassId
): HeroActor {
  const palette = heroPalettes[classId];
  const root = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 28, 40, 14, 0x000000, 0.24);
  const aura = scene.add.circle(0, 8, 26, palette.aura, 0.12).setStrokeStyle(2, palette.aura, 0.36);
  const cape = scene.add.triangle(-2, 10, 0, 10, -12, 34, 12, 34, palette.cape, 0.92);
  const body = scene.add.rectangle(0, 4, 22, 28, palette.body, 1).setStrokeStyle(2, 0x101521, 0.8);
  const accent = scene.add.rectangle(0, -2, 18, 7, palette.accent, 0.9);
  const head = scene.add.ellipse(0, -16, 18, 16, 0xffe0c3, 1).setStrokeStyle(2, 0x101521, 0.8);
  const weapon = scene.add.rectangle(15, 2, 6, 24, palette.weapon, 1).setAngle(24).setStrokeStyle(2, 0x121826, 0.84);

  root.add([shadow, aura, cape, weapon, body, accent, head]);
  return { root, shadow, body, cape, head, accent, weapon, aura };
}

export function updateHeroActor(actor: HeroActor, elapsedMs: number, movement: number, facing: number): void {
  const step = movement > 0.05 ? Math.sin(elapsedMs * 0.018) : Math.sin(elapsedMs * 0.004) * 0.35;
  actor.root.setScale(facing < 0 ? -1 : 1, 1);
  actor.body.y = 4 + step * 2.6;
  actor.head.y = -16 + step * 1.2;
  actor.weapon.y = 2 + step * 2.4;
  actor.weapon.angle = 20 + step * 12;
  actor.cape.y = 10 + step * 0.8;
  actor.cape.rotation = step * 0.04;
  actor.aura.scaleX = 1 + Math.abs(step) * 0.06;
  actor.aura.scaleY = 1 + Math.abs(step) * 0.08;
}

export function createSlimeActor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  tint: number
): SlimeActor {
  const root = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 20, 34, 12, 0x000000, 0.2);
  const blob = scene.add.ellipse(0, 0, 34, 26, tint, 1).setStrokeStyle(2, 0x142222, 0.75);
  const highlight = scene.add.ellipse(-6, -6, 12, 7, 0xffffff, 0.22);
  const leftEye = scene.add.circle(-6, -1, 2.2, 0x11161f, 0.95);
  const rightEye = scene.add.circle(6, -1, 2.2, 0x11161f, 0.95);
  const hpBack = scene.add.rectangle(0, -23, 42, 6, 0x111723, 1).setOrigin(0.5);
  const hpBar = scene.add.rectangle(-21, -23, 42, 6, 0x8bff9d, 1).setOrigin(0, 0.5);
  const label = scene.add
    .text(0, -34, name, {
      fontFamily: "Segoe UI",
      fontSize: "11px",
      color: "#edf8f0",
      stroke: "#0d1418",
      strokeThickness: 3
    })
    .setOrigin(0.5);

  root.add([shadow, blob, highlight, leftEye, rightEye, hpBack, hpBar, label]);
  return { root, shadow, blob, highlight, leftEye, rightEye, hpBar, hpBack, label };
}

export function updateSlimeActor(actor: SlimeActor, elapsedMs: number, idlePhase: number, hpRatio: number): void {
  const pulse = Math.sin(elapsedMs * 0.004 + idlePhase);
  actor.blob.scaleY = 1 + pulse * 0.08;
  actor.blob.scaleX = 1 - pulse * 0.05;
  actor.highlight.y = -6 + pulse * 1.2;
  actor.leftEye.y = -1 + pulse * 0.6;
  actor.rightEye.y = -1 + pulse * 0.6;
  actor.root.y += Math.sin(elapsedMs * 0.0015 + idlePhase) * 0.06;
  actor.hpBar.width = 42 * Phaser.Math.Clamp(hpRatio, 0, 1);
}
