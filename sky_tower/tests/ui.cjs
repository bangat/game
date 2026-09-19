const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

const cases = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'mobile-portrait', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'mobile-landscape', viewport: { width: 844, height: 390 }, mobile: true }
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const storagePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await storagePage.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException('blocked', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); };
    });
    await storagePage.goto('http://127.0.0.1:4173/sky_tower/?mode=solo', { waitUntil: 'networkidle' });
    await storagePage.locator('[data-character="green"]').click();
    await storagePage.locator('#character-confirm').click();
    await storagePage.waitForFunction(() => window.SkyTowerApp && window.SkyTowerApp.ready && window.SkyTowerApp.game);
    assert.equal(await storagePage.locator('#game-canvas').isVisible(), true, '저장소 차단 시에도 솔로 게임을 시작해야 합니다.');
    await storagePage.close();

    const redirectPage = await browser.newPage();
    const lobbyRequest = redirectPage.waitForRequest(request => request.isNavigationRequest() && decodeURI(new URL(request.url()).pathname).endsWith('/대기실.html'));
    await redirectPage.goto('http://127.0.0.1:4173/sky_tower/', { waitUntil: 'domcontentloaded' });
    await lobbyRequest;
    await redirectPage.close();

    const offlineExitPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await offlineExitPage.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
    await offlineExitPage.route('**/sky_tower/network.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: `window.SkyTowerNetwork = {
        firebaseConfig: {},
        connect: async function (options) {
          const network = {
            localId: 'offline-player',
            getSnapshot: function () { return null; },
            getServerTime: function () { return Date.now(); },
            publishMotion: function () {},
            leave: function () { return new Promise(function () {}); }
          };
          options.onConnection({ online: true, state: 'online' });
          return network;
        }
      };`
    }));
    await offlineExitPage.addInitScript(() => {
      const user = { uid: 'offline-player' };
      const auth = { currentUser: user, onAuthStateChanged(callback) { queueMicrotask(() => callback(user)); return () => {}; } };
      const database = { ref() { return { once: async () => ({ val: () => ({ roomName: '오프라인 종료 테스트' }) }) }; } };
      window.firebase = { apps: [], initializeApp() { this.apps.push({}); }, auth: () => auth, database: () => database };
    });
    await offlineExitPage.goto('http://127.0.0.1:4173/sky_tower/?roomId=offline-test', { waitUntil: 'networkidle' });
    await offlineExitPage.locator('#character-confirm').click();
    await offlineExitPage.waitForFunction(() => window.SkyTowerApp && window.SkyTowerApp.ready && window.SkyTowerApp.network);
    await offlineExitPage.locator('#settings-button').click();
    await offlineExitPage.locator('#pause-button').click();
    const offlineLobbyRequest = offlineExitPage.waitForRequest(request => request.isNavigationRequest() && decodeURI(new URL(request.url()).pathname).endsWith('/대기실.html'), { timeout: 3000 });
    await offlineExitPage.locator('#pause-modal .exit-button').click();
    await offlineLobbyRequest;
    await offlineExitPage.close();

    for (const item of cases) {
      const page = await browser.newPage({ viewport: item.viewport, isMobile: item.mobile, hasTouch: item.mobile });
      const errors = [], inputs = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.addInitScript(() => window.addEventListener('skytower:input', event => (window.__uiInputs ||= []).push(event.detail)));
      await page.goto('http://127.0.0.1:4173/sky_tower/?mode=solo', { waitUntil: 'networkidle' });
      await page.locator('[data-character="green"]').click();
      await page.locator('#character-confirm').click();
      await page.waitForFunction(() => window.SkyTowerApp && window.SkyTowerApp.ready && window.SkyTowerApp.game);
      assert.equal(await page.locator('#character-modal').isVisible(), false, item.name + ': 캐릭터 창이 닫혀야 합니다.');
      assert.equal(await page.locator('#game-canvas').isVisible(), true, item.name + ': 게임 캔버스가 보여야 합니다.');
      await page.locator('#settings-button').click();
      await page.locator('#pause-button').click();
      assert.equal(await page.locator('#pause-modal').isVisible(), true, item.name + ': 일시정지 창이 보여야 합니다.');
      await page.locator('#resume-button').click();
      assert.equal(await page.locator('#pause-modal').isVisible(), false, item.name + ': 계속하기 뒤 일시정지 창이 닫혀야 합니다.');
      if (item.mobile) {
        const jump = page.locator('#jump-button'), box = await jump.boundingBox();
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        const pad = await page.locator('#joystick').boundingBox();
        await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2); await page.mouse.down(); await page.mouse.move(pad.x + pad.width * .8, pad.y + pad.height / 2); await page.mouse.up();
        const canvas = await page.locator('#game-canvas').boundingBox();
        await page.mouse.move(canvas.x + canvas.width * .45, canvas.y + canvas.height * .55); await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width * .6, canvas.y + canvas.height * .5); await page.mouse.up();
        inputs.push(...await page.evaluate(() => window.__uiInputs || []));
        assert(inputs.some(value => value.type === 'jump'), item.name + ': 점프 입력이 필요합니다.');
        assert(inputs.some(value => value.type === 'move' && value.active), item.name + ': 이동 입력이 필요합니다.');
        assert(inputs.some(value => value.type === 'look' && value.active), item.name + ': 시점 입력이 필요합니다.');
      }
      const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, canvas: document.getElementById('game-canvas').getBoundingClientRect().toJSON() }));
      assert.equal(layout.scrollWidth, layout.width, item.name + ': 가로 넘침이 없어야 합니다.');
      assert.equal(errors.length, 0, item.name + ': 콘솔 오류: ' + errors.join(' | '));
      await page.screenshot({ path: path.resolve(__dirname, '../../captures/sky-tower-' + item.name + '.png') });
      console.log('통과:', item.name, '입력', inputs.map(value => value.type).join(','));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
