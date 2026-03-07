import * as THREE from '/vendor/three/build/three.module.js';
import { activeSkin, applySkinToRoot } from '/client/assets/skins/dark-fantasy/manifest.js';

const refs = {
    app: document.getElementById('app'),
    intro: document.getElementById('intro-screen'),
    orientationGuard: document.getElementById('orientation-guard'),
    classModal: document.getElementById('class-modal'),
    storyModal: document.getElementById('story-modal'),
    offlineModal: document.getElementById('offline-modal'),
    classGrid: document.getElementById('class-grid'),
    startBtn: document.getElementById('start-btn'),
    installBtn: document.getElementById('install-btn'),
    nicknameInput: document.getElementById('nickname-input'),
    offlineRewardText: document.getElementById('offline-reward-text'),
    offlineCloseBtn: document.getElementById('offline-close-btn'),
    storyZoneLabel: document.getElementById('story-zone-label'),
    storyTitle: document.getElementById('story-title'),
    storyCopy: document.getElementById('story-copy'),
    storyWarpBtn: document.getElementById('story-warp-btn'),
    storyCloseBtn: document.getElementById('story-close-btn'),
    zoneLabel: document.getElementById('zone-label'),
    playerName: document.getElementById('player-name'),
    playerAvatar: document.getElementById('player-avatar'),
    onlineLabel: document.getElementById('online-label'),
    levelLabel: document.getElementById('level-label'),
    powerLabel: document.getElementById('power-label'),
    goldLabel: document.getElementById('gold-label'),
    pointLabel: document.getElementById('point-label'),
    cashLabel: document.getElementById('cash-label'),
    expBar: document.getElementById('exp-bar'),
    expLabel: document.getElementById('exp-label'),
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
    hpBar: document.getElementById('hp-bar'),
    hpLabel: document.getElementById('hp-label'),
    mpBar: document.getElementById('mp-bar'),
    mpLabel: document.getElementById('mp-label'),
    targetLabel: document.getElementById('target-label'),
    autoPotionState: document.getElementById('auto-potion-state'),
    autoBuffState: document.getElementById('auto-buff-state'),
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
    claimMailBtn: document.getElementById('claim-mail-btn'),
    openShopBtn: document.getElementById('open-shop-btn'),
    openMailBtn: document.getElementById('open-mail-btn'),
    openDungeonBtn: document.getElementById('open-dungeon-btn'),
    openStoryBtn: document.getElementById('open-story-btn'),
    enhanceBtn: document.getElementById('enhance-btn'),
    bgmToggle: document.getElementById('bgm-toggle'),
    sfxToggle: document.getElementById('sfx-toggle'),
    joystickZone: document.getElementById('joystick-zone'),
    joystickBase: document.getElementById('joystick-base'),
    joystickKnob: document.getElementById('joystick-knob'),
    basicAttackBtn: document.getElementById('basic-attack-btn'),
    quickToggleBtn: document.getElementById('quick-toggle-btn'),
    quickTray: document.getElementById('quick-tray'),
    skill1Btn: document.getElementById('skill-1-btn'),
    skill2Btn: document.getElementById('skill-2-btn'),
    skill3Btn: document.getElementById('skill-3-btn'),
    skill4Btn: document.getElementById('skill-4-btn'),
    autoPotionBtn: document.getElementById('auto-potion-btn'),
    autoBuffBtn: document.getElementById('auto-buff-btn'),
    autoBtn: document.getElementById('auto-btn'),
    toast: document.getElementById('toast'),
    canvas: document.getElementById('game-canvas')
};

const zoneLayout = {
    village: { x: 0, z: 0, width: 42, depth: 28, color: '#f7c59f', accent: '#f5a97f' },
    meadow: { x: 62, z: 0, width: 52, depth: 34, color: '#86ba90', accent: '#b5e48c' },
    canyon: { x: 130, z: 0, width: 54, depth: 36, color: '#7da1d4', accent: '#8ecae6' },
    shrine: { x: 198, z: 0, width: 40, depth: 30, color: '#d95d67', accent: '#ff6b6b' }
};

const zoneVisuals = {
    village: { floor: '#6c5647', rim: '#b08a68', glow: '#f0c57b' },
    meadow: { floor: '#58412d', rim: '#9d7a49', glow: '#d3af62' },
    canyon: { floor: '#312c43', rim: '#72679d', glow: '#7fc8ff' },
    shrine: { floor: '#2a2326', rim: '#8f5644', glow: '#ff8b5e' }
};

const zoneGroundPalette = {
    village: { base: '#6a4f3d', shade: '#4d3b30', accent: '#9f7a56', glow: '#d3ab73' },
    meadow: { base: '#4d4630', shade: '#353120', accent: '#827446', glow: '#c8be71' },
    canyon: { base: '#302a3d', shade: '#211d2e', accent: '#615b87', glow: '#7eb7ff' },
    shrine: { base: '#2c2225', shade: '#1c1517', accent: '#724537', glow: '#ef8b63' }
};

const zoneGroundTextureCache = new Map();
const spriteAssetCache = new Map();
const tempWorldPosition = new THREE.Vector3();

function generateUserId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const state = {
    userId: localStorage.getItem('kidRpgUserId') || generateUserId(),
    nickname: localStorage.getItem('kidRpgNickname') || '',
    skin: activeSkin,
    worldData: null,
    profile: null,
    ws: null,
    onlinePlayers: [],
    remotePlayers: new Map(),
    lastPresenceSent: 0,
    saveTimer: 0,
    autoTeleportAt: 0,
    toastTimer: 0,
    deferredInstallPrompt: null,
    keyboard: { up: false, down: false, left: false, right: false },
    joystick: { active: false, pointerId: -1, x: 0, y: 0 },
    basicAttackAt: 0,
    autoPotionAt: 0,
    skillCooldowns: {},
    ui: {
        openPanel: '',
        quickTrayOpen: false
    },
    world: {
        renderer: null,
        scene: null,
        camera: null,
        clock: new THREE.Clock(),
        hero: null,
        zoneGroup: new THREE.Group(),
        actorGroup: new THREE.Group(),
        fxGroup: new THREE.Group(),
        enemies: [],
        drops: [],
        effects: [],
        groundBounds: { minX: -24, maxX: 220 }
    }
};

localStorage.setItem('kidRpgUserId', state.userId);

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.bgmTimer = null;
        this.step = 0;
    }

    ensureContext() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.musicGain.gain.value = 0.22;
        this.sfxGain.gain.value = 0.35;
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);
    }

    applySettings() {
        this.ensureContext();
        const audio = state.profile.audioSettings;
        this.musicGain.gain.value = audio.bgmEnabled ? 0.22 : 0;
        this.sfxGain.gain.value = audio.sfxEnabled ? 0.35 : 0;
        if (audio.bgmEnabled) this.startBgm();
        else this.stopBgm();
    }

    playTone(freq, duration, type, gainValue, when = 0, bus = 'sfx') {
        this.ensureContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(gainValue, this.ctx.currentTime + when);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + when + duration);
        osc.connect(gain);
        gain.connect(bus === 'music' ? this.musicGain : this.sfxGain);
        osc.start(this.ctx.currentTime + when);
        osc.stop(this.ctx.currentTime + when + duration + 0.02);
    }

    playSwing() {
        this.playTone(180, 0.08, 'square', 0.16);
        this.playTone(120, 0.12, 'triangle', 0.08, 0.02);
    }

    playSpell() {
        this.playTone(440, 0.18, 'sine', 0.14);
        this.playTone(660, 0.18, 'triangle', 0.12, 0.02);
    }

    playArrow() {
        this.playTone(320, 0.12, 'triangle', 0.15);
        this.playTone(520, 0.1, 'square', 0.08, 0.02);
    }

    playHit() {
        this.playTone(90, 0.09, 'sawtooth', 0.12);
    }

    playKill() {
        this.playTone(220, 0.12, 'triangle', 0.14);
        this.playTone(330, 0.18, 'triangle', 0.11, 0.03);
    }

    playLoot() {
        this.playTone(480, 0.09, 'triangle', 0.13);
        this.playTone(720, 0.1, 'triangle', 0.1, 0.03);
    }

    playUi() {
        this.playTone(360, 0.07, 'sine', 0.08);
    }

    playLevelUp() {
        this.playTone(392, 0.12, 'triangle', 0.14);
        this.playTone(523, 0.16, 'triangle', 0.14, 0.08);
        this.playTone(659, 0.18, 'triangle', 0.14, 0.16);
    }

    playBossWarning() {
        this.playTone(110, 0.28, 'sawtooth', 0.18);
        this.playTone(138, 0.24, 'square', 0.12, 0.08);
    }

    startBgm() {
        if (this.bgmTimer || !state.profile.audioSettings.bgmEnabled) return;
        const progression = [
            [261.63, 329.63, 392],
            [293.66, 369.99, 440],
            [329.63, 392, 493.88],
            [220, 293.66, 349.23]
        ];
        this.bgmTimer = window.setInterval(() => {
            if (!state.profile.audioSettings.bgmEnabled) return;
            const chord = progression[this.step % progression.length];
            chord.forEach((note, idx) => {
                this.playTone(note, 1.8, idx === 0 ? 'triangle' : 'sine', 0.06 - idx * 0.01, 0, 'music');
            });
            this.step += 1;
        }, 1800);
    }

    stopBgm() {
        if (!this.bgmTimer) return;
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
    }
}

const audio = new AudioEngine();

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function expForLevel(level) {
    return 100 + Math.max(0, level - 1) * 45;
}

function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => refs.toast.classList.remove('show'), 1600);
}

