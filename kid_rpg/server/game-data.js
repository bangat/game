const RARITIES = {
    common: { label: '일반', color: '#dbe3f4', power: 1 },
    magic: { label: '고급', color: '#7ad6ff', power: 1.2 },
    rare: { label: '희귀', color: '#8a96ff', power: 1.5 },
    epic: { label: '영웅', color: '#ff8fd0', power: 1.9 },
    legendary: { label: '전설', color: '#ffcb69', power: 2.5 }
};

const CLASSES = {
    warrior: {
        id: 'warrior',
        name: '전사',
        flavor: '칼날을 휘둘러 전선을 밀어내는 근접 딜러',
        color: '#ef8354',
        weaponType: 'sword',
        baseStats: { maxHp: 180, attack: 24, defense: 15, speed: 6.2 },
        starterSkills: ['sword_slash', 'guard_break']
    },
    mage: {
        id: 'mage',
        name: '마법사',
        flavor: '지팡이와 마법진으로 광역 피해를 주는 원거리 딜러',
        color: '#5bc0eb',
        weaponType: 'staff',
        baseStats: { maxHp: 138, attack: 29, defense: 9, speed: 5.9 },
        starterSkills: ['arcane_bolt', 'meteor_burst']
    },
    ranger: {
        id: 'ranger',
        name: '궁수',
        flavor: '빠른 연사와 이동기로 전장을 지배하는 원거리 딜러',
        color: '#9bc53d',
        weaponType: 'bow',
        baseStats: { maxHp: 154, attack: 26, defense: 11, speed: 6.8 },
        starterSkills: ['triple_shot', 'dash_arrow']
    }
};

const SKILLS = {
    sword_slash: {
        id: 'sword_slash',
        name: '칼날 베기',
        classId: 'warrior',
        cooldownMs: 1100,
        range: 4.8,
        radius: 3.2,
        multiplier: 1.45,
        kind: 'melee'
    },
    guard_break: {
        id: 'guard_break',
        name: '가드 브레이크',
        classId: 'warrior',
        cooldownMs: 5200,
        range: 5.5,
        radius: 4.1,
        multiplier: 2.6,
        kind: 'shockwave'
    },
    arcane_bolt: {
        id: 'arcane_bolt',
        name: '아케인 볼트',
        classId: 'mage',
        cooldownMs: 1300,
        range: 12,
        radius: 2.4,
        multiplier: 1.5,
        kind: 'projectile'
    },
    meteor_burst: {
        id: 'meteor_burst',
        name: '메테오 버스트',
        classId: 'mage',
        cooldownMs: 6200,
        range: 13,
        radius: 4.8,
        multiplier: 2.75,
        kind: 'meteor'
    },
    triple_shot: {
        id: 'triple_shot',
        name: '트리플 샷',
        classId: 'ranger',
        cooldownMs: 1200,
        range: 13,
        radius: 2.4,
        multiplier: 1.55,
        kind: 'spread'
    },
    dash_arrow: {
        id: 'dash_arrow',
        name: '대시 애로우',
        classId: 'ranger',
        cooldownMs: 4600,
        range: 14,
        radius: 3.2,
        multiplier: 2.3,
        kind: 'dash'
    }
};

