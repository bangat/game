'use strict';
const T=require('../shared/trials.js'),D=require('../shared/data.js'),Battle=require('../shared/battle.cjs');
function spawn(stage){const t=T.stage(stage);return {id:'trial-'+t.stage,speciesId:t.members[0].speciesId,members:t.members,level:t.level,boss:true,bossName:t.name,trial:t.stage};}
function prepare(state,n){const trial=T.stage(n);state.trial=trial;state.sides.b.name=trial.name;for(const c of state.sides.b.team){c.maxHp=Math.round(c.maxHp*trial.scale*(trial.modifier.hp||1));c.hp=c.maxHp;c.attack=Math.round(c.attack*trial.scale*(trial.modifier.attack||1));c.defense=Math.round(c.defense*trial.scale*(trial.modifier.defense||1));c.speed=Math.round(c.speed*(trial.modifier.speed||1));c.cp=Math.round(c.maxHp*.42+c.attack*2.1+c.defense*1.65+c.speed*1.35);}return state;}
function award(profile,n,result){const t=T.stage(n),first=n>profile.trials.cleared;result.trialStage=n;result.firstClear=first;result.gold=0;result.feeds=0;result.shards=0;if(!first)return;profile.trials.cleared=n;result.shards=Math.min(t.shards,9999-profile.resources.shard);result.gold=Math.min(t.gold,999999-profile.gold);result.feeds=Math.min(t.feeds,9999-profile.supplies.feeds);profile.resources.shard+=result.shards;profile.gold+=result.gold;profile.supplies.feeds+=result.feeds;}
async function command(player,name,payload,store){const next=structuredClone(player.profile),c=next.collection.find(c=>c.id===payload.creatureId);if(!c)throw Error('보유한 동료를 선택해 주세요.');let message;
  if(name==='legacy-research'){
    if(payload.confirm!==true)throw Error('소모되는 곤충을 확인한 뒤 연구해 주세요.');
    if(D.speciesById[c.speciesId].rarity!=='monster'||next.team.includes(c.id)||next.collection.filter(x=>x.speciesId===c.speciesId).length<2)throw Error('같은 종류가 2마리 이상인 전설 중 팀에 없는 동료만 연구할 수 있어요.');
    if(next.resources.shard>9994)throw Error('시련 문장을 사용한 뒤 연구해 주세요.');next.collection=next.collection.filter(x=>x.id!==c.id);next.resources.shard+=5;message='중복 전설 계승 연구 완료 · 시련 문장 +5';
  }else{
    const kind=String(payload.kind);if(!T.runes[kind])throw Error('동료의 특화를 선택해 주세요.');const old=T.normalizeRune(c.rune),switching=old&&old.kind!==kind,cost=switching?1:T.cost(old);if(old?.level===3&&!switching)throw Error('최고 단계 특화입니다.');if(next.resources.shard<cost)throw Error('시련 문장이 부족해요. 수호자 시련을 돌파하거나 중복 전설을 연구하세요.');next.resources.shard-=cost;c.rune={kind,level:switching?old.level:(old?.level||0)+1};c.hp=Battle.statsForCreature(c).maxHealth;message=T.runes[kind].name+' '+c.rune.level+'단계 장착!';
  }
  player.profile=await store.save(next);return {message};
}
module.exports={spawn,prepare,award,command};
