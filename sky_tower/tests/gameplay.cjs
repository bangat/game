'use strict';

const assert = require('node:assert/strict');
global.window = global;
global.addEventListener = function () {};
global.removeEventListener = function () {};
global.dispatchEvent = function () {};
global.CustomEvent = function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; };
global.localStorage = { getItem() { return null; }, setItem() {} };
global.BABYLON = require('../vendor/babylon-9.27.1.js');
require('../characters.js');
require('../world.js');
require('../game.js');

const B = global.BABYLON;
const engine = new B.NullEngine({ renderWidth: 800, renderHeight: 600, textureSize: 512, deterministicLockstep: true, lockstepMaxSteps: 4 });
const scene = new B.Scene(engine);
const canvas = {};
const game = global.SkyTowerGame.create({ BABYLON: B, engine, scene, canvas, profile: { id: 'test', name: '테스트' }, startEpoch: 0 });

function platformTop(p) { return p.mesh.position.y + p.height / 2; }
function settleOn(p) {
  game._debugSetPlayer({ x: p.mesh.position.x, y: platformTop(p) + 0.94, z: p.mesh.position.z }, { y: -0.2 });
  for (let i = 0; i < 5; i += 1) game._debugStep(1 / 120);
}

// 점프가 각 다음 발판의 상승 높이와 가장자리 간격을 감당하는지 정적 검증한다.
const gravity = 21, jumpVelocity = 11, speed = 5.6;
let worstGap = 0;
for (let i = 1; i < game.world.platforms.length; i += 1) {
  const a = game.world.platforms[i - 1], b = game.world.platforms[i];
  const rise = platformTop(b) - platformTop(a);
  const discriminant = jumpVelocity * jumpVelocity - 2 * gravity * rise;
  assert.ok(discriminant >= 0, `발판 ${i} 상승 높이 ${rise.toFixed(2)}m 도달 불가`);
  const descendingTime = (jumpVelocity + Math.sqrt(discriminant)) / gravity;
  const dx = Math.max(0, Math.abs(b.base.x - a.base.x) - (a.width + b.width) / 2);
  const dz = Math.max(0, Math.abs(b.base.z - a.base.z) - (a.depth + b.depth) / 2);
  const edgeGap = Math.hypot(dx, dz); worstGap = Math.max(worstGap, edgeGap);
  assert.ok(edgeGap <= speed * descendingTime + 0.01, `발판 ${i} 간격 ${edgeGap.toFixed(2)}m 도달 불가`);
}

// 이동 발판 위 플레이어가 발판 delta를 한 물리 스텝에 한 번만 받아 상대 위치를 유지해야 한다.
const moving = game.world.platforms.find((p) => p.type === 'moving');
assert.ok(moving, '이동 발판이 필요합니다.');
settleOn(moving);
const offsetBefore = game.getSnapshot().position.x - moving.mesh.position.x;
for (let i = 0; i < 120; i += 1) game._debugStep(1 / 120);
const offsetAfter = game.getSnapshot().position.x - moving.mesh.position.x;
assert.ok(Math.abs(offsetAfter - offsetBefore) < 0.08, `이동 발판 탑승 오차가 큽니다: ${Math.abs(offsetAfter - offsetBefore)}`);

// 모든 인접 발판을 실제 이동·점프 물리로 각각 건넌다. 장애물은 순수 루트 도달성 검사에서만 치운다.
const hazardY = game.world.hazards.map((h) => h.node.position.y);
game.world.hazards.forEach((h) => { h.node.position.y = 999; });
for (let index = 1; index < game.world.platforms.length; index += 1) {
  const from = game.world.platforms[index - 1], to = game.world.platforms[index];
  if (from.type === 'vanish') { while (from.active) game._debugStep(0.05); while (!from.active) game._debugStep(0.05); }
  if (to.type === 'vanish') { while (to.active) game._debugStep(0.05); while (!to.active) game._debugStep(0.05); }
  settleOn(from);
  const initialDx = to.mesh.position.x - game.getSnapshot().position.x, initialDz = to.mesh.position.z - game.getSnapshot().position.z, initialLength = Math.hypot(initialDx, initialDz) || 1;
  game.setInput({ x: initialDx / initialLength, z: initialDz / initialLength });
  for (let runup = 0; runup < 18; runup += 1) game._debugStep(1 / 120);
  game.setInput({ jump: true });
  let landed = false;
  for (let step = 0; step < 300; step += 1) {
    const pos = game.getSnapshot().position, tx = to.mesh.position.x, tz = to.mesh.position.z;
    const dx = tx - pos.x, dz = tz - pos.z, length = Math.hypot(dx, dz) || 1;
    game.setInput({ x: dx / length, z: dz / length }); game._debugStep(1 / 120);
    const now = game.getSnapshot().position, expectedY = platformTop(to) + 0.92;
    if (Math.abs(now.y - expectedY) < 0.025 && Math.abs(now.x - tx) <= to.width / 2 && Math.abs(now.z - tz) <= to.depth / 2) { landed = true; break; }
  }
  game.setInput({ x: 0, z: 0 });
  assert.ok(landed, `발판 ${index - 1} → ${index} 실제 점프 실패 (${JSON.stringify(game.getSnapshot().position)})`);
}
// 후속 체크포인트를 먼저 밟아도 건너뛸 수 없고, 순서대로 밟으면 정상까지 완료된다.
game.restart();
const finish = game.world.checkpoints.at(-1);
game._debugSetPlayer(finish.position, { y: -0.1 }); for (let step = 0; step < 30; step += 1) game._debugStep(1 / 120);
assert.equal(game.getState().checkpoint, 0, '체크포인트 건너뛰기가 허용됐습니다.');
for (let i = 1; i < game.world.checkpoints.length; i += 1) {
  const cp = game.world.checkpoints[i];
  game._debugSetPlayer(cp.position, { y: -0.1 }); for (let step = 0; step < 30; step += 1) game._debugStep(1 / 120);
  assert.equal(game.getState().checkpoint, i, `체크포인트 ${i} 판정 실패`);
}
assert.equal(game.getState().finished, true, '정상 완주 판정 실패');
game.world.hazards.forEach((h, i) => { h.node.position.y = hazardY[i]; });

