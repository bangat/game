(function (global) {
  'use strict';
  const Data = global.InsectData;
  if (!Data) throw new Error('InsectData를 먼저 불러와야 합니다.');

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]);
  const listOf = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const speciesOf = creature => Data.speciesById[creature && creature.speciesId] || { name: '알 수 없는 곤충', rarity: 'common', normalAttack: { name: '몸통박치기' }, skill: null };
  const hpPercent = creature => Math.max(0, Math.min(100, Math.round(((creature.hp || 0) / Math.max(1, creature.maxHp || creature.maxHealth || 1)) * 100)));

  function create(options) {
    options = options || {};
    const root = document.getElementById('ui-root');
    if (!root) throw new Error('#ui-root가 없습니다.');
    let snapshot = { players: [], spawns: [], profile: { collection: [], team: [], discoveries: [] }, challenges: [] };
    let selection = null, celebration = null, fusionReview = null;
    const announcedBattles = new Set();
    let panel = null, panelHistory=[];
    function openPanel(next){if(next===panel)return;if(panel)panelHistory.push(panel);else panelHistory=[];panel=next;}
    function backPanel(){panel=panelHistory.pop()||null;selection=null;render();}
    const H=global.InsectHousing;
    let homeTool={building:false,deed:null,kind:'floor',rotation:0,cell:{x:0,z:0},pieceId:null,siteId:null};
    function syncHomeTool(){options.send?.('home-tool',homeTool);}
    const costText=cost=>Object.entries(cost).map(([k,n])=>Data.resources[k].icon+' '+n).join(' · ');
    function housingOverlay(profile){
      if(homeTool.deed)return '<section class="ix-land-picker" aria-label="토지 선택"><strong>📜 '+H.deeds[homeTool.deed].name+' 사용</strong><p>초록색 땅 또는 아래 위치를 고르세요.<br>확정하기 전에는 문서를 소모하지 않습니다.</p>'+H.sites.map(site=>'<button data-act="home-site" data-id="'+site.id+'" aria-pressed="'+(homeTool.siteId===site.id)+'">🟩 '+site.name+'</button>').join('')+'<div><button data-act="home-cancel">취소</button><button class="is-primary" data-act="land-confirm" '+(!homeTool.siteId?'disabled':'')+'>이 땅으로 확정</button></div></section>';
      if(!homeTool.building||!snapshot.home?.plot)return '';
      const piece=snapshot.home.pieces.find(p=>p.id===homeTool.pieceId),def=H.parts[homeTool.kind],error=H.placementError(snapshot.home,{...homeTool.cell,kind:homeTool.kind,rotation:homeTool.rotation},profile.resources);
      return '<section class="ix-build-toolbar" aria-label="집 건축"><div class="ix-build-heading"><strong>🔨 집 꾸미기</strong><span>🪵 '+profile.resources.wood+' · 🪨 '+profile.resources.stone+' · ⏳ '+profile.resources.sand+'</span><button data-act="home-cancel">완료</button></div><div class="ix-build-parts">'+Object.entries(H.parts).map(([id,p])=>'<button data-act="build-part" data-id="'+id+'" aria-pressed="'+(homeTool.kind===id)+'">'+p.icon+' '+p.name+'</button>').join('')+'</div><div class="ix-build-placement"><div><strong>'+def.name+' · '+costText(def.cost)+'</strong><small>격자 '+(homeTool.cell.x+1)+', '+(homeTool.cell.z+1)+' · '+homeTool.rotation*90+'° · '+(error||'초록 미리보기 위치에 설치 가능')+'</small></div><button data-act="build-rotate">↻ 회전</button><button data-act="build-place" '+(error?'disabled':'')+'>설치</button></div><div class="ix-build-nudge">'+[['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]].map(([label,x,z])=>'<button data-act="build-nudge" data-x="'+x+'" data-z="'+z+'">'+label+'</button>').join('')+'<select aria-label="이 칸의 건축물 선택" data-home-piece><option value="">이 칸의 건축물 선택</option>'+snapshot.home.pieces.filter(p=>p.x===homeTool.cell.x&&p.z===homeTool.cell.z).map(p=>'<option value="'+escapeHtml(p.id)+'" '+(p.id===homeTool.pieceId?'selected':'')+'>'+H.parts[p.kind].name+' · '+p.rotation*90+'°</option>').join('')+'</select><button data-act="build-remove" '+(!piece?'disabled':'')+'>'+(piece?H.parts[piece.kind].name+' 철거':'건축물 선택 후 철거')+'</button></div></section>';
    }
    let rarityFilter = 'all', teamSlot = 0, animationPlaying = false;
    let entered = false;
    let editor = null;
    function openEditor(first) {
      if(editor || !snapshot.profile?.uid) return;
      const profile=snapshot.profile;
      editor=global.InsectAppearanceUI.open({create:first,name:profile.adventurerName,characterId:profile.characterId,appearance:profile.appearance,
        onOpen:()=>options.onCustomize?.(true),
        onClose:()=>{editor=null;options.onCustomize?.(false,entered);render();},
        onSave:async ({appearance,name})=>{
          const result=await options.send(first?'character':'appearance',first?{id:profile.characterId||'original',name,appearance}:{appearance});
          if(result?.ok===false)throw new Error(result.error||'저장하지 못했어요.');
          snapshot.profile={...snapshot.profile,appearance,...(first?{characterCreated:true,adventurerName:name}:{})};
          if(first){entered=true;options.onEnter?.();}
          notify(first?'나만의 캐릭터가 만들어졌어요!':'새로운 스타일을 저장했어요.','success');
        }
      });
    }
    let detailCreatureId = null;
    let busy = false;
    let toastTimer = 0;
    let toastState = null;
    let lastSignature = '';
    let serverOffset = 0, lastServerStamp = 0;
    const remainingTime = battle => Math.max(0, Math.ceil(((battle.deadline || Date.now()) - Date.now() - serverOffset) / 1000));
    root.classList.add('ix-ui');

    function notify(message, tone) {
      toastState = { message: String(message), tone: tone || 'info' };
      let el = root.querySelector('.ix-toast');
      if (!el) { el = document.createElement('div'); el.className = 'ix-toast'; el.setAttribute('role', 'status'); root.appendChild(el); }
      el.textContent = message;
      el.dataset.tone = tone || 'info';
      el.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastState = null; const live = root.querySelector('.ix-toast'); if (live) live.classList.remove('is-visible'); }, 3200);
    }

    async function command(name, payload) {
      if (busy) return;
      busy = true; root.classList.add('is-busy');
      try {
        const result = await (options.send ? options.send(name, payload || {}) : Promise.resolve());
        if (result && name === 'gather') { celebration = {title:Data.resources[result.kind].name+'를 채집했습니다!',text:result.message || ('재료 +'+result.amount+' · 골드 +'+result.gold),icon:Data.resources[result.kind].icon}; global.InsectAudio?.play('capture'); render(); }
        else if (result && name === 'hatch') { celebration={title:result.creature.nickname+'이 부화했습니다!',text:'동굴에서만 만날 수 있는 새 동료예요. 팀에 편성하고 사료로 키워 보세요.',speciesId:result.creature.speciesId};global.InsectAudio?.play('capture');render(); }
        else if(result && name==='evolve'){celebration={title:result.creature.nickname+' 진화!',text:'새로운 모습과 능력으로 성장했어요.',speciesId:result.creature.speciesId};global.InsectAudio?.play('capture');render();}
        else if (result && name === 'fuse') { celebration = {title:result.creature.nickname+' 조합 성공!',text:'레벨과 팀 배치를 유지하고 다음 단계로 성장했어요.',speciesId:result.creature.speciesId}; global.InsectAudio?.play('capture'); render(); }
        else if (result && result.message) notify(result.message, result.ok === false ? 'error' : 'success');
        return result;
      } catch (error) { notify(error && error.message || '요청을 처리하지 못했습니다.', 'error'); return null; }
      finally { busy = false; root.classList.remove('is-busy'); }
    }

    function stat(creature, key) {
      if (creature[key] != null) return creature[key];
      if (creature.stats && creature.stats[key] != null) return creature.stats[key];
      try { return global.InsectBattle ? global.InsectBattle.statsForCreature(creature)[key] : speciesOf(creature).baseStats[key]; } catch (_) { return 0; }
    }

    let legacyReview=null;
    function specialization(c,p){const T=global.InsectTrials,r=T.normalizeRune(c.rune),duplicate=speciesOf(c).rarity==='monster'&&!p.team.includes(c.id)&&p.collection.filter(x=>x.speciesId===c.speciesId).length>1;return '<div class="eco-specialization"><strong>동료 특화 · '+(r?T.runes[r.kind].name+' '+r.level+'단계':'미장착')+'</strong><small>보유 시련 문장 '+(p.resources.shard||0)+' · 시련 돌파 또는 중복 전설 연구로 획득</small><div>'+Object.entries(T.runes).map(([kind,info])=>{const swap=r&&r.kind!==kind,cost=swap?1:T.cost(r),max=r?.level===3&&!swap;return '<button data-act="rune-upgrade" data-id="'+escapeHtml(c.id)+'" data-kind="'+kind+'" '+(max||(p.resources.shard||0)<cost?'disabled':'')+'>'+info.name+' '+(swap?'변경':max?'완성':'강화')+'<small>'+info.text+' · '+(max?'최고 단계':cost+'문장')+'</small></button>';}).join('')+'</div>'+(duplicate?'<button class="eco-legacy" data-act="legacy-review" data-id="'+escapeHtml(c.id)+'">중복 전설 계승 연구 · 문장 5개</button>':'')+'</div>';}
    function creatureCard(creature, profile, compact) {
      const species = speciesOf(creature);
      const inTeam = (profile.team || []).includes(creature.id);
      const maxHp = creature.maxHp || creature.maxHealth || stat(creature, 'maxHealth');
      const hp = creature.hp == null ? maxHp : creature.hp;
      const stats = creature.stats || {};
      const neededXp = Data.xpForLevel(creature.level || 1);
      const expanded = detailCreatureId === creature.id;
      return `<article class="ix-creature ${compact ? 'is-compact' : ''}" data-rarity="${species.rarity}">
        <div class="ix-creature-icon" aria-hidden="true">${modelFor(creature.speciesId, species.category)}</div>
        <div class="ix-creature-copy"><div class="ix-card-title"><strong>${escapeHtml(creature.nickname || species.name)}</strong><span>Lv.${creature.level || 1}</span></div>
        <small>${escapeHtml(species.name)} · ${rankBadge(species)}</small>
        <div class="ix-hp"><i style="width:${Math.round((hp / Math.max(1, maxHp)) * 100)}%"></i></div><small>체력 ${hp}/${maxHp} · 전투력 ${creature.cp || creature.combatPower || '—'}</small></div>
        ${compact ? '' : `<div class="ix-xp"><i style="width:${Math.min(100,Math.round(((creature.xp || 0) / Math.max(1,neededXp))*100))}%"></i><span>경험치 ${creature.xp || 0}/${neededXp}</span></div><div class="ix-card-actions">${profile.resources?.nectar?`<button class="eco-nectar" data-act="nectar" data-id="${escapeHtml(creature.id)}" ${creature.level>=50?'disabled':''}>농축액 · 경험치 +300</button>`:''}<button data-act="detail" data-id="${escapeHtml(creature.id)}">${expanded ? '정보 닫기' : '상세 정보'}</button><button data-act="open-team" data-id="${escapeHtml(creature.id)}">${inTeam ? '배치 변경' : '팀 편성'}</button>${[1,10,"all"].map(count=>`<button data-act="feed" data-count="${count}" data-id="${escapeHtml(creature.id)}" ${(profile.supplies?.feeds||0)<1||creature.level>=50?"disabled":""}>${count==="all"?"모두 사용":count+"개 사용"}</button>`).join("")}${species.evolvesTo ? `<button data-act="evolve" data-id="${escapeHtml(creature.id)}" ${(creature.level || 1) < (species.evolutionLevel||5) ? 'disabled' : ''}>${(creature.level || 1) < (species.evolutionLevel||5) ? 'Lv.'+(species.evolutionLevel||5)+' 진화' : '진화하기'}</button>` : ''}</div>${expanded ? `<div class="ix-creature-detail">${specialization(creature,profile)}<button data-act="rename" data-id="${escapeHtml(creature.id)}">이름 바꾸기</button><div class="ix-detail-tags"><span>${escapeHtml(species.stage)}</span><span>${escapeHtml(species.habitat)}</span><span>포획 난도 ${species.captureDifficulty}</span></div><dl><div><dt>생명력</dt><dd>${stats.maxHealth || maxHp}</dd></div><div><dt>공격</dt><dd>${stats.attack || stat(creature,'attack')}</dd></div><div><dt>방어</dt><dd>${stats.defense || stat(creature,'defense')}</dd></div><div><dt>속도</dt><dd>${stats.speed || stat(creature,'speed')}</dd></div></dl><p class="ix-feed-note">사료 1개 = 경험치 +84.${species.evolvesTo ? ` Lv.${species.evolutionLevel||5}부터 ${escapeHtml(Data.speciesById[species.evolvesTo].name)}로 진화하며 공격도 바뀝니다.` : ' 최종 형태입니다. 레벨과 팀 조합으로 더 강해질 수 있어요.'}</p><div class="ix-move"><b>${escapeHtml(species.normalAttack.name)}</b><span>위력 ${species.normalAttack.power} · 명중 ${Math.round(species.normalAttack.accuracy*100)}%</span></div>${species.skill ? `<div class="ix-move is-skill"><b>${escapeHtml(species.skill.name)}</b><span>위력 ${species.skill.power} · 재사용 ${species.skill.cooldown}턴</span><p>${escapeHtml(species.skill.description)}</p></div>` : '<p class="ix-no-skill">일반종은 고유 기술 없이 기본 공격으로 싸웁니다.</p>'}</div>` : ''}`}
      </article>`;
    }

    function iconFor(category) {
      const winged = /나비|나방|잠자리|벌|매미/.test(category || '');
      const longLeg = /귀뚜라미|메뚜기|사마귀/.test(category || '');
      const palette = /벌/.test(category || '') ? '--shell:#e3aa32;--wing:#fff0ad' : /나비|나방/.test(category || '') ? '--shell:#8168b7;--wing:#d9c7ff' : '--shell:#4d9d68;--wing:#cdecc0';
      return `<svg class="ix-glyph" viewBox="0 0 100 100" style="${palette}" aria-hidden="true"><path class="line" d="M42 31 30 18M58 31 70 18M37 58 18 ${longLeg ? '84' : '68'}M63 58 82 ${longLeg ? '84' : '68'}"/>${winged ? '<ellipse class="wing" cx="28" cy="45" rx="22" ry="15" transform="rotate(-35 28 45)"/><ellipse class="wing" cx="72" cy="45" rx="22" ry="15" transform="rotate(35 72 45)"/>' : ''}<ellipse class="shell" cx="50" cy="59" rx="23" ry="30"/><circle class="shell" cx="50" cy="31" r="14"/><path class="line" d="M50 43v44M31 51 15 42M69 51l16-9M30 69 14 78M70 69l16 9"/><circle class="eye" cx="44" cy="28" r="2.5"/><circle class="eye" cx="56" cy="28" r="2.5"/></svg>`;
    }

    function modelFor(speciesId, category) {
      const imageId = Data.speciesById[speciesId]?.modelId || (speciesId === 'king_stag' ? 'cave_stag' : speciesId);
      return `<img class="ix-model" src="assets/creatures/${encodeURIComponent(imageId)}.png" alt="" loading="lazy">`;
    }

    function characterScreen() {
      return '<section class="ix-onboard" aria-label="캐릭터 불러오기"><div class="ix-onboard-copy"><h1>나의 탐험가를 불러오는 중…</h1><p>계정에 저장된 캐릭터와 이름을 확인하고 있어요.</p></div></section>';
    }

    function topBar(profile) {
      const online = listOf(snapshot.players).length;
      return `<header class="ix-top"><div><p class="ix-eyebrow">현재 지역</p><strong>${escapeHtml(snapshot.locationName || '해오름 초원')}</strong></div><div class="ix-online"><i></i>${online}명 탐험 중</div><button class="ix-feed" data-act="panel" data-value="collection" title="사료로 동료 성장">🍀 ${profile.supplies && profile.supplies.feeds || 0}</button><button class="ix-town-return" data-act="town-return" title="마을로 바로 귀환" ${(!snapshot.realm&&snapshot.regionId==='safe')||listOf(snapshot.players).find(p=>p.uid===snapshot.you)?.harvest?'disabled':''}>⌂ 귀환</button><button data-act="heal" data-action="heal" title="팀 전체 회복">회복</button><button data-act="sound" title="효과음 켜기·끄기">${global.InsectAudio?.isEnabled()?'소리 켜짐':'소리 꺼짐'}</button><button class="ix-exit" data-act="exit" title="대기실로 돌아가기">나가기</button></header>`;
    }

    function nearbySpawn(state) {
      if (state.battle) return null;
      const me = typeof state.you === 'object' ? state.you : listOf(state.players).find(p => p.uid === state.you);
      if (!me || me.busy) return null;
      const obstacles = global.InsectRegions&&snapshot.regionId ? global.InsectRegions.obstacles(snapshot.regionId) : global.InsectWorld ? global.InsectWorld.obstacles : [];
      function reachable(spawn, distance) {
        const steps = Math.max(1, Math.ceil(distance / 1.25));
        for (let i = 1; i < steps; i++) {
          const x = me.x + (spawn.x - me.x) * i / steps, z = me.z + (spawn.z - me.z) * i / steps;
          if (obstacles.some(o => o.type === 'circle' ? Math.hypot(x - o.x, z - o.z) < o.radius + 0.25
            : Math.abs(x - o.x) < o.width / 2 + 0.25 && Math.abs(z - o.z) < o.depth / 2 + 0.25)) return false;
        }
        return true;
      }
      const candidates = listOf(state.spawns).filter(s => s.available !== false && !s.reservedBy)
        .map(spawn => ({ spawn, distance: Math.hypot(spawn.x - me.x, spawn.z - me.z) }))
        .filter(({spawn, distance}) => distance <= 7 && reachable(spawn, distance))
        .sort((a, b) => a.distance - b.distance);
      const chosen = candidates.find(({spawn}) => selection && selection.type === 'spawn' && selection.id === spawn.id) || candidates[0];
      return chosen ? chosen.spawn : null;
    }

    function nearbyResource(state) {
      if(state.battle) return null;
      const me=listOf(state.players).find(p=>p.uid===state.you);if(!me)return null;
      const nodes=(state.resources||[]).filter(n=>n.available&&Math.hypot(n.x-me.x,n.z-me.z)<=4).sort((a,b)=>Math.hypot(a.x-me.x,a.z-me.z)-Math.hypot(b.x-me.x,b.z-me.z));
      return nodes.find(n=>selection?.type==='resource'&&selection.id===n.id)||nodes[0]||null;
    }
    function nearbyPortal(){const me=listOf(snapshot.players).find(p=>p.uid===snapshot.you);if(!me||snapshot.realm||snapshot.battle)return null;const gates=snapshot.portals||[],chosen=gates.find(p=>selection?.type==='portal'&&selection.id===p.id);return chosen||gates.find(p=>Math.hypot(p.x-me.x,p.z-me.z)<=7);}
    function nearbyPanel() {
      if (panel || (selection && selection.type === 'npc') || (snapshot.challenges || []).some(c => c.to === snapshot.you)) return '';
      const gate=nearbyPortal(),me=listOf(snapshot.players).find(p=>p.uid===snapshot.you);
      if(gate){const near=Math.hypot(me.x-gate.x,me.z-gate.z)<=7;return '<div class="ix-nearby ix-portal-action"><span>✦ '+escapeHtml(gate.name)+' 포탈</span><button data-act="'+(near?'portal':'navigate')+'" data-id="'+gate.id+'">'+(near?'포탈 입장':'포탈까지 길 안내')+'</button></div>';}
      const spawn = nearbySpawn(snapshot), resource=nearbyResource(snapshot);
      if(resource && (!spawn || selection?.type==='resource')) return `<div class="ix-nearby"><span>${Data.resources[resource.kind].icon} ${escapeHtml(resource.name)}</span><button data-act="gather" data-id="${resource.id}">${resource.kind === 'wood' ? '🪓 목재 벌목' : resource.kind === 'stone' ? '⛏️ 석재 채광' : resource.kind === 'sand' ? '⛏️ 모래 채집' : resource.kind === 'egg' ? '전용 알 발굴' : resource.kind === 'crystal' ? '온기 수정 채광' : '재료 채집 · 골드 +2'}</button></div>`;
      if (!spawn) return '';
      const species = speciesOf(spawn), action = 'encounter';
      return `<div class="ix-nearby" aria-label="가까운 곤충"><span>${spawn.boss ? "♛ 필드 보스 · " : spawn.group ? "3마리 무리 · " : ""}${rankBadge(species)} Lv.${spawn.level || 1} ${escapeHtml(species.name)}</span><button id="selected-${action}" data-act="${action}" data-action="${action}" data-id="${escapeHtml(spawn.id)}">⚔ 전투하고 채집</button></div>`;
    }

    function selectionPanel() {
      if (panel || !selection || selection.type === 'spawn' || selection.type === 'resource' || selection.type === 'portal' || selection.type === 'site' || selection.type === 'event') return '';
      if (selection.type === 'npc' && selection.id === 'guide-mira') {
        const quest = snapshot.profile && snapshot.profile.quest || { status: 'available', progress: 0, target: 3 };
        const definition = Data.quests.find(q => q.id === quest.id) || Data.quests[0];
        const text = quest.status === 'available' || quest.status === 'complete' ? '새 의뢰를 받을까요? 어디서든 진행하고 보상을 받을 수 있어요.' : quest.status === 'active' ? `${definition.description} (${quest.progress}/${quest.target})` : '의뢰 완료! 사료 보상을 받아 가세요.';
        return `<div class="ix-selection ix-npc"><span class="ix-selection-icon">🧑‍🔬</span><div><small>이슬숲 연구소</small><strong>미라 연구원</strong><span>${text}</span></div><button data-act="quest">${quest.status === 'ready' ? '보상 받기' : quest.status === 'active' ? '진행 확인' : '의뢰 수락'}</button><button data-act="close-dialog" aria-label="대화 닫기">×</button></div>`;
      }
      const player = listOf(snapshot.players).find(item => (item.uid || item.id) === selection.id);
      if (!player) return '<div class="ix-selection is-empty">탐험가가 이동했습니다.</div>';
      const me = listOf(snapshot.players).find(p=>p.uid===snapshot.you);
      const canDuel = me && !player.busy && snapshot.regionId!=='safe' && Math.hypot(me.x-player.x,me.z-player.z)<=10;
      return `<div class="ix-selection"><span class="ix-selection-icon">🧭</span><div><small>다른 탐험가</small><strong>${escapeHtml(player.name || player.nickname || '탐험가')}</strong><span>${player.busy ? '다른 활동 중' : canDuel ? '가까운 탐험가 · 수락하면 3 대 3 대전!' : '마을 밖에서 상대 10m 이내로 다가가세요.'}</span></div><button id="selected-challenge" data-act="challenge" data-action="challenge" data-id="${escapeHtml(player.uid || player.id)}" ${canDuel ? '' : 'disabled'}>대전 신청</button></div>`;
    }

    function regionLevels(biome) {
      const spawns = listOf(snapshot.spawns).filter(s => {
        const species = speciesOf(s);
        return s.biomeId === biome.id && !s.boss;
      });
      if (!spawns.length) return '1–3';
      const levels = spawns.map(s => s.level || 1);
      return Math.min(...levels) + '–' + Math.max(...levels);
    }

    function rankBadge(species) {
      const rank = Data.rarity[species.rarity];
      return '<b class="ix-rank" style="--rank:' + rank.color + '">' + rank.label + '</b>';
    }
    function rankTabs(items) {
      const counts = id => items.filter(item => id === 'all' || speciesOf(item).rarity === id).length;
      return '<div class="ix-rank-tabs" role="tablist" aria-label="곤충 등급">' + ['all', ...Data.rarityOrder].map(id => '<button role="tab" aria-selected="' + (rarityFilter === id) + '" data-act="rarity-filter" data-id="' + id + '">' + (id === 'all' ? '전체' : Data.rarity[id].label) + ' <small>' + counts(id) + '</small></button>').join('') + '</div>';
    }
    function rewardCount(profile) {
      const dex = profile.encyclopedia || {claimed:[],milestones:[]};
      return (profile.discoveries || []).filter(id => !dex.claimed.includes(id)).reduce((n,id) => n + Data.rarity[Data.speciesById[id].rarity].reward, 0)
        + Data.collectionMilestones.filter(m => profile.discoveries.length >= m.count && !dex.milestones.includes(m.count)).reduce((n,m) => n + m.feeds, 0);
    }
    function drawer(profile) {
      if (!panel) return '';
      const collection = profile.collection || [];
      const filtered = collection.filter(c => rarityFilter === 'all' || speciesOf(c).rarity === rarityFilter);
      const head = (small, title, count) => '<div class="ix-drawer-head"><div><small>' + small + '</small><h2>' + title + ' <b>' + count + '</b></h2></div><div class="eco-drawer-controls"><button data-act="panel-back" aria-label="이전 메뉴로 뒤로 가기">← 뒤로</button><button data-act="close-panel" aria-label="메뉴 닫기">닫기 ×</button></div></div>';
      if(panel==='bag'){
        const slots=[];for(const [id,n] of Object.entries(profile.bag?.deeds||{}))if(n)slots.push('<article class="ix-bag-slot"><b>📜</b><strong>'+H.deeds[id].name+'</strong><small>'+n+'개 · 미사용</small><button data-act="deed-use" data-id="'+id+'">사용 · 토지 선택</button></article>');
        for(const [id,def] of Object.entries(Data.resources)){const count=profile.resources?.[id]||0;if(count)slots.push('<article class="ix-bag-slot"><b>'+def.icon+'</b><strong>'+def.name+'</strong><small>'+count+'개</small></article>');}
        if(profile.supplies?.feeds)slots.push('<article class="ix-bag-slot"><b>🍀</b><strong>곤충 사료</strong><small>'+profile.supplies.feeds+'개</small><button data-act="panel" data-value="collection">성장에 사용</button></article>');
        if(profile.expedition?.eggs.length)slots.push('<article class="ix-bag-slot"><b>🥚</b><strong>동굴의 알</strong><small>'+profile.expedition.eggs.length+'개</small><button data-act="panel" data-value="research">부화실 열기</button></article>');
        const used=slots.length;while(slots.length<16)slots.push('<div class="ix-bag-slot is-empty">빈 칸</div>');
        return '<aside class="ix-drawer">'+head('종류별 묶음 보관 · 건축 자재는 모두 판매에서 보호됩니다.','가방',used+'종')+'<div class="ix-bag-grid ix-drawer-scroll">'+slots.join('')+'</div></aside>';
      }
      if(panel==='ecology')return global.InsectEcologyUI.drawer(snapshot,head);
      if(panel==='housing')return '<aside class="ix-drawer ix-housing-drawer">'+head('채집해서 직접 짓는 나의 3D 집','집 꾸미기',profile.housing?.plot?H.deeds[profile.housing.plot.size].label+' 보유':'토지 미보유')+'<div class="ix-drawer-scroll"><div class="ix-home-intro"><strong>'+(profile.housing?.plot?'내 집을 꾸미고 친구를 초대하세요.':'상점에서 땅문서 구매 → 가방에서 사용 → 초록색 땅 선택')+'</strong><p>바닥·벽·문·지붕을 직접 배치하고 문을 열어 안으로 들어가요. 건축은 소유자만 가능하며 철거하면 자재를 모두 돌려받습니다.</p><div><button data-act="home-travel" data-id="home">내 정원으로 이동</button>'+(profile.housing?.plot?'<button data-act="build-enter">집 건축 시작</button>':'<button data-act="panel" data-value="shop">땅문서 상점</button><button data-act="panel" data-value="bag">가방 열기</button>')+'<button data-act="home-travel" data-id="field">탐험 마을로 이동</button></div></div><h3>건축 자재 채집장</h3><div class="ix-camp-list">'+Data.constructionCamps.map(c=>'<article><span>'+Data.resources[c.kind].icon+'</span><div><strong>'+c.name+'</strong><small>'+Data.resources[c.kind].name+' · 보유 '+(profile.resources[c.kind]||0)+'개</small><small>가까이 다가가 채집 · 도구는 자동 장착</small></div><button data-act="home-travel" data-id="'+c.id+'">이동</button></article>').join('')+'</div><h3>같은 방 친구의 집</h3>'+((snapshot.neighbors||[]).filter(p=>p.uid!==snapshot.you).map(p=>'<button class="ix-visit" data-act="home-visit" data-id="'+escapeHtml(p.uid)+'">🏠 '+escapeHtml(p.name)+'의 집 방문</button>').join('')||'<p class="ix-map-copy">같은 방에 집을 가진 친구가 접속하면 여기에 표시됩니다.</p>')+'</div></aside>';
      if(panel==='research') {
        const p=profile.expedition||{bosses:[],crystals:0,hatched:0,claimed:[],eggs:[]};
        const value=g=>g.metric==='bosses'?p.bosses.length:g.metric==='guardian'?Number(p.bosses.includes('boss-sanctum')):p[g.metric]||0;
        return '<aside class="ix-drawer ix-research-drawer">'+head('탐험 → 수정 → 전용 알 → 고대 수호자','탐험 연구','🔮 '+(profile.resources?.crystal||0))+
          '<div class="ix-drawer-scroll"><div class="ix-research-intro"><strong>최종 목표 · 고대의 오로라 수호자</strong><p>지역 보스 4종 연구 + 동굴 알 2회 부화 후 Lv.50 수호자에 도전하세요. 부화 동료는 Lv.1부터 직접 성장합니다.</p><div><button data-act="navigate" data-id="mine">광산 길 안내</button><button data-act="navigate" data-id="nest">알 동굴 길 안내</button><button data-act="navigate" data-id="sanctum">수호자의 터</button></div></div>'+
          '<h3>부화실 · '+p.eggs.filter(e=>e.incubating).length+'/3 · 알 '+p.eggs.length+'/12</h3><p class="ix-map-copy">수정 3개로 부화 시작 · 이동 80m / 채집 +1 · 전투 승리 +2. 접속을 종료해도 진행은 저장돼요.</p><div class="ix-egg-grid">'+(p.eggs.length?p.eggs.map(e=>{const kind=Data.eggKinds[e.kind],ready=e.progress>=kind.steps;return '<article class="ix-egg"><span>🥚</span><strong>'+kind.name+'</strong><small>'+Data.speciesById[kind.speciesId].name+' · 동굴 전용</small><progress max="'+kind.steps+'" value="'+e.progress+'"></progress><small>'+e.progress+'/'+kind.steps+' 탐험 온기</small><button data-act="'+(e.incubating?'hatch':'incubate')+'" data-id="'+escapeHtml(e.id)+'" '+(e.incubating?!ready?'disabled':'':(profile.resources?.crystal||0)<3||p.eggs.filter(x=>x.incubating).length>=3?'disabled':'')+'>'+(e.incubating?ready?'부화한 동료 받기':'탐험하며 부화 중':'수정 3개 · 부화 시작')+'</button></article>';}).join(''):'<p class="ix-panel-empty">알 동굴의 둥지를 채집하면 전용 알을 얻어요. 먼저 광산에서 수정을 모아 보세요!</p>')+'</div><h3>연구 기록 · 보상은 한 번씩</h3>'+Data.researchGoals.map(g=>'<article class="ix-research-goal"><div><strong>'+g.name+'</strong><small>'+g.text+' · '+Math.min(g.target,value(g))+'/'+g.target+'</small><small>골드 '+g.gold+' · 사료 '+g.feeds+'</small></div><button data-act="research-claim" data-id="'+g.id+'" '+(value(g)<g.target||p.claimed.includes(g.id)?'disabled':'')+'>'+(p.claimed.includes(g.id)?'수령 완료':'보상 받기')+'</button></article>').join('')+'</div></aside>';
      }
      if (panel === 'shop') return '<aside class="ix-drawer ix-shop-drawer">' + head('전투 승리 · 채집 · 재료 판매로 골드 획득', '연구소 상점', '🪙 ' + (profile.gold || 0))
        + '<div class="ix-sale-list" aria-label="채집 재료 판매">'+Object.entries(Data.resources).filter(([id,item])=>item.sell>0).map(([id,item])=>'<article><div><strong>'+item.icon+' '+item.name+'</strong><small>보유 '+(profile.resources?.[id]||0)+'개 · 개당 '+item.sell+'골드</small></div>'+[1,10,'all'].map(n=>'<button data-act="sell-resource" data-id="'+id+'" data-count="'+n+'" '+((profile.resources?.[id]||0)<(n==='all'?1:n)?'disabled':'')+'>'+(n==='all'?'모두':n+'개')+' 판매</button>').join('')+'</article>').join('')+'</div>'
        + '<div class="ix-shop-list ix-drawer-scroll">' + Data.shop.map(item=>'<article><div class="ix-shop-icon">'+(item.deed?'📜':item.mountId?Data.mounts[item.mountId].icon:item.speciesId?modelFor(item.speciesId):'🍀')+'</div><div><strong>'+item.name+'</strong><small>'+item.description+'</small>'+(item.speciesId?rankBadge(Data.speciesById[item.speciesId]):'')+'</div>'+(item.mountId&&profile.mounts?.owned.includes(item.mountId)?'<button data-act="mount" data-id="'+(profile.mounts.equipped===item.mountId?'':item.mountId)+'">'+(profile.mounts.equipped===item.mountId?'내리기':'탑승')+'<small>보유 중</small></button>':'<button data-act="buy" data-id="'+item.id+'" '+((profile.gold||0)<item.price?'disabled':'')+'>🪙 '+item.price+'<small>구입</small></button>')+'</article>').join('')+'</div></aside>';
      if (panel === 'fusion') return '<aside class="ix-drawer ix-collection-drawer">'+head('같은 종류 3마리 + 골드 → 다음 단계 · 성공 확률 100%', '동료 조합', '🪙 '+(profile.gold||0))+'<p class="ix-map-copy">기준 곤충의 레벨·경험치·팀 배치를 유지해요. 재료는 팀 밖의 낮은 레벨 2마리를 먼저 제안하며, 확인 후 소모됩니다.</p><div class="ix-drawer-scroll">'+collection.filter(c=>Data.fusionRecipes[c.speciesId]).map(c=>{
          const recipe=Data.fusionRecipes[c.speciesId], materials=collection.filter(m=>m.id!==c.id&&m.speciesId===c.speciesId&&!profile.team.includes(m.id));
          return '<article class="ix-fusion-row">'+modelFor(c.speciesId)+'<div><strong>'+escapeHtml(c.nickname||speciesOf(c).name)+' Lv.'+c.level+'</strong><small>→ '+Data.speciesById[recipe.result].name+' · '+recipe.gold+'골드</small><small>팀 밖 재료 '+Math.min(2,materials.length)+'/2마리</small></div><button data-act="fuse-review" data-id="'+escapeHtml(c.id)+'" '+(materials.length<2||profile.gold<recipe.gold?'disabled':'')+'>조합 확인</button></article>';
        }).join('')+'</div></aside>';
      if (panel === 'collection') return '<aside class="ix-drawer ix-collection-drawer">' + head('전투 승리 · 도감 보상으로 사료 획득', '동료 성장', '🍀 ' + (profile.supplies?.feeds || 0)) + '<button class="ix-fusion-open" data-act="panel" data-value="fusion">✦ 같은 동료를 모아 다음 단계로 조합</button>' + rankTabs(collection) + '<div class="ix-drawer-scroll">' + (filtered.length ? filtered.map(c => creatureCard(c, profile, false)).join('') : '<p class="ix-panel-empty">이 등급의 곤충은 아직 없어요. 전투에서 승리해 모아 보세요.</p>') + '</div></aside>';
      if (panel === 'team') {
        const team = (profile.team || []).map(id => collection.find(c => c.id === id)).filter(Boolean);
        return '<aside class="ix-drawer ix-team-drawer">' + head('슬롯 선택 → 아래 곤충 선택 · 같은 팀끼리는 순서 교환', '전투 팀 편성', team.length + '/3')
          + '<div class="ix-team-slots">' + [0,1,2].map(index => {
            const c = team[index];
            return '<button data-act="team-slot" data-index="' + index + '" aria-pressed="' + (teamSlot === index) + '"><b>' + (index === 0 ? '1 · 선봉' : (index + 1) + ' · 공격 순서') + '</b>' + (c ? modelFor(c.speciesId) + '<strong>' + escapeHtml(c.nickname || speciesOf(c).name) + '</strong><small>Lv.' + c.level + ' · 전투력 ' + c.combatPower + '</small>' : '<span class="ix-slot-empty">＋</span><small>곤충을 배치하세요</small>') + '</button>';
          }).join('') + '</div>' + rankTabs(collection) + '<div class="ix-team-options ix-drawer-scroll">' + (filtered.length ? filtered.map(c => '<button data-act="assign-team" data-id="' + escapeHtml(c.id) + '">' + modelFor(c.speciesId) + '<span><strong>' + escapeHtml(c.nickname || speciesOf(c).name) + '</strong><small>' + rankBadge(speciesOf(c)) + ' Lv.' + c.level + ' · 전투력 ' + c.combatPower + '</small></span><b>' + (profile.team.includes(c.id) ? (profile.team.indexOf(c.id)+1)+'번 배치' : '배치') + '</b></button>').join('') : '<p class="ix-panel-empty">해당 등급의 곤충이 없습니다.</p>') + '</div></aside>';
      }
      if (panel === 'map') return '<aside class="ix-drawer ix-map-drawer">'+head('빛나는 포탈로 오가는 독립 지역', '포탈 지도', '')+'<p class="ix-map-copy">각 지역은 별도의 넓은 지도입니다. 목적지를 고르면 포탈까지 안내하며, 가까이 다가가 입장하세요. 다른 지역으로 갈 때는 마을을 거칩니다.</p><div class="ix-map-list">'+Data.biomes.map(b=>{
        const boss=(snapshot.spawns||[]).find(s=>s.boss&&s.biomeId===b.id), status=boss?(boss.reservedBy?'전투 중':boss.available?'출현 중':'재출현 대기'):'';
        return '<div class="ix-map-region"><button data-act="navigate" data-id="'+b.id+'" class="'+(snapshot.locationName===b.name?'is-here':'')+'"><i style="background:'+b.color+'"></i><span><b>'+b.name+'</b><small>'+(b.safe?'포탈 광장 · 회복과 의뢰':'Lv.'+b.levels.join('–')+' · '+(global.InsectRegions?.themes[b.id]?.description||b.habitat))+'</small></span><em>포탈 안내</em></button>'+(boss?'<button class="ix-boss-route" data-act="navigate" data-id="'+boss.id+'"><span>♛ '+boss.bossName+' · Lv.'+boss.level+'</span><small>'+status+' · 위치 안내</small></button>':'')+'</div>';
      }).join('')+'</div></aside>';

      const known = new Set(profile.discoveries || []), claimed = new Set(profile.encyclopedia?.claimed || []);
      const reward = rewardCount(profile);
      const catalog = Data.species.filter(c => rarityFilter === 'all' || c.rarity === rarityFilter);
      return '<aside class="ix-drawer ix-dex-drawer">' + head('새로운 종마다 사료 보상 · 보상은 한 번씩', '이슬숲 도감', known.size + '/' + Data.species.length)
        + '<div class="ix-dex-rewards"><button data-act="dex-claim" ' + (reward ? '' : 'disabled') + '>🍀 수집 보상 받기 +' + reward + '</button><span>' + Data.collectionMilestones.map(m => '<b class="' + (known.size >= m.count ? 'is-complete' : '') + '">' + m.count + '종 · 사료 ' + m.feeds + '</b>').join('') + '</span></div>'
        + rankTabs(Data.species.map(c => ({speciesId:c.id}))) + '<div class="ix-encyclopedia">' + catalog.map(c => '<div class="' + (known.has(c.id) ? '' : 'is-unknown') + '"><span>' + (known.has(c.id) ? modelFor(c.id) : '?') + '</span><strong>' + (known.has(c.id) ? escapeHtml(c.name) : '미발견') + '</strong><small>' + rankBadge(c) + ' · ' + (known.has(c.id) ? (claimed.has(c.id) ? '보상 수령' : '사료 +' + Data.rarity[c.rarity].reward) : escapeHtml(c.habitat)) + '</small><small class="eco-dex-hint">'+escapeHtml(global.InsectEcology.hint(c))+'</small></div>').join('') + '</div></aside>';
    }

    function challengeModal() {
      const uid = typeof snapshot.you === 'string' ? snapshot.you : snapshot.you && (snapshot.you.uid || snapshot.you.id);
      const request = listOf(snapshot.challenges).find(c => c && c.status !== 'declined' && c.status !== 'expired' && (c.targetUid === uid || c.to === uid));
      if (!request) return '';
      const from = listOf(snapshot.players).find(p => (p.uid || p.id) === (request.fromUid || request.from));
      return `<div class="ix-modal-backdrop"><section class="ix-dialog" role="dialog" aria-modal="true"><span class="ix-duel-icon">⚔️</span><small>친선 대전 신청</small><h2>${escapeHtml(from && (from.name || from.nickname) || '다른 탐험가')}</h2><p>3 대 3 곤충 대전을 시작할까요? 패배해도 곤충을 잃지 않습니다.</p><div><button data-act="respond" data-id="${escapeHtml(request.id)}" data-value="false">거절</button><button class="is-primary" data-act="respond" data-id="${escapeHtml(request.id)}" data-value="true">수락</button></div></section></div>`;
    }

    function battleModal(profile) {
      const battle = snapshot.battle;
      if (!battle || battle.status === 'closed') return '';
      const uid = typeof snapshot.you === 'string' ? snapshot.you : snapshot.you && (snapshot.you.uid || snapshot.you.id);
      let youKey = battle.youSide || (battle.sides && battle.sides.a && battle.sides.a.uid === uid ? 'a' : 'b');
      if (!battle.sides) return '';
      const enemyKey = youKey === 'a' ? 'b' : 'a';
      const mine = battle.sides[youKey], enemy = battle.sides[enemyKey];
      if (!mine || !enemy) return '';
      const yourActive = mine.team[mine.active], foeActive = enemy.team[enemy.active];
      const species = speciesOf(yourActive), foeSpecies = speciesOf(foeActive);
      const time = remainingTime(battle);
      const events = battle.events || [];
      const lastHit = [...events].reverse().find(e => e.type === 'hit');
      const outcome = battle.result;
      const capture = outcome && outcome.captureSummary;
      const captures=outcome?.captureSummaries||[],capturedNames=captures.filter(c=>c.success).map(c=>Data.speciesById[c.speciesId].name);
      const captureText = capturedNames.length>1 ? escapeHtml(capturedNames.join(', '))+'를 채집했습니다!' : capture && capture.success ? `${escapeHtml(Data.speciesById[capture.speciesId] && Data.speciesById[capture.speciesId].name || '야생 곤충')}를 채집했습니다!${capture.isNew ? ' 새 도감 등록 +1' : ''}` : capture && capture.failureReason === 'inventory-full' ? '보관함이 가득 차 포획 보상을 받지 못했습니다.' : capture && capture.success === false ? `채집 실패 · 곤충이 달아났어요. 성공 확률 ${Math.round((capture.chance || 0) * 100)}%` : '';
      const rewardText = [outcome && outcome.totalXp > 0 ? `총 경험치 +${outcome.totalXp} · 참여 곤충당 ${outcome.xpPerCreature}` : '', outcome && outcome.gold ? `골드 +${outcome.gold}` : '', outcome && outcome.feeds ? `사료 +${outcome.feeds}` : '', outcome?.essence?'수호 정수 +'+outcome.essence:'',outcome?.shards?'시련 문장 +'+outcome.shards:'',outcome?.firstClear?'새 시련 돌파! 다음 관문 해금':'', captureText, outcome && outcome.recovered ? '전원 자동 회복 완료' : ''].filter(Boolean).join(' · ') || '전투 기록이 안전하게 저장됩니다.';
      const levelText = outcome && outcome.levelUps && outcome.levelUps.length ? ` · ${outcome.levelUps.length}마리 레벨 상승!` : '';
      return `<section class="ix-battle" aria-label="턴제 전투"><header><div><small>${battle.trial ? '수호자 시련 '+battle.trial.stage+'단계 · '+battle.trial.modifier.name : battle.type === 'pvp' ? '탐험가 대전' : battle.boss ? '필드 보스' : enemy.team.length>1?'무리 전투':'필드 전투'} · ${mine.team.length} 대 ${enemy.team.length}</small><strong>턴 ${battle.turn}${mine.entryPriority === yourActive.id ? " · 새 공격자 선공!" : ""}</strong></div>${battle.status==='active'?`<button data-act="auto-battle" aria-pressed="${!!mine.auto}">${mine.auto?'자동 진행 중':'자동 전투 켜기'}</button>`:''}<button class="ix-battle-sound" data-act="sound" aria-label="전투 음악과 효과음 켜기 또는 끄기">${global.InsectAudio?.isEnabled()?'♫ 소리 켜짐':'♫ 소리 꺼짐'}</button><div class="ix-turn"><i style="--time:${Math.min(25, time)}"></i><b>${time}</b>초</div></header>
        <div class="ix-battle-rosters">${[mine,enemy].map(side=>`<div>${side.team.map((c,i)=>`<span class="${i===side.active?'is-active':''} ${c.hp<=0?'is-down':''}" title="${escapeHtml(speciesOf(c).name)}">${modelFor(c.speciesId)}<b>${i+1}</b><i style="--hp:${hpPercent(c)}%"></i></span>`).join('')}</div>`).join('')}</div><div class="ix-battlefield"><div class="ix-fighter is-enemy"><div class="ix-fighter-info"><strong>${escapeHtml(foeActive.nickname || foeSpecies.name)}</strong><span>${rankBadge(foeSpecies)} Lv.${foeActive.level}</span><div class="ix-hp"><i style="width:${hpPercent(foeActive)}%"></i></div><small>${foeActive.hp}/${foeActive.maxHp}</small></div></div>
        <div class="ix-impact" ${battle.status === 'finished' ? 'hidden' : ''} aria-live="polite">${lastHit ? `${lastHit.critical ? '치명타 · ' : ''}-${lastHit.amount}` : '대치 중'}</div><div class="ix-fighter is-player"><div class="ix-fighter-info"><strong>${escapeHtml(yourActive.nickname || species.name)}</strong><span>${rankBadge(species)} Lv.${yourActive.level} · 전투력 ${yourActive.cp || yourActive.combatPower || '—'}</span><div class="ix-hp"><i style="width:${hpPercent(yourActive)}%"></i></div><small>${yourActive.hp}/${yourActive.maxHp}</small></div></div></div>
        <div class="ix-battle-bottom"><div class="ix-log" aria-live="polite">${events.slice(-3).map(e => `<p>${escapeHtml(e.message || '전투가 이어집니다.')}</p>`).join('') || '<p>자동 진행 · 1→2→3번 순환 공격 · 상대 생존자 무작위 타격</p>'}</div>
        ${battle.status === 'finished' ? `<div class="ix-battle-result"><strong>${outcome && outcome.winner === youKey ? '탐험 승리' : outcome && outcome.reason === 'retreat' ? '안전하게 후퇴했습니다' : '다음 도전을 준비해요'}</strong><span>${rewardText}${levelText}</span>${outcome && outcome.winner !== youKey ? '<p>연구소 주변의 낮은 레벨 곤충부터 도전하고, 사료로 팀을 키워 보세요.</p>' : ''}</div><button class="ix-return" data-act="return" data-action="return">탐험지로 돌아가기</button>` : `<div class="ix-actions"><button data-act="battle-action" data-action="attack" data-value="attack"><span>⚔️</span><strong>${escapeHtml(species.normalAttack.name)}</strong><small>일반 공격</small></button>${species.skill ? `<button data-act="battle-action" data-action="skill" data-value="skill" ${(yourActive.cooldowns && yourActive.cooldowns[species.skill.id]) > 0 ? 'disabled' : ''}><span>✦</span><strong>${escapeHtml(species.skill.name)}</strong><small>${(yourActive.cooldowns && yourActive.cooldowns[species.skill.id]) || '고유 기술'}</small></button>` : ''}<button data-act="open-switch" data-action="switch-menu"><span>↻</span><strong>교체</strong><small>남은 ${mine.team.filter(c => c.hp > 0).length}마리</small></button>${battle.type==='field'&&profile.resources?.tonic?`<button data-act="battle-action" data-value="tonic" ${yourActive.hp>=yourActive.maxHp?'disabled':''}><span>🧪</span><strong>버섯 회복제</strong><small>체력 45% · ${profile.resources.tonic}개</small></button>`:''}${battle.type === 'field' ? `<button data-act="battle-action" data-action="retreat" data-value="retreat"><span>⌂</span><strong>도주</strong><small>탐험지 복귀</small></button>` : ''}</div>`}
        <div class="ix-switch-list" hidden>${mine.team.map(c => `<button data-act="switch" data-id="${escapeHtml(c.id)}" ${c.id === yourActive.id || c.hp <= 0 ? 'disabled' : ''}>${escapeHtml(c.nickname || speciesOf(c).name)} <small>${c.hp}/${c.maxHp}</small></button>`).join('')}</div></div></section>`;
    }

    function centerModal() {
      const battle = snapshot.battle, capture = battle?.result?.captureSummary;
      if (!animationPlaying && battle?.status === 'finished' && capture?.success && !announcedBattles.has(battle.id)) {
        announcedBattles.add(battle.id);
        const names=(battle.result.captureSummaries||[capture]).filter(c=>c.success).map(c=>Data.speciesById[c.speciesId].name);
        celebration = {title:names.join(', ')+'를 채집했습니다!',speciesId:capture.speciesId,text:(capture.isNew?'새로운 도감 등록! · ':'')+'골드 +'+battle.result.gold+' · 사료 +'+battle.result.feeds};
        global.InsectAudio?.play('capture');
      }
      if(legacyReview){const c=snapshot.profile.collection.find(c=>c.id===legacyReview);if(!c){legacyReview=null;return '';}return '<div class="ix-modal-backdrop ix-celebration"><section class="ix-dialog" role="dialog" aria-modal="true" aria-label="계승 연구 확인"><h2>이 동료를 계승 연구할까요?</h2>'+modelFor(c.speciesId)+'<p>'+escapeHtml(c.nickname||speciesOf(c).name)+' Lv.'+c.level+' 1마리를 소모합니다. 이 개체의 레벨과 특화도 사라지며 되돌릴 수 없습니다.</p><p>같은 종류의 다른 동료는 남고, 시련 문장 5개를 얻어요.</p><div><button data-act="legacy-cancel">취소</button><button data-act="legacy-confirm">이 동료 소모 · 문장 5개 받기</button></div></section></div>';}
      if (fusionReview) {
        const base = snapshot.profile.collection.find(c=>c.id===fusionReview.creatureId), recipe = base && Data.fusionRecipes[base.speciesId];
        if (!recipe) { fusionReview = null; return ''; }
        const materials = fusionReview.materialIds.map(id=>snapshot.profile.collection.find(c=>c.id===id)).filter(Boolean);
        return '<div class="ix-modal-backdrop ix-celebration"><section class="ix-dialog" role="dialog" aria-modal="true" aria-label="조합 확인"><small>다음 단계로 성장 · 성공 확률 100%</small><h2>'+escapeHtml(Data.speciesById[recipe.result].name)+'</h2>'+modelFor(recipe.result)+'<p>기준: '+escapeHtml(base.nickname||speciesOf(base).name)+' Lv.'+base.level+' · 레벨과 배치 유지</p><p>소모: '+materials.map(c=>escapeHtml(c.nickname||speciesOf(c).name)+' Lv.'+c.level).join(', ')+'<br>골드 '+recipe.gold+' · 재료 2마리는 사라집니다.</p><div><button data-act="close-reward">취소</button><button class="is-primary" data-act="confirm-fuse">조합하기</button></div></section></div>';
      }
      if (!celebration) return '';
      return '<div class="ix-modal-backdrop ix-celebration"><section class="ix-dialog" role="dialog" aria-modal="true" aria-label="획득 알림"><small>탐험의 새로운 성과</small>'+(celebration.speciesId?modelFor(celebration.speciesId):'<span class="ix-reward-icon">'+celebration.icon+'</span>')+'<h2>'+escapeHtml(celebration.title)+'</h2><p>'+escapeHtml(celebration.text)+'</p><button class="is-primary" data-act="close-reward">확인 · 계속 탐험하기</button></section></div>';
    }

    function render() {
      if (!entered) { root.innerHTML = characterScreen(); if(snapshot.profile?.uid && !snapshot.profile.characterCreated) openEditor(true); return; }
      const profile = snapshot.profile || { collection: [], team: [], discoveries: [] };
      if (snapshot.battle) {
        root.innerHTML = `${battleModal(profile)}${centerModal()}<div class="ix-toast ${toastState ? 'is-visible' : ''}" data-tone="${toastState ? toastState.tone : 'info'}" role="status">${toastState ? escapeHtml(toastState.message) : ''}</div>`;
        const side = Object.values(snapshot.battle.sides).find(s => s.uid === snapshot.you);
        if (snapshot.battle.status === 'active' && side && side.pending) {
          root.querySelectorAll('.ix-actions button,.ix-switch-list button').forEach(button => { button.disabled = true; });
          root.querySelector('.ix-log').textContent = '행동 전달 완료 · 상대 행동을 기다립니다.';
        }
        return;
      }
      const team = (profile.team || []).map(id => (profile.collection || []).find(c => c.id === id)).filter(Boolean);
      const unread = (profile.discoveries || []).filter(id => !(profile.encyclopedia?.seen || []).includes(id)).length;
      const me = listOf(snapshot.players).find(p => p.uid === snapshot.you) || {};
      const quest = profile.quest || { status: 'available', progress: 0, target: 3 };
      const definition = Data.quests.find(q => q.id === quest.id) || Data.quests[0];
      const questText = quest.status === 'available' || quest.status === 'complete' ? '새 퀘스트 받기 · 현재 위치에서 바로 수락' : quest.status === 'active' ? `${definition.name} · ${definition.description} ${quest.progress}/${quest.target}` : `${definition.name} 완료! 눌러서 사료 보상 받기`;
      root.innerHTML = `${topBar(profile)}<nav class="ix-nav"><button data-act="panel" data-value="ecology"><span>📖</span>탐험 수첩</button><button data-act="customize"><span>🎀</span>꾸미기</button><button data-act="panel" data-value="bag"><span>🎒</span>가방</button><button data-act="panel" data-value="housing"><span>🏠</span>집 꾸미기</button><button data-act="panel" data-value="research"><span>🥚</span>탐험 연구</button><button class="${panel === 'team' ? 'is-active' : ''}" data-act="panel" data-value="team"><span>⚔</span>팀 편성</button><button class="${panel === 'collection' ? 'is-active' : ''}" data-act="panel" data-value="collection"><span>🪲</span>성장</button><button class="${panel === 'encyclopedia' ? 'is-active' : ''}" data-act="panel" data-value="encyclopedia"><span>▦</span>도감${unread ? `<b class="ix-badge" aria-label="새 도감 ${unread}종">${unread}</b>` : ''}</button><button class="${panel === 'map' ? 'is-active' : ''}" data-act="panel" data-value="map"><span>🗺️</span>지도</button><button class="${panel === 'shop' ? 'is-active' : ''}" data-act="panel" data-value="shop"><span>🛒</span>상점</button></nav>
        <button class="ix-team" data-act="panel" data-value="team" aria-label="현재 팀 편성"><small>전투 팀 ${team.length}/3</small>${team.map(c => `<span title="${escapeHtml(c.nickname || speciesOf(c).name)}">${modelFor(c.speciesId, speciesOf(c).category)}</span>`).join('')} ${team.length ? '' : '<b>곤충을 팀에 편성하세요</b>'}</button>
        ${panel ? '' : me.mount?`<button class="ix-sprint is-active" data-act="mount" data-id=""><strong>${Data.mounts[me.mount].icon} ${Data.mounts[me.mount].name}</strong><small>스태미나 소모 없음 · 내리기</small></button>`:`<button class="ix-sprint ${me.sprinting ? 'is-active' : ''}" data-act="sprint" aria-pressed="${!!me.sprinting}"><strong>${me.sprinting ? '달리기 켜짐' : '달리기'}</strong><span class="ix-stamina"><i style="width:${me.stamina ?? 100}%"></i></span><small>스태미나 ${me.stamina ?? 100}/100</small></button>`}
        <button class="ix-quest-strip" ${panel ? 'hidden' : ''} data-act="quest-guide">📜 ${escapeHtml(questText)}</button>${panel?'':global.InsectEcologyUI.hud(snapshot)}${nearbyPanel()}${selectionPanel()}${drawer(profile)}${housingOverlay(profile)}${challengeModal()}${battleModal(profile)}${centerModal()}<div class="ix-toast ${toastState ? 'is-visible' : ''}" data-tone="${toastState ? toastState.tone : 'info'}" role="status">${toastState ? escapeHtml(toastState.message) : ''}</div>`;
    }

    function signature(state) {
      const profile = state.profile || {};
      const battle = state.battle || null;
      return JSON.stringify({
        you: state.you, locationName: state.locationName, selectionDistance: selection?.type === "player" ? listOf(state.players).map(p=>[p.uid,Math.round(p.x),Math.round(p.z)]) : null,
        regionId:state.regionId,portal:nearbyPortal()?.id,
        profile: { appearance:profile.appearance, characterCreated:profile.characterCreated, characterId: profile.characterId, adventurerName: profile.adventurerName, team: profile.team, collection: profile.collection, discoveries: profile.discoveries, supplies: profile.supplies, quest: profile.quest, encyclopedia: profile.encyclopedia, gold: profile.gold, resources: profile.resources, mounts:profile.mounts },
        players: listOf(state.players).map(p => [p.uid || p.id, p.name || p.nickname, Boolean(p.busy), p.characterId, p.mount, p.uid === state.you ? p.stamina : null, p.uid === state.you ? p.sprinting : null]),
        spawns: listOf(state.spawns).map(s => [s.id, s.speciesId, s.available, s.reservedBy, s.field, s.level, s.boss, s.respawnAt]),
        ecology:state.ecology,ecologyProfile:profile.ecology,trials:profile.trials,ecoPosition:listOf(state.players).filter(p=>p.uid===state.you).map(p=>[Math.round(p.x),Math.round(p.z)]),
        resources: state.resources,realm:state.realm,home:state.home,neighbors:state.neighbors,
        challenges: state.challenges,
        battle: battle && { id: battle.id, status: battle.status, turn: battle.turn, deadline: battle.deadline, sides: battle.sides, events: battle.events, result: battle.result },
        selection, nearby: (nearbySpawn(state) || {}).id, nearbyResource: (nearbyResource(state) || {}).id
      });
    }

    root.addEventListener('change',event=>{if(event.target.matches('[data-home-piece]')){homeTool.pieceId=event.target.value||null;syncHomeTool();render();}});

    root.addEventListener('click', async event => {
      const button = event.target.closest('[data-act]');
      if (!button || button.disabled) return;
      const act = button.dataset.act, id = button.dataset.id;
      if(act==='town-return'){const result=await command('home-travel',{destination:'field'});if(result){panel=null;panelHistory=[];selection=null;homeTool.building=false;homeTool.deed=null;syncHomeTool();render();}return;}
      if(act==='trial-start'){const result=await command('trial-start',{stage:Number(id)});if(result){panel=null;render();}return;}
      if(act==='rune-upgrade')return command('rune-upgrade',{creatureId:id,kind:button.dataset.kind});
      if(act==='legacy-review'){legacyReview=id;render();return;}
      if(act==='legacy-cancel'){legacyReview=null;render();return;}
      if(act==='legacy-confirm'){const result=await command('legacy-research',{creatureId:legacyReview,confirm:true});if(result)legacyReview=null;render();return;}
      if(['craft','lure','explore-event','ecology-claim'].includes(act))return command(act,{id});
      if(act==='nectar')return command('nectar',{creatureId:id});
      if(act==='eco-route'){const result=await command('navigate',{id});if(result){panel=null;selection=null;render();}return;}
      if(act==='deed-use'){const result=await command('home-travel',{destination:'home'});if(result){panel=null;homeTool={...homeTool,deed:id,siteId:null,building:false};syncHomeTool();render();}return;}
      if(act==='home-site'){homeTool.siteId=id;syncHomeTool();render();return;}
      if(act==='land-confirm'){const result=await command('land-claim',{deed:homeTool.deed,siteId:homeTool.siteId});if(result){homeTool.deed=null;homeTool.building=true;homeTool.cell={x:0,z:0};syncHomeTool();render();}return;}
      if(act==='home-cancel'){homeTool.deed=null;homeTool.building=false;homeTool.pieceId=null;syncHomeTool();render();return;}
      if(act==='home-travel'||act==='home-visit'||act==='build-enter'){
        const result=await command('home-travel',{destination:act==='home-travel'?id:'home',ownerUid:act==='home-visit'?id:undefined});
        if(result){panel=null;selection=null;homeTool.deed=null;homeTool.building=act==='build-enter';homeTool.cell={x:0,z:0};homeTool.pieceId=null;syncHomeTool();render();}return;
      }
      if(act==='build-part'){homeTool.kind=id;homeTool.pieceId=null;syncHomeTool();render();return;}
      if(act==='build-rotate'){homeTool.rotation=(homeTool.rotation+1)%4;syncHomeTool();render();return;}
      if(act==='build-nudge'){const d=H.deeds[snapshot.home.plot.size];homeTool.cell={x:Math.max(0,Math.min(d.width-1,homeTool.cell.x+Number(button.dataset.x))),z:Math.max(0,Math.min(d.depth-1,homeTool.cell.z+Number(button.dataset.z)))};homeTool.pieceId=null;syncHomeTool();render();return;}
      if(act==='build-place')return command('house-place',{...homeTool.cell,kind:homeTool.kind,rotation:homeTool.rotation});
      if(act==='build-remove'){const result=await command('house-remove',{pieceId:homeTool.pieceId});if(result){homeTool.pieceId=null;syncHomeTool();render();}return;}
      if (act === 'close-reward') { celebration = null; fusionReview = null; render(); return; }
      if (act === 'fuse-review') {
        const base = snapshot.profile.collection.find(c=>c.id===id);
        if (!base) return;
        const materials = snapshot.profile.collection.filter(c=>c.id!==id&&c.speciesId===base.speciesId&&!snapshot.profile.team.includes(c.id)).sort((a,b)=>a.level-b.level||a.xp-b.xp).slice(0,2);
        if (materials.length<2) return;
        fusionReview = {creatureId:id,materialIds:materials.map(c=>c.id)}; render(); return;
      }
      if (act === 'confirm-fuse') { if (busy || !fusionReview) return; const payload = fusionReview; fusionReview = null; await command('fuse',payload); render(); return; }
      if (act === 'navigate') { const result=await command('navigate',{id}); if(result){panel=null;selection=null;render();} return; }
      if (act === 'customize') { openEditor(false); return; }

      if (act === 'panel') { if(panel===button.dataset.value){panel=null;panelHistory=[];}else openPanel(button.dataset.value); rarityFilter = 'all'; render(); if (panel === 'encyclopedia') await command('dex-seen', {ids: snapshot.profile.discoveries || []}); return; }
      if (act === 'rarity-filter') { rarityFilter = id; render(); return; }
      if (act === 'team-slot') { teamSlot = Number(button.dataset.index); render(); return; }
      if (act === 'open-team') { openPanel('team'); rarityFilter = 'all'; teamSlot = Math.max(0, snapshot.profile.team.indexOf(id)); render(); return; }
      if (act === 'assign-team') {
        const ids = [...snapshot.profile.team], slot = Math.min(teamSlot, ids.length), previous = ids.indexOf(id);
        if (previous === slot) return;
        if (previous >= 0) { if (slot >= ids.length) { notify('이미 팀에 있는 곤충입니다. 다른 슬롯을 선택해 순서를 바꿔 주세요.'); return; } [ids[slot], ids[previous]] = [ids[previous], ids[slot]]; }
        else ids[slot] = id;
        await command('team', {ids}); render(); return;
      }
      if (act === 'mount') { const result=await command('mount',{id});if(result){panel=null;render();}return; }
      if (act === 'auto-battle') { const side=Object.values(snapshot.battle.sides).find(s=>s.uid===snapshot.you);return command('auto-battle',{enabled:!side.auto}); }
      if (act === 'buy') return command('buy', {itemId:id});
      if(act==='portal'){const result=await command('portal',{portalId:id});if(result){selection=null;panel=null;render();}return;}
      if(act==='sell-resource')return command('sell-resource',{kind:id,count:button.dataset.count==='all'?'all':Number(button.dataset.count)});
      if (act === 'sell-materials') return command('sell-materials', {});
      if (act === 'gather') return command('gather', {nodeId:id});
      if (act === 'dex-claim') return command('dex-claim', {});
      if (act === 'sprint') { const me = listOf(snapshot.players).find(p => p.uid === snapshot.you); return command('sprint', { enabled: !me?.sprinting }); }
      if (act === 'panel-back'){backPanel();return;}
      if (act === 'close-panel') { panel = null;panelHistory=[]; render(); return; }
      if (act === 'collect' || act === 'encounter') return command(act, { spawnId: id });
      if (act === 'challenge') return command('challenge', { targetUid: id });
      if (act === 'respond') return command('respond', { requestId: id, accept: button.dataset.value === 'true' });
      if (act === 'heal') return command('heal', {});
      if (act === 'close-dialog') { selection = null; render(); return; }
      if (act === 'quest-guide' || act === 'quest') { const result = await command('quest', {}); if (result) { selection = null; render(); } return; }
      if (act === 'travel') { const result = await command('travel', { biomeId: id }); if (result) { panel = null; selection = id === 'safe' ? { type: 'npc', id: 'guide-mira' } : null; render(); } return; }
      if (act === 'sound') { await command('sound', {}); render(); return; }
      if (act === 'exit') return command('exit', {});
      if (act === 'rename') { const current = (snapshot.profile.collection || []).find(c => c.id === id); const name = global.prompt('새 이름을 입력하세요. (최대 16자)', current && current.nickname || ''); if (name && name.trim()) return command('rename', { creatureId: id, name: name.trim().slice(0, 16) }); return; }
      if (act === 'feed') return command('feed', { creatureId: id, count:button.dataset.count==='all'?'all':Number(button.dataset.count)||1 });
      if(act==='incubate'||act==='hatch')return command(act,{eggId:id});
      if(act==='research-claim')return command(act,{id});
      if (act === 'evolve') return command('evolve', { creatureId: id });
      if (act === 'detail') { detailCreatureId = detailCreatureId === id ? null : id; render(); return; }
      if (act === 'team') { const old = snapshot.profile.team || []; const ids = old.includes(id) ? old.filter(x => x !== id) : old.length < 3 ? [...old, id] : [...old.slice(1), id]; return command('team', { ids }); }
      if (animationPlaying && ['battle-action','switch','return'].includes(act)) return;
      if (act === 'battle-action') return command('action', { battleId: snapshot.battle.id, turn: snapshot.battle.turn, action: { type: button.dataset.value } });
      if (act === 'open-switch') { const el = root.querySelector('.ix-switch-list'); el.hidden = !el.hidden; return; }
      if (act === 'switch') return command('action', { battleId: snapshot.battle.id, turn: snapshot.battle.turn, action: { type: 'switch', creatureId: id } });
      if (act === 'return') return command('return', {});
    });

    function escapeMenu(event){if(event.key!=='Escape'||editor||event.target.matches('input,textarea,select'))return;
      if(legacyReview){legacyReview=null;render();}else if(celebration||fusionReview){celebration=null;fusionReview=null;render();}else if(panel){backPanel();}else if(homeTool.building||homeTool.deed){homeTool.building=false;homeTool.deed=null;syncHomeTool();render();}else{selection=null;render();}event.preventDefault();}
    global.addEventListener('keydown',escapeMenu);
    render();
    const clock = setInterval(() => {
      const label = root.querySelector('.ix-turn b');
      if (label && snapshot.battle) label.textContent = snapshot.battle.status === 'finished' ? '—' : remainingTime(snapshot.battle);
    }, 250);
    return {
      setState(next) {
        if(next && next.serverTime > lastServerStamp){lastServerStamp=next.serverTime;serverOffset=next.serverTime-Date.now();}
        if(next?.regionId!==snapshot.regionId)selection=null;
        snapshot=next||snapshot;
        if(!entered && snapshot.profile?.characterCreated){entered=true;options.onEnter?.();}
        if(!entered){if(snapshot.profile?.uid && !editor)render();return;}
        const nextSignature=signature(snapshot);if(nextSignature!==lastSignature){lastSignature=nextSignature;render();}
      },
      setSelection(next) {
        if(next?.type==='home-land'&&homeTool.deed){homeTool.siteId=next.id;syncHomeTool();render();return;}
        if(next?.type==='home-cell'&&homeTool.building){homeTool.cell={x:next.x,z:next.z};homeTool.pieceId=null;syncHomeTool();render();return;}
        if(next?.type==='home-piece'){
          const p=snapshot.home?.pieces.find(p=>p.id===next.id);if(!p)return;
          if(homeTool.building){homeTool.cell={x:p.x,z:p.z};homeTool.pieceId=p.id;syncHomeTool();render();}
          else if(p.kind==='door')command('house-door',{pieceId:p.id});return;
        }
        if(next?.type==='site'||next?.type==='event'){command('navigate',{id:next.id});}
        selection = next && next.id ? { type: next.type, id: next.id } : null; lastSignature = ''; if (entered) render(); },
      setAnimating(value) { animationPlaying = !!value; root.classList.toggle('is-animating', animationPlaying); },
      notify,
      dispose() { global.removeEventListener('keydown',escapeMenu); editor?.close(); clearTimeout(toastTimer); clearInterval(clock); root.innerHTML = ''; root.classList.remove('ix-ui', 'is-busy'); }
    };
  }

  global.InsectUI = { create };
})(window);
