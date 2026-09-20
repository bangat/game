(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.InsectHousing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const cell=2.6;
 const deeds={small:{name:'5평 땅문서',label:'5평',width:4,depth:4,price:2000},large:{name:'10평 땅문서',label:'10평',width:6,depth:5,price:3000}};
 const sites=[{id:'meadow',name:'햇살 잔디터',x:-23,z:0},{id:'riverbank',name:'물소리 정원',x:23,z:0},{id:'hill',name:'바람 언덕',x:0,z:27}];
 const parts={floor:{name:'나무 바닥',icon:'▦',layer:'floor',cost:{wood:2}},wall:{name:'나무 벽',icon:'▥',layer:'edge',cost:{wood:3,stone:1}},window:{name:'창문 벽',icon:'▣',layer:'edge',cost:{wood:2,sand:2}},door:{name:'여닫이문',icon:'🚪',layer:'edge',cost:{wood:3,stone:1}},roof:{name:'지붕',icon:'⌂',layer:'roof',cost:{wood:2,stone:1}},table:{name:'식탁',icon:'🪑',layer:'furniture',cost:{wood:4}},bed:{name:'침대',icon:'🛏️',layer:'furniture',cost:{wood:4,sand:1}},planter:{name:'화분',icon:'🪴',layer:'furniture',cost:{wood:1,stone:2,sand:1}}};
 function normalize(raw){const v=raw&&typeof raw==='object'?raw:{},plot=v.plot&&deeds[v.plot.size]&&sites.some(s=>s.id===v.plot.siteId)?{size:v.plot.size,siteId:v.plot.siteId}:null;const out={plot,pieces:[]};
  if(plot){const d=deeds[plot.size],used=new Set();for(const p of (Array.isArray(v.pieces)?v.pieces:[]).slice(0,300)){if(!p||!parts[p.kind]||!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.z<0||p.x>=d.width||p.z>=d.depth)continue;const next={id:String(p.id||'').slice(0,80),kind:p.kind,x:p.x,z:p.z,rotation:[0,1,2,3].includes(p.rotation)?p.rotation:0,open:p.kind==='door'&&p.open===true};const key=slot(next);if(!next.id||used.has(key)||out.pieces.some(x=>x.id===next.id))continue;used.add(key);out.pieces.push(next);}}
  return out;
 }
 function slot(p){const layer=parts[p.kind].layer;if(layer!=='edge')return layer+':'+p.x+':'+p.z;return p.rotation%2?'v:'+(p.x+(p.rotation===1?1:0))+':'+p.z:'h:'+p.x+':'+(p.z+(p.rotation===2?1:0));}
 function point(plot,p){const d=deeds[plot.size],s=sites.find(s=>s.id===plot.siteId);return {x:s.x+(p.x-(d.width-1)/2)*cell,z:s.z+(p.z-(d.depth-1)/2)*cell};}
 function cellAt(plot,p){const d=deeds[plot.size],s=sites.find(s=>s.id===plot.siteId);return {x:Math.floor((p.x-s.x)/cell+d.width/2),z:Math.floor((p.z-s.z)/cell+d.depth/2)};}
 function placementError(house,p,resources){if(!house.plot)return '먼저 땅문서를 사용해 토지를 선택해 주세요.';const d=deeds[house.plot.size],def=parts[p.kind];if(!def||!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.z<0||p.x>=d.width||p.z>=d.depth||![0,1,2,3].includes(p.rotation))return '부지 안의 격자를 선택해 주세요.';
  if(house.pieces.length>=240)return '이 부지에는 건축물을 240개까지 배치할 수 있어요.';
  if(house.pieces.some(q=>slot(q)===slot(p)))return '이 자리에는 이미 같은 종류의 건축물이 있어요.';
  if(def.layer!=='floor'&&!house.pieces.some(q=>q.kind==='floor'&&q.x===p.x&&q.z===p.z))return '바닥을 먼저 설치해 주세요.';
  if(resources&&Object.entries(def.cost).some(([k,n])=>(resources[k]||0)<n))return '건축 자재가 부족해요. 집 꾸미기에서 채집장으로 이동하세요.';
  return '';
 }
 function blocked(house,p,padding=.48){if(!house?.plot)return false;return house.pieces.some(q=>{if(!['wall','window','door','table','bed','planter'].includes(q.kind)||q.kind==='door'&&q.open)return false;const c=point(house.plot,q);if(parts[q.kind].layer==='edge'){const horizontal=q.rotation%2===0;c.x+=(q.rotation===1?1:q.rotation===3?-1:0)*cell/2;c.z+=(q.rotation===2?1:q.rotation===0?-1:0)*cell/2;return Math.abs(p.x-c.x)<(horizontal?cell/2:.12)+padding&&Math.abs(p.z-c.z)<(horizontal?.12:cell/2)+padding;}return Math.abs(p.x-c.x)<.75+padding&&Math.abs(p.z-c.z)<.75+padding;});}
 function segmentBlocked(house,a,b){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.2));for(let i=1;i<=n;i++)if(blocked(house,{x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return true;return false;}
 return {cell,deeds,sites,parts,normalize,slot,point,cellAt,placementError,blocked,segmentBlocked};
});
