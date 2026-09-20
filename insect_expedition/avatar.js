(function (global) {
  'use strict';
  const B = global.BABYLON, A = global.InsectAppearance;
  function create(scene, id, nickname, pickData, appearance, helpers) {
    const a = A.normalize(appearance,id), {part,material,label} = helpers;
    const root = new B.TransformNode('avatar-' + (pickData ? pickData.id : 'local'),scene);
    const body = new B.TransformNode('avatar-body',scene); body.parent=root; body.scaling.setAll(a.height);
    const mat = (name,color) => {const m=material(scene,'avatar-'+name,color);m.specularColor=new B.Color3(.015,.015,.015);m.emissiveColor=m.diffuseColor.scale(.08);return m;};
    const skin=mat('skin',a.skin),hair=mat('hair',a.hairColor),cloth=mat('cloth',a.topColor),pants=mat('pants',a.bottomColor),accent=mat('accent',a.accent),white=mat('cream','#fff6ed'),dark=mat('dark','#383344'),iris=mat('iris',a.eyeColor),blush=mat('blush','#e6a1a2');
    const ball=(parent,name,size,at,m)=>part(scene,parent,name,'sphere',{diameterX:size[0],diameterY:size[1],diameterZ:size[2],segments:16},at,m);
    const box=(parent,name,size,at,m)=>part(scene,parent,name,'box',{width:size[0],height:size[1],depth:size[2]},at,m);
    function softBox(parent,name,size,at,m){
      const mesh=ball(parent,name,[1,1,1],at,m),positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),indices=mesh.getIndices(),normals=[];
      for(let i=0;i<positions.length;i++)positions[i]=Math.sign(positions[i])*Math.pow(Math.abs(positions[i])*2,.48)*.5*size[i%3];
      B.VertexData.ComputeNormals(positions,indices,normals);mesh.setVerticesData(B.VertexBuffer.PositionKind,positions);mesh.setVerticesData(B.VertexBuffer.NormalKind,normals);return mesh;
    }
    const tube=(parent,name,points,r,m)=>{const mesh=B.MeshBuilder.CreateTube(name,{path:points.map(p=>new B.Vector3(...p)),radius:r,tessellation:8},scene);mesh.parent=parent;mesh.material=m;mesh.isPickable=false;return mesh;};
    const ring=(parent,name,diameter,thickness,at,m)=>{const mesh=part(scene,parent,name,'torus',{diameter,thickness,tessellation:24},at,m);mesh.rotation.x=Math.PI/2;return mesh;};
    const width=(a.build==='slim'?.9:1)*(a.body==='girl'?.95:1);
    const torso=softBox(body,'torso',[.94*width,.96,.64],[0,1.29,0],cloth);
    ball(body,'hem',[.94*width,.18,.69],[0,.84,0],cloth);
    const headRoot=new B.TransformNode('head-accessories',scene);headRoot.parent=body;headRoot.position.y=2.05;
    const head=ball(headRoot,'head',[1.02,.94,.84],[0,0,0],skin);
    [-1,1].forEach(side=>ball(headRoot,'ear',[.18,.24,.16],[side*.5,-.035,0],skin));
    // Hair cap is an upper hemisphere: the face stays visible at every angle.
    const cap=B.MeshBuilder.CreateSphere('hair-cap',{diameter:1,slice:.53,segments:24},scene);cap.scaling.set(1.1,1.03,.95);cap.parent=headRoot;cap.position.set(0,.08,-.025);cap.material=hair;
    const locks=[];
    for(let i=0;i<5;i++){const x=(i-2)*.18;const lock=ball(headRoot,'fringe',[.29,.37+(i%2)*.055,.16],[x,.25,.348-Math.abs(x)*.15],hair);lock.rotation.z=(i-2)*-.12;locks.push(lock);}
    [-1,1].forEach(side=>{
      const length=a.hairStyle==='crop'?.35:a.hairStyle==='bob'?.72:.55;
      ball(headRoot,'side-lock',[.23,length,.42],[side*.455,.11-length*.26,-.015],hair);
      if(a.hairStyle==='bob')ball(headRoot,'bob-back',[.5,.73,.45],[side*.26,-.06,-.29],hair);
      if(a.hairStyle==='wave')for(let i=0;i<3;i++){
        const lock=ball(headRoot,'wave-lock',[.33,.98-i*.06,.33],[side*(.26+i*.13),-.35,-.27+i*.1],hair);lock.rotation.z=side*(i-1)*.12;locks.push(lock);
      }
      if(a.hairStyle==='twintail'){
        ball(headRoot,'hair-tie',[.2,.2,.2],[side*.56,.13,-.08],accent);
        for(let i=0;i<3;i++)ball(headRoot,'twin-lock',[.35-i*.06,.43,.35-i*.035],[side*(.62+i*.055),-.08-i*.25,-.1],hair);
      }
      if(a.hairStyle==='buns'){ball(headRoot,'hair-bun',[.43,.42,.41],[side*.46,.47,-.12],hair);ring(headRoot,'bun-ribbon',.32,.055,[side*.46,.47,.055],accent);}
    });
    if(a.hairStyle==='wave')ball(headRoot,'long-hair-back',[.89,1.18,.34],[0,-.29,-.39],hair);
    if(a.hairStyle==='ponytail'){
      ball(headRoot,'pony-tie',[.27,.25,.26],[0,.37,-.43],accent);
      for(let i=0;i<4;i++)ball(headRoot,'pony-lock',[.43-i*.05,.4,.36],[0,.24-i*.25,-.52-i*.035],hair);
    }
    [-1,1].forEach(side=>{
      const x=side*.195;
      if(a.face==='wink'&&side===1)tube(headRoot,'wink',[[x-.075,.03,.411],[x,.07,.431],[x+.075,.03,.411]],.022,dark);
      else {
        const eyeHeight=a.face==='sleepy'?.085:a.face==='bright'?.23:.185;
        ball(headRoot,'eye',[.122,eyeHeight,.045],[x,.025,.409],iris);
        if(a.face!=='sleepy'){ball(headRoot,'eye-shine',[.044,.055,.02],[x-.021,.067,.436],white);ball(headRoot,'eye-spark',[.022,.027,.015],[x+.025,-.016,.438],white);}
      }
      tube(headRoot,'eyebrow',[[x-.06,.155,.394],[x,.172,.408],[x+.055,.16,.396]],.011,hair);
      ball(headRoot,'cheek',[.145,.055,.025],[side*.31,-.095,.365],blush);
    });
    ball(headRoot,'nose',[.073,.062,.06],[0,-.065,.431],skin);
    tube(headRoot,'smile',Array.from({length:9},(_,i)=>{const t=i/8;return[(t-.5)*.15,-.156-Math.sin(t*Math.PI)*.034,.401+Math.sin(t*Math.PI)*.015];}),.013,dark);
    const arms=[],legs=[],knees=[];
    [-1,1].forEach((side,i)=>{
      const shoulder=new B.TransformNode('shoulder-'+i,scene);shoulder.parent=body;shoulder.position.set(side*.55*width,1.61,0);
      const sleeveMat=a.top==='varsity'?white:cloth;
      softBox(shoulder,'puffy-sleeve',[.36,.68,.39],[side*.01,-.29,0],sleeveMat);
      ball(shoulder,'cuff',[.32,.13,.32],[0,-.62,0],accent);
      ball(shoulder,'hand',[.28,.26,.29],[0,-.79,.015],skin);
      const hip=new B.TransformNode('hip-'+i,scene);hip.parent=body;hip.position.set(side*.23,.78,0);
      const knee=new B.TransformNode('knee-'+i,scene);knee.parent=hip;knee.position.y=-.38;
      softBox(hip,'thigh',[.36,.42,.38],[0,-.17,0],pants);
      softBox(knee,'shin',[a.bottom==='pants'?.35:.25,.36,.31],[0,-.16,0],a.bottom==='pants'?pants:skin);
      ball(knee,'sock',[.29,.15,.32],[0,-.27,0],white);
      softBox(knee,'shoe',[.42,a.shoes==='boots'?.43:.28,.61],[0,-.3,.105],a.shoes==='boots'?accent:white);
      box(knee,'shoe-sole',[.37,.075,.53],[0,-.43,.1],accent);
      if(a.shoes==='sneakers')for(let k=0;k<3;k++)box(knee,'laces',[.18,.026,.029],[0,-.185,.15+k*.068],accent);
      arms.push(shoulder);legs.push(hip);knees.push(knee);
    });
    let skirt=null;
    if(a.bottom==='skirt'){
      skirt=part(scene,body,'pleated-skirt','cylinder',{diameterTop:.75*width,diameterBottom:1.23,height:.42,tessellation:16},[0,.66,0],pants);
      skirt.scaling.z=.72;
    }
    if(a.top==='hoodie'){
      ball(body,'hood',[.93,.4,.52],[0,1.7,-.25],cloth);
      [-1,1].forEach(side=>tube(body,'hood-string',[[side*.12,1.65,.33],[side*.15,1.36,.355]],.015,white));
      ball(body,'pocket',[.48,.23,.08],[0,1.05,.36],accent);
    } else if(a.top==='cardigan') {
      box(body,'cardigan-shirt',[.28,.65,.025],[0,1.33,.351],white);
      for(let i=0;i<3;i++)ball(body,'button',[.06,.06,.04],[.075,1.13+i*.17,.379],accent);
    } else if(a.top==='varsity') {
      box(body,'jacket-zip',[.035,.72,.035],[0,1.24,.366],white);
      ball(body,'star-patch',[.2,.2,.035],[-.23,1.46,.349],accent);
      box(body,'star-cross',[.065,.25,.04],[-.23,1.46,.354],white);
    } else {
      ball(body,'ribbon-left',[.22,.15,.08],[-.1,1.6,.3],accent).rotation.z=.3;
      ball(body,'ribbon-right',[.22,.15,.08],[.1,1.6,.3],accent).rotation.z=-.3;
      ball(body,'ribbon-knot',[.09,.1,.1],[0,1.6,.34],accent);
    }
    if(a.headwear==='ribbon'){
      [-1,1].forEach(side=>{const m=ball(headRoot,'head-ribbon',[.43,.3,.17],[side*.2,.53,.03],accent);m.rotation.z=side*-.28;});ball(headRoot,'ribbon-center',[.16,.17,.19],[0,.53,.06],accent);
    } else if(a.headwear==='cat') {
      [-1,1].forEach(side=>{part(scene,headRoot,'cat-ear','cylinder',{height:.35,diameterBottom:.31,diameterTop:0,tessellation:3},[side*.37,.63,0],hair);part(scene,headRoot,'pink-ear','cylinder',{height:.22,diameterBottom:.2,diameterTop:0,tessellation:3},[side*.37,.61,.095],accent);});
    } else if(a.headwear==='beret') {
      ball(headRoot,'beret',[1.14,.32,.99],[.06,.51,-.05],accent).rotation.z=-.14;
      ball(headRoot,'beret-stem',[.09,.14,.09],[.08,.72,-.06],accent);
    }
    if(a.accessory==='glasses'){
      [-1,1].forEach(side=>ring(headRoot,'glasses',.3,.026,[side*.195,.02,.456],accent));tube(headRoot,'glasses-bridge',[[-.045,.035,.458],[0,.06,.468],[.045,.035,.458]],.014,accent);
    } else if(a.accessory==='bag') {
      const bag=ball(body,'bear-bag',[.68,.72,.32],[0,1.17,-.46],accent);
      [-1,1].forEach(side=>{ball(body,'bag-ear',[.21,.22,.16],[side*.24,1.53,-.49],accent);ball(body,'bag-eye',[.045,.05,.025],[side*.12,1.27,-.627],dark);tube(body,'bag-strap',[[side*.27,1.67,-.14],[side*.3,1.34,.32],[side*.3,.96,.26]],.032,accent);});
      ball(body,'bag-muzzle',[.2,.13,.07],[0,1.15,-.63],white);ball(body,'bag-nose',[.065,.045,.035],[0,1.185,-.672],dark);
    } else if(a.accessory==='satchel') {
      tube(body,'cross-strap',[[-.36,1.67,.25],[.12,1.2,.385],[.49,.95,.12]],.036,accent);
      ball(body,'mini-bag',[.41,.4,.27],[.49,.9,.13],accent);ball(body,'bag-clasp',[.08,.075,.035],[.49,.92,.268],white);
    }
    label(scene,root,nickname||'나의 탐험가',3.13*a.height,pickData&&pickData.busy?'#ffd166':'#ffffff');
    root.getChildMeshes().forEach(mesh=>{mesh.isPickable=!!pickData;mesh.metadata=pickData?{selectTarget:pickData}:{};});
    root.metadata={id,appearance:a,appearanceKey:A.key(a),bodyRoot:body,height:a.height,torso,head,hair:cap,arms,legs,knees,skirt,walk:0,walkWeight:0,targetX:0,targetZ:0,nickname};
    return root;
  }
  global.InsectAvatar={create};
})(window);
