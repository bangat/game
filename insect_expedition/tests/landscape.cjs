'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.INSECT_QA_ORIGIN || 'http://127.0.0.1:4193/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    // Model browsers which reject both APIs: CSS fallback must remain playable.
    await context.addInitScript(() => {
      Document.prototype.exitFullscreen = async () => {};
      Element.prototype.requestFullscreen = async () => { window.fullscreenAttempted = true; throw new Error('unsupported'); };
      if (screen.orientation) screen.orientation.lock = async () => { window.landscapeAttempted = true; throw new Error('unsupported'); };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(base + '대기실.html?emulator=1');
    await page.waitForFunction(() => document.querySelector('#my-profile-nickname')?.textContent !== '...');
    await page.locator('#create-room-btn').click();
    await page.locator('.game-list-item').filter({ hasText: '이슬숲 탐험대' }).click();
    await page.locator('#start-game-btn').click();
    await page.waitForURL('**/insect_expedition/index.html?*');
    const getGame = async () => {
      await page.locator('#game-frame').waitFor();
      const game = await (await page.locator('#game-frame').elementHandle()).contentFrame();
      await game.waitForFunction(() => window.InsectApp?.ready);
      return game;
    };
    let game = await getGame();
    assert.deepEqual(await game.evaluate(() => [innerWidth, innerHeight]), [844, 390]);
    await page.screenshot({ path: path.join(__dirname, '../test-output/landscape-portrait-start.png') });
    await game.locator('#enter-world').tap();
    await game.locator('[aria-label="이동 스틱"]').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => fullscreenAttempted && landscapeAttempted), true);
    const cdp = await context.newCDPSession(page);
    const before = await game.evaluate(() => ({ alpha: InsectApp.world.camera.alpha, p: InsectApp.getSnapshot().players.find(p => p.uid === InsectApp.getSnapshot().you) }));
    const box = await game.locator('[aria-label="이동 스틱"]').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    // A downward physical drag is rightward in the rotated game viewport.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 28, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y + 28, id: 1 }, { x: 220, y: 420, id: 2 }] });
    for (let n = 1; n <= 6; n++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 28, id: 1 }, { x: 220, y: 420 + n * 10, id: 2 }] });
      await page.waitForTimeout(120);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    const after = await game.evaluate(() => ({ alpha: InsectApp.world.camera.alpha, p: InsectApp.getSnapshot().players.find(p => p.uid === InsectApp.getSnapshot().you) }));
    assert(Math.hypot(after.p.x - before.p.x, after.p.z - before.p.z) > 1, '회전된 이동 스틱으로 실제 이동');
    assert(Math.abs(after.alpha - before.alpha) > .01, '회전 상태 동시 터치 카메라');
    const instanceId = await game.evaluate(() => window.orientationTestInstance = Math.random());
    for (const size of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:568,height:320},{width:1440,height:900},{width:390,height:780}]) {
      await page.setViewportSize(size);
      await game.waitForFunction(() => innerWidth >= innerHeight);
      await page.waitForTimeout(250);
      assert.equal(await game.evaluate(() => window.orientationTestInstance), instanceId, '회전 중 게임 재시작 없음');
      const overlap = await game.evaluate(() => {
        const a = document.querySelector('.ix-top').getBoundingClientRect(), b = document.querySelector('.ix-team').getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
      assert.equal(overlap, false, '상단 메뉴와 팀 표시가 겹치지 않음');
      await game.locator('[data-act="panel"][data-value="map"]').tap();
      assert.equal(await game.locator('[data-act="travel"]').count(), 9);
      assert.equal(await game.locator('[aria-label="이동 스틱"]').isVisible(), false);
      await game.locator('[data-act="travel"]').last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(__dirname, '../test-output/landscape-map-' + size.width + 'x' + size.height + '.png') });
      await game.locator('[data-act="close-panel"]').tap();
      assert(await game.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({ path: path.join(__dirname, '../test-output/landscape-portrait-world.png') });
    await page.reload();
    game = await getGame();
    assert(await game.evaluate(() => innerWidth > innerHeight));
    await game.locator('#enter-world').tap();
    await game.locator('[data-act="exit"]').tap();
    await page.waitForURL(url => decodeURIComponent(url.pathname) === '/대기실.html');
    assert.equal(await page.locator('#game-frame').count(), 0);
    assert.deepEqual(errors, []);
    // Separate desktop context exercises the fine-pointer layout.
    const desktop = await browser.newContext({viewport:{width:1440,height:900}});

    const desktopPage = await desktop.newPage();
    await desktopPage.goto(base+'대기실.html?emulator=1');
    await desktopPage.waitForFunction(()=>document.querySelector('#my-profile-nickname')?.textContent !== '...');
    await desktopPage.locator('#create-room-btn').click();
    await desktopPage.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'}).click();
    await desktopPage.locator('#start-game-btn').click();
    await desktopPage.waitForURL('**/insect_expedition/index.html?*');
    const desktopGame=await (await desktopPage.locator('#game-frame').elementHandle()).contentFrame();
    await desktopGame.waitForFunction(()=>window.InsectApp?.ready);
    await desktopGame.locator('#enter-world').click();
    assert.deepEqual(await desktopGame.evaluate(()=>[innerWidth,innerHeight]),[1440,900]);
    await desktopPage.screenshot({path:path.join(__dirname,'../test-output/landscape-desktop.png')});
    await desktopGame.locator('[data-act="exit"]').click();
    await desktopPage.waitForURL(url => decodeURIComponent(url.pathname) === '/대기실.html');
    console.log('통과: 가로 잠금 거부 대체 화면, 실제 동시 터치 이동·카메라, 6종 화면 크기, 지도 스크롤, 재접속, 대기실 복귀, 데스크톱.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
