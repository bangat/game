import { activeSkin, applySkinToRoot } from '/client/assets/skins/dark-fantasy/manifest.js';

const refs = {
    app: document.getElementById('app'),
    canvas: document.getElementById('game-canvas'),
    installBtn: document.getElementById('install-btn'),
    orientationGuard: document.getElementById('orientation-guard'),
    introScreen: document.getElementById('intro-screen'),
    classModal: document.getElementById('class-modal'),
    storyModal: document.getElementById('story-modal'),
    offlineModal: document.getElementById('offline-modal'),
    nicknameInput: document.getElementById('nickname-input'),
    startBtn: document.getElementById('start-btn'),
    classGrid: document.getElementById('class-grid'),
    storyZoneLabel: document.getElementById('story-zone-label'),
    storyTitle: document.getElementById('story-title'),
    storyCopy: document.getElementById('story-copy'),
    storyWarpBtn: document.getElementById('story-warp-btn'),
    storyCloseBtn: document.getElementById('story-close-btn'),
    offlineRewardText: document.getElementById('offline-reward-text'),
    offlineCloseBtn: document.getElementById('offline-close-btn'),
    playerAvatar: document.getElementById('player-avatar'),
    zoneLabel: document.getElementById('zone-label'),
    playerName: document.getElementById('player-name'),
    onlineLabel: document.getElementById('online-label'),
    levelLabel: document.getElementById('level-label'),
    powerLabel: document.getElementById('power-label'),
    goldLabel: document.getElementById('gold-label'),
    pointLabel: document.getElementById('point-label'),
    cashLabel: document.getElementById('cash-label'),
    hpBar: document.getElementById('hp-bar'),
    hpLabel: document.getElementById('hp-label'),
    mpBar: document.getElementById('mp-bar'),
    mpLabel: document.getElementById('mp-label'),
    buffStrip: document.getElementById('buff-strip'),
    questCard: document.getElementById('quest-card'),
    questTitle: document.getElementById('quest-title'),
    questDesc: document.getElementById('quest-desc'),
    autoQuestBtn: document.getElementById('auto-quest-btn'),
    teleportBtn: document.getElementById('teleport-btn'),
    menuBtn: document.getElementById('menu-btn'),
    inventoryBtn: document.getElementById('inventory-btn'),
    questBtn: document.getElementById('quest-btn'),
    optionsBtn: document.getElementById('options-btn'),
    combatState: document.getElementById('auto-state-label'),
    targetLabel: document.getElementById('target-label'),
    autoPotionState: document.getElementById('auto-potion-state'),
    autoBuffState: document.getElementById('auto-buff-state'),
    expLabel: document.getElementById('exp-label'),
    expBar: document.getElementById('exp-bar'),
    panelBackdrop: document.getElementById('panel-backdrop'),
    servicePanel: document.getElementById('service-panel'),
    inventoryPanel: document.getElementById('inventory-panel'),
    questPanel: document.getElementById('quest-panel'),
    shopPanel: document.getElementById('shop-panel'),
    mailPanel: document.getElementById('mail-panel'),
    dungeonPanel: document.getElementById('dungeon-panel'),
    optionsPanel: document.getElementById('options-panel'),
    serviceSummary: document.getElementById('service-summary'),
    equipmentList: document.getElementById('equipment-list'),
    inventoryList: document.getElementById('inventory-list'),
    mainQuestDetail: document.getElementById('main-quest-detail'),
    dailyQuestDetail: document.getElementById('daily-quest-detail'),
    shopList: document.getElementById('shop-list'),
    mailList: document.getElementById('mail-list'),
    dungeonList: document.getElementById('dungeon-list'),
    openShopBtn: document.getElementById('open-shop-btn'),
    openMailBtn: document.getElementById('open-mail-btn'),
    openDungeonBtn: document.getElementById('open-dungeon-btn'),
    openStoryBtn: document.getElementById('open-story-btn'),
    enhanceBtn: document.getElementById('enhance-btn'),
    claimMailBtn: document.getElementById('claim-mail-btn'),
    bgmToggle: document.getElementById('bgm-toggle'),
    sfxToggle: document.getElementById('sfx-toggle'),
    joystickZone: document.getElementById('joystick-zone'),
    joystickBase: document.getElementById('joystick-base'),
    joystickKnob: document.getElementById('joystick-knob'),
    quickToggleBtn: document.getElementById('quick-toggle-btn'),
    skill1Btn: document.getElementById('skill-1-btn'),
    skill2Btn: document.getElementById('skill-2-btn'),
    skill3Btn: document.getElementById('skill-3-btn'),
    skill4Btn: document.getElementById('skill-4-btn'),
    autoBtn: document.getElementById('auto-btn'),
    basicAttackBtn: document.getElementById('basic-attack-btn'),
    quickTray: document.getElementById('quick-tray'),
    autoPotionBtn: document.getElementById('auto-potion-btn'),
    autoBuffBtn: document.getElementById('auto-buff-btn'),
    toast: document.getElementById('toast')
};

const STORAGE_KEYS = {
    userId: 'kid_rpg.user_id',
    nickname: 'kid_rpg.nickname'
};

const SHOP_ITEMS = [
    { id: 'hp_bundle', name: 'HP 포션 묶음', desc: '자동물약용 HP 포션 5개', cost: 35, apply(profile) { profile.consumables.hpPotion += 5; } },
    { id: 'mp_bundle', name: 'MP 포션 묶음', desc: '스킬 운용용 MP 포션 4개', cost: 32, apply(profile) { profile.consumables.mpPotion += 4; } },
    { id: 'supply_box', name: '초보 보급 상자', desc: '골드와 포인트를 동시에 확보', cost: 80, apply(profile) { profile.gold += 35; profile.currencies.points += 8; } }
];

const DUNGEON_ENTRIES = [
    { zoneId: 'dungeon', name: '빛바랜 동굴', desc: '중급 파밍 구간. 스킬북과 장비 노리기', unlockLevel: 3 },
    { zoneId: 'shrine', name: '붉은 제단', desc: '보스 전용 성소. 전설 스킬북 드랍', unlockLevel: 6 }
];

const LOCAL_ZONE_OVERRIDES = {
    dungeon: {
        id: 'dungeon',
        name: '빛바랜 동굴',
        label: '중급 던전',
        recommendedPower: 180,
        offlineRate: { exp: 65, gold: 36 },
        teleportCost: 45,
        themeColor: '#7182b5'
    }
};

const LOCAL_MONSTER_OVERRIDES = {
    shade_knight: {
        id: 'shade_knight',
        name: '그림자 기사',
        zoneId: 'dungeon',
        level: 6,
        maxHp: 188,
        attack: 26,
        defense: 9,
        exp: 38,
        gold: 26,
        moveSpeed: 2.45,
        scale: 1.08,
        rarity: 'rare',
        drops: [
            { itemId: 'guardian_mail', chance: 0.06 },
            { itemId: 'scroll_crimson_cross', chance: 0.02 },
            { itemId: 'scroll_frost_nova', chance: 0.02 },
            { itemId: 'scroll_piercing_volley', chance: 0.02 }
        ]
    }
};

const ZONE_LAYOUTS = {
    village: { width: 1760, height: 1040, spawn: { x: 860, y: 600 }, tile: 64, monsters: [], palette: ['#667248', '#728152', '#7d8c5d'], accent: '#c59a6f', props: 'village' },
    meadow: { width: 2140, height: 1360, spawn: { x: 280, y: 1040 }, tile: 56, monsters: [{ id: 'slime', count: 6 }], palette: ['#365236', '#416740', '#4f7a4f'], accent: '#9fbe68', props: 'meadow' },
    canyon: { width: 2200, height: 1380, spawn: { x: 260, y: 1040 }, tile: 58, monsters: [{ id: 'wolf', count: 4 }, { id: 'wisp', count: 2 }], palette: ['#4a3a38', '#574443', '#6a534f'], accent: '#c18b6a', props: 'canyon' },
    shrine: { width: 1860, height: 1180, spawn: { x: 300, y: 870 }, tile: 52, monsters: [{ id: 'colossus', count: 1 }], palette: ['#35232a', '#472930', '#582f36'], accent: '#d95d67', props: 'shrine' },
    dungeon: { width: 1940, height: 1260, spawn: { x: 260, y: 940 }, tile: 54, monsters: [{ id: 'shade_knight', count: 4 }, { id: 'wisp', count: 2 }], palette: ['#232733', '#2d3342', '#384054'], accent: '#8aa6ff', props: 'dungeon' }
};

const TIER_LABELS = { starter: '초급', advanced: '중급', legendary: '전설', buff: '버프' };
const TIER_COLORS = { starter: '#f0f3ff', advanced: '#85d8ff', legendary: '#ffd36b', buff: '#89ffcc' };

const state = {
    ctx: null,
    canvas: { width: window.innerWidth, height: window.innerHeight, dpr: 1 },
    worldData: null,
    profile: null,
    userId: '',
    ws: null,
    peers: [],
    syncDirty: false,
    lastSyncAt: 0,
    lastPresenceAt: 0,
    installPrompt: null,
    pendingOfflineReward: null,
    quickTrayOpen: false,
    startLoading: false,
    toastTimer: 0,
    lastFrame: 0,
    heroInput: { x: 0, y: 0, pointerId: -1 },
    autoMove: { x: 0, y: 0 },
    keyInput: { up: false, down: false, left: false, right: false },
    skillCooldowns: {},
    assets: { images: new Map(), loading: new Map() },
    world: {
        zoneId: 'village',
        width: 1760,
        height: 1040,
        hero: { x: 860, y: 600, radius: 24, facing: 1, swingAt: 0 },
        monsters: [],
        effects: [],
        texts: []
    }
};

