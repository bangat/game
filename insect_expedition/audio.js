(function () {
  'use strict';
  let context, footNoise, lastStep = -1, enabled = true;
  let battleActive=false,musicBus,musicTimer=null,musicStep=0,nextBeat=0;
  const musicVoices=new Set();
  try { enabled = localStorage.getItem('insect.sound') !== 'off'; } catch (_) {}
  function unlock() {
    if (!enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context) context = new Audio();
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (battleActive && enabled && !document.hidden && !musicTimer) startMusic();
  }
  function musicNote(frequency,at,duration,type,volume) {
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
    envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(volume,at+.012);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(envelope);envelope.connect(musicBus);musicVoices.add(oscillator);
    oscillator.onended=()=>{musicVoices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(at);oscillator.stop(at+duration+.02);
  }
  function scheduleMusic() {
    if(!context||!enabled||document.hidden||!battleActive)return;
    // Original minor-key ostinato, bass pulse and timpani-like accents (132 BPM).
    const eighth=60/132/2,roots=[65.41,65.41,51.91,58.27],pattern=[0,7,12,3,7,15,12,7];
    if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.025;
    while(nextBeat<context.currentTime+.25){
      const root=roots[Math.floor(musicStep/16)%roots.length],accent=musicStep%8===0;
      musicNote(root*2*Math.pow(2,pattern[musicStep%8]/12),nextBeat,eighth*.83,'triangle',accent?.17:.11);
      if(musicStep%2===0){musicNote(root,nextBeat,eighth*1.7,'triangle',.2);musicNote(48,nextBeat,.09,'sine',.23);}
      if(accent){musicNote(root*4,nextBeat,eighth*3,'sine',.06);musicNote(root*4*Math.pow(2,3/12),nextBeat,eighth*3,'sine',.05);}
      nextBeat+=eighth;musicStep++;
    }
  }
  function startMusic() {
    if(musicTimer||!context||!enabled||!battleActive||document.hidden)return;
    if(!musicBus){musicBus=context.createGain();musicBus.connect(context.destination);}
    musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setValueAtTime(.0001,context.currentTime);musicBus.gain.linearRampToValueAtTime(.2,context.currentTime+.35);
    nextBeat=context.currentTime+.04;musicStep=0;scheduleMusic();musicTimer=setInterval(scheduleMusic,100);
  }
  function stopMusic() {
    clearInterval(musicTimer);musicTimer=null;
    if(!context)return;
    if(musicBus){musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,context.currentTime);musicBus.gain.linearRampToValueAtTime(.0001,context.currentTime+.18);}
    for(const voice of musicVoices)try{voice.stop(context.currentTime+.2);}catch(_){}
  }
  function setBattle(value) {battleActive=!!value;if(battleActive&&enabled&&!document.hidden){unlock();startMusic();}else stopMusic();}
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
  function play(kind, skillId) {
    unlock();
    if (kind === 'hit') { tone(160,.16,0,'triangle',.08,48); tone(820,.055,0,'sine',.025,170); }
    if (kind === 'skill') {
      const fx=window.InsectData?.skillEffects[skillId]||{pitch:440,style:'wave'},p=fx.pitch;
      tone(p,.4,0,fx.style==='slash'?'sawtooth':'triangle',.055,p*2.2);
      tone(p*1.5,.3,.12,'sine',.045,p*.65);
      tone(p*2,.2,.25,'sine',.025,p*3);
    }
    if (kind === 'capture') [523,659,784,1047].forEach((n,i)=>tone(n,.23,i*.085,'sine',.045));
    if (kind === 'failure') { tone(290,.17,0,'triangle',.04,190); tone(180,.18,.1,'sine',.035,120); }
    if (kind === 'victory') [392,523,659,784,1047].forEach((n,i)=>tone(n,.36,i*.11,'triangle',.045));
    if (kind === 'defeat') { [330,294,247,196,165].forEach((n,i)=>tone(n,.46,i*.17,'triangle',.045)); tone(82,.9,.3,'sine',.035); }
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
  function toggle() { enabled = !enabled; try { localStorage.setItem('insect.sound',enabled?'on':'off'); } catch (_) {} if(enabled)unlock();else stopMusic(); return enabled; }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(battleActive&&enabled){unlock();startMusic();}});
  window.addEventListener('pagehide',()=>{battleActive=false;stopMusic();});
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock, {passive:true});
  window.InsectAudio = { play, footstep, unlock, toggle, setBattle, isMusicPlaying:()=>!!musicTimer, isEnabled: () => enabled };
})();
