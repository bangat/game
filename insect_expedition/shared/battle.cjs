'use strict';

const Data = require('./data.js');
const TURN_MS = 25000;
const MAX_TEAM = 3;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const roll = rng => clamp(Number((rng || Math.random)()), 0, 0.999999);
const xpForLevel = level => 36 + Math.max(0, level - 1) * 18;

function statsForCreature(creature) {
  const species = Data.speciesById[creature.speciesId];
  if (!species) throw new Error(`알 수 없는 곤충: ${creature.speciesId}`);
  const level = clamp(Math.floor(Number(creature.level) || 1), 1, 50);
  const growth = level - 1;
  return {
    maxHealth: species.baseStats.maxHealth + growth * 5,
    attack: species.baseStats.attack + growth * 2,
    defense: species.baseStats.defense + growth * 2,
    speed: species.baseStats.speed + growth,
    level
  };
}

function combatPower(creature) {
  const s = statsForCreature(creature);
  return Math.round(s.maxHealth * 0.42 + s.attack * 2.1 + s.defense * 1.65 + s.speed * 1.35);
}

function hydrate(creature, index) {
  const s = statsForCreature(creature);
  const species = Data.speciesById[creature.speciesId];
  return {
    id: String(creature.id || `${creature.speciesId}-${index}`),
    speciesId: creature.speciesId,
    nickname: String(creature.nickname || species.name).slice(0, 16),
    level: s.level,
    xp: Math.max(0, Math.floor(Number(creature.xp) || 0)),
    hp: clamp(Math.floor(creature.hp == null ? s.maxHealth : Number(creature.hp)), 0, s.maxHealth),
    maxHp: s.maxHealth,
    attack: s.attack,
    defense: s.defense,
    speed: s.speed,
    cp: combatPower(creature),
    cooldowns: {},
    status: []
  };
}

function sideFrom(input, label) {
  if (!input || !Array.isArray(input.team) || input.team.length < 1) throw new Error(`${label} 팀이 비어 있습니다.`);
  const seen = new Set();
  const team = input.team.slice(0, MAX_TEAM).map(hydrate).filter(creature => {
    if (seen.has(creature.id) || creature.hp <= 0) return false;
    seen.add(creature.id);
    return true;
  });
  if (!team.length) throw new Error(`${label} 팀에 싸울 수 있는 곤충이 없습니다.`);
  return { uid: String(input.uid || label), name: String(input.name || label), team, active: 0, pending: null };
}

function createBattle({ id, type, a, b, now }) {
  if (type !== 'field' && type !== 'pvp') throw new Error('지원하지 않는 전투 유형입니다.');
  const startedAt = Number(now) || Date.now();
  return {
    id: String(id || `battle-${startedAt}`), type, status: 'active', turn: 1,
    startedAt, deadline: startedAt + TURN_MS,
    sides: { a: sideFrom(a, '탐험대'), b: sideFrom(b, type === 'field' ? '필드 몬스터' : '도전자') },
    events: [], result: null, captureRoll: null, rewardProcessed: false
  };
}

const clone = value => JSON.parse(JSON.stringify(value));
const other = side => side === 'a' ? 'b' : 'a';
const active = side => side.team[side.active];
const livingIndexes = side => side.team.map((c, i) => c.hp > 0 ? i : -1).filter(i => i >= 0);

function validateAction(state, sideKey, action) {
  if (!state || state.status !== 'active') throw new Error('이미 끝난 전투입니다.');
  if (sideKey !== 'a' && sideKey !== 'b') throw new Error('잘못된 진영입니다.');
  const side = state.sides[sideKey];
  if (!side || side.pending) throw new Error('이미 이번 턴 행동을 정했습니다.');
  const actor = active(side);
  if (!actor || actor.hp <= 0) throw new Error('행동할 수 있는 곤충이 없습니다.');
  const type = action && action.type;
  if (!['attack', 'skill', 'switch', 'capture', 'retreat'].includes(type)) throw new Error('잘못된 행동입니다.');
  if (type === 'skill') {
    const ability = Data.speciesById[actor.speciesId].skill;
    if (!ability) throw new Error('이 곤충은 고유 기술이 없습니다.');
    if ((actor.cooldowns[ability.id] || 0) > 0) throw new Error('고유 기술을 아직 사용할 수 없습니다.');
  }
  if (type === 'switch') {
    const index = side.team.findIndex(c => c.id === String(action.creatureId));
    if (index < 0 || index === side.active || side.team[index].hp <= 0) throw new Error('교체할 수 없는 곤충입니다.');
  }
  if (type === 'capture') throw new Error('야생 곤충에게 승리하면 전투 성과에 따라 자동으로 채집합니다.');
  if (type === 'retreat' && state.type !== 'field') throw new Error('대인전에서는 도주할 수 없습니다.');
}