const SIDE_PANELS = [
    refs.servicePanel,
    refs.inventoryPanel,
    refs.questPanel,
    refs.shopPanel,
    refs.mailPanel,
    refs.dungeonPanel,
    refs.optionsPanel
];

function boot() {
    state.ctx = refs.canvas.getContext('2d');
    applySkinToRoot(refs.app, activeSkin);
    refs.nicknameInput.value = localStorage.getItem(STORAGE_KEYS.nickname) || '';
    bindEvents();
    resizeCanvas();
    updateOrientationGuard();
    registerPwa();
    renderStaticUi();
    requestAnimationFrame(gameLoop);
}

function bindEvents() {
    refs.startBtn.addEventListener('click', handleStart);
    refs.storyWarpBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.storyFlags.introSeen = true;
        closeOverlay(refs.storyModal);
        teleportToZone('meadow', '초보 사냥터로 워프했습니다.');
    });
    refs.storyCloseBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.storyFlags.introSeen = true;
        closeOverlay(refs.storyModal);
        scheduleSync();
        maybeShowPendingReward();
    });
    refs.offlineCloseBtn.addEventListener('click', () => closeOverlay(refs.offlineModal));
    refs.questCard.addEventListener('click', () => openPanel(refs.questPanel));
    refs.menuBtn.addEventListener('click', () => openPanel(refs.servicePanel));
    refs.inventoryBtn.addEventListener('click', () => openPanel(refs.inventoryPanel));
    refs.questBtn.addEventListener('click', () => openPanel(refs.questPanel));
    refs.optionsBtn.addEventListener('click', () => openPanel(refs.optionsPanel));
    refs.openShopBtn.addEventListener('click', () => openPanel(refs.shopPanel));
    refs.openMailBtn.addEventListener('click', () => openPanel(refs.mailPanel));
    refs.openDungeonBtn.addEventListener('click', () => openPanel(refs.dungeonPanel));
    refs.openStoryBtn.addEventListener('click', () => {
        updateStoryCopy();
        openOverlay(refs.storyModal);
    });
    refs.autoBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.autoBattleState.enabled = !state.profile.autoBattleState.enabled;
        showToast(state.profile.autoBattleState.enabled ? '자동 사냥 시작' : '자동 사냥 종료');
        scheduleSync();
        renderDynamicUi();
    });
    refs.autoQuestBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!state.profile) return;
        state.profile.autoBattleState.autoQuest = !state.profile.autoBattleState.autoQuest;
        showToast(state.profile.autoBattleState.autoQuest ? '자동 퀘스트 추적 활성화' : '자동 퀘스트 추적 해제');
        scheduleSync();
        renderDynamicUi();
    });
    refs.teleportBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        teleportToQuestZone();
    });
    refs.quickToggleBtn.addEventListener('click', () => {
        state.quickTrayOpen = !state.quickTrayOpen;
        refs.quickTray.classList.toggle('hidden', !state.quickTrayOpen);
    });
    refs.basicAttackBtn.addEventListener('click', () => basicAttack(true));
    refs.skill1Btn.addEventListener('click', () => castSkillBySlot(0));
    refs.skill2Btn.addEventListener('click', () => castSkillBySlot(1));
    refs.skill3Btn.addEventListener('click', () => castSkillBySlot(2));
    refs.skill4Btn.addEventListener('click', () => castSkillBySlot(3));
    refs.autoPotionBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.quickToggles.autoPotion = !state.profile.quickToggles.autoPotion;
        showToast(`자동물약 ${state.profile.quickToggles.autoPotion ? '활성화' : '비활성화'}`);
        scheduleSync();
        renderDynamicUi();
    });
    refs.autoBuffBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.quickToggles.autoBuff = !state.profile.quickToggles.autoBuff;
        showToast(`자동버프 ${state.profile.quickToggles.autoBuff ? '활성화' : '비활성화'}`);
        scheduleSync();
        renderDynamicUi();
    });
    refs.panelBackdrop.addEventListener('click', closePanels);
    refs.enhanceBtn.addEventListener('click', enhanceWeapon);
    refs.claimMailBtn.addEventListener('click', claimAllMail);
    refs.bgmToggle.addEventListener('change', () => {
        if (!state.profile) return;
        state.profile.audioSettings.bgmEnabled = refs.bgmToggle.checked;
        scheduleSync();
    });
    refs.sfxToggle.addEventListener('change', () => {
        if (!state.profile) return;
        state.profile.audioSettings.sfxEnabled = refs.sfxToggle.checked;
        scheduleSync();
    });
    refs.classGrid.addEventListener('click', (event) => {
        const button = event.target.closest('.class-item');
        if (!button || !state.profile) return;
        chooseClass(button.dataset.classId);
    });
    refs.inventoryPanel.addEventListener('click', handleInventoryPanelClick);
    refs.shopPanel.addEventListener('click', handleShopPanelClick);
    refs.mailPanel.addEventListener('click', handleMailPanelClick);
    refs.dungeonPanel.addEventListener('click', handleDungeonPanelClick);
    document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', closePanels));
    refs.joystickZone.addEventListener('pointerdown', startJoystick);
    refs.joystickZone.addEventListener('pointermove', moveJoystick);
    refs.joystickZone.addEventListener('pointerup', resetJoystick);
    refs.joystickZone.addEventListener('pointercancel', resetJoystick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', () => {
        resizeCanvas();
        updateOrientationGuard();
    });
    window.addEventListener('blur', resetJoystick);
    window.addEventListener('beforeunload', () => flushProfileSync(true));
}

function registerPwa() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        state.installPrompt = event;
        refs.installBtn.classList.remove('hidden');
    });
    refs.installBtn.addEventListener('click', async () => {
        if (!state.installPrompt) return;
        state.installPrompt.prompt();
        await state.installPrompt.userChoice.catch(() => null);
        state.installPrompt = null;
        refs.installBtn.classList.add('hidden');
    });
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
}

async function handleStart() {
    if (state.startLoading) return;
    state.startLoading = true;
    refs.startBtn.disabled = true;
    refs.startBtn.textContent = '불러오는 중...';

    try {
        const nickname = refs.nicknameInput.value.trim() || '별빛 모험가';
        localStorage.setItem(STORAGE_KEYS.nickname, nickname);
        state.userId = localStorage.getItem(STORAGE_KEYS.userId) || createUserId();
        localStorage.setItem(STORAGE_KEYS.userId, state.userId);

        const bootstrap = await fetchBootstrap(state.userId, nickname);
        state.worldData = ensureWorldData(bootstrap.world);
        await preloadSkinAssets();
        state.profile = normalizeProfile(bootstrap.profile, nickname);
        ensureMailboxSeed();
        connectSocket();
        renderClassGrid();
        closeOverlay(refs.introScreen);

        if (!state.profile.classId) {
            openOverlay(refs.classModal);
        } else {
            closeOverlay(refs.classModal);
            startSession();
        }

        if (bootstrap.offlineReward) {
            state.pendingOfflineReward = bootstrap.offlineReward;
            maybeShowPendingReward();
        }
    } catch (error) {
        console.error(error);
        showToast('시작 중 오류가 발생했습니다.');
        openOverlay(refs.introScreen);
    } finally {
        refs.startBtn.disabled = false;
        refs.startBtn.textContent = '게임 시작';
        state.startLoading = false;
    }
}

async function fetchBootstrap(userId, nickname) {
    const params = new URLSearchParams({ userId, nickname });
    const response = await fetch(`/api/bootstrap?${params.toString()}`);
    if (!response.ok) throw new Error(`bootstrap failed: ${response.status}`);
    return response.json();
}

function ensureWorldData(world) {
    const next = clone(world || {});
    next.zones = { ...(next.zones || {}), ...LOCAL_ZONE_OVERRIDES };
    next.monsters = { ...(next.monsters || {}), ...LOCAL_MONSTER_OVERRIDES };
    const starterSkills = new Set();
    Object.values(next.classes || {}).forEach((classData) => {
        (classData.starterSkills || []).forEach((skillId) => starterSkills.add(skillId));
    });
    Object.values(next.skills || {}).forEach((skill) => {
        if (!skill.tier) skill.tier = starterSkills.has(skill.id) ? 'starter' : skill.kind === 'buff' ? 'buff' : 'advanced';
    });
    return next;
}

function normalizeProfile(profile, nickname) {
    const base = {
        ...clone(profile),
        nickname: nickname || profile.nickname || '별빛 모험가',
        gold: Number(profile.gold ?? 120),
        level: Number(profile.level ?? 1),
        exp: Number(profile.exp ?? 0),
        expMax: Number(profile.expMax ?? 100),
        currentHp: Number(profile.currentHp ?? 150),
        currentMp: Number(profile.currentMp ?? 100),
        inventory: Array.isArray(profile.inventory) ? profile.inventory.slice() : [],
        equipment: { weapon: null, armor: null, ring: null, ...(profile.equipment || {}) },
        learnedSkills: Array.isArray(profile.learnedSkills) ? profile.learnedSkills.slice() : [],
        skillBar: Array.isArray(profile.skillBar) ? profile.skillBar.slice(0, 4) : [],
        questProgress: {
            activeQuestId: profile.questProgress?.activeQuestId || 'main_1',
            completed: Array.isArray(profile.questProgress?.completed) ? profile.questProgress.completed.slice() : [],
            tracker: { ...(profile.questProgress?.tracker || {}) }
        },
        dailyQuestProgress: {
            dateKey: profile.dailyQuestProgress?.dateKey || '',
            count: Number(profile.dailyQuestProgress?.count || 0),
            completed: !!profile.dailyQuestProgress?.completed
        },
        currencies: { points: Number(profile.currencies?.points || 0), cash: Number(profile.currencies?.cash || 0) },
        autoBattleState: {
            enabled: !!profile.autoBattleState?.enabled,
            lastZoneId: profile.autoBattleState?.lastZoneId || 'meadow',
            autoQuest: profile.autoBattleState?.autoQuest !== false
        },
        quickToggles: { autoPotion: profile.quickToggles?.autoPotion !== false, autoBuff: !!profile.quickToggles?.autoBuff },
        consumables: { hpPotion: Number(profile.consumables?.hpPotion || 5), mpPotion: Number(profile.consumables?.mpPotion || 3) },
        storyFlags: { introSeen: !!profile.storyFlags?.introSeen, meadowWarpHintSeen: !!profile.storyFlags?.meadowWarpHintSeen },
        audioSettings: { bgmEnabled: profile.audioSettings?.bgmEnabled !== false, sfxEnabled: profile.audioSettings?.sfxEnabled !== false },
        mailbox: Array.isArray(profile.mailbox) ? profile.mailbox.slice() : [],
        activeBuffs: { ...(profile.activeBuffs || {}) },
        location: { zoneId: profile.location?.zoneId || 'village', x: Number(profile.location?.x || 0), z: Number(profile.location?.z || 0) }
    };

    if (base.classId && getClassData(base.classId)) applyClassDefaults(base);
    recomputeProfile(base, { refill: !profile.classId });
    return base;
}