const ITEM_TEMPLATES = {
    bronze_sword: {
        id: 'bronze_sword',
        name: '청동 검',
        slot: 'weapon',
        rarity: 'common',
        statBonus: { attack: 8, defense: 0 },
        power: 16,
        classId: 'warrior'
    },
    novice_staff: {
        id: 'novice_staff',
        name: '수습 마도 지팡이',
        slot: 'weapon',
        rarity: 'common',
        statBonus: { attack: 10, defense: 0 },
        power: 18,
        classId: 'mage'
    },
    hunter_bow: {
        id: 'hunter_bow',
        name: '사냥꾼의 활',
        slot: 'weapon',
        rarity: 'common',
        statBonus: { attack: 9, defense: 0 },
        power: 17,
        classId: 'ranger'
    },
    linen_armor: {
        id: 'linen_armor',
        name: '린넨 갑옷',
        slot: 'armor',
        rarity: 'common',
        statBonus: { attack: 0, defense: 6, maxHp: 18 },
        power: 12
    },
    rookie_ring: {
        id: 'rookie_ring',
        name: '루키 링',
        slot: 'ring',
        rarity: 'magic',
        statBonus: { attack: 3, defense: 2, maxHp: 10 },
        power: 10
    },
    wolf_blade: {
        id: 'wolf_blade',
        name: '은빛 늑대검',
        slot: 'weapon',
        rarity: 'rare',
        statBonus: { attack: 17, defense: 2 },
        power: 32,
        classId: 'warrior'
    },
    ember_staff: {
        id: 'ember_staff',
        name: '잿빛 유성 지팡이',
        slot: 'weapon',
        rarity: 'rare',
        statBonus: { attack: 19, defense: 1 },
        power: 34,
        classId: 'mage'
    },
    gale_bow: {
        id: 'gale_bow',
        name: '질풍의 활',
        slot: 'weapon',
        rarity: 'rare',
        statBonus: { attack: 18, defense: 1 },
        power: 33,
        classId: 'ranger'
    },
    guardian_mail: {
        id: 'guardian_mail',
        name: '수호자의 메일',
        slot: 'armor',
        rarity: 'rare',
        statBonus: { defense: 12, maxHp: 36 },
        power: 26
    },
    starlight_ring: {
        id: 'starlight_ring',
        name: '별빛 반지',
        slot: 'ring',
        rarity: 'epic',
        statBonus: { attack: 7, defense: 5, maxHp: 25 },
        power: 28
    },
    scroll_guard_break: {
        id: 'scroll_guard_break',
        name: '스킬 주문서: 가드 브레이크',
        slot: 'scroll',
        rarity: 'rare',
        unlockSkillId: 'guard_break',
        power: 18,
        classId: 'warrior'
    },
    scroll_meteor_burst: {
        id: 'scroll_meteor_burst',
        name: '스킬 주문서: 메테오 버스트',
        slot: 'scroll',
        rarity: 'rare',
        unlockSkillId: 'meteor_burst',
        power: 18,
        classId: 'mage'
    },
    scroll_dash_arrow: {
        id: 'scroll_dash_arrow',
        name: '스킬 주문서: 대시 애로우',
        slot: 'scroll',
        rarity: 'rare',
        unlockSkillId: 'dash_arrow',
        power: 18,
        classId: 'ranger'
    }
};

const ZONES = {
    village: {
        id: 'village',
        name: '별빛 마을',
        label: '휴식 구역',
        recommendedPower: 0,
        offlineRate: { exp: 0, gold: 0 },
        teleportCost: 0,
        themeColor: '#f7c59f'
    },
    meadow: {
        id: 'meadow',
        name: '햇살 초원',
        label: '초반 사냥터',
        recommendedPower: 70,
        offlineRate: { exp: 34, gold: 18 },
        teleportCost: 0,
        themeColor: '#86ba90'
    },
    canyon: {
        id: 'canyon',
        name: '유성 협곡',
        label: '중급 사냥터',
        recommendedPower: 140,
        offlineRate: { exp: 58, gold: 32 },
        teleportCost: 30,
        themeColor: '#7da1d4'
    },
    shrine: {
        id: 'shrine',
        name: '붉은 제단',
        label: '보스 구역',
        recommendedPower: 210,
        offlineRate: { exp: 74, gold: 45 },
        teleportCost: 65,
        themeColor: '#d95d67'
    }
};

