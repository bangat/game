const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.SKY_TOWER_URL || 'http://127.0.0.1:4173/sky_tower/';
const TIMEOUT = 20_000;

async function bootstrap(browser, nickname) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(value => localStorage.setItem('userNickname', value), nickname);
  await page.goto(`${BASE}?mode=solo&emulator=1`, { waitUntil: 'domcontentloaded' });
  const uid = await page.evaluate(async () => {
    if (!firebase.apps.length) firebase.initializeApp({ apiKey: 'demo-key', authDomain: 'demo-sky-tower.firebaseapp.com', databaseURL: 'https://demo-sky-tower-default-rtdb.firebaseio.com', projectId: 'demo-sky-tower' });
    if (!window.__testEmulatorConnected) {
      firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
      firebase.database().useEmulator('127.0.0.1', 9000);
      window.__testEmulatorConnected = true;
    }
    return (await firebase.auth().signInAnonymously()).user.uid;
  });
  return { context, page, uid };
}

async function enter(client, roomId) {
  await client.page.goto(`${BASE}?roomId=${roomId}&emulator=1`, { waitUntil: 'domcontentloaded' });
  try {
    await client.page.waitForFunction(() => window.SkyTowerApp && window.SkyTowerApp.ready && window.SkyTowerApp.network && window.SkyTowerApp.game, null, { timeout: TIMEOUT });
  } catch (error) {
    const detail = await client.page.evaluate(() => document.querySelector('#error-message')?.textContent || document.body.innerText.slice(0, 500)).catch(() => '화면 진단 실패');
    throw new Error(`${error.message}\n화면: ${detail}`);
  }
}

async function waitRuntime(page, uid, predicate) {
  await page.waitForFunction(({ uid, source }) => {
    const value = SkyTowerApp.network && SkyTowerApp.network.getSnapshot();
    const runtime = value && value.players && value.players[uid] && value.players[uid].runtime;
    return runtime && Function('runtime', `return (${source})(runtime)`)(runtime);
  }, { uid, source: predicate.toString() }, { timeout: TIMEOUT });
}

