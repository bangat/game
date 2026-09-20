const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..', '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

test('실제 Chromium에서 탐험 월드와 전투 타격 프레임을 렌더링한다', async (t) => {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.resolve(projectRoot, relative);
    if (!file.startsWith(projectRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/insect_expedition/tests/world-smoke.html`);
  await page.waitForFunction(() => window.smoke && smoke.world && smoke.world.scene.meshes.length > 30);
  const exploration = await page.evaluate(() => ({ meshes: smoke.world.scene.meshes.length, merged: smoke.world.scene.meshes.filter((mesh) => mesh.name.startsWith('world-static')).length, active: smoke.world.scene.activeCamera.name, size: InsectWorld.worldSize, selfDuplicate: !!smoke.world.scene.getTransformNodeByName('avatar-me'), friend: !!smoke.world.scene.getTransformNodeByName('avatar-friend') }));
  assert.ok(exploration.meshes > 30);
  assert.ok(exploration.merged > 0, '정적 환경 메시가 재질별로 병합되어야 한다');
  assert.equal(exploration.active, 'explore-camera');
  assert.equal(exploration.size, 480);
  assert.equal(exploration.selfDuplicate, false);
  assert.equal(exploration.friend, true);
  await page.evaluate(() => { const button = document.createElement('button'); button.id = 'focus-button'; document.body.appendChild(button); button.focus(); });
  await page.keyboard.down('d');
  await page.waitForFunction(() => smoke.moves.some((move) => move.x < -0.9));
  await page.keyboard.up('d');
  await page.waitForFunction(() => smoke.moves.some((move) => move.x === 0 && move.z === 0));
  if (process.env.WORLD_SCREENSHOT) await page.screenshot({ path: `${process.env.WORLD_SCREENSHOT}-exploration.png` });
  await page.evaluate(()=>{smoke.world.camera.radius=37;smoke.world.camera.alpha=.7;smoke.world.camera.beta=.9;});
  await page.evaluate(() => {
    smoke.world.setState({ battle: { sides: { a: { uid: 'me', active: 0, team: [{ name: '이슬무당벌레', speciesId: 'dew_ladybird' }] }, b: { uid: 'field', active: 0, team: [{ name: '고목뿔장수', speciesId: 'ancient_rhino' }] } } } });
    smoke.done = smoke.world.playEvents([{ type: 'skill', actorSide: 'a', targetSide: 'b', skillId: 'test-skill' }]).then(() => { smoke.finished = true; });
  });
  await page.waitForFunction(() => smoke.world.scene.transformNodes.some(n=>n.metadata?.side==='player'&&n.position.x>-5));
  const movingMesh = await page.evaluate(()=>{const root=smoke.world.scene.transformNodes.find(n=>n.metadata?.side==='player');const mesh=root.getChildMeshes().find(m=>m.name!=='label');mesh.computeWorldMatrix(true);return {rootX:root.position.x,meshX:mesh.getAbsolutePosition().x};});
  assert(movingMesh.rootX>-5 && movingMesh.meshX>-5,'실제 내 곤충 메시가 상대 방향으로 돌진');
  await page.waitForFunction(() => smoke.hits === 1);
  const sparkHeight = await page.evaluate(() => Math.max(...smoke.world.scene.meshes.filter((mesh) => mesh.name === 'hit-spark').map((mesh) => mesh.position.y)));
  assert.ok(sparkHeight > 40 && sparkHeight < 46, `타격 파티클 높이: ${sparkHeight}`);
  await page.waitForFunction(() => smoke.hits === 1 && smoke.finished === true, null, { timeout: 10000 });
  const result = await page.evaluate(() => ({ hits: smoke.hits, battleEnabled: smoke.world.scene.getTransformNodeByName('battle-arena').isEnabled() }));
  assert.equal(result.hits, 1);
  assert.equal(result.battleEnabled, true);
  await page.evaluate(async () => {
    smoke.world.setState({ battle: { sides: { a: { uid: 'me', active: 0, team: [{ name: '교체 곤충', speciesId: 'moon_moth' }] }, b: { uid: 'field', active: 0, team: [{ name: '고목뿔장수', speciesId: 'ancient_rhino' }] } } } });
    await smoke.world.playEvents([{ type: 'switch', actorSide: 'a', targetSide: 'a' }]);
  });
  assert.equal(await page.evaluate(() => !!smoke.world.scene.getTransformNodeByName('creature-arena-player-교체 곤충')), true);
  await page.evaluate(() => { smoke.world.playEvents([{ type: 'attack', skillId: 'normal-attack', actorSide: 'a', targetSide: 'b' }]); });
  await page.waitForFunction(() => smoke.hits === 2);
  assert.equal(await page.evaluate(() => smoke.world.scene.meshes.filter((mesh) => mesh.name === 'hit-spark' && !mesh.isDisposed()).length), 6, '일반 공격은 고유 스킬 파티클 수를 사용하지 않아야 한다');
  if (process.env.WORLD_SCREENSHOT) await page.screenshot({ path: `${process.env.WORLD_SCREENSHOT}-battle.png` });
  await page.waitForTimeout(1000);
  for(const type of ['attack','skill']) {
    await page.evaluate(type=>{smoke.rangedDone=false;smoke.world.playEvents([{type,attackKind:'ranged',skillId:'venom_comet',actorSide:'a',targetSide:'b'}]).then(()=>{smoke.rangedDone=true;});},type);
    await page.waitForFunction(type=>smoke.world.scene.meshes.some(m=>m.name===(type==='skill'?'skill-projectile':'normal-projectile')),type);
    const shot=await page.evaluate(type=>{const actor=smoke.world.scene.transformNodes.find(n=>n.metadata?.side==='player'),projectile=smoke.world.scene.meshes.find(m=>m.name===(type==='skill'?'skill-projectile':'normal-projectile'));return {actorX:actor.position.x,diameter:projectile.getBoundingInfo().boundingBox.extendSize.x*2,effects:smoke.world.scene.transformNodes.some(n=>n.name.startsWith('skill-effect-'))};},type);
    assert(shot.actorX<=-6.5,'원거리 공격은 제자리 발사');assert.equal(shot.effects,type==='skill');assert(type==='skill'?shot.diameter>1:shot.diameter<.6,'일반탄과 기술탄의 크기 구분');
    await page.waitForFunction(()=>smoke.rangedDone);
  }
  const returnMaterials = await page.evaluate(() => {
    smoke.world.setState({battle:null});
    const scene=smoke.world.scene;
    const live=new Set([...scene.materials,...scene.multiMaterials]);
    return scene.meshes.filter(mesh=>mesh.isEnabled()&&mesh.material).every(mesh=>live.has(mesh.material));
  });
  assert.equal(returnMaterials,true,'전투장 정리가 탐험 월드의 공용 재질을 해제하지 않아야 한다');
  const restoredCamera=await page.evaluate(()=>({radius:smoke.world.camera.radius,alpha:smoke.world.camera.alpha,beta:smoke.world.camera.beta}));
  assert.deepEqual(restoredCamera,{radius:37,alpha:.7,beta:.9},'전투에서 돌아오면 탐험 시점 복원');
  assert.deepEqual(errors, []);
});
