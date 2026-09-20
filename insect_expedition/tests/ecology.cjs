'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
const Data=require('../shared/data.js'),E=require('../shared/ecology.js'),R=require('../shared/regions.js'),Nav=require('../shared/navigation.js'),W=require('../server/world.cjs'),ES=require('../server/ecology.cjs'),Battle=require('../shared/battle.cjs'),{createGameServer}=require('../server/index.cjs');
test('모든 지역의 입구·서식지에 곤충과 채집물이 있고 언덕과 탐험 경로에 접근할 수 있다',()=>{
  const spawns=ES.spawns(W.makeSpawns(Data.species,Data.biomes).map(R.spawnRecord));
  for(const b of Data.biomes){const sites=E.landmarks(b.id);if(!sites.length)continue;Nav.setRegion(b.id);const local=spawns.filter(s=>s.regionId===b.id),nodes=E.nodes(b.id).filter(n=>!R.blocked(b.id,n,2));assert(local.length>=30,b.id);assert(nodes.length>=30,b.id);assert(local.some(s=>Math.hypot(s.x-R.spawn(b.id).x,s.z-R.spawn(b.id).z)<30),b.id+' 입구');
    for(const site of sites){assert(Nav.route(R.spawn(b.id),site).length,site.id);assert(nodes.some(n=>Math.hypot(n.x-site.x,n.z-site.z)<20));}
    for(const s of local)assert(!R.blocked(b.id,s,2),s.id);
  }
  Nav.setRegion(null);assert(R.terrain('forest',-82,-40)-R.terrain('forest',0,68)>25);
});
test('회복제는 야생 전투에서 한 턴을 사용해 체력을 회복하며 대전에서는 사용할 수 없다',()=>{
  for(const type of ['field','pvp']){let state=Battle.createBattle({id:type,type,a:{uid:'a',team:[{id:'a',speciesId:'moon_moth',level:5}]},b:{uid:'b',team:[{id:'b',speciesId:'dew_ladybird',level:1}]}});state.sides.a.team[0].hp=10;state.sides.a.team[0].speed=999;
    if(type==='pvp'){assert.throws(()=>Battle.submitAction(state,'a',{type:'tonic'}),/야생/);continue;}
    const outcome=Battle.submitAction(state,'a',{type:'tonic'},{rng:()=>.5});assert(outcome.state.events.some(e=>e.type==='heal'));assert(outcome.state.sides.a.team[0].hp>10);
  }
});
test('채집·제작·유인·사건·보스 보상은 서버에서 검증되고 저장 실패·중복 명령에도 보존된다',async()=>{
  let now=Date.now(),seq=0;const game=createGameServer({now:()=>now,rng:()=>0,authority:{verifyToken:async uid=>({uid}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'}}})},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ecology-')),'db.json')});let ws;
  try{const address=await game.listen(0,'127.0.0.1');ws=new WS('ws://127.0.0.1:'+address.port+'/insect_expedition/ws');const pending=new Map();ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='ack')pending.get(m.id)?.(m);});await new Promise(r=>ws.once('open',r));
    function request(m){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('응답 시간 초과')),3000);pending.set(m.id||'join',v=>{clearTimeout(t);pending.delete(m.id||'join');resolve(v);});ws.send(JSON.stringify(m));});}
    assert((await request({type:'join',token:'alice',roomId:'eco'})).ok);const room=game.rooms.get('eco'),p=room.players.get('alice');async function cmd(name,payload={},ok=true,id='c'+(++seq)){now+=1000;const ack=await request({type:'command',name,payload,id});assert.equal(ack.ok,ok,ack.error);return ack.result;}
    p.regionId='forest';p.profile.regionId='forest';p.profile.characterCreated=true;p.profile.adventurerName='하나';Object.assign(p,R.spawn('forest'));
    await cmd('craft',{id:'bait'},false);const sap=room.resources.find(n=>n.regionId==='forest'&&n.kind==='sap');await cmd('gather',{nodeId:sap.id},false);p.x=sap.x;p.z=sap.z;await cmd('gather',{nodeId:sap.id});assert.equal(p.profile.ecology.gathered,1);await cmd('gather',{nodeId:sap.id},false);
    for(const k of ['sap','pollen','mushroom','berries','ore','essence','crystal'])p.profile.resources[k]=30;
    const before=JSON.stringify(p.profile),save=game.store.save;game.store.save=()=>{throw Error('모의 저장 실패');};await cmd('craft',{id:'bait'},false);assert.equal(JSON.stringify(p.profile),before);game.store.save=save;
    await cmd('craft',{id:'bait'},true,'craft-once');await cmd('craft',{id:'bait'},true,'craft-once');assert.equal(p.profile.resources.bait,1);assert.equal(p.profile.resources.sap,27);
    for(const id of ['tonic','feed','nectar','charm','prism'])await cmd('craft',{id});assert(p.profile.ecology.charm);assert(p.profile.expedition.eggs.some(e=>e.kind==='prism'));await cmd('craft',{id:'charm'},false);
    const creature=p.profile.collection[0];await cmd('nectar',{creatureId:creature.id});assert(p.profile.collection[0].level>1);
    const site=E.landmarks('forest').find(s=>s.siteId==='sap');p.x=0;p.z=68;await cmd('lure',{},false);Object.assign(p,{x:site.x,z:site.z});await cmd('lure');const lure=room.spawns.find(s=>s.ownerUid==='alice');assert(lure.lured);assert.equal(p.profile.resources.bait,0);assert.equal(p.profile.ecology.lured,1);await cmd('lure',{},false);
    // Real battle reward path with deterministic encounter stats.
    p.x=lure.x;p.z=lure.z;await cmd('encounter',{spawnId:lure.id});let record=room.battles.get(p.battleId);record.state.sides.b.team[0].hp=1;record.state.sides.a.team[0].speed=999;await cmd('action',{battleId:record.id,turn:record.state.turn,action:{type:'attack'}});assert.equal(record.state.result.winner,'a');assert(record.state.result.captureSummary.success);await cmd('return');assert.equal(p.profile.ecology.wins,1);
    const boss=room.spawns.find(s=>s.id==='boss-forest');p.x=boss.x;p.z=boss.z;const essence=p.profile.resources.essence;await cmd('encounter',{spawnId:boss.id});record=room.battles.get(p.battleId);record.state.sides.b.team[0].hp=1;record.state.sides.a.team[0].speed=999;await cmd('action',{battleId:record.id,turn:record.state.turn,action:{type:'attack'}});assert.equal(p.profile.resources.essence,essence+1);await cmd('return');
    for(const kind of ['egg','cache','swarm']){for(let n=0;n<5&&E.event('forest',now+1000).kind!==kind;n++)now+=240000;now+=240000*3;const event=E.event('forest',now+1000);assert.equal(event.kind,kind);p.x=event.x;p.z=event.z;await cmd('explore-event',{id:event.id});await cmd('explore-event',{id:event.id},false);}
    assert.equal(p.profile.ecology.events,3);await cmd('ecology-claim',{id:'events'});await cmd('ecology-claim',{id:'events'},false);
    const saved=game.store.get('alice');assert.deepEqual(saved.ecology,p.profile.ecology);assert.deepEqual(saved.resources,p.profile.resources);assert.equal(saved.adventurerName,'하나');
  }finally{ws?.close();await game.close();}
});