function applyClassDefaults(profile) {
    const classData = getClassData(profile.classId);
    if (!classData) return;
    profile.baseStats = clone(classData.baseStats);
    if (!profile.inventory.length) profile.inventory = getStarterItems(profile.classId);
    if (!profile.equipment.weapon) {
        const starter = getStarterItems(profile.classId);
        profile.equipment.weapon = clone(starter[0]);
        profile.equipment.armor = clone(starter[1]);
        profile.equipment.ring = clone(starter[2]);
        profile.inventory = starter;
    }
    if (!profile.learnedSkills.length) profile.learnedSkills = (classData.starterSkills || []).slice();
    applyLevelUnlocks(profile);
    syncSkillBar(profile);
}

function applyLevelUnlocks(profile) {
    const classData = getClassData(profile.classId);
    if (!classData?.levelUnlocks) return;
    classData.levelUnlocks.forEach((unlock) => {
        if (profile.level < unlock.level || profile.learnedSkills.includes(unlock.skillId)) return;
        profile.learnedSkills.push(unlock.skillId);
        showToast(`${getSkillData(unlock.skillId)?.name || '새 스킬'} 해금`);
    });
}

function syncSkillBar(profile) {
    const starters = [];
    const advanced = [];
    const legendary = [];
    const buffs = [];
    profile.learnedSkills.forEach((skillId) => {
        const skill = getSkillData(skillId);
        if (!skill) return;
        if (skill.tier === 'buff') buffs.push(skillId);
        else if (skill.tier === 'legendary') legendary.push(skillId);
        else if (skill.tier === 'advanced') advanced.push(skillId);
        else starters.push(skillId);
    });
    profile.skillBar = [starters[0] || '', advanced[0] || '', legendary[0] || '', buffs[0] || ''];
}

function recomputeProfile(profile, options = {}) {
    if (!profile.baseStats) profile.baseStats = { maxHp: 150, attack: 22, defense: 10, speed: 6 };
    const previousHpRatio = profile.derivedStats?.maxHp ? profile.currentHp / profile.derivedStats.maxHp : 1;
    const previousMpRatio = profile.derivedStats?.maxMp ? profile.currentMp / profile.derivedStats.maxMp : 1;
    const buffBonus = getActiveBuffBonus(profile);
    const equipmentBonus = { maxHp: 0, attack: 0, defense: 0 };

    Object.values(profile.equipment || {}).forEach((item) => {
        if (!item) return;
        const template = getItemTemplate(item.itemId);
        if (!template?.statBonus) return;
        equipmentBonus.maxHp += Number(template.statBonus.maxHp || 0) + (item.enhance || 0) * 4;
        equipmentBonus.attack += Number(template.statBonus.attack || 0) + (item.enhance || 0) * 2;
        equipmentBonus.defense += Number(template.statBonus.defense || 0) + (item.enhance || 0);
    });

    profile.expMax = expForLevel(profile.level);
    profile.derivedStats = {
        maxHp: profile.baseStats.maxHp + equipmentBonus.maxHp + buffBonus.maxHp,
        maxMp: 92 + profile.level * 9,
        attack: profile.baseStats.attack + equipmentBonus.attack + buffBonus.attack,
        defense: profile.baseStats.defense + equipmentBonus.defense + buffBonus.defense,
        speed: profile.baseStats.speed + buffBonus.speed
    };

    profile.currentHp = options.refill
        ? profile.derivedStats.maxHp
        : clamp(Math.round(profile.derivedStats.maxHp * clamp(previousHpRatio || 1, 0.05, 1)), 1, profile.derivedStats.maxHp);
    profile.currentMp = options.refill
        ? profile.derivedStats.maxMp
        : clamp(Math.round(profile.derivedStats.maxMp * clamp(previousMpRatio || 1, 0.05, 1)), 0, profile.derivedStats.maxMp);
    profile.powerScore = computePower(profile);
}

function getActiveBuffBonus(profile) {
    const now = performance.now();
    const bonus = { maxHp: 0, attack: 0, defense: 0, speed: 0 };
    Object.entries(profile.activeBuffs || {}).forEach(([skillId, buff]) => {
        if (!buff || buff.expiresAt <= now) {
            delete profile.activeBuffs[skillId];
            return;
        }
        const skill = getSkillData(skillId);
        if (!skill?.buffBonus) return;
        bonus.maxHp += Number(skill.buffBonus.maxHp || 0);
        bonus.attack += Number(skill.buffBonus.attack || 0);
        bonus.defense += Number(skill.buffBonus.defense || 0);
        bonus.speed += Number(skill.buffBonus.speed || 0);
    });
    return bonus;
}

function computePower(profile) {
    const gearPower = Object.values(profile.equipment || {}).reduce((sum, item) => {
        if (!item) return sum;
        const template = getItemTemplate(item.itemId);
        if (!template) return sum;
        return sum + Number(template.power || 0) + (item.enhance || 0) * 8;
    }, 0);
    return Math.round(profile.level * 22 + profile.derivedStats.attack * 2.55 + profile.derivedStats.defense * 2.1 + profile.derivedStats.maxHp * 0.21 + gearPower);
}

function getStarterItems(classId) {
    const weaponId = classId === 'mage' ? 'novice_staff' : classId === 'ranger' ? 'hunter_bow' : 'bronze_sword';
    return [createInventoryItem(weaponId), createInventoryItem('linen_armor'), createInventoryItem('rookie_ring')];
}

function createInventoryItem(itemId, extra = {}) {
    return { uid: extra.uid || `${itemId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`, itemId, qty: extra.qty || 1, enhance: extra.enhance || 0 };
}

function ensureMailboxSeed() {
    if (!state.profile || state.profile.mailbox.length) return;
    state.profile.mailbox.push(
        { id: 'welcome_pack', title: '길드 지원품', body: '초반 진행용 포션과 포인트를 지급합니다.', rewards: { hpPotion: 3, mpPotion: 2, points: 6, gold: 40 } },
        { id: 'field_order', title: '초보 사냥터 지령', body: '마을에서 시작한 뒤 햇살 초원으로 이동하세요.', rewards: { gold: 30 } }
    );
}

function startSession() {
    if (!state.profile) return;
    refs.playerAvatar.dataset.class = state.profile.classId;
    refs.bgmToggle.checked = state.profile.audioSettings.bgmEnabled;
    refs.sfxToggle.checked = state.profile.audioSettings.sfxEnabled;
    enterZone(state.profile.location.zoneId || 'village', { silent: true });
    renderDynamicUi();
    updateStoryCopy();
    if (!state.profile.storyFlags.introSeen) openOverlay(refs.storyModal);
    else maybeShowPendingReward();
}

function chooseClass(classId) {
    const classData = getClassData(classId);
    if (!classData || !state.profile) return;
    state.profile.classId = classId;
    state.profile.level = 1;
    state.profile.exp = 0;
    state.profile.expMax = expForLevel(1);
    state.profile.location = { zoneId: 'village', x: 0, z: 0 };
    state.profile.questProgress = { activeQuestId: 'main_1', completed: [], tracker: {} };
    state.profile.dailyQuestProgress = { dateKey: '', count: 0, completed: false };
    state.profile.inventory = [];
    state.profile.equipment = { weapon: null, armor: null, ring: null };
    state.profile.learnedSkills = [];
    state.profile.skillBar = [];
    state.profile.autoBattleState = { enabled: false, lastZoneId: 'meadow', autoQuest: true };
    state.profile.quickToggles = { autoPotion: true, autoBuff: false };
    state.profile.storyFlags = { introSeen: false, meadowWarpHintSeen: false };
    state.profile.activeBuffs = {};
    state.skillCooldowns = {};
    applyClassDefaults(state.profile);
    recomputeProfile(state.profile, { refill: true });
    refs.playerAvatar.dataset.class = classId;
    closeOverlay(refs.classModal);
    startSession();
    scheduleSync(true);
    showToast(`${classData.name}로 입장했습니다.`);
}

function enterZone(zoneId, options = {}) {
    const layout = getZoneLayout(zoneId);
    const zone = getZoneData(zoneId);
    state.world.zoneId = zoneId;
    state.world.width = layout.width;
    state.world.height = layout.height;
    state.world.hero.x = layout.spawn.x;
    state.world.hero.y = layout.spawn.y;
    state.world.hero.facing = 1;
    state.world.monsters = buildZoneMonsters(zoneId);
    refs.app.dataset.zone = zoneId;

    if (state.profile) {
        state.profile.location.zoneId = zoneId;
        state.profile.location.x = layout.spawn.x;
        state.profile.location.z = layout.spawn.y;
        if (zoneId !== 'village') state.profile.autoBattleState.lastZoneId = zoneId;
        scheduleSync(options.silent !== true);
    }

    renderDynamicUi();
    if (!options.silent) showToast(`${zone.name} 입장`);
}

