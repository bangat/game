'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');
const Data = require('../shared/data.js');
const { createStore, migrateProfile } = require('../server/data-store.cjs');
const { authorizeJoin } = require('../server/auth.cjs');
const { createGameServer } = require('../server/index.cjs');
const World = require('../server/world.cjs');

function tempDb() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'insect-server-'));
  return path.join(directory, 'profiles.local.json');
}

function openClient(url) {
  const ws = new WebSocket(url);
  const messages = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const value = JSON.parse(raw.toString());
    messages.push(value);
    for (const waiter of [...waiters]) {
      if (waiter.predicate(value)) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(value); }
    }
  });
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve({
      ws, messages,
      send(value) { ws.send(JSON.stringify(value)); },
      next(predicate, timeout = 2500) {
        const found = messages.find(predicate);
        if (found) return Promise.resolve(found);
        return new Promise((done, fail) => {
          const waiter = { predicate, resolve: done };
          waiters.push(waiter);
          setTimeout(() => { const index = waiters.indexOf(waiter); if (index >= 0) waiters.splice(index, 1); fail(new Error('message timeout')); }, timeout).unref();
        });
      }
    }));
    ws.once('error', reject);
  });
}

test('프로필 구버전 자료를 제한된 최신 스키마로 이관하고 원자 저장한다', () => {
  const migrated = migrateProfile({ collection: [{ id: 'c1', speciesId: 'dew_ladybird', level: 999, xp: -3 }], team: ['c1', 'c1'], location: { x: 999, z: -999 } }, 'u1', '테스터', ['dew_ladybird']);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.collection[0].level, 50);
  assert.deepEqual(migrated.team, ['c1']);
  assert.deepEqual(migrated.location, { x: 120, z: -120 });
  const dbPath = tempDb();
  const store = createStore({ dbPath, starterIds: ['dew_ladybird'] });
  const profile = store.get('u1', '테스터');
  profile.nickname = '저장됨';
  store.save(profile);
  assert.equal(JSON.parse(fs.readFileSync(dbPath, 'utf8')).profiles.u1.nickname, '저장됨');
  assert.equal(fs.readdirSync(path.dirname(dbPath)).filter((name) => name.endsWith('.tmp')).length, 0);
  const zero = migrateProfile({ supplies: { heals: 0 }, location: { x: 0, z: 0 } }, 'zero', '영', ['dew_ladybird']);
  assert.equal(zero.supplies.heals, 0);
  assert.deepEqual(zero.location, { x: 0, z: 0 });
  const intentionalEmpty = migrateProfile({ collection: [{ id: 'kept', speciesId: 'dew_ladybird' }], team: [] }, 'empty', '빈 팀', ['dew_ladybird']);
  assert.deepEqual(intentionalEmpty.team, []);
  const legacyMissingTeam = migrateProfile({ collection: [{ id: 'legacy', speciesId: 'dew_ladybird' }] }, 'legacy', '구버전', ['dew_ladybird']);
  assert.deepEqual(legacyMissingTeam.team, ['legacy']);
  const repaired = migrateProfile({ collection: [{ id: 'bad', speciesId: 'unknown_species' }, { id: 'good', speciesId: 'dew_ladybird' }], team: ['bad', 'good'], discoveries: ['unknown_species'] }, 'repair', '복구', ['dew_ladybird']);
  assert.deepEqual(repaired.collection.map((item) => item.id), ['good']);
  assert.deepEqual(repaired.team, ['good']);
  assert.equal(repaired.discoveries.includes('unknown_species'), false);
  const fullyRecovered = migrateProfile({ collection: [{ id: 'bad-only', speciesId: 'unknown_species' }] }, 'recover-all', '전체 복구', ['dew_ladybird']);
  assert.deepEqual(fullyRecovered.collection.map((item) => item.speciesId), ['dew_ladybird']);
  assert.deepEqual(fullyRecovered.discoveries, ['dew_ladybird']);
  const damagedPath = tempDb();
  fs.writeFileSync(damagedPath, '{ damaged', 'utf8');
  assert.throws(() => createStore({ dbPath: damagedPath, starterIds: ['dew_ladybird'] }).get('u2', '보존'), /손상/);
  assert.equal(fs.readFileSync(damagedPath, 'utf8'), '{ damaged');
});

