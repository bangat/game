(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const emulator = params.get('emulator') === '1' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const roomId = params.get('roomId');
  const solo = params.get('mode') === 'solo' || (roomId && roomId.startsWith('solo_'));
  const ui = window.SkyTowerUI;
  let game, network, selected = false, disconnected = false, paused = false, snapshot, motionTimer, best = 0, finished = false, lastHud = 0;
  let lobbyProfile = {}, progressQueue = Promise.resolve();
  const knownPlayers = new Set();
  const bestKey = 'skyTower.best.v1';
  try { best = Number(localStorage.getItem(bestKey)) || 0; } catch (_) {}
  const app = window.SkyTowerApp = { game: null, network: null, ready: false, emulator };
  function safe(task) { Promise.resolve().then(task).catch(fail); }
  function fail(error) {
    paused = true; setPause();
    ui.setLoading(false);
    ui.showError(error && error.message || String(error), { retry: () => location.reload() });
  }
  function readPreference(key) { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } }
  function profile(character) {
    return { id: network ? network.localId : 'local', name: lobbyProfile.nickname || readPreference('userNickname') || '도전자', character: character.id, avatar: lobbyProfile.avatar || readPreference('userAvatar') || '' };
  }
  function setPause() { if (game) { if (game.setPaused) game.setPaused(paused || !selected || disconnected); else if (paused || !selected || disconnected) game.stop(); else game.start(); } }
  function applySettings(settings) {
    if (!game) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.5);
    game.engine.setHardwareScalingLevel(settings.quality === 'low' ? 1.5 : 1 / pixelRatio);
    game.scene.particlesEnabled = settings.quality !== 'low';
    game.engine.resize();
  }
  async function exitGame() {
    paused = true; setPause();
    clearInterval(motionTimer);
    const cleanup = async () => {
      await progressQueue.catch(() => {});
      if (network) await network.leave({ releaseSeat: true });
    };
    // 오프라인에서는 Firebase 쓰기가 대기하므로 대기실 이동까지 막지 않는다.
    let timeout;
    try { await Promise.race([cleanup(), new Promise(resolve => { timeout = setTimeout(resolve, 2000); })]); }
    finally { clearTimeout(timeout); }
    location.href = '../대기실.html';
  }
  function saveProgress(task) {
    progressQueue = progressQueue.then(task);
    progressQueue.catch(fail);
  }
  function renderPlayers(value) {
    if (!game || !network || !value) return;
    const active = new Set();
    Object.entries(value.players || {}).forEach(([uid, player]) => {
      if (uid === network.localId || !player.runtime || player.runtime.connected === false) return;
      active.add(uid);
      game.upsertRemotePlayer(uid, Object.assign({}, player.runtime, { name: player.profile && player.profile.nickname, avatar: player.profile && player.profile.avatar }));
    });
    knownPlayers.forEach(uid => { if (!active.has(uid)) game.removeRemotePlayer(uid); });
    knownPlayers.clear(); active.forEach(uid => knownPlayers.add(uid));
    ui.updateRanking(value.ranking || []);
  }
  function onGameEvent(type, data) {
    if (type !== 'finish' && type !== 'ready') ui.onEvent(type, data);
    if (!network) {
      if (type === 'finish') finishLocal(Number(data.elapsed) * 1000);
      return;
    }
    if (type === 'checkpoint') saveProgress(() => network.markCheckpoint(data.index, data.position));
    if (type === 'respawn') network.publishMotion(game.getSnapshot());
    if (type === 'finish') saveProgress(async () => {
      await network.publishMotion(game.getSnapshot());
      await network.finish();
      const value = network.getSnapshot();
      const own = value && value.players && value.players[network.localId];
      const elapsed = own && own.runtime.finishAt ? own.runtime.finishAt - value.startedAt : Number(data.elapsed) * 1000;
      finishLocal(elapsed);
    });
  }
  function finishLocal(elapsedMs) {
    if (finished) return;
    finished = true;
    const isBest = !best || elapsedMs < best;
    if (isBest) { best = elapsedMs; try { localStorage.setItem(bestKey, String(best)); } catch (_) {} }
    ui.updateHUD({ bestMs: best });
    ui.showFinish({ elapsedMs, isBest, title: network ? '구름끝에 도착했어요!' : '타워 완주 성공!' });
  }
  function onState(state) {
    if (performance.now() - lastHud < 100) return;
    lastHud = performance.now();
    ui.onState(state);
    if (network && snapshot) {
      const own = snapshot.players && snapshot.players[network.localId];
      const finishAt = own && own.runtime.finishAt;
      ui.updateHUD({ elapsedMs: Math.max(0, (finishAt || (network.getServerTime ? network.getServerTime() : Date.now())) - snapshot.startedAt) });
    } else if (!network) ui.updateRanking([{ name: profile(SkyTowerCharacters.getSelected()).name, floor: state.checkpoint + 1, isMe: true, finished: state.finished, timeMs: state.elapsed * 1000 }]);
  }
  async function prepareFirebase() {
    if (!window.firebase) throw new Error('연결 모듈을 불러오지 못했습니다. 인터넷을 확인하고 다시 열어 주세요.');
    if (!firebase.apps.length) firebase.initializeApp(emulator ? {
      apiKey: 'demo-key', authDomain: 'demo-sky-tower.firebaseapp.com', databaseURL: 'https://demo-sky-tower-default-rtdb.firebaseio.com', projectId: 'demo-sky-tower'
    } : SkyTowerNetwork.firebaseConfig);
    const auth = firebase.auth(), db = firebase.database();
    if (emulator && !window.__skyEmulatorConnected) {
      auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
      db.useEmulator('127.0.0.1', 9000);
      window.__skyEmulatorConnected = true;
      if (!auth.currentUser) await auth.signInAnonymously();
    }
    const user = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { unsubscribe(); reject(new Error('로그인 확인 시간이 초과되었습니다. 다시 연결해 주세요.')); }, 10000);
      const unsubscribe = auth.onAuthStateChanged(user => { clearTimeout(timer); unsubscribe(); resolve(user); }, error => { clearTimeout(timer); unsubscribe(); reject(error); });
    });
    if (!user) throw new Error('멀티플레이는 기존 계정으로 로그인한 뒤 이용할 수 있어요. 대기실로 돌아가 로그인해 주세요.');
    return { auth, db, user };
  }
  async function boot() {
    ui.init({
      onCharacterChange: character => { selected = true; if (game) game.setProfile(profile(character)); setPause(); },
      onPause: () => { paused = true; setPause(); },
      onResume: () => { paused = false; setPause(); },
      onSettingsChange: applySettings,
      onReconnect: () => location.reload(),
      onExit: () => safe(exitGame),
      onRestart: () => {
        if (!game) return;
        if (finished && network) { safe(exitGame); return; }
        if (solo && game.restart) { game.restart(); finished = false; }
        else game.respawn();
        paused = false; setPause();
      }
    });
    ui.updateHUD({ bestMs: best || NaN });
    document.getElementById('restart-button').textContent = solo ? '처음부터 다시' : '체크포인트로 돌아가기';
    document.getElementById('finish-restart').textContent = solo ? '한 번 더 도전' : '대기실에서 새 도전';
    if (!roomId && !solo) {
      document.getElementById('character-modal').classList.remove('active');
      location.replace('../대기실.html'); return;
    }
    if (!window.BABYLON || !window.SkyTowerGame) throw new Error('3D 엔진을 불러오지 못했습니다. 새로고침해 주세요.');
    if (!solo) {
      ui.setConnection({ state: 'connecting' });
      const { db, auth } = await prepareFirebase();
      network = await SkyTowerNetwork.connect({ roomId, database: db, auth,
        onSnapshot: value => { snapshot = value; if (game && value.startedAt) game.setStartEpoch(value.startedAt); renderPlayers(value); },
        onConnection: status => { disconnected = !status.online; ui.setConnection(status); setPause(); },
        onError: fail
      });
      app.network = network;
      const room = (await db.ref('rooms/' + roomId).once('value')).val();
      if (!room) throw new Error('방이 종료되었습니다. 대기실에서 새 방에 참가해 주세요.');
      lobbyProfile = room.players && room.players[network.localId] || {};
      ui.updateHUD({ roomName: room.roomName || '친구와 함께 오르기' });
    } else { ui.setConnection({ state: 'online', message: '혼자 연습' }); ui.updateHUD({ roomName: '연습 모드 · 기록은 이 기기에 저장' }); }
    game = SkyTowerGame.create({ canvas: document.getElementById('game-canvas'), profile: profile(SkyTowerCharacters.getSelected()), startEpoch: snapshot && snapshot.startedAt, now: () => network && network.getServerTime ? network.getServerTime() : Date.now(), ui: { onState, onEvent: onGameEvent } });
    app.game = game;
    if (network && game.restoreState) {
      const value = network.getSnapshot(), own = value && value.players && value.players[network.localId];
      if (own) game.restoreState(Object.assign({}, own.runtime, { finished: !!own.runtime.finishAt, elapsed: Math.max(0, ((own.runtime.finishAt || network.getServerTime()) - value.startedAt) / 1000) }));
      if (own && own.runtime.finishAt) { finished = true; ui.showFinish({ elapsedMs: own.runtime.finishAt - value.startedAt }); }
    }
    applySettings(ui.getSettings()); game.start(); setPause(); renderPlayers(snapshot);
    window.addEventListener('resize', () => game.engine.resize());
    motionTimer = setInterval(() => { if (network && !disconnected && selected) network.publishMotion(game.getSnapshot()); }, 100);
    window.addEventListener('pagehide', () => { clearInterval(motionTimer); if (network) network.leave(); });
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    ui.setLoading(false); app.ready = true;
  }
  safe(boot);
})();
