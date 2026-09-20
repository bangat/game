'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

(async () => {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, isMobile: true, hasTouch: true });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/insect_expedition/tests/world-smoke.html`);
    await page.evaluate(() => { const base = document.createElement('base'); base.href = '/insect_expedition/'; document.head.appendChild(base); });
    await page.addStyleTag({ url: `http://127.0.0.1:${server.address().port}/insect_expedition/styles.css` });
    await page.addScriptTag({ url: `http://127.0.0.1:${server.address().port}/insect_expedition/ui.js` });
    await page.evaluate(() => {
      const root = document.createElement('div'); root.id = 'ui-root'; document.body.appendChild(root);
      window.questUi = InsectUI.create({ send: async () => ({ message: '확인' }) });
      questUi.setState({ you: { uid: 'me', inWorld: true, x: 4, z: 11 }, players: [{ uid: 'me', nickname: '탐험가', x: 4, z: 11 }], locationName: '이슬숲 연구소', spawns: [{ id: 'wild', speciesId: 'cave_stag', x: 8, z: 12, available: true, field: true, level: 8 }], profile: { collection: [{ id: 'stag', speciesId: 'cave_stag', nickname: '동굴사슴벌레', level: 5, xp: 0, hp: 88, maxHp: 88 }], team: ['stag'], discoveries: ['cave_stag'], supplies: { heals: 3, feeds: 3 }, quest: { status: 'ready', progress: 3, target: 3 } } });
      questUi.setSelection({ type: 'npc', id: 'guide-mira' });
    });
    await page.waitForSelector('.ix-quest-strip');
    await page.waitForFunction(() => [...document.querySelectorAll('#ui-root img')].every(img => img.complete && img.naturalWidth > 0));
    assert.equal(await page.locator('.ix-selection strong').textContent(), '미라 연구원');
    await page.screenshot({ path: path.join(root, 'insect_expedition', 'test-output', 'quest-desktop.png') });
    await page.locator('[data-act="panel"][data-value="map"]').click();
    await page.waitForSelector('.ix-map-list');
    assert.equal(await page.locator('.ix-map-list button').count(), 9);
    assert.equal(await page.locator('[aria-label="이동 스틱"]').isVisible(), false, '지도 위에 이동 스틱이 남지 않아야 함');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.ix-npc').count(), 0, '지도와 NPC 대화가 겹치지 않아야 함');
    await page.screenshot({ path: path.join(root, 'insect_expedition', 'test-output', 'quest-map-mobile.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('[data-act="close-panel"]').click();
    await page.screenshot({ path: path.join(root, 'insect_expedition', 'test-output', 'quest-world-mobile.png') });
    await page.locator('[data-act="panel"][data-value="collection"]').click();
    await page.locator('[data-act="detail"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#ui-root img')].every(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: path.join(root, 'insect_expedition', 'test-output', 'quest-growth-mobile.png') });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().then(() => console.log('통과: 퀘스트·NPC·지도 UI를 데스크톱과 모바일 Chromium 화면에서 확인했습니다.')).catch(error => { console.error(error); process.exitCode = 1; });
