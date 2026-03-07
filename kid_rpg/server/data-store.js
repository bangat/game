const fs = require('fs');
const path = require('path');
const {
    createBaseProfile,
    syncClassProfile,
    ensureDailyQuest,
    getOfflineRewards,
    computePowerScore,
    deepClone
} = require('./game-data');

const DB_PATH = path.join(__dirname, '..', 'data', 'profiles.local.json');

function ensureDbFile() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ profiles: {} }, null, 2), 'utf8');
    }
}

function readDb() {
    ensureDbFile();
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    try {
        return JSON.parse(raw);
    } catch (error) {
        return { profiles: {} };
    }
}

function writeDb(db) {
    ensureDbFile();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizeProfile(profile) {
    const base = createBaseProfile(profile.id, profile.nickname);
    const merged = {
        ...base,
        ...profile,
        baseStats: { ...base.baseStats, ...(profile.baseStats || {}) },
        equipment: { ...base.equipment, ...(profile.equipment || {}) },
        location: { ...base.location, ...(profile.location || {}) },
        autoBattleState: { ...base.autoBattleState, ...(profile.autoBattleState || {}) },
        quickToggles: { ...base.quickToggles, ...(profile.quickToggles || {}) },
        consumables: { ...base.consumables, ...(profile.consumables || {}) },
        currencies: { ...base.currencies, ...(profile.currencies || {}) },
        audioSettings: { ...base.audioSettings, ...(profile.audioSettings || {}) },
        offlineRewardState: { ...base.offlineRewardState, ...(profile.offlineRewardState || {}) },
        storyFlags: { ...base.storyFlags, ...(profile.storyFlags || {}) },
        activeBuffs: { ...base.activeBuffs, ...(profile.activeBuffs || {}) },
        mailbox: Array.isArray(profile.mailbox) ? profile.mailbox : base.mailbox,
        questProgress: {
            ...base.questProgress,
            ...(profile.questProgress || {}),
            tracker: { ...base.questProgress.tracker, ...((profile.questProgress && profile.questProgress.tracker) || {}) }
        },
        dailyQuestProgress: { ...base.dailyQuestProgress, ...(profile.dailyQuestProgress || {}) }
    };
    ensureDailyQuest(merged);
    if (merged.classId) syncClassProfile(merged);
    merged.powerScore = computePowerScore(merged);
    return merged;
}

function getProfile(userId, nickname) {
    const db = readDb();
    if (!db.profiles[userId]) {
        db.profiles[userId] = createBaseProfile(userId, nickname);
        writeDb(db);
    }
    const profile = normalizeProfile(db.profiles[userId]);
    db.profiles[userId] = profile;
    writeDb(db);
    const offlineReward = getOfflineRewards(profile);
    if (offlineReward) {
        db.profiles[userId] = profile;
        writeDb(db);
    }
    return { profile: deepClone(profile), offlineReward };
}

function saveProfile(profile) {
    const db = readDb();
    const normalized = normalizeProfile(profile);
    db.profiles[normalized.id] = normalized;
    writeDb(db);
    return deepClone(normalized);
}

function patchProfile(userId, patch) {
    const db = readDb();
    const current = normalizeProfile(db.profiles[userId] || createBaseProfile(userId));
    const next = normalizeProfile({
        ...current,
        ...patch,
        equipment: { ...current.equipment, ...(patch.equipment || {}) },
        location: { ...current.location, ...(patch.location || {}) },
        autoBattleState: { ...current.autoBattleState, ...(patch.autoBattleState || {}) },
        quickToggles: { ...current.quickToggles, ...(patch.quickToggles || {}) },
        consumables: { ...current.consumables, ...(patch.consumables || {}) },
        currencies: { ...current.currencies, ...(patch.currencies || {}) },
        audioSettings: { ...current.audioSettings, ...(patch.audioSettings || {}) },
        offlineRewardState: { ...current.offlineRewardState, ...(patch.offlineRewardState || {}) },
        storyFlags: { ...current.storyFlags, ...(patch.storyFlags || {}) },
        activeBuffs: { ...current.activeBuffs, ...(patch.activeBuffs || {}) },
        mailbox: Array.isArray(patch.mailbox) ? patch.mailbox : current.mailbox,
        questProgress: {
            ...current.questProgress,
            ...(patch.questProgress || {}),
            tracker: { ...current.questProgress.tracker, ...((patch.questProgress && patch.questProgress.tracker) || {}) }
        },
        dailyQuestProgress: { ...current.dailyQuestProgress, ...(patch.dailyQuestProgress || {}) }
    });
    db.profiles[userId] = next;
    writeDb(db);
    return deepClone(next);
}

function markLogout(userId) {
    const db = readDb();
    if (!db.profiles[userId]) return;
    db.profiles[userId].offlineRewardState = db.profiles[userId].offlineRewardState || {};
    db.profiles[userId].offlineRewardState.lastLogoutAt = Date.now();
    db.profiles[userId].offlineRewardState.pending = null;
    writeDb(db);
}

module.exports = {
    getProfile,
    saveProfile,
    patchProfile,
    markLogout
};
