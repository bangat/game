'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Data = require('../shared/data.js');

const Battle = require('../shared/battle.cjs');
const SCHEMA_VERSION = 6;
const VALID_SPECIES = new Set(Data.species.map((item) => item.id));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function boundedText(value, fallback, max = 20) {
  const text = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  return (text || fallback).slice(0, max);
}

function finiteNumber(value, fallback) {
  return value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function createCreature(speciesId, level = 1, nickname = '') {
  return {
    id: crypto.randomUUID(),
    speciesId: String(speciesId),
    nickname: boundedText(nickname, '', 18),
    level: Math.max(1, Math.min(50, Math.floor(Number(level) || 1))),
    xp: 0,
    hp: null,
    obtainedAt: Date.now()
  };
}

function createProfile(uid, nickname, starterIds = []) {
  const collection = starterIds.slice(0, 3).map((id) => createCreature(id));
  return {
    version: SCHEMA_VERSION,
    uid,
    nickname: boundedText(nickname, '숲길 탐험가'),
    characterId: 'original',
    adventurerName: '',
    lastSeenAt: Date.now(),
    collection,
    team: collection.map((item) => item.id),
    discoveries: collection.map((item) => item.speciesId),
    encyclopedia: { seen: collection.map(item => item.speciesId), claimed: [], milestones: [] },
    bonuses: { collection: 0 },
    mounts: {owned:[],equipped:''},
    expedition: {bosses:[],crystals:0,hatched:0,claimed:[],eggs:[],walk:0},
    gold: 0, resources: {berries:0,ore:0},
    supplies: { heals: 3, feeds: 0 },
    quest: { id: 'dew-sample', status: 'available', progress: 0, target: 3 },
    location: { x: 0, z: 22 },
    processedRewards: [],
    interruptedBattle: null,
    updatedAt: Date.now()
  };
}

function migrateProfile(input, uid, nickname, starterIds) {
  const base = createProfile(uid, nickname, starterIds);
  const old = input && typeof input === 'object' ? input : {};
  const rawCollection = Array.isArray(old.collection) ? old.collection : [];
  const collection = rawCollection.slice(0, 120).filter((item) => item && VALID_SPECIES.has(String(item.speciesId))).map((item) => ({
    id: boundedText(item && item.id, crypto.randomUUID(), 80),
    speciesId: boundedText(item.speciesId, starterIds[0] || 'dew_ladybird', 80),
    nickname: boundedText(item && item.nickname, '', 18),
    level: Math.max(1, Math.min(50, Math.floor(Number(item && item.level) || 1))),
    xp: Math.max(0, Math.floor(Number(item && item.xp) || 0)),
    hp: !item || item.hp == null || !Number.isFinite(Number(item.hp)) ? null : Math.max(0, Math.floor(Number(item.hp))),
    obtainedAt: Math.max(0, Number(item && item.obtainedAt) || Date.now())
  }));
  const normalizedCollection = collection.length ? collection : base.collection;
  if (Number(old.version || 0) < 4) normalizedCollection.forEach(item => { item.hp = Battle.statsForCreature(item).maxHealth; });
  const ids = new Set(collection.map((item) => item.id));
  const questDefinition = Data.quests.find(q => q.id === old.quest?.id) || Data.quests[0];
  const team = (Array.isArray(old.team) ? old.team : []).filter((id, i, all) => ids.has(id) && all.indexOf(id) === i).slice(0, 3);
  return {
    ...base,
    nickname: boundedText(old.nickname || nickname, base.nickname),
    adventurerName: /^[가-힣]{1,6}$/.test(old.adventurerName || '') ? old.adventurerName : '',
    lastSeenAt: Math.max(0, Number(old.lastSeenAt) || Date.now()),
    characterId: boundedText(old.characterId || old.character, base.characterId, 40),
    collection: normalizedCollection,
    team: Array.isArray(old.team) ? team : (collection.length ? collection.slice(0, 3).map((item) => item.id) : base.team),
    discoveries: [...new Set([...(Array.isArray(old.discoveries) ? old.discoveries.filter((id) => VALID_SPECIES.has(String(id))) : []), ...normalizedCollection.map((item) => item.speciesId)])].slice(0, 300),
    encyclopedia: {
      seen: [...new Set((Array.isArray(old.encyclopedia?.seen) ? old.encyclopedia.seen : [...(old.discoveries || []), ...normalizedCollection.map(c => c.speciesId)]).filter(id => VALID_SPECIES.has(id)))],
      claimed: [...new Set((Array.isArray(old.encyclopedia?.claimed) ? old.encyclopedia.claimed : []).filter(id => VALID_SPECIES.has(id)))],
      milestones: [...new Set((Array.isArray(old.encyclopedia?.milestones) ? old.encyclopedia.milestones : []).filter(n => Data.collectionMilestones.some(m => m.count === n)))]
    },
    mounts: {
      owned: [...new Set((Array.isArray(old.mounts?.owned)?old.mounts.owned:[]).filter(id=>Data.mounts[id]))],
      equipped: Data.mounts[old.mounts?.equipped] && Array.isArray(old.mounts?.owned) && old.mounts.owned.includes(old.mounts.equipped) ? old.mounts.equipped : ''
    },
    expedition: {
      bosses:[...new Set((Array.isArray(old.expedition?.bosses)?old.expedition.bosses:[]).filter(id=>Data.fieldBosses.some(b=>b.id===id)))],
      crystals:Math.max(0,Math.min(999999,Math.floor(finiteNumber(old.expedition?.crystals,0)))),
      hatched:Math.max(0,Math.min(999999,Math.floor(finiteNumber(old.expedition?.hatched,0)))),
      claimed:[...new Set((Array.isArray(old.expedition?.claimed)?old.expedition.claimed:[]).filter(id=>Data.researchGoals.some(g=>g.id===id)))],
      walk:Math.max(0,Math.min(79.99,finiteNumber(old.expedition?.walk,0))),
      eggs:(Array.isArray(old.expedition?.eggs)?old.expedition.eggs:[]).filter(e=>e&&Data.eggKinds[e.kind]).slice(0,12).map(e=>({id:boundedText(e.id,crypto.randomUUID(),80),kind:e.kind,incubating:!!e.incubating,progress:Math.max(0,Math.min(Data.eggKinds[e.kind].steps,Math.floor(finiteNumber(e.progress,0))))}))
    },
    bonuses: { collection: Math.max(0, Math.min(0.35, Number(old.bonuses && old.bonuses.collection) || 0)) },
    gold: Math.max(0, Math.min(999999, Math.floor(finiteNumber(old.gold,0)))),
    resources: Object.fromEntries(Object.keys(Data.resources).map(id => [id,Math.max(0, Math.min(9999, Math.floor(finiteNumber(old.resources?.[id],0))))])),
    supplies: {
      heals: Math.max(0, Math.min(99, Math.floor(finiteNumber(old.supplies && old.supplies.heals, base.supplies.heals)))),
      feeds: Math.max(0, Math.min(9999, Math.floor(finiteNumber(old.supplies && old.supplies.feeds, base.supplies.feeds))))
    },
    quest: {
      id: questDefinition.id,
      status: ['available', 'active', 'ready', 'complete'].includes(old.quest && old.quest.status) ? old.quest.status : base.quest.status,
      progress: Math.max(0, Math.min(questDefinition.target, Math.floor(finiteNumber(old.quest && old.quest.progress, base.quest.progress)))),
      target: questDefinition.target,
      completed: Math.max(0, Math.floor(finiteNumber(old.quest && old.quest.completed, 0)))
    },
    location: {
      x: Math.max(Data.world.minX, Math.min(Data.world.maxX, finiteNumber(old.location && old.location.x, base.location.x))),
      z: Math.max(Data.world.minX, Math.min(Data.world.maxX, finiteNumber(old.location && old.location.z, base.location.z)))
    },
    processedRewards: (Array.isArray(old.processedRewards) ? old.processedRewards : []).filter((id) => typeof id === 'string').slice(-100),
    interruptedBattle: old.interruptedBattle && typeof old.interruptedBattle === 'object' ? old.interruptedBattle : null,
    version: SCHEMA_VERSION,
    uid,
    updatedAt: Date.now()
  };
}

function createStore(options = {}) {
  const dbPath = options.dbPath || process.env.INSECT_PROFILE_PATH || path.join(__dirname, '..', 'data', 'profiles.local.json');
  const starterIds = Array.isArray(options.starterIds) && options.starterIds.some((id) => VALID_SPECIES.has(String(id))) ? options.starterIds.filter((id) => VALID_SPECIES.has(String(id))) : ['dew_ladybird', 'reed_cricket', 'clover_grasshopper'];
  let db = { version: 1, profiles: {} };

  function ensureLoaded() {
    if (db.__loaded) return;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    try {
      const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (parsed && typeof parsed === 'object') db = { version: 1, profiles: {}, ...parsed };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        if (error instanceof SyntaxError) throw new Error('프로필 저장 파일이 손상되어 원본을 보존했습니다.', { cause: error });
        throw error;
      }
    }
    db.profiles = db.profiles && typeof db.profiles === 'object' ? db.profiles : {};
    Object.defineProperty(db, '__loaded', { value: true, enumerable: false, configurable: true });
  }

  function flush() {
    ensureLoaded();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const temporary = `${dbPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(db, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, dbPath);
  }

  function get(uid, nickname = '') {
    ensureLoaded();
    const profile = migrateProfile(db.profiles[uid], uid, nickname, starterIds);
    db.profiles[uid] = profile;
    flush();
    return clone(profile);
  }

  function save(profile) {
    ensureLoaded();
    const normalized = migrateProfile(profile, profile.uid, profile.nickname, starterIds);
    db.profiles[profile.uid] = normalized;
    flush();
    return clone(normalized);
  }

  function mutate(uid, nickname, callback) {
    const profile = get(uid, nickname);
    const result = callback(profile);
    return { profile: save(profile), result };
  }

  return { dbPath, get, save, mutate, createCreature };
}

module.exports = { SCHEMA_VERSION, createCreature, createProfile, migrateProfile, createStore };