function createInventoryItem(itemId, extra = {}) {
    return {
        uid: extra.uid || `${itemId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        itemId,
        qty: extra.qty || 1,
        enhance: extra.enhance || 0
    };
}

function getItemTemplate(itemId) {
    return state.worldData.items[itemId];
}

function getClassData(classId) {
    return state.worldData.classes[classId];
}

function getStarterInventory(classId) {
    const weaponId = classId === 'mage' ? 'novice_staff' : classId === 'ranger' ? 'hunter_bow' : 'bronze_sword';
    return [
        createInventoryItem(weaponId),
        createInventoryItem('linen_armor'),
        createInventoryItem('rookie_ring')
    ];
}

function getBaseManaForClass(classId) {
    if (classId === 'mage') return 180;
    if (classId === 'ranger') return 130;
    return 95;
}

function getSkillManaCost(skillId) {
    const skill = state.worldData?.skills?.[skillId];
    if (!skill) return 0;
    if (skill.manaCost) return skill.manaCost;
    if (skill.kind === 'meteor' || skill.kind === 'shockwave') return 28;
    if (skill.kind === 'dash') return 22;
    return 14;
}

function getSkillTier(skillId) {
    return state.worldData?.skills?.[skillId]?.tier || 'starter';
}

function getSkillTierLabel(skillId) {
    const tier = getSkillTier(skillId);
    if (tier === 'intermediate') return '중급';
    if (tier === 'advanced') return '고급';
    if (tier === 'legendary') return '전설';
    if (tier === 'buff') return '버프';
    return '기본';
}

function getSkillTierColor(skillId) {
    const tier = getSkillTier(skillId);
    if (tier === 'intermediate') return '#8a96ff';
    if (tier === 'advanced') return '#ff8fd0';
    if (tier === 'legendary') return '#ffcb69';
    if (tier === 'buff') return '#7ad6ff';
    return '#dbe3f4';
}

function getClassSkillPackage(classId) {
    return state.worldData?.classes?.[classId] || null;
}

function getBuffSkillId() {
    return getClassSkillPackage(state.profile?.classId)?.buffSkillId || '';
}

function ensureProfileState() {
    if (!state.profile) return;
    state.profile.inventory = state.profile.inventory || [];
    state.profile.equipment = state.profile.equipment || { weapon: null, armor: null, ring: null };
    state.profile.learnedSkills = state.profile.learnedSkills || [];
    state.profile.skillBar = Array.isArray(state.profile.skillBar) ? state.profile.skillBar.slice(0, 4) : [];
    while (state.profile.skillBar.length < 4) state.profile.skillBar.push('');
    state.profile.currencies = {
        points: 0,
        cash: 0,
        ...(state.profile.currencies || {})
    };
    state.profile.quickToggles = {
        autoPotion: true,
        autoBuff: false,
        ...(state.profile.quickToggles || {})
    };
    state.profile.consumables = {
        hpPotion: 5,
        mpPotion: 3,
        ...(state.profile.consumables || {})
    };
    state.profile.mailbox = Array.isArray(state.profile.mailbox) ? state.profile.mailbox : [];
    state.profile.storyFlags = {
        introSeen: false,
        meadowWarpHintSeen: false,
        ...(state.profile.storyFlags || {})
    };
    state.profile.activeBuffs = {
        ...(state.profile.activeBuffs || {})
    };

    if (!state.profile.mailbox.length) {
        state.profile.mailbox.push({
            id: 'welcome_supply',
            title: '초보 원정대 지원 물자',
            body: 'HP 포션 6개, MP 포션 3개, 골드 120을 지급합니다.',
            claimed: false,
            reward: {
                gold: 120,
                hpPotion: 6,
                mpPotion: 3,
                points: 30
            }
        });
    }
}

function getSkillButtonLabel(skillId) {
    if (!skillId) return '잠김';
    const skill = state.worldData.skills[skillId];
    return `${getSkillTierLabel(skillId)}\n${skill.name}`;
}

function computeDerivedStats(profile) {
    const equipment = Object.values(profile.equipment || {});
    const bonus = { maxHp: 0, attack: 0, defense: 0 };
    equipment.forEach((item) => {
        if (!item) return;
        const template = getItemTemplate(item.itemId);
        if (!template || !template.statBonus) return;
        Object.keys(template.statBonus).forEach((key) => {
            bonus[key] = (bonus[key] || 0) + template.statBonus[key] + (item.enhance * (key === 'attack' ? 2 : 1));
        });
    });
    const buffBonus = { maxHp: 0, attack: 0, defense: 0, speed: 0 };
    Object.entries(profile.activeBuffs || {}).forEach(([skillId, buff]) => {
        if (!buff || !buff.active) return;
        const skill = state.worldData?.skills?.[skillId];
        if (!skill?.buffBonus) return;
        Object.keys(skill.buffBonus).forEach((key) => {
            buffBonus[key] = (buffBonus[key] || 0) + skill.buffBonus[key];
        });
    });
    profile.derivedStats = {
        maxHp: profile.baseStats.maxHp + bonus.maxHp + buffBonus.maxHp,
        maxMp: getBaseManaForClass(profile.classId) + Math.round(profile.level * 4),
        attack: profile.baseStats.attack + bonus.attack + buffBonus.attack,
        defense: profile.baseStats.defense + bonus.defense + buffBonus.defense,
        speed: profile.baseStats.speed + buffBonus.speed
    };
    const gearPower = equipment.reduce((sum, item) => {
        if (!item) return sum;
        const template = getItemTemplate(item.itemId);
        return sum + (template ? template.power : 0) + item.enhance * 8;
    }, 0);
    profile.expMax = expForLevel(profile.level);
    profile.currentHp = Math.min(profile.derivedStats.maxHp, profile.currentHp || profile.derivedStats.maxHp);
    profile.currentMp = Math.min(profile.derivedStats.maxMp, profile.currentMp || profile.derivedStats.maxMp);
    profile.powerScore = Math.round(profile.level * 22 + profile.derivedStats.attack * 2.6 + profile.derivedStats.defense * 2.2 + profile.derivedStats.maxHp * 0.22 + gearPower);
}

function ensureDailyQuest() {
    const today = new Date().toISOString().slice(0, 10);
    if (!state.profile.dailyQuestProgress || state.profile.dailyQuestProgress.dateKey !== today) {
        state.profile.dailyQuestProgress = { dateKey: today, count: 0, completed: false };
    }
}

function getMainQuest() {
    return state.worldData.quests.find((quest) => quest.id === state.profile.questProgress.activeQuestId) || null;
}

function getQuestTrackerValue(questId) {
    return Number(state.profile.questProgress.tracker[questId] || 0);
}

function grantSkill(skillId, sourceText = '') {
    if (!skillId || state.profile.learnedSkills.includes(skillId)) return false;
    state.profile.learnedSkills.push(skillId);
    const emptyIndex = state.profile.skillBar.findIndex((entry) => !entry);
    if (emptyIndex >= 0) state.profile.skillBar[emptyIndex] = skillId;
    if (sourceText) showToast(`${sourceText}: ${state.worldData.skills[skillId].name}`);
    return true;
}

function grantConsumables(reward) {
    if (!reward) return;
    if (reward.hpPotion) state.profile.consumables.hpPotion += reward.hpPotion;
    if (reward.mpPotion) state.profile.consumables.mpPotion += reward.mpPotion;
    if (reward.points) state.profile.currencies.points += reward.points;
    if (reward.cash) state.profile.currencies.cash += reward.cash;
}

function checkLevelUnlocks(prevLevel) {
    const classData = getClassSkillPackage(state.profile.classId);
    if (!classData?.levelUnlocks?.length) return;
    classData.levelUnlocks.forEach((entry) => {
        if (prevLevel >= entry.level || state.profile.level < entry.level) return;
        grantSkill(entry.skillId, `레벨 ${entry.level} 해금`);
    });
}

function awardRewards(reward, sourceText) {
    const prevLevel = state.profile.level;
    state.profile.gold += reward.gold || 0;
    state.profile.exp += reward.exp || 0;
    state.profile.currencies.points += reward.points || 0;
    state.profile.currencies.cash += reward.cash || 0;
    while (state.profile.exp >= state.profile.expMax) {
        state.profile.exp -= state.profile.expMax;
        state.profile.level += 1;
        state.profile.expMax = expForLevel(state.profile.level);
        state.profile.currentHp = state.profile.derivedStats.maxHp;
        state.profile.currentMp = state.profile.derivedStats.maxMp;
    }
    checkLevelUnlocks(prevLevel);
    computeDerivedStats(state.profile);
    if (state.profile.level > prevLevel) {
        audio.playLevelUp();
        showToast(`레벨 업! ${prevLevel} -> ${state.profile.level}`);
    } else if (sourceText) {
        showToast(`${sourceText} 보상 획득`);
    }
}

function syncProfileToServer() {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN || !state.profile) return;
    state.ws.send(JSON.stringify({ type: 'profile:sync', profile: state.profile }));
}

function sendPresence() {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN || !state.profile) return;
    const now = performance.now();
    if (now - state.lastPresenceSent < 220) return;
    state.lastPresenceSent = now;
    state.ws.send(JSON.stringify({
        type: 'presence:update',
        userId: state.userId,
        nickname: state.profile.nickname,
        classId: state.profile.classId,
        level: state.profile.level,
        powerScore: state.profile.powerScore,
        zoneId: state.profile.location.zoneId,
        x: state.world.hero.position.x,
        z: state.world.hero.position.z
    }));
}

function openPanel(id) {
    closePanels();
    state.ui.openPanel = id;
    refs.panelBackdrop.classList.remove('hidden');
    refs[id].classList.remove('hidden');
}

function closePanels() {
    state.ui.openPanel = '';
    refs.panelBackdrop.classList.add('hidden');
    refs.servicePanel.classList.add('hidden');
    refs.inventoryPanel.classList.add('hidden');
    refs.questPanel.classList.add('hidden');
    refs.shopPanel.classList.add('hidden');
    refs.mailPanel.classList.add('hidden');
    refs.dungeonPanel.classList.add('hidden');
    refs.optionsPanel.classList.add('hidden');
}

function isBlockingModalVisible() {
    return refs.intro.classList.contains('active')
        || refs.classModal.classList.contains('active')
        || refs.storyModal.classList.contains('active')
        || refs.offlineModal.classList.contains('active');
}

function updateOrientationGuard() {
    const needsLandscape = !isBlockingModalVisible()
        && !!state.profile
        && window.innerHeight > window.innerWidth
        && window.innerWidth < 1180;
    refs.orientationGuard.classList.toggle('active', needsLandscape);
}

async function tryLockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (error) {
        // Ignore browser refusal.
    }
}

function zoneFromX(x) {
    let best = 'village';
    let bestDistance = Infinity;
    Object.entries(zoneLayout).forEach(([zoneId, zone]) => {
        const distance = Math.abs(x - zone.x);
        if (distance < bestDistance) {
            best = zoneId;
            bestDistance = distance;
        }
    });
    return best;
}

function getZoneDefinition(zoneId) {
    return state.worldData.zones[zoneId];
}

function getCurrentZone() {
    return zoneFromX(state.world.hero.position.x);
}

function refreshHud() {
    if (!state.profile) return;
    refs.app.dataset.zone = state.profile.location.zoneId;
    refs.playerAvatar.dataset.class = state.profile.classId || 'warrior';
    const zone = getZoneDefinition(state.profile.location.zoneId);
    const mainQuest = getMainQuest();
    refs.zoneLabel.textContent = `${zone.name} · ${zone.label}`;
    refs.playerName.textContent = state.profile.nickname;
    refs.levelLabel.textContent = `${state.profile.level}`;
    refs.powerLabel.textContent = `${state.profile.powerScore}`;
    refs.goldLabel.textContent = `${state.profile.gold}`;
    refs.pointLabel.textContent = `${state.profile.currencies.points}`;
    refs.cashLabel.textContent = `${state.profile.currencies.cash}`;
    refs.expBar.style.width = `${Math.max(0, Math.min(100, (state.profile.exp / state.profile.expMax) * 100))}%`;
    refs.expLabel.textContent = `${state.profile.exp} / ${state.profile.expMax} EXP`;
    refs.hpBar.style.width = `${Math.max(0, Math.min(100, (state.profile.currentHp / state.profile.derivedStats.maxHp) * 100))}%`;
    refs.hpLabel.textContent = `${Math.round(state.profile.currentHp)} / ${state.profile.derivedStats.maxHp}`;
    refs.mpBar.style.width = `${Math.max(0, Math.min(100, (state.profile.currentMp / state.profile.derivedStats.maxMp) * 100))}%`;
    refs.mpLabel.textContent = `${Math.round(state.profile.currentMp)} / ${state.profile.derivedStats.maxMp}`;
    refs.combatState.textContent = state.profile.autoBattleState.enabled
        ? (state.profile.autoBattleState.autoQuest ? '자동 찾기중...' : '자동 사냥중')
        : '수동 조작';
    refs.autoBtn.textContent = state.profile.autoBattleState.enabled ? 'AUTO ON' : 'AUTO';
    refs.autoQuestBtn.textContent = state.profile.autoBattleState.autoQuest ? 'AUTO ON' : 'AUTO';
    refs.onlineLabel.textContent = `온라인 ${Math.max(1, state.onlinePlayers.length)}명`;
    refs.bgmToggle.checked = state.profile.audioSettings.bgmEnabled;
    refs.sfxToggle.checked = state.profile.audioSettings.sfxEnabled;
    refs.skill1Btn.textContent = state.profile.skillBar[0] ? state.worldData.skills[state.profile.skillBar[0]].name : '스킬 1';
    refs.skill2Btn.textContent = state.profile.skillBar[1] ? state.worldData.skills[state.profile.skillBar[1]].name : '스킬 2';
    if (mainQuest) {
        const tracker = getQuestTrackerValue(mainQuest.id);
        refs.questTitle.textContent = mainQuest.name;
        refs.questDesc.textContent = `${mainQuest.summary} (${tracker}/${mainQuest.objective.count})`;
    } else {
        refs.questTitle.textContent = '메인 퀘스트 완료';
        refs.questDesc.textContent = '다음 챕터를 이어서 붙일 수 있는 구조로 열어뒀습니다.';
    }
}

function getItemRarity(item) {
    const template = getItemTemplate(item.itemId);
    return state.worldData.rarities[template.rarity];
}

function renderInventory() {
    if (!state.profile) return;
    refs.equipmentList.innerHTML = '';
    Object.entries(state.profile.equipment).forEach(([slot, item]) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        if (!item) {
            card.innerHTML = `<strong>${slot}</strong><div class="meta">비어 있음</div>`;
        } else {
            const template = getItemTemplate(item.itemId);
            const rarity = getItemRarity(item);
            card.innerHTML = `
                <strong style="color:${rarity.color}">${template.name}</strong>
                <div class="meta">${rarity.label} · ${slot} · 강화 +${item.enhance || 0}</div>
                <div class="meta">공격 ${template.statBonus.attack || 0} / 방어 ${template.statBonus.defense || 0} / HP ${template.statBonus.maxHp || 0}</div>
            `;
        }
        refs.equipmentList.appendChild(card);
    });

    refs.inventoryList.innerHTML = '';
    state.profile.inventory.forEach((item) => {
        const template = getItemTemplate(item.itemId);
        const rarity = getItemRarity(item);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <strong style="color:${rarity.color}">${template.name}</strong>
            <div class="meta">${rarity.label} · ${template.slot}${template.classId ? ` · ${state.worldData.classes[template.classId].name}` : ''}</div>
            <div class="meta">${template.slot === 'scroll' ? '스킬 해금 주문서' : `공격 ${template.statBonus.attack || 0} / 방어 ${template.statBonus.defense || 0} / HP ${template.statBonus.maxHp || 0}`}</div>
            <div class="actions">
                ${template.slot === 'scroll' ? `<button data-use-scroll="${item.uid}">사용</button>` : `<button data-equip-item="${item.uid}">장착</button>`}
            </div>
        `;
        refs.inventoryList.appendChild(card);
    });
}

