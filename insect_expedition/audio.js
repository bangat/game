(function () {
  'use strict';
  let context, footNoise, lastStep = -1, enabled = true;
  let battleActive=false,chaseActive=false,musicMode=null,musicBus,analyser,musicTimer=null,musicStep=0,nextBeat=0;
  const musicVoices=new Set();
  try { enabled = localStorage.getItem('insect.sound') !== 'off'; } catch (_) {}
  function unlock() {
    if (!enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context) context = new Audio();
    if (context.state !== 'running') context.resume().then(syncMusic).catch(() => {});
    syncMusic();
  }
  function musicNote(frequency,at,duration,type,volume,attack=.012,end) {
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);if(end)oscillator.frequency.exponentialRampToValueAtTime(end,at+duration);
    envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(volume,at+attack);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(envelope);envelope.connect(musicBus);musicVoices.add(oscillator);
    oscillator.onended=()=>{musicVoices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
    oscillator.start(at);oscillator.stop(at+duration+.02);
  }
  function scheduleMusic() {
    if(!context||!enabled||document.hidden||!musicMode)return;
    if(musicMode==='chase'){
      // Original suspense score: paired heartbeats, slow dissonant drones and a sparse minor motif.
      const beat=60/108,notes=[0,1,7,6,0,1,3,6];
      if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.025;
      while(nextBeat<context.currentTime+.25){
        musicNote(78,nextBeat,.18,'sine',.29,.012,38);
        musicNote(65,nextBeat+.19,.16,'sine',.21,.012,34);
        if(musicStep%4===0){musicNote(55,nextBeat,beat*4.5,'triangle',.105,.42);musicNote(58.27,nextBeat,beat*4.5,'sine',.075,.5);}
        if(musicStep%2===0)musicNote(220*Math.pow(2,notes[(musicStep/2)%8]/12),nextBeat+.06,beat*1.7,'triangle',.045,.14);
        if(musicStep%8===6)musicNote(622.25,nextBeat,beat*2,'sine',.026,.2,587.33);
        nextBeat+=beat;musicStep++;
      }
      return;
    }
    // Original minor-key ostinato, bass pulse and timpani-like accents (140 BPM).
    const eighth=60/140/2,roots=[65.41,65.41,51.91,58.27],pattern=[0,7,12,3,7,15,12,7];
    if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.025;
    while(nextBeat<context.currentTime+.25){
      const root=roots[Math.floor(musicStep/16)%roots.length],accent=musicStep%8===0;
      musicNote(root*2*Math.pow(2,pattern[musicStep%8]/12),nextBeat,eighth*.83,'triangle',accent?.17:.11);
      if(musicStep%2===0){musicNote(root,nextBeat,eighth*1.7,'triangle',.2);musicNote(48,nextBeat,.09,'sine',.23);}
      if(musicStep%4===2){musicNote(96,nextBeat,.08,'triangle',.14);musicNote(1600,nextBeat,.03,'square',.013);}
      if(accent){musicNote(root*4,nextBeat,eighth*3,'sine',.06);musicNote(root*4*Math.pow(2,3/12),nextBeat,eighth*3,'sine',.05);}
      nextBeat+=eighth;musicStep++;
    }
  }
  function startMusic() {
    if(musicTimer||!context||context.state!=='running'||!enabled||!(battleActive||chaseActive)||document.hidden)return;
    musicMode=battleActive?'battle':'chase';
    if(!musicBus){musicBus=context.createGain();analyser=context.createAnalyser();analyser.fftSize=256;musicBus.connect(analyser);analyser.connect(context.destination);}
    musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setValueAtTime(.0001,context.currentTime);musicBus.gain.linearRampToValueAtTime(.48,context.currentTime+.25);
    nextBeat=context.currentTime+.04;musicStep=0;scheduleMusic();musicTimer=setInterval(scheduleMusic,100);
  }
  function stopMusic() {
    clearInterval(musicTimer);musicTimer=null;musicMode=null;
    if(!context)return;
    if(musicBus){musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,context.currentTime);musicBus.gain.linearRampToValueAtTime(.0001,context.currentTime+.18);}
    for(const voice of musicVoices)try{voice.stop(context.currentTime+.2);}catch(_){}
    const retiringBus=musicBus,retiringAnalyser=analyser;musicBus=null;analyser=null;
    if(retiringBus)setTimeout(()=>{retiringBus.disconnect();retiringAnalyser.disconnect();},250);
  }
  function syncMusic() {
    const desired=enabled&&!document.hidden?(battleActive?'battle':chaseActive?'chase':null):null;
    if(desired===musicMode)return;
    stopMusic();if(desired)startMusic();
  }
  function setBattle(value) {battleActive=!!value;unlock();syncMusic();}
  function setChase(value) {chaseActive=!!value;unlock();syncMusic();}
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
    if(kind==='battle-enter'){tone(62,.7,0,'sawtooth',.065,210);tone(780,.35,.2,'triangle',.07,95);tone(42,.55,.28,'sine',.14);}
    if(kind==='portal'){tone(180,.6,0,'triangle',.06,980);tone(920,.5,.22,'sine',.05,440);}
    if(kind==='chop'){tone(105,.1,0,'triangle',.09,42);tone(320,.045,0,'square',.025,90);}
    if(kind==='mine'){tone(920,.12,0,'triangle',.05,390);tone(180,.07,0,'sine',.055,60);}
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
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else{unlock();syncMusic();}});
  window.addEventListener('pagehide',()=>{battleActive=false;chaseActive=false;stopMusic();});
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock, {passive:true});
  window.InsectAudio = { play, footstep, unlock, toggle, setBattle, setChase, getStatus:()=>{let rms=0;if(analyser){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length);}return {enabled,battleActive,chaseActive,musicMode,state:context?.state||'locked',musicPlaying:!!musicTimer,voices:musicVoices.size,rms};}, isMusicPlaying:()=>!!musicTimer, isEnabled: () => enabled };
})();
