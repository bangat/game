'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../server/index.cjs'),A=require('../shared/appearance.js');
const out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});
const dbPath=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'appearance-browser-')),'db.json');
const authority={verifyToken:async uid=>({uid}),getRoom:async()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'},legacy:{nickname:'로비이름'}}})};
let game=createGameServer({authority,dbPath}),browser,page,port;
const errors=[];
async function open(uid,mobile=false){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:850},isMobile:mobile,hasTouch:mobile});await context.addInitScript(uid=>window.fixtureUid=uid,uid);
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:`window.firebase ||= {apps:[{}],auth:()=>({onAuthStateChanged(fn){queueMicrotask(()=>fn({uid:window.fixtureUid,getIdToken:async()=>window.fixtureUid}));return ()=>{};}}),database:()=>({ref:()=>({once:async()=>({val:()=>({gameType:'insectExpedition',status:'playing',players:{alice:{nickname:'하나'},bob:{nickname:'두리'},legacy:{nickname:'로비이름'}}})})})})};`}));
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(`http://127.0.0.1:${port}/insect_expedition/index.html?roomId=styles`);const f=await(await p.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.InsectApp?.ready);return{page:p,frame:f,context};
}
async function bounds(f){assert(await f.evaluate(()=>{const panel=document.querySelector('.ix-wardrobe-card'),save=document.querySelector('[data-editor="save"]'),canvas=document.querySelector('.ix-avatar-studio canvas');return [panel,save,canvas].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&r.width>0&&r.height>30;})&&document.documentElement.scrollWidth<=innerWidth;}),'꾸미기 패널·저장 버튼·3D 미리보기는 화면 안에 있어야 합니다.');}
async function shot(p,name){await p.waitForTimeout(350);await p.screenshot({path:path.join(out,name+'.png')});}
(async()=>{try{
  const legacy=game.store.get('legacy');legacy.adventurerName='오랜친구';legacy.characterId='botanist';legacy.gold=4321;game.store.save(legacy);
  const alice=game.store.get('alice');alice.mounts={owned:['motorcycle','handcart'],equipped:''};game.store.save(alice);
  port=(await game.listen(0,'127.0.0.1')).port;browser=await chromium.launch({channel:'chrome',headless:true});
  const first=await open('alice');page=first.page;const f=first.frame;
  await f.locator('.ix-wardrobe').waitFor();await bounds(f);await shot(page,'appearance-create-desktop');
  await f.locator('#enter-world').click();assert.match(await f.locator('.ix-style-error').innerText(),/이름/);
  await f.locator('[data-editor="preset"][data-index="1"]').click();await f.locator('#explorer-name').fill('하나');await f.locator('#enter-world').click();await f.locator('.ix-wardrobe').waitFor({state:'detached'});await f.locator('[data-act="customize"]').waitFor();
  const player=game.rooms.get('styles').players.get('alice');assert.equal(player.profile.appearance.body,'girl');assert.equal(player.profile.adventurerName,'하나');
  // Desktop preview uses the same model, then cancelling must not change the saved outfit.
  await f.locator('[data-act="customize"]').click();assert.equal(await f.locator('#explorer-name').count(),0);assert.equal(await f.locator('[data-key="body"]').count(),0);
  await f.locator('[data-editor="preset"][data-index="2"]').click();
  const originalSave=game.store.save;game.store.save=()=>{throw Error('저장 실패 시험');};await f.locator('#save-appearance').click();await f.waitForFunction(()=>document.querySelector('.ix-style-error')?.textContent.includes('실패'));assert.equal(await f.locator('.ix-wardrobe').count(),1);assert.equal(player.profile.appearance.hairStyle,'twintail');game.store.save=originalSave;
  await f.locator('[data-editor="zoom"]').click();await shot(page,'appearance-face-desktop');await f.locator('[data-editor="cancel"]').first().click();assert.equal(player.profile.appearance.hairStyle,'twintail');
  await f.locator('[data-act="customize"]').click();await f.locator('[data-editor="preset"][data-index="2"]').click();await f.locator('[data-editor="tab"][data-tab="hair"]').click();await f.locator('[data-key="hairStyle"][data-value="ponytail"]').click();await f.locator('[data-key="hairColor"][data-value="#e4a9bb"]').click();
  await f.locator('[data-editor="tab"][data-tab="basic"]').click();await f.locator('#avatar-height').fill('110');
  await shot(page,'appearance-customize-desktop');await f.locator('#save-appearance').click();await f.locator('.ix-wardrobe').waitFor({state:'detached'});assert.equal(player.profile.appearance.hairStyle,'ponytail');assert.equal(player.profile.appearance.height,1.1);assert.equal(player.profile.appearance.body,'girl');
  await f.waitForFunction(()=>InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.appearance.hairStyle==='ponytail');
  const saved=JSON.parse(JSON.stringify(player.profile.appearance));
  // Another player sees the same appearance, including mounted animation.
  const friend=await open('bob',true);await friend.frame.locator('#explorer-name').fill('두리');await bounds(friend.frame);await shot(friend.page,'appearance-create-mobile');await friend.frame.locator('#enter-world').click();await friend.frame.locator('.ix-wardrobe').waitFor({state:'detached'});
  await friend.frame.waitForFunction(()=>InsectApp.world.scene.getTransformNodeByName('avatar-alice')?.metadata.appearance.hairStyle==='ponytail');
  const send=(name,payload={})=>f.evaluate(({name,payload})=>InsectApp.send(name,payload),{name,payload});
  for(const id of ['motorcycle','handcart']){
    await send('mount',{id});await f.waitForFunction(id=>InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.mount===id,id);
    await f.evaluate(()=>{const w=InsectApp.world,a=w.scene.getTransformNodeByName('avatar-local');w.camera.radius=7;w.camera.beta=1.23;w.camera.alpha=Math.PI/2-.6;});await page.waitForTimeout(450);
    assert(await f.evaluate(()=>{const a=InsectApp.world.scene.getTransformNodeByName('avatar-local'),r=a.metadata;return r.appearance.height===1.1&&r.vehicle.parent===a&&r.arms.every(n=>n.rotation.x<-.8)&&r.bodyRoot.scaling.y===1.1;}));await shot(page,'appearance-ride-'+id);
  }
  await send('mount',{id:''});await send('home-travel',{destination:'lumber'});await f.evaluate(()=>{const c=InsectApp.world.camera;c.radius=18;c.beta=.6;c.alpha=-Math.PI/2;});await f.locator('[data-act="gather"]').click();await f.locator('.ix-harvest:not([hidden])').waitFor();await page.waitForTimeout(500);assert(await f.evaluate(()=>InsectApp.world.scene.getTransformNodeByName('harvest-tool')?.parent===InsectApp.world.scene.getTransformNodeByName('avatar-local').metadata.arms[1]));await shot(page,'appearance-harvest');await f.locator('[data-act="close-reward"]').click({timeout:10000});
  await f.locator('[data-act="customize"]').click();
  for(const viewport of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);await page.waitForTimeout(450);await bounds(f);await f.locator('[data-editor="tab"][data-tab="clothes"]').click();await shot(page,'appearance-edit-'+viewport.width);}
  await f.locator('[data-editor="cancel"]').first().click();assert.deepEqual(player.profile.appearance,saved);
  // Reload and an empty browser context both bypass creation entirely.
  await page.reload();const restored=await(await page.locator('#game-frame').elementHandle()).contentFrame();await restored.waitForFunction(()=>window.InsectApp?.ready);await restored.locator('[data-act="customize"]').waitFor();assert.equal(await restored.locator('#explorer-name').count(),0);assert.deepEqual(await restored.evaluate(()=>InsectApp.getSnapshot().profile.appearance),saved);
  const old=await open('legacy');await old.frame.locator('[data-act="customize"]').waitFor();assert.equal(await old.frame.locator('.ix-wardrobe').count(),0);assert.equal(await old.frame.evaluate(()=>InsectApp.getSnapshot().profile.adventurerName),'오랜친구');assert.equal(await old.frame.evaluate(()=>InsectApp.getSnapshot().profile.gold),4321);
  await browser.close();browser=null;await game.close();game=createGameServer({authority,dbPath});await game.listen(port,'127.0.0.1');browser=await chromium.launch({channel:'chrome',headless:true});const clean=await open('alice');await clean.frame.locator('[data-act="customize"]').waitFor();assert.equal(await clean.frame.locator('.ix-wardrobe').count(),0);assert.deepEqual(await clean.frame.evaluate(()=>InsectApp.getSnapshot().profile.appearance),saved);assert.equal(await clean.frame.evaluate(()=>InsectApp.getSnapshot().profile.adventurerName),'하나');
  assert.deepEqual(errors,[]);console.log('캐릭터 화면 검증 통과: 최초 생성·고정 이름·꾸미기 미리보기/취소/저장·다른 플레이어 외형·탈것 2종·벌목 동작·PC/모바일 가로/세로·서버 재시작 및 새 브라우저 복원·콘솔 오류 없음.');
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'appearance-failure.png')}).catch(()=>{});throw error;}finally{await browser?.close();await game.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