function renderQuestPanel() {
    const mainQuest = getMainQuest();
    if (mainQuest) {
        const tracker = getQuestTrackerValue(mainQuest.id);
        refs.mainQuestDetail.innerHTML = `
            <strong>${mainQuest.name}</strong>
            <div>${mainQuest.summary}</div>
            <div>진행도: ${tracker} / ${mainQuest.objective.count}</div>
            <div>보상: EXP ${mainQuest.rewards.exp}, 골드 ${mainQuest.rewards.gold}</div>
        `;
    } else {
        refs.mainQuestDetail.innerHTML = `<strong>모든 메인 퀘스트 완료</strong><div>이 다음 챕터를 바로 붙일 수 있게 구조를 열어뒀습니다.</div>`;
    }
    ensureDailyQuest();
    refs.dailyQuestDetail.innerHTML = `
        <strong>${state.worldData.dailyQuest.name}</strong>
        <div>${state.worldData.dailyQuest.summary}</div>
        <div>진행도: ${state.profile.dailyQuestProgress.count} / ${state.worldData.dailyQuest.objective.count}</div>
        <div>보상: EXP ${state.worldData.dailyQuest.rewards.exp}, 골드 ${state.worldData.dailyQuest.rewards.gold}</div>
    `;
}

function getNearestEnemy(maxDistance = 999, preferredMonsterId = '') {
    let best = null;
    let bestDistance = maxDistance;
    state.world.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (preferredMonsterId && enemy.monsterId !== preferredMonsterId) return;
        const distance = enemy.mesh.position.distanceTo(state.world.hero.position);
        if (distance < bestDistance) {
            best = enemy;
            bestDistance = distance;
        }
    });
    return best;
}

function updateTargetLabel() {
    const enemy = getNearestEnemy(16);
    refs.targetLabel.textContent = enemy ? `${enemy.def.name} · HP ${Math.max(0, Math.round(enemy.hp))}` : '대상 없음';
}

