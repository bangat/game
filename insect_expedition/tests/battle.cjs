'use strict';

const assert = require('node:assert/strict');
const Data = require('../shared/data.js');
const Battle = require('../shared/battle.cjs');

const creature = (id, speciesId, extra) => ({ id, speciesId, nickname: Data.speciesById[speciesId].name, level: 5, xp: 0, ...extra });
const fixed = value => () => value;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('collectible data contains 21 species with valid skill rules', () => {
  assert.equal(Data.species.length, 21);
  assert.equal(new Set(Data.species.map(s => s.id)).size, 21);
  for (const item of Data.species) {
    assert.ok(item.normalAttack && item.normalAttack.name);
    if (item.rarity === 'common') assert.equal(item.skill, null, `${item.id} common skill`);
    if (['rare', 'evolved', 'elite', 'monster'].includes(item.rarity)) assert.ok(item.skill && item.skill.id, `${item.id} unique skill`);
  }
});

test('stats and combat power grow deterministically by level', () => {
  const low = creature('a', 'dew_ladybird', { level: 1 });
  const high = creature('b', 'dew_ladybird', { level: 8 });
  assert.ok(Battle.statsForCreature(high).maxHealth > Battle.statsForCreature(low).maxHealth);
  assert.ok(Battle.combatPower(high) > Battle.combatPower(low));
  assert.equal(Battle.xpForLevel(2), 54);
});

test('faster creature acts first and a defeated queued actor cannot pass its move to replacement', () => {
  let state = Battle.createBattle({ id: 'priority', type: 'pvp', now: 1000,
    a: { uid: 'a', team: [creature('a1', 'dew_ladybird', { hp: 1 }), creature('a2', 'sun_scarab')] },
    b: { uid: 'b', team: [creature('b1', 'azure_dragonfly')] }
  });
  state = Battle.submitAction(state, 'a', { type: 'attack' }, { now: 1001, rng: fixed(.5) }).state;
  const result = Battle.submitAction(state, 'b', { type: 'attack' }, { now: 1002, rng: fixed(.5) });
  assert.equal(result.state.sides.a.active, 1);
  assert.ok(result.events.some(e => e.type === 'skip' && e.actorCreatureId === 'a1'));
  assert.equal(result.state.sides.b.team[0].hp, result.state.sides.b.team[0].maxHp);
  assert.ok(result.events.every(e => e.round === 1 && e.eventSeq));
});

test('동일 속도는 서버 턴 홀짝에 따라 결정되어 양측에 번갈아 우선권을 준다', () => {
  for (const round of [1, 2]) {
    let state = Battle.createBattle({ id: 'tie-' + round, type: 'pvp', now: 1000,
      a: { uid: 'a', team: [creature('a1', 'dew_ladybird')] },
      b: { uid: 'b', team: [creature('b1', 'dew_ladybird')] } });
    state.turn = round;
    state = Battle.submitAction(state, 'a', { type: 'attack' }, { rng: fixed(.5) }).state;
    const result = Battle.submitAction(state, 'b', { type: 'attack' }, { rng: fixed(.5) });
    assert.equal(result.events.find(event => event.type === 'attack').actorSide, round === 1 ? 'a' : 'b');
  }
});

test('self buff skill applies to its user and emits animation-ready hit data', () => {
  let state = Battle.createBattle({ id: 'buff', type: 'pvp', now: 2000,
    a: { uid: 'a', team: [creature('a1', 'azure_dragonfly')] },
    b: { uid: 'b', team: [creature('b1', 'cave_stag')] }
  });
  state = Battle.submitAction(state, 'a', { type: 'skill' }, { rng: fixed(.5) }).state;
  const result = Battle.submitAction(state, 'b', { type: 'attack' }, { rng: fixed(.5) });
  const hit = result.events.find(e => e.type === 'hit' && e.actorSide === 'a');
  assert.ok(hit.targetCreatureId && Number.isInteger(hit.remainingHp));
  assert.ok(result.state.sides.a.team[0].status.some(s => s.id === 'swift'));
  assert.ok(!result.state.sides.b.team[0].status.some(s => s.id === 'swift'));
  assert.ok(result.state.sides.a.team[0].cooldowns.sky_current > 0);
});

test('common creatures reject impossible special-skill commands', () => {
  const state = Battle.createBattle({ id: 'invalid', type: 'field', a: { uid: 'a', team: [creature('a1', 'dew_ladybird')] }, b: { uid: 'wild', team: [creature('b1', 'cave_stag')] } });
  assert.throws(() => Battle.submitAction(state, 'a', { type: 'skill' }), /고유 기술/);
});

test('승리하기 전 직접 포획 명령은 허용하지 않는다', () => {
  const state = Battle.createBattle({ id: 'no-direct-capture', type: 'field', a: { uid: 'a', team: [creature('a1', 'sun_scarab')] }, b: { uid: 'wild', team: [creature('b1', 'ancient_rhino', {hp:1})] } });
  assert.throws(() => Battle.submitAction(state, 'a', {type:'capture'}), /승리/);
});

test('experience, healing and real metamorphosis update persisted compact creatures', () => {
  const larva = creature('larva', 'moss_caterpillar', { level: 5, hp: 1 });
  const leveled = Battle.applyXp({ ...larva, level: 1, xp: 35 }, 2);
  assert.deepEqual(leveled.levels, [2]);
  const healed = Battle.healProfile({ collection: [larva], team: ['larva'] });
  assert.equal(healed.collection[0].hp, Battle.statsForCreature(larva).maxHealth);
  const adult = Battle.evolveCreature(larva);
  assert.equal(adult.speciesId, 'moon_moth');
  assert.equal(adult.hp, Battle.statsForCreature(adult).maxHealth);
  assert.equal(Battle.evolveCreature(creature('stag', 'cave_stag')).speciesId, 'king_stag');
});

test('public battle hides the opponent pending command', () => {
  let state = Battle.createBattle({ id: 'privacy', type: 'pvp', a: { uid: 'a', team: [creature('a1', 'sun_scarab')] }, b: { uid: 'b', team: [creature('b1', 'moon_moth')] } });
  state = Battle.submitAction(state, 'a', { type: 'attack' }).state;
  const visible = Battle.publicBattle(state, 'b');
  assert.deepEqual(visible.sides.a.pending, { locked: true });
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { failed += 1; console.error(`✗ ${name}\n  ${error.stack}`); }
}
if (failed) process.exitCode = 1;
else console.log(`\n${tests.length}개 전투 테스트 통과`);
