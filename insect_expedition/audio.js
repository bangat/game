(function () {
  'use strict';
  let context, footNoise, lastStep = -1, enabled = true;
  try { enabled = localStorage.getItem('insect.sound') !== 'off'; } catch (_) {}
  function unlock() {
    if (!enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context) context = new Audio();
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  function tone(frequency, duration, delay, type, volume, end) {
    if (!enabled || !context || context.state !== 'running') return;
    const now = context.currentTime + (delay || 0), osc = context.createOscillator(), gain = context.createGain();
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(frequency, now);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(volume || 0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(context.destination); osc.start(now); osc.stop(now + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function play(kind) {
    unlock();
    if (kind === 'hit') { tone(160,.16,0,'triangle',.08,48); tone(820,.055,0,'sine',.025,170); }
    if (kind === 'skill') { tone(260,.35,0,'triangle',.07,1050); tone(540,.3,.07,'sine',.04,150); }
    if (kind === 'capture') [523,659,784,1047].forEach((n,i)=>tone(n,.23,i*.085,'sine',.045));
    if (kind === 'failure') { tone(290,.17,0,'triangle',.04,190); tone(180,.18,.1,'sine',.035,120); }
    if (kind === 'victory') [392,523,659,784,1047].forEach((n,i)=>tone(n,.36,i*.11,'triangle',.045));
    if (kind === 'tap') tone(660,.05,0,'sine',.025,480);
  }
  function footstep(step) {
    if (!enabled || document.hidden || !context || context.state !== 'running') return;
    const now = context.currentTime;
    if (now - lastStep < 0.16) return;
    lastStep = now;
    if (!footNoise) {
      footNoise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.14), context.sampleRate);
      const samples = footNoise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const path = step && step.surface === 'path', alternate = step && step.foot ? 0.94 : 1.06;
    const noise = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    noise.buffer = footNoise; noise.playbackRate.value = alternate;
    filter.type = 'lowpass'; filter.frequency.value = path ? 720 : 1550; filter.Q.value = 0.5;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(path ? 0.09 : 0.055, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    noise.connect(filter); filter.connect(gain); gain.connect(context.destination);
    noise.start(now); noise.stop(now + 0.14);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    tone((path ? 125 : 95) * alternate, 0.1, 0, 'sine', path ? 0.065 : 0.045, 42);
  }
  function toggle() { enabled = !enabled; try { localStorage.setItem('insect.sound',enabled?'on':'off'); } catch (_) {} if(enabled)unlock(); return enabled; }
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock, {passive:true});
  window.InsectAudio = { play, footstep, unlock, toggle, isEnabled: () => enabled };
})();