function buildZoneMonsters(zoneId) {
    const layout = getZoneLayout(zoneId);
    const monsters = [];
    layout.monsters.forEach((group) => {
        for (let index = 0; index < group.count; index += 1) {
            monsters.push(createMonster(
                group.id,
                220 + Math.random() * (layout.width - 440),
                180 + Math.random() * (layout.height - 360)
            ));
        }
    });
    return monsters;
}

function createMonster(monsterId, x, y) {
    const template = getMonsterData(monsterId);
    return {
        id: `${monsterId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        monsterId,
        x,
        y,
        homeX: x,
        homeY: y,
        hp: template.maxHp,
        maxHp: template.maxHp,
        attackAt: 0,
        deadAt: 0,
        wanderAngle: Math.random() * Math.PI * 2
    };
}

function teleportToZone(zoneId, sourceText = '') {
    if (!state.profile || !getZoneData(zoneId)) return;
    closePanels();
    enterZone(zoneId);
    if (sourceText) showToast(sourceText);
}

function teleportToQuestZone() {
    const quest = getMainQuest();
    const zoneId = quest?.objective?.zoneId || state.profile?.autoBattleState?.lastZoneId || 'meadow';
    if (zoneId) teleportToZone(zoneId, '퀘스트 목표 지점으로 이동했습니다.');
}

function updateStoryCopy() {
    if (!state.profile) return;
    const quest = getMainQuest();
    const targetZone = getZoneData(quest?.objective?.zoneId || 'meadow');
    refs.storyZoneLabel.textContent = `${getZoneData(state.world.zoneId).name} 이야기`;
    refs.storyTitle.textContent = '원정대 첫 출정';
    refs.storyCopy.textContent = [
        `${state.profile.nickname} 님, 별빛 마을에서 기본 장비를 정비했습니다.`,
        `이제 ${targetZone.name}로 나가 ${quest?.summary || '첫 임무를 진행'}하세요.`,
        'UI는 작게 유지하고, 전투면을 비우는 방향으로 다시 짠 2D 초안입니다.'
    ].join(' ');
}

function maybeShowPendingReward() {
    if (!state.pendingOfflineReward) return;
    if (isOverlayOpen(refs.storyModal) || isOverlayOpen(refs.classModal)) return;
    refs.offlineRewardText.innerHTML = [
        `<div>누적 시간: ${state.pendingOfflineReward.minutes}분</div>`,
        `<div>EXP +${formatNumber(state.pendingOfflineReward.exp)}</div>`,
        `<div>골드 +${formatNumber(state.pendingOfflineReward.gold)}</div>`
    ].join('');
    openOverlay(refs.offlineModal);
    state.pendingOfflineReward = null;
}

function renderClassGrid() {
    if (!state.worldData) return;
    refs.classGrid.innerHTML = Object.values(state.worldData.classes).map((classData) => `
        <button class="class-item" type="button" data-class-id="${classData.id}">
            <span class="eyebrow">Class</span>
            <strong>${classData.name}</strong>
            <p>${classData.flavor}</p>
        </button>
    `).join('');
}

function renderStaticUi() {
    refs.quickTray.classList.add('hidden');
    renderDynamicUi();
}

function renderDynamicUi() {
    if (!state.profile || !state.worldData) return;

    const profile = state.profile;
    const zone = getZoneData(state.world.zoneId);
    const quest = getMainQuest();
    const target = findNearestMonster(240);
    const zoneOnline = state.peers.filter((peer) => peer.zoneId === state.world.zoneId).length + 1;
    const hpRate = clamp(profile.currentHp / Math.max(profile.derivedStats.maxHp, 1), 0, 1);
    const mpRate = clamp(profile.currentMp / Math.max(profile.derivedStats.maxMp, 1), 0, 1);
    const expRate = clamp(profile.exp / Math.max(profile.expMax, 1), 0, 1);
    const trackerValue = quest ? Number(profile.questProgress.tracker[quest.id] || 0) : 0;

    refs.playerAvatar.dataset.class = profile.classId || 'warrior';
    refs.zoneLabel.textContent = `${zone.name} · ${zone.label}`;
    refs.playerName.textContent = profile.nickname;
    refs.onlineLabel.textContent = `온라인 ${zoneOnline}명`;
    refs.levelLabel.textContent = formatNumber(profile.level);
    refs.powerLabel.textContent = formatNumber(profile.powerScore);
    refs.goldLabel.textContent = formatNumber(profile.gold);
    refs.pointLabel.textContent = formatNumber(profile.currencies.points);
    refs.cashLabel.textContent = formatNumber(profile.currencies.cash);
    refs.hpBar.style.width = `${hpRate * 100}%`;
    refs.mpBar.style.width = `${mpRate * 100}%`;
    refs.expBar.style.width = `${expRate * 100}%`;
    refs.hpLabel.textContent = `${formatNumber(profile.currentHp)} / ${formatNumber(profile.derivedStats.maxHp)}`;
    refs.mpLabel.textContent = `${formatNumber(profile.currentMp)} / ${formatNumber(profile.derivedStats.maxMp)}`;
    refs.expLabel.textContent = `${formatNumber(profile.exp)} / ${formatNumber(profile.expMax)} EXP`;
    refs.combatState.textContent = profile.autoBattleState.enabled
        ? (profile.autoBattleState.autoQuest ? '자동 퀘스트 추적' : '자동 사냥')
        : '수동 조작';
    refs.targetLabel.textContent = target ? `${getMonsterData(target.monsterId).name} 타겟` : (zone.id === 'village' ? '안전 구역' : '대상 탐색 중');
    refs.autoBtn.textContent = profile.autoBattleState.enabled ? 'AUTO ON' : 'AUTO';
    refs.autoQuestBtn.textContent = profile.autoBattleState.autoQuest ? 'AUTO ON' : 'AUTO';
    refs.autoPotionState.textContent = `AUTO POT ${profile.quickToggles.autoPotion ? 'ON' : 'OFF'} · HP ${profile.consumables.hpPotion}`;
    refs.autoBuffState.textContent = `AUTO BUFF ${profile.quickToggles.autoBuff ? 'ON' : 'OFF'}`;
    refs.autoPotionState.classList.toggle('active', profile.quickToggles.autoPotion);
    refs.autoBuffState.classList.toggle('active', profile.quickToggles.autoBuff);
    refs.questTitle.textContent = quest ? quest.name : '메인 퀘스트 완료';
    refs.questDesc.textContent = quest
        ? `${quest.summary} (${trackerValue}/${quest.objective.count})`
        : '추가 챕터와 이벤트를 이어붙일 수 있는 상태입니다.';

    renderBuffStrip();
    renderSkillButtons();
    renderServiceSummary();
    renderQuestPanel();
    renderInventoryPanel();
    renderShopPanel();
    renderMailPanel();
    renderDungeonPanel();
}

function renderBuffStrip() {
    const entries = Object.entries(state.profile.activeBuffs || {}).filter(([, buff]) => buff.expiresAt > performance.now());
    refs.buffStrip.innerHTML = entries.length
        ? entries.map(([skillId, buff]) => {
            const skill = getSkillData(skillId);
            const remain = Math.max(0, Math.ceil((buff.expiresAt - performance.now()) / 1000));
            return `<span class="buff-pill active">${skill?.name || '버프'} ${remain}s</span>`;
        }).join('')
        : '<span class="buff-pill">버프 없음</span>';
}

function renderSkillButtons() {
    [refs.skill1Btn, refs.skill2Btn, refs.skill3Btn, refs.skill4Btn].forEach((button, index) => {
        const skillId = state.profile.skillBar[index];
        const skill = getSkillData(skillId);
        if (!skill) {
            button.textContent = index === 0 ? '기본 스킬' : index === 1 ? '중급 스킬' : index === 2 ? '전설 스킬' : '버프 스킬';
            button.classList.remove('accent');
            button.style.borderColor = '';
            return;
        }
        const cooldown = Math.max(0, (state.skillCooldowns[skillId] || 0) - performance.now());
        const tier = skill.tier || 'starter';
        button.textContent = cooldown > 0
            ? `${skill.name}\n${(cooldown / 1000).toFixed(1)}s`
            : `${skill.name}\n${TIER_LABELS[tier] || '스킬'}`;
        button.style.borderColor = `${TIER_COLORS[tier] || '#ffffff'}55`;
        button.classList.toggle('accent', tier === 'legendary');
    });

    refs.autoPotionBtn.textContent = `자동물약\n${state.profile.quickToggles.autoPotion ? 'ON' : 'OFF'}`;
    refs.autoBuffBtn.textContent = `자동버프\n${state.profile.quickToggles.autoBuff ? 'ON' : 'OFF'}`;
    refs.autoPotionBtn.classList.toggle('active', state.profile.quickToggles.autoPotion);
    refs.autoBuffBtn.classList.toggle('active', state.profile.quickToggles.autoBuff);
}

function renderServiceSummary() {
    const quest = getMainQuest();
    refs.serviceSummary.innerHTML = [
        `<div>현재 지역: ${getZoneData(state.world.zoneId).name}</div>`,
        `<div>전투력: ${formatNumber(state.profile.powerScore)} / 권장 ${formatNumber(getZoneData(state.world.zoneId).recommendedPower || 0)}</div>`,
        `<div>메인 퀘스트: ${quest ? quest.name : '완료'}</div>`,
        `<div>자동물약 ${state.profile.quickToggles.autoPotion ? 'ON' : 'OFF'} · 자동버프 ${state.profile.quickToggles.autoBuff ? 'ON' : 'OFF'}</div>`
    ].join('');
}

function renderQuestPanel() {
    const quest = getMainQuest();
    const daily = state.worldData.dailyQuest;
    const questCount = quest ? Number(state.profile.questProgress.tracker[quest.id] || 0) : 0;

    refs.mainQuestDetail.innerHTML = quest
        ? `
            <strong>${quest.name}</strong>
            <div>${quest.summary}</div>
            <div>진행도 ${questCount} / ${quest.objective.count}</div>
            <div>보상 EXP ${quest.rewards.exp} / 골드 ${quest.rewards.gold}</div>
        `
        : '<div>메인 퀘스트가 모두 완료된 상태입니다.</div>';

    refs.dailyQuestDetail.innerHTML = `
        <strong>${daily.name}</strong>
        <div>${daily.summary}</div>
        <div>진행도 ${state.profile.dailyQuestProgress.count} / ${daily.objective.count}</div>
        <div>보상 EXP ${daily.rewards.exp} / 골드 ${daily.rewards.gold}</div>
    `;
}

function renderInventoryPanel() {
    const slots = ['weapon', 'armor', 'ring'];
    refs.equipmentList.innerHTML = slots.map((slot) => {
        const item = state.profile.equipment[slot];
        const template = item ? getItemTemplate(item.itemId) : null;
        return `
            <article class="item-card">
                <header><strong>${slot.toUpperCase()}</strong></header>
                ${template ? `<div>${template.name}${item.enhance ? ` +${item.enhance}` : ''}</div><div class="meta">${describeItem(template)}</div>` : '<div class="meta">비어 있음</div>'}
            </article>
        `;
    }).join('');

    refs.inventoryList.innerHTML = state.profile.inventory.length
        ? state.profile.inventory.map((item) => {
            const template = getItemTemplate(item.itemId);
            const rarity = getRarity(template?.rarity);
            const action = template?.slot === 'scroll' ? 'use' : template?.slot ? 'equip' : '';
            const actionLabel = action === 'use' ? '사용' : action === 'equip' ? '장착' : '';
            return `
                <article class="item-card">
                    <header><strong>${template?.name || item.itemId}${item.enhance ? ` +${item.enhance}` : ''}</strong></header>
                    <div class="meta">${rarity.label} · ${template?.slot || '기타'} · ${describeItem(template)}</div>
                    ${action ? `<div class="actions"><button type="button" data-action="${action}" data-uid="${item.uid}">${actionLabel}</button></div>` : ''}
                </article>
            `;
        }).join('')
        : '<div class="tiny">가방이 비었습니다.</div>';
}

function renderShopPanel() {
    refs.shopList.innerHTML = SHOP_ITEMS.map((item) => `
        <article class="item-card">
            <header><strong>${item.name}</strong></header>
            <div class="meta">${item.desc}</div>
            <div class="actions"><button type="button" data-buy-id="${item.id}">구매 (${item.cost}G)</button></div>
        </article>
    `).join('');
}

function renderMailPanel() {
    refs.mailList.innerHTML = state.profile.mailbox.length
        ? state.profile.mailbox.map((mail) => `
            <article class="item-card">
                <header><strong>${mail.title}</strong></header>
                <div class="meta">${mail.body}</div>
                <div class="actions"><button type="button" data-mail-id="${mail.id}">수령</button></div>
            </article>
        `).join('')
        : '<div class="tiny">우편함이 비었습니다.</div>';
}

function renderDungeonPanel() {
    refs.dungeonList.innerHTML = DUNGEON_ENTRIES.map((entry) => {
        const locked = state.profile.level < entry.unlockLevel;
        return `
            <article class="item-card">
                <header><strong>${entry.name}</strong></header>
                <div class="meta">${entry.desc}</div>
                <div class="meta">입장 레벨 ${entry.unlockLevel}</div>
                <div class="actions">
                    <button type="button" data-dungeon-zone="${entry.zoneId}" ${locked ? 'disabled' : ''}>${locked ? '잠금' : '입장'}</button>
                </div>
            </article>
        `;
    }).join('');
}

function handleInventoryPanelClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const item = state.profile.inventory.find((entry) => entry.uid === button.dataset.uid);
    if (!item) return;
    if (button.dataset.action === 'equip') {
        equipItem(item);
        return;
    }
    if (button.dataset.action === 'use') {
        useScrollItem(item);
    }
}

function handleShopPanelClick(event) {
    const button = event.target.closest('button[data-buy-id]');
    if (!button) return;
    const shopItem = SHOP_ITEMS.find((item) => item.id === button.dataset.buyId);
    if (!shopItem) return;
    if (state.profile.gold < shopItem.cost) {
        showToast('골드가 부족합니다.');
        return;
    }
    state.profile.gold -= shopItem.cost;
    shopItem.apply(state.profile);
    scheduleSync();
    renderDynamicUi();
    showToast(`${shopItem.name} 구매`);
}

function handleMailPanelClick(event) {
    const button = event.target.closest('button[data-mail-id]');
    if (button) claimMail(button.dataset.mailId);
}

function handleDungeonPanelClick(event) {
    const button = event.target.closest('button[data-dungeon-zone]');
    if (!button) return;
    const zoneId = button.dataset.dungeonZone;
    teleportToZone(zoneId, `${getZoneData(zoneId).name}으로 이동했습니다.`);
    closePanels();
}

function equipItem(item) {
    const template = getItemTemplate(item.itemId);
    if (!template?.slot || template.slot === 'scroll') return;
    state.profile.equipment[template.slot] = item;
    recomputeProfile(state.profile);
    scheduleSync();
    renderDynamicUi();
    showToast(`${template.name} 장착`);
}

function useScrollItem(item) {
    const template = getItemTemplate(item.itemId);
    if (!template?.unlockSkillId) return;
    if (state.profile.learnedSkills.includes(template.unlockSkillId)) {
        showToast('이미 배운 스킬입니다.');
        return;
    }
    state.profile.learnedSkills.push(template.unlockSkillId);
    syncSkillBar(state.profile);
    removeInventoryItem(item.uid);
    scheduleSync();
    renderDynamicUi();
    showToast(`${getSkillData(template.unlockSkillId)?.name || '스킬'} 해금`);
}

function removeInventoryItem(uid) {
    state.profile.inventory = state.profile.inventory.filter((item) => item.uid !== uid);
}

function enhanceWeapon() {
    const weapon = state.profile.equipment.weapon;
    if (!weapon) {
        showToast('강화할 무기가 없습니다.');
        return;
    }
    const cost = 70 + (weapon.enhance || 0) * 45;
    if (state.profile.gold < cost) {
        showToast('강화 골드가 부족합니다.');
        return;
    }
    state.profile.gold -= cost;
    weapon.enhance = Number(weapon.enhance || 0) + 1;
    recomputeProfile(state.profile);
    scheduleSync();
    renderDynamicUi();
    showToast(`무기 강화 +${weapon.enhance}`);
}

function claimMail(mailId) {
    const index = state.profile.mailbox.findIndex((mail) => mail.id === mailId);
    if (index < 0) return;
    const [mail] = state.profile.mailbox.splice(index, 1);
    applyRewardBundle(mail.rewards);
    scheduleSync();
    renderDynamicUi();
    showToast(`${mail.title} 수령`);
}

function claimAllMail() {
    if (!state.profile.mailbox.length) {
        showToast('수령할 우편이 없습니다.');
        return;
    }
    const mails = state.profile.mailbox.splice(0);
    mails.forEach((mail) => applyRewardBundle(mail.rewards));
    scheduleSync();
    renderDynamicUi();
    showToast('우편 전체 수령');
}

function applyRewardBundle(rewards = {}) {
    state.profile.gold += Number(rewards.gold || 0);
    state.profile.currencies.points += Number(rewards.points || 0);
    state.profile.currencies.cash += Number(rewards.cash || 0);
    state.profile.consumables.hpPotion += Number(rewards.hpPotion || 0);
    state.profile.consumables.mpPotion += Number(rewards.mpPotion || 0);
}

function openPanel(panel) {
    SIDE_PANELS.forEach((entry) => entry.classList.add('hidden'));
    refs.panelBackdrop.classList.remove('hidden');
    panel.classList.remove('hidden');
    renderDynamicUi();
}

function closePanels() {
    refs.panelBackdrop.classList.add('hidden');
    SIDE_PANELS.forEach((entry) => entry.classList.add('hidden'));
}

function openOverlay(overlay) {
    overlay.classList.add('active');
}

function closeOverlay(overlay) {
    overlay.classList.remove('active');
}

function isOverlayOpen(overlay) {
    return overlay.classList.contains('active');
}

function startJoystick(event) {
    refs.joystickZone.setPointerCapture(event.pointerId);
    state.heroInput.pointerId = event.pointerId;
    updateJoystick(event);
}

function moveJoystick(event) {
    if (state.heroInput.pointerId !== event.pointerId) return;
    updateJoystick(event);
}

function updateJoystick(event) {
    const rect = refs.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.34;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const limit = Math.min(radius, length);
    const x = (dx / length) * limit;
    const y = (dy / length) * limit;
    state.heroInput.x = x / radius;
    state.heroInput.y = y / radius;
    refs.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

function resetJoystick() {
    state.heroInput.pointerId = -1;
    state.heroInput.x = 0;
    state.heroInput.y = 0;
    refs.joystickKnob.style.transform = 'translate(-50%, -50%)';
}

function handleKeyDown(event) {
    if (event.key === 'w' || event.key === 'ArrowUp') state.keyInput.up = true;
    if (event.key === 's' || event.key === 'ArrowDown') state.keyInput.down = true;
    if (event.key === 'a' || event.key === 'ArrowLeft') state.keyInput.left = true;
    if (event.key === 'd' || event.key === 'ArrowRight') state.keyInput.right = true;
    if (event.key === ' ') {
        event.preventDefault();
        basicAttack(true);
    }
}

function handleKeyUp(event) {
    if (event.key === 'w' || event.key === 'ArrowUp') state.keyInput.up = false;
    if (event.key === 's' || event.key === 'ArrowDown') state.keyInput.down = false;
    if (event.key === 'a' || event.key === 'ArrowLeft') state.keyInput.left = false;
    if (event.key === 'd' || event.key === 'ArrowRight') state.keyInput.right = false;
}

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    refs.canvas.width = Math.round(width * dpr);
    refs.canvas.height = Math.round(height * dpr);
    refs.canvas.style.width = `${width}px`;
    refs.canvas.style.height = `${height}px`;
    state.canvas = { width, height, dpr };
}

function updateOrientationGuard() {
    refs.orientationGuard.classList.toggle('active', window.innerHeight > window.innerWidth);
}

function gameLoop(now) {
    const dt = Math.min(0.05, (now - (state.lastFrame || now)) / 1000);
    state.lastFrame = now;
    updateWorld(dt, now);
    renderScene(now);
    renderDynamicUi();
    flushProfileSync();
    sendPresenceUpdate();
    requestAnimationFrame(gameLoop);
}

function updateWorld(dt, now) {
    if (!state.profile || !state.worldData || isBlockingOverlayOpen()) return;

    updateAutoToggles(now);
    const move = getDesiredMovement();
    const hero = state.world.hero;
    const moveSpeed = state.profile.derivedStats.speed * 34;
    hero.x = clamp(hero.x + move.x * moveSpeed * dt, 100, state.world.width - 100);
    hero.y = clamp(hero.y + move.y * moveSpeed * dt, 100, state.world.height - 100);
    if (Math.abs(move.x) > 0.08) hero.facing = move.x > 0 ? 1 : -1;

    state.profile.location.x = Math.round(hero.x);
    state.profile.location.z = Math.round(hero.y);
    state.profile.currentMp = clamp(state.profile.currentMp + dt * 3.8, 0, state.profile.derivedStats.maxMp);

    updateMonsters(dt, now);
    updateEffects(dt);
    updateFloatingTexts(dt);

    if (state.profile.currentHp <= 0) reviveAtVillage();
}

function updateAutoToggles(now) {
    if (!state.profile) return;

    if (state.profile.quickToggles.autoPotion && state.profile.currentHp / state.profile.derivedStats.maxHp < 0.42) {
        usePotion('hp');
    }

    if (state.profile.quickToggles.autoBuff) {
        const buffSkill = state.profile.skillBar[3];
        const buffState = buffSkill ? state.profile.activeBuffs[buffSkill] : null;
        if (buffSkill && (!buffState || buffState.expiresAt <= now)) {
            castSkill(buffSkill, false);
        }
    }

    if (!state.profile.autoBattleState.enabled) {
        state.autoMove.x = 0;
        state.autoMove.y = 0;
        return;
    }

    const questZoneId = getMainQuest()?.objective?.zoneId || 'meadow';
    if (state.profile.autoBattleState.autoQuest && state.world.zoneId !== questZoneId) {
        state.autoMove.x = 0;
        state.autoMove.y = 0;
        teleportToZone(questZoneId, '자동 퀘스트 추적으로 이동했습니다.');
        return;
    }

    const target = findNearestMonster();
    if (!target) {
        state.autoMove.x = 0;
        state.autoMove.y = 0;
        return;
    }
    const distance = getDistance(state.world.hero, target);

    if (distance > 116) {
        const direction = normalizeVector(target.x - state.world.hero.x, target.y - state.world.hero.y);
        state.autoMove.x = direction.x;
        state.autoMove.y = direction.y;
    } else {
        state.autoMove.x = 0;
        state.autoMove.y = 0;
        if (!castFirstReadySkill()) basicAttack(false);
    }
}

function getDesiredMovement() {
    const x = (state.keyInput.right ? 1 : 0) - (state.keyInput.left ? 1 : 0) + state.heroInput.x;
    const y = (state.keyInput.down ? 1 : 0) - (state.keyInput.up ? 1 : 0) + state.heroInput.y;
    if (manualInputActive()) {
        return normalizeVector(x, y);
    }
    if (state.profile?.autoBattleState?.enabled) {
        return normalizeVector(state.autoMove.x, state.autoMove.y);
    }
    return normalizeVector(x, y);
}

function manualInputActive() {
    return Math.abs(state.heroInput.x) > 0.12
        || Math.abs(state.heroInput.y) > 0.12
        || state.keyInput.up
        || state.keyInput.down
        || state.keyInput.left
        || state.keyInput.right;
}

function updateMonsters(dt, now) {
    state.world.monsters.forEach((monster) => {
        if (monster.deadAt && now < monster.deadAt) return;
        if (monster.deadAt && now >= monster.deadAt) respawnMonster(monster);

        const template = getMonsterData(monster.monsterId);
        const distance = getDistance(monster, state.world.hero);
        if (distance < 260) {
            const direction = normalizeVector(state.world.hero.x - monster.x, state.world.hero.y - monster.y);
            monster.x += direction.x * template.moveSpeed * 28 * dt;
            monster.y += direction.y * template.moveSpeed * 28 * dt;
            if (distance < 72 && now > monster.attackAt) {
                monster.attackAt = now + 1400;
                const damage = Math.max(6, template.attack - state.profile.derivedStats.defense * 0.42);
                takeDamage(damage, monster.x, monster.y, template.name);
            }
        } else {
            monster.wanderAngle += dt * 0.7;
            monster.x = clamp(monster.homeX + Math.cos(monster.wanderAngle) * 26, 90, state.world.width - 90);
            monster.y = clamp(monster.homeY + Math.sin(monster.wanderAngle) * 18, 90, state.world.height - 90);
        }
    });
}

function respawnMonster(monster) {
    const template = getMonsterData(monster.monsterId);
    monster.hp = template.maxHp;
    monster.maxHp = template.maxHp;
    monster.deadAt = 0;
    monster.x = monster.homeX;
    monster.y = monster.homeY;
}

function basicAttack(manual) {
    if (!state.profile || performance.now() < state.world.hero.swingAt) return false;
    const target = findNearestMonster(132);
    if (!target) {
        if (manual) showToast('사거리 안에 몬스터가 없습니다.');
        return false;
    }
    state.world.hero.swingAt = performance.now() + 620;
    const damage = Math.round(state.profile.derivedStats.attack * 1.08);
    spawnEffect(target.x, target.y, 36, '#ffd38b', 0.22);
    applyDamageToMonster(target, damage, '기본 공격');
    return true;
}

function castFirstReadySkill() {
    return [0, 1, 2].some((slotIndex) => {
        const skillId = state.profile.skillBar[slotIndex];
        return skillId ? castSkill(skillId, false) : false;
    });
}

function castSkillBySlot(slotIndex) {
    const skillId = state.profile?.skillBar?.[slotIndex];
    if (!skillId) {
        showToast('아직 해금되지 않은 슬롯입니다.');
        return;
    }
    castSkill(skillId, true);
}

function castSkill(skillId, manual) {
    const skill = getSkillData(skillId);
    if (!skill || !state.profile.learnedSkills.includes(skillId)) return false;

    const now = performance.now();
    if ((state.skillCooldowns[skillId] || 0) > now) {
        if (manual) showToast('아직 재사용 대기 중입니다.');
        return false;
    }

    const manaCost = Number(skill.manaCost || 12);
    if (state.profile.currentMp < manaCost) {
        if (manual) showToast('MP가 부족합니다.');
        return false;
    }

    state.profile.currentMp = clamp(state.profile.currentMp - manaCost, 0, state.profile.derivedStats.maxMp);
    state.skillCooldowns[skillId] = now + skill.cooldownMs;

    if (skill.kind === 'buff') {
        state.profile.activeBuffs[skillId] = { expiresAt: now + Number(skill.durationMs || 12000) };
        recomputeProfile(state.profile);
        spawnEffect(state.world.hero.x, state.world.hero.y, 58, '#86ffe0', 0.36);
        showToast(`${skill.name} 활성화`);
        scheduleSync();
        return true;
    }

    const target = findNearestMonster(skill.range ? skill.range * 22 : 160);
    if (!target) {
        if (manual) showToast('스킬 사거리 안에 몬스터가 없습니다.');
        return false;
    }

    const damage = Math.round(state.profile.derivedStats.attack * Number(skill.multiplier || 1.6));
    const radius = Math.max(72, Number(skill.radius || 2.5) * 24);
    const victims = state.world.monsters.filter((monster) => !monster.deadAt && getDistance(monster, target) <= radius);
    if (!victims.length) victims.push(target);

    victims.forEach((monster) => applyDamageToMonster(monster, damage, skill.name));
    spawnEffect(target.x, target.y, radius, TIER_COLORS[skill.tier || 'starter'] || '#ffffff', 0.35);

    if (skill.kind === 'dash') {
        const direction = normalizeVector(target.x - state.world.hero.x, target.y - state.world.hero.y);
        state.world.hero.x = clamp(state.world.hero.x + direction.x * 82, 80, state.world.width - 80);
        state.world.hero.y = clamp(state.world.hero.y + direction.y * 82, 80, state.world.height - 80);
    }

    scheduleSync();
    return true;
}

function applyDamageToMonster(monster, damage, sourceText) {
    if (monster.deadAt) return;
    monster.hp -= damage;
    spawnFloatingText(monster.x, monster.y - 42, `-${formatNumber(damage)}`, '#fff5d8');
    if (monster.hp > 0) return;
    killMonster(monster, sourceText);
}

function killMonster(monster, sourceText) {
    const template = getMonsterData(monster.monsterId);
    monster.deadAt = performance.now() + 4200;
    state.profile.gold += template.gold;
    state.profile.exp += template.exp;
    spawnEffect(monster.x, monster.y, 68, '#ff8f7f', 0.28);
    progressQuests(template);
    rollDrops(template, sourceText);
    handleLevelUps();
    scheduleSync();
}

function progressQuests(template) {
    const quest = getMainQuest();
    if (quest && quest.objective.kind === 'kill' && quest.objective.monsterId === template.id && quest.objective.zoneId === state.world.zoneId) {
        state.profile.questProgress.tracker[quest.id] = Number(state.profile.questProgress.tracker[quest.id] || 0) + 1;
        const currentCount = state.profile.questProgress.tracker[quest.id];
        if (currentCount >= quest.objective.count) {
            state.profile.questProgress.completed.push(quest.id);
            const questIndex = state.worldData.quests.findIndex((entry) => entry.id === quest.id);
            state.profile.questProgress.activeQuestId = state.worldData.quests[questIndex + 1]?.id || '';
            grantRewardToast(quest.rewards, `${quest.name} 완료`);
        }
    }

    state.profile.dailyQuestProgress.count += 1;
    const daily = state.worldData.dailyQuest;
    if (!state.profile.dailyQuestProgress.completed && state.profile.dailyQuestProgress.count >= daily.objective.count) {
        state.profile.dailyQuestProgress.completed = true;
        grantRewardToast(daily.rewards, `${daily.name} 완료`);
    }
}

function grantRewardToast(rewards, title) {
    state.profile.gold += Number(rewards.gold || 0);
    state.profile.exp += Number(rewards.exp || 0);
    handleLevelUps(true);
    showToast(`${title} · EXP ${rewards.exp} / 골드 ${rewards.gold}`);
}

function handleLevelUps(showToastFlag = false) {
    let leveled = false;
    while (state.profile.exp >= state.profile.expMax) {
        state.profile.exp -= state.profile.expMax;
        state.profile.level += 1;
        state.profile.expMax = expForLevel(state.profile.level);
        leveled = true;
    }
    if (leveled) {
        applyLevelUnlocks(state.profile);
        syncSkillBar(state.profile);
        recomputeProfile(state.profile, { refill: true });
        if (showToastFlag || leveled) showToast(`레벨 ${state.profile.level} 달성`);
    }
}

function rollDrops(template, sourceText) {
    (template.drops || []).forEach((drop) => {
        if (Math.random() > drop.chance) return;
        const item = createInventoryItem(drop.itemId);
        state.profile.inventory.push(item);
        const itemTemplate = getItemTemplate(drop.itemId);
        const rarity = getRarity(itemTemplate?.rarity);
        showToast(`${sourceText || template.name}: ${itemTemplate?.name || drop.itemId} (${rarity.label})`);
    });
}

function takeDamage(amount, x, y, sourceName) {
    state.profile.currentHp = clamp(Math.round(state.profile.currentHp - amount), 0, state.profile.derivedStats.maxHp);
    spawnFloatingText(x, y - 54, `-${formatNumber(amount)}`, '#ffb3b3');
    spawnEffect(x, y, 44, '#ff7c7c', 0.2);
    if (state.profile.currentHp <= 0) showToast(`${sourceName}에게 쓰러졌습니다.`);
}

function reviveAtVillage() {
    state.profile.autoBattleState.enabled = false;
    recomputeProfile(state.profile, { refill: true });
    teleportToZone('village', '마을에서 부활했습니다.');
}

function usePotion(kind) {
    if (kind === 'hp') {
        if (state.profile.consumables.hpPotion <= 0 || state.profile.currentHp >= state.profile.derivedStats.maxHp) return false;
        state.profile.consumables.hpPotion -= 1;
        state.profile.currentHp = clamp(state.profile.currentHp + state.profile.derivedStats.maxHp * 0.38, 0, state.profile.derivedStats.maxHp);
        spawnEffect(state.world.hero.x, state.world.hero.y, 46, '#ffb88e', 0.24);
        scheduleSync();
        return true;
    }
    if (kind === 'mp') {
        if (state.profile.consumables.mpPotion <= 0 || state.profile.currentMp >= state.profile.derivedStats.maxMp) return false;
        state.profile.consumables.mpPotion -= 1;
        state.profile.currentMp = clamp(state.profile.currentMp + state.profile.derivedStats.maxMp * 0.4, 0, state.profile.derivedStats.maxMp);
        spawnEffect(state.world.hero.x, state.world.hero.y, 44, '#7bc3ff', 0.24);
        scheduleSync();
        return true;
    }
    return false;
}

function renderScene() {
    const ctx = state.ctx;
    const { width, height, dpr } = state.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(6, 7, 11, 0.45)';
    ctx.fillRect(0, 0, width, height);

    if (!state.profile || !state.worldData) return;
    const camera = getCamera();
    drawGround(ctx, camera);
    drawEffects(ctx, camera);
    drawEntities(ctx, camera);
    drawFloatingTexts(ctx, camera);
}

function drawGround(ctx, camera) {
    const layout = getZoneLayout(state.world.zoneId);
    const tile = layout.tile;
    const [a, b, c] = layout.palette;
    const startX = Math.floor(camera.x / tile) * tile - tile;
    const startY = Math.floor(camera.y / tile) * tile - tile;

    for (let y = startY; y < camera.y + state.canvas.height + tile; y += tile) {
        for (let x = startX; x < camera.x + state.canvas.width + tile; x += tile) {
            const index = Math.abs(Math.floor(x / tile) + Math.floor(y / tile)) % 3;
            ctx.fillStyle = index === 0 ? a : index === 1 ? b : c;
            ctx.fillRect(x - camera.x, y - camera.y, tile + 1, tile + 1);
            ctx.fillStyle = 'rgba(255,255,255,0.035)';
            ctx.fillRect(x - camera.x + 6, y - camera.y + 6, 6, 6);
        }
    }

    if (layout.props === 'village') drawVillageDecor(ctx, camera);
    if (layout.props === 'meadow') drawMeadowDecor(ctx, camera);
    if (layout.props === 'canyon') drawCanyonDecor(ctx, camera);
    if (layout.props === 'shrine') drawShrineDecor(ctx, camera);
    if (layout.props === 'dungeon') drawDungeonDecor(ctx, camera);
}

function drawVillageDecor(ctx, camera) {
    ctx.fillStyle = 'rgba(175, 142, 102, 0.68)';
    ctx.fillRect(680 - camera.x, 420 - camera.y, 460, 320);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.28)';
    ctx.beginPath();
    ctx.arc(910 - camera.x, 580 - camera.y, 120, 0, Math.PI * 2);
    ctx.fill();
}

function drawMeadowDecor(ctx, camera) {
    ctx.fillStyle = 'rgba(170, 204, 120, 0.16)';
    for (let index = 0; index < 18; index += 1) {
        const x = 160 + index * 108 - camera.x;
        const y = 220 + Math.sin(index) * 80 + 240 - camera.y;
        ctx.beginPath();
        ctx.arc(x, y, 28 + (index % 3) * 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCanyonDecor(ctx, camera) {
    ctx.fillStyle = 'rgba(144, 100, 78, 0.28)';
    for (let index = 0; index < 12; index += 1) {
        ctx.fillRect(220 + index * 150 - camera.x, 240 + (index % 4) * 180 - camera.y, 94, 42);
    }
}

function drawShrineDecor(ctx, camera) {
    ctx.strokeStyle = 'rgba(245, 130, 120, 0.34)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(980 - camera.x, 580 - camera.y, 180, 0, Math.PI * 2);
    ctx.stroke();
}

function drawDungeonDecor(ctx, camera) {
    ctx.fillStyle = 'rgba(120, 142, 210, 0.12)';
    for (let index = 0; index < 16; index += 1) {
        ctx.fillRect(180 + index * 110 - camera.x, 180 + (index % 3) * 220 - camera.y, 60, 140);
    }
}

function drawEntities(ctx, camera) {
    const entities = [];
    state.world.monsters.forEach((monster) => {
        if (!monster.deadAt) entities.push({ type: 'monster', y: monster.y, data: monster });
    });
    state.peers.forEach((peer) => {
        if (peer.zoneId === state.world.zoneId) entities.push({ type: 'peer', y: peer.y, data: peer });
    });
    entities.push({ type: 'hero', y: state.world.hero.y, data: state.world.hero });
    entities.sort((a, b) => a.y - b.y);

    entities.forEach((entry) => {
        if (entry.type === 'hero') drawCharacter(ctx, camera, state.world.hero, state.profile.classId, state.profile.nickname, true);
        else if (entry.type === 'peer') drawCharacter(ctx, camera, entry.data, entry.data.classId || 'warrior', entry.data.nickname, false);
        else drawMonster(ctx, camera, entry.data);
    });
}

function drawCharacter(ctx, camera, entity, classId, label, isHero) {
    const point = worldToScreen(entity.x, entity.y, camera);
    const def = activeSkin.worldSprites.players[classId] || activeSkin.worldSprites.players.warrior;
    const image = getLoadedImage(def.src);
    const width = isHero ? 60 : 48;
    const height = isHero ? 74 : 60;

    ctx.fillStyle = isHero ? 'rgba(32, 166, 255, 0.3)' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 16, width * 0.42, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (image) {
        ctx.drawImage(image, def.crop.x, def.crop.y, def.crop.w, def.crop.h, point.x - width / 2, point.y - height + 10, width, height);
    } else {
        ctx.fillStyle = isHero ? '#7bb7ff' : '#dedede';
        ctx.fillRect(point.x - width / 2, point.y - height + 10, width, height);
    }

    drawNameplate(ctx, point.x, point.y - height + 2, label, isHero ? '#eff8ff' : '#d9dce9');
}

function drawMonster(ctx, camera, monster) {
    const point = worldToScreen(monster.x, monster.y, camera);
    const spriteDef = getMonsterSpriteDef(monster.monsterId);
    const image = spriteDef ? getLoadedImage(spriteDef.src) : null;
    const template = getMonsterData(monster.monsterId);
    const width = template.id === 'colossus' ? 84 : 56;
    const height = template.id === 'colossus' ? 92 : 64;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 18, width * 0.44, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (image && spriteDef) {
        ctx.drawImage(image, spriteDef.crop.x, spriteDef.crop.y, spriteDef.crop.w, spriteDef.crop.h, point.x - width / 2, point.y - height + 12, width, height);
    } else {
        ctx.fillStyle = '#ff9274';
        ctx.fillRect(point.x - width / 2, point.y - height + 10, width, height);
    }

    drawNameplate(ctx, point.x, point.y - height + 4, template.name, '#fff0e2');
    drawMiniHpBar(ctx, point.x - 28, point.y - height + 18, 56, monster.hp / monster.maxHp);
}

function drawMiniHpBar(ctx, x, y, width, ratio) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x, y, width, 6);
    ctx.fillStyle = '#d94d4d';
    ctx.fillRect(x, y, width * clamp(ratio, 0, 1), 6);
}

function drawNameplate(ctx, x, y, text, color) {
    ctx.font = '600 11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(text, x, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function drawEffects(ctx, camera) {
    state.world.effects.forEach((effect) => {
        const point = worldToScreen(effect.x, effect.y, camera);
        const ratio = effect.life / effect.maxLife;
        ctx.strokeStyle = withAlpha(effect.color, ratio * 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(point.x, point.y, effect.radius * (1 + (1 - ratio) * 0.35), 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.fillStyle = '#f2f5ff';
    ctx.font = '700 11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(getZoneData(state.world.zoneId).name, state.canvas.width / 2, 42);
}

function drawFloatingTexts(ctx, camera) {
    state.world.texts.forEach((entry) => {
        const point = worldToScreen(entry.x, entry.y, camera);
        ctx.font = '700 16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillStyle = withAlpha(entry.color, entry.life / entry.maxLife);
        ctx.fillText(entry.text, point.x, point.y);
    });
}

function updateEffects(dt) {
    state.world.effects = state.world.effects.filter((effect) => {
        effect.life -= dt;
        return effect.life > 0;
    });
}

function updateFloatingTexts(dt) {
    state.world.texts = state.world.texts.filter((entry) => {
        entry.life -= dt;
        entry.y -= dt * 40;
        return entry.life > 0;
    });
}

function spawnEffect(x, y, radius, color, duration) {
    state.world.effects.push({ x, y, radius, color, life: duration, maxLife: duration });
}

function spawnFloatingText(x, y, text, color) {
    state.world.texts.push({ x, y, text, color, life: 0.7, maxLife: 0.7 });
}

function getCamera() {
    return {
        x: clamp(state.world.hero.x - state.canvas.width / 2, 0, Math.max(0, state.world.width - state.canvas.width)),
        y: clamp(state.world.hero.y - state.canvas.height / 2, 0, Math.max(0, state.world.height - state.canvas.height))
    };
}

function worldToScreen(x, y, camera) {
    return { x: x - camera.x, y: y - camera.y };
}

function getMonsterSpriteDef(monsterId) {
    if (monsterId === 'slime') return activeSkin.worldSprites.enemies.slime;
    if (monsterId === 'wolf') return activeSkin.worldSprites.enemies.wolf;
    if (monsterId === 'wisp' || monsterId === 'shade_knight') return activeSkin.worldSprites.enemies.wisp;
    if (monsterId === 'colossus') return activeSkin.worldSprites.enemies.colossus;
    return activeSkin.worldSprites.enemies.wolf;
}

async function preloadSkinAssets() {
    const urls = new Set();
    Object.values(activeSkin.worldSprites.players).forEach((entry) => urls.add(entry.src));
    Object.values(activeSkin.worldSprites.enemies).forEach((entry) => urls.add(entry.src));
    Object.values(activeSkin.portraits).forEach((src) => urls.add(src));
    await Promise.all(Array.from(urls).map((src) => loadImage(src)));
}

function loadImage(src) {
    if (state.assets.loading.has(src)) return state.assets.loading.get(src);
    const promise = new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            state.assets.images.set(src, image);
            resolve(image);
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });
    state.assets.loading.set(src, promise);
    return promise;
}

function getLoadedImage(src) {
    return state.assets.images.get(src) || null;
}

function connectSocket() {
    if (state.ws) state.ws.close();
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${location.host}`);
    state.ws = ws;

    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ type: 'hello', userId: state.userId, nickname: state.profile?.nickname || '별빛 모험가' }));
        flushProfileSync(true);
    });

    ws.addEventListener('message', (event) => {
        const message = parseJson(event.data);
        if (!message) return;
        if (message.type === 'presence:snapshot') {
            state.peers = (message.players || [])
                .filter((player) => player.userId !== state.userId)
                .map((player) => ({ ...player, x: Number(player.x || 0), y: Number(player.z || 0) }));
        }
    });

    ws.addEventListener('close', () => {
        if (!state.profile) return;
        window.setTimeout(() => {
            if (!state.ws || state.ws.readyState === WebSocket.OPEN) return;
            connectSocket();
        }, 1800);
    });
}

