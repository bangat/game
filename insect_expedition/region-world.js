(function(global){
  'use strict';
  const B=global.BABYLON,R=global.InsectRegions;
  function create(scene,parent,helpers){
    const {part,material,label,disposeNode,groundMaterial}=helpers;
    let root=null,current='',gates=[],occluders=[],occlusionAt=0;
    function setRegion(id){
      if(id===current)return;current=id;if(root)disposeNode(root);gates=[];
      root=new B.TransformNode('region-'+id,scene);root.parent=parent;
      const theme=R.themes[id]||R.themes.safe,biome=R.get(id),rocky=['cave','mine','nest','facility','rock','quarry','sanctum'].includes(id);
      const mat=(name,color,glow=0)=>material(scene,'region-'+name,color,glow);
      const groundMat=groundMaterial(scene,{id:rocky?'rock':id,color:theme.ground},7300);groundMat.diffuseColor=rocky?new B.Color3(.85,.83,.81):new B.Color3(.88,.98,.81);groundMat.specularColor=B.Color3.Black();
      if(groundMat.diffuseTexture)groundMat.diffuseTexture.uScale=groundMat.diffuseTexture.vScale=38;
      const terrain=B.MeshBuilder.CreateGround('region-terrain',{width:430,height:430,subdivisions:170,updatable:true},scene);terrain.parent=root;terrain.material=groundMat;terrain.receiveShadows=true;
      const positions=terrain.getVerticesData(B.VertexBuffer.PositionKind),normals=[],colors=[];
      for(let i=0;i<positions.length;i+=3){positions[i+1]=R.terrain(id,positions[i],positions[i+2]);const shade=.82+.18*Math.sin(positions[i]*.03)*Math.cos(positions[i+2]*.04);colors.push(shade,shade,shade,1);}
      B.VertexData.ComputeNormals(positions,terrain.getIndices(),normals);terrain.updateVerticesData(B.VertexBuffer.PositionKind,positions);terrain.updateVerticesData(B.VertexBuffer.NormalKind,normals);terrain.setVerticesData(B.VertexBuffer.ColorKind,colors);terrain.updateCoordinateHeights();terrain.isPickable=false;
      const wood=mat('wood','#705443'),leaf=mat('foliage',theme.leaf),stone=mat('stone',rocky?'#7d7984':'#838977'),path=mat('path',id==='farm'?'#a68b59':'#c7b795'),glow=mat('glow',theme.leaf,.6),white=mat('white','#edf3e2');
      const add=(name,kind,size,x,y,z,m)=>part(scene,root,name,kind,size,[x,R.terrain(id,x,z)+y,z],m);
      const ball=(name,x,y,z,sx,sy,sz,m)=>add(name,'sphere',{diameterX:sx,diameterY:sy,diameterZ:sz,segments:10},x,y,z,m);
      let seed=Array.from(id).reduce((n,c)=>n+c.charCodeAt(0),147);const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      // Tall silhouettes surround the whole map. No neighboring map is rendered here.
      for(let i=0;i<34;i++){const a=i/34*Math.PI*2,dist=180+rand()*27;ball('distant-ridge',Math.cos(a)*dist,-3,Math.sin(a)*dist,38+rand()*30,28+rand()*50,42,leaf);}
      function tree(x,z,scale=1){const node=new B.TransformNode('region-tree',scene);node.parent=root;node.position.set(x,R.terrain(id,x,z),z);node.scaling.setAll(scale);
        part(scene,node,'tree-trunk','cylinder',{height:7,diameterBottom:1.5,diameterTop:.65,tessellation:9},[0,3.5,0],wood);
        for(let j=0;j<3;j++)part(scene,node,'tree-crown','sphere',{diameterX:7-j,diameterY:5.5,diameterZ:7-j,segments:10},[(j-1)*1.3,8+j*1.1,0],leaf);
      }
      const sparse=['rock','quarry','sandpit','cave','mine','nest','facility','sanctum'].includes(id);
      for(let i=0;i<(sparse?35:105);i++){
        const a=rand()*Math.PI*2,dist=35+rand()*122,x=Math.cos(a)*dist,z=Math.sin(a)*dist;
        if((id!=='safe'&&global.InsectEcology.routeDistance(x,z)<10)||global.InsectEcology.landmarks(id).some(p=>Math.hypot(p.x-x,p.z-z)<20)||Math.abs(x)<12&&z>0||R.portals(id).some(p=>Math.hypot(p.x-x,p.z-z)<10))continue;
        if(sparse){
          if(['cave','mine','nest'].includes(id)){const c=add('crystal-cluster','cylinder',{height:3+rand()*9,diameterTop:0,diameterBottom:1.5+rand()*3,tessellation:5},x,2,z,glow);c.rotation.z=(rand()-.5)*.4;}
          else ball('eroded-boulder',x,1,z,3+rand()*6,3+rand()*9,3+rand()*5,stone);
        }else tree(x,z,id==='forest'?.9+rand()*1.2:.55+rand()*.65);
      }
      for(const o of R.obstacles(id))if(o.type==='circle'&&o.id.startsWith('ridge-'))ball(o.id,o.x,3,o.z,o.radius*2,9,o.radius*2,stone);
      // Trails rise with the terrain, leaving broad hills open to exploration.
      function terrainStrip(name,center,width,start,end,mat){
        const paths=[];
        for(let side=0;side<=8;side++){const points=[];for(let z=start;z<=end;z+=.5){const x=center(z)+(side/8-.5)*width;points.push(new B.Vector3(x,terrain.getHeightAtCoordinates(x,z)+.06,z));}paths.push(points);}
        const mesh=B.MeshBuilder.CreateRibbon(name,{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.parent=root;mesh.material=mat;mesh.isPickable=false;mesh.receiveShadows=true;return mesh;
      }
      if(id==='safe')terrainStrip('hill-trail',z=>0,7,-135,100,path);
      else {
        const ecology=global.InsectEcology,trailMat=mat('warm-trail',rocky?'#ac977f':'#bb9464'),moss=mat('moss','#6b9560'),petal=mat('petal',id==='forest'?'#d4acff':'#ffe8a2',.1),water=mat('spring','#62bfc2',.25),dark=mat('hollow','#152e35');
        function ribbon(name,line,width,m){
          const curve=B.Curve3.CreateCatmullRomSpline(line.map(p=>new B.Vector3(p[0],0,p[1])),28,false).getPoints(),edges=Array.from({length:9},()=>[]);
          for(let i=0;i<curve.length;i++){const p=curve[i],a=curve[Math.max(0,i-1)],b=curve[Math.min(curve.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.max(.01,Math.hypot(dx,dz));for(let k=0;k<9;k++){const offset=(k/8-.5)*width,px=p.x-dz/len*offset,pz=p.z+dx/len*offset;edges[k].push(new B.Vector3(px,terrain.getHeightAtCoordinates(px,pz)+.1,pz));}}
          const mesh=B.MeshBuilder.CreateRibbon(name,{pathArray:edges,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.parent=root;mesh.material=m;mesh.isPickable=false;mesh.receiveShadows=true;
        }
        ecology.trails.forEach((line,i)=>ribbon('ecology-trail-'+i,line,6.4,trailMat));
        // Flat-topped rocks and exposed strata make the hill silhouettes readable.
        for(let i=0;i<18;i++){const x=-78+Math.sin(i*1.8)*17,z=-52+i*3.1;ball('hill-strata',x,-1,z,12+i%3*3,6,10,stone);}
        for(const site of ecology.landmarks(id)){
          const x=site.x,z=site.z;
          const sign=new B.TransformNode('site-'+site.siteId,scene);sign.parent=root;sign.position.set(x,R.terrain(id,x,z),z);
          part(scene,sign,'waypost','cylinder',{height:3.4,diameter:.24,tessellation:6},[-6,1.7,4],wood);
          part(scene,sign,'wood-sign','box',{width:3.4,height:1.1,depth:.23},[-6,3.1,4],wood);
          const plate=label(scene,sign,site.name,4.5,'#fff1bc');plate.position.x=-6;plate.position.z=4;
          sign.getChildMeshes().forEach(m=>{m.isPickable=true;m.metadata={selectTarget:{type:'site',id:site.id}};});
          if(site.kind==='flowers'){
            for(let i=0;i<30;i++){const a=i*2.39996,d=4+i%5*1.7,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;add('flower-stalk','cylinder',{height:.9,diameter:.1,tessellation:4},px,.45,pz,moss);ball('flower-head',px,1,pz,.65,.3,.65,petal);}
            for(const px of [x-8,x+8]){add('camp-bench','box',{width:4,height:.4,depth:1.4},px,.8,z+2,wood);}
          }
          if(site.kind==='log'){
            add('ancient-tree','cylinder',{height:18,diameterBottom:7,diameterTop:3.4,tessellation:12},x,9,z-8,wood);
            for(let i=0;i<5;i++)ball('ancient-canopy',x+Math.cos(i)*5,19+i%2*3,z-8+Math.sin(i)*5,16,10,14,leaf);
            for(let i=0;i<4;i++){const a=i*Math.PI/2,branch=add('ancient-root','cylinder',{height:9,diameter:1.4,tessellation:7},x+Math.cos(a)*3,1,z-8+Math.sin(a)*3,wood);branch.rotation.z=Math.PI/2;branch.rotation.y=-a;}
            const log=add('fallen-hollow-log','cylinder',{height:12,diameter:3.8,tessellation:10},x-12,1.4,z-2,wood);log.rotation.z=Math.PI/2;
            for(let i=0;i<6;i++)ball('sap-drop',x-2+i%2,3+i*.5,z-4.5,.55,.8,.45,mat('amber','#ffc969',.35));
          }
          if(site.kind==='pool'){
            // Shallow spring and an actual plank crossing, with rails and support posts.
            ribbon('spring-stream',[[x+7,z-19],[x+9,z-3],[x+14,z+15]],9,water);
            ribbon('stepping-bridge',[[x-1,z],[x+21,z+4]],4,wood);
            for(let i=0;i<7;i++){const px=x+i*3.2,pz=z+i*.18;add('bridge-plank','box',{width:2.8,height:.2,depth:4.8},px,.32,pz,wood);for(const side of [-1,1])add('bridge-post','cylinder',{height:1.8,diameter:.23,tessellation:6},px,.9,pz+side*2.3,wood);}
            for(let i=0;i<10;i++)ball('river-stone',x+7+Math.sin(i)*8,.5,z-8+i*2,2.5,1.7,2,stone);
          }
          if(site.kind==='ruins'){
            for(let i=0;i<5;i++){const px=x-10+i*5;add('broken-column','cylinder',{height:5+i%3*2,diameter:1.6,tessellation:8},px,2.5+i%3,z-8,stone);add('column-cap','box',{width:2.4,height:.6,depth:2.4},px,5.3+i%3*2,z-8,stone);}
            const beam=add('collapsed-lintel','box',{width:12,height:1.5,depth:2.2},x,1,z-4,stone);beam.rotation.z=.13;
            for(let i=0;i<8;i++)add('ruin-paving','box',{width:2.7,height:.17,depth:2.7},x-6+i%4*4,.12,z+Math.floor(i/4)*4,path);
            add('research-crate','box',{width:2,height:1.6,depth:1.6},x+8,.8,z+3,wood);
          }
          if(site.kind==='cave'){
            ball('cave-mound',x,6,z-9,23,19,16,stone);
            add('cave-mouth','box',{width:6,height:7,depth:.35},x,3.6,z-.8,dark);
            for(const side of [-1,1])add('cave-jamb','box',{width:2.2,height:8,depth:4},x+side*4,4,z-1,stone);
            add('cave-lintel','box',{width:10,height:2.4,depth:4},x,8,z-1,stone);
            for(let i=0;i<6;i++)add('cave-luminous-crystal','cylinder',{height:2+i%3,diameterTop:0,diameterBottom:.8,tessellation:5},x-7+i*3,1,z+2,glow);
          }
          if(site.kind==='nest'){
            for(let i=0;i<12;i++){const a=i/12*Math.PI*2,px=x+Math.cos(a)*17,pz=z+Math.sin(a)*17;add('guardian-standing-stone','box',{width:2,height:5+i%3,depth:2.2},px,2.5+i%3/2,pz,stone);}
            const ring=add('guardian-ring','torus',{diameter:16,thickness:.25,tessellation:48},x,.3,z,glow);
            for(let i=0;i<14;i++)ball('guardian-root',x+Math.cos(i)*10,.2,z+Math.sin(i)*10,4,1.3,3,wood);
          }
        }
        for(let i=0;i<48;i++){const line=ecology.trails[i%ecology.trails.length],a=line[i%line.length],x=a[0]+Math.sin(i*2.4)*10,z=a[1]+Math.cos(i*2.4)*10;ball('trail-firefly',x,1.7+i%3*.6,z,.12,.12,.12,glow);}
      }
      if(id==='safe'){
        add('village-plaza','cylinder',{diameter:40,height:.12,tessellation:64},0,.14,12,path);
        for(const x of [-23,23])for(const z of [6,26]){tree(x,z,.65);add('garden-bed','cylinder',{diameter:7,height:.35,tessellation:20},x,.18,z,wood);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ball('garden-flower',x+Math.cos(a)*2, .7,z+Math.sin(a)*2,.6,.7,.6,glow);}}
        add('research-lab','box',{width:18,height:7,depth:10},0,3.5,-6,mat('plaster','#eee0bc'));
        add('research-roof','cylinder',{diameter:17,height:5,tessellation:4},0,8,-6,mat('roof','#637b98')).rotation.y=Math.PI/4;
        for(const x of [-5,5])add('lab-window','box',{width:3,height:2.8,depth:.1},x,4,-.95,glow);
        add('lab-door','box',{width:2.4,height:3.5,depth:.1},0,1.8,-.9,wood);
        const sign=label(scene,root,'이슬숲 마을 · 지도에서 다음 탐험지를 선택하세요',5,'#fff1bf');sign.position.z=12;
      }
      if(id==='grassland'||id==='farm'){
        const field=mat('gold-field','#d5bf64');
        for(let i=0;i<36;i++){const x=-100+(i%6)*8,z=-65+Math.floor(i/6)*10;add('crop-row','box',{width:5,height:.4,depth:6},x,.2,z,field);}
        add('windmill-tower','cylinder',{diameterBottom:6,diameterTop:3,height:18,tessellation:12},-45,9,-40,white);
        for(let i=0;i<4;i++){const arm=add('windmill-blade','box',{width:1,height:15,depth:.3},-45,16,-37,wood);arm.rotation.z=i*Math.PI/2+.5;}
      }
      if(id==='river'||id==='wetland'){
        const water=mat('water',id==='river'?'#67b9d5':'#538d92',.16);
        terrainStrip('river-water',z=>32+Math.sin(z*.025)*14,id==='river'?18:25,-150,150,water);
        for(const z of [-55,15,85])add('river-bridge','box',{width:30,height:.4,depth:6},32+Math.sin(z*.025)*14,.45,z,wood);
        for(let i=0;i<45;i++){const z=rand()*270-135,x=53+Math.sin(z*.025)*14;add('reeds','cylinder',{height:2.5,diameter:.13,tessellation:5},x,1.2,z,leaf);}
      }
      if(id==='facility'||id==='sanctum')for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2,x=Math.cos(a)*64,z=Math.sin(a)*64;add('ruin-column','box',{width:3,height:8+i%4,depth:3},x,4,z,stone);add('ruin-glow','box',{width:5,height:.12,depth:2},x,.15,z,glow);
      }
      if(['lumber','quarry','sandpit'].includes(id)){
        for(let i=0;i<8;i++)add('camp-stock','box',{width:5,height:1.4,depth:3},-28+i*8,.7,-16,id==='lumber'?wood:stone);
        const sign=label(scene,root,biome.name+' · 채집한 자재는 상점에서 판매',4,'#fff0bf');sign.position.z=-12;
      }
      occluders=root.getChildMeshes().filter(m=>['tree-trunk','tree-crown','ancient-tree','ancient-canopy','cave-mound','distant-ridge','hill-strata'].includes(m.name));
      applyAtmosphere();
    }
    function applyAtmosphere(){const t=R.themes[current]||R.themes.safe;scene.clearColor=B.Color4.FromHexString(t.sky+'ff');scene.fogColor=B.Color3.FromHexString(t.sky);scene.fogStart=['forest','wetland','cave','mine','nest'].includes(current)?90:130;scene.fogEnd=245;}
    function frame(now,camera,avatar){
      if(camera&&avatar&&now-occlusionAt>140){occlusionAt=now;const from=camera.globalPosition,to=avatar.position.add(new B.Vector3(0,1.4,0)),delta=to.subtract(from),length=delta.lengthSquared();
        for(const mesh of occluders){const bounds=mesh.getBoundingInfo().boundingSphere,offset=bounds.centerWorld.subtract(from),t=B.Vector3.Dot(offset,delta)/Math.max(1,length),distance=B.Vector3.Distance(bounds.centerWorld,from.add(delta.scale(Math.max(0,Math.min(1,t)))));mesh.visibility=t>0&&t<.98&&distance<bounds.radiusWorld+1?.08:1;}}
      gates.forEach((g,i)=>{g.ring.rotation.z=Math.sin(now/1200+i)*.08;g.surface.visibility=.25+Math.sin(now/450+i)*.1;});}
    return {setRegion,frame,applyAtmosphere,getRegion:()=>current,dispose(){if(root)disposeNode(root);}};
  }
  global.InsectRegionWorld={create};
})(window);
