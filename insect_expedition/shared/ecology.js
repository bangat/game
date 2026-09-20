(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.InsectData);if(typeof module==='object'&&module.exports)module.exports=api;else root.InsectEcology=api;})(globalThis,function(Data){
  'use strict';
  const sites=[
    {id:'meadow',name:'꽃바람 쉼터',x:12,z:52,kind:'flowers',hint:'꽃가루와 작은 곤충'},
    {id:'sap',name:'수액 고목',x:-32,z:23,kind:'log',hint:'수액 채집 · 먹이를 놓는 자리'},
    {id:'pool',name:'돌다리 샘터',x:38,z:8,kind:'pool',hint:'버섯과 물가 곤충'},
    {id:'ruins',name:'이끼 낀 연구 유적',x:-34,z:-30,kind:'ruins',hint:'잃어버린 기록과 광석'},
    {id:'hollow',name:'숨은 바위굴',x:43,z:-65,kind:'cave',hint:'빛나는 알과 수정'},
    {id:'crown',name:'수호자의 둥지',x:0,z:-117,kind:'nest',hint:'지역 우두머리 · 수호 정수'}
  ];
  const trails=[[[0,84],[0,68],[12,52],[-8,39],[-32,23],[-34,-5],[-34,-30],[-12,-65],[0,-90],[0,-117]],[[12,52],[30,32],[38,8],[46,-26],[43,-65],[20,-90],[0,-117]],[[-34,-30],[0,-20],[38,8]]];
  const regionNames={forest:['달꽃 쉼터','천년 수액 고목','이끼 샘터','옛 숲 연구소','반딧불 바위굴','천년고목의 둥지'],grassland:['토끼풀 꽃밭','들판 고목','바람개울','버려진 풍차 터','언덕 속 작은 굴','새싹왕의 언덕'],rock:['돌꽃 군락','메마른 고목','협곡 샘터','무너진 석문','호박석 갱도','거석 원형터'],wetland:['흰꽃 군락','늪지 고목','갈대 샘터','물에 잠긴 유적','청록 동굴','독안개 둥지'],river:['물꽃 언덕','강변 고목','징검다리 여울','강변 관측소','물빛 동굴','잠자리 절벽'],farm:['해바라기 밭','과수원 쉼터','농장 저수지','오래된 창고','곡식 동굴','황금 수확터'],cave:['발광 이끼밭','화석 기둥','지하 샘터','수정 유적','푸른 수정굴','고대폭군의 터'],facility:['온실 화단','금속 잔해','냉각수 샘터','폐관측소','균열 통로','화염 실험장']};
  const rare={forest:'storm_cicada',grassland:'honey_mason_bee',rock:'stone_ground_beetle',wetland:'mist_butterfly',river:'azure_dragonfly',farm:'sun_scarab',cave:'cave_stag',facility:'violet_mantis',mine:'cave_stag',nest:'moon_moth',sanctum:'ancient_rhino'};
  const recipes=[
    {id:'bait',name:'수액 유인 먹이',cost:{sap:3,pollen:2},output:'bait',amount:1,text:'수액 고목에서 지역 희귀종을 확실히 유인해요.'},
    {id:'tonic',name:'버섯 회복제',cost:{mushroom:3,berries:2},output:'tonic',amount:1,text:'전투에서 사용 · 현재 동료의 체력 45% 회복.'},
    {id:'feed',name:'꽃가루 영양 사료',cost:{pollen:3,berries:2},output:'feeds',amount:3,text:'경험치를 올려 진화 레벨에 도달해요.'},
    {id:'nectar',name:'성장 농축액',cost:{sap:4,mushroom:3,ore:2},output:'nectar',amount:1,text:'보유 곤충 1마리에게 경험치 300을 줘요.'},
    {id:'charm',name:'호박석 탐험 부적',cost:{ore:6,sap:4,essence:1},output:'charm',amount:1,text:'영구 장비 · 승리 후 포획 확률 +5%p.'},
    {id:'prism',name:'수호자의 프리즘 알',cost:{essence:2,crystal:3},output:'egg',amount:1,text:'우두머리 보상으로 프리즘사슴벌레 알 제작.'}
  ];
  const goals=[
    {id:'gather',name:'숲의 채집가',metric:'gathered',target:10,gold:100,feeds:3},
    {id:'craft',name:'첫 탐험 준비',metric:'crafted',target:2,gold:120,feeds:4},
    {id:'lure',name:'희귀종의 흔적',metric:'lured',target:1,gold:160,feeds:5},
    {id:'events',name:'잊힌 장소의 발견',metric:'events',target:3,gold:220,feeds:6},
    {id:'hunt',name:'서식지 조사 완료',metric:'wins',target:8,gold:240,feeds:8}
  ];
  function landmarks(id){if(id==='safe'||Data.constructionCamps.some(c=>c.id===id))return [];return sites.map((s,i)=>({...s,id:'site-'+id+'-'+s.id,siteId:s.id,regionId:id,name:regionNames[id]?.[i]||s.name}));}
  function routeDistance(x,z){let best=Infinity;for(const line of trails)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return best;}
  function normalize(raw={}){const count=k=>Math.max(0,Math.min(999999,Math.floor(Number(raw[k])||0)));return {gathered:count('gathered'),crafted:count('crafted'),lured:count('lured'),events:count('events'),wins:count('wins'),charm:raw.charm===true,claimed:(Array.isArray(raw.claimed)?raw.claimed:[]).filter((v,i,a)=>goals.some(g=>g.id===v)&&a.indexOf(v)===i),visited:(Array.isArray(raw.visited)?raw.visited:[]).filter(v=>typeof v==='string').slice(-100),eventReady:Object.fromEntries(Object.entries(raw.eventReady||{}).filter(([k,v])=>Data.biomes.some(b=>b.id===k)&&Number.isFinite(v)&&v>=0))};}
  function nodes(id){return landmarks(id).flatMap((site,index)=>{
    const kinds=[['pollen','berries','mushroom'],['sap','sap','mushroom'],['mushroom','berries','pollen'],['ore','sap','mushroom'],['crystal','ore','pollen'],['sap','mushroom','ore']][index];
    return kinds.flatMap((kind,j)=>[0,1].map(k=>({id:'eco-'+id+'-'+index+'-'+j+'-'+k,regionId:id,biomeId:id,kind,name:Data.resources[kind].name,x:site.x-9+j*8,z:site.z+7+k*7,respawnAt:0})));
  });}
  function event(id,now){const cycle=Math.floor(now/240000),list=landmarks(id);if(!list.length)return null;const types=[{kind:'egg',name:'빛나는 알의 흔적',site:4},{kind:'swarm',name:'꽃가루를 쫓는 곤충 떼',site:0},{kind:'cache',name:'유적의 잃어버린 보급품',site:3}];const type=types[(cycle+id.length)%3],site=list[type.site];return {...type,id:'event-'+id+'-'+cycle,regionId:id,x:site.x+5,z:site.z+3,endsAt:(cycle+1)*240000};}
  function hint(s){if(s.eggOnly)return '빛나는 알 사건 · 알 동굴 발굴 · 탐험 연구에서 부화';if(s.evolutionOnly)return '성장 메뉴에서 원종의 진화 레벨 확인';const b=Data.biomes.find(b=>!b.safe&&(b.habitats||[b.habitat]).includes(s.habitat));return (b?.name||s.habitat)+' · '+s.spawnConditions.near+(rare[b?.id]===s.id?' · 수액 고목에 유인 먹이 설치':' · 서식지에서 전투 후 포획');}
  return {sites,trails,rare,recipes,goals,landmarks,routeDistance,normalize,nodes,event,hint};
});