function getZoneGroundTexture(zoneId) {
    if (zoneGroundTextureCache.has(zoneId)) return zoneGroundTextureCache.get(zoneId);
    const palette = zoneGroundPalette[zoneId] || zoneGroundPalette.village;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, palette.base);
    gradient.addColorStop(1, palette.shade);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 520; i += 1) {
        const alpha = 0.02 + Math.random() * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 8 + Math.random() * 30;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * (0.35 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < 260; i += 1) {
        ctx.strokeStyle = `rgba(0,0,0,${0.07 + Math.random() * 0.08})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + (Math.random() * 40 - 20), startY + (Math.random() * 40 - 20));
        ctx.stroke();
    }

    ctx.strokeStyle = `${palette.accent}66`;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(40, 376);
    ctx.bezierCurveTo(140, 292, 238, 248, 470, 204);
    ctx.stroke();

    ctx.strokeStyle = `${palette.glow}44`;
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    if (zoneId === 'shrine') {
        ctx.strokeStyle = `${palette.glow}88`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 98, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 54, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (zoneId === 'canyon') {
        ctx.fillStyle = `${palette.glow}22`;
        for (let i = 0; i < 7; i += 1) {
            const x = 56 + i * 58;
            ctx.fillRect(x, 74 + (i % 2) * 22, 12, 210);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    texture.needsUpdate = true;
    zoneGroundTextureCache.set(zoneId, texture);
    return texture;
}

function getSpriteDefinition(kind, id) {
    return state.skin?.worldSprites?.[kind]?.[id] || null;
}

function loadSpriteAsset(spriteDef) {
    const key = JSON.stringify(spriteDef);
    if (spriteAssetCache.has(key)) return spriteAssetCache.get(key);

    const promise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const crop = spriteDef.crop;
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = crop.w;
            sourceCanvas.height = crop.h;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

            const imageData = sourceCtx.getImageData(0, 0, crop.w, crop.h);
            const data = imageData.data;
            const [kr, kg, kb] = spriteDef.keyColor || [data[0], data[1], data[2]];
            const tolerance = spriteDef.tolerance || 48;
            let minX = crop.w;
            let minY = crop.h;
            let maxX = 0;
            let maxY = 0;

            for (let i = 0; i < data.length; i += 4) {
                const dr = data[i] - kr;
                const dg = data[i + 1] - kg;
                const db = data[i + 2] - kb;
                const distance = Math.sqrt(dr * dr + dg * dg + db * db);
                const pixelIndex = i / 4;
                const px = pixelIndex % crop.w;
                const py = Math.floor(pixelIndex / crop.w);
                if (distance <= tolerance) {
                    data[i + 3] = 0;
                } else if (data[i + 3] > 18) {
                    if (px < minX) minX = px;
                    if (py < minY) minY = py;
                    if (px > maxX) maxX = px;
                    if (py > maxY) maxY = py;
                }
            }

            sourceCtx.putImageData(imageData, 0, 0);

            if (maxX <= minX || maxY <= minY) {
                minX = 0;
                minY = 0;
                maxX = crop.w - 1;
                maxY = crop.h - 1;
            }

            const padding = 10;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(crop.w - 1, maxX + padding);
            maxY = Math.min(crop.h - 1, maxY + padding);

            const trimmedWidth = Math.max(1, maxX - minX + 1);
            const trimmedHeight = Math.max(1, maxY - minY + 1);
            const trimmedCanvas = document.createElement('canvas');
            trimmedCanvas.width = trimmedWidth;
            trimmedCanvas.height = trimmedHeight;
            const trimmedCtx = trimmedCanvas.getContext('2d');
            trimmedCtx.drawImage(sourceCanvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

            const texture = new THREE.CanvasTexture(trimmedCanvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            resolve({ texture, width: trimmedWidth, height: trimmedHeight });
        };
        image.onerror = reject;
        image.src = spriteDef.src;
    });

    spriteAssetCache.set(key, promise);
    return promise;
}

function applySpriteToPlane(plane, spriteDef, spriteHeight, opacity = 1) {
    loadSpriteAsset(spriteDef).then((asset) => {
        if (!plane.parent) return;
        const aspect = asset.width / asset.height;
        plane.geometry.dispose();
        plane.geometry = new THREE.PlaneGeometry(Math.max(1.5, spriteHeight * aspect), spriteHeight);
        plane.material.map = asset.texture;
        plane.material.color.set('#ffffff');
        plane.material.opacity = opacity;
        plane.material.needsUpdate = true;
        plane.position.y = spriteHeight * 0.5;
    }).catch((error) => {
        console.error('Failed to apply sprite asset', error);
    });
}

function orientSpriteActor(actor, directionX = 0) {
    if (!actor?.userData?.sprite || !state.world.camera) return;
    actor.lookAt(state.world.camera.position.x, actor.position.y + actor.userData.spriteHeight * 0.5, state.world.camera.position.z);
    actor.rotation.x = 0;
    actor.rotation.z = 0;
    if (Math.abs(directionX) > 0.02) {
        actor.userData.flip = directionX < 0 ? -1 : 1;
    }
    actor.userData.sprite.scale.x = Math.abs(actor.userData.sprite.scale.x) * actor.userData.flip;
}

function createFloor(zoneId) {
    if (zoneId !== 'village') return;
    const visual = zoneVisuals[zoneId];
    const sigil = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.4, 48),
        new THREE.MeshBasicMaterial({ color: visual.glow, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    sigil.rotation.x = -Math.PI / 2;
    sigil.position.set(zoneLayout.village.x - 7, 0.02, 0);
    state.world.zoneGroup.add(sigil);
}

function addDecoration() {
    Object.keys(zoneLayout).forEach((zoneId) => createFloor(zoneId));
    const accentMaterial = new THREE.MeshBasicMaterial({ color: '#f4d49a', transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    [62, 130, 198].forEach((x, index) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.3, 40), accentMaterial.clone());
        ring.material.opacity = index === 2 ? 0.12 : 0.08;
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.02, 0);
        state.world.zoneGroup.add(ring);
    });
}

function createPlayerModel(classId, isRemote = false) {
    const classData = getClassData(classId || 'warrior');
    const group = new THREE.Group();
    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 20),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: isRemote ? 0.16 : 0.24 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    group.add(shadow);

    const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1.02, 28),
        new THREE.MeshBasicMaterial({
            color: classData.color,
            transparent: true,
            opacity: isRemote ? 0.22 : 0.34,
            side: THREE.DoubleSide
        })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.07;
    group.add(aura);

    const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 3.9),
        new THREE.MeshBasicMaterial({
            color: classData.color,
            transparent: true,
            opacity: isRemote ? 0.62 : 1,
            alphaTest: 0.16,
            side: THREE.DoubleSide
        })
    );
    sprite.position.y = 1.95;
    sprite.renderOrder = 4;
    group.add(sprite);
    const spriteDef = getSpriteDefinition('players', classId || 'warrior');
    if (spriteDef) applySpriteToPlane(sprite, spriteDef, spriteDef.height || 3.9, isRemote ? 0.68 : 1);
    group.userData = {
        shadow,
        aura,
        sprite,
        spriteHeight: spriteDef?.height || 3.9,
        bob: Math.random() * Math.PI * 2,
        attackTilt: 0,
        flip: 1
    };
    return group;
}

function createEnemyModel(monsterId) {
    const group = new THREE.Group();
    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 20),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.24 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    group.add(shadow);

    const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 4.1),
        new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 1,
            alphaTest: 0.16,
            side: THREE.DoubleSide
        })
    );
    sprite.position.y = 2.05;
    sprite.renderOrder = 4;
    group.add(sprite);
    const spriteDef = getSpriteDefinition('enemies', monsterId);
    if (spriteDef) applySpriteToPlane(sprite, spriteDef, spriteDef.height || 4.1, 1);
    group.userData = {
        shadow,
        sprite,
        spriteHeight: spriteDef?.height || 4.1,
        bob: Math.random() * Math.PI * 2,
        flip: 1
    };
    return group;
}

function createDropMesh(itemId) {
    const template = getItemTemplate(itemId);
    const rarity = state.worldData.rarities[template.rarity];
    const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.MeshStandardMaterial({ color: rarity.color, emissive: rarity.color, emissiveIntensity: 0.48 })
    );
    mesh.castShadow = true;
    return mesh;
}

function spawnEnemies() {
    const spawns = {
        slime: [[46, -8], [52, 9], [60, -4], [67, 7], [75, -9], [80, 4]],
        wolf: [[118, -8], [126, 10], [136, -5], [144, 6]],
        wisp: [[120, 8], [130, -10], [140, 8], [148, -7]],
        colossus: [[198, 0]]
    };
    Object.entries(spawns).forEach(([monsterId, points]) => {
        points.forEach((point, idx) => {
            const def = state.worldData.monsters[monsterId];
            const mesh = createEnemyModel(monsterId);
            mesh.position.set(point[0], 0, point[1]);
            state.world.actorGroup.add(mesh);
            state.world.enemies.push({
                id: `${monsterId}_${idx}`,
                monsterId,
                def,
                mesh,
                hp: def.maxHp,
                alive: true,
                respawnAt: 0,
                attackAt: 0,
                home: new THREE.Vector3(point[0], 0, point[1]),
                roamTheta: idx * 1.7
            });
        });
    });
}

function buildWorld() {
    if (state.world.scene) return;
    const renderer = new THREE.WebGLRenderer({ canvas: refs.canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog('#0c0d12', 72, 190);

    const camera = new THREE.OrthographicCamera(-24, 24, 13.5, -13.5, 0.1, 500);
    camera.userData.frustumHeight = 30;
    camera.position.set(12, 24, 20);

    scene.add(new THREE.HemisphereLight('#ebe4d9', '#171827', 0.9));
    const sun = new THREE.DirectionalLight('#fcebd0', 1.25);
    sun.position.set(32, 54, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    scene.add(sun);

    const baseFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(360, 160),
        new THREE.MeshStandardMaterial({ color: '#111117', roughness: 1, transparent: true, opacity: 0.08 })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.04;
    baseFloor.receiveShadow = true;
    scene.add(baseFloor);

    state.world.renderer = renderer;
    state.world.scene = scene;
    state.world.camera = camera;
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -(camera.userData.frustumHeight * aspect) / 2;
    camera.right = (camera.userData.frustumHeight * aspect) / 2;
    camera.top = camera.userData.frustumHeight / 2;
    camera.bottom = -camera.userData.frustumHeight / 2;
    camera.updateProjectionMatrix();
    scene.add(state.world.zoneGroup, state.world.actorGroup, state.world.fxGroup);
    addDecoration();
    spawnEnemies();
}

function ensureHeroModel() {
    if (state.world.hero) state.world.actorGroup.remove(state.world.hero);
    state.world.hero = createPlayerModel(state.profile.classId || 'warrior', false);
    state.world.hero.position.set(state.profile.location.x, 0, state.profile.location.z);
    state.world.actorGroup.add(state.world.hero);
}

function updateRemotePlayers() {
    const seen = new Set();
    state.onlinePlayers.forEach((player) => {
        if (player.userId === state.userId) return;
        seen.add(player.userId);
        let remote = state.remotePlayers.get(player.userId);
        if (!remote) {
            remote = { target: new THREE.Vector3(), mesh: createPlayerModel(player.classId || 'warrior', true) };
            state.remotePlayers.set(player.userId, remote);
            state.world.actorGroup.add(remote.mesh);
        }
        remote.target.set(player.x || 0, 0, player.z || 0);
    });
    Array.from(state.remotePlayers.keys()).forEach((key) => {
        if (seen.has(key)) return;
        state.world.actorGroup.remove(state.remotePlayers.get(key).mesh);
        state.remotePlayers.delete(key);
    });
}

function currentZoneDamageScale() {
    const zone = getZoneDefinition(state.profile.location.zoneId);
    if (!zone || !zone.recommendedPower) return 1;
    return Math.max(0.68, Math.min(1.22, state.profile.powerScore / Math.max(zone.recommendedPower, 1)));
}

function createRingEffect(position, color, maxScale = 5, rise = 0.4) {
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.1, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.2;
    state.world.fxGroup.add(mesh);
    state.world.effects.push({ mesh, age: 0, life: 0.45, maxScale, rise });
}

function createProjectileEffect(from, to, color) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
    );
    mesh.position.copy(from);
    state.world.fxGroup.add(mesh);
    state.world.effects.push({ mesh, age: 0, life: 0.24, travelFrom: from.clone(), travelTo: to.clone(), projectile: true });
}

function addDrop(itemId, position) {
    const mesh = createDropMesh(itemId);
    mesh.position.copy(position);
    mesh.position.y = 0.7;
    state.world.actorGroup.add(mesh);
    state.world.drops.push({ id: `${itemId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`, itemId, mesh });
}

function rollDrops(enemy) {
    const drops = [];
    enemy.def.drops.forEach((drop) => {
        if (Math.random() <= drop.chance) drops.push(drop.itemId);
    });
    return drops;
}

function advanceQuest(monsterId) {
    const mainQuest = getMainQuest();
    if (mainQuest && mainQuest.objective.kind === 'kill' && mainQuest.objective.monsterId === monsterId) {
        state.profile.questProgress.tracker[mainQuest.id] = getQuestTrackerValue(mainQuest.id) + 1;
        if (state.profile.questProgress.tracker[mainQuest.id] >= mainQuest.objective.count) {
            awardRewards(mainQuest.rewards, mainQuest.name);
            state.profile.questProgress.completed.push(mainQuest.id);
            const currentIndex = state.worldData.quests.findIndex((quest) => quest.id === mainQuest.id);
            state.profile.questProgress.activeQuestId = state.worldData.quests[currentIndex + 1] ? state.worldData.quests[currentIndex + 1].id : '';
            showToast(`${mainQuest.name} 완료`);
            if (mainQuest.id === 'main_2') audio.playBossWarning();
        }
    }
    ensureDailyQuest();
    state.profile.dailyQuestProgress.count += 1;
    if (!state.profile.dailyQuestProgress.completed && state.profile.dailyQuestProgress.count >= state.worldData.dailyQuest.objective.count) {
        state.profile.dailyQuestProgress.completed = true;
        awardRewards(state.worldData.dailyQuest.rewards, '일일 퀘스트');
        showToast('일일 퀘스트 완료');
    }
}

function onEnemyDefeated(enemy, labelText) {
    awardRewards({
        exp: Math.round(enemy.def.exp * currentZoneDamageScale()),
        gold: Math.round(enemy.def.gold * currentZoneDamageScale())
    }, labelText || enemy.def.name);
    advanceQuest(enemy.monsterId);
    rollDrops(enemy).forEach((itemId) => addDrop(itemId, enemy.mesh.position));
    audio.playKill();
}

function applyDamage(enemy, amount, skillName) {
    if (!enemy || !enemy.alive) return;
    enemy.hp -= amount;
    createRingEffect(enemy.mesh.position, '#ffffff', 2.8, 0.2);
    audio.playHit();
    if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.respawnAt = performance.now() + (enemy.monsterId === 'colossus' ? 18000 : 6500);
        enemy.mesh.visible = false;
        onEnemyDefeated(enemy, skillName ? `${skillName} 처치` : enemy.def.name);
    }
}

function pickUpNearbyDrops() {
    for (let i = state.world.drops.length - 1; i >= 0; i -= 1) {
        const drop = state.world.drops[i];
        if (drop.mesh.position.distanceTo(state.world.hero.position) > 2.2) continue;
        state.profile.inventory.push(createInventoryItem(drop.itemId));
        state.world.actorGroup.remove(drop.mesh);
        state.world.drops.splice(i, 1);
        audio.playLoot();
        showToast(`${getItemTemplate(drop.itemId).name} 획득`);
    }
}

function performBasicAttack() {
    if (!state.profile.classId) return;
    const now = performance.now();
    if (now < state.basicAttackAt) return;
    const ranged = state.profile.classId !== 'warrior';
    const target = getNearestEnemy(ranged ? 12 : 4.8);
    if (!target) return;
    const damage = Math.round(state.profile.derivedStats.attack * (ranged ? 1.1 : 1.22) * currentZoneDamageScale());
    state.basicAttackAt = now + (ranged ? 850 : 720);
    state.world.hero.userData.attackTilt = 0.95;
    if (state.profile.classId === 'mage') {
        audio.playSpell();
        createProjectileEffect(state.world.hero.position.clone().add(new THREE.Vector3(0, 2.1, 0)), target.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), '#60a5fa');
    } else if (state.profile.classId === 'ranger') {
        audio.playArrow();
        createProjectileEffect(state.world.hero.position.clone().add(new THREE.Vector3(0, 2.1, 0)), target.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), '#a7f3d0');
    } else {
        audio.playSwing();
        createRingEffect(target.mesh.position, '#ffd166', 3.5, 0.1);
    }
    applyDamage(target, damage, '기본 공격');
}

function castSkill(slotIndex) {
    const skillId = state.profile.skillBar[slotIndex];
    if (!skillId) return;
    const skill = state.worldData.skills[skillId];
    const now = performance.now();
    if ((state.skillCooldowns[skillId] || 0) > now) return;
    const manaCost = getSkillManaCost(skillId);
    if (state.profile.currentMp < manaCost) {
        showToast('마나가 부족합니다');
        return;
    }
    const target = getNearestEnemy(skill.range);
    if (!target) {
        showToast('사정거리 안에 대상이 없습니다');
        return;
    }
    state.skillCooldowns[skillId] = now + skill.cooldownMs;
    state.profile.currentMp = Math.max(0, state.profile.currentMp - manaCost);
    state.world.hero.userData.attackTilt = 1.2;
    const damage = Math.round(state.profile.derivedStats.attack * skill.multiplier * currentZoneDamageScale());
    if (skill.kind === 'shockwave' || skill.kind === 'meteor') {
        createRingEffect(target.mesh.position, '#ff6b6b', 6.2, 0.5);
    } else {
        createProjectileEffect(state.world.hero.position.clone().add(new THREE.Vector3(0, 2.3, 0)), target.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), '#c084fc');
    }
    if (state.profile.classId === 'warrior') audio.playSwing();
    if (state.profile.classId === 'mage') audio.playSpell();
    if (state.profile.classId === 'ranger') audio.playArrow();
    state.world.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (enemy === target || enemy.mesh.position.distanceTo(target.mesh.position) <= skill.radius) {
            applyDamage(enemy, damage, skill.name);
        }
    });
}

function teleportToZone(zoneId, spendGold = true) {
    const zone = getZoneDefinition(zoneId);
    if (!zone) return;
    if (spendGold && state.profile.gold < zone.teleportCost) {
        showToast('골드가 부족합니다');
        return;
    }
    if (spendGold) state.profile.gold -= zone.teleportCost;
    const layout = zoneLayout[zoneId];
    state.world.hero.position.set(layout.x - layout.width * 0.22, 0, 0);
    state.profile.location = { zoneId, x: state.world.hero.position.x, z: 0 };
    state.profile.autoBattleState.lastZoneId = zoneId === 'village' ? 'meadow' : zoneId;
    createRingEffect(state.world.hero.position, '#ffffff', 5.2, 1);
    showToast(`${zone.name}으로 순간이동`);
}

function getQuestTargetZone() {
    const mainQuest = getMainQuest();
    return mainQuest ? mainQuest.objective.zoneId : 'meadow';
}

function beginQuestTracking(withTeleport = false) {
    state.profile.autoBattleState.autoQuest = true;
    state.profile.autoBattleState.enabled = true;
    const targetZoneId = getQuestTargetZone();
    if (withTeleport && targetZoneId && targetZoneId !== state.profile.location.zoneId) {
        teleportToZone(targetZoneId, true);
    }
    showToast('자동 찾기중...');
    syncProfileToServer();
}

function moveHero(direction, dt) {
    const speed = state.profile.derivedStats.speed * 4.2;
    state.world.hero.position.x += direction.x * speed * dt;
    state.world.hero.position.z += direction.z * speed * dt;
    state.world.hero.position.x = Math.max(state.world.groundBounds.minX, Math.min(state.world.groundBounds.maxX, state.world.hero.position.x));
    state.world.hero.position.z = Math.max(-18, Math.min(18, state.world.hero.position.z));
    state.world.hero.userData.facingAngle = Math.atan2(direction.x, direction.z);
}

function getMoveVector() {
    let x = 0;
    let z = 0;
    if (state.keyboard.left) x -= 1;
    if (state.keyboard.right) x += 1;
    if (state.keyboard.up) z -= 1;
    if (state.keyboard.down) z += 1;
    x += state.joystick.x;
    z += state.joystick.y;
    const length = Math.hypot(x, z);
    return length < 0.001 ? new THREE.Vector3() : new THREE.Vector3(x / length, 0, z / length);
}

function handleAutoBehavior(dt) {
    if (!state.profile.autoBattleState.enabled) return;
    const targetZoneId = state.profile.autoBattleState.autoQuest ? getQuestTargetZone() : state.profile.autoBattleState.lastZoneId;
    if (targetZoneId && state.profile.location.zoneId !== targetZoneId && performance.now() > state.autoTeleportAt) {
        teleportToZone(targetZoneId, true);
        state.autoTeleportAt = performance.now() + 1600;
        return;
    }
    const targetDrop = state.world.drops.find((drop) => drop.mesh.position.distanceTo(state.world.hero.position) < 6);
    if (targetDrop) {
        const direction = targetDrop.mesh.position.clone().sub(state.world.hero.position).setY(0).normalize();
        moveHero(direction, dt);
        return;
    }
    const mainQuest = getMainQuest();
    const preferredMonsterId = mainQuest && mainQuest.objective.kind === 'kill' ? mainQuest.objective.monsterId : '';
    const enemy = getNearestEnemy(18, preferredMonsterId);
    if (!enemy) return;
    const direction = enemy.mesh.position.clone().sub(state.world.hero.position).setY(0);
    const distance = direction.length();
    if (distance > 0.001) direction.normalize();
    if (distance > (state.profile.classId === 'warrior' ? 4.1 : 10.5)) {
        moveHero(direction, dt);
    } else {
        const skillId = state.profile.skillBar.find((entry) => (state.skillCooldowns[entry] || 0) <= performance.now());
        if (skillId && Math.random() > 0.55) castSkill(state.profile.skillBar.indexOf(skillId));
        else performBasicAttack();
    }
}

function updateEnemies(dt) {
    const now = performance.now();
    state.world.enemies.forEach((enemy) => {
        if (!enemy.alive) {
            if (now >= enemy.respawnAt) {
                enemy.alive = true;
                enemy.hp = enemy.def.maxHp;
                enemy.mesh.visible = true;
                enemy.mesh.position.copy(enemy.home);
            }
            return;
        }
        const enemyZone = zoneFromX(enemy.mesh.position.x);
        const playerZone = state.profile.location.zoneId;
        if (enemyZone !== playerZone) {
            enemy.roamTheta += dt * 0.4;
            enemy.mesh.position.x = enemy.home.x + Math.cos(enemy.roamTheta) * 0.9;
            enemy.mesh.position.z = enemy.home.z + Math.sin(enemy.roamTheta) * 0.9;
            enemy.mesh.userData.sprite.position.y = enemy.mesh.userData.spriteHeight * 0.5 + Math.abs(Math.sin(enemy.mesh.userData.bob += dt * 3.4)) * 0.06;
            orientSpriteActor(enemy.mesh, Math.cos(enemy.roamTheta));
            return;
        }
        const direction = state.world.hero.position.clone().sub(enemy.mesh.position).setY(0);
        const distance = direction.length();
        if (distance > 0.001) direction.normalize();
        if (distance < 10) {
            enemy.mesh.position.x += direction.x * enemy.def.moveSpeed * dt;
            enemy.mesh.position.z += direction.z * enemy.def.moveSpeed * dt;
            if (distance < 2.7 && now > enemy.attackAt) {
                enemy.attackAt = now + 1200;
                const zone = getZoneDefinition(playerZone);
                const incomingScale = Math.max(0.72, Math.min(1.35, (zone.recommendedPower + enemy.def.attack) / Math.max(state.profile.powerScore, 1)));
                state.profile.currentHp -= Math.max(4, enemy.def.attack * 0.55 * incomingScale - state.profile.derivedStats.defense * 0.4);
                createRingEffect(state.world.hero.position, '#ff6b6b', 2.8, 0.1);
                audio.playHit();
                if (state.profile.currentHp <= 0) {
                    state.profile.currentHp = state.profile.derivedStats.maxHp;
                    state.profile.gold = Math.max(0, state.profile.gold - Math.round(state.profile.gold * 0.08));
                    teleportToZone('village', false);
                    showToast('쓰러졌습니다. 마을로 후퇴합니다');
                }
            }
        } else {
            enemy.roamTheta += dt * 0.5;
            enemy.mesh.position.x = enemy.home.x + Math.cos(enemy.roamTheta) * 1.2;
            enemy.mesh.position.z = enemy.home.z + Math.sin(enemy.roamTheta) * 1.2;
        }
        enemy.mesh.userData.sprite.position.y = enemy.mesh.userData.spriteHeight * 0.5 + Math.abs(Math.sin(enemy.mesh.userData.bob += dt * 3.8)) * 0.06;
        orientSpriteActor(enemy.mesh, direction.x || Math.cos(enemy.roamTheta));
    });
}

function updateEffects(dt) {
    for (let i = state.world.effects.length - 1; i >= 0; i -= 1) {
        const effect = state.world.effects[i];
        effect.age += dt;
        if (effect.projectile) {
            const t = Math.min(1, effect.age / effect.life);
            effect.mesh.position.lerpVectors(effect.travelFrom, effect.travelTo, t);
        } else {
            const scale = 1 + (effect.maxScale - 1) * (effect.age / effect.life);
            effect.mesh.scale.setScalar(scale);
            effect.mesh.position.y += dt * effect.rise;
            effect.mesh.material.opacity = Math.max(0, 0.85 * (1 - effect.age / effect.life));
        }
        if (effect.age >= effect.life) {
            state.world.fxGroup.remove(effect.mesh);
            state.world.effects.splice(i, 1);
        }
    }
}

function updateDrops(dt) {
    state.world.drops.forEach((drop, index) => {
        drop.mesh.rotation.y += dt * 1.4;
        drop.mesh.position.y = 0.8 + Math.sin(performance.now() * 0.003 + index) * 0.18;
    });
}

function updateRemoteActors(dt) {
    state.remotePlayers.forEach((remote) => {
        remote.mesh.position.lerp(remote.target, Math.min(1, dt * 5));
        orientSpriteActor(remote.mesh, remote.target.x - remote.mesh.position.x);
    });
}

function updateHeroPresentation(dt) {
    const hero = state.world.hero;
    if (!hero) return;
    hero.userData.bob += dt * 8;
    hero.userData.attackTilt = Math.max(0, hero.userData.attackTilt - dt * 4.6);
    hero.userData.sprite.position.y = hero.userData.spriteHeight * 0.5 + Math.abs(Math.sin(hero.userData.bob)) * 0.08;
    hero.userData.sprite.rotation.z = -hero.userData.attackTilt * 0.08;
    hero.userData.aura.material.opacity = 0.24 + Math.abs(Math.sin(hero.userData.bob * 0.6)) * 0.12;
    orientSpriteActor(hero, Math.sin(hero.userData.facingAngle || 0));
}

function regenerateResources(dt) {
    state.profile.currentHp = Math.min(state.profile.derivedStats.maxHp, state.profile.currentHp + dt * 1.2);
    state.profile.currentMp = Math.min(state.profile.derivedStats.maxMp, state.profile.currentMp + dt * 6.5);
}

function updateCamera() {
    const target = state.world.hero.position;
    const camPos = new THREE.Vector3(target.x, 32, target.z + 22);
    state.world.camera.position.lerp(camPos, 0.08);
    state.world.camera.lookAt(target.x, 0.5, target.z + 1.8);
}

function updateProfileLocation() {
    const zoneId = getCurrentZone();
    state.profile.location.zoneId = zoneId;
    state.profile.location.x = state.world.hero.position.x;
    state.profile.location.z = state.world.hero.position.z;
    if (zoneId !== 'village') state.profile.autoBattleState.lastZoneId = zoneId;
}

function updateSkillButtons() {
    [refs.skill1Btn, refs.skill2Btn].forEach((button, index) => {
        const skillId = state.profile.skillBar[index];
        if (!skillId) {
            button.disabled = true;
            return;
        }
        button.disabled = false;
        const cooldown = Math.max(0, (state.skillCooldowns[skillId] || 0) - performance.now());
        button.textContent = cooldown > 0
            ? `${state.worldData.skills[skillId].name}\n${(cooldown / 1000).toFixed(1)}s`
            : state.worldData.skills[skillId].name;
    });
}

function renderFrame() {
    updateTargetLabel();
    refreshHud();
    updateSkillButtons();
    if (!refs.inventoryPanel.classList.contains('hidden')) renderInventory();
    if (!refs.questPanel.classList.contains('hidden')) renderQuestPanel();
    state.world.renderer.render(state.world.scene, state.world.camera);
}

function connectSocket() {
    if (state.ws) {
        try { state.ws.close(); } catch (error) { /* ignore */ }
    }
    const socketUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    state.ws = new WebSocket(socketUrl);
    state.ws.addEventListener('open', () => {
        state.ws.send(JSON.stringify({ type: 'hello', userId: state.userId, nickname: state.profile.nickname }));
    });
    state.ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'presence:snapshot') {
            state.onlinePlayers = message.players || [];
            updateRemotePlayers();
        }
    });
}

function applyClassSelection(classId) {
    const classData = getClassData(classId);
    const inventory = getStarterInventory(classId);
    state.profile.classId = classId;
    state.profile.baseStats = clone(classData.baseStats);
    state.profile.inventory = inventory;
    state.profile.equipment = {
        weapon: clone(inventory[0]),
        armor: clone(inventory[1]),
        ring: clone(inventory[2])
    };
    state.profile.learnedSkills = classData.starterSkills.slice();
    state.profile.skillBar = classData.starterSkills.slice(0, 2);
    state.profile.location = { zoneId: 'village', x: zoneLayout.village.x - 8, z: 0 };
    state.profile.autoBattleState = { enabled: false, lastZoneId: 'meadow', autoQuest: true };
    state.profile.currentHp = classData.baseStats.maxHp;
    computeDerivedStats(state.profile);
    state.profile.currentMp = state.profile.derivedStats.maxMp;
}

async function bootstrapProfile(nickname) {
    const params = new URLSearchParams({ userId: state.userId, nickname });
    const response = await fetch(`/api/bootstrap?${params.toString()}`);
    const data = await response.json();
    state.worldData = data.world;
    state.profile = data.profile;
    state.profile.nickname = nickname || state.profile.nickname || '별빛 모험가';
    localStorage.setItem('kidRpgNickname', state.profile.nickname);
    ensureDailyQuest();
    computeDerivedStats(state.profile);
    refs.nicknameInput.value = state.profile.nickname;
    return data.offlineReward;
}

function populateClassCards() {
    refs.classGrid.innerHTML = '';
    Object.values(state.worldData.classes).forEach((classData) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'class-item';
        button.dataset.classId = classData.id;
        button.innerHTML = `<strong style="color:${classData.color}">${classData.name}</strong><p>${classData.flavor}</p>`;
        button.addEventListener('click', () => {
            audio.ensureContext();
            audio.playUi();
            applyClassSelection(classData.id);
            refs.classModal.classList.remove('active');
            ensureHeroModel();
            teleportToZone('village', false);
            refreshHud();
            updateOrientationGuard();
            syncProfileToServer();
        });
        refs.classGrid.appendChild(button);
    });
}

function showOfflineReward(reward) {
    if (!reward) return;
    refs.offlineRewardText.innerHTML = `<div>자동 사냥 시간: ${reward.minutes}분</div><div>획득 EXP: ${reward.exp}</div><div>획득 골드: ${reward.gold}</div>`;
    refs.offlineModal.classList.add('active');
}

function enhanceWeapon() {
    const weapon = state.profile.equipment.weapon;
    if (!weapon) {
        showToast('장착된 무기가 없습니다');
        return;
    }
    const cost = 70 + (weapon.enhance || 0) * 45;
    if (state.profile.gold < cost) {
        showToast('강화 골드가 부족합니다');
        return;
    }
    state.profile.gold -= cost;
    weapon.enhance = (weapon.enhance || 0) + 1;
    const inventoryItem = state.profile.inventory.find((item) => item.uid === weapon.uid);
    if (inventoryItem) inventoryItem.enhance = weapon.enhance;
    computeDerivedStats(state.profile);
    audio.playUi();
    showToast(`무기 강화 +${weapon.enhance}`);
    syncProfileToServer();
}

function equipItem(uid) {
    const item = state.profile.inventory.find((entry) => entry.uid === uid);
    if (!item) return;
    const template = getItemTemplate(item.itemId);
    if (template.classId && template.classId !== state.profile.classId) {
        showToast('현재 직업은 장착할 수 없습니다');
        return;
    }
    state.profile.equipment[template.slot] = clone(item);
    computeDerivedStats(state.profile);
    audio.playUi();
    showToast(`${template.name} 장착`);
    syncProfileToServer();
}

function useScroll(uid) {
    const item = state.profile.inventory.find((entry) => entry.uid === uid);
    if (!item) return;
    const template = getItemTemplate(item.itemId);
    if (template.classId && template.classId !== state.profile.classId) {
        showToast('현재 직업과 맞지 않는 주문서입니다');
        return;
    }
    const skillId = template.unlockSkillId;
    if (!state.profile.learnedSkills.includes(skillId)) {
        state.profile.learnedSkills.push(skillId);
        if (!state.profile.skillBar[0]) state.profile.skillBar[0] = skillId;
        else if (!state.profile.skillBar[1]) state.profile.skillBar[1] = skillId;
        showToast(`${state.worldData.skills[skillId].name} 해금`);
    } else {
        state.profile.gold += 40;
        showToast('이미 익힌 주문서라 골드로 환전했습니다');
    }
    state.profile.inventory = state.profile.inventory.filter((entry) => entry.uid !== uid);
    syncProfileToServer();
}

function updateJoystick(event) {
    const rect = refs.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const radius = rect.width * 0.34;
    const length = Math.hypot(dx, dy);
    const clamp = length > radius ? radius / length : 1;
    const x = dx * clamp;
    const y = dy * clamp;
    refs.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    state.joystick.x = x / radius;
    state.joystick.y = y / radius;
}

function resetJoystick() {
    state.joystick.active = false;
    state.joystick.pointerId = -1;
    state.joystick.x = 0;
    state.joystick.y = 0;
    refs.joystickKnob.style.transform = 'translate(-50%, -50%)';
}

function bindUi() {
    refs.startBtn.addEventListener('click', async () => {
        refs.startBtn.disabled = true;
        const originalText = refs.startBtn.textContent;
        refs.startBtn.textContent = '연결 중...';
        try {
            const nickname = refs.nicknameInput.value.trim() || state.nickname || '별빛 모험가';
            audio.ensureContext();
            audio.playUi();
            const offlineReward = await bootstrapProfile(nickname);
            buildWorld();
            populateClassCards();
            ensureHeroModel();
            connectSocket();
            refreshHud();
            refs.intro.classList.remove('active');
            if (!state.profile.classId) refs.classModal.classList.add('active');
            if (offlineReward) showOfflineReward(offlineReward);
            audio.applySettings();
            tryLockLandscape();
            updateOrientationGuard();
        } catch (error) {
            console.error(error);
            showToast('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            refs.startBtn.textContent = originalText;
            refs.startBtn.disabled = false;
        }
    });

    refs.offlineCloseBtn.addEventListener('click', () => {
        refs.offlineModal.classList.remove('active');
        updateOrientationGuard();
    });
    refs.inventoryBtn.addEventListener('click', () => openPanel('inventoryPanel'));
    refs.questBtn.addEventListener('click', () => openPanel('questPanel'));
    refs.optionsBtn.addEventListener('click', () => openPanel('optionsPanel'));
    refs.panelBackdrop.addEventListener('click', closePanels);
    document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', closePanels));

    refs.inventoryList.addEventListener('click', (event) => {
        const equipUid = event.target.getAttribute('data-equip-item');
        const scrollUid = event.target.getAttribute('data-use-scroll');
        if (equipUid) equipItem(equipUid);
        if (scrollUid) useScroll(scrollUid);
    });

    refs.enhanceBtn.addEventListener('click', enhanceWeapon);
    refs.autoBtn.addEventListener('click', () => {
        audio.ensureContext();
        audio.playUi();
        state.profile.autoBattleState.enabled = !state.profile.autoBattleState.enabled;
        showToast(state.profile.autoBattleState.enabled ? '자동 사냥 시작' : '자동 사냥 종료');
        syncProfileToServer();
    });
    refs.autoQuestBtn.addEventListener('click', () => {
        audio.ensureContext();
        audio.playUi();
        beginQuestTracking(false);
    });
    refs.teleportBtn.addEventListener('click', () => {
        audio.ensureContext();
        audio.playUi();
        beginQuestTracking(true);
    });
    refs.questCard.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        audio.ensureContext();
        audio.playUi();
        beginQuestTracking(false);
    });
    refs.basicAttackBtn.addEventListener('click', () => {
        audio.ensureContext();
        performBasicAttack();
    });
    refs.skill1Btn.addEventListener('click', () => {
        audio.ensureContext();
        castSkill(0);
    });
    refs.skill2Btn.addEventListener('click', () => {
        audio.ensureContext();
        castSkill(1);
    });

    refs.bgmToggle.addEventListener('change', () => {
        state.profile.audioSettings.bgmEnabled = refs.bgmToggle.checked;
        audio.applySettings();
        syncProfileToServer();
    });
    refs.sfxToggle.addEventListener('change', () => {
        state.profile.audioSettings.sfxEnabled = refs.sfxToggle.checked;
        audio.applySettings();
        syncProfileToServer();
    });

    window.addEventListener('resize', () => {
        updateOrientationGuard();
        if (!state.world.camera) return;
        const aspect = window.innerWidth / window.innerHeight;
        if (state.world.camera.isOrthographicCamera) {
            const frustumHeight = state.world.camera.userData.frustumHeight || 30;
            state.world.camera.left = -(frustumHeight * aspect) / 2;
            state.world.camera.right = (frustumHeight * aspect) / 2;
            state.world.camera.top = frustumHeight / 2;
            state.world.camera.bottom = -frustumHeight / 2;
        } else {
            state.world.camera.aspect = aspect;
        }
        state.world.camera.updateProjectionMatrix();
        state.world.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('orientationchange', updateOrientationGuard);
    window.addEventListener('beforeunload', () => syncProfileToServer());

    window.addEventListener('keydown', (event) => {
        if (event.key === 'w' || event.key === 'ArrowUp') state.keyboard.up = true;
        if (event.key === 's' || event.key === 'ArrowDown') state.keyboard.down = true;
        if (event.key === 'a' || event.key === 'ArrowLeft') state.keyboard.left = true;
        if (event.key === 'd' || event.key === 'ArrowRight') state.keyboard.right = true;
        if (event.key === ' ') performBasicAttack();
        if (event.key === '1') castSkill(0);
        if (event.key === '2') castSkill(1);
    });
    window.addEventListener('keyup', (event) => {
        if (event.key === 'w' || event.key === 'ArrowUp') state.keyboard.up = false;
        if (event.key === 's' || event.key === 'ArrowDown') state.keyboard.down = false;
        if (event.key === 'a' || event.key === 'ArrowLeft') state.keyboard.left = false;
        if (event.key === 'd' || event.key === 'ArrowRight') state.keyboard.right = false;
    });

    refs.joystickZone.addEventListener('pointerdown', (event) => {
        refs.joystickZone.setPointerCapture(event.pointerId);
        state.joystick.active = true;
        state.joystick.pointerId = event.pointerId;
        updateJoystick(event);
    });
    refs.joystickZone.addEventListener('pointermove', (event) => {
        if (!state.joystick.active || state.joystick.pointerId !== event.pointerId) return;
        updateJoystick(event);
    });
    refs.joystickZone.addEventListener('pointerup', resetJoystick);
    refs.joystickZone.addEventListener('pointercancel', resetJoystick);
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    if (!state.profile || !state.world.scene || !state.world.hero) return;
    const dt = Math.min(0.033, state.world.clock.getDelta());
    if (!refs.orientationGuard.classList.contains('active')) {
        handleAutoBehavior(dt);
        const move = getMoveVector();
        if (move.lengthSq() > 0.001) moveHero(move, dt);
        regenerateResources(dt);
        pickUpNearbyDrops();
        updateEnemies(dt);
        updateDrops(dt);
        updateEffects(dt);
        updateHeroPresentation(dt);
        updateRemoteActors(dt);
        updateProfileLocation();
        updateCamera();
        sendPresence();
        if (performance.now() - state.saveTimer > 4000) {
            state.saveTimer = performance.now();
            syncProfileToServer();
        }
    }
    renderFrame();
}

function init() {
    applySkinToRoot(refs.app, state.skin);
    bindUi();
    updateOrientationGuard();
    refs.nicknameInput.value = state.nickname;
    gameLoop();
}

init();

const shopOffers = [
    {
        id: 'hp_bundle',
        title: 'HP 포션 x5',
        desc: '자동물약 유지용 기본 묶음',
        cost: 45,
        currency: 'gold',
        reward: { hpPotion: 5 }
    },
    {
        id: 'mp_bundle',
        title: 'MP 포션 x3',
        desc: '스킬 순환용 마나 포션',
        cost: 35,
        currency: 'gold',
        reward: { mpPotion: 3 }
    },
    {
        id: 'starter_cache',
        title: '초보 보급 상자',
        desc: '골드와 포션을 동시에 보충',
        cost: 60,
        currency: 'points',
        reward: { gold: 120, hpPotion: 4, mpPotion: 2 }
    }
];

function getSkillButtons() {
    return [refs.skill1Btn, refs.skill2Btn, refs.skill3Btn, refs.skill4Btn];
}

function showStoryModal(forceOpen = false) {
    if (!state.profile || (!forceOpen && state.profile.storyFlags.introSeen)) return;
    const classData = getClassSkillPackage(state.profile.classId) || { name: '모험가' };
    refs.storyZoneLabel.textContent = `${getZoneDefinition('village').name} 브리핑`;
    refs.storyTitle.textContent = `${classData.name} 첫 임무`;
    refs.storyCopy.textContent = '별빛 마을에서 정비를 마친 뒤 초보 사냥터로 워프해 슬라임을 정리하고 첫 스킬북과 장비를 확보하세요.';
    refs.storyModal.classList.add('active');
    state.profile.storyFlags.introSeen = true;
}

function hideStoryModal() {
    refs.storyModal.classList.remove('active');
    updateOrientationGuard();
}

function renderServicePanel() {
    refs.serviceSummary.innerHTML = `
        <strong>${state.profile.location.zoneId.toUpperCase()}</strong>
        <div>HP 포션 ${state.profile.consumables.hpPotion} / MP 포션 ${state.profile.consumables.mpPotion}</div>
        <div>자동물약 ${state.profile.quickToggles.autoPotion ? 'ON' : 'OFF'} · 자동버프 ${state.profile.quickToggles.autoBuff ? 'ON' : 'OFF'}</div>
        <div>학습 스킬 ${state.profile.learnedSkills.length}개 · 메인 퀘스트 ${getMainQuest() ? '진행중' : '완료'}</div>
    `;
}

function renderShopPanelEnhanced() {
    refs.shopList.innerHTML = '';
    shopOffers.forEach((offer) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <strong>${offer.title}</strong>
            <div class="meta">${offer.desc}</div>
            <div class="meta">가격: ${offer.cost} ${offer.currency === 'gold' ? '골드' : '포인트'}</div>
            <div class="actions">
                <button type="button" data-buy-shop="${offer.id}">구매</button>
            </div>
        `;
        refs.shopList.appendChild(card);
    });
}

