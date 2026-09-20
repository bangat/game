'use strict';
const Data=require('../shared/data.js');
const crypto=require('node:crypto');
function advance(profile,amount){for(const egg of profile.expedition.eggs)if(egg.incubating)egg.progress=Math.min(Data.eggKinds[egg.kind].steps,egg.progress+amount);}
function metric(profile,key){const p=profile.expedition;return key==='bosses'?p.bosses.length:key==='guardian'?Number(p.bosses.includes('boss-sanctum')):p[key]||0;}
function gather(profile,node,rng){
 if(node.kind==='egg'){
   if(profile.expedition.eggs.length>=12)throw Error('알 보관함이 가득 찼어요. 부화한 동료를 먼저 받아 주세요.');
   const kinds=Object.keys(Data.eggKinds),kind=kinds[Math.min(2,Math.floor(Math.max(0,rng())*3))];
   const egg={id:crypto.randomUUID(),kind,progress:0,incubating:false};profile.expedition.eggs.push(egg);
   return {egg,kind:'egg',amount:1,gold:0,message:Data.eggKinds[kind].name+'을 발굴했어요! 탐험 연구에서 부화를 시작하세요.'};
 }
 profile.resources[node.kind]+=1;
 if(node.kind==='crystal')profile.expedition.crystals++;
 advance(profile,1);profile.gold=Math.min(999999,profile.gold+2);
 return {kind:node.kind,amount:1,gold:2,message:Data.resources[node.kind].name+' 채집! 부화 진행 +1'};
}
function incubate(profile,id){
 const egg=profile.expedition.eggs.find(e=>e.id===id);
 if(!egg||egg.incubating)throw Error('부화를 시작할 알을 선택해 주세요.');
 if(profile.expedition.eggs.filter(e=>e.incubating).length>=3)throw Error('동시에 3개까지 부화할 수 있어요.');
 if(profile.resources.crystal<3)throw Error('별빛 광산에서 온기 수정 3개를 모아 주세요.');
 profile.resources.crystal-=3;egg.incubating=true;
 return {message:'부화 시작! 이동 80m · 채집 1회마다 +1, 전투 승리마다 +2.'};
}
function claimResearch(profile,id){
 const goal=Data.researchGoals.find(g=>g.id===id);
 if(!goal||profile.expedition.claimed.includes(id)||metric(profile,goal.metric)<goal.target)throw Error('아직 받지 않은 달성 보상만 받을 수 있어요.');
 if(profile.gold+goal.gold>999999||profile.supplies.feeds+goal.feeds>9999)throw Error('골드나 사료를 사용한 뒤 보상을 받아 주세요.');
 profile.expedition.claimed.push(id);profile.gold+=goal.gold;profile.supplies.feeds+=goal.feeds;
 return {message:goal.name+' 달성! 골드 +'+goal.gold+' · 사료 +'+goal.feeds};
}
module.exports={advance,metric,gather,incubate,claimResearch};
