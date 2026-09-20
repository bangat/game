'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.INSECT_TEST_BASE || 'http://127.0.0.1:4193';
const output = path.resolve(__dirname, '../test-output');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  try {
    await page.goto(base + '/대기실.html?emulator=1');
    await page.waitForFunction(() => document.querySelector('#my-profile-nickname')?.textContent !== '...');
    await page.click('#create-room-btn');
    await page.locator('.game-list-item').filter({ hasText: '이슬숲 탐험대' }).click();
    await page.waitForSelector('#start-game-btn:enabled');
    await page.click('#start-game-btn');
    await page.waitForURL('**/insect_expedition/index.html?roomId=*');
    await page.waitForFunction(() => window.InsectApp?.ready);
    await page.locator('#enter-world').tap();
    const cdp = await page.context().newCDPSession(page);
    const box = await page.locator('[aria-label="이동 스틱"]').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    for (const alpha of [Math.PI / 2, 0, Math.PI, -Math.PI / 2]) {
      await page.evaluate(alpha => { InsectApp.world.camera.alpha = alpha; }, alpha);
      await page.waitForTimeout(200);
      const before = await page.evaluate(() => { const s = InsectApp.getSnapshot(); return s.players.find(p => p.uid === s.you); });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 24, y: y - 32, id: 1 }] });
      await page.waitForTimeout(500);
      const motion = await page.evaluate(() => {
        const rig = InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata;
        return { weight: rig.walkWeight, hip: rig.legs[0].rotation.x,
          handLinked: rig.arms[0].getChildMeshes().some(m => m.name === 'hand-l'),
          bootLinked: rig.knees[0].getChildMeshes().some(m => m.name === 'boot-l') };
      });
      await page.waitForTimeout(200);
      const changedHip = await page.evaluate(() => InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.legs[0].rotation.x);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(250);
      const direction = await page.evaluate(before => {
        const s = InsectApp.getSnapshot(), me = s.players.find(p => p.uid === s.you), world = InsectApp.world;
        const delta = new BABYLON.Vector3(me.x - before.x, 0, me.z - before.z);
        const projected = BABYLON.Vector3.TransformNormal(delta, world.camera.getViewMatrix());
        return { x: projected.x, y: projected.y, distance: delta.length() };
      }, before);
      assert(direction.x < -0.3 && direction.y > 0.3, `11시 화면 방향: ${alpha} ${JSON.stringify(direction)}`);
      assert((-0.6 * direction.x + 0.8 * direction.y) / Math.hypot(direction.x, direction.y) > 0.98, '화면에 투영된 이동 각도가 스틱 각도와 일치한다');
      assert(motion.weight > 0.25 && Math.abs(changedHip - motion.hip) > 0.04, '실제 이동 중 보행 변화');
      assert(motion.handLinked && motion.bootLinked, '손과 신발이 관절과 함께 움직인다');
    }
    await page.waitForTimeout(900);
    assert(await page.evaluate(() => InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.walkWeight < 0.03), '정지 후 보행 정지');

    async function walkTo(target) {
      await page.waitForTimeout(120);
      for (let i = 0; i < 130; i++) {
        const done = await page.evaluate(async target => {
          const s = InsectApp.getSnapshot(), me = s.players.find(p => p.uid === s.you);
          const dx = target.x - me.x, dz = target.z - me.z, distance = Math.hypot(dx, dz);
          if (distance < 0.35) { await InsectApp.send('move', {x:0,z:0}); return true; }
          const scale = Math.max(1, distance);
          await InsectApp.send('move', { x: dx / scale, z: dz / scale }); return false;
        }, target);
        if (done) return;
        await page.waitForTimeout(100);
      }
      throw new Error('채집 거리 이동 시간 초과');
    }
    const spawn = await page.evaluate(() => InsectApp.getSnapshot().spawns.find(s => !s.field && s.available && s.x === -8 && s.z === 18));
    assert(spawn, '검증용 연구소 주변 곤충');
    await walkTo({ x: spawn.x, z: spawn.z + 3 });
    const button = page.locator('.ix-nearby [data-act="collect"]');
    await button.waitFor({ state: 'visible' });
    assert.equal(await button.getAttribute('data-id'), spawn.id);
    const bounds = await page.locator('.ix-nearby').boundingBox();
    assert(Math.abs(bounds.x + bounds.width / 2 - 195) < 2 && Math.abs(bounds.y + bounds.height / 2 - 422) < 2, '화면 중앙 채집 안내');
    await page.screenshot({ path: path.join(output, 'nearby-collect-mobile.png') });
    await page.locator('[data-act="panel"][data-value="collection"]').tap();
    assert.equal(await page.locator('.ix-nearby').count(), 0, '목록을 볼 때는 채집 버튼 숨김');
    await page.locator('[data-act="close-panel"]').tap();
    await button.waitFor({ state: 'visible' });
    await walkTo({ x: spawn.x, z: spawn.z + 5 });
    assert.equal(await page.locator('.ix-nearby').count(), 0, '채집 거리 밖에서 자동 숨김');
    await walkTo({ x: spawn.x, z: spawn.z + 3 });
    await button.waitFor({ state: 'visible' });
    await button.tap();
    await page.waitForFunction(() => /포획 성공|새로운 곤충|포획에 실패/.test(document.querySelector('.ix-toast')?.textContent || ''));
    await page.setViewportSize({width:844,height:390});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:path.join(output,'nearby-landscape.png')});
    assert.deepEqual(errors, []);
    console.log('통과: 카메라 4방향에서 11시 터치 이동, 관절 보행·정지, 중앙 채집 표시·숨김·재진입·실제 채집, 가로 화면.');
  } finally {
    if (await page.locator('[data-act="exit"]').count()) {
      await page.locator('[data-act="exit"]').click();
      await page.waitForURL(url => decodeURIComponent(url.pathname) === '/대기실.html').catch(() => {});
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
