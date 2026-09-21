'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
const Z=require('../server/zombies.cjs'),Data=require('../shared/data.js'),R=require('../shared/regions.js'),Nav=require('../shared/navigation.js');
const {createGameServer}=require('../server/index.cjs'),{PUBLIC_ROOM_ID}=require('../server/auth.cjs');
test('모든 탐험 지역에 입구·장애물을 피한 좀비 1~2마리를 배치한다',()=>{
 const all=Z.create();for(const b of Data.biomes){const group=all.filter(z=>z.regionId===b.id);assert(group.length>=1&&group.length<=2);for(const z of group){assert(!R.blocked(b.id,z,2));assert(Math.hypot(z.x-R.spawn(b.id).x,z.z-R.spawn(b.id).z)>Z.DETECT);}}
 assert(!Data.species.some(s=>s.enemyOnly));assert(Data.speciesById.forest_zombie.enemyOnly);
});
test('감지·추격·범위 이탈·타 지역·채집·패배 회복·한 명 선점',async()=>{
 const zombie=Z.create().find(z=>z.regionId==='forest'),p={uid:'a',connected:true,regionId:'forest',x:zombie.x+12,z:zombie.z,profile:{characterCreated:true,team:['c'],collection:[{id:'c',hp:10}]}};
 const room={zombies:[zombie],players:new Map([['a',p]])};let fights=0;const start=async target=>{fights++;target.battleId='fight';};
 await Z.tick(room,1000,start);assert.equal(zombie.targetUid,'a');const old=zombie.x;await Z.tick(room,1200,start);assert(zombie.x>old);
 p.regionId='cave';await Z.tick(room,1400,start);assert.equal(zombie.targetUid,null);assert.equal(fights,0);
 Object.assign(zombie,{...zombie.home,mode:'idle'});p.regionId='forest';p.x=zombie.x+3;p.harvest={};await Z.tick(room,1600,start);assert.equal(zombie.targetUid,null);p.harvest=null;
  p.profile.movementLockedUntil=30000;await Z.tick(room,1800,start);assert.equal(zombie.targetUid,null);p.profile.movementLockedUntil=0;
 p.zombieClient=false;await Z.tick(room,1900,start);assert.equal(zombie.targetUid,null);p.zombieClient=true;
 p.x=zombie.x+1;room.players.set('b',{...p,uid:'b'});await Z.tick(room,2000,start);await Z.tick(room,2200,start);assert.equal(fights,1);assert.equal(zombie.mode,'engaged');
 Z.release(zombie,2200,false);assert(!zombie.available);assert.equal(zombie.targetUid,null);
});
test('장애물을 가로지르지 않고 추격하며 추격 한계에서 복귀한다',async()=>{
 const z=Z.create().find(z=>z.regionId==='forest'),p={uid:'a',connected:true,regionId:'forest',x:-52,z:15,profile:{characterCreated:true,team:[],collection:[{hp:10}]}};
 Object.assign(z,{x:-74,z:15,home:{x:-74,z:15},targetUid:'a',mode:'chase'});const room={zombies:[z],players:new Map([['a',p]])};let previous={x:z.x,z:z.z};
 for(let i=0;i<70;i++){await Z.tick(room,1000+i*200,async()=>{p.battleId='battle';});Nav.setRegion('forest');assert(Nav.clear(previous,z));assert(!R.blocked('forest',z,1.6));previous={x:z.x,z:z.z};if(z.mode==='engaged')break;}
 assert.equal(z.mode,'engaged');Z.release(z,16000,false);Object.assign(z,{available:true,mode:'chase',targetUid:'a',...z.home});p.battleId=null;p.x=30;await Z.tick(room,16200,async()=>{});assert.equal(z.targetUid,null);
});
test('자동 접촉 전투·패배 30초·재접속·저장 복원·만료 후 이동·승리 보상',async()=>{
 let now=Date.now(),seq=0;const dbPath=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'zombie-server-')),'db.json'),authority={verifyToken:async uid=>({uid}),getRoom:async()=>null};
 let game=createGameServer({now:()=>now,authority,dbPath}),sockets=[];
 async function open(){const addr=game.server.address(),ws=new WS(`ws://127.0.0.1:${addr.port}/insect_expedition/ws`),pending=[];let state;sockets.push(ws);
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state')state=m;for(const w of [...pending])if(w.pred(m)){pending.splice(pending.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}});
  const wait=pred=>new Promise((resolve,reject)=>{const w={pred,resolve,timer:setTimeout(()=>reject(Error('응답 시간 초과')),4000)};pending.push(w);});
  await new Promise(r=>ws.once('open',r));const ready=wait(m=>m.type==='state');ws.send(JSON.stringify({type:'join',token:'a',roomId:PUBLIC_ROOM_ID,features:{zombies:true}}));await ready;
  return {ws,state:()=>state,wait,async cmd(name,payload={}){const id='c'+(++seq),ack=wait(m=>m.type==='ack'&&m.id===id);ws.send(JSON.stringify({type:'command',id,name,payload}));return ack;}};
 }
 try{
  const profile=game.store.get('a');profile.characterCreated=true;profile.adventurerName='하나';profile.team=[];game.store.save(profile);await game.listen(0,'127.0.0.1');let a=await open();let room=game.rooms.get(PUBLIC_ROOM_ID),p=room.players.get('a'),z=room.zombies.find(z=>z.regionId==='safe');
  p.x=z.x+1;p.z=z.z;await a.wait(m=>m.type==='state'&&m.battle?.zombie);let record=room.battles.get(p.battleId);assert(record.state.sides.a.team.length>0,'빈 팀이어도 보유 동료로 방어');
  record.state.status='finished';record.state.result={winner:'b',reason:'defeat'};
  const save=game.store.save;game.store.save=async()=>{throw Error('임시 저장 실패');};assert(!(await a.cmd('return')).ok);const defeatAt=now;now+=5000;game.store.save=save;
  const returned=await a.cmd('return');assert(returned.ok,returned.error);const deadline=p.profile.movementLockedUntil;assert.equal(deadline,defeatAt+30000);assert.equal(z.mode,'rest');
  const origin={x:p.x,z:p.z};assert.equal((await a.cmd('move',{x:1,z:0})).result.changed,false);assert(!(await a.cmd('travel',{biomeId:'forest'})).ok);assert(!(await a.cmd('home-travel',{destination:'field'})).ok);assert.deepEqual({x:p.x,z:p.z},origin);
  a.ws.close();await new Promise(r=>setTimeout(r,50));a=await open();assert.equal(a.state().profile.movementLockedUntil,deadline);
  await game.close();game=createGameServer({now:()=>now,authority,dbPath});await game.listen(0,'127.0.0.1');a=await open();room=game.rooms.get(PUBLIC_ROOM_ID);p=room.players.get('a');assert.equal(a.state().profile.movementLockedUntil,deadline);
  now=deadline+1;assert((await a.cmd('move',{x:1,z:0})).result.changed);assert((await a.cmd('travel',{biomeId:'forest'})).ok);
  now+=9000;p.profile.zombieGraceUntil=0;z=room.zombies.find(z=>z.regionId==='forest');p.x=z.x+1;p.z=z.z;await a.wait(m=>m.type==='state'&&m.battle?.zombie);record=room.battles.get(p.battleId);const gold=p.profile.gold,count=p.profile.collection.length;
  record.state.status='finished';record.state.result={winner:'a',reason:'defeat'};assert((await a.cmd('return')).ok);assert.equal(p.profile.gold,gold+12);assert.equal(p.profile.collection.length,count);assert.equal(p.profile.movementLockedUntil,deadline);assert.equal(z.respawnAt,now+60000);
 }finally{for(const s of sockets)s.close();await game.close();}
});