// 저장 상태 복원과 재시작 상태를 검증한다.
game.restoreState({ checkpoint: 2, falls: 7, elapsed: 12.5, finished: false });
assert.deepEqual({ checkpoint: game.getState().checkpoint, falls: game.getState().falls, elapsed: game.getState().elapsed }, { checkpoint: 2, falls: 7, elapsed: 12.5 });
game.restart();
assert.deepEqual({ checkpoint: game.getState().checkpoint, falls: game.getState().falls, finished: game.getState().finished }, { checkpoint: 0, falls: 0, finished: false });

// 리스폰 직전에 들어온 점프 입력이 새 위치에서 뒤늦게 실행되면 안 된다.
game.setInput({ jump: true });
game.respawn();
const respawnY = game.getSnapshot().position.y;
game._debugStep(1 / 120);
assert.ok(game.getSnapshot().position.y <= respawnY, '리스폰 뒤 이전 점프 입력이 다시 실행됐습니다.');

// 입장 뒤 캐릭터나 이름이 확정되면 원격 아바타 외형도 즉시 교체되어야 한다.
game.upsertRemotePlayer('remote-test', { position: { x: 2, y: 3, z: 4 }, character: 'original', name: '입장 중' });
let remoteAvatar = scene.transformNodes.find((node) => node.name === 'avatar-remote-test' && !node.isDisposed());
assert.ok(remoteAvatar, '원격 아바타가 생성되지 않았습니다.');
const firstRemoteAvatar = remoteAvatar;
game.upsertRemotePlayer('remote-test', { position: { x: 5, y: 6, z: 7 }, character: 'green', name: '새싹별 친구', avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' });
remoteAvatar = scene.transformNodes.find((node) => node.name === 'avatar-remote-test' && !node.isDisposed());
assert.notEqual(remoteAvatar, firstRemoteAvatar, '원격 캐릭터 변경이 외형에 반영되지 않았습니다.');
assert.equal(firstRemoteAvatar.isDisposed(), true, '교체된 원격 아바타가 정리되지 않았습니다.');
assert.equal(remoteAvatar.metadata.profile.character, 'green');
assert.equal(remoteAvatar.metadata.profile.name, '새싹별 친구');
assert.equal(remoteAvatar.metadata.portraitMaterial.diffuseTexture._invertY, true, '캐릭터 스프라이트가 상하 반전됩니다.');
assert.deepEqual({ x: remoteAvatar.position.x, y: remoteAvatar.position.y, z: remoteAvatar.position.z }, { x: 2, y: 2.08, z: 4 }, '외형 교체 중 표시 위치가 튀었습니다.');
game.removeRemotePlayer('remote-test');

// 기존 방 프로필의 아바타 ID와 상대 경로는 실제 URL로 해석되고 모든 애니메이션 프레임에 유지되어야 한다.
game.upsertRemotePlayer('legacy-id', { position: { x: 0, y: 2, z: 0 }, character: 'original', name: '펭귄', avatar: 'penguin_parka' });
let legacyAvatar = scene.transformNodes.find((node) => node.name === 'avatar-legacy-id' && !node.isDisposed());
assert.equal(legacyAvatar.metadata.profile.imageUrl, '../아바타폴더/펭귄정면.png');
assert.deepEqual(Object.values(legacyAvatar.metadata.profile.frames), Array(4).fill('../아바타폴더/펭귄정면.png'));
game.upsertRemotePlayer('legacy-id', { position: { x: 0, y: 2, z: 0 }, character: 'original', name: '강아지', avatar: './아바타폴더/강아지정면.png' });
legacyAvatar = scene.transformNodes.find((node) => node.name === 'avatar-legacy-id' && !node.isDisposed());
assert.equal(legacyAvatar.metadata.profile.imageUrl, '../아바타폴더/강아지정면.png');
assert.deepEqual(Object.values(legacyAvatar.metadata.profile.frames), Array(4).fill('../아바타폴더/강아지정면.png'));
game.removeRemotePlayer('legacy-id');

console.log(`게임플레이 검증 통과: ${game.world.platforms.length}개 발판, 최대 가장자리 간격 ${worstGap.toFixed(2)}m, ${game.world.checkpoints.length - 1}개 구간`);
game.dispose();
