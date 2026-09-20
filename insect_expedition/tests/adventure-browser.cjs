'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../server/index.cjs'),Data=require('../shared/data.js');
const output=path.join(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
const authority={verifyToken:async token=>({uid:token}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'}}})};
const game=createGameServer({authority,dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'insect-ui-')),'db.json'),rng:()=>0});
let browser,page;
(async()=>{try{
 const seeded=await game.store.get('alice','하나');seeded.gold=4000;seeded.adventurerName='하나';
 seeded.collection[0].speciesId='azure_dragonfly';seeded.collection[0].nickname='푸른시내잠자리';seeded.collection[0].level=10;
 seeded.collection.push(game.store.createCreature('azure_dragonfly',1),game.store.createCreature('azure_dragonfly',2));await game.store.save(seeded);
 const address=await game.listen(0,'127.0.0.1'),base='http://127.0.0.1:'+address.port;
 browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function open(uid,mobile){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(uid=>{
   window.fixtureUid=uid;window.audioNotes=0;
   const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){const original=Audio.prototype.createOscillator;Audio.prototype.createOscillator=function(){window.audioNotes++;return original.call(this);};}
  },uid);
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`window.firebase ||= {apps:[{}],auth:()=>({onAuthStateChanged(fn){queueMicrotask(()=>fn({uid:window.fixtureUid,getIdToken:async()=>window.fixtureUid}));return ()=>{};}}),database:()=>({ref:()=>({once:async()=>({val:()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'}}})})})})};`}));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto(base+'/insect_expedition/index.html?roomId=ui-room');const frame=await(await p.locator('#game-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>window.InsectApp?.ready);
  await frame.locator('#explorer-name').fill(uid==='alice'?'하나':'두리');await frame.locator('#enter-world').click();await frame.locator('.ix-top').waitFor();
  return {page:p,frame,context};
 }
 const first=await open('alice',true);page=first.page;const f=first.frame;
 const room=game.rooms.get('isulsup-public'),a=room.players.get('alice');
 assert.deepEqual(await f.evaluate(()=>[innerWidth,innerHeight]),[844,390]);assert.deepEqual({x:a.x,z:a.z},Data.startVillage);
 await f.evaluate(()=>{window.playedSounds=[];const play=InsectAudio.play;InsectAudio.play=function(kind,...args){playedSounds.push(kind);return play(kind,...args);};});
 async function publish(){await f.evaluate(()=>InsectApp.send('heal'));await page.waitForTimeout(300);}
 async function centered(){assert(await f.evaluate(()=>{const r=document.querySelector('.ix-celebration .ix-dialog').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&Math.abs(r.x+r.width/2-innerWidth/2)<3&&Math.abs(r.y+r.height/2-innerHeight/2)<3;}),'중앙 알림창 화면 범위');}
 // Buy and mount each vehicle through the real shop, verify seated/standing rigs and wheels.
 for(const id of ['handcart','motorcycle']){
   await f.locator('[data-value="shop"]').click();await f.locator('[data-act="buy"][data-id="mount-'+id+'"]').click();await f.locator('[data-act="mount"][data-id="'+id+'"]').click();
   await f.waitForFunction(id=>InsectApp.world.scene.getTransformNodeByName('avatar-local')?.metadata.mount===id,id);
   assert.equal(a.mount,id);await page.waitForTimeout(150);
   assert(await f.evaluate(id=>{const rig=InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata;return rig.wheels.length===2&&rig.arms.every(a=>a.rotation.x< -1)&&rig.knees.every(k=>id==='motorcycle'?k.rotation.x>1:k.rotation.x<.3);},id));
   const wheel=await f.evaluate(()=>InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.wheels[0].rotation.x);
   await f.evaluate(async()=>{for(let i=0;i<8;i++){await InsectApp.send('move',{x:1,z:0});await new Promise(r=>setTimeout(r,100));}await InsectApp.send('move',{x:0,z:0});});
   assert.notEqual(await f.evaluate(()=>InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.wheels[0].rotation.x),wheel);
   await page.screenshot({path:path.join(output,'adventure-ride-'+id+'.png')});await f.locator('.ix-sprint[data-act="mount"]').click();assert.equal(a.mount,'');
 }
 assert(await f.locator('.ix-radar').isVisible());assert(await f.evaluate(()=>{const radar=document.querySelector('.ix-radar').getBoundingClientRect(),nav=document.querySelector('.ix-nav').getBoundingClientRect();return radar.right<=innerWidth&&radar.bottom<=innerHeight&&(radar.bottom<nav.top||radar.top>nav.bottom||radar.left>nav.right);}), '레이더와 메뉴 겹침 없음');
 const resource=room.resources[0];a.x=resource.x;a.z=resource.z;await publish();await f.evaluate(()=>InsectApp.ui.setSelection({type:'resource',id:'berries-camp'}));
 await f.locator('[data-act="gather"]').click();await f.locator('[aria-label="획득 알림"]').waitFor();await centered();
 assert.match(await f.locator('[aria-label="획득 알림"]').innerText(),/숲 열매를 채집했습니다/);
 await page.screenshot({path:path.join(output,'adventure-gather-portrait.png')});await f.locator('[data-act="close-reward"]').click();
 await f.locator('[data-act="panel"][data-value="collection"]').first().click();await f.locator('[data-value="fusion"]').click();
 await f.locator('[data-act="fuse-review"]').first().click();await centered();
 assert.match(await f.locator('[aria-label="조합 확인"]').innerText(),/폭우울림매미/);
 await page.screenshot({path:path.join(output,'adventure-fusion-confirm.png')});await f.locator('[data-act="confirm-fuse"]').click();
 await f.locator('[aria-label="획득 알림"]').waitFor();assert.equal(a.profile.collection[0].speciesId,'storm_cicada');assert.equal(a.profile.collection[0].level,10);
 await f.locator('[data-act="close-reward"]').click();await f.locator('[data-act="close-panel"]').click();
 await f.locator('[data-value="map"]').click();
 assert(await f.evaluate(()=>Array.from(document.querySelectorAll('.ix-map-region')).every(el=>el.clientHeight>=54)),'지도 지역 이름과 이동 버튼이 접히지 않음');
 await page.screenshot({path:path.join(output,'adventure-map-mobile.png')});
 if(a.regionId==='grassland')await f.locator('[data-act="close-panel"]').click();
 else{await f.locator('[data-act="map-travel"][data-id="grassland"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().regionId==='grassland');}
 const pack=room.spawns.find(s=>s.id==='group-grassland');a.x=pack.x;a.z=pack.z+2;await publish();await f.evaluate(()=>InsectApp.ui.setSelection({type:'spawn',id:'group-grassland'}));
 assert(await f.evaluate(()=>InsectApp.world.scene.transformNodes.filter(n=>n.name.startsWith('creature-group-grassland')).length===3),'필드 무리 3마리 렌더');
 await f.locator('[data-act="encounter"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.sides.b.team.length===3);
 assert.equal(await f.locator('.ix-battle-rosters span').count(),6);assert.equal(await f.locator('[data-act="auto-battle"]').getAttribute('aria-pressed'),'true');
 assert.equal(await f.evaluate(()=>InsectApp.world.scene.transformNodes.filter(n=>n.metadata?.reserve).length),4);
 await f.locator('[data-act="auto-battle"]').click();assert.equal(room.battles.get(a.battleId).state.sides.a.auto,false);await page.screenshot({path:path.join(output,'adventure-group-battle.png')});
 await f.locator('[data-action="retreat"]').click();await f.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:30000});await f.locator('[data-act="return"]').click();assert(pack.available&&!pack.reservedBy);
 const target=room.spawns.find(s=>s.id==='tutorial-1');a.x=target.x;a.z=target.z+2;await publish();await f.evaluate(()=>InsectApp.ui.setSelection({type:'spawn',id:'tutorial-1'}));await f.locator('[data-act="encounter"]').click();
 await f.waitForFunction(()=>!!InsectApp.getSnapshot().battle);
 assert(await f.evaluate(()=>InsectAudio.isMusicPlaying()),'전투 진입 시 배경음악 시작');
 await f.evaluate(()=>{InsectAudio.toggle();});assert.equal(await f.evaluate(()=>InsectAudio.isMusicPlaying()),false);await f.evaluate(()=>InsectAudio.toggle());assert(await f.evaluate(()=>InsectAudio.isMusicPlaying()));
 await f.evaluate(()=>{window.fxFrames=0;window.projectileFrames=0;window.motionFrames=0;window.notesBefore=audioNotes;InsectApp.world.scene.onAfterRenderObservable.add(()=>{if(InsectApp.world.scene.transformNodes.some(n=>n.name.startsWith('skill-effect-')))fxFrames++;if(InsectApp.world.scene.meshes.some(n=>n.name==='skill-projectile'))projectileFrames++;const actor=InsectApp.world.scene.transformNodes.find(n=>n.metadata?.side==='player');if(actor&&actor.position.x>-4)motionFrames++;});});
 await f.locator('[data-action="skill"]').click();await f.locator('.ix-skill-banner').waitFor();await page.waitForTimeout(260);await page.screenshot({path:path.join(output,'adventure-skill.png')});
 await f.locator('[aria-label="획득 알림"]').waitFor({timeout:30000});await centered();
 assert(await f.evaluate(()=>fxFrames>0&&projectileFrames>0&&motionFrames===0&&audioNotes>notesBefore),'원거리 기술은 제자리에서 투사체·효과·오디오 재생');
 assert(await f.evaluate(()=>!InsectAudio.isMusicPlaying()&&playedSounds.includes('victory')),'승리 후 음악 종료와 승리 효과음');
 await page.screenshot({path:path.join(output,'adventure-capture.png')});await f.locator('[data-act="close-reward"]').click();await f.locator('[data-act="return"]').click();await f.waitForFunction(()=>!InsectApp.getSnapshot().battle);
 await page.waitForTimeout(1100);assert.equal(await f.locator('[aria-label="획득 알림"]').count(),0,'닫은 보상창 재등장 방지');
 await page.setViewportSize({width:844,height:390});
 await f.evaluate(()=>InsectApp.send('travel',{biomeId:'cave'}));await f.waitForFunction(()=>InsectApp.getSnapshot().locationName==='울림 동굴');
 assert(await f.evaluate(()=>InsectApp.world.scene.transformNodes.some(n=>n.metadata?.id==='original'&&n.metadata?.targetZ>118)),'확장된 동굴 위치까지 실제 캐릭터 렌더 이동');
 const boss=room.spawns.find(s=>s.id==='boss-cave');a.x=boss.x+4;a.z=boss.z+2;await publish();await page.waitForTimeout(600);
 await page.screenshot({path:path.join(output,'adventure-dinosaur-cave.png')});
 await f.evaluate(()=>InsectApp.ui.setSelection({type:'spawn',id:'boss-cave'}));await f.locator('[data-act="encounter"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.boss);
 assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().battle.sides.b.team[0].speciesId),'ancient_rex');
 await page.screenshot({path:path.join(output,'adventure-rex-battle.png')});
 for(let turn=0;turn<10;turn++){
   if(await f.evaluate(()=>InsectApp.getSnapshot().battle.status==='finished'))break;
   const prior=await f.evaluate(()=>InsectApp.getSnapshot().battle.turn);await f.locator('[data-action="attack"]').click();await f.waitForFunction(prior=>InsectApp.getSnapshot().battle.status==='finished'||InsectApp.getSnapshot().battle.turn>prior,prior);await f.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:30000});
 }
 assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().battle.result.winner),'b');assert(await f.evaluate(()=>!InsectAudio.isMusicPlaying()&&playedSounds.includes('defeat')),'패배 후 음악 종료와 패배 효과음');
 await page.screenshot({path:path.join(output,'adventure-defeat.png')});await f.locator('[data-act="return"]').click();await f.waitForFunction(()=>!InsectApp.getSnapshot().battle);
 const second=await open('bob',false),b=room.players.get('bob');assert.deepEqual({x:b.x,z:b.z},Data.startVillage);
 a.x=30;a.z=30;b.x=34;b.z=30;await publish();
 await f.evaluate(()=>InsectApp.ui.setSelection({type:'player',id:'bob'}));await f.locator('[data-act="challenge"]').click();await second.frame.locator('[data-act="respond"][data-value="true"]').waitFor();
 await second.page.screenshot({path:path.join(output,'adventure-duel-desktop.png')});await second.frame.locator('[data-act="respond"][data-value="true"]').click();
 await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.type==='pvp');await second.frame.waitForFunction(()=>InsectApp.getSnapshot().battle?.type==='pvp');assert.equal(a.battleId,b.battleId);
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:path.join(output,'adventure-battle-landscape.png')});
 assert.deepEqual(errors,[]);console.log('브라우저 통과: 세로폰 강제가로·동일 마을·중앙 채집/포획·조합 확인/성장·8보스 지도·실시간 길 안내·기술 모션/이펙트/오디오·PC와 모바일 같은 방 대전.');
 }catch(e){if(page)await page.screenshot({path:path.join(output,'adventure-failure.png')}).catch(()=>{});throw e;}finally{if(browser)await browser.close();await game.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
