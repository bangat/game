(function () {
  'use strict';
  const roomId = 'isulsup-public';
  const banner = document.getElementById('connection-banner');
  let socket, user, ui, world, snapshot, stopped = false, connected = false, retryTimer, sequence = 0;
  const pending = new Map(), seenEvents = new Set();
  let shownState, animating = false, animationView, animationBatches = 0;
  let moveIntent = { x: 0, z: 0 }, selectedCharacter = 'original';
  try { selectedCharacter = localStorage.getItem('insectExpedition.character.v1') || 'original'; } catch (_) {}
  const app = window.InsectApp = { ready: false, send, getSnapshot: () => snapshot, isAnimating: () => animating, world: null, ui: null };
  function connection(message, online) { banner.textContent = message; banner.dataset.online = !!online; connected = !!online; }
  function error(problem) {
    const message = problem && problem.message || String(problem);
    document.getElementById('boot-error-message').textContent = message;
    document.getElementById('boot-error').hidden = false;
    connection(message, false);
  }
  async function send(name, payload) {
    if(name==='home-tool'){world?.setHousingTool(payload);return {};}
    if(name==='gather'&&InsectData.resources[snapshot?.resources?.find(n=>n.id===payload.nodeId)?.kind]?.construction){
      const start=await request('gather-start',payload);
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,start.finishAt-start.startedAt)+180));
      return request('gather',payload);
    }
    return request(name,payload);
  }
  function request(name, payload) {
    if (name === 'navigate') { if(snapshot?.battle)return Promise.reject(new Error('전투를 마친 뒤 길 안내를 시작해 주세요.')); const target=(snapshot?.ecology?.sites||[]).find(s=>s.id===payload.id)||(snapshot?.ecology?.event?.id===payload.id?snapshot.ecology.event:null)||(snapshot?.resources||[]).find(n=>n.id===payload.id)||InsectNavigation.destination(payload.id,snapshot?.regionId); if(!target)return Promise.reject(new Error('목적지를 찾지 못했어요.')); world.setNavigation(target); return Promise.resolve({message:target.name+' 길 안내를 시작합니다. 화살표를 따라 이동하세요.'}); }
    if (name === 'exit') return leave();
    if (name === 'sound') return Promise.resolve({message: InsectAudio.toggle() ? '음악과 효과음을 켰습니다.' : '음악과 효과음을 껐습니다.'});
    if (animating && (name === 'action' || name === 'return')) return Promise.reject(new Error('전투 연출이 끝나면 다음 행동을 선택해 주세요.'));
    if (!connected || !socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('서버에 다시 연결한 뒤 시도해 주세요.'));
    const id = (window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + (++sequence));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('응답이 늦습니다. 기록을 확인한 뒤 다시 시도해 주세요.')); }, 12000);
      pending.set(id, { resolve, reject, timer, name });
      socket.send(JSON.stringify({ type: 'command', id, name, payload: payload || {} }));
    });
  }
  async function leave() {
    InsectAudio.setChase(false);InsectAudio.setBattle(false);
    stopped = true; clearTimeout(retryTimer);
    if (socket) socket.close();
    window.top.location.href = new URL('../대기실.html', location.href).href;
  }
  async function connect() {
    if (stopped) return;
    connection('탐험 서버에 연결 중…', false);
    try {
      const token = await user.getIdToken();
      const configured = window.InsectConfig && InsectConfig.socketUrl;
      socket = new WebSocket(configured || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/insect_expedition/ws`);
      socket.onopen = () => socket.send(JSON.stringify({ type: 'join', token, roomId, features:{zombies:true} }));
      socket.onmessage = event => {
        let value; try { value = JSON.parse(event.data); } catch (_) { return; }
        if (value.type === 'ack') {
          if (value.id === 'join' && !value.ok) { stopped = true; error(new Error(value.error || '방 접속을 확인해 주세요.')); return; }
          const request = pending.get(value.id);
          if (request) {
            clearTimeout(request.timer); pending.delete(value.id);
            if (value.ok) {
              if (request.name === 'collect' && value.result && !value.result.battleId) {
                InsectAudio.play(value.result.success ? 'capture' : 'failure');
                ui.notify(value.result.success ? (value.result.isNew ? '새로운 곤충을 발견했어요! 도감에 기록했습니다.' : '포획 성공! 탐험대에 새로운 친구가 생겼어요.') : '포획에 실패했어요. 잠시 뒤 다시 시도해 보세요.');
              }
              request.resolve(value.result);
            } else request.reject(new Error(value.error || '요청을 처리하지 못했습니다.'));
          }
        } else if (value.type === 'state') {
          const previous = snapshot;
          if(previous&&(previous.regionId!==value.regionId||previous.realm!==value.realm)){moveIntent={x:0,z:0};world.setNavigation(null);}
          snapshot = value;InsectAudio.setChase(!value.battle && (value.zombies||[]).some(z=>z.available&&z.mode==='chase'&&z.targetUid===value.you));window.InsectZombieUI?.setState(value); connection('연결됨', true); app.ready = true;
          if (!previous && value.profile && value.profile.characterId) {
            selectedCharacter = InsectCharacters.select(value.profile.characterId).id;
            world.setCharacter(selectedCharacter,value.profile.appearance);
          }
          world.setState(value);
          const battle = value.battle;
          const events = battle && battle.events || [];
          const fresh = events.filter((item, index) => {
            const key = item.eventSeq || [battle.id, battle.eventSeq || battle.turn, item.id || item.seq || '', index, item.type, item.message].join(':');
            if (seenEvents.has(key)) return false; seenEvents.add(key); return true;
          });
          if (fresh.length && previous && previous.battle && previous.battle.id === battle.id) {
            animating = true; ui.setAnimating(true); animationBatches += 1;
            if (!animationView) animationView = JSON.parse(JSON.stringify(shownState || previous));
            const motions = fresh.filter(item => item.type !== 'hit' && item.type !== 'miss').map((item, index, list) => {
              if (item.type !== 'attack' && item.type !== 'skill') return item;
              const start = fresh.indexOf(item), hit = fresh[start + 1];
              return Object.assign({}, item, hit && ['hit', 'miss'].includes(hit.type) ? { amount: hit.amount, remainingHp: hit.remainingHp, targetCreatureId: hit.targetCreatureId, missed: hit.type === 'miss' } : {});
            });
            Promise.resolve(world.playEvents(motions)).finally(() => {
              animationBatches -= 1; animating = animationBatches > 0;
              if (!animating) { ui.setAnimating(false); animationView = null; if (snapshot) { ui.setState(snapshot); shownState = snapshot; } }
              if (!animating && snapshot && snapshot.battle && snapshot.battle.status === 'finished') {
                InsectAudio.setBattle(false);
                const ownSide = snapshot.battle.sides.a.uid === snapshot.you ? 'a' : 'b';
                InsectAudio.play(snapshot.battle.result && snapshot.battle.result.winner === ownSide ? 'victory' : 'defeat');
              }
            });
          } else if (!animating) { ui.setState(value); shownState = value; }
          if (!animating) InsectAudio.setBattle(battle?.status === 'active');
          if (seenEvents.size > 2000) seenEvents.clear();
        } else if (value.type === 'error') {
          connection(value.error || value.message || '접속을 확인해 주세요.', false);
          if (ui) ui.notify(value.error || value.message || '요청을 처리하지 못했습니다.');
        }
      };
      socket.onclose = () => {
        InsectAudio.setChase(false);InsectAudio.setBattle(false);
        connection('연결이 끊겼습니다. 기록을 보존하고 다시 연결합니다…', false);
        for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('연결이 끊겼습니다. 서버 기록을 복원합니다.')); }
        pending.clear();
        if (!stopped) retryTimer = setTimeout(connect, 1800);
      };
      socket.onerror = () => connection('탐험 서버를 확인하고 있습니다…', false);
    } catch (problem) { connection(problem.message, false); if (!stopped) retryTimer = setTimeout(connect, 3000); }
  }
  async function boot() {
    if (!window.BABYLON || !window.InsectWorld || !window.InsectUI) throw new Error('게임 자원을 불러오지 못했습니다. 다시 열어 주세요.');
    ui = InsectUI.create({send,
      onCustomize:(active,created)=>{if(world)world.setEnabled(!active && !!(created || snapshot?.profile?.characterCreated));},
      onEnter:()=>{if(world)world.setEnabled(!document.body.classList.contains('is-customizing'));const canvas=document.getElementById('game-canvas');canvas.tabIndex=0;if(!document.body.classList.contains('is-customizing'))canvas.focus();}
    });
    world = InsectWorld.create({ canvas: document.getElementById('game-canvas'), enabled: false, onMove: value => { moveIntent = value; }, onSelect: selection => { if (ui.setSelection) ui.setSelection(selection); }, onFootstep: step => InsectAudio.footstep(step), onSkillStart: event => InsectAudio.play('skill',event.skillId), onBattleActor:event=>{
      if(!animationView?.battle)return;
      for(const [key,id] of [[event.actorSide,event.actorCreatureId],[event.targetSide,event.targetCreatureId]]){const side=animationView.battle.sides[key];const index=side?.team.findIndex(c=>c.id===id);if(index>=0)side.active=index;}
      ui.setState(animationView);
    }, onBattleSwitch: event => {
      const side=animationView?.battle?.sides[event.actorSide];if(!side)return;
      const index=side.team.findIndex(c=>c.id===event.creatureId);if(index>=0)side.active=index;
      animationView.battle.events=[event];ui.setState(animationView);
    }, onBattleHit: event => {
      InsectAudio.play(event.missed ? 'failure' : 'hit');
      if (!animationView || !animationView.battle || event.missed) return;
      const side = animationView.battle.sides && animationView.battle.sides[event.targetSide];
      const target = side && (side.team.find(creature => creature.id === event.targetCreatureId) || side.team[side.active]);
      if (target) target.hp = Number.isFinite(event.remainingHp) ? event.remainingHp : Math.max(0, target.hp - (event.amount || 0));
      animationView.battle.events = [{...event, type:'hit', message: event.missed ? '공격이 빗나갔어요.' : `${event.amount || 0} 피해${event.critical ? ' · 치명타!' : ''}`}];
      ui.setState(animationView);
    } });
    world.setCharacter(selectedCharacter); app.world = world; app.ui = ui;
    if (!firebase.apps.length) firebase.initializeApp({ apiKey:'AIzaSyCmNAKmgF_L3o0QyOGh_oFAq_rMRtUyklw',authDomain:'goodluck-7c14b.firebaseapp.com',databaseURL:'https://goodluck-7c14b-default-rtdb.firebaseio.com',projectId:'goodluck-7c14b',appId:'1:858281658455:web:9131280a459be983933b12' });
    user = await new Promise((resolve, reject) => { const off = firebase.auth().onAuthStateChanged(value => { off(); resolve(value); }, reject); });
    if (!user) throw new Error('기존 계정으로 로그인한 뒤 대기실에서 참가해 주세요.');
    await connect();
    let sentMoving = false;
    setInterval(() => {
      if (!connected) return;
      const intent = document.hidden ? { x: 0, z: 0 } : moveIntent;
      const moving = Math.hypot(intent.x, intent.z) > 0.01;
      if (moving || sentMoving) send('move', intent).catch(() => {});
      sentMoving = moving;
    }, 100);
    window.addEventListener('pagehide', () => { stopped = true; if (socket) socket.close(); });
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  }
  boot().catch(error);
})();