function renderMailPanelEnhanced() {
    refs.mailList.innerHTML = '';
    if (!state.profile.mailbox.length) {
        refs.mailList.innerHTML = '<div class="item-card"><strong>우편 없음</strong><div class="meta">지급된 우편이 없습니다.</div></div>';
        return;
    }
    state.profile.mailbox.forEach((mail) => {
        const rewardBits = [];
        if (mail.reward.gold) rewardBits.push(`골드 ${mail.reward.gold}`);
        if (mail.reward.hpPotion) rewardBits.push(`HP 포션 ${mail.reward.hpPotion}`);
        if (mail.reward.mpPotion) rewardBits.push(`MP 포션 ${mail.reward.mpPotion}`);
        if (mail.reward.points) rewardBits.push(`포인트 ${mail.reward.points}`);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <strong>${mail.title}</strong>
            <div class="meta">${mail.body}</div>
            <div class="meta">${rewardBits.join(' / ') || '보상 없음'}</div>
            <div class="actions">
                <button type="button" data-claim-mail="${mail.id}" ${mail.claimed ? 'disabled' : ''}>${mail.claimed ? '수령 완료' : '받기'}</button>
            </div>
        `;
        refs.mailList.appendChild(card);
    });
}

function renderDungeonPanelEnhanced() {
    const entries = [
        {
            id: 'meadow',
            title: '초보 사냥터',
            desc: '슬라임 중심 파밍 구역',
            requirement: '입장 제한 없음',
            free: true
        },
        {
            id: 'canyon',
            title: '협곡 사냥터',
            desc: '중급 파밍과 고급 스킬북 드랍',
            requirement: '권장 전투력 140'
        },
        {
            id: 'shrine',
            title: '보스 제단',
            desc: '전설 스킬북 드랍 보스 구역',
            requirement: '권장 전투력 210'
        }
    ];
    refs.dungeonList.innerHTML = '';
    entries.forEach((entry) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <strong>${entry.title}</strong>
            <div class="meta">${entry.desc}</div>
            <div class="meta">${entry.requirement}</div>
            <div class="actions">
                <button type="button" data-enter-zone="${entry.id}">${entry.free ? '즉시 이동' : '입장'}</button>
            </div>
        `;
        refs.dungeonList.appendChild(card);
    });
}

