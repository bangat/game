'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const base='http://127.0.0.1:4193',output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'/대기실.html?emulator=1');
  await page.waitForFunction(()=>document.querySelector('#my-profile-nickname').textContent!=='...');
  await page.click('#create-room-btn');await page.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'}).click();
  await page.waitForSelector('#start-game-btn:enabled');await page.click('#start-game-btn');
  await page.waitForURL('**/insect_expedition/index.html?roomId=*');await page.waitForFunction(()=>window.InsectApp?.ready);
  await page.screenshot({path:path.join(output,'character-mobile.png')});
  await page.locator('#character-miner').tap();await page.locator('#enter-world').tap();
  await page.waitForFunction(()=>InsectApp.getSnapshot().profile.characterId==='miner');
  const stick=page.locator('[aria-label="이동 스틱"]');await stick.waitFor({state:'visible'});
  const box=await stick.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(page);
  const before=await page.evaluate(()=>{const s=InsectApp.getSnapshot();return {p:s.players.find(p=>p.uid===s.you),alpha:InsectApp.world.camera.alpha};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+28,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+28,y,id:1},{x:310,y:400,id:2}]});
  for(let n=0;n<5;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+28,y,id:1},{x:310-n*15,y:400+n*3,id:2}]});await page.waitForTimeout(120);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);
  const after=await page.evaluate(()=>{const s=InsectApp.getSnapshot();return {p:s.players.find(p=>p.uid===s.you),alpha:InsectApp.world.camera.alpha};});
  assert(Math.hypot(after.p.x-before.p.x,after.p.z-before.p.z)>1,'이동 스틱 실제 서버 이동');assert(Math.abs(after.alpha-before.alpha)>.01,'동시에 두 번째 손가락으로 카메라 회전');
  await page.evaluate(()=>{
    const s=InsectApp.getSnapshot(),me=s.players.find(p=>p.uid===s.you);
    const nearest=s.spawns.filter(spawn=>spawn.available).sort((a,b)=>Math.hypot(a.x-me.x,a.z-me.z)-Math.hypot(b.x-me.x,b.z-me.z))[0];
    InsectApp.world.camera.alpha=Math.atan2(me.z-nearest.z,me.x-nearest.x);
    InsectApp.world.camera.radius=20;
  });
  await page.waitForTimeout(400);
  const target = await page.evaluate(()=>{
    const scene=InsectApp.world.scene,engine=scene.getEngine(),viewport=scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
    for(const spawn of InsectApp.getSnapshot().spawns){
      const node=scene.getTransformNodeByName('creature-'+spawn.id);if(!node)continue;
      const point=BABYLON.Vector3.Project(node.getAbsolutePosition().add(new BABYLON.Vector3(0,.7,0)),BABYLON.Matrix.Identity(),scene.getTransformMatrix(),viewport);
      if(point.x<25||point.x>innerWidth-100||point.y<200||point.y>innerHeight-180)continue;
      const pick=scene.pick(point.x,point.y,mesh=>mesh.metadata?.selectTarget?.type==='spawn');
      if(pick.hit)return {x:point.x,y:point.y};
    }
    return null;
  });
  assert(target,'화면에서 선택 가능한 실제 곤충 모델');
  await page.touchscreen.tap(target.x,target.y);
  assert(await page.evaluate(()=>{
    const s=InsectApp.getSnapshot(),me=s.players.find(p=>p.uid===s.you);
    return [...document.querySelectorAll('[data-act="collect"], [data-act="encounter"]')].every(button=>{
      const spawn=s.spawns.find(spawn=>spawn.id===button.dataset.id);
      return spawn && Math.hypot(spawn.x-me.x,spawn.z-me.z)<=(spawn.field?7:4);
    });
  }),'거리 안에서만 채집·전투 안내');
  await page.locator('[data-act="panel"][data-value="collection"]').tap();
  await page.screenshot({path:path.join(output,'collection-mobile.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-act="close-panel"]').tap();
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);
  await page.screenshot({path:path.join(output,'exploration-landscape.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.reload();await page.waitForFunction(()=>window.InsectApp?.ready);
  assert.equal(await page.evaluate(()=>InsectApp.getSnapshot().profile.characterId),'miner');
  assert.equal(await page.evaluate(()=>localStorage.getItem('insectExpedition.character.v1')),'miner');
  assert(await page.locator('#character-miner').evaluate(el=>el.classList.contains('is-selected')));
  await page.locator('#enter-world').tap();await page.locator('[data-act="exit"]').tap();await page.waitForURL(url=>decodeURIComponent(url.pathname)==='/대기실.html');
  assert.deepEqual(errors,[]);console.log('통과: 모바일 실제 동시 터치 이동·카메라, 세로·가로, 수집 목록, 캐릭터 저장 복원, 대기실 복귀.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
