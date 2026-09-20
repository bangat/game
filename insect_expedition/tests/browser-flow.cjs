'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = 'http://127.0.0.1:4193';
const output = path.resolve(__dirname, '../test-output');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const contexts = [], errors = [];
  try {
    async function client(nickname, viewport) {
      const context = await browser.newContext({ viewport: viewport || {width:1440,height:900}, hasTouch: !!viewport, isMobile: !!viewport });
      contexts.push(context); const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(BASE + '/insect_expedition/')) errors.push('자원 오류: ' + response.status() + ' ' + response.url()); });
      page.on('dialog', dialog => dialog.accept());
      await page.addInitScript(name => localStorage.setItem('userNickname', name), nickname);
      await page.goto(BASE + '/대기실.html?emulator=1');
      await page.waitForFunction(() => document.querySelector('#my-profile-nickname').textContent !== '...');
      return page;
    }
    const host = await client('이슬숲검증' + Date.now());
    const hostName = await host.locator('#my-profile-nickname').textContent();
    await host.click('#create-room-btn');
    await host.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'}).click();
    await host.waitForURL('**/*roomId=*');
    await host.waitForSelector('#start-game-btn:enabled');
    const guest = await client('함께탐험');
    await guest.locator('.room-item').filter({hasText:hostName}).locator('.join-btn').click();
    await guest.waitForURL('**/*roomId=*');
    await host.waitForFunction(() => document.querySelector('#start-game-btn').textContent.includes('2/6'));
    await host.click('#start-game-btn');
    for (const page of [host,guest]) {
      await page.waitForURL('**/insect_expedition/index.html?roomId=*');
      try { await page.waitForFunction(() => window.InsectApp && InsectApp.ready, null, {timeout:30000}); }
      catch(error) { throw new Error(error.message + ' 화면: ' + await page.locator('body').innerText()); }
      if (page === guest) await page.locator('#character-miner').click();
      await page.locator('[data-act="enter"]').click();
      await page.waitForSelector('.ix-top');
      assert.equal(await page.evaluate(() => firebase.app().options.projectId), 'demo-sky-tower');
    }
    await host.waitForFunction(() => InsectApp.getSnapshot().players.length === 2);
    await host.waitForFunction(() => InsectApp.world.scene.transformNodes.some(node => node.metadata?.id === 'miner'));
    const uid = await host.evaluate(() => InsectApp.getSnapshot().you);
    const before = await host.evaluate(uid => InsectApp.getSnapshot().players.find(p=>p.uid===uid),uid);
    await host.keyboard.down('KeyD'); await host.waitForTimeout(750); await host.keyboard.up('KeyD');
    await guest.waitForFunction(({uid,x}) => InsectApp.getSnapshot().players.find(p=>p.uid===uid)?.x < x-1,{uid,x:before.x});
    async function walk(page, target) {
      const pressed = new Set();
      try {
        for (let n=0; n<200; n++) {
          const p = await page.evaluate(()=>{const s=InsectApp.getSnapshot();return s.players.find(p=>p.uid===s.you);});
          const dx=target.x-p.x, dz=target.z-p.z;
          if(Math.hypot(dx,dz)<2.5) return;
          const keys = new Set();
          const {alpha,beta}=await page.evaluate(()=>({alpha:InsectApp.world.camera.alpha,beta:InsectApp.world.camera.beta}));
          const sx=-dx*Math.sin(alpha)+dz*Math.cos(alpha),sz=(dx*Math.cos(alpha)+dz*Math.sin(alpha))*Math.max(.2,Math.cos(beta));
          if(Math.abs(sx)>1)keys.add(sx>0?'KeyD':'KeyA');
          if(Math.abs(sz)>1)keys.add(sz>0?'KeyS':'KeyW');
          for(const key of pressed)if(!keys.has(key)){await page.keyboard.up(key);pressed.delete(key);}
          for(const key of keys)if(!pressed.has(key)){await page.keyboard.down(key);pressed.add(key);}
          await page.waitForTimeout(100);
        }
        throw new Error('실제 키보드 탐험 이동 시간 초과: '+JSON.stringify(target));
      } finally {for(const key of pressed)await page.keyboard.up(key);}
    }
    const ordinary = await host.evaluate(()=>InsectApp.getSnapshot().spawns.find(s=>!s.field&&s.available));
    await walk(host,ordinary);
    await host.evaluate(id=>InsectApp.ui.setSelection({type:'spawn',id}),ordinary.id);
    let collected=false;
    const count=await host.evaluate(()=>InsectApp.getSnapshot().profile.collection.length);
    for(let n=0;n<8;n++){
      await host.locator('[data-act="collect"]').click();
      await host.waitForTimeout(1000);
      if(await host.evaluate(n=>InsectApp.getSnapshot().profile.collection.length>n,count)){collected=true;break;}
    }
    assert(collected,'일반 곤충 실제 UI 포획');
    const monster=await host.evaluate(()=>InsectApp.getSnapshot().spawns.find(s=>s.field&&s.available));
    await walk(host,monster);
    await host.evaluate(id=>InsectApp.ui.setSelection({type:'spawn',id}),monster.id);
    const xpBefore=await host.evaluate(()=>InsectApp.getSnapshot().profile.collection.reduce((sum,c)=>sum+c.xp+c.level*100,0));
    await host.locator('[data-act="encounter"]').click();
    await host.waitForFunction(()=>InsectApp.getSnapshot().battle?.type==='field');
    await host.screenshot({path:path.join(output,'field-battle.png')});
    for(let n=0;n<40;n++){
      if(await host.evaluate(()=>InsectApp.getSnapshot().battle.status==='finished'))break;
      await host.waitForFunction(()=>!InsectApp.isAnimating());
      await host.locator('[data-act="battle-action"][data-value="attack"]').click();
      await host.waitForTimeout(400);
      await host.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:20000});
    }
    const fieldResult=await host.evaluate(()=>InsectApp.getSnapshot().battle);
    assert.equal(fieldResult.status,'finished');assert.equal(fieldResult.result.winner,'a','초보 필드전 완주');
    assert(await host.evaluate(n=>InsectApp.getSnapshot().profile.collection.reduce((sum,c)=>sum+c.xp+c.level*100,0)>n,xpBefore),'서버 경험치 저장');
    await host.locator('[data-act="return"]').click();
    await host.waitForFunction(()=>!InsectApp.getSnapshot().battle);
    await host.locator('[data-act="heal"]').click();await host.waitForTimeout(400);
    await walk(guest,{x:28,z:22});
    const guestUid=await guest.evaluate(()=>InsectApp.getSnapshot().you);
    await host.evaluate(id=>InsectApp.ui.setSelection({type:'player',id}),guestUid);
    await host.locator('[data-act="challenge"]').click();
    await guest.locator('[data-act="respond"][data-value="true"]').click();
    for(const page of [host,guest])await page.waitForFunction(()=>InsectApp.getSnapshot().battle?.type==='pvp');
    for(let n=0;n<50;n++){
      if(await host.evaluate(()=>InsectApp.getSnapshot().battle.status==='finished'))break;
      await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!InsectApp.isAnimating())));
      await host.locator('[data-act="battle-action"][data-value="attack"]').click();
      await guest.locator('[data-act="battle-action"][data-value="attack"]').click();
      await host.waitForTimeout(400);
      await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:20000})));
    }
    assert.equal(await host.evaluate(()=>InsectApp.getSnapshot().battle.status),'finished');
    assert.equal(await guest.evaluate(()=>InsectApp.getSnapshot().battle.id),await host.evaluate(()=>InsectApp.getSnapshot().battle.id));
    for(const page of [host,guest]){await page.locator('[data-act="return"]').click();await page.waitForFunction(()=>!InsectApp.getSnapshot().battle);}
    await host.screenshot({path:path.join(output,'exploration-desktop.png')});
    await host.setViewportSize({width:390,height:844});
    await host.screenshot({path:path.join(output,'exploration-mobile.png')});
    assert(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const profile = await host.evaluate(()=>InsectApp.getSnapshot().profile);
    await host.reload();
    await host.waitForFunction(()=>window.InsectApp?.ready);
    assert.deepEqual(await host.evaluate(()=>InsectApp.getSnapshot().profile.team),profile.team);
    assert.equal(await host.evaluate(()=>InsectApp.getSnapshot().profile.uid),profile.uid);
    const roomId = new URL(host.url()).searchParams.get('roomId');
    await host.locator('#enter-world').click();
    await host.locator('[data-act="exit"]').click();
    await host.waitForURL(url=>decodeURIComponent(url.pathname)==='/대기실.html');
    await guest.waitForFunction(()=>InsectApp.getSnapshot().players.length===1);
    assert.equal(await guest.evaluate(async id=>(await firebase.database().ref('rooms/'+id+'/hostId').once('value')).val(),roomId),guestUid,'방장 승계');
    const late = await client('늦은탐험');
    await late.locator('.room-item').filter({hasText:hostName}).locator('.join-btn').click();
    await late.waitForURL('**/insect_expedition/index.html?roomId=*');
    await late.waitForFunction(()=>window.InsectApp?.ready);
    await late.locator('#enter-world').click();
    await guest.waitForFunction(()=>InsectApp.getSnapshot().players.length===2);
    assert.deepEqual(errors,[]);
    console.log('통과: 실제 대기실 생성·친구참가·시작, 두 클라이언트 이동, 일반 포획, 필드전 승리·경험치, PvP 수락·완주·복귀, 새로고침 저장, 방장 승계·진행 중 참가, 모바일 화면.');
  } catch(error) {
    for(let n=0;n<contexts.length;n++)for(const page of contexts[n].pages()){
      await page.screenshot({path:path.join(output,`failure-${n}.png`)}).catch(()=>{});
      console.error('브라우저 진단',n,await page.evaluate(()=>({state:window.InsectApp?.getSnapshot()?.battle,animating:window.InsectApp?.isAnimating(),fps:window.InsectApp?.world.scene.getEngine().getFps()})).catch(()=>({})),errors);
    }
    throw error;
  } finally { await Promise.all(contexts.map(c=>c.close())); await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
