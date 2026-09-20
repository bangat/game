'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WebSocket=require('ws');
const Data=require('../shared/data.js'),R=require('../shared/regions.js'),W=require('../server/world.cjs'),Battle=require('../shared/battle.cjs'),{createGameServer}=require('../server/index.cjs');
test('독립 지역의 등장·채집 위치, 지형과 포탈 도착점을 검증한다',()=>{
  for(const b of Data.biomes){assert(!R.blocked(b.id,R.spawn(b.id)));assert(R.portals(b.id).length);assert(R.terrain(b.id,0,68)>=0);}
  for(const s of W.makeSpawns(Data.species,Data.biomes).map(R.spawnRecord)){assert(!R.blocked(s.regionId,s,3),s.id);assert(!Data.speciesById[s.speciesId].evolutionOnly);}
  assert(R.terrain('rock',80,100)-R.terrain('rock',0,68)>3);assert.notEqual(R.terrain('grassland',80,100),R.terrain('cave',80,100));
  const nodes=Data.resourceNodes.map(R.resourceRecord);assert(nodes.filter(n=>n.kind==='wood').every(n=>n.regionId==='lumber'));assert(nodes.filter(n=>n.kind==='egg').every(n=>n.regionId==='nest'));
});
test('기본 곤충 9종의 진화는 레벨 조건과 개체·팀 식별자를 보존한다',()=>{
  const sources=Data.species.filter(s=>s.evolvesTo&&Data.speciesById[s.evolvesTo].evolutionOnly);assert.equal(sources.length,9);
  for(const s of sources){assert.throws(()=>Battle.evolveCreature({id:'keep',speciesId:s.id,level:s.evolutionLevel-1}),/레벨/);const next=Battle.evolveCreature({id:'keep',speciesId:s.id,level:s.evolutionLevel,xp:7});assert.equal(next.id,'keep');assert.equal(next.xp,7);assert.equal(next.speciesId,s.evolvesTo);assert(Data.speciesById[next.speciesId].skill);}
});
test('지도 이동·지역 격리·판매 수량·전투 뒤 달리기·영구 저장',async()=>{
  let now=Date.now();const game=createGameServer({now:()=>now,rng:()=>.1,dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'regions-')),'profiles.json'),authority:{verifyToken:async uid=>({uid}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'}}})}});const sockets=[];let seq=0;
  const address=await game.listen(0,'127.0.0.1');
  async function open(uid){const ws=new WebSocket(`ws://127.0.0.1:${address.port}/insect_expedition/ws`);sockets.push(ws);let last;const waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state')last=m;for(const w of [...waiters])if(w.pred(m)){waiters.splice(waiters.indexOf(w),1);w.done(m);}});await new Promise(r=>ws.on('open',r));function wait(pred){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('응답 시간 초과')),3000);t.unref();waiters.push({pred,done:m=>{clearTimeout(t);resolve(m);}});});}const joined=wait(m=>m.type==='state');ws.send(JSON.stringify({type:'join',token:uid,roomId:'regions'}));await joined;return {state:()=>last,command:async(name,payload={})=>{now+=1300;const id='cmd'+(++seq),ack=wait(m=>m.type==='ack'&&m.id===id);ws.send(JSON.stringify({type:'command',id,name,payload}));return ack;}};}
  try{
    const a=await open('alice'),b=await open('bob'),room=game.rooms.get('regions'),p=room.players.get('alice');assert.equal(a.state().regionId,'safe');assert.equal(a.state().spawns.length,0);
    assert.equal((await a.command('travel',{biomeId:'invalid-region'})).ok,false);
    const enter=await a.command('travel',{biomeId:'grassland'});assert(enter.ok,enter.error);assert.equal(p.regionId,'grassland');assert.equal(a.state().players.length,1);assert(a.state().spawns.every(s=>s.biomeId==='grassland'));
    const other=room.spawns.find(s=>s.regionId==='forest');p.x=other.x;p.z=other.z;assert.equal((await a.command('encounter',{spawnId:other.id})).ok,false);
    const wood=room.resources.find(n=>n.kind==='wood');p.x=wood.x;p.z=wood.z;assert.equal((await a.command('gather-start',{nodeId:wood.id})).ok,false);
    const target=room.spawns.find(s=>s.id==='tutorial-1');p.x=target.x+2;p.z=target.z;await a.command('sprint',{enabled:true});const fight=await a.command('encounter',{spawnId:target.id});assert(fight.ok,fight.error);assert(p.sprinting);const record=room.battles.get(p.battleId);record.state.status='finished';record.state.rewardProcessed=true;record.state.result={winner:'a'};assert((await a.command('return')).ok);assert(p.sprinting);
    p.profile.resources.wood=15;p.profile.resources.stone=3;p.profile.gold=0;assert.equal((await a.command('sell-resource',{kind:'wood',count:10})).ok,true);assert.equal(p.profile.resources.wood,5);assert.equal(p.profile.gold,80);assert.equal((await a.command('sell-resource',{kind:'wood',count:9})).ok,false);assert.equal(p.profile.resources.wood,5);assert.equal((await a.command('sell-resource',{kind:'stone',count:'all'})).ok,true);assert.equal(p.profile.gold,110);
    assert.equal(game.store.get('alice').regionId,'grassland');assert.equal(game.store.get('alice').resources.wood,5);
  }finally{for(const s of sockets)s.close();await game.close();}
});
