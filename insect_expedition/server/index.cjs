'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');
const WebSocket = require('ws');
const Data = require('../shared/data.js');
const Battle = require('../shared/battle.cjs');
const { createStore } = require('./data-store.cjs');
const { createCloudStore } = require('./cloud-store.cjs');
const { createFirebaseAuthority, authorizeJoin } = require('./auth.cjs');
const World = require('./world.cjs');

const MAX_ROOM_PLAYERS = 6;
const COMMAND_LIMIT = 200;
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.webmanifest', '.mp3', '.wav', '.ogg', '.woff', '.woff2', '.ttf', '.json']);
const BLOCKED_PARTS = new Set(['.git', '.aircodex', '.codex_bridge', 'private', 'server', 'tests', 'data', 'node_modules']);

function randomFloat() { return crypto.randomBytes(4).readUInt32BE(0) / 0x100000000; }
function nowMs() { return Date.now(); }
function cleanId(value, max = 80) { return String(value || '').trim().slice(0, max); }
function cleanName(value, max = 18) { return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max); }
function send(ws, value) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value)); }
function errorText(error) { return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'; }

function selectedTeam(profile) {
  const byId = new Map(profile.collection.map((item) => [item.id, item]));
  return profile.team.map((id) => byId.get(id)).filter(Boolean).filter((item) => {
    try { return (item.hp == null ? Battle.statsForCreature(item).maxHealth : item.hp) > 0; } catch { return false; }
  }).slice(0, Battle.MAX_TEAM);
}

function starterIds() { return Data.species.filter((item) => item.rarity === 'common').slice(0, 3).map((item) => item.id); }

function locationName(point) {
  return Data.biomes.reduce((best, biome) => World.distance(point, biome.center) < World.distance(point, best.center) ? biome : best, Data.biomes[0]).name;
}

function travelPoint(biome) {
  if (biome.safe) return { x: World.GUIDE.x, z: World.GUIDE.z + 3 };
  const offsets = [[0, -18], [18, 0], [-18, 0], [0, 18], [24, -12], [-24, 12]];
  for (const [x, z] of offsets) {
    const point = { x: biome.center.x + x, z: biome.center.z + z };
    if (!World.pointBlocked(point)) return point;
  }
  return { x: biome.center.x, z: biome.center.z };
}

function publicProfile(profile) {
  return {
    ...profile,
    collection: profile.collection.map((creature) => {
      const stats = Battle.statsForCreature(creature);
      return { ...creature, hp: creature.hp == null ? stats.maxHealth : creature.hp, stats, combatPower: Battle.combatPower(creature) };
    })
  };
}

function createRoom(id) {
  return { id, players: new Map(), spawns: World.makeSpawns(Data.species, Data.biomes), challenges: new Map(), battles: new Map(), lastBroadcastAt: 0, broadcastTimer: null };
}

function publicPlayer(player) {
  return { uid: player.uid, nickname: player.nickname, x: player.x, z: player.z, character: player.character, busy: Boolean(player.busy) };
}

function challengeList(room, uid) {
  return [...room.challenges.values()].filter((item) => item.from === uid || item.to === uid).map((item) => ({ ...item }));
}

function makeState(room, player) {
  let battle = null;
  if (player.battleId) {
    const record = room.battles.get(player.battleId);
    if (record) battle = Battle.publicBattle(record.state, record.sides.get(player.uid));
  }
  return {
    type: 'state',
    you: player.uid,
    players: [...room.players.values()].filter((item) => item.connected).map(publicPlayer),
    spawns: room.spawns.map(World.publicSpawn),
    profile: publicProfile(player.profile),
    battle,
    challenges: challengeList(room, player.uid),
    serverTime: nowMs(),
    safeRadius: World.SAFE_RADIUS,
    locationName: locationName(player)
  };
}

function createGameServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ noServer: true, maxPayload: 64 * 1024 });
  const root = options.staticRoot || path.resolve(__dirname, '..', '..');
  const authority = options.authority || createFirebaseAuthority();
  const store = options.store || (process.env.INSECT_PROFILE_BUCKET
    ? createCloudStore({ bucket: require('firebase-admin/storage').getStorage().bucket(process.env.INSECT_PROFILE_BUCKET), starterIds: starterIds() })
    : createStore({ dbPath: options.dbPath, starterIds: starterIds() }));
  const clock = options.now || nowMs;
  const rng = options.rng || randomFloat;
  const rooms = new Map();
  const sessions = new Map();
  const intervals = [];
  let queue = Promise.resolve();
  function serialize(task) { const next = queue.then(task); queue = next.catch(() => {}); return next; }

  app.disable('x-powered-by');
  app.get('/insect_expedition/api/health', (_req, res) => {
    res.json({ ok: true, release: '2026.09.20.2', storage: process.env.INSECT_PROFILE_BUCKET ? 'cloud' : 'local', now: clock(), rooms: rooms.size, online: [...rooms.values()].reduce((sum, room) => sum + [...room.players.values()].filter((p) => p.connected).length, 0) });
  });
  app.get('*path', (req, res, next) => {
    let requested;
    try { requested = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
    if (requested === '/') requested = '/index.html';
    if (requested.endsWith('/')) requested += 'index.html';
    const parts = requested.split('/').filter(Boolean);
    const ext = path.extname(parts.at(-1) || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || parts.some((part) => BLOCKED_PARTS.has(part.toLowerCase())) || /profiles(?:\.local)?\.json$/i.test(requested) || /package(?:-lock)?\.json$/i.test(requested)) return res.status(404).end();
    const absolute = path.resolve(root, `.${requested}`);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return res.status(404).end();
    fs.stat(absolute, (error, stat) => {
      if (error || !stat.isFile()) return next();
      res.sendFile(absolute);
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/insect_expedition/ws') return socket.destroy();
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  function roomFor(id) {
    if (!rooms.has(id)) rooms.set(id, createRoom(id));
    return rooms.get(id);
  }

  function broadcast(room) {
    if (room.broadcastTimer) { clearTimeout(room.broadcastTimer); room.broadcastTimer = null; }
    room.lastBroadcastAt = clock();
    World.updateSpawns(room.spawns, clock());
    for (const player of room.players.values()) if (player.connected) send(player.ws, makeState(room, player));
  }

  function queueBroadcast(room) {
    const delay = Math.max(0, 100 - (clock() - room.lastBroadcastAt));
    if (!delay) return broadcast(room);
    if (!room.broadcastTimer) room.broadcastTimer = setTimeout(() => broadcast(room), delay);
  }

  function releaseSpawn(room, spawn, consumed) {
    spawn.reservedBy = null;
    if (consumed) {
      spawn.available = false;
      spawn.respawnAt = clock() + (spawn.field ? 90000 : 30000);
    }
  }

  function syncBattleHealth(profile, side) {
    const hp = new Map(side.team.map((item) => [item.id, item.hp]));
    profile.collection.forEach((item) => { if (hp.has(item.id)) item.hp = hp.get(item.id); });
  }

  function addCreature(profile, speciesId, level = 1) {
    if (profile.collection.length >= 120) throw new Error('곤충 보관함이 가득 찼습니다.');
    const creature = store.createCreature(speciesId, level, Data.speciesById[speciesId] && Data.speciesById[speciesId].name);
    creature.hp = Battle.statsForCreature(creature).maxHealth;
    profile.collection.push(creature);
    const isNew = !profile.discoveries.includes(speciesId);
    if (isNew) profile.discoveries.push(speciesId);
    return { creature, isNew };
  }

  async function completeBattle(room, record) {
    if (!record || record.state.status === 'active' || record.state.rewardProcessed) return;
    const result = record.state.result || {};
    for (const [uid, sideKey] of record.sides) {
      const player = room.players.get(uid);
      if (!player) continue;
      if (record.state.type === 'field') {
        const nextProfile = JSON.parse(JSON.stringify(player.profile));
        syncBattleHealth(nextProfile, record.state.sides[sideKey]);
        if (!nextProfile.processedRewards.includes(record.state.id)) {
          nextProfile.processedRewards.push(record.state.id);
          nextProfile.processedRewards = nextProfile.processedRewards.slice(-100);
          result.xpPerCreature = 0;
          result.totalXp = 0;
          result.levelUps = [];
          result.captureSummary = null;
          if (result.winner === sideKey) {
            const enemy = record.state.sides.b.team[0];
            if (result.reason === 'defeat') {
              const xp = 24 + enemy.level * 9;
              result.xpPerCreature = xp;
              record.state.sides[sideKey].team.forEach(({ id }) => {
                const index = nextProfile.collection.findIndex((item) => item.id === id);
                if (index >= 0) {
                  const applied = Battle.applyXp(nextProfile.collection[index], xp);
                  nextProfile.collection[index] = applied.creature;
                  result.totalXp += applied.gained;
                  if (applied.levels.length) result.levelUps.push({ creatureId: id, levels: applied.levels });
                }
              });
              const rank = Data.speciesById[enemy.speciesId].rarity;
              const chance = rank === 'monster' ? 0.04 : rank === 'elite' ? 0.07 : 0.1;
              const rolledSuccess = rng() < chance;
              const hasSpace = nextProfile.collection.length < 120;
              record.state.victoryCapture = { chance, success: rolledSuccess && hasSpace, speciesId: enemy.speciesId, failureReason: rolledSuccess && !hasSpace ? 'inventory-full' : null };
              if (record.state.victoryCapture.success) addCreature(nextProfile, enemy.speciesId, Math.max(1, enemy.level - 1));
              result.captureSummary = { source: 'victory', ...record.state.victoryCapture };
            } else if (result.capturedSpeciesId) {
              addCreature(nextProfile, result.capturedSpeciesId, Math.max(1, enemy.level - 1));
              result.captureSummary = { source: 'battle', success: true, speciesId: result.capturedSpeciesId, chance: record.state.captureRoll && record.state.captureRoll.chance };
            }
          }
        }
        nextProfile.interruptedBattle = null;
        player.profile = await store.save(nextProfile);
      }
      player.busy = false;
      if (record.spawn) releaseSpawn(room, record.spawn, true);
    }
    record.state.rewardProcessed = true;
  }

  async function createBattleRecord(room, type, aPlayer, bPlayerOrSpawn) {
    const id = crypto.randomUUID();
    let b;
    const sides = new Map([[aPlayer.uid, 'a']]);
    let spawn = null;
    if (type === 'field') {
      spawn = bPlayerOrSpawn;
      const species = Data.speciesById[spawn.speciesId];
      b = { uid: `field:${spawn.id}`, name: species.name, team: [{ id: `field:${spawn.id}`, speciesId: spawn.speciesId, nickname: species.name, level: spawn.level, xp: 0, hp: null }] };
    } else {
      const opponent = bPlayerOrSpawn;
      b = { uid: opponent.uid, name: opponent.nickname, team: selectedTeam(opponent.profile) };
      sides.set(opponent.uid, 'b');
    }
    const state = Battle.createBattle({ id, type, a: { uid: aPlayer.uid, name: aPlayer.nickname, team: selectedTeam(aPlayer.profile) }, b, now: clock() });
    const record = { id, state, sides, spawn, origins: new Map(), finishedAt: 0 };
    for (const uid of sides.keys()) {
      const player = room.players.get(uid);
      record.origins.set(uid, { x: player.x, z: player.z });
      player.busy = true;
      player.battleId = id;
      player.profile.interruptedBattle = { roomId: room.id, battleId: id, at: clock() };
      player.profile = await store.save(player.profile);
    }
    room.battles.set(id, record);
    return record;
  }

  function rate(player, key, minimum) {
    const current = clock();
    const previous = player.rates.get(key) || 0;
    if (current - previous < minimum) throw new Error('요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.');
    player.rates.set(key, current);
  }

  async function execute(room, player, name, payload = {}) {
    if (player.battleId && !['action', 'return'].includes(name)) throw new Error('전투 결과에서 돌아가기를 눌러 탐험을 계속해 주세요.');
    if (name === 'move') {
      rate(player, 'move', 25);
      if (player.busy) throw new Error('전투 중에는 월드에서 이동할 수 없습니다.');
      const changed = World.movePlayer(player, payload, clock());
      player.profile.location = { x: player.x, z: player.z };
      return { x: player.x, z: player.z, changed };
    }
    if (name === 'character') {
      rate(player, 'manage', 300);
      if (player.busy) throw new Error('전투 중에는 캐릭터를 바꿀 수 없습니다.');
      const id = cleanId(payload.id, 40);
      if (!Data.characters.some((item) => item.id === id)) throw new Error('선택할 수 없는 캐릭터입니다.');
      player.character = id;
      player.profile.characterId = id;
      player.profile = await store.save(player.profile);
      return { id };
    }
    if (name === 'team') {
      rate(player, 'manage', 300);
      if (player.busy) throw new Error('전투 중에는 팀을 바꿀 수 없습니다.');
      const ids = Array.isArray(payload.ids) ? payload.ids.map(String) : [];
      if (ids.length < 1 || ids.length > Battle.MAX_TEAM || new Set(ids).size !== ids.length) throw new Error('팀은 서로 다른 곤충 1~3마리로 구성해야 합니다.');
      const owned = new Map(player.profile.collection.map((item) => [item.id, item]));
      if (ids.some((id) => !owned.has(id))) throw new Error('보유하지 않은 곤충이 포함되어 있습니다.');
      if (ids.some((id) => (owned.get(id).hp == null ? Battle.statsForCreature(owned.get(id)).maxHealth : owned.get(id).hp) <= 0)) throw new Error('쓰러진 곤충은 팀에 넣을 수 없습니다.');
      player.profile.team = ids;
      player.profile = await store.save(player.profile);
      return { ids };
    }
    if (name === 'rename') {
      rate(player, 'manage', 300);
      if (player.busy) throw new Error('전투 중에는 이름을 바꿀 수 없습니다.');
      const creature = player.profile.collection.find((item) => item.id === String(payload.creatureId));
      const nickname = cleanName(payload.name);
      if (!creature || !nickname) throw new Error('이름을 바꿀 곤충과 새 이름을 확인해 주세요.');
      creature.nickname = nickname;
      player.profile = await store.save(player.profile);
      return { creatureId: creature.id, name: nickname };
    }
    if (name === 'heal') {
      if (player.busy) throw new Error('전투 중에는 치료할 수 없습니다.');
      const safe = World.inSafeZone(player);
      rate(player, 'heal', safe ? 30000 : 1000);
      if (!safe && player.profile.supplies.heals < 1) throw new Error('회복 꾸러미가 없습니다. 안전 캠프로 돌아가면 무료로 치료할 수 있습니다.');
      if (!safe) player.profile.supplies.heals -= 1;
      player.profile = await store.save(Battle.healProfile(player.profile));
      return { heals: player.profile.supplies.heals, safeCamp: safe };
    }
    if (name === 'evolve') {
      if (player.busy) throw new Error('전투 중에는 성장시킬 수 없습니다.');
      const index = player.profile.collection.findIndex((item) => item.id === String(payload.creatureId));
      if (index < 0) throw new Error('보유하지 않은 곤충입니다.');
      player.profile.collection[index] = Battle.evolveCreature(player.profile.collection[index]);
      if (!player.profile.discoveries.includes(player.profile.collection[index].speciesId)) player.profile.discoveries.push(player.profile.collection[index].speciesId);
      player.profile = await store.save(player.profile);
      return { creature: player.profile.collection[index], message: `${Data.speciesById[player.profile.collection[index].speciesId].name} 진화! 공격과 능력치가 새롭게 바뀌었어요.` };
    }
    if (name === 'quest') {
      rate(player, 'quest', 500);
      if (player.busy) throw new Error('전투 중에는 연구원과 대화할 수 없습니다.');
      if (World.distance(player, World.GUIDE) > World.GUIDE.radius) throw new Error('미라 연구원에게 가까이 다가가 주세요.');
      const quest = player.profile.quest || { id: 'dew-sample', status: 'available', progress: 0, target: 3 };
      if (quest.status === 'available' || quest.status === 'complete') {
        quest.progress = 0;
        quest.status = 'active'; player.profile.quest = quest; player.profile = await store.save(player.profile);
        return { quest, message: '의뢰 수락! 야생 곤충 3마리를 채집해 돌아오세요. 지도에서 연구소로 귀환할 수 있어요.' };
      }
      if (quest.status === 'active') return { quest, message: `채집 기록 ${quest.progress}/${quest.target}. 곤충을 더 찾아보세요.` };
      if (quest.status === 'ready') {
        quest.status = 'complete'; quest.completed = (quest.completed || 0) + 1; player.profile.supplies.feeds = Math.min(99, (player.profile.supplies.feeds || 0) + 3);
        player.profile.quest = quest; player.profile = await store.save(player.profile);
        return { quest, feeds: player.profile.supplies.feeds, message: '의뢰 완료! 곤충 사료 3개를 받았어요. 다시 대화하면 다음 채집 의뢰를 받을 수 있어요.' };
      }
      return { quest, message: '첫 연구 의뢰를 이미 훌륭하게 마쳤어요. 사료로 곤충을 돌봐 주세요.' };
    }
    if (name === 'feed') {
      rate(player, 'manage', 400);
      if (player.busy) throw new Error('전투 중에는 사료를 줄 수 없습니다.');
      if ((player.profile.supplies.feeds || 0) < 1) throw new Error('곤충 사료가 없습니다. 미라 연구원의 의뢰를 완료해 보세요.');
      const index = player.profile.collection.findIndex((item) => item.id === String(payload.creatureId));
      if (index < 0) throw new Error('보유하지 않은 곤충입니다.');
      if (player.profile.collection[index].level >= 50) throw new Error('이미 최고 레벨에 도달한 곤충입니다.');
      const applied = Battle.applyXp(player.profile.collection[index], 84);
      player.profile.collection[index] = applied.creature;
      player.profile.supplies.feeds -= 1;
      player.profile = await store.save(player.profile);
      return { creature: applied.creature, levels: applied.levels, message: applied.levels.length ? `사료를 먹고 Lv.${applied.creature.level}로 성장했어요!` : '곤충 사료를 먹고 경험치를 얻었어요.' };
    }
    if (name === 'travel') {
      rate(player, 'travel', 1200);
      if (player.busy) throw new Error('전투 중에는 사냥터를 이동할 수 없습니다.');
      const biome = Data.biomes.find((item) => item.id === String(payload.biomeId));
      if (!biome) throw new Error('이동할 수 없는 지역입니다.');
      const point = travelPoint(biome);
      room.challenges.forEach((item, id) => { if (item.from === player.uid || item.to === player.uid) room.challenges.delete(id); });
      player.lastMoveAt = clock();
      player.x = point.x; player.z = point.z; player.profile.location = point;
      player.profile = await store.save(player.profile);
      return { biomeId: biome.id, location: point, message: `${biome.name}로 이동했어요.` };
    }
    if (name === 'collect') {
      rate(player, 'interact', 800);
      if (player.busy) throw new Error('다른 활동 중입니다.');
      const spawn = room.spawns.find((item) => item.id === String(payload.spawnId));
      if (!spawn || !spawn.available || spawn.reservedBy || spawn.field) throw new Error('지금은 채집할 수 없는 대상입니다.');
      if (World.distance(player, spawn) > 4 || World.segmentBlocked(player, spawn)) throw new Error('대상에게 더 가까이 다가가 주세요.');
      const species = Data.speciesById[spawn.speciesId];
      const base = Data.rarity[species.rarity].capture;
      const chance = Math.max(0.08, Math.min(0.92, base + player.profile.bonuses.collection));
      const roll = rng();
      if (roll >= chance) return { success: false, chance, roll };
      const captured = addCreature(player.profile, spawn.speciesId, spawn.level);
      const quest = player.profile.quest;
      let questReady = false;
      if (quest && quest.status === 'active') {
        quest.progress = Math.min(quest.target || 3, (quest.progress || 0) + 1);
        if (quest.progress >= (quest.target || 3)) { quest.status = 'ready'; questReady = true; }
      }
      releaseSpawn(room, spawn, true);
      player.profile = await store.save(player.profile);
      return { success: true, chance, roll, questReady, ...captured };
    }
    if (name === 'encounter') {
      rate(player, 'interact', 800);
      if (player.busy || !selectedTeam(player.profile).length) throw new Error('전투 가능한 팀이 필요합니다.');
      const spawn = room.spawns.find((item) => item.id === String(payload.spawnId));
      if (!spawn || !spawn.field || !spawn.available || spawn.reservedBy) throw new Error('이미 다른 탐험대가 상대 중이거나 사라진 몬스터입니다.');
      if (World.distance(player, spawn) > 7 || World.segmentBlocked(player, spawn)) throw new Error('몬스터까지 안전한 접근 경로가 없습니다.');
      spawn.reservedBy = player.uid;
      const gap = Math.max(0.001, World.distance(player, spawn));
      const approach = { x: spawn.x + (player.x - spawn.x) * 3 / gap, z: spawn.z + (player.z - spawn.z) * 3 / gap };
      if (!World.pointBlocked(approach)) { player.x = approach.x; player.z = approach.z; }
      try { return { battleId: (await createBattleRecord(room, 'field', player, spawn)).id }; }
      catch (error) { releaseSpawn(room, spawn, false); throw error; }
    }
    if (name === 'challenge') {
      rate(player, 'challenge', 5000);
      const target = room.players.get(String(payload.targetUid));
      if (!target || !target.connected || target.uid === player.uid) throw new Error('대전 상대를 찾을 수 없습니다.');
      if (player.busy || target.busy || World.inSafeZone(player) || World.inSafeZone(target)) throw new Error('현재 위치에서는 대전을 신청할 수 없습니다.');
      if (!selectedTeam(player.profile).length || !selectedTeam(target.profile).length) throw new Error('양쪽 모두 전투 가능한 팀이 필요합니다.');
      const item = { id: crypto.randomUUID(), from: player.uid, to: target.uid, createdAt: clock(), expiresAt: clock() + 15000 };
      room.challenges.set(item.id, item);
      return { requestId: item.id, expiresAt: item.expiresAt };
    }
    if (name === 'respond') {
      const item = room.challenges.get(String(payload.requestId));
      if (!item || item.to !== player.uid || item.expiresAt <= clock()) throw new Error('대전 신청이 만료되었거나 존재하지 않습니다.');
      room.challenges.delete(item.id);
      if (!payload.accept) return { accepted: false };
      const challenger = room.players.get(item.from);
      if (!challenger || !challenger.connected || challenger.busy || player.busy || World.inSafeZone(challenger) || World.inSafeZone(player)) throw new Error('대전을 시작할 수 없는 상태입니다.');
      return { accepted: true, battleId: (await createBattleRecord(room, 'pvp', challenger, player)).id };
    }
    if (name === 'action') {
      rate(player, 'action', 250);
      const record = room.battles.get(String(payload.battleId));
      const side = record && record.sides.get(player.uid);
      if (!record || !side || player.battleId !== record.id || Number(payload.turn) !== record.state.turn) throw new Error('현재 전투 턴과 맞지 않는 명령입니다.');
      const action = payload.action && typeof payload.action === 'object' ? payload.action : { type: payload.action, creatureId: payload.creatureId };
      if (action.type === 'capture' && player.profile.collection.length >= 120) throw new Error('곤충 보관함이 가득 찼습니다.');
      const outcome = Battle.submitAction(record.state, side, action, { now: clock(), rng });
      record.state = outcome.state;
      if (record.state.status !== 'active') { record.finishedAt = clock(); await completeBattle(room, record); }
      return { resolved: outcome.resolved, events: outcome.events, result: outcome.result };
    }
    if (name === 'return') {
      const record = room.battles.get(String(payload.battleId || player.battleId));
      if (!record || !record.sides.has(player.uid) || record.state.status === 'active') throw new Error('아직 돌아갈 수 없습니다.');
      const origin = record.origins.get(player.uid) || player.profile.location || { x: 0, z: 22 };
      player.x = origin.x; player.z = origin.z; player.busy = false; player.battleId = null;
      player.profile.location = { x: player.x, z: player.z };
      player.profile = await store.save(player.profile);
      return { x: player.x, z: player.z };
    }
    throw new Error('지원하지 않는 명령입니다.');
  }

  wss.on('connection', (ws) => {
    let player = null;
    let room = null;
    ws.on('error', () => { /* 프로토콜 오류와 과대 메시지는 ws가 연결 종료로 처리한다. */ });
    const joinTimer = setTimeout(() => { if (!player) ws.close(4001, 'join required'); }, 8000);
    ws.on('message', (raw) => { serialize(async () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      let message;
      try { message = JSON.parse(raw.toString('utf8')); } catch { return send(ws, { type: 'error', error: 'JSON 형식이 올바르지 않습니다.' }); }
      if (!player) {
        if (!message || message.type !== 'join') return send(ws, { type: 'error', error: '먼저 참가 인증이 필요합니다.' });
        try {
          const joined = await authorizeJoin(authority, message.token, cleanId(message.roomId));
          const roomId = cleanId(message.roomId);
          const owned = sessions.get(joined.uid);
          if (owned && owned.room.id !== roomId) {
            const activeBattle = owned.player.battleId && owned.room.battles.get(owned.player.battleId);
            if (owned.player.connected || owned.player.busy || (activeBattle && activeBattle.state.status === 'active')) throw new Error('이 계정은 다른 탐사 방에서 활동 중입니다.');
            owned.room.challenges.forEach((item, id) => { if (item.from === joined.uid || item.to === joined.uid) owned.room.challenges.delete(id); });
            owned.room.players.delete(joined.uid);
            sessions.delete(joined.uid);
          }
          room = roomFor(roomId);
          const existing = room.players.get(joined.uid);
          const connectedCount = [...room.players.values()].filter((item) => item.connected && item.uid !== joined.uid).length;
          if (!existing && connectedCount >= MAX_ROOM_PLAYERS) throw new Error('방의 동시 접속 인원이 가득 찼습니다.');
          if (existing && existing.connected && existing.ws !== ws) existing.ws.close(4002, 'reconnected');
          const profile = existing ? existing.profile : await store.get(joined.uid, joined.nickname);
          const location = existing ? { x: existing.x, z: existing.z } : profile.location || { x: 0, z: 22 };
          player = existing || { uid: joined.uid, rates: new Map(), commands: new Map(), inflight: new Map(), busy: false, battleId: null };
          player.inflight ||= new Map();
          const character = Data.characters.some((item) => item.id === message.character) ? message.character : Data.characters.some((item) => item.id === profile.characterId) ? profile.characterId : Data.characters[0].id;
          profile.characterId = character;
          Object.assign(player, { ws, connected: true, nickname: joined.nickname, profile, character, x: location.x, z: location.z, disconnectedAt: 0 });
          room.players.set(player.uid, player);
          sessions.set(player.uid, { room, player });
          clearTimeout(joinTimer);
          send(ws, { type: 'ack', id: 'join', ok: true, result: { uid: player.uid, roomId: room.id } });
          broadcast(room);
        } catch (error) {
          send(ws, { type: 'ack', id: 'join', ok: false, error: errorText(error) });
          ws.close(4003, 'unauthorized');
        }
        return;
      }
      if (!message || message.type !== 'command') return;
      const id = cleanId(message.id, 100);
      if (!id) return send(ws, { type: 'ack', id: '', ok: false, error: '명령 ID가 필요합니다.' });
      if (player.commands.has(id)) return send(ws, player.commands.get(id));
      if (player.inflight.has(id)) return send(ws, await player.inflight.get(id));
      const pending = (async () => {
        try { return { type: 'ack', id, ok: true, result: await execute(room, player, cleanId(message.name, 30), message.payload || {}) }; }
        catch (error) { return { type: 'ack', id, ok: false, error: errorText(error) }; }
      })();
      player.inflight.set(id, pending);
      const ack = await pending;
      player.inflight.delete(id);
      player.commands.set(id, ack);
      while (player.commands.size > COMMAND_LIMIT) player.commands.delete(player.commands.keys().next().value);
      send(ws, ack);
      if (message.name === 'move') {
        if (ack.ok && ack.result && ack.result.changed) queueBroadcast(room);
      } else broadcast(room);
    }).catch(() => { ws.close(1011, 'server error'); }); });
    ws.on('close', () => { serialize(async () => {
      clearTimeout(joinTimer);
      if (!player || player.ws !== ws) return;
      player.connected = false;
      player.disconnectedAt = clock();
      player.profile.location = { x: player.x, z: player.z };
      player.profile = await store.save(player.profile);
      room.challenges.forEach((item, id) => { if (item.from === player.uid || item.to === player.uid) room.challenges.delete(id); });
      broadcast(room);
    }).catch(() => { /* Original cloud record is preserved on save failure. */ }); });
  });

  let ticking = false;
  intervals.push(setInterval(() => {
    if (ticking) return;
    ticking = true;
    serialize(async () => {
    const now = clock();
    for (const [roomId, room] of rooms) {
      room.challenges.forEach((item, id) => { if (item.expiresAt <= now) room.challenges.delete(id); });
      for (const record of room.battles.values()) {
        if (record.state.status !== 'active') {
          if (!record.state.rewardProcessed) {
            try { await completeBattle(room, record); } catch { /* 저장 장치가 회복되면 다음 주기에 다시 처리한다. */ }
          }
          continue;
        }
        if (record.state.deadline > now) continue;
        try {
          for (const side of ['a', 'b']) if (!record.state.sides[side].pending) record.state.sides[side].pending = Battle.autoAction(record.state, side, rng);
          const outcome = Battle.resolveTurn(record.state, { now, rng });
          record.state = outcome.state;
          if (record.state.status !== 'active') { record.finishedAt = now; await completeBattle(room, record); }
        } catch { record.state.status = 'finished'; record.state.result = { winner: null, reason: 'invalid' }; await completeBattle(room, record); }
      }
      for (const [uid, player] of room.players) {
        if (!player.connected && now - player.disconnectedAt > 60000) {
          const record = player.battleId && room.battles.get(player.battleId);
          if (record && record.state.status === 'active') {
            record.state.status = 'finished';
            const side = record.sides.get(uid);
            record.state.result = { winner: record.state.type === 'pvp' ? (side === 'a' ? 'b' : 'a') : 'b', reason: 'disconnect' };
            await completeBattle(room, record);
          }
          room.players.delete(uid);
          const owned = sessions.get(uid);
          if (owned && owned.player === player) sessions.delete(uid);
        }
      }
      if (![...room.players.values()].some((item) => item.connected) && room.players.size === 0) rooms.delete(roomId);
      else broadcast(room);
    }
    }).catch(error => console.error('탐험 처리 오류:', error.message)).finally(() => { ticking = false; });
  }, 1000));

  async function close() {
    intervals.forEach(clearInterval);
    for (const room of rooms.values()) if (room.broadcastTimer) clearTimeout(room.broadcastTimer);
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await queue;
    if (authority.close) await authority.close();
  }

  return { app, server, wss, rooms, sessions, store, listen(port = Number(process.env.PORT || 4193), host = '0.0.0.0') { return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(server.address()); }); }); }, close };
}

if (require.main === module) {
  const game = createGameServer();
  process.once('SIGTERM', () => { game.close().then(() => process.exit(0)); });
  game.listen().then((address) => console.log(`이슬숲 탐험대 서버: http://0.0.0.0:${address.port}`)).catch((error) => { console.error(error); process.exitCode = 1; });
}

module.exports = { createGameServer, selectedTeam, publicProfile };
