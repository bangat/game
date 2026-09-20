const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function load(file, extras = {}) {
  const storage = new Map();
  const window = Object.assign({
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    dispatchEvent() {},
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init.detail; }
  }, extras);
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), { window }, { filename: file });
  return window;
}

test('여섯 캐릭터 ID와 무료 선택 저장 계약을 지킨다', () => {
  const window = load('characters.js');
  const api = window.InsectCharacters;
  assert.deepEqual(Array.from(api.list, (item) => item.id), ['original', 'scout', 'botanist', 'beekeeper', 'miner', 'river']);
  assert.equal(api.list.every((item) => item.free === true), true);
  assert.equal(api.select('miner').id, 'miner');
  assert.equal(api.getSelected().id, 'miner');
  assert.equal(api.select('unknown').id, 'original');
});

test('월드 경계, 안전 구역, 서버 공유 장애물 형식이 안정적이다', () => {
  const window = load('world.js');
  const api = window.InsectWorld;
  assert.equal(api.worldSize, 240);
  assert.deepEqual(JSON.parse(JSON.stringify(api.safeZone)), { x: 0, z: 0, radius: 22 });
  assert.equal(api.biomes.length, 9);
  assert.deepEqual(Array.from(api.biomes, (item) => item.id), ['forest', 'grassland', 'rock', 'wetland', 'safe', 'river', 'farm', 'cave', 'facility']);
  assert.equal(api.obstacles.length, 8);
  for (const item of api.obstacles) {
    assert.equal(typeof item.id, 'string');
    assert.ok(item.type === 'box' || item.type === 'circle');
    assert.ok(Number.isFinite(item.x) && Number.isFinite(item.z));
    if (item.type === 'box') assert.ok(item.width > 0 && item.depth > 0);
    else assert.ok(item.radius > 0);
  }
});

test('렌더링 API는 Babylon과 canvas 누락을 명확히 거절한다', () => {
  const noBabylon = load('world.js');
  assert.throws(() => noBabylon.InsectWorld.create({ canvas: {} }), /Babylon/);
  const fakeBabylon = load('world.js', { BABYLON: {} });
  assert.throws(() => fakeBabylon.InsectWorld.create({}), /canvas/);
});


test('달리기는 실제로 빠르고 스태미나 소진 후 자동 해제·점진 회복한다', () => {
  const World = require('../server/world.cjs');
  const walk={x:0,z:40,lastMoveAt:1000,stamina:100,staminaAt:1000};
  const run={...walk,sprinting:true};
  World.movePlayer(walk,{x:1,z:0},1200); World.movePlayer(run,{x:1,z:0},1200);
  assert(run.x > walk.x * 1.7);
  for(let now=1400;now<=8000;now+=200) { run.x=0;run.z=40;World.movePlayer(run,{x:1,z:0},now); }
  assert.equal(run.sprinting,false);assert(run.stamina<15);
  World.movePlayer(run,{x:0,z:0},8200);const depleted=run.stamina;
  World.updateStamina(run,10200);assert(run.stamina>depleted&&run.stamina<100);
});
