'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');
const { createGameServer } = require('../server/index.cjs');
const { createStore } = require('../server/data-store.cjs');
const Data = require('../shared/data.js');
const World = require('../server/world.cjs');

test('실제 채집 3회 → 보상 중복 방지 → 먹이 3개 → 진화 → 재시작 후 복원 → 반복 의뢰', async t => {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'insect-progress-')), 'profiles.json');
  const authority = { verifyToken: async () => ({ uid: 'quest-user' }), getRoom: async () => ({ gameType: 'insectExpedition', status: 'playing', players: { 'quest-user': { nickname: '퀘스트 검증' } } }) };
  let now = Date.now();
  const game = createGameServer({ authority, dbPath, rng: () => 0, now: () => now });
  const address = await game.listen(0, '127.0.0.1');
  t.after(() => game.close());
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/insect_expedition/ws`);
  t.after(() => ws.terminate());
  await new Promise(resolve => ws.once('open', resolve));
  let sequence = 0;
  const waiting = new Map();
  ws.on('message', raw => { const m = JSON.parse(raw); if (m.type === 'ack') { waiting.get(m.id)?.(m); waiting.delete(m.id); } });
  function send(message) { return new Promise(resolve => { waiting.set(message.id || 'join', resolve); ws.send(JSON.stringify(message)); }); }
  async function command(name, payload = {}, id = 'c' + (++sequence)) {
    now += 1600;
    const ack = await send({ type: 'command', id, name, payload });
    assert.equal(ack.ok, true, ack.error);
    return ack.result;
  }
  assert.equal((await send({ type: 'join', roomId: 'quest-room', token: 'fixture' })).ok, true);
  const player = game.rooms.get('quest-room').players.get('quest-user');
  await command('travel', { biomeId: 'safe' });
  assert.ok(World.distance(player, World.GUIDE) <= World.GUIDE.radius);
  await command('quest');
  const targets = game.rooms.get('quest-room').spawns.filter(s => !s.field).slice(0, 3);
  for (const target of targets) {
    player.x = target.x; player.z = target.z;
    assert.equal((await command('collect', { spawnId: target.id })).success, true);
  }
  assert.equal(player.profile.quest.status, 'ready');
  await command('travel', { biomeId: 'safe' });
  await command('quest', {}, 'claim-once');
  await command('quest', {}, 'claim-once');
  assert.equal(player.profile.supplies.feeds, 3);
  // A captured larva starts at Lv.1; its actual growth and evolved move set are checked.
  const larva = game.store.createCreature('moss_caterpillar', 1);
  player.profile.collection.push(larva);
  player.profile = await game.store.save(player.profile);
  const oldAttack = Data.speciesById[larva.speciesId].normalAttack.id;
  for (let i = 0; i < 3; i++) await command('feed', { creatureId: larva.id });
  const evolved = (await command('evolve', { creatureId: larva.id })).creature;
  assert.equal(evolved.level, 5);
  assert.equal(evolved.speciesId, 'moon_moth');
  assert.notEqual(Data.speciesById[evolved.speciesId].normalAttack.id, oldAttack);
  assert.ok(Data.speciesById[evolved.speciesId].skill);
  const restored = createStore({ dbPath }).get('quest-user');
  assert.equal(restored.collection.find(c => c.id === larva.id).speciesId, 'moon_moth');
  assert.equal(restored.supplies.feeds, 0);
  assert.equal(restored.quest.completed, 1);
  assert.equal((await command('quest')).quest.status, 'active');
  assert.equal(player.profile.quest.progress, 0);
});