function claimMail(mailId = '') {
    const targets = state.profile.mailbox.filter((mail) => !mail.claimed && (!mailId || mail.id === mailId));
    if (!targets.length) {
        showToast('받을 우편이 없습니다');
        return;
    }
    targets.forEach((mail) => {
        mail.claimed = true;
        awardRewards(mail.reward, mail.title);
        grantConsumables(mail.reward);
    });
    showToast(`우편 ${targets.length}건 수령`);
    syncProfileToServer();
}

function buyShopOffer(offerId) {
    const offer = shopOffers.find((entry) => entry.id === offerId);
    if (!offer) return;
    if (offer.currency === 'gold') {
        if (state.profile.gold < offer.cost) {
            showToast('골드가 부족합니다');
            return;
        }
        state.profile.gold -= offer.cost;
    } else {
        if (state.profile.currencies.points < offer.cost) {
            showToast('포인트가 부족합니다');
            return;
        }
        state.profile.currencies.points -= offer.cost;
    }
    awardRewards(offer.reward, offer.title);
    grantConsumables(offer.reward);
    showToast(`${offer.title} 구매 완료`);
    syncProfileToServer();
}

function consumePotion(kind) {
    const isHp = kind === 'hp';
    const key = isHp ? 'hpPotion' : 'mpPotion';
    if (state.profile.consumables[key] <= 0) return false;
    state.profile.consumables[key] -= 1;
    if (isHp) {
        state.profile.currentHp = Math.min(state.profile.derivedStats.maxHp, state.profile.currentHp + state.profile.derivedStats.maxHp * 0.42);
        createRingEffect(state.world.hero.position, '#ff9aa2', 3.2, 0.2);
    } else {
        state.profile.currentMp = Math.min(state.profile.derivedStats.maxMp, state.profile.currentMp + state.profile.derivedStats.maxMp * 0.4);
        createRingEffect(state.world.hero.position, '#8ecae6', 3.2, 0.2);
    }
    state.autoPotionAt = performance.now() + 1800;
    showToast(`${isHp ? 'HP' : 'MP'} 포션 사용`);
    return true;
}

