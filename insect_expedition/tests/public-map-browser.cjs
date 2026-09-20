'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
process.env.INSECT_EMULATOR='1';process.env.GCLOUD_PROJECT='demo-sky-tower';
const {createGameServer}=require('../server/index.cjs'),{PUBLIC_ROOM_ID}=require('../server/auth.cjs'),Data=require('../shared/data.js');
const game=createGameServer({dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'public-browser-')),'db.json')});
const out=path.join(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});let browser,page;const users=[],errors=[];
(async()=>{try{
 const addr=await game.listen(0,'127.0.0.1'),base='http://127.0.0.1:'+addr.port;browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/대기실.html?emulator=1');await page.waitForFunction(()=>window.InsectAuthReady);await page.evaluate(()=>InsectAuthReady);await page.locator('#insect-public-open').waitFor();
 const uid=await page.evaluate(()=>firebase.auth().currentUser.uid);users.push(uid);
 const p=game.store.get(uid,'하나');p.characterCreated=true;p.adventurerName='하나';p.discoveries=Data.species.map(s=>s.id);p.mounts={owned:['motorcycle'],equipped:'motorcycle'};game.store.save(p);
 await page.locator('#insect-public-open').click();await page.locator('#insect-public-modal.active').waitFor();await page.screenshot({path:path.join(out,'public-lobby-desktop.png')});
 await page.locator('#insect-public-join').click();await page.waitForURL('**/insect_expedition/index.html');let f=await(await page.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.InsectApp?.ready,null,{timeout:60000});
 assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().worldId),PUBLIC_ROOM_ID);assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().regionId),'safe');
 const other=await browser.newContext({viewport:{width:1000,height:700}}),page2=await other.newPage();page2.on('pageerror',e=>errors.push(e.message));
 await page2.goto(base+'/대기실.html?emulator=1');await page2.waitForFunction(()=>window.InsectAuthReady);await page2.evaluate(()=>InsectAuthReady);const uid2=await page2.evaluate(()=>firebase.auth().currentUser.uid);users.push(uid2);const q=game.store.get(uid2,'두리');q.characterCreated=true;q.adventurerName='두리';game.store.save(q);
 await page2.locator('#create-room-btn').click();const option=page2.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'});await option.click();await page2.locator('#insect-public-join').click();await page2.waitForURL('**/insect_expedition/index.html');const f2=await(await page2.locator('#game-frame').elementHandle()).contentFrame();await f2.waitForFunction(()=>window.InsectApp?.ready,null,{timeout:60000});await f.waitForFunction(()=>InsectApp.getSnapshot().players.length===2);
 assert.equal(game.rooms.size,1);
 await f.locator('.ix-location').click();await f.locator('[data-act="map-travel"][data-id="forest"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().regionId==='forest');await f2.waitForFunction(()=>InsectApp.getSnapshot().regionPopulation.forest===1);
 await f2.locator('.ix-location').click();assert.match(await f2.locator('[data-act="map-travel"][data-id="forest"]').innerText(),/1명 탐험/);await f2.locator('[data-act="map-travel"][data-id="forest"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().players.length===2);
 assert.equal(await f.evaluate(()=>InsectApp.world.scene.meshes.filter(m=>m.name==='portal-ring'||m.name==='portal-surface').length),0);
 await f.locator('.ix-nav [data-value="map"]').click();await f.locator('[data-act="map-travel"][data-id="quarry"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().regionId==='quarry');assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().players.find(p=>p.uid===InsectApp.getSnapshot().you).mount),'motorcycle');
 await page.reload();f=await(await page.locator('#game-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.InsectApp?.ready,null,{timeout:60000});assert.equal(await f.evaluate(()=>InsectApp.getSnapshot().regionId),'quarry');
 for(const size of [{width:1440,height:1000},{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(size);await page.waitForTimeout(700);await f.locator('.ix-nav [data-value="map"]').click();await page.waitForTimeout(300);
  const map=await f.evaluate(()=>{const r=document.querySelector('.ix-drawer').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth};});assert(map.left>=0&&map.top>=0&&map.right<=map.w+1&&map.bottom<=map.h+1,JSON.stringify(map));assert(map.scroll<=map.w+1);await page.screenshot({path:path.join(out,'public-map-'+size.width+'.png')});await f.locator('[data-act="close-panel"]').click();
  await f.locator('[data-value="encyclopedia"]').click();await page.waitForTimeout(300);const widths=await f.locator('.eco-dex-hint').evaluateAll(elements=>elements.map(e=>({hint:e.clientWidth,card:e.parentElement.clientWidth,height:e.clientHeight})));assert(widths.every(x=>x.hint>x.card*.7),JSON.stringify(widths));assert(widths.every(x=>x.height<160));await page.screenshot({path:path.join(out,'public-dex-'+size.width+'.png')});await f.locator('[data-act="close-panel"]').click();
  const label=await f.locator('.ix-location').innerText();assert.match(label,/현재 지역/);assert.match(label,/채석장/);assert.match(label,/이 지역 1명/);await page.screenshot({path:path.join(out,'public-field-'+size.width+'.png')});
  assert(await f.evaluate(()=>{const a=document.querySelector('.ix-top').getBoundingClientRect(),b=document.querySelector('.ix-nav').getBoundingClientRect();return a.bottom<=b.top;}),'상단 위치 표시와 메뉴 겹침');
 }
 await f.locator('[data-act="town-return"]').click();await f.waitForFunction(()=>InsectApp.getSnapshot().regionId==='safe');
 await f.locator('[data-act="exit"]').click();await page.waitForURL(url=>decodeURIComponent(url.pathname).endsWith('/대기실.html'));await f2.waitForFunction(()=>InsectApp.getSnapshot().onlineCount===1);assert.equal(await f2.evaluate(()=>InsectApp.getSnapshot().regionId),'forest');
 await page.locator('#insect-public-open').click();await page.screenshot({path:path.join(out,'public-lobby-mobile.png')});
 assert.deepEqual(errors,[]);console.log('공용 참가 2개 브라우저·다른 지역에서 합류·포탈 제거·직접 지도 이동·탑승 유지·재접속·퇴장 인원·PC/모바일 지도·도감 너비·한글 확인 완료');
 }catch(e){if(page)await page.screenshot({path:path.join(out,'public-map-failure.png')}).catch(()=>{});throw e;}finally{
 await browser?.close();const {getDatabase}=require('firebase-admin/database'),{getAuth}=require('firebase-admin/auth');
 for(const uid of users){await getDatabase().ref('users/'+uid).remove();await getAuth().deleteUser(uid);}
 await game.close();
 }} )().catch(e=>{console.error(e.stack);process.exitCode=1;});