function autoAction(state, sideKey, rng) {
  const side = state.sides[sideKey];
  const actor = active(side);
  if (!actor || actor.hp <= 0) {
    const next = livingIndexes(side)[0];
    return next == null ? { type: 'attack' } : { type: 'switch', creatureId: side.team[next].id };
  }
  const ability = Data.speciesById[actor.speciesId].skill;
  if (ability && !(actor.cooldowns[ability.id] > 0) && roll(rng) < 0.34) return { type: 'skill' };
  return { type: 'attack' };
}

function effectiveSpeed(creature) {
  let value = creature.speed;
  if (creature.status.some(s => s.id === 'swift')) value *= 1.35;
  if (creature.status.some(s => s.id === 'drowsy')) value *= 0.6;
  return value;
}

function calculateDamage(actor, target, move, rng) {
  let attackStat = actor.attack;
  if (actor.status.some(s => s.id === 'weakened')) attackStat *= 0.72;
  let defense = target.defense;
  if (target.status.some(s => s.id === 'exposed')) defense *= 0.7;
  const critical = roll(rng) < 0.09;
  const spread = 0.92 + roll(rng) * 0.16;
  let amount = Math.max(2, Math.round((move.power + attackStat * 0.72 - defense * 0.42) * spread * (critical ? 1.5 : 1)));
  if (target.status.some(s => s.id === 'guard')) amount = Math.max(1, Math.round(amount * 0.6));
  return { amount, critical };
}

function applyStatus(target, effect) {
  if (!effect || !effect.status) return;
  target.status = target.status.filter(s => s.id !== effect.status);
  target.status.push({ id: effect.status, turns: clamp(Number(effect.turns) || 1, 1, 3) });
}

function tickCreature(creature) {
  for (const id of Object.keys(creature.cooldowns)) creature.cooldowns[id] = Math.max(0, creature.cooldowns[id] - 1);
  creature.status = creature.status.map(s => ({ ...s, turns: s.turns - 1 })).filter(s => s.turns > 0);
}

function captureChance(target) {
  const species = Data.speciesById[target.speciesId];
  const base = Data.rarity[species.rarity].capture;
  const hpFactor = 1 - target.hp / target.maxHp;
  return clamp(base * (0.32 + hpFactor * 0.68), 0.03, species.rarity === 'monster' ? 0.1 : 0.78);
}

function processAttack(state, sideKey, action, rng, events) {
  const side = state.sides[sideKey];
  const foeKey = other(sideKey);
  const foe = state.sides[foeKey];
  const actor = active(side);
  const target = active(foe);
  if (!actor || actor.hp <= 0 || !target || target.hp <= 0) return;
  if (actor.status.some(s => s.id === 'stunned')) {
    events.push({ type: 'status', actorSide: sideKey, targetSide: sideKey, status: 'stunned', message: `${actor.nickname}은 몸을 움직이지 못했다!` });
    return;
  }
  const species = Data.speciesById[actor.speciesId];
  const move = action.type === 'skill' ? species.skill : species.normalAttack;
  let accuracy = move.accuracy;
  if (actor.status.some(s => s.id === 'blur')) accuracy *= 0.76;
  events.push({ type: action.type, actorSide: sideKey, targetSide: foeKey, actorCreatureId: actor.id, targetCreatureId: target.id, skillId: move.id, attackKind: move.kind || 'physical', message: `${actor.nickname}의 ${move.name}!` });
  if (roll(rng) >= accuracy) {
    events.push({ type: 'miss', actorSide: sideKey, targetSide: foeKey, actorCreatureId: actor.id, targetCreatureId: target.id, skillId: move.id, amount: 0, remainingHp: target.hp, message: '공격이 빗나갔다.' });
    return;
  }
  const hit = calculateDamage(actor, target, move, rng);
  target.hp = Math.max(0, target.hp - hit.amount);
  if (action.type === 'skill') {
    actor.cooldowns[move.id] = Math.max(1, move.cooldown);
    const selfBuff = move.effect && (move.effect.status === 'swift' || move.effect.status === 'guard');
    applyStatus(selfBuff ? actor : target, move.effect);
  }
  events.push({ type: 'hit', actorSide: sideKey, targetSide: foeKey, actorCreatureId: actor.id, targetCreatureId: target.id, amount: hit.amount, remainingHp: target.hp, skillId: move.id, critical: hit.critical, message: `${hit.amount} 피해${hit.critical ? ' · 치명타!' : ''}` });
}

