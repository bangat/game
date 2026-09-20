'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
const {authorizeJoin,PUBLIC_ROOM_ID}=require('../server/auth.cjs'),{createGameServer}=require('../server/index.cjs');
test('공용 탐험도 유효한 로그인이 필요하며 일반 방의 참가 인증은 유지한다',async()=>{
 const authority={verifyToken:async token=>{if(token!=='valid')throw Error('invalid');return {uid:'alice'};},getRoom:async()=>null};
 assert.equal((await authorizeJoin(authority,'valid',PUBLIC_ROOM_ID)).uid,'alice');
 await assert.rejects(()=>authorizeJoin(authority,'invalid',PUBLIC_ROOM_ID));
 await assert.rejects(()=>authorizeJoin(authority,'',PUBLIC_ROOM_ID));
 await assert.rejects(()=>authorizeJoin(authority,'valid','private-room'));
});
test('7명 공용 합류·지역 인원·직접 이동·이동 제한·저장 실패·재접속',async()=>{
 let now=Date.now(),seq=0;const game=createGameServer({now:()=>now,authority:{verifyToken:async uid=>({uid}),getRoom:async()=>{throw Error('공용 탐험은 방 문서가 필요하지 않음');}},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'public-map-')),'db.json')});
 const addr=await game.listen(0,'127.0.0.1'),clients=[];
 async function open(uid){const ws=new WS(`ws://127.0.0.1:${addr.port}/insect_expedition/ws`),waiters=[];let state;
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state')state=m;for(const w of [...waiters])if(w.pred(m)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}});
  function wait(pred){return new Promise((resolve,reject)=>{const w={pred,resolve,timer:setTimeout(()=>reject(Error('응답 시간 초과')),4000)};w.timer.unref();waiters.push(w);});}
  await new Promise(r=>ws.once('open',r));const ready=wait(m=>m.type==='state');ws.send(JSON.stringify({type:'join',roomId:PUBLIC_ROOM_ID,token:uid}));await ready;
  const client={ws,state:()=>state,wait,async command(name,payload={}){now+=1500;const id='cmd'+(++seq),ack=wait(m=>m.type==='ack'&&m.id===id);ws.send(JSON.stringify({type:'command',id,name,payload}));const result=await ack;await new Promise(r=>setTimeout(r,25));return result;}};clients.push(client);return client;
 }
 try{
  for(let i=0;i<7;i++)await open('user'+i);
  const a=clients[0],b=clients[1],room=game.rooms.get(PUBLIC_ROOM_ID),p=room.players.get('user0');
  if(a.state().onlineCount!==7)await a.wait(m=>m.type==='state'&&m.onlineCount===7);
  assert.equal(game.rooms.size,1);assert.equal(a.state().players.length,7);assert.equal(a.state().regionPopulation.safe,7);
  p.profile.mounts={owned:['motorcycle'],equipped:'motorcycle'};p.mount='motorcycle';
  assert((await a.command('travel',{biomeId:'forest'})).ok);assert.equal(p.mount,'motorcycle');
  assert.equal(a.state().regionId,'forest');assert.equal(a.state().players.length,1);assert.equal(b.state().regionPopulation.forest,1);assert.equal(b.state().regionPopulation.safe,6);assert.equal(a.state().onlineCount,7);assert.deepEqual(a.state().portals,[]);
  assert((await b.command('travel',{biomeId:'forest'})).ok);assert.equal(a.state().players.length,2);
  assert((await a.command('travel',{biomeId:'quarry'})).ok);assert.equal(p.regionId,'quarry');assert.equal(p.mount,'motorcycle');
  assert(!(await a.command('travel',{biomeId:'missing'})).ok);assert.equal(p.regionId,'quarry');
  p.harvest={finishAt:now+100000};assert(!(await a.command('travel',{biomeId:'safe'})).ok);p.harvest=null;
  p.battleId='active';assert(!(await a.command('travel',{biomeId:'safe'})).ok);p.battleId=null;
  const save=game.store.save;game.store.save=async()=>{throw Error('저장 실패');};assert(!(await a.command('travel',{biomeId:'safe'})).ok);assert.equal(p.regionId,'quarry');game.store.save=save;
  assert((await a.command('home-travel',{destination:'home'})).ok);assert.equal(p.realm,'user0');assert((await a.command('travel',{biomeId:'forest'})).ok);assert.equal(p.realm,'');assert.equal(p.mount,'motorcycle');
  assert.equal(game.store.get('user0').regionId,'forest');
  const left=b.wait(m=>m.type==='state'&&m.onlineCount===6);a.ws.close();await left;
  const again=await open('user0');assert.equal(again.state().regionId,'forest');assert.equal(again.state().players.length,2);assert.equal(again.state().onlineCount,7);
 }finally{for(const c of clients)c.ws.close();await game.close();}
});
