'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../server/index.cjs'),{PUBLIC_ROOM_ID}=require('../server/auth.cjs');
const out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});let offset=0;
const game=createGameServer({now:()=>Date.now()+offset,rng:()=>.05,authority:{verifyToken:async uid=>({uid}),getRoom:async()=>null},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'zombie-ui-')),'db.json')});let browser,page;const errors=[];
(async()=>{try{
 const profile=game.store.get('alice');profile.adventurerName='하나';profile.characterCreated=true;profile.team=[profile.collection[0].id];game.store.save(profile);
 const addr=await game.listen(0,'127.0.0.1');browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`window.firebase ||= {apps:[{}],auth:()=>({onAuthStateChanged(fn){queueMicrotask(()=>fn({uid:'alice',getIdToken:async()=> 'alice'}));return ()=>{};}})};`}));
 page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('브라우저 오류:',e.stack);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:'+addr.port+'/insect_expedition/index.html');let f=await(await page.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.InsectApp?.ready,null,{timeout:60000});
 const room=game.rooms.get(PUBLIC_ROOM_ID),player=room.players.get('alice'),zombie=room.zombies.find(z=>z.regionId==='safe');
 function place(dx=13){player.x=zombie.home.x+dx;player.z=zombie.home.z;Object.assign(zombie,{...zombie.home,targetUid:null,mode:'idle',available:true});}
 await f.locator('#game-canvas').press('Shift');
 place();await f.waitForFunction(()=>InsectApp.getSnapshot().zombies.some(z=>z.mode==='chase'));await f.locator('.ix-zombie-tint:not([hidden])').waitFor();assert.match(await f.locator('.ix-zombie-notice').innerText(),/쫓아옵니다/);
 await f.waitForFunction(()=>{const a=InsectAudio.getStatus();return a.state==='running'&&a.musicMode==='chase'&&a.rms>.001;});
 place(17);await f.evaluate(()=>InsectApp.send('sound'));await page.waitForTimeout(300);assert(await f.evaluate(()=>{const a=InsectAudio.getStatus();return !a.enabled&&!a.musicPlaying&&a.voices===0;}));
 await f.evaluate(()=>InsectApp.send('sound'));await f.waitForFunction(()=>InsectAudio.getStatus().musicMode==='chase'&&InsectAudio.getStatus().rms>.001);
 player.x=0;player.z=0;await f.waitForFunction(()=>!InsectAudio.getStatus().chaseActive&&!InsectAudio.isMusicPlaying());
 place(17);await f.waitForFunction(()=>InsectAudio.getStatus().musicMode==='chase');
 assert(await f.evaluate(()=>InsectApp.world.scene.meshes.some(m=>m.name==='zombie-alert'&&m.isEnabled())));
 for(const size of [{width:1440,height:1000},{width:844,height:390},{width:390,height:844}]){
  place(17);await page.setViewportSize(size);await page.waitForTimeout(550);await f.locator('.ix-zombie-tint:not([hidden])').waitFor();await page.screenshot({path:path.join(out,'zombie-chase-'+size.width+'.png')});
  assert(await f.evaluate(()=>{const e=document.querySelector('.ix-zombie-notice'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&getComputedStyle(document.querySelector('.ix-zombie-tint')).pointerEvents==='none';}));
 }
 await page.setViewportSize({width:1440,height:1000});place(1);await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.zombie);assert.match(await f.locator('.ix-battle header').innerText(),/좀비 습격/);
 await f.waitForFunction(()=>InsectAudio.getStatus().musicMode==='battle'&&!InsectAudio.getStatus().chaseActive);
 const record=room.battles.get(player.battleId);record.state.sides.a.team.forEach(c=>{c.hp=1;c.attack=1;c.defense=0;c.speed=1;});record.state.sides.b.team.forEach(c=>{c.attack=999;c.speed=999;});record.nextAutoAt=0;
 await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.status==='finished'&&!InsectApp.isAnimating(),null,{timeout:30000});await page.screenshot({path:path.join(out,'zombie-defeat.png')});
 const deadline=player.profile.movementLockedUntil;assert(deadline>Date.now()+offset);await f.locator('[data-act="return"]').click();await f.locator('.ix-zombie-notice.is-recovering:not([hidden])').waitFor();
 const before={x:player.x,z:player.z};await f.evaluate(()=>InsectApp.send('move',{x:1,z:0}));assert.deepEqual({x:player.x,z:player.z},before);
 await page.reload();f=await(await page.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.InsectApp?.ready,null,{timeout:60000});assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().profile.movementLockedUntil),deadline);await f.locator('.ix-zombie-notice.is-recovering:not([hidden])').waitFor();
 for(const size of [{width:1440,height:1000},{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'zombie-recovery-'+size.width+'.png')});assert.match(await f.locator('.ix-zombie-notice').innerText(),/이동 가능까지 \d+초/);}
 offset+=31000;await f.waitForFunction(()=>InsectApp.getSnapshot().serverTime>=InsectApp.getSnapshot().profile.movementLockedUntil);await f.locator('.ix-zombie-notice').waitFor({state:'hidden'});const result=await f.evaluate(()=>InsectApp.send('move',{x:1,z:0}));assert(result.changed);
 assert(await f.evaluate(()=>!InsectAudio.isMusicPlaying()));assert.deepEqual(errors,[]);console.log('실제 브라우저: 공포 음악 실제 파형·음소거·추격 해제·전투 음악 전환·빨간 화면 가장자리·빨간 느낌표·추격·자동 접촉 전투·실제 패배·30초 제한·재접속·제한 해제·PC/모바일 가로세로 검증 완료');
 }catch(e){if(page)await page.screenshot({path:path.join(out,'zombie-failure.png')}).catch(()=>{});throw e;}finally{await browser?.close();await game.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
