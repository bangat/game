'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../server/index.cjs'),Data=require('../shared/data.js'),Battle=require('../shared/battle.cjs');
const out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});
const game=createGameServer({authority:{verifyToken:async token=>({uid:token}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'}}})},dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'expedition-v11-')),'db.json'),rng:()=>.5});
let browser,page;
(async()=>{try{
 const profile=await game.store.get('alice','하나');profile.supplies.feeds=50;profile.gold=500;profile.resources.crystal=6;profile.resources.ore=2;profile.adventurerName='하나';
 profile.collection.forEach(c=>{c.level=25;c.hp=Battle.statsForCreature(c).maxHealth;});await game.store.save(profile);
 const address=await game.listen(0,'127.0.0.1');browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`window.firebase ||= {apps:[{}],auth:()=>({onAuthStateChanged(fn){queueMicrotask(()=>fn({uid:'alice',getIdToken:async()=>'alice'}));return ()=>{};}}),database:()=>({ref:()=>({once:async()=>({val:()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'}}})})})})};`}));
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+address.port+'/insect_expedition/index.html?roomId=expedition');
 const f=await(await page.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>InsectApp?.ready);
 await f.locator('#explorer-name').fill('하나');await f.locator('#enter-world').click();
 const room=game.rooms.get('expedition'),player=room.players.get('alice');
 const send=(name,payload={})=>f.evaluate(({name,payload})=>InsectApp.send(name,payload),{name,payload});
 async function settle(){await page.waitForTimeout(550);}
 for(const size of [{width:844,height:390},{width:1728,height:1438},{width:1280,height:800},{width:390,height:844}]){
   await page.setViewportSize(size);await settle();
   assert(await f.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),a=rect('.ix-nav'),b=rect('.ix-radar'),c=rect('.ix-top'),d=rect('.ix-team');const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return !overlap(a,b)&&!overlap(a,c)&&!overlap(a,d)&&a.right<=innerWidth&&b.bottom<=innerHeight&&c.left>=0&&c.right<=innerWidth;}),'HUD 겹침 '+JSON.stringify(size));
   await page.screenshot({path:path.join(out,'expedition-hud-'+size.width+'.png')});
 }
 await page.setViewportSize({width:844,height:390});
 await f.locator('[data-value="collection"]').first().click();
 await f.locator('[data-act="feed"][data-count="10"]').first().click();await f.waitForFunction(()=>InsectApp.getSnapshot().profile.supplies.feeds===40);
 await page.waitForTimeout(450);await f.locator('[data-act="feed"][data-count="all"]').first().click();await f.waitForFunction(()=>InsectApp.getSnapshot().profile.supplies.feeds===0);
 await page.screenshot({path:path.join(out,'expedition-feed.png')});await f.locator('[data-act="close-panel"]').click();
 await page.waitForTimeout(450);const before=player.profile.resources.crystal;await send('sell-materials');assert.equal(player.profile.resources.crystal,before);assert.equal(player.profile.resources.ore,0);
 for(const id of ['egg-0','egg-1']){const n=room.resources.find(n=>n.id===id);player.x=n.x;player.z=n.z+2;await page.waitForTimeout(650);await send('gather',{nodeId:id});}
 await f.locator('[data-value="research"]').click();await f.locator('[data-act="incubate"]').first().click();await f.waitForFunction(()=>InsectApp.getSnapshot().profile.expedition.eggs[0].incubating);
 await page.waitForTimeout(450);await f.locator('[data-act="incubate"]').first().click();await f.waitForFunction(()=>InsectApp.getSnapshot().profile.resources.crystal===0);
 await page.screenshot({path:path.join(out,'expedition-eggs.png')});await f.locator('[data-act="close-panel"]').click();
 // 실제 자동 타이머를 기다리며 행동 명령을 보내지 않는다.
 const spawn=room.spawns.find(s=>s.id==='group-grassland');player.x=spawn.x;player.z=spawn.z+2;
 await send('encounter',{spawnId:spawn.id});const record=room.battles.get(player.battleId);
 record.state.sides.b.team.forEach(c=>{c.hp=c.maxHp=300;});
 await f.waitForFunction(()=>InsectApp.getSnapshot().battle?.turn>=4,null,{timeout:23000});
 assert(record.state.turn>=4,'공격 버튼 없이 3턴');
 await page.screenshot({path:path.join(out,'expedition-auto-battle.png')});
 assert.equal(await f.evaluate(()=>InsectApp.world.scene.transformNodes.filter(n=>n.metadata?.creatureId&&n.name.startsWith('creature-arena-')).length),6);
 await send('auto-battle',{enabled:false});await f.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:20000});
 await send('action',{battleId:record.id,turn:record.state.turn,action:{type:'retreat'}});await f.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:20000});await send('return');
 const egg=player.profile.expedition.eggs[0];assert(egg.progress===0,'도주로 부화 보상을 얻지 않음');
 // 실이동으로 온기를 채운 뒤 재접속 저장과 부화 UI를 검증한다.
 player.x=30;player.z=30;player.lastMoveAt=Date.now()-250;player.profile.expedition.walk=79.9;await f.locator('#game-canvas').focus();await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');await page.waitForTimeout(200);assert.equal(player.profile.expedition.eggs[0].progress,1);
 player.profile.expedition.eggs[0].progress=Data.eggKinds[egg.kind].steps;await game.store.save(player.profile);await send('heal');
 await f.locator('[data-value="research"]').click();await f.locator('[data-act="hatch"]:enabled').first().click();await f.locator('[aria-label="획득 알림"]').waitFor();
 assert.equal(player.profile.expedition.hatched,1);assert(player.profile.collection.some(c=>Data.speciesById[c.speciesId].eggOnly&&c.level===1));
 await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'expedition-hatched.png')});await f.locator('[data-act="close-reward"]').click();await f.locator('[data-act="close-panel"]').click();
 player.profile.expedition.bosses=['boss-grassland'];await game.store.save(player.profile);await page.waitForTimeout(1100);await send('heal');await f.locator('[data-value="research"]').click();await f.locator('[data-act="research-claim"][data-id="first-boss"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().profile.expedition.claimed.includes('first-boss'));await f.locator('[data-act="close-panel"]').click();
 for(const biomeId of ['mine','nest','sanctum']){await page.waitForTimeout(1250);await send('travel',{biomeId});await settle();await page.screenshot({path:path.join(out,'expedition-'+biomeId+'.png')});}
 const boss=room.spawns.find(s=>s.id==='boss-sanctum');player.x=boss.x;player.z=boss.z+2;await assert.rejects(send('encounter',{spawnId:boss.id}),/지역 보스/);
 await page.reload();const again=await(await page.locator('#game-frame').elementHandle()).contentFrame();await again.waitForFunction(()=>InsectApp?.ready);const restored=await again.evaluate(()=>InsectApp.getSnapshot().profile);assert.equal(restored.expedition.hatched,1);assert(restored.expedition.claimed.includes('first-boss'));assert.equal(restored.expedition.eggs.length,1);
 assert.deepEqual(errors,[]);console.log('확인 완료: 4개 화면 비율, 사료 10개/모두, 보호 재료 판매 제외, 알 발굴·동시 부화·실이동 온기·부화 수령·연구 보상·재접속, 입력 없는 자동 3턴과 6마리 렌더, 성역 잠금.');
}catch(e){if(page)await page.screenshot({path:path.join(out,'expedition-failure.png')}).catch(()=>{});throw e;}finally{await browser?.close();await game.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