function clearExpiredBuffs() {
    let changed = false;
    Object.entries(state.profile.activeBuffs || {}).forEach(([skillId, buff]) => {
        if (!buff?.active) return;
        if (buff.expiresAt <= performance.now()) {
            delete state.profile.activeBuffs[skillId];
            changed = true;
        }
    });
    if (changed) computeDerivedStats(state.profile);
}

function applyBuffSkill(skillId, silent = false) {
    const skill = state.worldData.skills[skillId];
    if (!skill || skill.kind !== 'buff') return false;
    const now = performance.now();
    if ((state.skillCooldowns[skillId] || 0) > now) return false;
    const manaCost = getSkillManaCost(skillId);
    if (state.profile.currentMp < manaCost) return false;
    state.profile.currentMp = Math.max(0, state.profile.currentMp - manaCost);
    state.skillCooldowns[skillId] = now + skill.cooldownMs;
    state.profile.activeBuffs[skillId] = {
        active: true,
        expiresAt: now + skill.durationMs
    };
    computeDerivedStats(state.profile);
    createRingEffect(state.world.hero.position, getSkillTierColor(skillId), 4.4, 0.26);
    if (!silent) showToast(`${skill.name} 활성화`);
    return true;
}

function maybeAutoUsePotion() {
    if (!state.profile.quickToggles.autoPotion || performance.now() < state.autoPotionAt) return;
    if (state.profile.currentHp / Math.max(1, state.profile.derivedStats.maxHp) <= 0.45) {
        consumePotion('hp');
        return;
    }
    if (state.profile.currentMp / Math.max(1, state.profile.derivedStats.maxMp) <= 0.22) {
        consumePotion('mp');
    }
}

function maybeAutoCastBuff() {
    if (!state.profile.quickToggles.autoBuff) return;
    const skillId = getBuffSkillId();
    if (!skillId || !state.profile.learnedSkills.includes(skillId)) return;
    const active = state.profile.activeBuffs[skillId];
    if (active?.active && active.expiresAt - performance.now() > 1000) return;
    applyBuffSkill(skillId, true);
}

refreshHud = function refreshHudEnhanced() {
    if (!state.profile) return;
    refs.app.dataset.zone = state.profile.location.zoneId;
    refs.playerAvatar.dataset.class = state.profile.classId || 'warrior';
    const zone = getZoneDefinition(state.profile.location.zoneId);
    const mainQuest = getMainQuest();
    refs.zoneLabel.textContent = `${zone.name} · ${zone.label}`;
    refs.playerName.textContent = state.profile.nickname;
    refs.levelLabel.textContent = `${state.profile.level}`;
    refs.powerLabel.textContent = `${state.profile.powerScore}`;
    refs.goldLabel.textContent = `${state.profile.gold}`;
    refs.pointLabel.textContent = `${state.profile.currencies.points}`;
    refs.cashLabel.textContent = `${state.profile.currencies.cash}`;
    refs.expBar.style.width = `${Math.max(0, Math.min(100, (state.profile.exp / state.profile.expMax) * 100))}%`;
    refs.expLabel.textContent = `${state.profile.exp} / ${state.profile.expMax} EXP`;
    refs.hpBar.style.width = `${Math.max(0, Math.min(100, (state.profile.currentHp / state.profile.derivedStats.maxHp) * 100))}%`;
    refs.hpLabel.textContent = `${Math.round(state.profile.currentHp)} / ${state.profile.derivedStats.maxHp}`;
    refs.mpBar.style.width = `${Math.max(0, Math.min(100, (state.profile.currentMp / state.profile.derivedStats.maxMp) * 100))}%`;
    refs.mpLabel.textContent = `${Math.round(state.profile.currentMp)} / ${state.profile.derivedStats.maxMp}`;
    refs.combatState.textContent = state.profile.autoBattleState.enabled
        ? (state.profile.autoBattleState.autoQuest ? '자동 퀘스트 추적' : '자동 사냥')
        : '수동 조작';
    refs.autoBtn.textContent = state.profile.autoBattleState.enabled ? 'AUTO ON' : 'AUTO';
    refs.autoQuestBtn.textContent = state.profile.autoBattleState.autoQuest ? 'AUTO ON' : 'AUTO';
    refs.onlineLabel.textContent = `온라인 ${Math.max(1, state.onlinePlayers.length)}명`;
    refs.bgmToggle.checked = state.profile.audioSettings.bgmEnabled;
    refs.sfxToggle.checked = state.profile.audioSettings.sfxEnabled;
    refs.autoPotionState.textContent = `AUTO POT ${state.profile.quickToggles.autoPotion ? 'ON' : 'OFF'} · HP ${state.profile.consumables.hpPotion}`;
    refs.autoBuffState.textContent = `AUTO BUFF ${state.profile.quickToggles.autoBuff ? 'ON' : 'OFF'}`;
    refs.autoPotionState.classList.toggle('active', state.profile.quickToggles.autoPotion);
    refs.autoBuffState.classList.toggle('active', state.profile.quickToggles.autoBuff);
    if (mainQuest) {
        const tracker = getQuestTrackerValue(mainQuest.id);
        refs.questTitle.textContent = mainQuest.name;
        refs.questDesc.textContent = `${mainQuest.summary} (${tracker}/${mainQuest.objective.count})`;
    } else {
        refs.questTitle.textContent = '메인 퀘스트 완료';
        refs.questDesc.textContent = '추가 챕터를 바로 이어붙일 수 있는 상태입니다.';
    }

    refs.buffStrip.innerHTML = '';
    const buffs = Object.entries(state.profile.activeBuffs || {}).filter(([, buff]) => buff?.active);
    if (!buffs.length) {
        refs.buffStrip.innerHTML = '<span class="buff-pill">활성 버프 없음</span>';
    } else {
        buffs.forEach(([skillId, buff]) => {
            const chip = document.createElement('span');
            chip.className = 'buff-pill active';
            chip.textContent = `${state.worldData.skills[skillId].name} ${Math.max(0, Math.ceil((buff.expiresAt - performance.now()) / 1000))}s`;
            refs.buffStrip.appendChild(chip);
        });
    }
};

