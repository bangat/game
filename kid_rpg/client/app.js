import * as THREE from '/vendor/three/build/three.module.js';

const refs = {
    intro: document.getElementById('intro-screen'),
    orientationGuard: document.getElementById('orientation-guard'),
    classModal: document.getElementById('class-modal'),
    offlineModal: document.getElementById('offline-modal'),
    classGrid: document.getElementById('class-grid'),
    startBtn: document.getElementById('start-btn'),
    nicknameInput: document.getElementById('nickname-input'),
    offlineRewardText: document.getElementById('offline-reward-text'),
    offlineCloseBtn: document.getElementById('offline-close-btn'),
    zoneLabel: document.getElementById('zone-label'),
    playerName: document.getElementById('player-name'),
    onlineLabel: document.getElementById('online-label'),
    levelLabel: document.getElementById('level-label'),
    powerLabel: document.getElementById('power-label'),
    goldLabel: document.getElementById('gold-label'),
    expBar: document.getElementById('exp-bar'),
    expLabel: document.getElementById('exp-label'),
    questTitle: document.getElementById('quest-title'),
    questDesc: document.getElementById('quest-desc'),
    autoQuestBtn: document.getElementById('auto-quest-btn'),
    teleportBtn: document.getElementById('teleport-btn'),
    inventoryBtn: document.getElementById('inventory-btn'),
    questBtn: document.getElementById('quest-btn'),
    optionsBtn: document.getElementById('options-btn'),
    combatState: document.getElementById('auto-state-label'),
    hpBar: document.getElementById('hp-bar'),
    hpLabel: document.getElementById('hp-label'),
    targetLabel: document.getElementById('target-label'),
    panelBackdrop: document.getElementById('panel-backdrop'),
    inventoryPanel: document.getElementById('inventory-panel'),
    questPanel: document.getElementById('quest-panel'),
    optionsPanel: document.getElementById('options-panel'),
    equipmentList: document.getElementById('equipment-list'),
    inventoryList: document.getElementById('inventory-list'),
    mainQuestDetail: document.getElementById('main-quest-detail'),
    dailyQuestDetail: document.getElementById('daily-quest-detail'),
    enhanceBtn: document.getElementById('enhance-btn'),
    bgmToggle: document.getElementById('bgm-toggle'),
    sfxToggle: document.getElementById('sfx-toggle'),
    joystickZone: document.getElementById('joystick-zone'),
    joystickBase: document.getElementById('joystick-base'),
    joystickKnob: document.getElementById('joystick-knob'),
    basicAttackBtn: document.getElementById('basic-attack-btn'),
    skill1Btn: document.getElementById('skill-1-btn'),
    skill2Btn: document.getElementById('skill-2-btn'),
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

const state = {
    userId: localStorage.getItem('kidRpgUserId') || crypto.randomUUID(),
    nickname: localStorage.getItem('kidRpgNickname') || '',
    worldData: null,
    profile: null,
    ws: null,
    onlinePlayers: [],
    remotePlayers: new Map(),
    lastPresenceSent: 0,
    saveTimer: 0,
    autoTeleportAt: 0,
    toastTimer: 0,
    keyboard: { up: false, down: false, left: false, right: false },
    joystick: { active: false, pointerId: -1, x: 0, y: 0 },
    basicAttackAt: 0,
    skillCooldowns: {},
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
    profile.derivedStats = {
        maxHp: profile.baseStats.maxHp + bonus.maxHp,
        attack: profile.baseStats.attack + bonus.attack,
        defense: profile.baseStats.defense + bonus.defense,
        speed: profile.baseStats.speed
    };
    const gearPower = equipment.reduce((sum, item) => {
        if (!item) return sum;
        const template = getItemTemplate(item.itemId);
        return sum + (template ? template.power : 0) + item.enhance * 8;
    }, 0);
    profile.expMax = expForLevel(profile.level);
    profile.currentHp = Math.min(profile.derivedStats.maxHp, profile.currentHp || profile.derivedStats.maxHp);
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

function awardRewards(reward, sourceText) {
    const prevLevel = state.profile.level;
    state.profile.gold += reward.gold || 0;
    state.profile.exp += reward.exp || 0;
    while (state.profile.exp >= state.profile.expMax) {
        state.profile.exp -= state.profile.expMax;
        state.profile.level += 1;
        state.profile.expMax = expForLevel(state.profile.level);
        state.profile.currentHp = state.profile.derivedStats.maxHp;
    }
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
    state.uiOpen = id;
    refs.panelBackdrop.classList.remove('hidden');
    refs[id].classList.remove('hidden');
}

function closePanels() {
    state.uiOpen = '';
    refs.panelBackdrop.classList.add('hidden');
    refs.inventoryPanel.classList.add('hidden');
    refs.questPanel.classList.add('hidden');
    refs.optionsPanel.classList.add('hidden');
}

function updateOrientationGuard() {
    const needsLandscape = window.innerHeight > window.innerWidth && window.innerWidth < 1180;
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
    const zone = getZoneDefinition(state.profile.location.zoneId);
    const mainQuest = getMainQuest();
    refs.zoneLabel.textContent = `${zone.name} · ${zone.label}`;
    refs.playerName.textContent = state.profile.nickname;
    refs.levelLabel.textContent = `${state.profile.level}`;
    refs.powerLabel.textContent = `${state.profile.powerScore}`;
    refs.goldLabel.textContent = `${state.profile.gold}`;
    refs.expBar.style.width = `${Math.max(0, Math.min(100, (state.profile.exp / state.profile.expMax) * 100))}%`;
    refs.expLabel.textContent = `${state.profile.exp} / ${state.profile.expMax} EXP`;
    refs.hpBar.style.width = `${Math.max(0, Math.min(100, (state.profile.currentHp / state.profile.derivedStats.maxHp) * 100))}%`;
    refs.hpLabel.textContent = `${Math.round(state.profile.currentHp)} / ${state.profile.derivedStats.maxHp} HP`;
    refs.combatState.textContent = state.profile.autoBattleState.enabled ? '자동 사냥 진행 중' : '수동 조작';
    refs.autoBtn.textContent = state.profile.autoBattleState.enabled ? 'AUTO ON' : 'AUTO';
    refs.autoQuestBtn.textContent = state.profile.autoBattleState.autoQuest ? '자동 추적 ON' : '자동 추적 OFF';
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

function createFloor(zoneId) {
    const zone = zoneLayout[zoneId];
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width, 2, zone.depth),
        new THREE.MeshStandardMaterial({ color: zone.color, roughness: 0.88 })
    );
    floor.receiveShadow = true;
    floor.position.set(zone.x, -1, zone.z);
    state.world.zoneGroup.add(floor);

    const rim = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width + 1.1, 0.55, zone.depth + 1.1),
        new THREE.MeshStandardMaterial({ color: zone.accent, transparent: true, opacity: 0.28 })
    );
    rim.position.set(zone.x, 0.2, zone.z);
    state.world.zoneGroup.add(rim);
}

