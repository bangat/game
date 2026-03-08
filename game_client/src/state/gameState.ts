export type HeroClassId = "warrior" | "archer" | "mage";

export type HeroClassDefinition = {
  id: HeroClassId;
  label: string;
  tagline: string;
  primarySkill: string;
  accentHex: string;
  speed: number;
};

export type CharacterSlot = {
  id: number;
  nickname: string;
  classId: HeroClassId;
};

export const heroClasses: HeroClassDefinition[] = [
  {
    id: "warrior",
    label: "전사",
    tagline: "근접 압박 / 묵직한 베기",
    primarySkill: "칼날 베기",
    accentHex: "#6ea7ff",
    speed: 198
  },
  {
    id: "archer",
    label: "궁수",
    tagline: "빠른 타격 / 민첩형",
    primarySkill: "관통 사격",
    accentHex: "#8ce28b",
    speed: 214
  },
  {
    id: "mage",
    label: "마법사",
    tagline: "광역형 / 폭발 마법",
    primarySkill: "아케인 볼트",
    accentHex: "#c49dff",
    speed: 188
  }
];

export const gameState = {
  selectedClassId: "warrior" as HeroClassId,
  selectedSlotId: 1,
  nickname: "별빛검사",
  slots: [
    { id: 1, nickname: "별빛검사", classId: "warrior" as HeroClassId },
    { id: 2, nickname: "초원궁수", classId: "archer" as HeroClassId },
    { id: 3, nickname: "은빛마도", classId: "mage" as HeroClassId }
  ] as CharacterSlot[]
};

export function getHeroClassById(classId: HeroClassId): HeroClassDefinition {
  return heroClasses.find((heroClass) => heroClass.id === classId) ?? heroClasses[0];
}

export function getSelectedHeroClass(): HeroClassDefinition {
  return getHeroClassById(gameState.selectedClassId);
}

export function syncSelectedSlot(): void {
  const slot = gameState.slots.find((item) => item.id === gameState.selectedSlotId);
  if (!slot) {
    return;
  }
  gameState.nickname = slot.nickname;
  gameState.selectedClassId = slot.classId;
}

export function updateSelectedSlot(nickname: string, classId: HeroClassId): void {
  const slot = gameState.slots.find((item) => item.id === gameState.selectedSlotId);
  if (!slot) {
    return;
  }
  slot.nickname = nickname;
  slot.classId = classId;
  syncSelectedSlot();
}

syncSelectedSlot();
