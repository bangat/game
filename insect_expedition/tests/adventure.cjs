'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
const Data=require('../shared/data.js'),Battle=require('../shared/battle.cjs'),World=require('../server/world.cjs'),Nav=require('../shared/navigation.js');
const {createGameServer}=require('../server/index.cjs');
test('강제 교체 다음 턴은 느린 새 곤충이 먼저 행동하고 그 다음 턴은 정상 속도 순서',()=>{
 for(const lostSide of ['a','b']){
  let state=Battle.createBattle({id:'entry-'+lostSide,type:'pvp',a:{uid:'a',team:[{id:'a1',speciesId:'dew_ladybird'},{id:'a2',speciesId:'dew_ladybird'}]},b:{uid:'b',team:[{id:'b1',speciesId:'azure_dragonfly'},{id:'b2',speciesId:'dew_ladybird'}]}});
  const foe=lostSide==='a'?'b':'a';state.sides[lostSide].team[0].hp=1;state.sides[foe].team[0].speed=999;
  state.sides[foe].team.forEach(c=>{c.hp=1000;c.speed=999;});state.sides[lostSide].team[1].hp=1000;
  function round(){state=Battle.submitAction(state,'a',{type:'attack'},{rng:()=>0}).state;state=Battle.submitAction(state,'b',{type:'attack'},{rng:()=>0}).state;return state.events.filter(e=>e.type==='attack');}
  const first=round();assert.equal(first.length,1);assert.equal(state.sides[lostSide].active,1);
  assert.equal(round()[0].actorSide,lostSide);assert.equal(state.sides[lostSide].entryPriority,null);
  assert.equal(round()[0].actorSide,foe);
 }
});
test('모든 사냥터·보스까지 건물 충돌 없는 경로와 사냥터당 보스 1마리',()=>{
 for(const [id,recipe] of Object.entries(Data.fusionRecipes)) for(const level of [1,25,50]) assert(Battle.combatPower({speciesId:recipe.result,level})>Battle.combatPower({speciesId:id,level}),id+' 조합 후 전투력 성장');
 const spawns=World.makeSpawns(Data.species,Data.biomes),bosses=spawns.filter(s=>s.boss);
 const cave=spawns.filter(s=>s.biomeId==='cave'&&!s.boss),grass=spawns.filter(s=>s.biomeId==='grassland'&&!s.boss);
 assert(cave.length>=9&&cave.every(s=>s.level>=26));assert(Math.min(...cave.map(s=>s.level))>Math.max(...grass.map(s=>s.level)));
 assert(cave.some(s=>s.speciesId==='ancient_rex'));assert(cave.some(s=>s.speciesId==='crystal_ankylosaur'));assert(!cave.some(s=>grass.some(g=>g.speciesId===s.speciesId)));
 assert.equal(Data.world.maxX-Data.world.minX,480);assert.equal(bosses.find(s=>s.biomeId==='cave').level,36);
 assert.equal(bosses.length,11);assert.equal(new Set(bosses.map(s=>s.biomeId)).size,11);assert(!bosses.some(b=>b.biomeId==='safe'));
 const destinations=[...Data.biomes,...Data.fieldBosses].map(b=>Nav.destination(b.id));
 for(const start of [Data.startVillage,{x:0,z:-30},{x:-110,z:110},...destinations])for(const goal of destinations){
  const route=Nav.route(start,goal);assert(route.length,JSON.stringify({start,goal}));let previous=start;
  for(const step of route){assert(Nav.clear(previous,step),JSON.stringify({previous,step}));previous=step;}
  assert(Nav.distance(previous,goal)<.1);
 }
 for(const boss of bosses){assert(!World.pointBlocked(boss));assert.equal(World.publicSpawn(boss).boss,true);}
});
test('동일 시작 마을·같은 방 만남·거리와 동의가 필요한 대전·조합 저장·보스 예약 및 재출현',async t=>{
 let now=Date.now(),seq=0;
 const authority={verifyToken:async token=>({uid:token}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'},carol:{nickname:'세나'}}})};
 const game=createGameServer({authority,dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'insect-adventure-')),'db.json'),now:()=>now,rng:()=>0});
 const old=await game.store.get('alice','하나');old.location={x:90,z:90};await game.store.save(old);
 const address=await game.listen(0,'127.0.0.1');t.after(()=>game.close());
 async function connect(uid,roomId='same'){
  const ws=new WS('ws://127.0.0.1:'+address.port+'/insect_expedition/ws');const waiters=new Map();let snapshot;
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state')snapshot=m;if(m.type==='ack')waiters.get(m.id)?.(m);});
  await new Promise(r=>ws.once('open',r));t.after(()=>ws.terminate());
  function request(m){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('응답 시간 초과')),3000);waiters.set(m.id||'join',v=>{clearTimeout(timer);waiters.delete(m.id||'join');resolve(v);});ws.send(JSON.stringify(m));});}
  assert((await request({type:'join',token:uid,roomId})).ok);
  return {ws,state:()=>snapshot,request,async command(name,payload={},id='c'+(++seq),ok=true){now+=1700;const ack=await request({type:'command',id,name,payload});assert.equal(ack.ok,ok,ack.error);return ack.result;}};
 }
 const a=await connect('alice'),b=await connect('bob'),c=await connect('carol','other'),room=game.rooms.get('same'),alice=room.players.get('alice'),bob=room.players.get('bob');
 assert.deepEqual({x:alice.x,z:alice.z},Data.startVillage);assert.deepEqual({x:bob.x,z:bob.z},Data.startVillage);
 await a.command('heal');assert.equal(a.state().players.length,2);assert.equal(c.state().players.length,1);
 await a.command('challenge',{targetUid:'bob'},undefined,false);
 alice.x=30;alice.z=30;bob.x=70;bob.z=30;await a.command('challenge',{targetUid:'bob'},undefined,false);
 now+=6000;bob.x=35;const declined=await a.command('challenge',{targetUid:'bob'});await b.command('respond',{requestId:declined.requestId,accept:false});assert.equal(alice.battleId,null);
 now+=6000;const request=await a.command('challenge',{targetUid:'bob'});bob.x=70;await b.command('respond',{requestId:request.requestId,accept:true},undefined,false);
 now+=6000;bob.x=35;const accepted=await a.command('challenge',{targetUid:'bob'});await b.command('respond',{requestId:accepted.requestId,accept:true});assert.equal(alice.battleId,bob.battleId);
 const duel=room.battles.get(alice.battleId);duel.state.sides.b.team.forEach(x=>x.hp=1);duel.state.sides.a.team.forEach(x=>{x.speed=999;x.hp=1000;});
 for(let i=0;i<6&&duel.state.status==='active';i++){await a.command('action',{battleId:duel.id,turn:duel.state.turn,action:{type:'attack'}});await b.command('action',{battleId:duel.id,turn:duel.state.turn,action:{type:'attack'}});}
 assert.equal(duel.state.status,'finished');await a.command('return');await b.command('return');
 const base=alice.profile.collection[0],m1=game.store.createCreature(base.speciesId,1),m2=game.store.createCreature(base.speciesId,2);
 alice.profile.collection.push(m1,m2);alice.profile.gold=200;base.level=7;base.xp=11;const team=[...alice.profile.team];await game.store.save(alice.profile);
 const recipe=Data.fusionRecipes[base.speciesId],payload={creatureId:base.id,materialIds:[m1.id,m2.id]};
 await a.command('fuse',{...payload,materialIds:[m1.id,m1.id]},undefined,false);
 await a.command('fuse',{...payload,materialIds:[base.id,m1.id]},undefined,false);
 const previousTeam=[...alice.profile.team];alice.profile.team=[m1.id];await a.command('fuse',payload,undefined,false);alice.profile.team=previousTeam;
 const save=game.store.save;game.store.save=()=>{throw Error('저장 실패 모의');};const before=JSON.stringify(alice.profile);await a.command('fuse',payload,undefined,false);assert.equal(JSON.stringify(alice.profile),before);game.store.save=save;
 const fused=await a.command('fuse',payload,'fusion-once');await a.command('fuse',payload,'fusion-once');
 assert.equal(fused.creature.speciesId,recipe.result);assert.equal(fused.creature.level,7);assert.equal(fused.creature.xp,11);assert.deepEqual(alice.profile.team,team);assert.equal(alice.profile.gold,200-recipe.gold);assert(!alice.profile.collection.some(x=>x.id===m1.id));
 assert.equal((await game.store.get('alice')).collection.find(x=>x.id===base.id).speciesId,recipe.result);
 // Permanent mounts: prices, ownership, equip, restore and authoritative speed.
 alice.profile.gold=4000;await game.store.save(alice.profile);
 await a.command('mount',{id:'motorcycle'},undefined,false);
 await a.command('buy',{itemId:'mount-handcart'});assert.equal(alice.profile.gold,3000);
 await a.command('buy',{itemId:'mount-motorcycle'});assert.equal(alice.profile.gold,1000);
 await a.command('buy',{itemId:'mount-handcart'},undefined,false);assert.equal(alice.profile.gold,1000);
 await a.command('mount',{id:'handcart'});assert.equal(alice.mount,'handcart');
 await a.command('mount',{id:'motorcycle'});assert.equal((await game.store.get('alice')).mounts.equipped,'motorcycle');
 await a.command('sprint',{enabled:true},undefined,false);
 for(const [mount,speed] of [['',16],['handcart',18],['motorcycle',22]]){const p={x:30,z:30,mount,sprinting:true,stamina:100,staminaAt:1000,lastMoveAt:1000,moveActive:true};World.movePlayer(p,{x:1,z:0},1100);assert(Math.abs(p.x-30-speed*.1)<1e-8);if(mount)assert.equal(p.stamina,100);}
 await a.command('mount',{id:''});assert.equal(alice.mount,'');
 // Both retreat and defeat release the original field group without despawning it.
 const group=room.spawns.find(s=>s.id==='group-grassland');assert.equal(group.members.length,3);alice.x=group.x;alice.z=group.z;
 await a.command('encounter',{spawnId:group.id});let pack=room.battles.get(alice.battleId);assert.equal(pack.state.sides.b.team.length,3);assert(pack.state.sides.a.auto);
 await a.command('auto-battle',{enabled:false});assert.equal(pack.state.sides.a.auto,false);
 await a.command('action',{battleId:pack.id,turn:pack.state.turn,action:{type:'retreat'}});assert(group.available&&!group.reservedBy&&!group.respawnAt);await a.command('return');
 await a.command('encounter',{spawnId:group.id});pack=room.battles.get(alice.battleId);pack.state.sides.a.team.forEach(c=>{c.hp=1;c.attack=1;});pack.state.sides.b.team.forEach(c=>{c.hp=10000;c.attack=999;});
 for(let n=0;n<6&&pack.state.status==='active';n++)await a.command('action',{battleId:pack.id,turn:pack.state.turn,action:{type:'attack'}});
 assert.equal(pack.state.result.winner,'b');assert(group.available&&!group.reservedBy&&!group.respawnAt);await a.command('return');
 await a.command('encounter',{spawnId:group.id});pack=room.battles.get(alice.battleId);pack.state.sides.b.team.forEach(c=>{c.hp=1;c.attack=1;});pack.state.sides.a.team.forEach(c=>{c.hp=10000;c.attack=999;});
 // Advance the test clock and let the real periodic auto-battle scheduler act.
 for(let n=0;n<6&&pack.state.status==='active';n++){now+=8000;await new Promise(r=>setTimeout(r,1100));}
 assert.equal(pack.state.result.winner,'a');assert.equal(pack.state.result.captureSummaries.filter(c=>c.success).length,3);assert(!group.available&&group.respawnAt>now);await a.command('return');
 const single=room.spawns.find(s=>s.id==='tutorial-2');alice.x=single.x;alice.z=single.z;await a.command('encounter',{spawnId:single.id});const solo=room.battles.get(alice.battleId);await a.command('action',{battleId:solo.id,turn:1,action:{type:'retreat'}});assert(single.available&&!single.reservedBy);await a.command('return');
 const boss=room.spawns.find(s=>s.id==='boss-grassland');alice.x=boss.x;alice.z=boss.z;bob.x=boss.x+1;bob.z=boss.z;
 await a.command('encounter',{spawnId:boss.id});assert.equal(boss.reservedBy,'alice');await b.command('encounter',{spawnId:boss.id},undefined,false);
 const retreated=room.battles.get(alice.battleId);await a.command('action',{battleId:retreated.id,turn:1,action:{type:'retreat'}});assert.equal(boss.available,true);assert.equal(boss.reservedBy,null);assert.equal(boss.respawnAt,0);await a.command('return');
 await a.command('encounter',{spawnId:boss.id});
 const fight=room.battles.get(alice.battleId);assert(fight.state.boss);fight.state.sides.b.team[0].hp=1;fight.state.sides.a.team[0].speed=999;
 await a.command('action',{battleId:fight.id,turn:fight.state.turn,action:{type:'attack'}});assert.equal(fight.state.result.winner,'a');assert(fight.state.result.gold>=100);assert.equal(boss.respawnAt-now,300000);assert.equal(boss.available,false);
 World.updateSpawns(room.spawns,boss.respawnAt-1);assert.equal(boss.available,false);World.updateSpawns(room.spawns,boss.respawnAt);assert.equal(boss.available,true);
});