function addDecoration() {
    Object.keys(zoneLayout).forEach((zoneId) => createFloor(zoneId));
    const bridgeMaterial = new THREE.MeshStandardMaterial({ color: '#d0b48f', roughness: 0.92 });
    [31, 97, 165].forEach((x) => {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 10), bridgeMaterial);
        bridge.position.set(x, -0.35, 0);
        bridge.receiveShadow = true;
        state.world.zoneGroup.add(bridge);
    });

    const houseMat = new THREE.MeshStandardMaterial({ color: '#f4f1de', roughness: 0.9 });
    for (let i = 0; i < 3; i += 1) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), houseMat);
        base.position.set(-10 + i * 8, 1.5, -8 + (i % 2) * 12);
        base.castShadow = true;
        base.receiveShadow = true;
        state.world.zoneGroup.add(base);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.8, 4), new THREE.MeshStandardMaterial({ color: '#d1495b' }));
        roof.rotation.y = Math.PI * 0.25;
        roof.position.set(base.position.x, 4.8, base.position.z);
        roof.castShadow = true;
        state.world.zoneGroup.add(roof);
    }

    const treeMat = new THREE.MeshStandardMaterial({ color: '#2a9d8f', roughness: 0.84 });
    for (let i = 0; i < 10; i += 1) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4), new THREE.MeshStandardMaterial({ color: '#8d6e63' }));
        trunk.position.set(40 + (i * 3.5), 0.8, -12 + (i % 4) * 8);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), treeMat);
        crown.position.set(trunk.position.x, 3, trunk.position.z);
        trunk.castShadow = crown.castShadow = true;
        state.world.zoneGroup.add(trunk, crown);
    }

    const rockMat = new THREE.MeshStandardMaterial({ color: '#98a1b3', roughness: 0.95 });
    for (let i = 0; i < 12; i += 1) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + (i % 3) * 0.35), rockMat);
        rock.position.set(112 + i * 4, 1, -10 + (i % 5) * 5);
        rock.rotation.set(i * 0.2, i * 0.1, 0);
        rock.castShadow = true;
        state.world.zoneGroup.add(rock);
    }

    const altar = new THREE.Mesh(
        new THREE.CylinderGeometry(5.4, 6.4, 2.8, 8),
        new THREE.MeshStandardMaterial({ color: '#f4f1de', roughness: 0.86 })
    );
    altar.position.set(zoneLayout.shrine.x, 0.6, 0);
    altar.castShadow = true;
    altar.receiveShadow = true;
    state.world.zoneGroup.add(altar);
}