renderInventory = function renderInventoryEnhanced() {
    if (!state.profile) return;
    refs.equipmentList.innerHTML = '';
    Object.entries(state.profile.equipment).forEach(([slot, item]) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        if (!item) {
            card.innerHTML = `<strong>${slot}</strong><div class="meta">비어 있음</div>`;
        } else {
            const template = getItemTemplate(item.itemId);
            const rarity = getItemRarity(item);
            card.innerHTML = `
                <strong style="color:${rarity.color}">${template.name}</strong>
                <div class="meta">${rarity.label} · ${slot} · 강화 +${item.enhance || 0}</div>
                <div class="meta">공격 ${template.statBonus.attack || 0} / 방어 ${template.statBonus.defense || 0} / HP ${template.statBonus.maxHp || 0}</div>
            `;
        }
        refs.equipmentList.appendChild(card);
    });

    refs.inventoryList.innerHTML = `
        <div class="item-card">
            <strong>소모품 보유량</strong>
            <div class="meta">HP 포션 ${state.profile.consumables.hpPotion} / MP 포션 ${state.profile.consumables.mpPotion}</div>
        </div>
    `;

    state.profile.inventory.forEach((item) => {
        const template = getItemTemplate(item.itemId);
        const rarity = getItemRarity(item);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <strong style="color:${rarity.color}">${template.name}</strong>
            <div class="meta">${rarity.label} · ${template.slot}${template.classId ? ` · ${state.worldData.classes[template.classId].name}` : ''}</div>
            <div class="meta">${template.slot === 'scroll' ? '스킬 해금용 주문서' : `공격 ${template.statBonus.attack || 0} / 방어 ${template.statBonus.defense || 0} / HP ${template.statBonus.maxHp || 0}`}</div>
            <div class="actions">
                ${template.slot === 'scroll' ? `<button type="button" data-use-scroll="${item.uid}">사용</button>` : `<button type="button" data-equip-item="${item.uid}">장착</button>`}
            </div>
        `;
        refs.inventoryList.appendChild(card);
    });
};

renderQuestPanel = function renderQuestPanelEnhanced() {
    const mainQuest = getMainQuest();
    if (mainQuest) {
        const tracker = getQuestTrackerValue(mainQuest.id);
        refs.mainQuestDetail.innerHTML = `
            <strong>${mainQuest.name}</strong>
            <div>${mainQuest.summary}</div>
            <div>진행도 ${tracker} / ${mainQuest.objective.count}</div>
            <div>보상 EXP ${mainQuest.rewards.exp} / 골드 ${mainQuest.rewards.gold}</div>
        `;
    } else {
        refs.mainQuestDetail.innerHTML = `
            <strong>메인 퀘스트 완료</strong>
            <div>다음 스토리 구간을 바로 이어 붙일 수 있게 열어둔 상태입니다.</div>
        `;
    }
    ensureDailyQuest();
    refs.dailyQuestDetail.innerHTML = `
        <strong>${state.worldData.dailyQuest.name}</strong>
        <div>${state.worldData.dailyQuest.summary}</div>
        <div>진행도 ${state.profile.dailyQuestProgress.count} / ${state.worldData.dailyQuest.objective.count}</div>
        <div>보상 EXP ${state.worldData.dailyQuest.rewards.exp} / 골드 ${state.worldData.dailyQuest.rewards.gold}</div>
    `;
};

updateTargetLabel = function updateTargetLabelEnhanced() {
    const enemy = getNearestEnemy(16);
    refs.targetLabel.textContent = enemy ? `${enemy.def.name} · HP ${Math.max(0, Math.round(enemy.hp))}` : '대상 없음';
};

useScroll = function useScrollEnhanced(uid) {
    const item = state.profile.inventory.find((entry) => entry.uid === uid);
    if (!item) return;
    const template = getItemTemplate(item.itemId);
    if (template.classId && template.classId !== state.profile.classId) {
        showToast('현재 직업과 맞지 않는 스킬북입니다');
        return;
    }
    const unlocked = grantSkill(template.unlockSkillId, '스킬북 해금');
    if (!unlocked) {
        state.profile.currencies.points += 20;
        showToast('이미 배운 스킬이라 포인트로 전환했습니다');
    }
    state.profile.inventory = state.profile.inventory.filter((entry) => entry.uid !== uid);
    syncProfileToServer();
};

castSkill = function castSkillEnhanced(slotIndex) {
    if (!state.profile) return;
    const skillId = state.profile.skillBar[slotIndex];
    if (!skillId) {
        showToast('아직 해금되지 않은 슬롯입니다');
        return;
    }
    const skill = state.worldData.skills[skillId];
    if (skill.kind === 'buff') {
        if (!applyBuffSkill(skillId)) showToast('버프를 사용할 수 없습니다');
        return;
    }
    const now = performance.now();
    if ((state.skillCooldowns[skillId] || 0) > now) return;
    const manaCost = getSkillManaCost(skillId);
    if (state.profile.currentMp < manaCost) {
        showToast('마나가 부족합니다');
        return;
    }
    const target = getNearestEnemy(skill.range || 12);
    if (!target) {
        showToast('사정거리 안에 대상이 없습니다');
        return;
    }
    state.skillCooldowns[skillId] = now + skill.cooldownMs;
    state.profile.currentMp = Math.max(0, state.profile.currentMp - manaCost);
    state.world.hero.userData.attackTilt = 1.2;
    const tierScale = skill.tier === 'legendary' ? 1.18 : skill.tier === 'advanced' ? 1.1 : 1;
    const damage = Math.round(state.profile.derivedStats.attack * skill.multiplier * currentZoneDamageScale() * tierScale);
    const fxColor = getSkillTierColor(skillId);
    if (skill.kind === 'shockwave' || skill.kind === 'meteor') {
        createRingEffect(target.mesh.position, fxColor, skill.tier === 'legendary' ? 8 : 6.2, 0.5);
    } else {
        createProjectileEffect(
            state.world.hero.position.clone().add(new THREE.Vector3(0, 2.3, 0)),
            target.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
            fxColor
        );
    }
    if (state.profile.classId === 'warrior') audio.playSwing();
    if (state.profile.classId === 'mage') audio.playSpell();
    if (state.profile.classId === 'ranger') audio.playArrow();
    state.world.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (enemy === target || enemy.mesh.position.distanceTo(target.mesh.position) <= skill.radius) {
            applyDamage(enemy, damage, skill.name);
        }
    });
};

handleAutoBehavior = function handleAutoBehaviorEnhanced(dt) {
    maybeAutoCastBuff();
    if (!state.profile.autoBattleState.enabled) return;
    const targetZoneId = state.profile.autoBattleState.autoQuest ? getQuestTargetZone() : state.profile.autoBattleState.lastZoneId;
    if (targetZoneId && state.profile.location.zoneId !== targetZoneId && performance.now() > state.autoTeleportAt) {
        teleportToZone(targetZoneId, true);
        state.autoTeleportAt = performance.now() + 1600;
        return;
    }
    const targetDrop = state.world.drops.find((drop) => drop.mesh.position.distanceTo(state.world.hero.position) < 6);
    if (targetDrop) {
        const direction = targetDrop.mesh.position.clone().sub(state.world.hero.position).setY(0).normalize();
        moveHero(direction, dt);
        return;
    }
    const mainQuest = getMainQuest();
    const preferredMonsterId = mainQuest && mainQuest.objective.kind === 'kill' ? mainQuest.objective.monsterId : '';
    const enemy = getNearestEnemy(18, preferredMonsterId);
    if (!enemy) return;
    const direction = enemy.mesh.position.clone().sub(state.world.hero.position).setY(0);
    const distance = direction.length();
    if (distance > 0.001) direction.normalize();
    if (distance > (state.profile.classId === 'warrior' ? 4.1 : 10.5)) {
        moveHero(direction, dt);
    } else {
        const skillIndex = state.profile.skillBar.findIndex((entry) => entry && state.worldData.skills[entry].kind !== 'buff' && (state.skillCooldowns[entry] || 0) <= performance.now());
        if (skillIndex >= 0 && Math.random() > 0.4) castSkill(skillIndex);
        else performBasicAttack();
    }
};

regenerateResources = function regenerateResourcesEnhanced(dt) {
    clearExpiredBuffs();
    maybeAutoCastBuff();
    maybeAutoUsePotion();
    state.profile.currentHp = Math.min(state.profile.derivedStats.maxHp, state.profile.currentHp + dt * 1.2);
    state.profile.currentMp = Math.min(state.profile.derivedStats.maxMp, state.profile.currentMp + dt * 6.5);
};

updateSkillButtons = function updateSkillButtonsEnhanced() {
    getSkillButtons().forEach((button, index) => {
        const skillId = state.profile.skillBar[index];
        if (!skillId) {
            button.disabled = true;
            button.textContent = index < 2 ? `스킬 ${index + 1}` : index === 2 ? '중급 스킬' : '전설 스킬';
            button.classList.remove('active');
            return;
        }
        const skill = state.worldData.skills[skillId];
        const cooldown = Math.max(0, (state.skillCooldowns[skillId] || 0) - performance.now());
        button.disabled = false;
        button.textContent = cooldown > 0
            ? `${getSkillTierLabel(skillId)}\n${(cooldown / 1000).toFixed(1)}s`
            : `${getSkillTierLabel(skillId)}\n${skill.name}`;
        button.classList.toggle('active', skill.kind === 'buff' && !!state.profile.activeBuffs[skillId]?.active);
        button.style.borderColor = `${getSkillTierColor(skillId)}55`;
    });
    refs.autoPotionBtn.textContent = `자동물약\n${state.profile.quickToggles.autoPotion ? 'ON' : 'OFF'}`;
    refs.autoBuffBtn.textContent = `자동버프\n${state.profile.quickToggles.autoBuff ? 'ON' : 'OFF'}`;
    refs.autoPotionBtn.classList.toggle('active', state.profile.quickToggles.autoPotion);
    refs.autoBuffBtn.classList.toggle('active', state.profile.quickToggles.autoBuff);
    refs.quickToggleBtn.textContent = state.ui.quickTrayOpen ? '닫기' : '퀵';
    refs.quickTray.classList.toggle('hidden', !state.ui.quickTrayOpen);
};

renderFrame = function renderFrameEnhanced() {
    updateTargetLabel();
    refreshHud();
    updateSkillButtons();
    if (!refs.servicePanel.classList.contains('hidden')) renderServicePanel();
    if (!refs.inventoryPanel.classList.contains('hidden')) renderInventory();
    if (!refs.questPanel.classList.contains('hidden')) renderQuestPanel();
    if (!refs.shopPanel.classList.contains('hidden')) renderShopPanelEnhanced();
    if (!refs.mailPanel.classList.contains('hidden')) renderMailPanelEnhanced();
    if (!refs.dungeonPanel.classList.contains('hidden')) renderDungeonPanelEnhanced();
    state.world.renderer.render(state.world.scene, state.world.camera);
};

applyClassSelection = function applyClassSelectionEnhanced(classId) {
    const classData = getClassData(classId);
    const inventory = getStarterInventory(classId);
    state.profile.classId = classId;
    state.profile.baseStats = clone(classData.baseStats);
    state.profile.inventory = inventory;
    state.profile.equipment = {
        weapon: clone(inventory[0]),
        armor: clone(inventory[1]),
        ring: clone(inventory[2])
    };
    state.profile.learnedSkills = classData.starterSkills.slice(0, 1);
    state.profile.skillBar = [classData.starterSkills[0], '', '', ''];
    state.profile.location = { zoneId: 'village', x: zoneLayout.village.x - 8, z: 0 };
    state.profile.autoBattleState = { enabled: false, lastZoneId: 'meadow', autoQuest: true };
    state.profile.quickToggles = { autoPotion: true, autoBuff: false };
    state.profile.storyFlags = { introSeen: false, meadowWarpHintSeen: false };
    state.profile.activeBuffs = {};
    state.profile.currentHp = classData.baseStats.maxHp;
    ensureProfileState();
    computeDerivedStats(state.profile);
    state.profile.currentMp = state.profile.derivedStats.maxMp;
};

bootstrapProfile = async function bootstrapProfileEnhanced(nickname) {
    const params = new URLSearchParams({ userId: state.userId, nickname });
    const response = await fetch(`/api/bootstrap?${params.toString()}`);
    const data = await response.json();
    state.worldData = data.world;
    state.profile = data.profile;
    state.profile.nickname = nickname || state.profile.nickname || '별빛 모험가';
    localStorage.setItem('kidRpgNickname', state.profile.nickname);
    ensureProfileState();
    ensureDailyQuest();
    computeDerivedStats(state.profile);
    refs.nicknameInput.value = state.profile.nickname;
    return data.offlineReward;
};

populateClassCards = function populateClassCardsEnhanced() {
    refs.classGrid.innerHTML = '';
    Object.values(state.worldData.classes).forEach((classData) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'class-item';
        button.dataset.classId = classData.id;
        button.innerHTML = `<strong style="color:${classData.color}">${classData.name}</strong><p>${classData.flavor}</p>`;
        button.addEventListener('click', () => {
            audio.ensureContext();
            audio.playUi();
            applyClassSelection(classData.id);
            refs.classModal.classList.remove('active');
            ensureHeroModel();
            teleportToZone('village', false);
            refreshHud();
            updateOrientationGuard();
            showStoryModal(true);
            syncProfileToServer();
        });
        refs.classGrid.appendChild(button);
    });
};

showOfflineReward = function showOfflineRewardEnhanced(reward) {
    if (!reward) return;
    refs.offlineRewardText.innerHTML = `
        <div>자동 사냥 시간: ${reward.minutes}분</div>
        <div>획득 EXP: ${reward.exp}</div>
        <div>획득 골드: ${reward.gold}</div>
    `;
    refs.offlineModal.classList.add('active');
};

function registerPwaSupport() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('Service worker registration failed', error);
        });
    }
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        state.deferredInstallPrompt = event;
        refs.installBtn.classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
        state.deferredInstallPrompt = null;
        refs.installBtn.classList.add('hidden');
        showToast('PWA 설치 완료');
    });
}

async function triggerInstallPrompt() {
    if (!state.deferredInstallPrompt) {
        showToast('현재 브라우저에서는 설치 프롬프트를 바로 띄울 수 없습니다');
        return;
    }
    await state.deferredInstallPrompt.prompt();
    state.deferredInstallPrompt = null;
    refs.installBtn.classList.add('hidden');
}

function bindEnhancementEvents() {
    refs.startBtn.addEventListener('click', () => {
        window.setTimeout(() => {
            if (state.profile?.classId && !refs.classModal.classList.contains('active') && !refs.offlineModal.classList.contains('active')) {
                showStoryModal(false);
            }
        }, 500);
    });
    refs.installBtn.addEventListener('click', () => {
        triggerInstallPrompt().catch((error) => console.error(error));
    });
    refs.storyWarpBtn.addEventListener('click', () => {
        hideStoryModal();
        teleportToZone('meadow', false);
        state.profile.storyFlags.meadowWarpHintSeen = true;
        beginQuestTracking(false);
        openPanel('questPanel');
    });
    refs.storyCloseBtn.addEventListener('click', hideStoryModal);
    refs.menuBtn.addEventListener('click', () => openPanel('servicePanel'));
    refs.openShopBtn.addEventListener('click', () => openPanel('shopPanel'));
    refs.openMailBtn.addEventListener('click', () => openPanel('mailPanel'));
    refs.openDungeonBtn.addEventListener('click', () => openPanel('dungeonPanel'));
    refs.openStoryBtn.addEventListener('click', () => showStoryModal(true));
    refs.quickToggleBtn.addEventListener('click', () => {
        state.ui.quickTrayOpen = !state.ui.quickTrayOpen;
    });
    refs.skill3Btn.addEventListener('click', () => {
        audio.ensureContext();
        castSkill(2);
    });
    refs.skill4Btn.addEventListener('click', () => {
        audio.ensureContext();
        castSkill(3);
    });
    refs.autoPotionBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.quickToggles.autoPotion = !state.profile.quickToggles.autoPotion;
        showToast(`자동물약 ${state.profile.quickToggles.autoPotion ? '활성화' : '비활성화'}`);
        syncProfileToServer();
    });
    refs.autoBuffBtn.addEventListener('click', () => {
        if (!state.profile) return;
        state.profile.quickToggles.autoBuff = !state.profile.quickToggles.autoBuff;
        showToast(`자동버프 ${state.profile.quickToggles.autoBuff ? '활성화' : '비활성화'}`);
        syncProfileToServer();
    });
    refs.shopList.addEventListener('click', (event) => {
        const offerId = event.target.getAttribute('data-buy-shop');
        if (offerId) buyShopOffer(offerId);
    });
    refs.mailList.addEventListener('click', (event) => {
        const mailId = event.target.getAttribute('data-claim-mail');
        if (mailId) claimMail(mailId);
    });
    refs.claimMailBtn.addEventListener('click', () => claimMail());
    refs.dungeonList.addEventListener('click', (event) => {
        const zoneId = event.target.getAttribute('data-enter-zone');
        if (!zoneId) return;
        teleportToZone(zoneId, zoneId !== 'meadow');
        closePanels();
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === '3') castSkill(2);
        if (event.key === '4') castSkill(3);
        if (event.key.toLowerCase() === 'q') state.ui.quickTrayOpen = !state.ui.quickTrayOpen;
    });
}

bindEnhancementEvents();
registerPwaSupport();
