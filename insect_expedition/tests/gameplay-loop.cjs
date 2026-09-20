'use strict';
process.env.INSECT_EMULATOR='1';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGameServer}=require('../server/index.cjs');
const gameServer=createGameServer({dbPath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'insect-loop-')),'profiles.json'),rng:()=>0});
(async()=>{
 let browser,page,roomId,uid;
 try{
  const address=await gameServer.listen(0,'127.0.0.1'),base='http://127.0.0.1:'+address.port+'/';
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const errors=[];page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'대기실.html?emulator=1');
  await page.waitForFunction(()=>document.querySelector('#my-profile-nickname')?.textContent!=='...');
  await page.locator('#create-room-btn').click();await page.locator('.game-list-item').filter({hasText:'이슬숲 탐험대'}).click();
  await page.locator('#start-game-btn').click();await page.waitForURL('**/insect_expedition/index.html?*');
  roomId=new URL(page.url()).searchParams.get('roomId');
  let game=await (await page.locator('#game-frame').elementHandle()).contentFrame();
  await game.waitForFunction(()=>window.InsectApp?.ready);
  await game.locator('#explorer-name').fill('숲모험가');await game.locator('#enter-world').tap();
  await game.waitForFunction(()=>InsectApp.getSnapshot().profile.adventurerName==='숲모험가');
  uid=await game.evaluate(()=>InsectApp.getSnapshot().you);
  const room=gameServer.rooms.get(roomId),player=room.players.get(uid);
  const position=await game.evaluate(()=>{const s=InsectApp.getSnapshot();const p=s.players.find(p=>p.uid===s.you);return {x:p.x,z:p.z};});
  await game.locator('[data-act="quest-guide"]').tap();
  await game.waitForFunction(()=>InsectApp.getSnapshot().profile.quest.status==='active');
  assert.deepEqual({x:player.x,z:player.z},position);
  assert.equal(await game.locator('.ix-npc').count(),0);
  // Current quest and transient feedback occupy different rows.
  assert(await game.evaluate(()=>{const q=document.querySelector('.ix-quest-strip').getBoundingClientRect(),t=document.querySelector('.ix-toast').getBoundingClientRect();return t.left>=0&&t.right<=innerWidth&&(q.bottom<=t.top||q.right<=t.left||t.right<=q.left);}));
  await page.screenshot({path:path.join(__dirname,'../test-output/loop-quest.png')});
  await game.locator('[data-act="sprint"]').tap();
  await game.waitForFunction(()=>InsectApp.getSnapshot().players.find(p=>p.uid===InsectApp.getSnapshot().you).sprinting);
  await game.locator('#game-canvas').focus();await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');
  assert(player.stamina<100);const stamina=player.stamina;await page.waitForTimeout(1800);assert(player.stamina>stamina);
  await game.locator('[data-act="sprint"]').tap();
  await game.evaluate(async()=>{await InsectApp.send('travel',{biomeId:'safe'});});
  await game.locator('[data-act="close-dialog"]').tap().catch(()=>{});
  async function walk(id){await game.evaluate(async id=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(let n=0;n<160;n++){
      const s=InsectApp.getSnapshot(),p=s.players.find(p=>p.uid===s.you),target=s.spawns.find(s=>s.id===id);
      const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
      if(d<3){await InsectApp.send('move',{x:0,z:0});return;}
      await InsectApp.send('move',{x:dx/d,z:dz/d});await wait(160);
    }
    throw Error('이동 시간 초과');
  },id);}
  async function win(id){
    await walk(id);await game.evaluate(id=>InsectApp.ui.setSelection({type:'spawn',id}),id);
    await game.locator('[data-act="encounter"]').tap();
    await game.waitForFunction(()=>!!InsectApp.getSnapshot().battle);
    await game.evaluate(()=>{window.attackPositions=[];InsectApp.world.scene.onAfterRenderObservable.add(()=>{const actor=InsectApp.world.scene.transformNodes.find(n=>n.metadata?.side==='player');if(actor)attackPositions.push(actor.position.x);});});
    for(let n=0;n<30;n++){
      if(await game.evaluate(()=>InsectApp.getSnapshot().battle.status==='finished'))break;
      await game.waitForFunction(()=>!InsectApp.isAnimating());
      await game.locator('[data-action="attack"]').tap();
      await game.waitForFunction(()=>!InsectApp.isAnimating(),null,{timeout:30000});
    }
    await game.waitForFunction(()=>!InsectApp.isAnimating());
    assert.equal(await game.evaluate(()=>InsectApp.getSnapshot().battle.result.winner),'a');
    assert(await game.evaluate(()=>attackPositions.some(x=>x>-4)),'내 곤충 공격 모션');
    assert.match(await game.locator('.ix-battle-result').innerText(),/채집했습니다/);
    await page.screenshot({path:path.join(__dirname,'../test-output/loop-battle-result.png')});
    await game.locator('[data-act="return"]').tap();
    await game.waitForFunction(()=>!InsectApp.getSnapshot().battle);
  }
  await win('tutorial-6');
  assert.equal(await game.locator('.ix-badge').innerText(),'1');
  await game.locator('[data-act="panel"][data-value="encyclopedia"]').tap();
  await game.locator('[data-act="dex-claim"]').tap();
  await game.waitForFunction(()=>InsectApp.getSnapshot().profile.encyclopedia.claimed.length===4);
  await page.screenshot({path:path.join(__dirname,'../test-output/loop-dex.png')});
  await game.locator('[data-act="rarity-filter"][data-id="elite"]').tap();assert.equal(await game.locator('.ix-encyclopedia>div').count(),2);
  await game.locator('[data-act="close-panel"]').tap();
  await game.locator('[data-act="panel"][data-value="collection"]').first().tap();
  const larva=player.profile.collection.find(c=>c.speciesId==='moss_caterpillar');
  for(let n=0;n<3;n++){await game.locator('[data-act="feed"][data-id="'+larva.id+'"]').tap();await page.waitForTimeout(450);}
  await game.locator('[data-act="evolve"][data-id="'+larva.id+'"]').tap();
  await game.waitForFunction(id=>InsectApp.getSnapshot().profile.collection.find(c=>c.id===id).speciesId==='moon_moth',larva.id);
  await page.screenshot({path:path.join(__dirname,'../test-output/loop-growth.png')});
  await game.locator('[data-act="close-panel"]').tap();
  await game.locator('[data-act="panel"][data-value="team"]').first().tap();
  await game.locator('[data-act="team-slot"][data-index="0"]').tap();
  await game.locator('[data-act="assign-team"][data-id="'+larva.id+'"]').tap();
  await game.waitForFunction(id=>InsectApp.getSnapshot().profile.team[0]===id,larva.id);
  await page.screenshot({path:path.join(__dirname,'../test-output/loop-team.png')});
  await page.setViewportSize({width:568,height:320});await page.screenshot({path:path.join(__dirname,'../test-output/loop-team-small.png')});
  await game.locator('[data-act="close-panel"]').tap();
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(__dirname,'../test-output/loop-desktop.png')});
  const savedLocation={x:player.x,z:player.z},savedTeam=[...player.profile.team];
  await page.reload();game=await(await page.locator('#game-frame').elementHandle()).contentFrame();
  await game.waitForFunction(()=>window.InsectApp?.ready);
  assert.equal(await game.locator('#explorer-name').inputValue(),'숲모험가');
  assert.deepEqual(await game.evaluate(()=>InsectApp.getSnapshot().profile.team),savedTeam);
  assert.deepEqual(await game.evaluate(()=>InsectApp.getSnapshot().profile.location),savedLocation);
  await game.locator('#enter-world').tap();
  await game.locator('[data-act="exit"]').tap();await page.waitForURL(url=>decodeURIComponent(url.pathname)==='/대기실.html');
  assert.deepEqual(errors,[]);
  console.log('통과: 계정 이름·제자리 퀘스트·알림 분리·달리기·실제 공격 모션·전투 후 포획·도감 배지와 보상·사료 성장·진화·선봉 배치·위치와 이름 재접속 복원.');
 }catch(error){if(page)await page.screenshot({path:path.join(__dirname,'../test-output/loop-failure.png')}).catch(()=>{});throw error;}
 finally{if(browser)await browser.close();if(uid){await require('firebase-admin/database').getDatabase().ref('users/'+uid).remove().catch(()=>{});await require('firebase-admin/auth').getAuth().deleteUser(uid).catch(()=>{});}if(roomId)await require('firebase-admin/database').getDatabase().ref('rooms/'+roomId).remove().catch(()=>{});await gameServer.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
