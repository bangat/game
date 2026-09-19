(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let callbacks = {}, selected = null, toastTimer = 0, errorRetry = null, paused = false;
  let settings = { sound: true, sensitivity: 50, quality: 'auto' };
  try { settings = Object.assign(settings, JSON.parse(localStorage.getItem('skyTower.settings.v1') || '{}')); } catch (_) {}
  const emit = (detail) => window.dispatchEvent(new CustomEvent('skytower:input', { detail }));
  const formatTime = (ms) => {
    if (!Number.isFinite(ms)) return '--:--.--';
    const total = Math.max(0, ms), minutes = Math.floor(total / 60000), seconds = Math.floor(total % 60000 / 1000), centis = Math.floor(total % 1000 / 10);
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(centis).padStart(2, '0');
  };
  function modal(id, open) { const el = $(id); if (el) el.classList.toggle('active', open); }
  function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2300); }
  function persistSettings() {
    try { localStorage.setItem('skyTower.settings.v1', JSON.stringify(settings)); } catch (_) {}
    if (window.SkyTowerAudio) { SkyTowerAudio.setEnabled(settings.sound); SkyTowerAudio.setVolume(settings.sound ? .55 : 0); }
    if (callbacks.onSettingsChange) callbacks.onSettingsChange(Object.assign({}, settings));
  }
  function renderCharacters() {
    if (!window.SkyTowerCharacters) return;
    selected = SkyTowerCharacters.getSelected();
    $('character-list').innerHTML = SkyTowerCharacters.list.map((item) => '<button class="character-option' + (item.id === selected.id ? ' selected' : '') + '" data-character="' + item.id + '"><span class="free">무료</span><img src="' + item.preview + '" alt=""><b>' + item.name + '</b><small>' + item.tagline + '</small></button>').join('');
    $('character-list').querySelectorAll('[data-character]').forEach((button) => button.addEventListener('click', () => {
      selected = SkyTowerCharacters.select(button.dataset.character); renderCharacters(); SkyTowerAudio && SkyTowerAudio.play('tap');
    }));
  }
  function setupJoystick() {
    const pad = $('joystick'), knob = $('joystick-knob'); let pointer = null;
    const move = (event) => {
      if (pointer !== event.pointerId) return;
      const rect = pad.getBoundingClientRect(), radius = rect.width * .32, dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2), len = Math.hypot(dx, dy) || 1, scale = Math.min(1, radius / len), x = dx * scale / radius, y = dy * scale / radius;
      knob.style.transform = 'translate(' + (x * radius) + 'px,' + (y * radius) + 'px)'; emit({ type: 'move', x, y: -y, active: true });
    };
    pad.addEventListener('pointerdown', (e) => { pointer = e.pointerId; pad.setPointerCapture(pointer); move(e); }); pad.addEventListener('pointermove', move);
    const end = (e) => { if (pointer !== e.pointerId) return; pointer = null; knob.style.transform = ''; emit({ type: 'move', x: 0, y: 0, active: false }); };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  }
  function setupLook() {
    const canvas = $('game-canvas'); let pointer = null, x = 0, y = 0;
    canvas.addEventListener('pointerdown', (e) => { pointer = e.pointerId; x = e.clientX; y = e.clientY; canvas.setPointerCapture(pointer); });
    canvas.addEventListener('pointermove', (e) => { if (pointer !== e.pointerId) return; const dx = e.clientX - x, dy = e.clientY - y; x = e.clientX; y = e.clientY; emit({ type: 'look', x: dx * settings.sensitivity / 50, y: dy * settings.sensitivity / 50, active: true }); });
    const end = (e) => { if (pointer === e.pointerId) { pointer = null; emit({ type: 'look', x: 0, y: 0, active: false }); } }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }
  function init(options) {
    callbacks = options || {}; renderCharacters(); setupJoystick(); setupLook();
    $('sound-setting').checked = settings.sound; $('sensitivity-setting').value = settings.sensitivity; $('sensitivity-value').value = settings.sensitivity; $('quality-setting').value = settings.quality;
    $('character-confirm').addEventListener('click', () => { modal('character-modal', false); if (callbacks.onCharacterChange) callbacks.onCharacterChange(selected); SkyTowerAudio && SkyTowerAudio.unlock(); });
    $('settings-button').addEventListener('click', () => modal('settings-modal', true)); document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => modal(b.dataset.close, false)));
    $('sound-setting').addEventListener('change', (e) => { settings.sound = e.target.checked; persistSettings(); }); $('sensitivity-setting').addEventListener('input', (e) => { settings.sensitivity = +e.target.value; $('sensitivity-value').value = settings.sensitivity; persistSettings(); }); $('quality-setting').addEventListener('change', (e) => { settings.quality = e.target.value; persistSettings(); });
    $('jump-button').addEventListener('pointerdown', (e) => { e.preventDefault(); emit({ type: 'jump', active: true }); if (callbacks.onJump) callbacks.onJump(); });
    $('pause-button').addEventListener('click', () => { modal('settings-modal', false); modal('pause-modal', true); paused = true; if (callbacks.onPause) callbacks.onPause(); }); $('resume-button').addEventListener('click', () => { modal('pause-modal', false); paused = false; if (callbacks.onResume) callbacks.onResume(); });
    const restart = () => { ['settings-modal','finish-modal'].forEach((id) => modal(id, false)); if (callbacks.onRestart) callbacks.onRestart(); }; $('restart-button').addEventListener('click', restart); $('finish-restart').addEventListener('click', restart); $('retry-button').addEventListener('click', () => { modal('error-modal', false); (errorRetry || callbacks.onReconnect || function(){})(); });
    document.querySelectorAll('.exit-button').forEach((button) => button.addEventListener('click', () => { if (callbacks.onExit) callbacks.onExit(); else location.href = '../대기실.html'; }));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || paused) return;
      paused = true; modal('settings-modal', false); modal('pause-modal', true);
      if (callbacks.onPause) callbacks.onPause();
    });
    persistSettings(); return api;
  }
  function setLoading(active, text) { modal('loading', !!active); if (text) $('loading').querySelector('b').textContent = text; }
  function setConnection(data) { data = data || {}; const state = data.state || (data.online ? 'online' : data.reconnecting ? 'reconnecting' : 'offline'), labels = { online:'연결됨',connecting:'연결 중',reconnecting:'다시 연결 중',offline:'오프라인' }; $('connection').dataset.state = state; $('connection').querySelector('span').textContent = data.message || labels[state] || state; }
  function updateHUD(data) { data = data || {}; if (data.floor != null) $('floor').textContent = Math.max(1, Math.floor(data.floor)); if (data.height != null) $('height').textContent = Math.max(0, Math.floor(data.height)); if (data.elapsedMs != null) $('timer').textContent = formatTime(data.elapsedMs); if (data.bestMs != null) $('best-time').textContent = formatTime(data.bestMs); if (data.roomName) $('room-name').textContent = data.roomName; if (data.progress != null) { const p = Math.max(0, Math.min(100, data.progress <= 1 ? data.progress * 100 : data.progress)); $('progress-bar').style.width = p + '%'; $('progress-text').textContent = Math.round(p) + '%'; } }
  function updateRanking(rows) { rows = Array.isArray(rows) ? rows : []; const online = rows.filter((r) => r.connected !== false).length; $('player-count').textContent = online + '/' + rows.length + '명'; $('ranking-list').innerHTML = rows.slice(0, 6).map((row, i) => '<li class="' + (row.isMe ? 'me' : '') + (row.connected === false ? ' offline' : '') + '"><span class="rank">' + (row.rank || i + 1) + '</span><span class="player">' + escapeText(row.name || row.nickname || '도전자') + '</span><b>' + (row.finished && row.timeMs ? formatTime(row.timeMs) : Math.max(1, Math.floor(row.floor || 1)) + 'F') + '</b></li>').join(''); }
  function escapeText(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
  function showError(message, options) { $('error-message').textContent = message || '인터넷 연결을 확인해 주세요.'; errorRetry = options && options.retry; modal('error-modal', true); SkyTowerAudio && SkyTowerAudio.play('error'); }
  function showFinish(data) { data = data || {}; $('finish-title').textContent = data.title || '멋진 등반이었어요!'; $('finish-record').textContent = '기록 ' + formatTime(data.elapsedMs) + (data.isBest ? ' · 새로운 최고 기록!' : ''); modal('finish-modal', true); SkyTowerAudio && SkyTowerAudio.play('finish'); }
  function onState(state) { state = state || {}; updateHUD({ height: state.height, elapsedMs: Number(state.elapsed) * 1000, progress: state.progress, floor: Number(state.checkpoint || 0) + 1 }); }
  function onEvent(type, data) {
    data = data || {};
    if (type === 'ready') setLoading(false);
    else if (type === 'jump') SkyTowerAudio && SkyTowerAudio.play('jump');
    else if (type === 'checkpoint') { toast('체크포인트 ' + data.index + ' 도착!'); SkyTowerAudio && SkyTowerAudio.play('checkpoint'); }
    else if (type === 'land') SkyTowerAudio && SkyTowerAudio.play('land');
    else if (type === 'fall') SkyTowerAudio && SkyTowerAudio.play('fall');
    else if (type === 'respawn') { SkyTowerAudio && SkyTowerAudio.play('respawn'); if (!data.manual) toast('괜찮아요, 마지막 지점에서 다시 시작해요.'); }
    else if (type === 'hazard') toast('조심! 바람 장치를 피하세요.');
    else if (type === 'finish') showFinish({ elapsedMs: Number(data.elapsed) * 1000 });
  }
  const api = { init, setLoading, setConnection, updateHUD, updatePlayers: updateRanking, updateRanking, showError, showFinish, toast, onState, onEvent, getSettings: () => Object.assign({}, settings), formatTime };
  window.SkyTowerUI = api;
})();
