(function (global) {
  'use strict';

  const VERSION = 1;
  const MAX_PLAYERS = 6;
  const MAX_CHECKPOINT = 3;
  const MAX_FALLS = 999;
  const ANIMATIONS = new Set(['idle', 'run', 'jump', 'fall', 'finish']);

  function number(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function text(value, fallback, maxLength) {
    const result = typeof value === 'string' ? value.trim() : '';
    return (result || fallback).slice(0, maxLength);
  }

  function vector(value, fallback, limit) {
    const source = value && typeof value === 'object' ? value : {};
    const base = fallback || { x: 0, y: 0, z: 0 };
    return {
      x: number(source.x, base.x, -limit, limit),
      y: number(source.y, base.y, -limit, limit),
      z: number(source.z, base.z, -limit, limit)
    };
  }

  function sanitizeProfile(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};
    return {
      nickname: text(source.nickname, '플레이어', 20),
      avatar: text(source.avatar, '🙂', 300)
    };
  }

  function sanitizeMotion(next, previous) {
    const source = next && typeof next === 'object' ? next : {};
    const old = previous && typeof previous === 'object' ? previous : {};
    const previousCheckpoint = number(old.checkpoint, 0, 0, MAX_CHECKPOINT);
    const previousFalls = number(old.falls, 0, 0, MAX_FALLS);
    return {
      position: vector(source.position, old.position, 10000),
      rotation: vector(source.rotation, old.rotation, Math.PI * 4),
      animation: ANIMATIONS.has(source.animation) ? source.animation : 'idle',
      character: text(source.character, text(old.character, 'default', 40), 40),
      checkpoint: Math.max(previousCheckpoint, Math.floor(number(source.checkpoint, previousCheckpoint, 0, MAX_CHECKPOINT))),
      falls: Math.max(previousFalls, Math.floor(number(source.falls, previousFalls, 0, MAX_FALLS)))
    };
  }

  function ranking(players, localId, startedAt) {
    const rows = Object.entries(players || {}).map(([uid, player]) => {
      const runtime = player && player.runtime ? player.runtime : {};
      const profile = sanitizeProfile(player && player.profile);
      const finishAt = number(runtime.finishAt, 0, 0, Number.MAX_SAFE_INTEGER);
      const checkpoint = Math.floor(number(runtime.checkpoint, 0, 0, MAX_CHECKPOINT));
      return {
        uid,
        name: profile.nickname,
        avatar: profile.avatar,
        floor: checkpoint + 1,
        checkpoint,
        falls: Math.floor(number(runtime.falls, 0, 0, MAX_FALLS)),
        finished: finishAt > 0,
        finishAt: finishAt || null,
        timeMs: finishAt > 0 && startedAt > 0 ? Math.max(0, finishAt - startedAt) : null,
        isMe: uid === localId,
        connected: runtime.connected !== false
      };
    });
    rows.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishAt - b.finishAt || a.uid.localeCompare(b.uid);
      return b.checkpoint - a.checkpoint || a.falls - b.falls || a.uid.localeCompare(b.uid);
    });
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  global.SkyTowerProtocol = Object.freeze({
    VERSION,
    MAX_PLAYERS,
    MAX_CHECKPOINT,
    MAX_FALLS,
    sanitizeMotion,
    sanitizeProfile,
    ranking,
    vector
  });
})(window);
