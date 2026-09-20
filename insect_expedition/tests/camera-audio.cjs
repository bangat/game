'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.INSECT_TEST_BASE || 'http://127.0.0.1:4193';
const output = path.resolve(__dirname, '../test-output');
fs.mkdirSync(output, {recursive:true});
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
  await page.addInitScript(() => {
    window.audioProbe = {started:0,ended:0,running:false,peak:0};
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = original.call(this), start = source.start.bind(source);
      source.start = (...args) => {
        audioProbe.started++; audioProbe.running = this.state === 'running';
        const analyser = this.createAnalyser(); analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const timer = setInterval(() => { analyser.getFloatTimeDomainData(samples); audioProbe.peak = Math.max(audioProbe.peak,...samples.map(Math.abs)); }, 10);
        source.addEventListener('ended', () => {audioProbe.ended++; clearInterval(timer); analyser.disconnect();});
        return start(...args);
      };
      return source;
    };
  });
  try {
    await page.goto(base+'/대기실.html?emulator=1');
    await page.waitForFunction(()=>document.querySelector('#my-profile-nickname')?.textContent!=='...');
    await page.click('#create-room-btn'); await page.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'}).click();
    await page.waitForSelector('#start-game-btn:enabled'); await page.click('#start-game-btn');
    await page.waitForFunction(()=>window.InsectApp?.ready); await page.locator('#enter-world').tap();
    assert.equal(await page.locator('#insect-local-connection-error').count(),0,'새 접속 로그인과 게임 진입');
    assert.equal(await page.evaluate(()=>InsectApp.world.camera.radius),24,'기본 시점');
    const cdp=await page.context().newCDPSession(page);
    async function pinch(start,end) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195-start/2,y:400,id:1},{x:195+start/2,y:400,id:2}]});
      for(let i=1;i<=8;i++){const distance=start+(end-start)*i/8;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195-distance/2,y:400,id:1},{x:195+distance/2,y:400,id:2}]});await page.waitForTimeout(25);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
    }
    const alpha=await page.evaluate(()=>InsectApp.world.camera.alpha);
    await pinch(200,80); assert.equal(await page.evaluate(()=>InsectApp.world.camera.radius),48,'두 손가락 모으기로 축소하고 최대 거리 제한');
    assert.equal(await page.evaluate(()=>InsectApp.world.camera.alpha),alpha,'핀치 중 회전 없음');
    await page.screenshot({path:path.join(output,'camera-mobile-wide.png')});
    await pinch(80,160); assert(Math.abs(await page.evaluate(()=>InsectApp.world.camera.radius)-24)<0.1,'두 손가락 벌리기로 확대');
    await pinch(200,150); const saved=await page.evaluate(()=>InsectApp.world.camera.radius);
    await page.reload(); await page.waitForFunction(()=>InsectApp.ready); await page.locator('#enter-world').tap();
    assert(Math.abs(await page.evaluate(()=>InsectApp.world.camera.radius)-saved)<0.1,'새로고침 후 시점 거리 복원');
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>audioProbe.started),0,'정지 상태는 발소리 없음');
    await page.keyboard.down('KeyS');await page.waitForTimeout(1400);await page.keyboard.up('KeyS');
    await page.waitForTimeout(500);
    const sound=await page.evaluate(()=>audioProbe);
    assert(sound.started>=2 && sound.running && sound.peak>0.01,'실제 Web Audio에서 발소리 신호 생성');
    assert.equal(sound.ended,sound.started,'발소리 버퍼 종료와 정리');
    await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>audioProbe.started),sound.started,'정지 후 소리 중단');
    await page.locator('[data-act="sound"]').tap();await page.keyboard.down('KeyS');await page.waitForTimeout(900);await page.keyboard.up('KeyS');
    assert.equal(await page.evaluate(()=>audioProbe.started),sound.started,'음소거 중 발소리 없음');
    await page.locator('[data-act="sound"]').tap();
    const geometry=await page.evaluate(()=>{
      const scene=InsectApp.world.scene;
      const tiles=scene.meshes.filter(m=>m.name.startsWith('biome-')).map(m=>{const b=m.getBoundingInfo().boundingBox;return {min:b.minimumWorld,max:b.maximumWorld};});
      let overlap=false,area=0;
      tiles.forEach((a,i)=>{area+=(a.max.x-a.min.x)*(a.max.z-a.min.z);tiles.slice(i+1).forEach(b=>{if(Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>.001&&Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>.001)overlap=true;});});
      const list=scene.getLightByName('sun').getShadowGenerator().getShadowMap().renderList;
      return {tiles:tiles.length,overlap,area,labelShadow:list.some(m=>m.name==='label')};
    });
    assert.equal(geometry.tiles,9);assert.equal(geometry.overlap,false,'지역 경계 지면 겹침 없음');assert(Math.abs(geometry.area-240*240)<0.1,'맵 전체 지면 빈틈 없음');assert.equal(geometry.labelShadow,false,'이름표 그림자 제외');
    await page.setViewportSize({width:844,height:390}); await page.screenshot({path:path.join(output,'camera-mobile-landscape.png')});
    assert.deepEqual(errors,[]);
    console.log('통과: 새 접속, 두 손가락 확대·축소·거리 제한·저장, 실제 발소리 신호·정지·음소거, 지면 겹침·빈틈 제거, 이름표 그림자 제외.');
  } finally {
    if(await page.locator('[data-act="exit"]').count()){await page.locator('[data-act="exit"]').click();await page.waitForURL(url=>decodeURIComponent(url.pathname)==='/대기실.html').catch(()=>{});}
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
