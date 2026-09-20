'use strict';
const Appearance = require('../shared/appearance.js');
const Regions = require('../shared/regions.js');
const Ecology=require('../shared/ecology.js'),EcologyServer=require('./ecology.cjs');

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');
const WebSocket = require('ws');
const Data = require('../shared/data.js');
const Battle = require('../shared/battle.cjs');
const Expedition = require('./expedition.cjs');
const Trials=require('./trials.cjs');
const H=require('../shared/housing.js'),Housing=require('./housing.cjs');
const { createStore } = require('./data-store.cjs');
const { createCloudStore } = require('./cloud-store.cjs');
const { createFirebaseAuthority, authorizeJoin, PUBLIC_ROOM_ID } = require('./auth.cjs');
const World = require('./world.cjs');

const MAX_ROOM_PLAYERS = 6;
const MAX_PUBLIC_PLAYERS = 100;
const COMMAND_LIMIT = 200;
const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.webmanifest', '.mp3', '.wav', '.ogg', '.woff', '.woff2', '.ttf', '.json']);
const BLOCKED_PARTS = new Set(['.git', '.aircodex', '.codex_bridge', 'private', 'server', 'tests', 'data', 'node_modules']);

function randomFloat() { return crypto.randomBytes(4).readUInt32BE(0) / 0x100000000; }
function nowMs() { return Date.now(); }
function cleanId(value, max = 80) { return String(value || '').trim().slice(0, max); }
function cleanName(value, max = 18) { return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max); }
function send(ws, value) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value)); }
function errorText(error) { return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'; }

function selectedTeam(profile) {
  const byId = new Map(profile.collection.map((item) => [item.id, item]));
  return profile.team.map((id) => byId.get(id)).filter(Boolean).filter((item) => {
    try { return (item.hp == null ? Battle.statsForCreature(item).maxHealth : item.hp) > 0; } catch { return false; }
  }).slice(0, Battle.MAX_TEAM);
}

function starterIds() { return Data.species.filter((item) => item.rarity === 'common').slice(0, 3).map((item) => item.id); }

function locationName(point) {
  return Data.biomes.reduce((best, biome) => World.distance(point, biome.center) < World.distance(point, best.center) ? biome : best, Data.biomes[0]).name;
}

function travelPoint(biome) {
  if (biome.safe) return { x: World.GUIDE.x, z: World.GUIDE.z + 3 };
  const offsets = [[0, -18], [18, 0], [-18, 0], [0, 18], [24, -12], [-24, 12]];
  for (const [x, z] of offsets) {
    const point = { x: biome.center.x + x, z: biome.center.z + z };
    if (Math.abs(point.x)<=Data.world.maxX-2 && Math.abs(point.z)<=Data.world.maxZ-2 && !World.pointBlocked(point)) return point;
  }
  return { x: biome.center.x, z: biome.center.z };
}

function publicProfile(profile) {
  return {
    ...profile,
    collection: profile.collection.map((creature) => {
      const stats = Battle.statsForCreature(creature);
      return { ...creature, hp: creature.hp == null ? stats.maxHealth : creature.hp, stats, combatPower: Battle.combatPower(creature) };
    })
  };
}

function progressQuest(profile, type) {
  const quest = profile.quest, definition = Data.quests.find(q => q.id === quest?.id);
  if (quest?.status !== 'active' || definition?.type !== type) return;
  quest.progress = Math.min(quest.target, quest.progress + 1);
  if (quest.progress >= quest.target) quest.status = 'ready';
}

function createRoom(id) {
  return { id, players: new Map(), spawns: EcologyServer.spawns(World.makeSpawns(Data.species, Data.biomes).map(Regions.spawnRecord)), resources: [...Data.resourceNodes.map(n => ({...Regions.resourceRecord(n),respawnAt:0})),...Data.biomes.flatMap(b=>Ecology.nodes(b.id)).filter(n=>!Regions.blocked(n.regionId,n,2))], challenges: new Map(), battles: new Map(), lastBroadcastAt: 0, broadcastTimer: null };
}

function publicPlayer(player) {
  return { uid: player.uid, nickname: player.nickname, x: player.x, z: player.z, character: player.character, appearance: player.profile.appearance, regionId:player.regionId||'safe',realm:player.realm||'',harvest:player.harvest||null, mount: player.mount || '', busy: Boolean(player.busy), stamina: Math.floor(player.stamina ?? 100), sprinting: !!player.sprinting };
}

function challengeList(room, uid) {
  return [...room.challenges.values()].filter((item) => item.from === uid || item.to === uid).map((item) => ({ ...item }));
}

function makeState(room, player, now = nowMs()) {
  let battle = null;
  if (player.battleId) {
    const record = room.battles.get(player.battleId);
    if (record) battle = Battle.publicBattle(record.state, record.sides.get(player.uid));
  }
  const homeOwner=player.realm?room.players.get(player.realm):null,home=homeOwner?.profile.housing;
  return {
    ecology:player.realm?null:EcologyServer.state(player,room,now),
    regionId:player.regionId||'safe',portals:[],
    worldId:room.id,worldName:room.id===PUBLIC_ROOM_ID?'이슬숲 공용 탐험':'이슬숲 탐험',
    onlineCount:[...room.players.values()].filter(p=>p.connected).length,
    regionPopulation:Object.fromEntries(Data.biomes.map(b=>[b.id,[...room.players.values()].filter(p=>p.connected&&!p.realm&&p.regionId===b.id).length])),
    realm:player.realm||'',home:homeOwner?{ownerUid:homeOwner.uid,name:homeOwner.nickname,...home}:null,
    neighbors:[...room.players.values()].filter(p=>p.connected&&p.profile.housing.plot).map(p=>({uid:p.uid,name:p.nickname})),
    type: 'state',
    you: player.uid,
    players: [...room.players.values()].filter((item) => item.connected && (item.realm||'')===(player.realm||'') && (!!player.realm || item.regionId===player.regionId)).map(publicPlayer),
    spawns: player.realm?[]:room.spawns.filter(n=>n.regionId===player.regionId).map(World.publicSpawn),
    resources: player.realm?[]:room.resources.filter(n=>n.regionId===player.regionId).map(n => ({...n,available:n.respawnAt<=now&&(!n.harvestBy||n.harvestUntil<now||n.harvestBy===player.uid)})),
    profile: publicProfile(player.profile),
    battle,
    challenges: challengeList(room, player.uid),
    serverTime: now,
    safeRadius: World.SAFE_RADIUS,
    locationName: player.realm?(homeOwner?.nickname||'탐험가')+'의 정원':Regions.get(player.regionId).name
  };
}

function createGameServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ noServer: true, maxPayload: 64 * 1024 });
  const root = options.staticRoot || path.resolve(__dirname, '..', '..');
  const authority = options.authority || createFirebaseAuthority();
  const store = options.store || (process.env.INSECT_PROFILE_BUCKET
    ? createCloudStore({ bucket: require('firebase-admin/storage').getStorage().bucket(process.env.INSECT_PROFILE_BUCKET), starterIds: starterIds() })
    : createStore({ dbPath: options.dbPath, starterIds: starterIds() }));
  const clock = options.now || nowMs;
  const rng = options.rng || randomFloat;
  const rooms = new Map();
  const sessions = new Map();
  const intervals = [];
  let queue = Promise.resolve();
  function serialize(task) { const next = queue.then(task); queue = next.catch(() => {}); return next; }

  app.disable('x-powered-by');
  app.get('/insect_expedition/api/health', (_req, res) => {
    res.json({ ok: true, release: '2026.09.20.16', storage: process.env.INSECT_PROFILE_BUCKET ? 'cloud' : 'local', now: clock(), rooms: rooms.size, online: [...rooms.values()].reduce((sum, room) => sum + [...room.players.values()].filter((p) => p.connected).length, 0) });
  });
  app.get('*path', (req, res, next) => {
    let requested;
    try { requested = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
    if (requested === '/') requested = '/index.html';
    if (requested.endsWith('/')) requested += 'index.html';
    const parts = requested.split('/').filter(Boolean);
    const ext = path.extname(parts.at(-1) || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || parts.some((part) => BLOCKED_PARTS.has(part.toLowerCase())) || /profiles(?:\.local)?\.json$/i.test(requested) || /package(?:-lock)?\.json$/i.test(requested)) return res.status(404).end();
    const absolute = path.resolve(root, `.${requested}`);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return res.status(404).end();
    fs.stat(absolute, (error, stat) => {
      if (error || !stat.isFile()) return next();
      res.sendFile(absolute);
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/insect_expedition/ws') return socket.destroy();
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  function roomFor(id) {
    if (!rooms.has(id)) rooms.set(id, createRoom(id));
    return rooms.get(id);
  }

  function broadcast(room) {
    if (room.broadcastTimer) { clearTimeout(room.broadcastTimer); room.broadcastTimer = null; }
    room.lastBroadcastAt = clock();
    room.spawns=room.spawns.filter(s=>!s.expiresAt||s.reservedBy||s.available&&s.expiresAt>clock());
    World.updateSpawns(room.spawns, clock());
    for (const player of room.players.values()) if (player.connected) send(player.ws, makeState(room, player, clock()));
  }

  function queueBroadcast(room) {
    const delay = Math.max(0, 100 - (clock() - room.lastBroadcastAt));
    if (!delay) return broadcast(room);
    if (!room.broadcastTimer) room.broadcastTimer = setTimeout(() => broadcast(room), delay);
  }

  function releaseSpawn(room, spawn, consumed) {
    spawn.reservedBy = null;
    if (consumed) {
      spawn.available = false;
      spawn.respawnAt = spawn.expiresAt ? 0 : clock() + (spawn.boss ? 300000 : spawn.field ? 45000 : 30000);
    }
  }

  function syncBattleHealth(profile, side) {
    const hp = new Map(side.team.map((item) => [item.id, item.hp]));
    profile.collection.forEach((item) => { if (hp.has(item.id)) item.hp = hp.get(item.id); });
  }

  function addCreature(profile, speciesId, level = 1, fromBattle = true) {
    if (profile.collection.length >= 120) throw new Error('곤충 보관함이 가득 찼습니다.');
    const creature = store.createCreature(speciesId, level, Data.speciesById[speciesId] && Data.speciesById[speciesId].name);
    creature.hp = Battle.statsForCreature(creature).maxHealth;
    profile.collection.push(creature);
    const isNew = !profile.discoveries.includes(speciesId);
    if (isNew) profile.discoveries.push(speciesId);
    if (fromBattle) progressQuest(profile, 'capture');
    return { creature, isNew };
  }

  async function completeBattle(room, record) {
    if (!record || record.state.status === 'active' || record.state.rewardProcessed) return;
    const result = record.state.result || {};
    for (const [uid, sideKey] of record.sides) {
      const player = room.players.get(uid);
      if (!player) continue;
      let nextProfile = JSON.parse(JSON.stringify(player.profile));
      if (!nextProfile.processedRewards.includes(record.state.id)) {
        nextProfile.processedRewards.push(record.state.id);
        nextProfile.processedRewards = nextProfile.processedRewards.slice(-100);
        if(record.state.trial){
          if(result.winner===sideKey&&result.reason==='defeat')Trials.award(nextProfile,record.state.trial.stage,result);
        }else if (record.state.type === 'field') {
          result.xpPerCreature = 0; result.totalXp = 0; result.levelUps = []; result.captureSummary = null; result.feeds = 0; result.gold = 0;
          if (result.winner === sideKey && ['defeat', 'capture'].includes(result.reason)) {
            progressQuest(nextProfile, 'victory');
            Expedition.advance(nextProfile,2);
            nextProfile.ecology.wins++;
            if(record.spawn?.boss){nextProfile.resources.essence=Math.min(9999,nextProfile.resources.essence+1);result.essence=1;}
            if(record.spawn?.boss&&!nextProfile.expedition.bosses.includes(record.spawn.id))nextProfile.expedition.bosses.push(record.spawn.id);
            const enemy = record.state.sides.b.team[0];
            const rank = Data.speciesById[enemy.speciesId].rarity;
            const rankIndex = Data.rarityOrder.indexOf(rank);
            const groupSize=record.state.sides.b.team.length;
            const xp = Math.round((24 + enemy.level * 5) * (record.spawn?.boss ? 1.6 : 1+(groupSize-1)*.35));
            result.xpPerCreature = xp;
            for (const { id } of record.state.sides[sideKey].team) {
              const index = nextProfile.collection.findIndex(item => item.id === id);
              if (index < 0) continue;
              const applied = Battle.applyXp(nextProfile.collection[index], xp);
              nextProfile.collection[index] = applied.creature;
              result.totalXp += applied.gained;
              if (applied.levels.length) result.levelUps.push({ creatureId: id, levels: applied.levels });
            }
            const earnedFeeds = 1 + Math.floor(rankIndex / 2) + (record.spawn?.boss ? 3 : 0);
            result.feeds = Math.min(earnedFeeds, 9999 - nextProfile.supplies.feeds);
            nextProfile.supplies.feeds += result.feeds;
            result.gold = Math.min(999999 - nextProfile.gold, (12 + enemy.level * 4 + rankIndex * 8) * (record.spawn?.boss ? 3 : groupSize));
            nextProfile.gold += result.gold;
            if (!record.state.victoryCaptures) {
              const team=record.state.sides[sideKey].team,healthScore=team.reduce((n,c)=>n+c.hp/c.maxHp,0)/team.length;
              const performanceBonus=healthScore*.08+(record.state.turn<=3?.04:0);
              record.state.victoryCaptures=record.state.sides.b.team.map(enemy=>{
                const rank=Data.speciesById[enemy.speciesId].rarity,chance=Math.min(.98,Data.rarity[rank].capture+performanceBonus+nextProfile.bonuses.collection+(nextProfile.ecology.charm?.05:0)+(record.spawn?.lured?.15:0));
                return {chance,performanceBonus,success:!Data.speciesById[enemy.speciesId].eggOnly&&(result.reason==='capture'||rng()<chance),speciesId:enemy.speciesId,level:Math.min(5,enemy.level)};
              });
            }
            result.captureSummaries=record.state.victoryCaptures.map(raw=>{
              const capture={source:'victory',...raw};
              if(capture.success&&nextProfile.collection.length>=120){capture.success=false;capture.failureReason='inventory-full';}
              if(capture.success){const added=addCreature(nextProfile,capture.speciesId,capture.level);capture.isNew=added.isNew;capture.creatureId=added.creature.id;}
              return capture;
            });
            result.captureSummary=result.captureSummaries.find(c=>c.success)||result.captureSummaries[0];
          }
        }
      }
      nextProfile = Battle.healProfile(nextProfile);
      nextProfile.interruptedBattle = null;
      player.profile = await store.save(nextProfile);
      player.busy = false;
    }
    result.recovered = true;
    if (record.spawn) releaseSpawn(room, record.spawn, result.winner === 'a' && result.reason === 'defeat');
    record.state.rewardProcessed = true;
  }

  async function createBattleRecord(room, type, aPlayer, bPlayerOrSpawn) {
    const id = crypto.randomUUID();
    let b;
    const sides = new Map([[aPlayer.uid, 'a']]);
    let spawn = null;
    if (type === 'field') {
      spawn = bPlayerOrSpawn;
      const species = Data.speciesById[spawn.speciesId];
      b = { uid: `field:${spawn.id}`, name: species.name, team: (spawn.members || [{speciesId:spawn.speciesId,level:spawn.level}]).map((m,i)=>({id:`field:${spawn.id}:${i}`,speciesId:m.speciesId,nickname:spawn.bossName || Data.speciesById[m.speciesId].name,level:m.level,xp:0,hp:null})) };
    } else {
      const opponent = bPlayerOrSpawn;
      b = { uid: opponent.uid, name: opponent.nickname, team: selectedTeam(opponent.profile) };
      sides.set(opponent.uid, 'b');
    }
    const state = Battle.createBattle({ id, type, a: { uid: aPlayer.uid, name: aPlayer.nickname, team: selectedTeam(aPlayer.profile) }, b, now: clock() });
    state.boss = !!spawn?.boss;
    if(spawn?.trial)Trials.prepare(state,spawn.trial);
    state.biomeId = aPlayer.regionId || spawn?.biomeId || Data.biomes.reduce((best,b)=>World.distance(aPlayer,b.center)<World.distance(aPlayer,best.center)?b:best,Data.biomes[0]).id;
    for(const side of ['a','b'])state.sides[side].auto=true;
    const record = { id, state, sides, spawn, nextAutoAt:clock()+1200, origins: new Map(), finishedAt: 0 };
    for (const uid of sides.keys()) {
      const player = room.players.get(uid);
      record.origins.set(uid, { x: player.x, z: player.z });
      World.updateStamina(player, clock()); player.moveActive = false;
      const nextProfile=await store.save({...player.profile,interruptedBattle:{roomId:room.id,battleId:id,at:clock()}});
      player.busy=true;player.battleId=id;player.profile=nextProfile;
    }
    room.battles.set(id, record);
    return record;
  }

  function rate(player, key, minimum) {
    const current = clock();
    const previous = player.rates.get(key) || 0;
    if (current - previous < minimum) throw new Error('요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.');
    player.rates.set(key, current);
  }

  async function execute(room, player, name, payload = {}) {
    if (player.battleId && !['action', 'return', 'auto-battle'].includes(name)) throw new Error('전투 결과에서 돌아가기를 눌러 탐험을 계속해 주세요.');
    if(player.harvest&&!['move','gather','gather-cancel'].includes(name))throw Error('자재 채집을 마치거나 취소한 뒤 이용해 주세요.');
    if(player.realm&&!['move','travel','home-travel','land-claim','house-place','house-remove','house-door','character','appearance','sell-resource','sell-materials','rename','feed','team','team-slot','dex-seen','dex-claim','incubate','hatch','research-claim','heal','fuse','evolve'].includes(name))throw Error('탐험지로 돌아간 뒤 이용해 주세요.');
    if(name==='trial-start'){
      rate(player,'trial',1200);const stage=Number(payload.stage),team=selectedTeam(player.profile);
      if(!Number.isInteger(stage)||stage<1||stage>24||stage>player.profile.trials.cleared+1)throw Error('앞 단계를 돌파하면 다음 시련이 열려요.');
      if(team.length!==3)throw Error('동료 3마리를 팀에 편성한 뒤 시련에 도전하세요.');
      const spawn=Trials.spawn(stage);spawn.x=player.x;spawn.z=player.z;
      return {battleId:(await createBattleRecord(room,'field',player,spawn)).id};
    }
    if(['rune-upgrade','legacy-research'].includes(name)){rate(player,'specialize',500);return Trials.command(player,name,payload,store);}
    if(['craft','lure','explore-event','ecology-claim','nectar'].includes(name)){
      rate(player,'ecology',500);
      return EcologyServer.command({room,player,name,payload,now:clock(),store,rng});
    }
    if(name==='home-travel'){

      rate(player,'home-travel',600);
      const destination=String(payload.destination||'home');
      if(destination==='home'){
        const owner=room.players.get(String(payload.ownerUid||player.uid));
        if(!owner||(owner.uid!==player.uid&&(!owner.connected||!owner.profile.housing.plot)))throw Error('같은 방에 접속한 친구의 집만 방문할 수 있어요.');
        player.realm=owner.uid;const plot=owner.profile.housing.plot,site=plot&&H.sites.find(s=>s.id===plot.siteId);player.x=site?site.x:0;player.z=site?site.z-H.deeds[plot.size].depth*H.cell/2-4:-20;
      }else{
        const camp=Data.constructionCamps.find(c=>c.id===destination);
        if(destination!=='field'&&!camp)throw Error('이동할 장소를 선택해 주세요.');
        player.realm='';player.regionId=camp?camp.id:'safe';const entrance=Regions.spawn(player.regionId);player.x=entrance.x;player.z=entrance.z;player.profile.regionId=player.regionId;player.profile.location={...entrance};player.profile=await store.save(player.profile);
      }
      player.moveActive=false;player.mount=player.realm?'':player.profile.mounts.equipped||'';player.lastMoveAt=clock();
      room.challenges.forEach((c,id)=>{if(c.from===player.uid||c.to===player.uid)room.challenges.delete(id);});
      return {message:destination==='home'?'정원에 도착했어요.':destination==='field'?'마을로 돌아왔어요.':Data.constructionCamps.find(c=>c.id===destination).name+'에 도착했어요. 가까운 채집물을 선택하세요.'};
    }
    if(['land-claim','house-place','house-remove'].includes(name)){
      rate(player,'housing',250);
      if(player.realm!==player.uid)throw Error('내 정원에서만 토지를 계약하거나 건축할 수 있어요.');
      const next=JSON.parse(JSON.stringify(player.profile));let result;
      if(name==='land-claim')result=Housing.claim(next,payload);
      if(name==='house-place')result=Housing.place(next,payload,[...room.players.values()].filter(p=>p.realm===player.realm));
      if(name==='house-remove')result=Housing.remove(next,String(payload.pieceId));
      player.profile=await store.save(next);if(name==='land-claim'){const plot=next.housing.plot,site=H.sites.find(s=>s.id===plot.siteId);player.x=site.x;player.z=site.z-H.deeds[plot.size].depth*H.cell/2-4;}return result;
    }
    if(name==='house-door'){
      rate(player,'door',300);
      const owner=room.players.get(player.realm),piece=owner?.profile.housing.pieces.find(p=>p.id===payload.pieceId&&p.kind==='door');
      if(!piece)throw Error('사용할 문을 선택해 주세요.');
      const pos=H.point(owner.profile.housing.plot,piece);if(World.distance(player,pos)>5)throw Error('문 가까이 다가가 주세요.');
      const next=JSON.parse(JSON.stringify(owner.profile)),door=next.housing.pieces.find(p=>p.id===piece.id);door.open=!door.open;
      if(!door.open&&[...room.players.values()].filter(p=>p.realm===player.realm).some(p=>H.blocked({plot:next.housing.plot,pieces:[door]},p,.6)))throw Error('문 앞에 사람이 있어 닫을 수 없어요.');
      owner.profile=await store.save(next);return {message:door.open?'문을 열었어요. 안으로 들어가세요!':'문을 닫았어요.'};
    }
    if(name==='gather-start'){
      rate(player,'gather-start',400);
      const node=room.resources.find(n=>n.id===payload.nodeId);
      if(!node||node.regionId!==player.regionId||!Data.resources[node.kind]?.construction||node.respawnAt>clock()||(node.harvestBy&&node.harvestUntil>clock()))throw Error('지금은 채집할 수 없는 자재입니다.');
      if(World.distance(player,node)>4||World.segmentBlocked(player,node))throw Error('채집물 가까이 다가가 주세요.');
      player.harvest={nodeId:node.id,kind:node.kind,startedAt:clock(),finishAt:clock()+2400,resumeSprint:!!player.sprinting};player.moveActive=false;player.sprinting=false;player.mount='';
      node.harvestBy=player.uid;node.harvestUntil=clock()+15000;return {...player.harvest};
    }
    if(name==='gather-cancel'){
      const node=room.resources.find(n=>n.id===player.harvest?.nodeId);if(node?.harvestBy===player.uid){node.harvestBy=null;node.harvestUntil=0;}player.mount=player.profile.mounts.equipped||'';player.sprinting=!!player.harvest?.resumeSprint;player.harvest=null;return {message:'채집을 취소했어요.'};
    }
    if (name === 'auto-battle') {
      const record=room.battles.get(player.battleId),side=record?.sides.get(player.uid);
      if(!record||!side||record.state.status!=='active')throw new Error('진행 중인 전투가 없습니다.');
      record.state.sides[side].auto=payload.enabled===true;
      if(payload.enabled)record.nextAutoAt=Math.max(record.nextAutoAt||0,clock()+1200);
      return {enabled:record.state.sides[side].auto,message:payload.enabled?'자동 전투를 시작합니다.':'자동 전투를 멈췄어요. 행동을 직접 고를 수 있습니다.'};
    }
    if (name === 'mount') {
      const id=String(payload.id||'');
      if(id&&(!Data.mounts[id]||!player.profile.mounts.owned.includes(id)))throw new Error('상점에서 먼저 구매한 탈것만 탈 수 있어요.');
      const next=JSON.parse(JSON.stringify(player.profile));next.mounts.equipped=id;player.profile=await store.save(next);
      player.mount=id;player.sprinting=false;
      return {id,message:id?Data.mounts[id].name+' 탑승! 스태미나 없이 이동합니다.':'탈것에서 내렸어요.'};
    }
    if (name === 'move') {
      rate(player, 'move', 25);
      if (player.busy) throw new Error('전투 중에는 월드에서 이동할 수 없습니다.');
      const before={x:player.x,z:player.z};
      if(player.harvest)return {x:player.x,z:player.z,changed:false};
      let changed;
      if(player.realm){
        const elapsed=Math.max(.016,Math.min(.25,(clock()-(player.lastMoveAt||clock()-50))/1000));player.lastMoveAt=clock();
        const ix=Math.max(-1,Math.min(1,Number(payload.x)||0)),iz=Math.max(-1,Math.min(1,Number(payload.z)||0)),length=Math.max(1,Math.hypot(ix,iz));
        const point={x:Math.max(-45,Math.min(45,player.x+ix/length*7*elapsed)),z:Math.max(-35,Math.min(46,player.z+iz/length*7*elapsed))};
        const house=room.players.get(player.realm)?.profile.housing;
        changed=!H.segmentBlocked(house,player,point)&&(point.x!==player.x||point.z!==player.z);
        if(changed){player.x=point.x;player.z=point.z;}
      }else changed = World.movePlayer(player, payload, clock());
      if(changed){player.profile.expedition.walk+=World.distance(before,player);while(player.profile.expedition.walk>=80){player.profile.expedition.walk-=80;Expedition.advance(player.profile,1);}}
      if(!player.realm)player.profile.location = { x: player.x, z: player.z };
      return { x: player.x, z: player.z, changed };
    }
    if (name === 'gather') {
      rate(player, 'gather', 600);
      const node = room.resources.find(n => n.id === payload.nodeId);
      if (!node || node.regionId!==player.regionId || node.respawnAt > clock()) throw new Error('아직 다시 채집할 수 없어요. 다른 채집물을 찾아보세요.');
      if (World.distance(player,node)>4 || World.segmentBlocked(player,node)) throw new Error('채집물 가까이 다가가 주세요.');
      if (player.profile.resources[node.kind]>=9999) throw new Error('상점에서 재료를 판매한 뒤 채집해 주세요.');
      const building=Data.resources[node.kind].construction;
      if(building&&(!player.harvest||player.harvest.nodeId!==node.id||clock()<player.harvest.finishAt||node.harvestBy!==player.uid||clock()>node.harvestUntil))throw Error('벌목·채광 동작을 마친 뒤 자재를 받을 수 있어요.');
      const amount=building?(node.kind==='sand'?3:4):1;
      if(player.profile.resources[node.kind]+amount>9999)throw Error('가방의 자재를 사용한 뒤 채집해 주세요.');
      const next = JSON.parse(JSON.stringify(player.profile));
      const reward=building?{kind:node.kind,amount,gold:0,message:Data.resources[node.kind].name+' '+amount+'개를 가방에 넣었어요!'}:Expedition.gather(next,node,rng);
      if(building){next.resources[node.kind]+=amount;Expedition.advance(next,1);}
      next.ecology.gathered++;
      player.profile = await store.save(next);
      player.mount=player.profile.mounts.equipped||'';player.sprinting=player.harvest?!!player.harvest.resumeSprint:player.sprinting;
      player.harvest=null;node.harvestBy=null;node.harvestUntil=0;
      node.respawnAt = clock()+(building?15000:node.kind==='egg'?180000:node.kind==='crystal'?60000:30000);
      return reward;
    }
    if(['incubate','hatch','research-claim'].includes(name)) {
      rate(player,'manage',400);
      const next=JSON.parse(JSON.stringify(player.profile));let result;
      if(name==='incubate')result=Expedition.incubate(next,String(payload.eggId));
      if(name==='research-claim')result=Expedition.claimResearch(next,String(payload.id));
      if(name==='hatch'){
        const egg=next.expedition.eggs.find(e=>e.id===String(payload.eggId));
        if(!egg||!egg.incubating||egg.progress<Data.eggKinds[egg.kind].steps)throw Error('탐험을 더 진행하면 알이 깨어나요.');
        const added=addCreature(next,Data.eggKinds[egg.kind].speciesId,1,false);
        next.expedition.eggs=next.expedition.eggs.filter(e=>e.id!==egg.id);next.expedition.hatched++;
        result={...added,message:added.creature.nickname+' 부화 성공!'};
      }
      player.profile=await store.save(next);return result;
    }
    if (name === 'buy') {
      rate(player, 'shop', 400);
      const item = Data.shop.find(i => i.id === payload.itemId);
      if (!item) throw new Error('판매하지 않는 상품입니다.');
      if (player.profile.gold < item.price) throw new Error('골드가 부족해요. 전투 승리와 재료 판매로 모아 보세요.');
      const next = JSON.parse(JSON.stringify(player.profile));
      if (item.feeds && next.supplies.feeds + item.feeds > 9999) throw new Error('사료를 사용한 뒤 구입해 주세요.');
      const captured = item.speciesId ? addCreature(next,item.speciesId,item.level,false) : null;
      if (item.feeds) next.supplies.feeds += item.feeds;
      if(item.deed){if(next.housing.plot||Object.values(next.bag.deeds).some(n=>n>0))throw Error('이미 토지나 땅문서를 보유하고 있어요. 가방을 확인해 주세요.');next.bag.deeds[item.deed]++;}
      if(item.mountId){if(next.mounts.owned.includes(item.mountId))throw new Error('이미 보유한 탈것입니다.');next.mounts.owned.push(item.mountId);}
      next.gold -= item.price;
      player.profile = await store.save(next);
      return {itemId:item.id,creature:captured?.creature,isNew:captured?.isNew,message:captured ? Data.speciesById[item.speciesId].name+' 부화! 팀 편성에서 배치하세요.' : item.name+(item.mountId?' 구입 완료! 상점에서 탑승할 수 있어요.':item.deed?' 구입 완료! 가방에서 땅문서를 사용하세요.':' 구입 완료! 성장 메뉴에서 사용할 수 있어요.')};
    }
    if(name==='sell-resource'){
      rate(player,'manage',300);const kind=String(payload.kind),item=Data.resources[kind],owned=player.profile.resources[kind]||0,count=payload.count==='all'?owned:Number(payload.count);
      if(!item||!item.sell||!Number.isSafeInteger(count)||count<1||count>owned)throw Error('판매할 재료와 수량을 확인해 주세요.');
      const value=item.sell*count;if(player.profile.gold+value>999999)throw Error('골드를 사용한 뒤 판매해 주세요.');
      const next={...player.profile,resources:{...player.profile.resources,[kind]:owned-count},gold:player.profile.gold+value};player.profile=await store.save(next);
      return {gold:value,message:item.name+' '+count+'개 판매 · 골드 +'+value};
    }
    if (name === 'sell-materials') {
      rate(player, 'shop', 400);
      const next = JSON.parse(JSON.stringify(player.profile));
      const value = Object.entries(Data.resources).reduce((n,[id,item])=>n+(item.construction?0:next.resources[id]*item.sell),0);
      if (!value) throw new Error('팔 수 있는 채집 재료가 없어요.');
      if (next.gold+value>999999) throw new Error('골드를 사용한 뒤 재료를 판매해 주세요.');
      next.gold += value; Object.keys(Data.resources).forEach(id=>{if(Data.resources[id].sell>0&&!Data.resources[id].construction)next.resources[id]=0;});
      player.profile = await store.save(next);
      return {gold:value,message:'채집 재료 판매 완료! 골드 +'+value};
    }
    if (name === 'sprint') {
      rate(player, 'sprint', 200);
      World.updateStamina(player, clock());
      const enabled = payload.enabled === true;
      if(enabled&&player.mount)throw new Error('탈것은 스태미나 없이 빠르게 이동해요.');
      if (enabled && player.stamina < 15) throw new Error('스태미나가 15 이상 회복되면 다시 달릴 수 있어요.');
      player.sprinting = enabled;
      return { enabled, stamina: Math.floor(player.stamina) };
    }
    if (name === 'dex-seen') {
      const ids = Array.isArray(payload.ids) ? payload.ids : [];
      const next = JSON.parse(JSON.stringify(player.profile));
      next.encyclopedia.seen = [...new Set([...next.encyclopedia.seen, ...ids.filter(id => next.discoveries.includes(id))])];
      player.profile = await store.save(next);
      return { seen: next.encyclopedia.seen };
    }
    if (name === 'dex-claim') {
      rate(player, 'dex-claim', 400);
      const next = JSON.parse(JSON.stringify(player.profile));
      const pending = next.discoveries.filter(id => !next.encyclopedia.claimed.includes(id));
      const milestones = Data.collectionMilestones.filter(m => next.discoveries.length >= m.count && !next.encyclopedia.milestones.includes(m.count));
      const earned = pending.reduce((n, id) => n + Data.rarity[Data.speciesById[id].rarity].reward, 0) + milestones.reduce((n, m) => n + m.feeds, 0);
      if (!earned) return { feeds: 0, message: '받을 도감 보상을 모두 받았어요.' };
      if (next.supplies.feeds + earned > 9999) throw new Error('사료를 사용한 뒤 도감 보상을 받아 주세요.');
      next.supplies.feeds += earned;
      next.encyclopedia.claimed.push(...pending);
      next.encyclopedia.milestones.push(...milestones.map(m => m.count));
      player.profile = await store.save(next);
      return { feeds: earned, message: '도감 수집 보상! 곤충 사료 ' + earned + '개를 받았어요.' };
    }
    if (name === 'character') {
      rate(player, 'manage', 300);
      if (player.profile.characterCreated) throw new Error('이미 만든 캐릭터와 이름은 변경할 수 없어요. 꾸미기 메뉴를 이용해 주세요.');
      const id = cleanId(payload.id, 40);
      if (!Data.characters.some((item) => item.id === id)) throw new Error('선택할 수 없는 캐릭터입니다.');
      if (typeof payload.name !== 'string' || !/^[가-힣]{1,6}$/.test(payload.name)) throw new Error('탐험가 이름은 한글 1~6자로 지어 주세요.');
      if (payload.appearance !== undefined && !Appearance.valid(payload.appearance)) throw new Error('꾸미기 항목을 다시 확인해 주세요.');
      const next = {...player.profile, adventurerName:payload.name, characterId:id, characterCreated:true, appearance:Appearance.normalize(payload.appearance,id)};
      player.profile = await store.save(next);
      player.nickname = player.profile.adventurerName;
      player.character = player.profile.characterId;
      return { id };
    }
    if (name === 'appearance') {
      rate(player, 'manage', 300);
      if (!player.profile.characterCreated) throw new Error('먼저 캐릭터와 이름을 만들어 주세요.');
      if (!Appearance.valid(payload.appearance)) throw new Error('꾸미기 항목을 다시 확인해 주세요.');
      if (payload.appearance.body !== player.profile.appearance.body) throw new Error('처음 만든 캐릭터는 유지됩니다. 헤어와 의상을 꾸며 주세요.');
      const next = {...player.profile, appearance:Appearance.normalize(payload.appearance)};
      player.profile = await store.save(next);
      return {appearance:player.profile.appearance,message:'새로운 스타일을 저장했어요!'};
    }
    if (name === 'team') {
      rate(player, 'manage', 300);
      if (player.busy) throw new Error('전투 중에는 팀을 바꿀 수 없습니다.');
      const ids = Array.isArray(payload.ids) ? payload.ids.map(String) : [];
      if (ids.length < 1 || ids.length > Battle.MAX_TEAM || new Set(ids).size !== ids.length) throw new Error('팀은 서로 다른 곤충 1~3마리로 구성해야 합니다.');
      const owned = new Map(player.profile.collection.map((item) => [item.id, item]));
      if (ids.some((id) => !owned.has(id))) throw new Error('보유하지 않은 곤충이 포함되어 있습니다.');
      if (ids.some((id) => (owned.get(id).hp == null ? Battle.statsForCreature(owned.get(id)).maxHealth : owned.get(id).hp) <= 0)) throw new Error('쓰러진 곤충은 팀에 넣을 수 없습니다.');
      player.profile.team = ids;
      player.profile = await store.save(player.profile);
      return { ids };
    }
    if (name === 'rename') {
      rate(player, 'manage', 300);
      if (player.busy) throw new Error('전투 중에는 이름을 바꿀 수 없습니다.');
      const creature = player.profile.collection.find((item) => item.id === String(payload.creatureId));
      const nickname = cleanName(payload.name);
      if (!creature || !nickname) throw new Error('이름을 바꿀 곤충과 새 이름을 확인해 주세요.');
      creature.nickname = nickname;
      player.profile = await store.save(player.profile);
      return { creatureId: creature.id, name: nickname };
    }
    if (name === 'heal') {
      if (player.busy) throw new Error('전투 중에는 치료할 수 없습니다.');
      const safe = World.inSafeZone(player);
      rate(player, 'heal', 1000);
      player.profile = await store.save(Battle.healProfile(player.profile));
      return { heals: player.profile.supplies.heals, safeCamp: safe, message: '모든 곤충이 회복됐어요. 다시 도전해 보세요!' };
    }
    if (name === 'fuse') {
      rate(player, 'manage', 400);
      const next = JSON.parse(JSON.stringify(player.profile));
      const base = next.collection.find(c => c.id === String(payload.creatureId));
      const recipe = base && Data.fusionRecipes[base.speciesId];
      if (!recipe) throw new Error('다음 단계 조합이 없는 곤충입니다.');
      const ids = payload.materialIds;
      if (!Array.isArray(ids) || ids.length !== 2 || new Set(ids).size !== 2 || ids.includes(base.id)) throw new Error('서로 다른 재료 곤충 2마리를 선택해 주세요.');
      const materials = ids.map(id => next.collection.find(c => c.id === id));
      if (materials.some(c => !c || c.speciesId !== base.speciesId || next.team.includes(c.id))) throw new Error('같은 종류이며 팀에 편성되지 않은 곤충만 재료로 쓸 수 있어요.');
      if (next.gold < recipe.gold) throw new Error('조합에 필요한 골드가 부족해요.');
      base.speciesId = recipe.result; base.nickname = Data.speciesById[recipe.result].name;
      base.hp = Battle.statsForCreature(base).maxHealth;
      next.collection = next.collection.filter(c => !ids.includes(c.id));
      next.gold -= recipe.gold;
      if (!next.discoveries.includes(base.speciesId)) next.discoveries.push(base.speciesId);
      player.profile = await store.save(next);
      return {creature:base,message:base.nickname+' 조합 성공! 기준 곤충의 레벨과 팀 배치를 유지했어요.'};
    }
    if (name === 'evolve') {
      if (player.busy) throw new Error('전투 중에는 성장시킬 수 없습니다.');
      const index = player.profile.collection.findIndex((item) => item.id === String(payload.creatureId));
      if (index < 0) throw new Error('보유하지 않은 곤충입니다.');
      player.profile.collection[index] = Battle.evolveCreature(player.profile.collection[index]);
      if (!player.profile.discoveries.includes(player.profile.collection[index].speciesId)) player.profile.discoveries.push(player.profile.collection[index].speciesId);
      player.profile = await store.save(player.profile);
      return { creature: player.profile.collection[index], message: `${Data.speciesById[player.profile.collection[index].speciesId].name} 진화! 공격과 능력치가 새롭게 바뀌었어요.` };
    }
    if (name === 'quest') {
      rate(player, 'quest', 500);
      const quest = player.profile.quest;
      if (quest.status === 'available' || quest.status === 'complete') {
        const definition = Data.quests[(quest.completed || 0) % Data.quests.length];
        Object.assign(quest, {id:definition.id,status:'active',progress:0,target:definition.target});
        player.profile = await store.save(player.profile);
        return { quest, message: definition.name + ' 수락! ' + definition.description + ' · 보상 사료 ' + definition.feeds + '개' };
      }
      const definition = Data.quests.find(q => q.id === quest.id) || Data.quests[0];
      if (quest.status === 'active') return {quest,message:definition.description + ' (' + quest.progress + '/' + quest.target + ')'};
      quest.status = 'complete'; quest.completed = (quest.completed || 0) + 1;
      player.profile.supplies.feeds = Math.min(9999, player.profile.supplies.feeds + definition.feeds);
      player.profile = await store.save(player.profile);
      return {quest,feeds:player.profile.supplies.feeds,message:'의뢰 완료! 사료 ' + definition.feeds + '개를 받았어요. 퀘스트 버튼에서 다음 의뢰를 받아 보세요.'};
    }
    if (name === 'feed') {
      rate(player, 'manage', 400);
      if (player.busy) throw new Error('전투 중에는 사료를 줄 수 없습니다.');
      if ((player.profile.supplies.feeds || 0) < 1) throw new Error('곤충 사료가 없습니다. 전투 승리나 도감 보상으로 사료를 모아 보세요.');
      const index = player.profile.collection.findIndex((item) => item.id === String(payload.creatureId));
      if (index < 0) throw new Error('보유하지 않은 곤충입니다.');
      if (player.profile.collection[index].level >= 50) throw new Error('이미 최고 레벨에 도달한 곤충입니다.');
      if(![undefined,1,10,'all'].includes(payload.count))throw Error('사료는 1개, 10개, 모두 사용 중 선택해 주세요.');
      const next=JSON.parse(JSON.stringify(player.profile)),source=next.collection[index];
      let needed=-source.xp;for(let level=source.level;level<50;level++)needed+=Battle.xpForLevel(level);
      const count=Math.min(payload.count==='all'?next.supplies.feeds:payload.count||1,next.supplies.feeds,Math.max(1,Math.ceil(needed/84)));
      const applied=Battle.applyXp(source,84*count);next.collection[index]=applied.creature;next.supplies.feeds-=count;
      for(let n=0;n<count;n++)progressQuest(next,'feed');
      player.profile=await store.save(next);
      return {creature:applied.creature,levels:applied.levels,used:count,message:'사료 '+count+'개 사용 · Lv.'+applied.creature.level+' · 경험치 +'+(84*count)};
    }
    if (name === 'portal' || name === 'travel') {
      rate(player,'travel',900);
      // Legacy clients may still send a portal command; current clients use the map.
      const targetId=name==='portal'?Regions.portals(player.regionId).find(p=>p.id===payload.portalId)?.to:payload.biomeId;
      const target=Data.biomes.find(b=>b.id===targetId);
      if(!target)throw Error('지도에서 이동할 지역을 선택해 주세요.');
      if(!player.realm&&target.id===player.regionId)return {regionId:target.id,message:'이미 이 지역에 있어요.'};
      const point=Regions.spawn(target.id),next={...player.profile,regionId:target.id,location:{...point}};
      player.profile=await store.save(next);player.realm='';player.regionId=target.id;player.x=point.x;player.z=point.z;player.lastMoveAt=clock();player.moveActive=false;player.mount=player.profile.mounts.equipped||'';
      room.challenges.forEach((item,id)=>{if(item.from===player.uid||item.to===player.uid)room.challenges.delete(id);});
      return {regionId:target.id,message:target.name+'에 도착했어요.'};
    }
    if (name === 'encounter' || name === 'collect') {
      rate(player, 'interact', 800);
      if (player.busy || !selectedTeam(player.profile).length) throw new Error('전투 가능한 팀이 필요합니다.');
      const spawn = room.spawns.find((item) => item.id === String(payload.spawnId));
      if (!spawn || spawn.regionId!==player.regionId || !spawn.available || spawn.reservedBy) throw new Error('이미 다른 탐험대가 상대 중이거나 사라진 몬스터입니다.');
      if (World.distance(player, spawn) > 7 || World.segmentBlocked(player, spawn)) throw new Error('몬스터까지 안전한 접근 경로가 없습니다.');
      if(spawn.id==='boss-sanctum'&&(player.profile.expedition.bosses.filter(id=>id!=='boss-sanctum').length<4||player.profile.expedition.hatched<2))throw Error('지역 보스 4종 연구와 동굴 알 부화 2회를 마치면 도전할 수 있어요.');
      spawn.reservedBy = player.uid;
      const gap = Math.max(0.001, World.distance(player, spawn));
      const approach = { regionId:player.regionId, x: spawn.x + (player.x - spawn.x) * 3 / gap, z: spawn.z + (player.z - spawn.z) * 3 / gap };
      if (!World.pointBlocked(approach)) { player.x = approach.x; player.z = approach.z; }
      try { return { battleId: (await createBattleRecord(room, 'field', player, spawn)).id }; }
      catch (error) { releaseSpawn(room, spawn, false); throw error; }
    }
    if (name === 'challenge') {
      rate(player, 'challenge', 5000);
      const target = room.players.get(String(payload.targetUid));
      if (!target || !target.connected || target.uid === player.uid) throw new Error('대전 상대를 찾을 수 없습니다.');
      if (player.realm || target.realm || player.regionId!==target.regionId || player.busy || target.busy || target.battleId || World.inSafeZone(player) || World.inSafeZone(target)) throw new Error('현재 위치에서는 대전을 신청할 수 없습니다.');
      if (World.distance(player,target)>10 || World.segmentBlocked(player,target)) throw new Error('상대 탐험가 10m 이내로 다가가 주세요.');
      if (!selectedTeam(player.profile).length || !selectedTeam(target.profile).length) throw new Error('양쪽 모두 전투 가능한 팀이 필요합니다.');
      const item = { id: crypto.randomUUID(), from: player.uid, to: target.uid, createdAt: clock(), expiresAt: clock() + 15000 };
      room.challenges.set(item.id, item);
      return { requestId: item.id, expiresAt: item.expiresAt };
    }
    if (name === 'respond') {
      const item = room.challenges.get(String(payload.requestId));
      if (!item || item.to !== player.uid || item.expiresAt <= clock()) throw new Error('대전 신청이 만료되었거나 존재하지 않습니다.');
      room.challenges.delete(item.id);
      if (!payload.accept) return { accepted: false };
      const challenger = room.players.get(item.from);
      if (player.realm || challenger?.realm || player.regionId!==challenger?.regionId || !challenger || !challenger.connected || challenger.busy || challenger.battleId || player.busy || World.inSafeZone(challenger) || World.inSafeZone(player)) throw new Error('대전을 시작할 수 없는 상태입니다.');
      if (World.distance(player,challenger)>10 || World.segmentBlocked(player,challenger)) throw new Error('상대가 멀어졌어요. 가까이에서 다시 신청해 주세요.');
      return { accepted: true, battleId: (await createBattleRecord(room, 'pvp', challenger, player)).id };
    }
    if (name === 'action') {
      rate(player, 'action', 250);
      const record = room.battles.get(String(payload.battleId));
      const side = record && record.sides.get(player.uid);
      if (!record || !side || player.battleId !== record.id || Number(payload.turn) !== record.state.turn) throw new Error('현재 전투 턴과 맞지 않는 명령입니다.');
      const action = payload.action && typeof payload.action === 'object' ? payload.action : { type: payload.action, creatureId: payload.creatureId };
      if (action.type === 'capture' && player.profile.collection.length >= 120) throw new Error('곤충 보관함이 가득 찼습니다.');
      if(action.type==='tonic'&&(player.profile.resources.tonic||0)<1)throw Error('제작한 버섯 회복제가 없어요.');
      const outcome = Battle.submitAction(record.state, side, action, { now: clock(), rng });
      if(action.type==='tonic'){const next=structuredClone(player.profile);next.resources.tonic--;player.profile=await store.save(next);}
      record.state = outcome.state;
      if(outcome.resolved)record.nextAutoAt=clock()+3500;
      if (record.state.status !== 'active') { record.finishedAt = clock(); await completeBattle(room, record); }
      return { resolved: outcome.resolved, events: outcome.events, result: outcome.result };
    }
    if (name === 'return') {
      const record = room.battles.get(String(payload.battleId || player.battleId));
      if (!record || !record.sides.has(player.uid) || record.state.status === 'active') throw new Error('아직 돌아갈 수 없습니다.');
      if (!record.state.rewardProcessed) { await completeBattle(room, record); }
      if (!record.state.rewardProcessed) throw new Error('보상을 저장하고 있습니다. 잠시 후 다시 시도해 주세요.');
      const origin = record.origins.get(player.uid) || player.profile.location || { x: 0, z: 22 };
      player.x = origin.x; player.z = origin.z; player.busy = false; player.battleId = null;
      if(!player.realm)player.profile.location = { x: player.x, z: player.z };
      player.profile = await store.save(player.profile);
      return { x: player.x, z: player.z };
    }
    throw new Error('지원하지 않는 명령입니다.');
  }

  wss.on('connection', (ws) => {
    let player = null;
    let room = null;
    ws.on('error', () => { /* 프로토콜 오류와 과대 메시지는 ws가 연결 종료로 처리한다. */ });
    const joinTimer = setTimeout(() => { if (!player) ws.close(4001, 'join required'); }, 8000);
    ws.on('message', (raw) => { serialize(async () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      let message;
      try { message = JSON.parse(raw.toString('utf8')); } catch { return send(ws, { type: 'error', error: 'JSON 형식이 올바르지 않습니다.' }); }
      if (!player) {
        if (!message || message.type !== 'join') return send(ws, { type: 'error', error: '먼저 참가 인증이 필요합니다.' });
        try {
          const joined = await authorizeJoin(authority, message.token, cleanId(message.roomId));
          const roomId = cleanId(message.roomId);
          const owned = sessions.get(joined.uid);
          if (owned && owned.room.id !== roomId) {
            const activeBattle = owned.player.battleId && owned.room.battles.get(owned.player.battleId);
            if (owned.player.connected || owned.player.busy || (activeBattle && activeBattle.state.status === 'active')) throw new Error('이 계정은 다른 탐사 방에서 활동 중입니다.');
            owned.room.challenges.forEach((item, id) => { if (item.from === joined.uid || item.to === joined.uid) owned.room.challenges.delete(id); });
            owned.room.players.delete(joined.uid);
            sessions.delete(joined.uid);
          }
          room = roomFor(roomId);
          const existing = room.players.get(joined.uid);
          const connectedCount = [...room.players.values()].filter((item) => item.connected && item.uid !== joined.uid).length;
          if (connectedCount >= (roomId===PUBLIC_ROOM_ID?MAX_PUBLIC_PLAYERS:MAX_ROOM_PLAYERS)) throw new Error('탐험 공간이 가득 찼습니다. 잠시 뒤 다시 참가해 주세요.');
          if (existing && existing.connected && existing.ws !== ws) existing.ws.close(4002, 'reconnected');
          const profile = existing ? existing.profile : await store.get(joined.uid, joined.nickname);
          if (!existing && profile.interruptedBattle) {
            Object.assign(profile, Battle.healProfile(profile), { interruptedBattle: null });
            await store.save(profile);
          }
          const regionId=existing?.regionId||profile.regionId||'safe';
          const location = existing ? { x: existing.x, z: existing.z } : {...profile.location};
          profile.location = { ...location };
          player = existing || { uid: joined.uid, rates: new Map(), commands: new Map(), inflight: new Map(), busy: false, battleId: null, stamina: 100, staminaAt: clock(), sprinting: false, moveActive: false };
          player.inflight ||= new Map();
          const character = Data.characters.some((item) => item.id === profile.characterId) ? profile.characterId : Data.characters[0].id;
          profile.characterId = character;
          Object.assign(player, { ws, connected: true, regionId, nickname: profile.adventurerName || joined.nickname, profile, character, mount:profile.mounts.equipped, x: location.x, z: location.z, disconnectedAt: 0 });
          room.players.set(player.uid, player);
          sessions.set(player.uid, { room, player });
          clearTimeout(joinTimer);
          send(ws, { type: 'ack', id: 'join', ok: true, result: { uid: player.uid, roomId: room.id } });
          broadcast(room);
        } catch (error) {
          send(ws, { type: 'ack', id: 'join', ok: false, error: errorText(error) });
          ws.close(4003, 'unauthorized');
        }
        return;
      }
      if (!message || message.type !== 'command') return;
      const id = cleanId(message.id, 100);
      if (!id) return send(ws, { type: 'ack', id: '', ok: false, error: '명령 ID가 필요합니다.' });
      if (player.commands.has(id)) return send(ws, player.commands.get(id));
      if (player.inflight.has(id)) return send(ws, await player.inflight.get(id));
      const pending = (async () => {
        try { return { type: 'ack', id, ok: true, result: await execute(room, player, cleanId(message.name, 30), message.payload || {}) }; }
        catch (error) { return { type: 'ack', id, ok: false, error: errorText(error) }; }
      })();
      player.inflight.set(id, pending);
      const ack = await pending;
      player.inflight.delete(id);
      player.commands.set(id, ack);
      while (player.commands.size > COMMAND_LIMIT) player.commands.delete(player.commands.keys().next().value);
      send(ws, ack);
      if (message.name === 'move') {
        if (ack.ok && ack.result && ack.result.changed) queueBroadcast(room);
      } else broadcast(room);
    }).catch(() => { ws.close(1011, 'server error'); }); });
    ws.on('close', () => { serialize(async () => {
      clearTimeout(joinTimer);
      if (!player || player.ws !== ws) return;
      player.connected = false;
      player.disconnectedAt = clock();
      player.profile.lastSeenAt = clock();
      if(!player.realm)player.profile.location = { x: player.x, z: player.z };
      player.profile = await store.save(player.profile);
      room.challenges.forEach((item, id) => { if (item.from === player.uid || item.to === player.uid) room.challenges.delete(id); });
      broadcast(room);
    }).catch(() => { /* Original cloud record is preserved on save failure. */ }); });
  });

  let ticking = false;
  intervals.push(setInterval(() => {
    if (ticking) return;
    ticking = true;
    serialize(async () => {
    const now = clock();
    for (const [roomId, room] of rooms) {
      room.challenges.forEach((item, id) => { if (item.expiresAt <= now) room.challenges.delete(id); });
      for (const record of room.battles.values()) {
        if (record.state.status !== 'active') {
          if (!record.state.rewardProcessed) {
            try { await completeBattle(room, record); } catch { /* 저장 장치가 회복되면 다음 주기에 다시 처리한다. */ }
          }
          continue;
        }
        if(now >= (record.nextAutoAt || 0)){
          for(const key of ['a','b'])if(!record.state.sides[key].pending && record.state.sides[key].auto) record.state.sides[key].pending=Battle.autoAction(record.state,key,rng);
        }
        if (record.state.deadline > now && !(record.state.sides.a.pending&&record.state.sides.b.pending)) continue;
        try {
          for (const side of ['a', 'b']) if (!record.state.sides[side].pending) record.state.sides[side].pending = Battle.autoAction(record.state, side, rng);
          const outcome = Battle.resolveTurn(record.state, { now, rng });
          record.state = outcome.state;
          record.nextAutoAt=now+3500;
          if (record.state.status !== 'active') { record.finishedAt = now; await completeBattle(room, record); }
        } catch { record.state.status = 'finished'; record.state.result = { winner: null, reason: 'invalid' }; await completeBattle(room, record); }
      }
      for (const [uid, player] of room.players) {
        if(player.harvest&&now>player.harvest.finishAt+12000)player.harvest=null;
        if(player.realm&&!room.players.has(player.realm)){player.realm='';player.x=Data.startVillage.x;player.z=Data.startVillage.z;}
        World.updateStamina(player, now);
        if (player.connected && !player.battleId && now - (player.checkpointAt || 0) >= 10000) {
          if(!player.realm)player.profile.location = {x:player.x,z:player.z}; player.profile.lastSeenAt = now;
          player.profile = await store.save(player.profile); player.checkpointAt = now;
        }
        if (!player.connected && now - player.disconnectedAt > 60000) {
          const record = player.battleId && room.battles.get(player.battleId);
          if (record && record.state.status === 'active') {
            record.state.status = 'finished';
            const side = record.sides.get(uid);
            record.state.result = { winner: record.state.type === 'pvp' ? (side === 'a' ? 'b' : 'a') : 'b', reason: 'disconnect' };
            await completeBattle(room, record);
          }
          room.players.delete(uid);
          const owned = sessions.get(uid);
          if (owned && owned.player === player) sessions.delete(uid);
        }
      }
      if (![...room.players.values()].some((item) => item.connected) && room.players.size === 0) rooms.delete(roomId);
      else broadcast(room);
    }
    }).catch(error => console.error('탐험 처리 오류:', error.message)).finally(() => { ticking = false; });
  }, 1000));

  async function close() {
    intervals.forEach(clearInterval);
    for (const room of rooms.values()) if (room.broadcastTimer) clearTimeout(room.broadcastTimer);
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await queue;
    if (authority.close) await authority.close();
  }

  return { app, server, wss, rooms, sessions, store, listen(port = Number(process.env.PORT || 4193), host = '0.0.0.0') { return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); resolve(server.address()); }); }); }, close };
}

if (require.main === module) {
  const game = createGameServer();
  process.once('SIGTERM', () => { game.close().then(() => process.exit(0)); });
  game.listen().then((address) => console.log(`이슬숲 탐험대 서버: http://0.0.0.0:${address.port}`)).catch((error) => { console.error(error); process.exitCode = 1; });
}

module.exports = { createGameServer, selectedTeam, publicProfile };