async function main() {
  assert.match(BASE, /^http:\/\/(127\.0\.0\.1|localhost):4173\//, '운영 서버 URL에서는 테스트할 수 없습니다.');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const clients = [];
  try {
    const host = await bootstrap(browser, '방장'); clients.push(host);
    const roomId = `tower-test-${Date.now()}`;
    await host.page.evaluate(async ({ roomId, uid }) => {
      await firebase.database().ref(`users/${uid}/profile`).set({ nickname: '방장프로필', avatar: '☁️' });
      await firebase.database().ref(`rooms/${roomId}`).set({ roomName: '네트워크 시험방', hostId: uid, gameType: 'skyTower', status: 'playing', createdAt: firebase.database.ServerValue.TIMESTAMP, players: { [uid]: { nickname: '방장프로필', avatar: '☁️', isHost: true } } });
    }, { roomId, uid: host.uid });
    await enter(host, roomId);
    assert.equal(await host.page.evaluate(() => SkyTowerApp.game.getSnapshot().name), '방장프로필');

    const guest = await bootstrap(browser, '참가자'); clients.push(guest);
    await guest.page.evaluate(async ({ roomId, uid }) => {
      await firebase.database().ref(`users/${uid}/profile`).set({ nickname: '참가자프로필', avatar: '🌤️' });
      await firebase.database().ref(`rooms/${roomId}/players/${uid}`).set({ nickname: '참가자프로필', avatar: '🌤️', isHost: false });
    }, { roomId, uid: guest.uid });
    await enter(guest, roomId);
    await guest.page.evaluate(async () => {
      SkyTowerApp.network.publishMotion({ position: { x: 4, y: 8, z: 12 }, rotation: { x: 0, y: 1.25, z: 0 }, animation: 'run', character: 'cloud_scout', checkpoint: 1, falls: 0 });
      await SkyTowerApp.network.markCheckpoint(2, { x: 20, y: 30, z: 40 });
      await SkyTowerApp.network.finish();
    });
    await waitRuntime(host.page, guest.uid, runtime => runtime.checkpoint === 2 && runtime.position.y === 30);
    assert.equal(await guest.page.evaluate(() => !!SkyTowerApp.network.getSnapshot().players[SkyTowerApp.network.localId].runtime.finishAt), false, '마지막 체크포인트 전 완주가 기록됐습니다.');
    await guest.page.evaluate(() => {
      const game = SkyTowerApp.game;
      game.restoreState({ checkpoint: 2, falls: 0, elapsed: 12.5, finished: false });
      const finish = game.world.checkpoints[3];
      game._debugSetPlayer({ x: finish.position.x, y: finish.platform.mesh.position.y + finish.platform.height / 2 + 0.97, z: finish.position.z }, { y: -0.1 });
      for (let step = 0; step < 30; step += 1) game._debugStep(1 / 120);
    });
    await guest.page.waitForSelector('#finish-modal.active', { timeout: TIMEOUT });
    await waitRuntime(host.page, guest.uid, runtime => runtime.checkpoint === 3 && Number(runtime.finishAt) > 0);
    assert.equal(await host.page.evaluate(uid => SkyTowerProtocol.ranking(SkyTowerApp.network.getSnapshot().players, uid, 0).find(row => row.uid === uid).floor, guest.uid), 4);

    const attacks = await guest.page.evaluate(async ({ roomId, hostUid, guestUid }) => {
      const root = firebase.database();
      async function denied(task) { try { await task(); return false; } catch (error) { return /permission_denied|permission denied/i.test(String(error.code || error.message)); } }
      return {
        overwriteOther: await denied(() => root.ref(`skyTowerSessions/${roomId}/players/${hostUid}/runtime/checkpoint`).set(3)),
        deleteOther: await denied(() => root.ref(`skyTowerSessions/${roomId}/players/${hostUid}`).remove()),
        deleteSelf: await denied(() => root.ref(`skyTowerSessions/${roomId}/players/${guestUid}`).remove()),
        regressSelf: await denied(() => root.ref(`skyTowerSessions/${roomId}/players/${guestUid}/runtime/checkpoint`).set(1)),
        clearFinish: await denied(() => root.ref(`skyTowerSessions/${roomId}/players/${guestUid}/runtime`).update({ finishAt: null }))
      };
    }, { roomId, hostUid: host.uid, guestUid: guest.uid });
    assert.deepEqual(attacks, { overwriteOther: true, deleteOther: true, deleteSelf: true, regressSelf: true, clearFinish: true });

    await guest.page.evaluate(() => firebase.database().goOffline());
    await waitRuntime(host.page, guest.uid, runtime => runtime.connected === false);
    await guest.page.evaluate(() => firebase.database().goOnline());
    await waitRuntime(host.page, guest.uid, runtime => runtime.connected === true && runtime.checkpoint === 3 && Number(runtime.finishAt) > 0);

    const late = await bootstrap(browser, '늦은 참가자'); clients.push(late);
    await late.page.evaluate(uid => firebase.database().ref(`users/${uid}/profile`).set({ nickname: '늦은프로필', avatar: '🪂' }), late.uid);
    await enter(late, roomId);
    await waitRuntime(host.page, late.uid, runtime => runtime.connected === true && runtime.checkpoint === 0);
    const lateRoom = await late.page.evaluate(roomId => firebase.database().ref(`rooms/${roomId}`).once('value').then(s => s.val()), roomId);
    assert.equal(lateRoom.players[late.uid].nickname, '늦은프로필');

    await host.page.evaluate(() => SkyTowerApp.network.leave({ releaseSeat: true }));
    const transferred = await guest.page.evaluate(roomId => firebase.database().ref(`rooms/${roomId}`).once('value').then(s => s.val()), roomId);
    assert.ok([guest.uid, late.uid].includes(transferred.hostId));
    assert.equal(transferred.players[transferred.hostId].isHost, true);
    assert.equal(transferred.players[host.uid], undefined);
    await guest.page.evaluate(() => SkyTowerApp.network.reportFall({ x: 1, y: 2, z: 3 }));
    await waitRuntime(guest.page, guest.uid, runtime => runtime.falls === 1 && runtime.checkpoint === 3);
    console.log('PASS 현재 방 진입, 늦은 참가, 통합 완주, 재접속, 보안 규칙, 방장 승계');
  } finally {
    await Promise.all(clients.map(client => client.context.close().catch(() => {})));
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