function createPlayerModel(classId, isRemote = false) {
    const classData = getClassData(classId || 'warrior');
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.65, 1.1, 6, 12),
        new THREE.MeshStandardMaterial({ color: classData.color, transparent: isRemote, opacity: isRemote ? 0.45 : 1 })
    );
    body.castShadow = true;
    body.position.y = 1.4;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#f8dbc4', transparent: isRemote, opacity: isRemote ? 0.45 : 1 })
    );
    head.position.y = 2.55;
    head.castShadow = true;
    group.add(head);

    const weaponColor = classId === 'mage' ? '#7dd3fc' : classId === 'ranger' ? '#a7f3d0' : '#ffd166';
    const weapon = new THREE.Mesh(
        classId === 'mage'
            ? new THREE.CylinderGeometry(0.08, 0.08, 1.8)
            : classId === 'ranger'
                ? new THREE.TorusGeometry(0.55, 0.08, 8, 16, Math.PI)
                : new THREE.BoxGeometry(0.16, 1.4, 0.2),
        new THREE.MeshStandardMaterial({ color: weaponColor, emissive: weaponColor, emissiveIntensity: isRemote ? 0.2 : 0.35, transparent: isRemote, opacity: isRemote ? 0.5 : 1 })
    );
    weapon.position.set(0.65, 1.65, 0.1);
    weapon.rotation.z = classId === 'ranger' ? Math.PI * 0.5 : -0.3;
    weapon.castShadow = true;
    group.add(weapon);
    group.userData = { body, head, weapon, bob: Math.random() * Math.PI * 2, attackTilt: 0 };
    return group;
}

