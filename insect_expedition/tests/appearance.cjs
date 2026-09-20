'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WebSocket=require('ws');
const A=require('../shared/appearance.js'),{createStore,migrateProfile}=require('../server/data-store.cjs'),{createGameServer}=require('../server/index.cjs');
test('기존 이름과 진행 자료를 보존하고 새 계정만 최초 생성을 요구한다',()=>{
  const old={version:7,adventurerName:'숲친구',characterId:'botanist',gold:4200,bag:{deeds:{small:1}},resources:{wood:23},collection:[{id:'pet',speciesId:'dew_ladybird',level:7}],team:['pet']};
  const migrated=migrateProfile(old,'legacy','로비이름',['dew_ladybird']);
  assert.equal(migrated.characterCreated,true);assert.equal(migrated.adventurerName,'숲친구');assert.equal(migrated.characterId,'botanist');assert.equal(migrated.gold,4200);assert.equal(migrated.resources.wood,23);assert.equal(migrated.bag.deeds.small,1);assert.equal(migrated.collection[0].level,7);assert.deepEqual(migrated.team,['pet']);assert.equal(migrated.appearance.topColor,'#c6bddf');
  assert.equal(migrateProfile(null,'new','로비이름',[]).characterCreated,false);
  assert.equal(A.normalize({height:99,top:'unknown',hairColor:'url(bad)'}).height,1.1);assert.equal(A.valid({...A.normalize(),top:'unknown'}),false);assert.equal(A.valid({...A.normalize(),height:NaN}),false);assert.equal(A.valid({...A.normalize(),nickname:'바꿈'}),false);
});
test('캐릭터·이름 최초 확정, 꾸미기 저장, 재접속·타인 동기화와 저장 실패 복구',async()=>{
  const db=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'appearance-')),'profiles.json'),store=createStore({dbPath:db});let fail=false,now=Date.now();
  const game=createGameServer({store:{...store,save:p=>{if(fail)throw Error('저장 실패 시험');return store.save(p);}},now:()=>now,authority:{verifyToken:async uid=>({uid}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'}}})}});
  const sockets=[];let sequence=0;
  async function client(uid,character){const ws=new WebSocket(`ws://127.0.0.1:${address.port}/insect_expedition/ws`);sockets.push(ws);const messages=[],waiters=[];ws.on('message',raw=>{const value=JSON.parse(raw);messages.push(value);for(const w of [...waiters])if(w.test(value)){waiters.splice(waiters.indexOf(w),1);w.resolve(value);}});await new Promise((ok,bad)=>{ws.once('open',ok);ws.once('error',bad);});
    const wait=predicate=>new Promise((resolve,reject)=>{const found=messages.find(predicate);if(found)return resolve(found);const timer=setTimeout(()=>reject(Error('응답 시간 초과')),3000);timer.unref();waiters.push({test:predicate,resolve:v=>{clearTimeout(timer);resolve(v);}});});
    ws.send(JSON.stringify({type:'join',roomId:'wardrobe',token:uid,character}));await wait(v=>v.type==='state');return{ws,messages,wait,command:async(name,payload)=>{now+=500;const id='cmd'+(++sequence);ws.send(JSON.stringify({type:'command',id,name,payload}));return wait(v=>v.type==='ack'&&v.id===id);}};
  }
  let address;
  try{
    address=await game.listen(0,'127.0.0.1');const alice=await client('alice'),bob=await client('bob');
    const initial=A.normalize({...A.defaults,body:'girl',hairStyle:'twintail',bottom:'skirt'});
    assert.equal((await alice.command('character',{id:'original',name:'하나',appearance:initial})).ok,true);
    assert.equal((await alice.command('character',{id:'scout',name:'바꾸기',appearance:initial})).ok,false);
    const next={...initial,hairColor:'#e4a9bb',headwear:'ribbon',top:'cardigan',height:.9};
    assert.equal((await alice.command('appearance',{appearance:next,name:'변경',id:'river'})).ok,true);
    const player=game.rooms.get('wardrobe').players.get('alice');assert.equal(player.nickname,'하나');assert.equal(player.character,'original');assert.deepEqual(player.profile.appearance,next);
    await bob.wait(v=>v.type==='state'&&v.players.some(p=>p.uid==='alice'&&p.appearance.hairColor==='#e4a9bb'));
    assert.equal((await alice.command('appearance',{appearance:{...next,body:'boy'}})).ok,false);
    assert.equal((await alice.command('appearance',{appearance:{...next,height:9}})).ok,false);
    assert.equal((await alice.command('appearance',{appearance:{...next,hairStyle:'bad'}})).ok,false);
    fail=true;assert.equal((await alice.command('appearance',{appearance:{...next,top:'varsity'}})).ok,false);assert.deepEqual(player.profile.appearance,next);fail=false;
    // A fresh store proves the data is on disk rather than only in the room cache.
    const saved=createStore({dbPath:db}).get('alice','새로비이름');assert.equal(saved.adventurerName,'하나');assert.deepEqual(saved.appearance,next);assert(saved.characterCreated);
    const reconnect=await client('alice','miner');const state=await reconnect.wait(v=>v.type==='state');assert.equal(state.profile.characterId,'original');assert.deepEqual(state.profile.appearance,next);
    fail=true;assert.equal((await bob.command('character',{id:'river',name:'두리',appearance:A.normalize()})).ok,false);assert.equal(game.rooms.get('wardrobe').players.get('bob').profile.characterCreated,false);fail=false;
    assert.equal((await bob.command('character',{id:'river',name:'두리',appearance:A.normalize()})).ok,true);
  }finally{fail=false;for(const ws of sockets)ws.close();await game.close();}
});
