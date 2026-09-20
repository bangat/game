(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.InsectData);if(typeof module==='object'&&module.exports)module.exports=api;else root.InsectRegions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Data){
  'use strict';
  const themes={
    safe:{sky:'#b8dce6',ground:'#93b16e',leaf:'#62936a',height:1,description:'평화로운 마을 · 탐험가가 모이는 만남의 광장'},
    grassland:{sky:'#a5d9ef',ground:'#86ad52',leaf:'#71984b',height:7,description:'완만한 언덕과 바람개비 · 초원 곤충과 새싹랩터'},
    forest:{sky:'#718d89',ground:'#486f43',leaf:'#31543e',height:11,description:'안개 낀 거목 숲과 구릉 · 나방과 고목의 수호자'},
    rock:{sky:'#e7c9a2',ground:'#ac9478',leaf:'#9b795b',height:16,description:'층층이 솟은 붉은 바위 언덕 · 트리케라와 돌틈 곤충'},
    wetland:{sky:'#879fa5',ground:'#657f6b',leaf:'#537d72',height:4,description:'청록 물안개와 갈대 섬 · 독액 공룡과 유리나비'},
    river:{sky:'#b6dbeb',ground:'#87b1a1',leaf:'#5c947a',height:8,description:'은빛 물길과 물가 언덕 · 잠자리와 물속 유충'},
    farm:{sky:'#f6dbb0',ground:'#b3aa62',leaf:'#879151',height:5,description:'황금빛 밭과 과수원 · 풍뎅이와 농장 곤충'},
    cave:{sky:'#182539',ground:'#414b67',leaf:'#7ccce3',height:12,description:'푸른 수정이 빛나는 지하 능선 · 사슴벌레와 고대렉스'},
    facility:{sky:'#593f53',ground:'#70616b',leaf:'#ef9674',height:8,description:'붉은 균열과 폐허 온실 · 사마귀와 화염랩터'},
    mine:{sky:'#253750',ground:'#58677c',leaf:'#97dfec',height:10,description:'광맥과 갱도 언덕 · 온기 수정 채광'},
    nest:{sky:'#403959',ground:'#817199',leaf:'#d6bef0',height:7,description:'보랏빛 둥지 동굴 · 전용종 알 발굴'},
    sanctum:{sky:'#a39178',ground:'#bfa777',leaf:'#f6d497',height:13,description:'고대 유적과 높은 능선 · 최종 수호자'},
    lumber:{sky:'#b7d1b5',ground:'#82925a',leaf:'#477451',height:5,description:'목재를 모으는 독립 벌목장'},
    quarry:{sky:'#c7d2d8',ground:'#9b9b92',leaf:'#727d87',height:12,description:'석재를 캐는 계단식 채석장'},
    sandpit:{sky:'#f2d9b3',ground:'#d4bd85',leaf:'#a9956e',height:6,description:'모래 언덕이 펼쳐진 채집장'}
  };
  const get=id=>Data.biomes.find(b=>b.id===id)||Data.biomes.find(b=>b.id==='safe');
  const limit=165;
  const spawn=id=>id==='safe'?{x:7,z:14}:['lumber','quarry','sandpit'].includes(id)?{x:-20,z:-3}:{x:0,z:68};
  const terrain=(id,x,z)=>{
    const t=themes[id]||themes.safe;
    if(id==='safe')return 0;
    const bump=(cx,cz,sx,sz,h)=>h*Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2));
    const factor=t.height/11,entry=spawn(id),fade=Math.min(1,Math.max(0,(Math.hypot(x-entry.x,z-entry.z)-6)/18));
    const ridges=bump(-82,-40,36,55,30)+bump(72,-72,42,38,26)+bump(-65,62,32,38,15)+bump(2,-132,45,29,18);
    const rolling=2.8+2.1*Math.sin(x*.045)*Math.cos(z*.038)+1.4*Math.sin((x+z)*.065);
    return Math.max(0,(ridges+rolling)*factor)*fade;
  };
  function portals(id){
    if(id==='safe')return Data.biomes.filter(b=>b.id!=='safe').map((b,i)=>{const angle=Math.PI+(i/(Data.biomes.length-2))*Math.PI;return {id:'portal-'+b.id,to:b.id,name:b.name,x:Math.cos(angle)*47,z:Math.sin(angle)*47,color:themes[b.id].leaf};});
    return [{id:'portal-safe',to:'safe',name:'이슬숲 마을',x:0,z:84,color:'#b4eddf'}];
  }
  function obstacles(id){
    if(id==='safe')return [{id:'lab',type:'box',x:0,z:-6,width:18,depth:10}];
    const base=[{id:'ridge-rock-a',type:'circle',x:-63,z:15,radius:7},{id:'ridge-rock-b',type:'circle',x:56,z:-43,radius:9},{id:'ridge-rock-c',type:'circle',x:93,z:53,radius:6}];
    if(['lumber','quarry','sandpit'].includes(id))return base;
    return [...base,{id:'ancient-trunk',type:'circle',x:-32,z:15,radius:3.6},{id:'fallen-log',type:'box',x:-44,z:21,width:12,depth:3.2},{id:'cave-back',type:'circle',x:43,z:-77,radius:8},...[-44,-39,-34,-29,-24].map((x,i)=>({id:'ruin-pillar-'+i,type:'circle',x,z:-38,radius:.9}))];
  }
  function blocked(id,p,padding=1.15){return Math.hypot(p.x,p.z)>limit-padding||obstacles(id).some(o=>o.type==='circle'?Math.hypot(p.x-o.x,p.z-o.z)<o.radius+padding:Math.abs(p.x-o.x)<o.width/2+padding&&Math.abs(p.z-o.z)<o.depth/2+padding);}
  function localize(value,id){const b=get(id);return {...value,regionId:id,biomeId:id,x:(value.x-b.center.x)*2.5,z:(value.z-b.center.z)*2.5};}
  function spawnRecord(value){let p=value.id.startsWith('tutorial-')?{...value,regionId:'grassland',biomeId:'grassland',z:value.z+20}:localize(value,value.biomeId||'grassland');
    const radius=Math.hypot(p.x,p.z);if(radius>145){p.x*=145/radius;p.z*=145/radius;}
    for(let i=0;blocked(p.regionId,p,4)&&i<40;i++){p.x+=i%2?3:-2;p.z+=3;if(Math.hypot(p.x,p.z)>148){p.x*=.8;p.z*=.8;}}
    return p;
  }
  function resourceRecord(n){const camp=Data.constructionCamps.find(c=>n.id.startsWith(c.id+'-'));let id=camp?.id;
    if(!id)id=n.id.startsWith('crystal-')?'mine':n.id.startsWith('egg-')?'nest':n.id.endsWith('-camp')?'safe':Data.biomes.filter(b=>!b.special).reduce((best,b)=>Math.hypot(n.x-b.center.x,n.z-b.center.z)<Math.hypot(n.x-best.center.x,n.z-best.center.z)?b:best,get('safe')).id;
    return localize(n,id);
  }
  return {themes,get,limit,spawn,terrain,portals,obstacles,blocked,localize,spawnRecord,resourceRecord};
});