test('방 종류, 상태, 멤버십을 모두 검증한다', async () => {
  const authority = { verifyToken: async () => ({ uid: 'u1' }), getRoom: async () => ({ gameType: 'insectExpedition', status: 'playing', players: { u1: { nickname: '유저' } } }) };
  assert.equal((await authorizeJoin(authority, 'token', 'room_1')).uid, 'u1');
  await assert.rejects(() => authorizeJoin({ ...authority, getRoom: async () => ({ gameType: 'other', status: 'playing', players: { u1: {} } }) }, 'token', 'room_1'));
});

test('모든 종을 실제 서식지에 장애물과 겹치지 않게 배치한다', () => {
  const spawns = World.makeSpawns(Data.species, Data.biomes);
  const habitatSpawns = spawns.filter((spawn) => spawn.id.startsWith('habitat-'));
  assert.equal(habitatSpawns.length, Data.species.length);
  for (const species of Data.species) {
    const spawn = habitatSpawns.find((item) => item.speciesId === species.id);
    const biome = Data.biomes.find((item) => (item.habitats || [item.habitat]).includes(species.habitat));
    assert.ok(spawn && biome, `${species.id} 서식지 누락`);
    assert.ok(World.distance(spawn, biome.center) <= 30, `${species.id}가 ${biome.name} 밖에 배치됨`);
    assert.equal(World.pointBlocked(spawn, 2), false, `${species.id}가 장애물과 겹침`);
  }
});

