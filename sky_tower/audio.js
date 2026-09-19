(function () {
  'use strict';
  let context = null;
  let enabled = true;
  let volume = 0.55;
  const ensure = () => context || (context = new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, duration, type, gain) {
    if (!enabled) return;
    try {
      const ctx = ensure(); if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator(); const amp = ctx.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      amp.gain.setValueAtTime(Math.max(0.001, volume * (gain || .18)), ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
      osc.connect(amp).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }
  const sounds = {
    tap: () => tone(520, .07, 'sine', .12), jump: () => { tone(340, .12, 'triangle', .15); setTimeout(() => tone(570, .1, 'triangle', .1), 55); },
    land: () => tone(155, .09, 'sine', .1), fall: () => tone(215, .25, 'sine', .07), respawn: () => { tone(190, .12, 'triangle', .09); setTimeout(() => tone(330, .2, 'sine', .1), 100); }, checkpoint: () => [440, 554, 659].forEach((f, i) => setTimeout(() => tone(f, .18, 'sine', .13), i * 85)),
    finish: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .28, 'triangle', .14), i * 110)), error: () => tone(125, .22, 'sawtooth', .1)
  };
  window.SkyTowerAudio = { play(name) { if (sounds[name]) sounds[name](); }, setEnabled(value) { enabled = !!value; }, setVolume(value) { const next = Number(value); volume = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0.55; }, unlock() { try { ensure().resume(); } catch (_) {} } };
})();