function createEnemyModel(monsterId) {
    const group = new THREE.Group();
    let mesh;
    if (monsterId === 'slime') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 16), new THREE.MeshStandardMaterial({ color: '#64dfdf', emissive: '#29c7c7', emissiveIntensity: 0.2 }));
        mesh.scale.y = 0.7;
    } else if (monsterId === 'wolf') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1), new THREE.MeshStandardMaterial({ color: '#8d99ae' }));
    } else if (monsterId === 'wisp') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshStandardMaterial({ color: '#90e0ef', emissive: '#90e0ef', emissiveIntensity: 0.65 }));
    } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.8, 2.4), new THREE.MeshStandardMaterial({ color: '#9d0208', roughness: 0.82 }));
        mesh.position.y = 1.1;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
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
            mesh.position.set(point[0], 0.6, point[1]);
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
                home: new THREE.Vector3(point[0], 0.6, point[1]),
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
    scene.background = new THREE.Color('#bfe9ff');
    scene.fog = new THREE.Fog('#bfe9ff', 80, 260);

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(18, 28, 26);

    scene.add(new THREE.HemisphereLight('#ffffff', '#6ea8ff', 1.3));
    const sun = new THREE.DirectionalLight('#fff8e8', 1.4);
    sun.position.set(48, 60, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    scene.add(sun);

    const baseFloor = new THREE.Mesh(new THREE.PlaneGeometry(360, 160), new THREE.MeshStandardMaterial({ color: '#d9edf7', roughness: 0.95 }));
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -1.6;
    baseFloor.receiveShadow = true;
    scene.add(baseFloor);

    state.world.renderer = renderer;
    state.world.scene = scene;
    state.world.camera = camera;
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
    const target = getNearestEnemy(skill.range);
    if (!target) {
        showToast('사정거리 안에 대상이 없습니다');
        return;
    }
    state.skillCooldowns[skillId] = now + skill.cooldownMs;
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

function moveHero(direction, dt) {
    const speed = state.profile.derivedStats.speed * 4.2;
    state.world.hero.position.x += direction.x * speed * dt;
    state.world.hero.position.z += direction.z * speed * dt;
    state.world.hero.position.x = Math.max(state.world.groundBounds.minX, Math.min(state.world.groundBounds.maxX, state.world.hero.position.x));
    state.world.hero.position.z = Math.max(-18, Math.min(18, state.world.hero.position.z));
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
        enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);
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
    });
}

function updateHeroPresentation(dt) {
    const hero = state.world.hero;
    if (!hero) return;
    hero.userData.bob += dt * 8;
    hero.userData.attackTilt = Math.max(0, hero.userData.attackTilt - dt * 4.6);
    hero.userData.body.position.y = 1.4 + Math.abs(Math.sin(hero.userData.bob)) * 0.08;
    hero.userData.weapon.rotation.z = (state.profile.classId === 'ranger' ? Math.PI * 0.5 : -0.3) - hero.userData.attackTilt;
}

function updateCamera() {
    const target = state.world.hero.position;
    const camPos = new THREE.Vector3(target.x + 18, 24, target.z + 24);
    state.world.camera.position.lerp(camPos, 0.08);
    state.world.camera.lookAt(target.x + 2, 1.6, target.z + 1);
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
        button.innerHTML = `<strong style="color:${classData.color}">${classData.name}</strong><p>${classData.flavor}</p>`;
        button.addEventListener('click', () => {
            audio.ensureContext();
            audio.playUi();
            applyClassSelection(classData.id);
            refs.classModal.classList.remove('active');
            ensureHeroModel();
            teleportToZone('village', false);
            refreshHud();
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
        } finally {
            refs.startBtn.disabled = false;
        }
    });

    refs.offlineCloseBtn.addEventListener('click', () => refs.offlineModal.classList.remove('active'));
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
        state.profile.autoBattleState.autoQuest = !state.profile.autoBattleState.autoQuest;
        audio.ensureContext();
        audio.playUi();
        syncProfileToServer();
    });
    refs.teleportBtn.addEventListener('click', () => {
        teleportToZone(getQuestTargetZone(), true);
        syncProfileToServer();
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
        state.world.camera.aspect = window.innerWidth / window.innerHeight;
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
    bindUi();
    updateOrientationGuard();
    refs.nicknameInput.value = state.nickname;
    gameLoop();
}

init();