test('두 WebSocket 클라이언트의 권위 명령, 중복 제거, PvP와 재접속을 처리한다', async (t) => {
  const users = { 'token-a': 'a', 'token-b': 'b', 'token-c': 'c' };
  const roomDoc = { gameType: 'insectExpedition', status: 'playing', players: { a: { nickname: '가람' }, b: { nickname: '나래' }, c: { nickname: '다온' } } };
  const authority = { verifyToken: async (token) => ({ uid: users[token] }), getRoom: async () => roomDoc };
  let rngValue = 0.01;
  let clockOffset = 0;
  const game = createGameServer({ authority, dbPath: tempDb(), rng: () => rngValue, now: () => Date.now() + clockOffset });
  t.after(() => game.close());
  const address = await game.listen(0, '127.0.0.1');
  const url = `ws://127.0.0.1:${address.port}/insect_expedition/ws`;
  const a = await openClient(url);
  const b = await openClient(url);
  t.after(() => { a.ws.terminate(); b.ws.terminate(); });
  a.send({ type: 'join', token: 'token-a', roomId: 'room_1', character: 'sprout' });
  b.send({ type: 'join', token: 'token-b', roomId: 'room_1', character: 'brook' });
  await a.next((m) => m.type === 'ack' && m.id === 'join' && m.ok);
  await b.next((m) => m.type === 'ack' && m.id === 'join' && m.ok);
  await a.next((m) => m.type === 'state' && m.players.length === 2);
  const room = game.rooms.get('room_1');
  const third = await openClient(url);
  t.after(() => third.ws.terminate());
  third.send({ type: 'join', token: 'token-c', roomId: 'room_1', character: 'original' });
  assert.equal((await third.next((m) => m.type === 'ack' && m.id === 'join')).ok, true);
  room.players.get('a').x = World.GUIDE.x; room.players.get('a').z = World.GUIDE.z;
  a.send({ type: 'command', id: 'quest-start', name: 'quest', payload: {} });
  assert.equal((await a.next((m) => m.type === 'ack' && m.id === 'quest-start')).result.quest.status, 'active');
  room.players.get('a').profile.quest = { id: 'dew-sample', status: 'ready', progress: 3, target: 3 };
  room.players.get('a').rates.delete('quest');
  a.send({ type: 'command', id: 'quest-claim', name: 'quest', payload: {} });
  const questClaim = await a.next((m) => m.type === 'ack' && m.id === 'quest-claim');
  assert.equal(questClaim.result.feeds, 3);
  const fedId = room.players.get('a').profile.team[0];
  const oldXp = room.players.get('a').profile.collection.find((item) => item.id === fedId).xp;
  a.send({ type: 'command', id: 'feed-creature', name: 'feed', payload: { creatureId: fedId } });
  assert.equal((await a.next((m) => m.type === 'ack' && m.id === 'feed-creature')).ok, true);
  assert.equal(room.players.get('a').profile.supplies.feeds, 2);
  assert.ok(room.players.get('a').profile.collection.find((item) => item.id === fedId).xp > oldXp);
  a.send({ type: 'command', id: 'travel-map', name: 'travel', payload: { biomeId: 'forest' } });
  const travel = await a.next((m) => m.type === 'ack' && m.id === 'travel-map');
  assert.equal(travel.ok, true, travel.error);
  assert.equal(World.pointBlocked(room.players.get('a')), false);
  a.send({ type: 'command', id: 'safe-challenge', name: 'challenge', payload: { targetUid: 'b' } });
  const safeChallenge = await a.next((m) => m.type === 'ack' && m.id === 'safe-challenge');
  assert.equal(safeChallenge.ok, false);
  assert.match(safeChallenge.error, /현재 위치/);
  room.players.get('a').rates.delete('challenge');
  const foreignCreatureId = room.players.get('a').profile.team[0];
  third.send({ type: 'command', id: 'foreign-team', name: 'team', payload: { ids: [foreignCreatureId] } });
  assert.equal((await third.next((m) => m.type === 'ack' && m.id === 'foreign-team')).ok, false);
  room.players.get('a').x = 40; room.players.get('a').z = 0;
  const duplicateHeal = { type: 'command', id: 'heal-once', name: 'heal', payload: {} };
  a.send(duplicateHeal); a.send(duplicateHeal);
  await a.next((m) => m.type === 'ack' && m.id === 'heal-once' && m.ok);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(room.players.get('a').profile.supplies.heals, 2);
  const ordinary = room.spawns.find((spawn) => !spawn.field);
  room.players.get('a').x = ordinary.x + 2; room.players.get('a').z = ordinary.z;
  rngValue = 0.99;
  a.send({ type: 'command', id: 'collect-fail', name: 'collect', payload: { spawnId: ordinary.id } });
  const failedCollection = await a.next((m) => m.type === 'ack' && m.id === 'collect-fail');
  assert.equal(failedCollection.result.success, false);
  await new Promise((resolve) => setTimeout(resolve, 825));
  rngValue = 0.01;
  a.send({ type: 'command', id: 'collect-ok', name: 'collect', payload: { spawnId: ordinary.id } });
  const successfulCollection = await a.next((m) => m.type === 'ack' && m.id === 'collect-ok');
  assert.equal(successfulCollection.result.success, true);
  const field = room.spawns.find((spawn) => spawn.field);
  room.players.get('a').x = field.x + 3; room.players.get('a').z = field.z;
  await new Promise((resolve) => setTimeout(resolve, 825));
  a.send({ type: 'command', id: 'encounter', name: 'encounter', payload: { spawnId: field.id } });
  const encounter = await a.next((m) => m.type === 'ack' && m.id === 'encounter');
  assert.equal(encounter.ok, true, encounter.error);
  const fieldRecord = room.battles.get(encounter.result.battleId);
  room.players.get('c').x = field.x + 3; room.players.get('c').z = field.z;
  third.send({ type: 'command', id: 'reserved-field', name: 'encounter', payload: { spawnId: field.id } });
  assert.equal((await third.next((m) => m.type === 'ack' && m.id === 'reserved-field')).ok, false);
  third.send({ type: 'command', id: 'foreign-action', name: 'action', payload: { battleId: fieldRecord.id, turn: 1, action: 'attack' } });
  assert.equal((await third.next((m) => m.type === 'ack' && m.id === 'foreign-action')).ok, false);
  fieldRecord.state.sides.b.team[0].hp = 1;
  while (room.players.get('a').profile.collection.length < 120) room.players.get('a').profile.collection.push(game.store.createCreature('dew_ladybird'));
  a.send({ type: 'command', id: 'field-hit', name: 'action', payload: { battleId: fieldRecord.id, turn: 1, action: 'attack' } });
  const fieldHit = await a.next((m) => m.type === 'ack' && m.id === 'field-hit');
  assert.equal(fieldHit.ok, true);
  assert.equal(fieldRecord.state.status, 'finished', JSON.stringify(fieldHit));
  assert.equal(room.players.get('a').profile.processedRewards.filter((id) => id === fieldRecord.id).length, 1);
  assert.equal(fieldRecord.state.rewardProcessed, true);
  assert.equal(fieldRecord.state.result.xpPerCreature, 33);
  assert.equal(fieldRecord.state.result.totalXp, 99);
  assert.deepEqual(fieldRecord.state.result.levelUps, [{ creatureId: fedId, levels: [3] }]);
  assert.equal(fieldRecord.state.result.captureSummary.success, false);
  assert.equal(fieldRecord.state.result.captureSummary.failureReason, 'inventory-full');
  a.send({ type: 'command', id: 'return-field', name: 'return', payload: { battleId: fieldRecord.id } });
  assert.equal((await a.next((m) => m.type === 'ack' && m.id === 'return-field')).ok, true);
  room.players.get('a').x = -30; room.players.get('a').z = 0;
  room.players.get('b').x = 30; room.players.get('b').z = 0;
  a.send({ type: 'command', id: 'decline-request', name: 'challenge', payload: { targetUid: 'b' } });
  const declineRequest = await a.next((m) => m.type === 'ack' && m.id === 'decline-request');
  b.send({ type: 'command', id: 'decline-response', name: 'respond', payload: { requestId: declineRequest.result.requestId, accept: false } });
  const declined = await b.next((m) => m.type === 'ack' && m.id === 'decline-response');
  assert.equal(declined.ok, true);
  assert.equal(declined.result.accepted, false);
  room.players.get('a').rates.delete('challenge');
  a.send({ type: 'command', id: 'expiry-request', name: 'challenge', payload: { targetUid: 'b' } });
  const expiryRequest = await a.next((m) => m.type === 'ack' && m.id === 'expiry-request');
  room.challenges.get(expiryRequest.result.requestId).expiresAt = Date.now() - 1;
  b.send({ type: 'command', id: 'expired-response', name: 'respond', payload: { requestId: expiryRequest.result.requestId, accept: true } });
  assert.equal((await b.next((m) => m.type === 'ack' && m.id === 'expired-response')).ok, false);
  room.players.get('a').rates.delete('challenge');
  a.send({ type: 'command', id: 'challenge-1', name: 'challenge', payload: { targetUid: 'b' } });
  const challenge = await a.next((m) => m.type === 'ack' && m.id === 'challenge-1');
  assert.equal(challenge.ok, true);
  a.send({ type: 'command', id: 'challenge-1', name: 'challenge', payload: { targetUid: 'b' } });
  const repeated = await a.next((m) => m.type === 'ack' && m.id === 'challenge-1');
  assert.deepEqual(repeated.result, challenge.result);
  b.send({ type: 'command', id: 'respond-1', name: 'respond', payload: { requestId: challenge.result.requestId, accept: true } });
  const accepted = await b.next((m) => m.type === 'ack' && m.id === 'respond-1');
  assert.equal(accepted.ok, true);
  const battleId = accepted.result.battleId;
  a.send({ type: 'command', id: 'bad-turn', name: 'action', payload: { battleId, turn: 99, action: { type: 'attack' } } });
  assert.equal((await a.next((m) => m.type === 'ack' && m.id === 'bad-turn')).ok, false);
  await new Promise((resolve) => setTimeout(resolve, 275));
  a.send({ type: 'command', id: 'a-turn', name: 'action', payload: { battleId, turn: 1, action: { type: 'attack' } } });
  b.send({ type: 'command', id: 'b-turn', name: 'action', payload: { battleId, turn: 1, action: { type: 'attack' } } });
  assert.equal((await a.next((m) => m.type === 'ack' && m.id === 'a-turn')).ok, true);
  assert.equal((await b.next((m) => m.type === 'ack' && m.id === 'b-turn')).ok, true);
  const oldPlayer = room.players.get('a');
  a.ws.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const blocked = await openClient(url);
  t.after(() => blocked.ws.terminate());
  blocked.send({ type: 'join', token: 'token-a', roomId: 'room_2', character: 'original' });
  const blockedJoin = await blocked.next((m) => m.type === 'ack' && m.id === 'join');
  assert.equal(blockedJoin.ok, false);
  assert.match(blockedJoin.error, /다른 탐사 방/);
  clockOffset += 61001;
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const disconnectedBattle = room.battles.get(battleId);
  assert.equal(disconnectedBattle.state.status, 'finished');
  assert.equal(disconnectedBattle.state.result.reason, 'disconnect');
  assert.equal(disconnectedBattle.state.result.winner, 'b');
  assert.equal(room.players.get('b').busy, false);
  b.send({ type: 'command', id: 'return-pvp', name: 'return', payload: { battleId } });
  assert.equal((await b.next((m) => m.type === 'ack' && m.id === 'return-pvp')).ok, true);
  const reconnect = await openClient(url);
  t.after(() => reconnect.ws.terminate());
  reconnect.send({ type: 'join', token: 'token-a', roomId: 'room_1', character: 'sprout' });
  await reconnect.next((m) => m.type === 'ack' && m.id === 'join' && m.ok);
  assert.notEqual(room.players.get('a'), oldPlayer);
  assert.equal(room.players.get('a').connected, true);

  third.ws.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const movedRoom = await openClient(url);
  t.after(() => movedRoom.ws.terminate());
  movedRoom.send({ type: 'join', token: 'token-c', roomId: 'room_2', character: 'original' });
  assert.equal((await movedRoom.next((m) => m.type === 'ack' && m.id === 'join')).ok, true);
  assert.equal(room.players.has('c'), false);

  const oversized = await openClient(url);
  const closeCode = new Promise((resolve) => oversized.ws.once('close', resolve));
  oversized.ws.send(Buffer.alloc(70 * 1024, 1));
  assert.equal(await closeCode, 1009);
});