const MONSTERS = {
    slime: {
        id: 'slime',
        name: '젤리 슬라임',
        zoneId: 'meadow',
        level: 1,
        maxHp: 82,
        attack: 10,
        defense: 3,
        exp: 16,
        gold: 10,
        moveSpeed: 2.2,
        scale: 0.9,
        rarity: 'common',
        drops: [
            { itemId: 'linen_armor', chance: 0.05 },
            { itemId: 'rookie_ring', chance: 0.03 }
        ]
    },
    wolf: {
        id: 'wolf',
        name: '바람 늑대',
        zoneId: 'canyon',
        level: 4,
        maxHp: 136,
        attack: 18,
        defense: 7,
        exp: 28,
        gold: 17,
        moveSpeed: 2.8,
        scale: 1.05,
        rarity: 'magic',
        drops: [
            { itemId: 'wolf_blade', chance: 0.05 },
            { itemId: 'gale_bow', chance: 0.05 },
            { itemId: 'guardian_mail', chance: 0.04 }
        ]
    },
    wisp: {
        id: 'wisp',
        name: '유성 위습',
        zoneId: 'canyon',
        level: 5,
        maxHp: 120,
        attack: 22,
        defense: 6,
        exp: 31,
        gold: 19,
        moveSpeed: 2.5,
        scale: 0.88,
        rarity: 'magic',
        drops: [
            { itemId: 'ember_staff', chance: 0.06 },
            { itemId: 'starlight_ring', chance: 0.03 }
        ]
    },
    colossus: {
        id: 'colossus',
        name: '붉은 거신',
        zoneId: 'shrine',
        level: 8,
        maxHp: 480,
        attack: 36,
        defense: 14,
        exp: 135,
        gold: 90,
        moveSpeed: 1.6,
        scale: 1.55,
        rarity: 'boss',
        drops: [
            { itemId: 'wolf_blade', chance: 0.12 },
            { itemId: 'ember_staff', chance: 0.12 },
            { itemId: 'gale_bow', chance: 0.12 },
            { itemId: 'guardian_mail', chance: 0.2 },
            { itemId: 'starlight_ring', chance: 0.15 },
            { itemId: 'scroll_guard_break', chance: 0.18 },
            { itemId: 'scroll_meteor_burst', chance: 0.18 },
            { itemId: 'scroll_dash_arrow', chance: 0.18 }
        ]
    }
};

const QUESTS = [
    {
        id: 'main_1',
        type: 'main',
        name: '마을 밖 첫 임무',
        summary: '햇살 초원에서 젤리 슬라임 5마리를 처치하세요.',
        objective: { kind: 'kill', zoneId: 'meadow', monsterId: 'slime', count: 5 },
        rewards: { exp: 80, gold: 45 }
    },
    {
        id: 'main_2',
        type: 'main',
        name: '협곡 정찰',
        summary: '유성 협곡으로 이동하고 바람 늑대 4마리를 처치하세요.',
        objective: { kind: 'kill', zoneId: 'canyon', monsterId: 'wolf', count: 4 },
        rewards: { exp: 140, gold: 90 }
    },
    {
        id: 'main_3',
        type: 'main',
        name: '붉은 제단 정화',
        summary: '붉은 제단에서 붉은 거신을 쓰러뜨리세요.',
        objective: { kind: 'kill', zoneId: 'shrine', monsterId: 'colossus', count: 1 },
        rewards: { exp: 260, gold: 180 }
    }
];

