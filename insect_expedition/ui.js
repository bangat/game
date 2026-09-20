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
    let selection = null;
    let panel = null;
    let rarityFilter = 'all', teamSlot = 0, animationPlaying = false;
    let entered = false;
    const storedCharacter = (() => { try { return localStorage.getItem('insectExpedition.character.v1'); } catch (_) { return null; } })();
    let explorerName = '', nameEdited = false;
    let chosenCharacter = Data.characters.some(c => c.id === storedCharacter) ? storedCharacter : null;
    let characterChosenHere = false;
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
        if (result && result.message) notify(result.message, result.ok === false ? 'error' : 'success');
        return result;
      } catch (error) { notify(error && error.message || '요청을 처리하지 못했습니다.', 'error'); return null; }
      finally { busy = false; root.classList.remove('is-busy'); }
    }

    function stat(creature, key) {
      if (creature[key] != null) return creature[key];
      if (creature.stats && creature.stats[key] != null) return creature.stats[key];
      try { return global.InsectBattle ? global.InsectBattle.statsForCreature(creature)[key] : speciesOf(creature).baseStats[key]; } catch (_) { return 0; }
    }

    function creatureCard(creature, profile, compact) {
      const species = speciesOf(creature);
      const inTeam = (profile.team || []).includes(creature.id);
      const maxHp = creature.maxHp || creature.maxHealth || stat(creature, 'maxHealth');
      const hp = creature.hp == null ? maxHp : creature.hp;
      const stats = creature.stats || {};
      const neededXp = 36 + Math.max(0, (creature.level || 1) - 1) * 18;
      const expanded = detailCreatureId === creature.id;
      return `<article class="ix-creature ${compact ? 'is-compact' : ''}" data-rarity="${species.rarity}">
        <div class="ix-creature-icon" aria-hidden="true">${modelFor(creature.speciesId, species.category)}</div>
        <div class="ix-creature-copy"><div class="ix-card-title"><strong>${escapeHtml(creature.nickname || species.name)}</strong><span>Lv.${creature.level || 1}</span></div>
        <small>${escapeHtml(species.name)} · ${rankBadge(species)}</small>
        <div class="ix-hp"><i style="width:${Math.round((hp / Math.max(1, maxHp)) * 100)}%"></i></div><small>체력 ${hp}/${maxHp} · 전투력 ${creature.cp || creature.combatPower || '—'}</small></div>
        ${compact ? '' : `<div class="ix-xp"><i style="width:${Math.min(100,Math.round(((creature.xp || 0) / Math.max(1,neededXp))*100))}%"></i><span>경험치 ${creature.xp || 0}/${neededXp}</span></div><div class="ix-card-actions"><button data-act="detail" data-id="${escapeHtml(creature.id)}">${expanded ? '정보 닫기' : '상세 정보'}</button><button data-act="open-team" data-id="${escapeHtml(creature.id)}">${inTeam ? '배치 변경' : '팀 편성'}</button><button data-act="feed" data-id="${escapeHtml(creature.id)}" ${(profile.supplies && profile.supplies.feeds || 0) < 1 || creature.level >= 50 ? 'disabled' : ''}>사료로 성장</button>${species.evolvesTo ? `<button data-act="evolve" data-id="${escapeHtml(creature.id)}" ${(creature.level || 1) < 5 ? 'disabled' : ''}>${(creature.level || 1) < 5 ? 'Lv.5 진화' : '진화하기'}</button>` : ''}</div>${expanded ? `<div class="ix-creature-detail"><button data-act="rename" data-id="${escapeHtml(creature.id)}">이름 바꾸기</button><div class="ix-detail-tags"><span>${escapeHtml(species.stage)}</span><span>${escapeHtml(species.habitat)}</span><span>포획 난도 ${species.captureDifficulty}</span></div><dl><div><dt>생명력</dt><dd>${stats.maxHealth || maxHp}</dd></div><div><dt>공격</dt><dd>${stats.attack || stat(creature,'attack')}</dd></div><div><dt>방어</dt><dd>${stats.defense || stat(creature,'defense')}</dd></div><div><dt>속도</dt><dd>${stats.speed || stat(creature,'speed')}</dd></div></dl><p class="ix-feed-note">사료 1개 = 경험치 +84.${species.evolvesTo ? ` Lv.5부터 ${escapeHtml(Data.speciesById[species.evolvesTo].name)}로 진화하며 공격도 바뀝니다.` : ' 이 곤충은 레벨을 올려 능력치를 키울 수 있어요.'}</p><div class="ix-move"><b>${escapeHtml(species.normalAttack.name)}</b><span>위력 ${species.normalAttack.power} · 명중 ${Math.round(species.normalAttack.accuracy*100)}%</span></div>${species.skill ? `<div class="ix-move is-skill"><b>${escapeHtml(species.skill.name)}</b><span>위력 ${species.skill.power} · 재사용 ${species.skill.cooldown}턴</span><p>${escapeHtml(species.skill.description)}</p></div>` : '<p class="ix-no-skill">일반종은 고유 기술 없이 기본 공격으로 싸웁니다.</p>'}</div>` : ''}`}
      </article>`;
    }

    function iconFor(category) {
      const winged = /나비|나방|잠자리|벌|매미/.test(category || '');
      const longLeg = /귀뚜라미|메뚜기|사마귀/.test(category || '');
      const palette = /벌/.test(category || '') ? '--shell:#e3aa32;--wing:#fff0ad' : /나비|나방/.test(category || '') ? '--shell:#8168b7;--wing:#d9c7ff' : '--shell:#4d9d68;--wing:#cdecc0';
      return `<svg class="ix-glyph" viewBox="0 0 100 100" style="${palette}" aria-hidden="true"><path class="line" d="M42 31 30 18M58 31 70 18M37 58 18 ${longLeg ? '84' : '68'}M63 58 82 ${longLeg ? '84' : '68'}"/>${winged ? '<ellipse class="wing" cx="28" cy="45" rx="22" ry="15" transform="rotate(-35 28 45)"/><ellipse class="wing" cx="72" cy="45" rx="22" ry="15" transform="rotate(35 72 45)"/>' : ''}<ellipse class="shell" cx="50" cy="59" rx="23" ry="30"/><circle class="shell" cx="50" cy="31" r="14"/><path class="line" d="M50 43v44M31 51 15 42M69 51l16-9M30 69 14 78M70 69l16 9"/><circle class="eye" cx="44" cy="28" r="2.5"/><circle class="eye" cx="56" cy="28" r="2.5"/></svg>`;
    }

    function modelFor(speciesId, category) {
      const imageId = speciesId === 'king_stag' ? 'cave_stag' : speciesId;
      return `<img class="ix-model" src="assets/creatures/${encodeURIComponent(imageId)}.png" alt="" loading="lazy">`;
    }

    function characterScreen() {
      const selected = chosenCharacter || (snapshot.you && snapshot.you.characterId) || Data.characters[0].id;
      chosenCharacter = selected;
      const current = Data.characters.find(c => c.id === selected) || Data.characters[0];
      return `<section class="ix-onboard" aria-label="탐험가 선택"><div class="ix-onboard-copy"><p class="ix-eyebrow">공유 세계 곤충 탐험</p><h1>${Data.title}</h1><p>서로 다른 서식지를 누비며 작은 생명들과 팀을 이루세요.</p></div>
        <div class="ix-character-stage" aria-live="polite"><img class="ix-character-render" src="assets/characters/${selected}.png" alt="${escapeHtml(current.name)} 3D 모습"><strong>${escapeHtml(current.name)}</strong><small>${escapeHtml(current.role)} · 모든 탐험가는 무료이며 능력 차이가 없습니다.</small></div>
        <div class="ix-character-grid">${Data.characters.map(c => `<button id="character-${c.id}" class="ix-character ${c.id === selected ? 'is-selected' : ''}" data-act="character" data-action="character" data-id="${c.id}"><img class="ix-mini-render" src="assets/characters/${c.id}.png" alt=""><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.role)}</small></button>`).join('')}</div>
        <div class="ix-enter-row"><label for="explorer-name">탐험가 이름 <small>한글 1~6자 · 계정에 저장</small></label><input id="explorer-name" aria-label="탐험가 이름" maxlength="6" pattern="[가-힣]{1,6}" placeholder="예: 숲탐험가" value="${escapeHtml(explorerName)}" autocomplete="off"><button id="enter-world" class="ix-enter" data-act="enter" data-action="enter">이슬숲으로 출발</button></div></section>`;
    }

    function topBar(profile) {
      const online = listOf(snapshot.players).length;
      return `<header class="ix-top"><div><p class="ix-eyebrow">현재 지역</p><strong>${escapeHtml(snapshot.locationName || '해오름 초원')}</strong></div><div class="ix-online"><i></i>${online}명 탐험 중</div><button class="ix-feed" data-act="panel" data-value="collection" title="사료로 곤충 성장">🍀 ${profile.supplies && profile.supplies.feeds || 0}</button><button data-act="heal" data-action="heal" title="팀 전체 회복">회복</button><button data-act="sound" title="효과음 켜기·끄기">소리</button><button class="ix-exit" data-act="exit" title="대기실로 돌아가기">나가기</button></header>`;
    }

    function nearbySpawn(state) {
      if (state.battle) return null;
      const me = typeof state.you === 'object' ? state.you : listOf(state.players).find(p => p.uid === state.you);
      if (!me || me.busy) return null;
      const obstacles = global.InsectWorld ? global.InsectWorld.obstacles : [];
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

    function nearbyPanel() {
      if (panel || (selection && selection.type === 'npc') || (snapshot.challenges || []).some(c => c.to === snapshot.you)) return '';
      const spawn = nearbySpawn(snapshot);
      if (!spawn) return '';
      const species = speciesOf(spawn), action = 'encounter';
      return `<div class="ix-nearby" aria-label="가까운 곤충"><span>${rankBadge(species)} Lv.${spawn.level || 1} ${escapeHtml(species.name)}</span><button id="selected-${action}" data-act="${action}" data-action="${action}" data-id="${escapeHtml(spawn.id)}">⚔ 전투하고 채집</button></div>`;
    }

    function selectionPanel() {
      if (panel || !selection || selection.type === 'spawn') return '';
      if (selection.type === 'npc' && selection.id === 'guide-mira') {
        const quest = snapshot.profile && snapshot.profile.quest || { status: 'available', progress: 0, target: 3 };
        const definition = Data.quests.find(q => q.id === quest.id) || Data.quests[0];
        const text = quest.status === 'available' || quest.status === 'complete' ? '새 의뢰를 받을까요? 어디서든 진행하고 보상을 받을 수 있어요.' : quest.status === 'active' ? `${definition.description} (${quest.progress}/${quest.target})` : '의뢰 완료! 사료 보상을 받아 가세요.';
        return `<div class="ix-selection ix-npc"><span class="ix-selection-icon">🧑‍🔬</span><div><small>이슬숲 연구소</small><strong>미라 연구원</strong><span>${text}</span></div><button data-act="quest">${quest.status === 'ready' ? '보상 받기' : quest.status === 'active' ? '진행 확인' : '의뢰 수락'}</button><button data-act="close-dialog" aria-label="대화 닫기">×</button></div>`;
      }
      const player = listOf(snapshot.players).find(item => (item.uid || item.id) === selection.id);
      if (!player) return '<div class="ix-selection is-empty">탐험가가 이동했습니다.</div>';
      return `<div class="ix-selection"><span class="ix-selection-icon">🧭</span><div><small>다른 탐험가</small><strong>${escapeHtml(player.name || player.nickname || '탐험가')}</strong><span>${player.busy ? '다른 활동 중' : '3 대 3 친선 대전을 신청할 수 있어요.'}</span></div><button id="selected-challenge" data-act="challenge" data-action="challenge" data-id="${escapeHtml(player.uid || player.id)}" ${player.busy ? 'disabled' : ''}>대전 신청</button></div>`;
    }

    function regionLevels(biome) {
      const spawns = listOf(snapshot.spawns).filter(s => {
        const species = speciesOf(s);
        return (biome.habitats || [biome.habitat]).includes(species.habitat) && !s.id.startsWith('tutorial-');
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
      const head = (small, title, count) => '<div class="ix-drawer-head"><div><small>' + small + '</small><h2>' + title + ' <b>' + count + '</b></h2></div><button data-act="close-panel" aria-label="닫기">×</button></div>';
      if (panel === 'collection') return '<aside class="ix-drawer ix-collection-drawer">' + head('전투 승리 · 도감 보상으로 사료 획득', '곤충 성장', '🍀 ' + (profile.supplies?.feeds || 0)) + rankTabs(collection) + '<div class="ix-drawer-scroll">' + (filtered.length ? filtered.map(c => creatureCard(c, profile, false)).join('') : '<p class="ix-panel-empty">이 등급의 곤충은 아직 없어요. 전투에서 승리해 모아 보세요.</p>') + '</div></aside>';
      if (panel === 'team') {
        const team = (profile.team || []).map(id => collection.find(c => c.id === id)).filter(Boolean);
        return '<aside class="ix-drawer ix-team-drawer">' + head('슬롯 선택 → 아래 곤충 선택 · 같은 팀끼리는 순서 교환', '전투 팀 편성', team.length + '/3')
          + '<div class="ix-team-slots">' + [0,1,2].map(index => {
            const c = team[index];
            return '<button data-act="team-slot" data-index="' + index + '" aria-pressed="' + (teamSlot === index) + '"><b>' + (index === 0 ? '1 · 선봉' : (index + 1) + ' · 교체') + '</b>' + (c ? modelFor(c.speciesId) + '<strong>' + escapeHtml(c.nickname || speciesOf(c).name) + '</strong><small>Lv.' + c.level + ' · 전투력 ' + c.combatPower + '</small>' : '<span class="ix-slot-empty">＋</span><small>곤충을 배치하세요</small>') + '</button>';
          }).join('') + '</div>' + rankTabs(collection) + '<div class="ix-team-options ix-drawer-scroll">' + (filtered.length ? filtered.map(c => '<button data-act="assign-team" data-id="' + escapeHtml(c.id) + '">' + modelFor(c.speciesId) + '<span><strong>' + escapeHtml(c.nickname || speciesOf(c).name) + '</strong><small>' + rankBadge(speciesOf(c)) + ' Lv.' + c.level + ' · 전투력 ' + c.combatPower + '</small></span><b>' + (profile.team.includes(c.id) ? (profile.team.indexOf(c.id)+1)+'번 배치' : '배치') + '</b></button>').join('') : '<p class="ix-panel-empty">해당 등급의 곤충이 없습니다.</p>') + '</div></aside>';
      }
      if (panel === 'map') return `<aside class="ix-drawer ix-map-drawer">${head('사냥터 이동', '탐험 지도', '')}<p class="ix-map-copy">처음에는 연구소 주변 Lv.1 곤충부터! 사료로 팀을 키운 뒤 더 높은 지역에 도전하세요.</p><div class="ix-map-list">${Data.biomes.map(b => `<button data-act="travel" data-id="${escapeHtml(b.id)}" class="${snapshot.locationName === b.name ? 'is-here' : ''}"><i style="background:${escapeHtml(b.color)}"></i><span><b>${escapeHtml(b.name)}</b><small>${b.safe ? 'Lv.1 연습 전투 · 회복과 의뢰' : `Lv.${regionLevels(b)} · ${escapeHtml(b.habitat || '사냥터')}`}</small></span><em>${b.safe ? '마을' : '이동'}</em></button>`).join('')}</div></aside>`;
      const known = new Set(profile.discoveries || []), claimed = new Set(profile.encyclopedia?.claimed || []);
      const reward = rewardCount(profile);
      const catalog = Data.species.filter(c => rarityFilter === 'all' || c.rarity === rarityFilter);
      return '<aside class="ix-drawer ix-dex-drawer">' + head('새로운 종마다 사료 보상 · 보상은 한 번씩', '이슬숲 도감', known.size + '/' + Data.species.length)
        + '<div class="ix-dex-rewards"><button data-act="dex-claim" ' + (reward ? '' : 'disabled') + '>🍀 수집 보상 받기 +' + reward + '</button><span>' + Data.collectionMilestones.map(m => '<b class="' + (known.size >= m.count ? 'is-complete' : '') + '">' + m.count + '종 · 사료 ' + m.feeds + '</b>').join('') + '</span></div>'
        + rankTabs(Data.species.map(c => ({speciesId:c.id}))) + '<div class="ix-encyclopedia">' + catalog.map(c => '<div class="' + (known.has(c.id) ? '' : 'is-unknown') + '"><span>' + (known.has(c.id) ? modelFor(c.id) : '?') + '</span><strong>' + (known.has(c.id) ? escapeHtml(c.name) : '미발견') + '</strong><small>' + rankBadge(c) + ' · ' + (known.has(c.id) ? (claimed.has(c.id) ? '보상 수령' : '사료 +' + Data.rarity[c.rarity].reward) : escapeHtml(c.habitat)) + '</small></div>').join('') + '</div></aside>';
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
      const captureText = capture && capture.success ? `${escapeHtml(Data.speciesById[capture.speciesId] && Data.speciesById[capture.speciesId].name || '야생 곤충')}를 채집했습니다!${capture.isNew ? ' 새 도감 등록 +1' : ''}` : capture && capture.failureReason === 'inventory-full' ? '보관함이 가득 차 포획 보상을 받지 못했습니다.' : capture && capture.success === false ? `채집 실패 · 곤충이 달아났어요. 성공 확률 ${Math.round((capture.chance || 0) * 100)}%` : '';
      const rewardText = [outcome && outcome.totalXp > 0 ? `총 경험치 +${outcome.totalXp} · 참여 곤충당 ${outcome.xpPerCreature}` : '', outcome && outcome.feeds ? `사료 +${outcome.feeds}` : '', captureText, outcome && outcome.recovered ? '전원 자동 회복 완료' : ''].filter(Boolean).join(' · ') || '전투 기록이 안전하게 저장됩니다.';
      const levelText = outcome && outcome.levelUps && outcome.levelUps.length ? ` · ${outcome.levelUps.length}마리 레벨 상승!` : '';
      return `<section class="ix-battle" aria-label="턴제 전투"><header><div><small>${battle.type === 'pvp' ? '탐험가 대전 · 3 대 3' : '필드 전투 · 3 대 1'}</small><strong>턴 ${battle.turn}</strong></div><div class="ix-turn"><i style="--time:${Math.min(25, time)}"></i><b>${time}</b>초</div></header>
        <div class="ix-battlefield"><div class="ix-fighter is-enemy"><div class="ix-fighter-info"><strong>${escapeHtml(foeActive.nickname || foeSpecies.name)}</strong><span>${rankBadge(foeSpecies)} Lv.${foeActive.level}</span><div class="ix-hp"><i style="width:${hpPercent(foeActive)}%"></i></div><small>${foeActive.hp}/${foeActive.maxHp}</small></div></div>
        <div class="ix-impact" ${battle.status === 'finished' ? 'hidden' : ''} aria-live="polite">${lastHit ? `${lastHit.critical ? '치명타 · ' : ''}-${lastHit.amount}` : '대치 중'}</div><div class="ix-fighter is-player"><div class="ix-fighter-info"><strong>${escapeHtml(yourActive.nickname || species.name)}</strong><span>${rankBadge(species)} Lv.${yourActive.level} · 전투력 ${yourActive.cp || yourActive.combatPower || '—'}</span><div class="ix-hp"><i style="width:${hpPercent(yourActive)}%"></i></div><small>${yourActive.hp}/${yourActive.maxHp}</small></div></div></div>
        <div class="ix-battle-bottom"><div class="ix-log" aria-live="polite">${events.slice(-3).map(e => `<p>${escapeHtml(e.message || '전투가 이어집니다.')}</p>`).join('') || '<p>행동을 선택하세요.</p>'}</div>
        ${battle.status === 'finished' ? `<div class="ix-battle-result"><strong>${outcome && outcome.winner === youKey ? '탐험 승리' : outcome && outcome.reason === 'retreat' ? '안전하게 후퇴했습니다' : '다음 도전을 준비해요'}</strong><span>${rewardText}${levelText}</span>${outcome && outcome.winner !== youKey ? '<p>연구소 주변의 낮은 레벨 곤충부터 도전하고, 사료로 팀을 키워 보세요.</p>' : ''}</div><button class="ix-return" data-act="return" data-action="return">탐험지로 돌아가기</button>` : `<div class="ix-actions"><button data-act="battle-action" data-action="attack" data-value="attack"><span>⚔️</span><strong>${escapeHtml(species.normalAttack.name)}</strong><small>일반 공격</small></button>${species.skill ? `<button data-act="battle-action" data-action="skill" data-value="skill" ${(yourActive.cooldowns && yourActive.cooldowns[species.skill.id]) > 0 ? 'disabled' : ''}><span>✦</span><strong>${escapeHtml(species.skill.name)}</strong><small>${(yourActive.cooldowns && yourActive.cooldowns[species.skill.id]) || '고유 기술'}</small></button>` : ''}<button data-act="open-switch" data-action="switch-menu"><span>↻</span><strong>교체</strong><small>남은 ${mine.team.filter(c => c.hp > 0).length}마리</small></button>${battle.type === 'field' ? `<button data-act="battle-action" data-action="retreat" data-value="retreat"><span>⌂</span><strong>도주</strong><small>탐험지 복귀</small></button>` : ''}</div>`}
        <div class="ix-switch-list" hidden>${mine.team.map(c => `<button data-act="switch" data-id="${escapeHtml(c.id)}" ${c.id === yourActive.id || c.hp <= 0 ? 'disabled' : ''}>${escapeHtml(c.nickname || speciesOf(c).name)} <small>${c.hp}/${c.maxHp}</small></button>`).join('')}</div></div></section>`;
    }

    function render() {
      if (!entered) { root.innerHTML = characterScreen(); return; }
      const profile = snapshot.profile || { collection: [], team: [], discoveries: [] };
      if (snapshot.battle) {
        root.innerHTML = `${battleModal(profile)}<div class="ix-toast ${toastState ? 'is-visible' : ''}" data-tone="${toastState ? toastState.tone : 'info'}" role="status">${toastState ? escapeHtml(toastState.message) : ''}</div>`;
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
      root.innerHTML = `${topBar(profile)}<nav class="ix-nav"><button class="${panel === 'team' ? 'is-active' : ''}" data-act="panel" data-value="team"><span>⚔</span>팀 편성</button><button class="${panel === 'collection' ? 'is-active' : ''}" data-act="panel" data-value="collection"><span>🪲</span>성장</button><button class="${panel === 'encyclopedia' ? 'is-active' : ''}" data-act="panel" data-value="encyclopedia"><span>▦</span>도감${unread ? `<b class="ix-badge" aria-label="새 도감 ${unread}종">${unread}</b>` : ''}</button><button class="${panel === 'map' ? 'is-active' : ''}" data-act="panel" data-value="map"><span>🗺️</span>지도</button></nav>
        <button class="ix-team" data-act="panel" data-value="team" aria-label="현재 팀 편성"><small>전투 팀 ${team.length}/3</small>${team.map(c => `<span title="${escapeHtml(c.nickname || speciesOf(c).name)}">${modelFor(c.speciesId, speciesOf(c).category)}</span>`).join('')} ${team.length ? '' : '<b>곤충을 팀에 편성하세요</b>'}</button>
        ${panel ? '' : `<button class="ix-sprint ${me.sprinting ? 'is-active' : ''}" data-act="sprint" aria-pressed="${!!me.sprinting}"><strong>${me.sprinting ? '달리기 켜짐' : '달리기'}</strong><span class="ix-stamina"><i style="width:${me.stamina ?? 100}%"></i></span><small>스태미나 ${me.stamina ?? 100}/100</small></button>`}
        <button class="ix-quest-strip" ${panel ? 'hidden' : ''} data-act="quest-guide">📜 ${escapeHtml(questText)}</button>${nearbyPanel()}${selectionPanel()}${drawer(profile)}${challengeModal()}${battleModal(profile)}<div class="ix-toast ${toastState ? 'is-visible' : ''}" data-tone="${toastState ? toastState.tone : 'info'}" role="status">${toastState ? escapeHtml(toastState.message) : ''}</div>`;
    }

    function signature(state) {
      const profile = state.profile || {};
      const battle = state.battle || null;
      return JSON.stringify({
        you: state.you, locationName: state.locationName,
        profile: { characterId: profile.characterId, adventurerName: profile.adventurerName, team: profile.team, collection: profile.collection, discoveries: profile.discoveries, supplies: profile.supplies, quest: profile.quest, encyclopedia: profile.encyclopedia },
        players: listOf(state.players).map(p => [p.uid || p.id, p.name || p.nickname, Boolean(p.busy), p.characterId, p.uid === state.you ? p.stamina : null, p.uid === state.you ? p.sprinting : null]),
        spawns: listOf(state.spawns).map(s => [s.id, s.speciesId, s.available, s.reservedBy, s.field, s.level]),
        challenges: state.challenges,
        battle: battle && { id: battle.id, status: battle.status, turn: battle.turn, deadline: battle.deadline, sides: battle.sides, events: battle.events, result: battle.result },
        selection, nearby: (nearbySpawn(state) || {}).id
      });
    }

    root.addEventListener('input', event => { if (event.target.id === 'explorer-name') { explorerName = event.target.value; nameEdited = true; } });
    root.addEventListener('click', async event => {
      const button = event.target.closest('[data-act]');
      if (!button || button.disabled) return;
      const act = button.dataset.act, id = button.dataset.id;
      if (act === 'character') { chosenCharacter = id; characterChosenHere = true; try { localStorage.setItem('insectExpedition.character.v1', id); } catch (_) {} if (options.onCharacter) options.onCharacter(id); render(); return; }
      if (act === 'enter') { if (!/^[가-힣]{1,6}$/.test(explorerName)) { notify('탐험가 이름을 한글 1~6자로 지어 주세요.', 'error'); root.querySelector('#explorer-name').focus(); return; } const result = await command('character', { id: chosenCharacter, name: explorerName }); if (result === null || (result && result.ok === false)) return; entered = true; if (options.onEnter) options.onEnter(chosenCharacter); render(); return; }
      if (act === 'panel') { panel = panel === button.dataset.value ? null : button.dataset.value; rarityFilter = 'all'; render(); if (panel === 'encyclopedia') await command('dex-seen', {ids: snapshot.profile.discoveries || []}); return; }
      if (act === 'rarity-filter') { rarityFilter = id; render(); return; }
      if (act === 'team-slot') { teamSlot = Number(button.dataset.index); render(); return; }
      if (act === 'open-team') { panel = 'team'; rarityFilter = 'all'; teamSlot = Math.max(0, snapshot.profile.team.indexOf(id)); render(); return; }
      if (act === 'assign-team') {
        const ids = [...snapshot.profile.team], slot = Math.min(teamSlot, ids.length), previous = ids.indexOf(id);
        if (previous === slot) return;
        if (previous >= 0) { if (slot >= ids.length) { notify('이미 팀에 있는 곤충입니다. 다른 슬롯을 선택해 순서를 바꿔 주세요.'); return; } [ids[slot], ids[previous]] = [ids[previous], ids[slot]]; }
        else ids[slot] = id;
        await command('team', {ids}); render(); return;
      }
      if (act === 'dex-claim') return command('dex-claim', {});
      if (act === 'sprint') { const me = listOf(snapshot.players).find(p => p.uid === snapshot.you); return command('sprint', { enabled: !me?.sprinting }); }
      if (act === 'close-panel') { panel = null; render(); return; }
      if (act === 'collect' || act === 'encounter') return command(act, { spawnId: id });
      if (act === 'challenge') return command('challenge', { targetUid: id });
      if (act === 'respond') return command('respond', { requestId: id, accept: button.dataset.value === 'true' });
      if (act === 'heal') return command('heal', {});
      if (act === 'close-dialog') { selection = null; render(); return; }
      if (act === 'quest-guide' || act === 'quest') { const result = await command('quest', {}); if (result) { selection = null; render(); } return; }
      if (act === 'travel') { const result = await command('travel', { biomeId: id }); if (result) { panel = null; selection = id === 'safe' ? { type: 'npc', id: 'guide-mira' } : null; render(); } return; }
      if (act === 'sound') return command('sound', {});
      if (act === 'exit') return command('exit', {});
      if (act === 'rename') { const current = (snapshot.profile.collection || []).find(c => c.id === id); const name = global.prompt('새 이름을 입력하세요. (최대 16자)', current && current.nickname || ''); if (name && name.trim()) return command('rename', { creatureId: id, name: name.trim().slice(0, 16) }); return; }
      if (act === 'feed') return command('feed', { creatureId: id });
      if (act === 'evolve') return command('evolve', { creatureId: id });
      if (act === 'detail') { detailCreatureId = detailCreatureId === id ? null : id; render(); return; }
      if (act === 'team') { const old = snapshot.profile.team || []; const ids = old.includes(id) ? old.filter(x => x !== id) : old.length < 3 ? [...old, id] : [...old.slice(1), id]; return command('team', { ids }); }
      if (animationPlaying && ['battle-action','switch','return'].includes(act)) return;
      if (act === 'battle-action') return command('action', { battleId: snapshot.battle.id, turn: snapshot.battle.turn, action: { type: button.dataset.value } });
      if (act === 'open-switch') { const el = root.querySelector('.ix-switch-list'); el.hidden = !el.hidden; return; }
      if (act === 'switch') return command('action', { battleId: snapshot.battle.id, turn: snapshot.battle.turn, action: { type: 'switch', creatureId: id } });
      if (act === 'return') return command('return', {});
    });

    render();
    const clock = setInterval(() => {
      const label = root.querySelector('.ix-turn b');
      if (label && snapshot.battle) label.textContent = snapshot.battle.status === 'finished' ? '—' : remainingTime(snapshot.battle);
    }, 250);
    return {
      setState(next) { if (next && next.serverTime > lastServerStamp) { lastServerStamp = next.serverTime; serverOffset = next.serverTime - Date.now(); } snapshot = next || snapshot; if (!nameEdited && snapshot.profile?.adventurerName && explorerName !== snapshot.profile.adventurerName) { explorerName = snapshot.profile.adventurerName; if (!entered) render(); } if (!entered) { if (snapshot.you && typeof snapshot.you === 'object' && snapshot.you.inWorld) entered = true; else { const saved = snapshot.profile && snapshot.profile.characterId; if (!characterChosenHere && Data.characters.some(c => c.id === saved) && chosenCharacter !== saved) { chosenCharacter = saved; try { localStorage.setItem('insectExpedition.character.v1', saved); } catch (_) {} render(); } return; } } const nextSignature = signature(snapshot); if (nextSignature !== lastSignature) { lastSignature = nextSignature; render(); } },
      setSelection(next) { selection = next && next.id ? { type: next.type, id: next.id } : null; lastSignature = ''; if (entered) render(); },
      setAnimating(value) { animationPlaying = !!value; root.classList.toggle('is-animating', animationPlaying); },
      notify,
      dispose() { clearTimeout(toastTimer); clearInterval(clock); root.innerHTML = ''; root.classList.remove('ix-ui', 'is-busy'); }
    };
  }

  global.InsectUI = { create };
})(window);