test('Firebase 에뮬레이터 ID 토큰과 방 멤버십으로 두 실제 연결을 인증한다', { skip: process.env.INSECT_EMULATOR !== '1' }, async (t) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  async function signUp(label) {
    const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${label}-${suffix}@example.test`, password: 'forest-test-123', returnSecureToken: true })
    });
    if (!response.ok) assert.fail(await response.text());
    return response.json();
  }
  const first = await signUp('first');
  const second = await signUp('second');
  const roomId = `insect-${suffix}`;
  const room = { gameType: 'insectExpedition', status: 'playing', hostId: first.localId, players: { [first.localId]: { nickname: '첫째' }, [second.localId]: { nickname: '둘째' } } };
  const databaseUrl = `http://127.0.0.1:9000/rooms/${roomId}.json?auth=${encodeURIComponent(first.idToken)}&ns=demo-sky-tower-default-rtdb`;
  const seeded = await fetch(databaseUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(room) });
  if (!seeded.ok) assert.fail(await seeded.text());
  t.after(() => fetch(databaseUrl, { method: 'DELETE' }));
  const game = createGameServer({ dbPath: tempDb() });
  t.after(() => game.close());
  const address = await game.listen(0, '127.0.0.1');
  const url = `ws://127.0.0.1:${address.port}/insect_expedition/ws`;
  const one = await openClient(url); const two = await openClient(url);
  t.after(() => { one.ws.terminate(); two.ws.terminate(); });
  one.send({ type: 'join', token: first.idToken, roomId, character: 'original' });
  two.send({ type: 'join', token: second.idToken, roomId, character: 'scout' });
  const joinedOne = await one.next((message) => message.type === 'ack' && message.id === 'join');
  const joinedTwo = await two.next((message) => message.type === 'ack' && message.id === 'join');
  assert.equal(joinedOne.ok, true, joinedOne.error);
  assert.equal(joinedTwo.ok, true, joinedTwo.error);
  const state = await one.next((message) => message.type === 'state' && message.players.length === 2);
  assert.deepEqual(new Set(state.players.map((player) => player.uid)), new Set([first.localId, second.localId]));
});