const DAILY_QUEST = {
    id: 'daily_hunt',
    type: 'daily',
    name: '오늘의 토벌',
    summary: '아무 몬스터나 12마리 처치하세요.',
    objective: { kind: 'kill_any', count: 12 },
    rewards: { exp: 120, gold: 75 }
};

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createInventoryItem(itemId, extra = {}) {
    const template = ITEM_TEMPLATES[itemId];
    return {
        uid: extra.uid || `${itemId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        itemId,
        name: template ? template.name : itemId,
        qty: extra.qty || 1,
        enhance: extra.enhance || 0
    };
}

function getStarterItems(classId) {
    const weaponId = classId === 'mage'
        ? 'novice_staff'
        : classId === 'ranger'
            ? 'hunter_bow'
            : 'bronze_sword';
    return [
        createInventoryItem(weaponId),
        createInventoryItem('linen_armor'),
        createInventoryItem('rookie_ring')
    ];
}

function getQuestById(id) {
    return QUESTS.find((quest) => quest.id === id) || null;
}

function getBaseProfile(userId, nickname = '별빛 모험가') {
    return {
        id: userId,
        nickname,
        classId: null,
        level: 1,
        exp: 0,
        expMax: 100,
        gold: 120,
        baseStats: { maxHp: 150, attack: 22, defense: 10, speed: 6 },
        currentHp: 150,
        powerScore: 52,
        inventory: [],
        equipment: { weapon: null, armor: null, ring: null },
        learnedSkills: [],
        skillBar: [],
        questProgress: {
            activeQuestId: 'main_1',
            completed: [],
            tracker: {}
        },
        dailyQuestProgress: {
            dateKey: '',
            count: 0,
            completed: false
        },
        autoBattleState: {
            enabled: false,
            lastZoneId: 'meadow',
            autoQuest: true
        },
        offlineRewardState: {
            lastLogoutAt: Date.now(),
            pending: null
        },
        audioSettings: {
            bgmEnabled: true,
            sfxEnabled: true
        },
        location: {
            zoneId: 'village',
            x: 0,
            z: 0
        }
    };
}

function expForLevel(level) {
    return 100 + Math.max(0, level - 1) * 45;
}

function computePowerScore(profile) {
    const gearPower = Object.values(profile.equipment || {}).reduce((sum, item) => {
        if (!item) return sum;
        const template = ITEM_TEMPLATES[item.itemId];
        if (!template) return sum;
        return sum + template.power + item.enhance * 8;
    }, 0);
    return Math.round(
        profile.level * 22
        + (profile.baseStats.attack * 2.6)
        + (profile.baseStats.defense * 2.2)
        + (profile.baseStats.maxHp * 0.22)
        + gearPower
    );
}

function syncClassProfile(profile) {
    if (!profile.classId || !CLASSES[profile.classId]) return profile;
    const classData = CLASSES[profile.classId];
    profile.baseStats = deepClone(classData.baseStats);
    if (!profile.inventory || !profile.inventory.length) {
        profile.inventory = getStarterItems(profile.classId);
    }
    if (!profile.learnedSkills || !profile.learnedSkills.length) {
        profile.learnedSkills = classData.starterSkills.slice();
    }
    if (!profile.skillBar || !profile.skillBar.length) {
        profile.skillBar = classData.starterSkills.slice(0, 2);
    }
    if (!profile.equipment.weapon) {
        const starterInventory = getStarterItems(profile.classId);
        profile.equipment.weapon = starterInventory[0];
        profile.equipment.armor = starterInventory[1];
        profile.equipment.ring = starterInventory[2];
        profile.inventory = starterInventory;
    }
    profile.expMax = expForLevel(profile.level);
    profile.currentHp = Math.min(profile.baseStats.maxHp, profile.currentHp || profile.baseStats.maxHp);
    profile.powerScore = computePowerScore(profile);
    return profile;
}

function grantRewards(profile, rewards) {
    profile.gold += rewards.gold || 0;
    profile.exp += rewards.exp || 0;
    let leveled = false;
    while (profile.exp >= profile.expMax) {
        profile.exp -= profile.expMax;
        profile.level += 1;
        profile.expMax = expForLevel(profile.level);
        profile.currentHp = profile.baseStats.maxHp;
        leveled = true;
    }
    profile.powerScore = computePowerScore(profile);
    return leveled;
}

function getSeoulDateKey() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
}

function ensureDailyQuest(profile) {
    const dateKey = getSeoulDateKey();
    if (!profile.dailyQuestProgress || profile.dailyQuestProgress.dateKey !== dateKey) {
        profile.dailyQuestProgress = {
            dateKey,
            count: 0,
            completed: false
        };
    }
}

function getOfflineRewards(profile) {
    ensureDailyQuest(profile);
    const lastLogoutAt = profile.offlineRewardState?.lastLogoutAt || Date.now();
    const now = Date.now();
    const elapsedMs = Math.max(0, now - lastLogoutAt);
    const cappedMs = Math.min(elapsedMs, 1000 * 60 * 60 * 8);
    const minutes = cappedMs / 60000;
    const enabled = !!profile.autoBattleState?.enabled;
    const zoneId = profile.autoBattleState?.lastZoneId || profile.location?.zoneId || 'meadow';
    const zone = ZONES[zoneId] || ZONES.meadow;
    if (!enabled || zone.id === 'village' || minutes < 1) {
        profile.offlineRewardState.pending = null;
        return null;
    }
    const efficiency = Math.max(0.55, Math.min(1.25, profile.powerScore / Math.max(1, zone.recommendedPower)));
    const reward = {
        minutes: Math.floor(minutes),
        exp: Math.round(zone.offlineRate.exp * minutes * efficiency),
        gold: Math.round(zone.offlineRate.gold * minutes * efficiency)
    };
    if (reward.exp <= 0 && reward.gold <= 0) return null;
    grantRewards(profile, reward);
    profile.offlineRewardState.pending = reward;
    return reward;
}

module.exports = {
    RARITIES,
    CLASSES,
    SKILLS,
    ITEM_TEMPLATES,
    ZONES,
    MONSTERS,
    QUESTS,
    DAILY_QUEST,
    createInventoryItem,
    createBaseProfile: getBaseProfile,
    syncClassProfile,
    grantRewards,
    computePowerScore,
    ensureDailyQuest,
    getOfflineRewards,
    getQuestById,
    deepClone
};
