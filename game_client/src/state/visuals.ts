import type { HeroClassId } from "./gameState";

type SpriteVisual = {
  key: string;
  texture: string;
  crop: { x: number; y: number; width: number; height: number };
  scale: number;
};

export const backgroundTextures = {
  tavern: "bg-tavern",
  field: "bg-field"
};

export const heroVisuals: Record<HeroClassId, SpriteVisual> = {
  warrior: {
    key: "hero-warrior",
    texture: "hero-warrior",
    crop: { x: 560, y: 170, width: 480, height: 740 },
    scale: 0.19
  },
  archer: {
    key: "hero-archer",
    texture: "hero-archer",
    crop: { x: 90, y: 150, width: 430, height: 760 },
    scale: 0.19
  },
  mage: {
    key: "hero-mage",
    texture: "hero-mage",
    crop: { x: 50, y: 150, width: 470, height: 760 },
    scale: 0.19
  }
};

export const npcVisual = {
  texture: "hero-mage",
  crop: { x: 50, y: 150, width: 470, height: 760 },
  scale: 0.17
};

export const enemyVisual = {
  texture: "enemy-goblin",
  crop: { x: 40, y: 130, width: 520, height: 760 },
  scale: 0.16
};