function perform(state, sideKey, action, rng, events) {
  const side = state.sides[sideKey];
  const foeKey = other(sideKey);
  if (action.type === 'switch') {
    side.active = side.team.findIndex(c => c.id === String(action.creatureId));
    events.push({ type: 'switch', actorSide: sideKey, targetSide: sideKey, creatureId: active(side).id, message: `${active(side).nickname}, 나가자!` });
    return;
  }
  if (action.type === 'retreat') {
    state.status = 'finished'; state.result = { winner: foeKey, reason: 'retreat' };
    events.push({ type: 'defeat', actorSide: sideKey, targetSide: foeKey, message: '안전하게 전투에서 물러났다.' });
    return;
  }
  if (action.type === 'capture') {
    const target = active(state.sides[foeKey]);
    const chance = captureChance(target);
    const value = roll(rng);
    const success = target.hp <= Math.ceil(target.maxHp * 0.3) && value < chance;
    state.captureRoll = { chance, roll: value, success, speciesId: target.speciesId };
    events.push({ type: 'capture', actorSide: sideKey, targetSide: foeKey, success, amount: Math.round(chance * 100), message: success ? `${Data.speciesById[target.speciesId].name}와 마음이 통했다!` : '포획에 실패했다.' });
    if (success) { state.status = 'finished'; state.result = { winner: sideKey, reason: 'capture', capturedSpeciesId: target.speciesId }; }
    return;
  }
  processAttack(state, sideKey, action, rng, events);
}

function ensureActive(state, sideKey, events) {
  const side = state.sides[sideKey];
  if (active(side) && active(side).hp > 0) return true;
  const next = livingIndexes(side)[0];
  if (next == null) return false;
  side.active = next;
  side.entryPriority = active(side).id;
  events.push({ type: 'switch', actorSide: sideKey, targetSide: sideKey, creatureId: active(side).id, forced: true, message: `${active(side).nickname}이 이어서 나섰다!` });
  return true;
}

