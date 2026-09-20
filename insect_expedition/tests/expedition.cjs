'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Data=require('../shared/data.js'),Battle=require('../shared/battle.cjs'),Exp=require('../server/expedition.cjs'),Store=require('../server/data-store.cjs'),World=require('../server/world.cjs'),Nav=require('../shared/navigation.js');
test('생존자 순환 공격과 무작위 피격, 쓰러진 동료 제외',()=>{
 const team=key=>[0,1,2].map(i=>({id:key+i,speciesId:'dew_ladybird',level:50,hp:999}));
 let state=Battle.createBattle({id:'rotation',type:'pvp',a:{team:team('a')},b:{team:team('b')}});
 for(let i=0;i<3;i++){
  state.sides.a.pending={type:'attack'};state.sides.b.pending={type:'attack'};
  state=Battle.resolveTurn(state,{rng:()=>.5}).state;
  const attacks=state.events.filter(e=>e.type==='attack');assert.equal(attacks.length,2);
  assert.equal(attacks.find(e=>e.actorSide==='a').actorCreatureId,'a'+i);
  assert.equal(attacks.find(e=>e.actorSide==='a').targetCreatureId,'b1');
 }
 state.sides.a.team[1].hp=0;state.sides.a.active=0;
 state.sides.a.pending={type:'attack'};state.sides.b.pending={type:'attack'};
 state=Battle.resolveTurn(state,{rng:()=>.99}).state;assert.equal(state.sides.a.active,2);
 assert(state.events.filter(e=>e.type==='attack'&&e.actorSide==='b').every(e=>e.targetCreatureId==='a2'));
});
test('부화 재료, 동시 슬롯, 저장 복원, 연구 보상 중복 방지',()=>{
 let p=Store.createProfile('test','하나',['dew_ladybird']);p.resources.crystal=9;
 for(let i=0;i<4;i++)Exp.gather(p,{kind:'egg'},()=>i/4);
 assert.throws(()=>Exp.incubate({...p,resources:{crystal:0}},p.expedition.eggs[0].id));
 for(const e of p.expedition.eggs.slice(0,3))Exp.incubate(p,e.id);
 assert.throws(()=>Exp.incubate(p,p.expedition.eggs[3].id));assert.equal(p.resources.crystal,0);
 Exp.advance(p,4);p=Store.migrateProfile(p,'test','하나',['dew_ladybird']);
 assert.equal(p.expedition.eggs[0].progress,4);assert.equal(p.expedition.eggs[3].progress,0);
 p.expedition.bosses=['boss-grassland'];Exp.claimResearch(p,'first-boss');assert.equal(p.gold,200);assert.throws(()=>Exp.claimResearch(p,'first-boss'));
 const old=Store.migrateProfile({version:5,collection:p.collection},'old','하나',['dew_ladybird']);assert.equal(old.expedition.eggs.length,0);
});
test('전용종 필드·조합 제외와 모든 신규 목적지 접근, 후반 성장 곡선',()=>{
 const spawns=World.makeSpawns(Data.species,Data.biomes);
 assert(!spawns.some(s=>!s.boss&&Data.speciesById[s.speciesId].eggOnly));
 assert(!Object.values(Data.fusionRecipes).some(r=>Data.speciesById[r.result].eggOnly));
 for(const b of Data.biomes.filter(b=>b.special)){const goal=Nav.destination(b.id),route=Nav.route(Data.startVillage,goal);assert(route.length,b.id);assert(!World.pointBlocked(goal));}
 for(const n of Data.resourceNodes.filter(n=>['crystal','egg'].includes(n.kind))){assert(!World.pointBlocked(n),n.id);assert(Nav.route(Data.startVillage,n).length,n.id);}
 assert.equal(Battle.xpForLevel(2),54);assert(Battle.xpForLevel(30)>1700);
});

test('사료 최고 레벨 소모 제한·저장 실패 원복·요청 재전송, 부화 보관함과 보상 저장',async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
 const {createGameServer}=require('../server/index.cjs');let now=Date.now(),seq=0;
 const game=createGameServer({authority:{verifyToken:async token=>({uid:token}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'}}})},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'growth-api-')),'db.json'),now:()=>now,rng:()=>0});
 const address=await game.listen(0,'127.0.0.1');t.after(()=>game.close());
 const ws=new WS('ws://127.0.0.1:'+address.port+'/insect_expedition/ws'),waiters=new Map();t.after(()=>ws.terminate());
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='ack')waiters.get(m.id)?.(m);});await new Promise(r=>ws.once('open',r));
 function request(m){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('응답 시간 초과')),3000);waiters.set(m.id||'join',v=>{clearTimeout(timer);waiters.delete(m.id||'join');resolve(v);});ws.send(JSON.stringify(m));});}
 assert((await request({type:'join',token:'alice',roomId:'test'})).ok);
 const room=game.rooms.get('test'),p=room.players.get('alice');
 async function command(name,payload={},id='c'+(++seq),ok=true){now+=1700;const ack=await request({type:'command',id,name,payload});assert.equal(ack.ok,ok,ack.error);return ack.result;}
 const id=p.profile.collection[0].id;p.profile.supplies.feeds=20;p.profile.collection[0].level=49;p.profile.collection[0].xp=Battle.xpForLevel(49)-10;
 const grown=await command('feed',{creatureId:id,count:'all'},'feed-once');assert.equal(grown.used,1);assert.equal(grown.creature.level,50);assert.equal(p.profile.supplies.feeds,19);
 await command('feed',{creatureId:id,count:'all'},'feed-once');assert.equal(p.profile.supplies.feeds,19);
 const other=p.profile.collection[1].id;await command('feed',{creatureId:other,count:-1},undefined,false);
 const save=game.store.save,before=JSON.stringify(p.profile);game.store.save=()=>{throw Error('저장 실패');};await command('feed',{creatureId:other,count:10},undefined,false);assert.equal(JSON.stringify(p.profile),before);game.store.save=save;
 const result=await command('feed',{creatureId:other,count:10});assert.equal(result.used,10);assert.equal(p.profile.supplies.feeds,9);
 p.profile.expedition.eggs=[{id:'egg-ready',kind:'prism',incubating:true,progress:12}];
 const original=p.profile.collection;p.profile.collection=[...original,...Array.from({length:120-original.length},()=>game.store.createCreature('dew_ladybird'))];
 await command('hatch',{eggId:'egg-ready'},undefined,false);assert.equal(p.profile.expedition.eggs.length,1);p.profile.collection=original;
 await command('hatch',{eggId:'egg-ready'},'hatch-once');await command('hatch',{eggId:'egg-ready'},'hatch-once');assert.equal(p.profile.expedition.hatched,1);assert.equal(p.profile.expedition.eggs.length,0);
 const target=room.spawns.find(s=>s.id==='boss-grassland');p.x=target.x;p.z=target.z+2;await command('encounter',{spawnId:target.id});const battle=room.battles.get(p.battleId);battle.state.sides.b.team[0].hp=1;
 await command('action',{battleId:battle.id,turn:battle.state.turn,action:{type:'attack'}});assert.equal(battle.state.status,'finished');assert(p.profile.expedition.bosses.includes(target.id));assert.equal(battle.state.result.captureSummary.level,5);assert.equal(p.profile.collection.at(-1).level,5);
 await command('return');const stored=await game.store.get('alice');assert.equal(stored.expedition.hatched,1);assert(stored.expedition.bosses.includes(target.id));
});
