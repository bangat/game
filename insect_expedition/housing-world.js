(function(global){
 'use strict';
 const B=global.BABYLON,H=global.InsectHousing;
 function create(scene,options){
  const root=new B.TransformNode('housing-world',scene),decor=new B.TransformNode('housing-buildings',scene);decor.parent=root;root.setEnabled(false);
  const mats={};function mat(id,color,alpha=1){if(mats[id])return mats[id];const m=new B.StandardMaterial('home-'+id,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();m.alpha=alpha;return mats[id]=m;}
  const wood=mat('wood','#ad784d'),trim=mat('trim','#5e4231'),stone=mat('stone','#a2a19a'),roof=mat('roof','#475f70'),cream=mat('cream','#f3e8c7'),glass=mat('glass','#a3e1e0',.55),green=mat('green','#5fe786',.5),chosen=mat('chosen','#b0ff73',.65),gridMat=mat('grid','#dbefbd',.2),ghostGood=mat('ghost-good','#72f3a0',.5),ghostBad=mat('ghost-bad','#ff776a',.5);
  function box(name,parent,w,h,d,x,y,z,m){const v=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);v.parent=parent;v.position.set(x,y,z);v.material=m;v.isPickable=false;return v;}
  box('home-ground',root,110,.3,110,0,-.22,8,mat('grass','#6e975c'));
  box('home-path',root,7,.07,85,0,.01,5,mat('path','#c7b790'));
  box('home-stream',root,6,.08,105,42,-.03,8,mat('water','#71bdce'));
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,x=Math.cos(a)*49,z=8+Math.sin(a)*49;box('garden-trunk',root,.7,4,.7,x,2,z,trim);const top=B.MeshBuilder.CreateSphere('garden-tree',{diameter:6,segments:7},scene);top.parent=root;top.position.set(x,5,z);top.material=mat('leaves','#3d714d');top.isPickable=false;}
  const plots=H.sites.map(site=>{const mesh=box('available-land-'+site.id,root,17,.1,14,site.x,.08,site.z,green);mesh.metadata={selectTarget:{type:'home-land',id:site.id}};mesh.isPickable=true;return mesh;});
  let state={},tool={},signature='',preview=null,pieces=[],grids=[],active=false,harvestTool=null,harvestKey='',lastStrike=-1;
  const progress=document.createElement('div');progress.className='ix-harvest';progress.hidden=true;progress.innerHTML='<strong></strong><progress max="1"></progress><small>동작이 끝나면 자재가 가방에 들어갑니다.</small>';document.body.appendChild(progress);
  function pieceModel(piece,parent,override){const node=new B.TransformNode('house-piece-'+piece.id,scene);node.parent=parent;node.metadata={pieceId:piece.id,kind:piece.kind};const center=H.point(state.home.plot,piece);node.position.set(center.x,0,center.z);const c=H.cell,kind=piece.kind;if(H.parts[kind].layer==='furniture')node.rotation.y=piece.rotation*Math.PI/2;
   const add=(name,w,h,d,x,y,z,m)=>box(name,node,w,h,d,x,y,z,override||m);
   if(kind==='floor'){add('plank-floor',c-.04,.22,c-.04,0,.13,0,wood);for(let i=-1;i<=1;i++)add('floor-joint',.025,.006,c-.05,i*.65,.245,0,trim);}
   if(kind==='roof'){add('roof-tile',c+.1,.24,c+.1,0,3.65,0,roof);add('roof-ridge',c+.1,.12,.08,0,3.8,0,trim);}
   if(H.parts[kind].layer==='edge'){
    node.position.x+=(piece.rotation===1?1:piece.rotation===3?-1:0)*c/2;node.position.z+=(piece.rotation===2?1:piece.rotation===0?-1:0)*c/2;node.rotation.y=piece.rotation*Math.PI/2;
    if(kind==='wall')add('wall-panel',c,3.3,.2,0,1.85,0,wood);
    if(kind==='window'){add('window-bottom',c,1.1,.2,0,.78,0,wood);add('window-top',c,.6,.2,0,3.18,0,wood);add('window-glass',c-.5,1.8,.07,0,2,0,glass);add('window-cross',.08,1.8,.16,0,2,0,trim);}
    [-1,1].forEach(sign=>add('wall-post',.16,3.5,.28,sign*(c/2-.08),1.86,0,trim));add('wall-beam',c,.16,.28,0,3.52,0,trim);
    if(kind==='door'){const hinge=new B.TransformNode('door-hinge',scene);hinge.parent=node;hinge.position.set(-c/2+.18,.23,0);hinge.rotation.y=piece.open?-Math.PI/2:0;box('door-panel',hinge,c-.36,3.1,.15,(c-.36)/2,1.55,0,override||wood);box('door-handle',hinge,.1,.1,.22,c-.62,1.45,-.13,override||cream);}
   }
   if(kind==='table'){add('table-top',1.7,.16,1.5,0,1.35,0,wood);[-.65,.65].forEach(x=>[-.55,.55].forEach(z=>add('table-leg',.16,1.1,.16,x,.7,z,trim)));}
   if(kind==='bed'){add('bed-frame',1.6,.4,2,0,.45,0,trim);add('bed-mattress',1.5,.25,1.9,0,.78,0,mat('blanket','#8aafbf'));add('pillow',1.25,.2,.45,0,.98,.65,cream);}
   if(kind==='planter'){add('planter-pot',.9,.75,.9,0,.58,0,stone);const leaves=B.MeshBuilder.CreateSphere('planter-leaves',{diameter:1.2,segments:7},scene);leaves.parent=node;leaves.position.y=1.4;leaves.material=override||mat('leaves','#3d714d');}
   node.getChildMeshes().forEach(m=>{m.isPickable=!override;m.metadata={selectTarget:{type:'home-piece',id:piece.id}};});return node;
  }
  function rebuild(){decor.getChildren().forEach(n=>n.dispose());pieces=[];grids=[];preview=null;
   if(!state.home?.plot)return;const d=H.deeds[state.home.plot.size];
   for(let x=0;x<d.width;x++)for(let z=0;z<d.depth;z++){const p=H.point(state.home.plot,{x,z}),mesh=box('house-grid-'+x+'-'+z,decor,H.cell-.04,.015,H.cell-.04,p.x,.265,p.z,gridMat);mesh.metadata={selectTarget:{type:'home-cell',id:x+':'+z,x,z}};grids.push(mesh);}
   for(const p of state.home.pieces)pieces.push(pieceModel(p,decor));updateTool();
  }
  function updateTool(){plots.forEach((mesh,i)=>{mesh.setEnabled(active&&!!tool.deed&&!state.home?.plot);mesh.material=H.sites[i].id===tool.siteId?chosen:green;if(H.deeds[tool.deed])mesh.scaling.set(H.deeds[tool.deed].width*H.cell/17,1,H.deeds[tool.deed].depth*H.cell/14);});grids.forEach(m=>{m.setEnabled(!!tool.building);m.isPickable=!!tool.building;});if(preview){preview.dispose();preview=null;}if(active&&tool.building&&tool.cell&&state.home?.plot){const p={...tool.cell,kind:tool.kind||'floor',rotation:tool.rotation||0,id:'preview'};if(!H.placementError(state.home,p)){preview=pieceModel(p,decor,H.placementError(state.home,p,state.profile.resources)?ghostBad:ghostGood);}}}
  function setState(next){state=next;active=!!next.realm;root.setEnabled(active);const sig=JSON.stringify(next.home);if(sig!==signature){signature=sig;rebuild();}updateTool();}
  function setTool(next){tool=next||{};updateTool();}
  function frame(avatar,camera){
   if(active){if(tool.deed){camera.setTarget(new B.Vector3(0,0,7));camera.radius=85;camera.beta=.62;}else if(tool.building&&state.home?.plot){const s=H.sites.find(s=>s.id===state.home.plot.siteId);camera.setTarget(new B.Vector3(s.x,0,s.z));camera.radius=27;camera.beta=.55;}
    const home=state.home,d=home?.plot&&H.deeds[home.plot.size],s=home?.plot&&H.sites.find(s=>s.id===home.plot.siteId),inside=d&&Math.abs(avatar.position.x-s.x)<d.width*H.cell/2&&Math.abs(avatar.position.z-s.z)<d.depth*H.cell/2;
    pieces.forEach(p=>{if(p.metadata.kind==='roof')p.setEnabled(!inside&&!tool.building);});
   }
   const me=state.players?.find(p=>p.uid===state.you),harvest=me?.harvest,node=state.resources?.find(n=>n.id===harvest?.nodeId);
   const key=harvest?harvest.nodeId+':'+harvest.startedAt:'';
   if(key!==harvestKey){harvestKey=key;lastStrike=-1;if(harvestTool){harvestTool.dispose();harvestTool=null;}if(harvest&&avatar.metadata.arms[1]){harvestTool=new B.TransformNode('harvest-tool',scene);harvestTool.parent=avatar.metadata.arms[1];box('tool-handle',harvestTool,.08,1.1,.08,0,-.65,.1,trim);box('tool-head',harvestTool,harvest.kind==='wood'?.65:.9,.22,.18,.2,-1.13,.1,stone);}}
   progress.hidden=!harvest;
   if(harvest&&node){const t=Math.max(0,Date.now()-(state.receivedAt||Date.now())+(state.serverTime-harvest.startedAt)),phase=t/400,strike=Math.floor(phase);
    avatar.rotation.y=Math.atan2(node.x-avatar.position.x,node.z-avatar.position.z);avatar.metadata.arms.forEach((a,i)=>{a.rotation.x=-1.1+Math.sin(phase*Math.PI*2)*.9;a.rotation.z=(i?1:-1)*.12;});avatar.metadata.torso.rotation.x=Math.sin(phase*Math.PI*2)*.08;
    progress.querySelector('strong').textContent=(harvest.kind==='wood'?'🪓 벌목 중':harvest.kind==='stone'?'⛏️ 석재 채광 중':'⛏️ 모래 채집 중');progress.querySelector('progress').value=Math.min(1,t/2400);
    if(strike!==lastStrike){lastStrike=strike;global.InsectAudio?.play(harvest.kind==='wood'?'chop':'mine');const spark=box('harvest-chip',null,.16,.16,.16,node.x,.9,node.z,harvest.kind==='wood'?wood:stone);setTimeout(()=>spark.dispose(),300);}
   }else if(avatar.metadata.torso)avatar.metadata.torso.rotation.x=0;
  }
  return {root,setState,setTool,frame,isActive:()=>active,dispose(){progress.remove();root.dispose();Object.values(mats).forEach(m=>m.dispose());}};
 }
 global.InsectHousingWorld={create};
})(window);