function flushProfileSync(force = false) {
    if (!state.profile || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (!force && !state.syncDirty) return;
    if (!force && now - state.lastSyncAt < 900) return;
    state.lastSyncAt = now;
    state.syncDirty = false;
    state.ws.send(JSON.stringify({
        type: 'profile:sync',
        profile: {
            ...state.profile,
            location: { zoneId: state.world.zoneId, x: Math.round(state.world.hero.x), z: Math.round(state.world.hero.y) }
        }
    }));
}

function sendPresenceUpdate() {
    if (!state.profile || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - state.lastPresenceAt < 500) return;
    state.lastPresenceAt = now;
    state.ws.send(JSON.stringify({
        type: 'presence:update',
        zoneId: state.world.zoneId,
        x: Math.round(state.world.hero.x),
        z: Math.round(state.world.hero.y),
        classId: state.profile.classId,
        nickname: state.profile.nickname,
        level: state.profile.level,
        powerScore: state.profile.powerScore
    }));
}

function scheduleSync(force = false) {
    state.syncDirty = true;
    if (force) flushProfileSync(true);
}

function getMainQuest() {
    return state.worldData?.quests?.find((quest) => quest.id === state.profile?.questProgress?.activeQuestId) || null;
}

function getClassData(classId) {
    return state.worldData?.classes?.[classId] || null;
}

function getSkillData(skillId) {
    return state.worldData?.skills?.[skillId] || null;
}

function getItemTemplate(itemId) {
    return state.worldData?.items?.[itemId] || null;
}

function getMonsterData(monsterId) {
    return state.worldData?.monsters?.[monsterId] || LOCAL_MONSTER_OVERRIDES[monsterId];
}

function getZoneData(zoneId) {
    return state.worldData?.zones?.[zoneId] || LOCAL_ZONE_OVERRIDES[zoneId] || state.worldData?.zones?.village;
}

function getZoneLayout(zoneId) {
    return ZONE_LAYOUTS[zoneId] || ZONE_LAYOUTS.village;
}

function getRarity(rarityId) {
    return state.worldData?.rarities?.[rarityId] || { label: '일반', color: '#ffffff' };
}

function describeItem(template) {
    if (!template) return '정보 없음';
    if (template.slot === 'scroll') {
        const skill = getSkillData(template.unlockSkillId);
        return `${TIER_LABELS[skill?.tier || 'advanced']} 스킬북`;
    }
    return [
        template.statBonus?.attack ? `공격 ${template.statBonus.attack}` : '',
        template.statBonus?.defense ? `방어 ${template.statBonus.defense}` : '',
        template.statBonus?.maxHp ? `HP ${template.statBonus.maxHp}` : ''
    ].filter(Boolean).join(' / ') || '능력치 없음';
}

function findNearestMonster(maxDistance = Number.POSITIVE_INFINITY) {
    let nearest = null;
    let bestDistance = maxDistance;
    state.world.monsters.forEach((monster) => {
        if (monster.deadAt) return;
        const distance = getDistance(monster, state.world.hero);
        if (distance < bestDistance) {
            bestDistance = distance;
            nearest = monster;
        }
    });
    return nearest || null;
}

function isBlockingOverlayOpen() {
    return isOverlayOpen(refs.introScreen)
        || isOverlayOpen(refs.classModal)
        || isOverlayOpen(refs.storyModal)
        || isOverlayOpen(refs.offlineModal)
        || isOverlayOpen(refs.orientationGuard);
}

function showToast(text) {
    refs.toast.textContent = text;
    refs.toast.classList.add('show');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => refs.toast.classList.remove('show'), 1800);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
}

function expForLevel(level) {
    return 100 + Math.max(0, level - 1) * 45;
}

function createUserId() {
    if (window.crypto?.randomUUID) return `guest_${window.crypto.randomUUID()}`;
    return `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function parseJson(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function normalizeVector(x, y) {
    const length = Math.hypot(x, y);
    if (!length) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

function getDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function withAlpha(color, alpha) {
    const value = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
    return `${color}${value}`;
}

boot();
