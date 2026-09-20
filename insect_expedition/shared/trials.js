(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.InsectData);if(typeof module==='object'&&module.exports)module.exports=api;else root.InsectTrials=api;})(globalThis,function(Data){
  'use strict';
  const runes={assault:{name:'맹공',text:'단계마다 공격 +8%',color:'#ef997b'},guard:{name:'수호',text:'단계마다 체력 +6% · 방어 +10%',color:'#8fc8a5'},swift:{name:'기동',text:'단계마다 속도 +12% · 공격 +3%',color:'#9cbce8'}};
  const chapters=[
    ['초원 수색대','rush',['honey_mason_bee','dew_ladybird_awakened','fern_raptor']],
    ['이끼의 방패','armor',['sun_scarab','stone_ground_beetle_awakened','moon_moth']],
    ['안개 속 교란','mist',['mist_butterfly','moon_moth','marsh_spitter']],
    ['바위문 파수꾼','armor',['granite_triceratops','cave_stag','sun_scarab']],
    ['은물결 추격전','rush',['azure_dragonfly','violet_mantis','storm_cicada']],
    ['고목의 합창','mist',['storm_cicada','ancient_rhino','moon_moth']],
    ['수정갑주의 벽','armor',['crystal_ankylosaur','king_stag','granite_triceratops']],
    ['온실의 세 낫','rush',['violet_mantis','ember_raptor','azure_dragonfly']],
    ['달빛의 잔상','mist',['lunar_moth','mist_butterfly','prism_stag']],
    ['고대종의 포효','armor',['ancient_rex','ancient_rhino','king_stag']],
    ['오로라 추격대','rush',['aurora_rex','ember_raptor','storm_cicada']],
    ['세 수호자의 심장','mist',['prism_stag','lunar_moth','aurora_rex']]
  ];
  const modifiers={rush:{name:'선제 돌진',text:'적 속도 +35% · 공격 +10%. 기동 룬과 회복제로 첫 공세를 버텨 보세요.',speed:1.35,attack:1.1},armor:{name:'견고한 갑주',text:'적 방어 +40%. 방어 약화 기술과 맹공 특화를 활용하세요.',defense:1.4},mist:{name:'긴 호흡',text:'적 체력 +30%. 수호 특화와 회복제로 긴 전투를 준비하세요.',hp:1.3}};
  function stage(n){n=Math.max(1,Math.min(24,Math.floor(Number(n)||1)));const [title,kind,ids]=chapters[(n-1)%12],level=Math.min(50,20+n*2),scale=1+Math.max(0,n-6)*.018;
    return {stage:n,name:(n>12?'심층 '+n+' · ':'')+title,kind,modifier:modifiers[kind],level,scale,members:ids.map(speciesId=>({speciesId,level})),shards:3+Math.floor(n/3),gold:80+n*30,feeds:3+Math.floor(n/4)};
  }
  function normalizeRune(value){if(!value||!runes[value.kind])return null;return {kind:value.kind,level:Math.max(1,Math.min(3,Math.floor(Number(value.level)||1)))};}
  function withRune(stats,value){const r=normalizeRune(value);if(!r)return stats;const s={...stats},n=r.level;if(r.kind==='assault')s.attack=Math.round(s.attack*(1+n*.08));if(r.kind==='guard'){s.maxHealth=Math.round(s.maxHealth*(1+n*.06));s.defense=Math.round(s.defense*(1+n*.1));}if(r.kind==='swift'){s.speed=Math.round(s.speed*(1+n*.12));s.attack=Math.round(s.attack*(1+n*.03));}return s;}
  function normalize(value){return {cleared:Math.max(0,Math.min(24,Math.floor(Number(value?.cleared)||0)))};}
  const cost=r=>r?[3,6,10][r.level]||0:3;
  return {runes,modifiers,chapters,stage,normalizeRune,withRune,normalize,cost};
});
