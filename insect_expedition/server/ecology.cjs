'use strict';
const crypto=require('node:crypto'),Data=require('../shared/data.js'),E=require('../shared/ecology.js'),R=require('../shared/regions.js'),W=require('./world.cjs'),Battle=require('../shared/battle.cjs'),Expedition=require('./expedition.cjs');
function spawns(old){
  const result=old.map(s=>s.boss?{...s,x:0,z:-117}:s);
  for(const b of Data.biomes){
    const sites=E.landmarks(b.id);if(!sites.length)continue;
    let catalog=Data.species.filter(s=>!s.eggOnly&&!s.evolutionOnly&&(b.habitats||[b.habitat]).includes(s.habitat));
    if(!catalog.length)catalog=[Data.speciesById[E.rare[b.id]||'stone_ground_beetle']];
    // Small local colonies line both branches of the trail; bosses keep their own clearing.
    sites.slice(0,5).forEach((site,index)=>{for(let i=0;i<7;i++){
      const ordinary=catalog.filter(s=>['common','uncommon'].includes(s.rarity)),pool=ordinary.length&&i<6?ordinary:catalog;
      const species=pool[(i+index)%pool.length],angle=i*2.39996,d=10+i%3*4;
      const p={x:site.x+Math.cos(angle)*d,z:site.z+Math.sin(angle)*d};if(R.blocked(b.id,p,3))continue;
      result.push({id:'colony-'+b.id+'-'+index+'-'+i,speciesId:species.id,...p,homeX:p.x,homeZ:p.z,phase:index*7+i,regionId:b.id,biomeId:b.id,available:true,reservedBy:null,respawnAt:0,field:true,level:Math.min(b.levels[1],b.levels[0]+index+Math.floor(i/3)),nonce:crypto.randomBytes(4).toString('hex')});
    }});
  }
  return result;
}
function state(player,room,now){const event=E.event(player.regionId,now),ready=player.profile.ecology.eventReady[player.regionId]||0;return {sites:E.landmarks(player.regionId),event:event&&ready<=now?event:null,eventReadyAt:ready,lureActive:room.spawns.some(s=>s.ownerUid===player.uid&&s.available)};}
function near(player,p,radius=7){if(!p||player.regionId!==p.regionId||W.distance(player,p)>radius||W.segmentBlocked(player,p))throw Error('표시된 장소 가까이 다가가 주세요.');}
function take(profile,cost){for(const [id,n] of Object.entries(cost))if((profile.resources[id]||0)<n)throw Error(Data.resources[id].name+' 재료가 부족해요.');for(const [id,n] of Object.entries(cost))profile.resources[id]-=n;}
function addSpawn(room,player,p,now,group=false){const speciesId=E.rare[player.regionId]||'moon_moth',b=R.get(player.regionId);return {id:'lure-'+crypto.randomUUID(),regionId:player.regionId,biomeId:player.regionId,speciesId,x:p.x,z:p.z,level:b.levels[0]+2,field:true,available:true,reservedBy:null,respawnAt:0,nonce:crypto.randomBytes(4).toString('hex'),lured:!group,event:group,ownerUid:player.uid,expiresAt:now+300000,...(group?{group:true,members:[0,1,2].map(()=>({speciesId,level:b.levels[0]+1}))}:{})};}
async function command({room,player,name,payload,now,store}){
  const next=structuredClone(player.profile);let message,spawn;
  if(name==='craft'){
    const recipe=E.recipes.find(r=>r.id===payload.id);if(!recipe)throw Error('제작할 물건을 선택해 주세요.');
    if(recipe.output==='charm'&&next.ecology.charm)throw Error('이미 탐험 부적을 장착했어요.');
    if(recipe.output==='egg'&&next.expedition.eggs.length>=12)throw Error('알 보관함이 가득 찼어요.');
    if(recipe.output==='feeds'&&next.supplies.feeds>9996||Data.resources[recipe.output]&&next.resources[recipe.output]>=9999)throw Error('가방의 물건을 먼저 사용해 주세요.');
    take(next,recipe.cost);
    if(recipe.output==='charm')next.ecology.charm=true;
    else if(recipe.output==='feeds')next.supplies.feeds+=recipe.amount;
    else if(recipe.output==='egg')next.expedition.eggs.push({id:crypto.randomUUID(),kind:'prism',progress:0,incubating:false});
    else next.resources[recipe.output]+=recipe.amount;
    next.ecology.crafted++;message=recipe.name+' 제작 완료!';
  }else if(name==='nectar'){
    const index=next.collection.findIndex(c=>c.id===payload.creatureId);if(index<0||next.collection[index].level>=50)throw Error('성장시킬 동료를 선택해 주세요.');
    take(next,{nectar:1});next.collection[index]=Battle.applyXp(next.collection[index],300).creature;message='성장 농축액 사용! 경험치 +300';
  }else if(name==='lure'){
    const site=E.landmarks(player.regionId).find(s=>s.siteId==='sap');near(player,site);
    if(room.spawns.some(s=>s.ownerUid===player.uid&&(s.available||s.reservedBy)))throw Error('먼저 유인한 곤충을 만나 주세요.');
    take(next,{bait:1});next.ecology.lured++;spawn=addSpawn(room,player,{x:site.x+5,z:site.z},now);message=Data.speciesById[spawn.speciesId].name+'의 기척! 고목 옆에 나타났어요. 승리 후 포획 확률 +15%p.';
  }else if(name==='explore-event'){
    const event=E.event(player.regionId,now);if(!event||event.id!==payload.id||(next.ecology.eventReady[player.regionId]||0)>now)throw Error('흔적이 사라졌어요. 다음 탐험 사건을 기다려 주세요.');near(player,event);
    if(event.kind==='egg'){if(next.expedition.eggs.length>=12)throw Error('알 보관함이 가득 찼어요.');next.expedition.eggs.push({id:crypto.randomUUID(),kind:'lunar',progress:0,incubating:false});message='바위굴에서 월광 알 발견! 탐험 연구에서 부화하세요.';}
    if(event.kind==='cache'){if(next.resources.ore>9996||next.supplies.feeds>9996)throw Error('가방의 물건을 먼저 사용해 주세요.');next.resources.ore+=3;next.supplies.feeds+=3;next.gold=Math.min(999999,next.gold+60);message='유적 보급품 발견! 광석 3 · 사료 3 · 골드 60';}
    if(event.kind==='swarm'){if(room.spawns.some(s=>s.ownerUid===player.uid&&(s.available||s.reservedBy)))throw Error('먼저 발견한 곤충과 전투를 마쳐 주세요.');spawn=addSpawn(room,player,event,now,true);message='희귀 곤충 떼 발견! 3마리 무리 전투에 도전해 보세요.';}
    next.ecology.events++;next.ecology.eventReady[player.regionId]=now+240000;Expedition.advance(next,2);
  }else if(name==='ecology-claim'){
    const goal=E.goals.find(g=>g.id===payload.id);if(!goal||next.ecology.claimed.includes(goal.id)||next.ecology[goal.metric]<goal.target)throw Error('탐험 목표를 달성하면 보상을 받을 수 있어요.');
    if(next.gold+goal.gold>999999||next.supplies.feeds+goal.feeds>9999)throw Error('골드나 사료를 먼저 사용해 주세요.');
    next.ecology.claimed.push(goal.id);next.gold+=goal.gold;next.supplies.feeds+=goal.feeds;message=goal.name+' 보상! 골드 +'+goal.gold+' · 사료 +'+goal.feeds;
  }
  player.profile=await store.save(next);if(spawn)room.spawns.push(spawn);return {message};
}
module.exports={spawns,state,command};