function resolveTurn(input, options) {
  const state = clone(input);
  const rng = options && options.rng;
  const now = options && Number(options.now) || Date.now();
  if (state.status !== 'active') return { battle: state, state, resolved: false, events: [], result: state.result };
  if (!state.sides.a.pending || !state.sides.b.pending) throw new Error('양쪽 행동이 모두 준비되지 않았습니다.');
  const events = [];
  const round = state.turn;
  const choices = ['a', 'b'].map(key => ({ key, action: state.sides[key].pending, actorId: active(state.sides[key]).id, entryPriority: state.sides[key].entryPriority === active(state.sides[key]).id, speed: effectiveSpeed(active(state.sides[key])) }));
  for (const key of ['a', 'b']) state.sides[key].entryPriority = null;
  choices.sort((x, y) => {
    const xPriority = x.action.type === 'switch' ? 3 : x.action.type === 'retreat' ? 4 : x.action.type === 'capture' ? 2 : 1;
    const yPriority = y.action.type === 'switch' ? 3 : y.action.type === 'retreat' ? 4 : y.action.type === 'capture' ? 2 : 1;
    if (xPriority !== yPriority) return yPriority - xPriority;
    if (x.entryPriority !== y.entryPriority) return Number(y.entryPriority) - Number(x.entryPriority);
    if (x.speed !== y.speed) return y.speed - x.speed;
    return x.key === (round % 2 ? 'a' : 'b') ? -1 : 1;
  });
  for (const choice of choices) {
    if (state.status !== 'active') break;
    if (!ensureActive(state, choice.key, events)) continue;
    if (active(state.sides[choice.key]).id !== choice.actorId) {
      events.push({ type: 'skip', actorSide: choice.key, targetSide: choice.key, actorCreatureId: choice.actorId, message: '쓰러져서 이번 턴 행동을 이어갈 수 없다.' });
      continue;
    }
    perform(state, choice.key, choice.action, rng, events);
    const foe = other(choice.key);
    if (!ensureActive(state, foe, events)) {
      state.status = 'finished'; state.result = { winner: choice.key, reason: 'defeat' };
      events.push({ type: choice.key === 'a' ? 'victory' : 'defeat', actorSide: choice.key, targetSide: foe, message: choice.key === 'a' ? '탐험대가 승리했다!' : '전투에서 패배했다.' });
    }
  }
  for (const key of ['a', 'b']) {
    state.sides[key].pending = null;
    state.sides[key].team.forEach(tickCreature);
  }
  events.forEach((event, index) => { event.round = round; event.eventSeq = `${state.id}:${round}:${index + 1}`; });
  state.events = events;
  if (state.status === 'active') { state.turn += 1; state.deadline = now + TURN_MS; }
  return { battle: state, state, resolved: true, events, result: state.result };
}

function submitAction(input, sideKey, action, options) {
  const state = clone(input);
  validateAction(state, sideKey, action);
  state.sides[sideKey].pending = { type: action.type, creatureId: action.creatureId == null ? undefined : String(action.creatureId) };
  if (state.type === 'field' && sideKey === 'a' && !state.sides.b.pending) state.sides.b.pending = autoAction(state, 'b', options && options.rng);
  if (state.sides.a.pending && state.sides.b.pending) return resolveTurn(state, options);
  return { battle: state, state, resolved: false, events: [], result: null };
}

function applyXp(creature, amount) {
  const next = { ...creature, level: clamp(Number(creature.level) || 1, 1, 50), xp: Math.max(0, Number(creature.xp) || 0) };
  let gained = Math.max(0, Math.floor(Number(amount) || 0));
  next.xp += gained;
  const levels = [];
  while (next.level < 50 && next.xp >= xpForLevel(next.level)) {
    next.xp -= xpForLevel(next.level); next.level += 1; levels.push(next.level);
  }
  const stats = statsForCreature(next);
  next.hp = clamp((Number(next.hp) || 0) + levels.length * 5, 0, stats.maxHealth);
  return { creature: next, gained, levels, stats, combatPower: combatPower(next) };
}

function healProfile(profile) {
  const result = clone(profile || {});
  result.collection = (result.collection || []).map(creature => ({ ...creature, hp: statsForCreature(creature).maxHealth }));
  return result;
}

function evolveCreature(creature) {
  const source = Data.speciesById[creature.speciesId];
  if (!source || !source.evolvesTo) throw new Error('진화할 수 없는 곤충입니다.');
  if ((Number(creature.level) || 1) < 5) throw new Error('진화하려면 5레벨이 필요합니다.');
  const next = { ...creature, speciesId: source.evolvesTo, nickname: Data.speciesById[source.evolvesTo].name };
  next.hp = statsForCreature(next).maxHealth;
  return next;
}

function publicBattle(state, viewerSide) {
  if (!state) return null;
  const out = clone(state);
  for (const key of ['a', 'b']) out.sides[key].pending = out.sides[key].pending ? (key === viewerSide ? out.sides[key].pending : { locked: true }) : null;
  return out;
}

module.exports = { TURN_MS, MAX_TEAM, xpForLevel, statsForCreature, combatPower, createBattle, submitAction, resolveTurn, autoAction, applyXp, healProfile, evolveCreature, publicBattle };
