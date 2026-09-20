'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),WS=require('ws');
const Data=require('../shared/data.js'),H=require('../shared/housing.js'),Housing=require('../server/housing.cjs'),Store=require('../server/data-store.cjs'),{createGameServer}=require('../server/index.cjs');
test('토지·문서 저장 이관, 격자 범위·벽 공유 모서리·문 충돌',()=>{
 const old=Store.migrateProfile({version:6},'x','하나',['dew_ladybird']);assert.deepEqual(old.bag.deeds,{small:0,large:0});assert.equal(old.housing.plot,null);
 old.bag.deeds.small=1;Housing.claim(old,{deed:'small',siteId:'meadow'});assert.equal(old.bag.deeds.small,0);old.resources.wood=100;old.resources.stone=100;
 Housing.place(old,{kind:'floor',x:0,z:0,rotation:0},[]);Housing.place(old,{kind:'floor',x:1,z:0,rotation:0},[]);
 const door=Housing.place(old,{kind:'door',x:0,z:0,rotation:1},[]).piece;
 assert(H.placementError(old.housing,{kind:'wall',x:1,z:0,rotation:3}));assert(H.placementError(old.housing,{kind:'floor',x:4,z:0,rotation:0}));
 const p=H.point(old.housing.plot,door);p.x+=H.cell/2;assert(H.blocked(old.housing,p));door.open=true;assert(!H.blocked(old.housing,p));
 assert.throws(()=>Housing.remove(old,old.housing.pieces[0].id),/먼저/);
 const restored=Store.migrateProfile(old,'x','하나',['dew_ladybird']);assert.equal(restored.housing.pieces.length,3);assert.equal(restored.housing.pieces[2].open,true);
});
test('구매→가방→확정·자재 채집 시간·건축 원자성·방문 권한·문 개폐·철거·재접속',async t=>{
 let now=Date.now(),seq=0;const game=createGameServer({authority:{verifyToken:async token=>({uid:token}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'}}})},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'housing-')),'db.json'),now:()=>now});
 const address=await game.listen(0,'127.0.0.1');t.after(()=>game.close());
 async function connect(uid){const ws=new WS('ws://127.0.0.1:'+address.port+'/insect_expedition/ws'),waiters=new Map();t.after(()=>ws.terminate());let state;ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='error')console.log('서버 오류',m);if(m.type==='state')state=m;if(m.type==='ack')waiters.get(m.id)?.(m);});await new Promise(r=>ws.once('open',r));function request(m){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('응답 시간 초과 '+JSON.stringify(m))),3000);waiters.set(m.id||'join',v=>{clearTimeout(timer);waiters.delete(m.id||'join');resolve(v);});ws.send(JSON.stringify(m));});}assert((await request({type:'join',token:uid,roomId:'test'})).ok);return {state:()=>state,async command(name,payload={},ok=true,id='c'+(++seq)){now+=650;const ack=await request({type:'command',id,name,payload});assert.equal(ack.ok,ok,ack.error);return ack.result;}};}
 const a=await connect('alice'),b=await connect('bob'),room=game.rooms.get('test'),alice=room.players.get('alice'),bob=room.players.get('bob');
 alice.profile.gold=5000;await a.command('buy',{itemId:'deed-large'},true,'buy-once');await a.command('buy',{itemId:'deed-large'},true,'buy-once');assert.equal(alice.profile.gold,2000);assert.equal(alice.profile.bag.deeds.large,1);
 await a.command('land-claim',{deed:'large',siteId:'meadow'},false);await a.command('home-travel',{destination:'home'});
 await a.command('land-claim',{deed:'large',siteId:'bad'},false);assert.equal(alice.profile.bag.deeds.large,1);
 const originalSave=game.store.save;game.store.save=()=>{throw Error('저장 실패');};await a.command('land-claim',{deed:'large',siteId:'meadow'},false);assert.equal(alice.profile.bag.deeds.large,1);assert.equal(alice.profile.housing.plot,null);game.store.save=originalSave;
 await a.command('land-claim',{deed:'large',siteId:'meadow'},true,'land-once');await a.command('land-claim',{deed:'large',siteId:'meadow'},true,'land-once');assert.equal(alice.profile.bag.deeds.large,0);
 await a.command('home-travel',{destination:'lumber'});const node=room.resources.find(n=>n.id==='lumber-1');alice.x=node.x;alice.z=node.z-2;
 await a.command('gather',{nodeId:node.id},false);await a.command('gather-start',{nodeId:node.id});const before={x:alice.x,z:alice.z};await a.command('move',{x:1,z:0});assert.deepEqual({x:alice.x,z:alice.z},before);await a.command('gather',{nodeId:node.id},false);now+=2600;
 await a.command('gather',{nodeId:node.id},true,'gather-once');await a.command('gather',{nodeId:node.id},true,'gather-once');assert.equal(alice.profile.resources.wood,4);await a.command('gather',{nodeId:node.id},false);
 alice.profile.resources.wood=100;alice.profile.resources.stone=30;alice.profile.resources.sand=10;
 await a.command('home-travel',{destination:'home'});const base={kind:'floor',x:1,z:1,rotation:0};await a.command('house-place',base,true,'floor-once');await a.command('house-place',base,true,'floor-once');assert.equal(alice.profile.resources.wood,98);
 const snapshot=JSON.stringify(alice.profile);game.store.save=()=>{throw Error('저장 실패');};await a.command('house-place',{kind:'wall',x:1,z:1,rotation:0},false);assert.equal(JSON.stringify(alice.profile),snapshot);game.store.save=originalSave;
 const door=await a.command('house-place',{kind:'door',x:1,z:1,rotation:0});await a.command('house-place',{kind:'roof',x:1,z:1,rotation:0});
 await b.command('home-travel',{destination:'home',ownerUid:'alice'});assert.equal(bob.realm,'alice');await b.command('house-place',{kind:'floor',x:0,z:0,rotation:0},false);await b.command('house-remove',{pieceId:door.piece.id},false);
 const center=H.point(alice.profile.housing.plot,door.piece);bob.x=center.x;bob.z=center.z-4;await b.command('house-door',{pieceId:door.piece.id});assert(alice.profile.housing.pieces.find(p=>p.id===door.piece.id).open);
 bob.x=center.x;bob.z=center.z-H.cell/2;await b.command('house-door',{pieceId:door.piece.id},false);
 bob.z=center.z-4;await b.command('house-door',{pieceId:door.piece.id});assert(!alice.profile.housing.pieces.find(p=>p.id===door.piece.id).open);
 const floor=alice.profile.housing.pieces.find(p=>p.kind==='floor');await a.command('house-remove',{pieceId:floor.id},false);const wood=alice.profile.resources.wood;await a.command('house-remove',{pieceId:door.piece.id});assert.equal(alice.profile.resources.wood,wood+3);
 const persisted=await game.store.get('alice');assert.deepEqual(persisted.housing,alice.profile.housing);assert.equal(persisted.bag.deeds.large,0);
});
