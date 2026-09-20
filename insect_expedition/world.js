(function (global) {
  'use strict';

  var B = global.BABYLON;
  var WORLD_HALF = 240;
  var ASSET_ROOT = '';
  if (typeof document !== 'undefined') { for (var scriptIndex = document.scripts.length - 1; scriptIndex >= 0; scriptIndex -= 1) { var scriptSrc = document.scripts[scriptIndex].src || ''; if (/\/world\.js(?:\?|$)/.test(scriptSrc)) { ASSET_ROOT = scriptSrc.slice(0, scriptSrc.lastIndexOf('/') + 1); break; } } }
  var CHARACTER_IDS = ['original', 'scout', 'botanist', 'beekeeper', 'miner', 'river'];
  var BIOMES = [
    { id: 'forest', name: '솔방울 숲', x: -72, z: -72, color: '#315f45' },
    { id: 'grassland', name: '바람 초원', x: 0, z: -72, color: '#78a95a' },
    { id: 'rock', name: '볕바위 지대', x: 72, z: -72, color: '#8b806d' },
    { id: 'wetland', name: '물안개 습지', x: -72, z: 0, color: '#4d7d69' },
    { id: 'safe', name: '이슬숲 연구소', x: 0, z: 0, color: '#82b96b', safe: true },
    { id: 'river', name: '은물결 강', x: 72, z: 0, color: '#4b8a88' },
    { id: 'farm', name: '해바라기 농장', x: -72, z: 72, color: '#8e9a55' },
    { id: 'cave', name: '울림 동굴', x: 0, z: 72, color: '#4b4b55' },
    { id: 'facility', name: '버려진 온실', x: 72, z: 72, color: '#59666a' }
  ];
  var OBSTACLES = [
    { id: 'lab', type: 'box', x: 0, z: -6, width: 18, depth: 10 },
    { id: 'forest-log', type: 'box', x: -68, z: -62, width: 18, depth: 4 },
    { id: 'rock-arch-a', type: 'circle', x: 73, z: -70, radius: 6 },
    { id: 'rock-arch-b', type: 'circle', x: 91, z: -83, radius: 5 },
    { id: 'farm-barn', type: 'box', x: -82, z: 80, width: 18, depth: 14 },
    { id: 'cave-mound', type: 'circle', x: 1, z: 85, radius: 14 },
    { id: 'facility-main', type: 'box', x: 73, z: 75, width: 25, depth: 17 },
    { id: 'facility-tank', type: 'circle', x: 93, z: 91, radius: 6 }
  ];

  OBSTACLES = global.InsectData ? global.InsectData.obstacles : OBSTACLES.map(function(o){return Object.assign({},o,o.id==='lab'?{}:{x:o.x*2,z:o.z*2});});

  function hex(value) { return B.Color3.FromHexString(value); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function material(scene, name, color, emissive, alpha) {
    var mat = new B.StandardMaterial(name, scene);
    mat.diffuseColor = typeof color === 'string' ? hex(color) : color;
    mat.specularColor = new B.Color3(0.08, 0.1, 0.09);
    if (emissive) mat.emissiveColor = mat.diffuseColor.scale(emissive);
    if (alpha !== undefined) mat.alpha = alpha;
    return mat;
  }
  function groundMaterial(scene, biome, seed) {
    var mat = material(scene, 'ground-' + biome.id, biome.color);
    mat.diffuseColor = B.Color3.Lerp(hex(biome.color), new B.Color3(1, 1, 1), .28);
    mat.emissiveColor = hex(biome.color).scale(.06);
    if (typeof document === 'undefined') return mat;
    if(['cave','rock','facility'].indexOf(biome.id)>=0){
      var stone=new B.DynamicTexture('stone-ground-'+biome.id,{width:256,height:256},scene,false),ctx=stone.getContext(),r=seeded(seed);
      ctx.fillStyle=biome.color;ctx.fillRect(0,0,256,256);
      for(var i=0;i<65;i++){var x=r()*256,y=r()*256;ctx.fillStyle=i%3?'rgba(12,18,28,.16)':'rgba(175,204,210,.14)';ctx.fillRect(x,y,8+r()*30,3+r()*16);ctx.strokeStyle='rgba(12,16,24,.24)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+18,y+8);ctx.lineTo(x+25,y-6);ctx.stroke();}
      stone.wrapU=stone.wrapV=B.Texture.WRAP_ADDRESSMODE;stone.uScale=stone.vScale=16;stone.update(false);mat.diffuseTexture=stone;return mat;
    }
    var mossTexture = new B.Texture(ASSET_ROOT + 'assets/ground-moss.png', scene, false, true);
    mossTexture.wrapU = mossTexture.wrapV = B.Texture.WRAP_ADDRESSMODE; mossTexture.uScale = mossTexture.vScale = biome.id === 'arena' ? 4 : 8;
    mat.diffuseTexture = mossTexture; mat.specularColor = new B.Color3(0.035, 0.05, 0.035);
    return mat;
  }
  function seeded(seed) {
    var value = seed >>> 0;
    return function () { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  }
  function part(scene, parent, name, kind, options, position, mat) {
    var mesh = kind === 'sphere' ? B.MeshBuilder.CreateSphere(name, options, scene) :
      kind === 'cylinder' ? B.MeshBuilder.CreateCylinder(name, options, scene) :
      kind === 'torus' ? B.MeshBuilder.CreateTorus(name, options, scene) :
      B.MeshBuilder.CreateBox(name, options, scene);
    mesh.parent = parent;
    mesh.position.copyFromFloats(position[0], position[1], position[2]);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }
  function label(scene, parent, text, y, color) {
    var plane = B.MeshBuilder.CreatePlane('label', { width: 3.1, height: 0.46 }, scene);
    plane.parent = parent; plane.position.y = y; plane.billboardMode = B.Mesh.BILLBOARDMODE_ALL; plane.isPickable = false;
    if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') { plane.isVisible = false; return plane; }
    var texture = new B.DynamicTexture('labelTexture', { width: 512, height: 80 }, scene, false);
    texture.hasAlpha = true;
    var caption=String(text || '').slice(0,30),fontSize=Math.min(40,Math.floor(480/Math.max(1,caption.length)));
    texture.drawText(caption, null, 55, 'bold '+fontSize+'px sans-serif', color || '#ffffff', 'rgba(14,30,25,.82)', true);
    var mat = material(scene, 'labelMaterial', '#ffffff', 1); mat.diffuseTexture = texture; mat.opacityTexture = texture; mat.disableLighting = true;
    plane.material = mat; return plane;
  }
  function disposeNode(node) {
    if (!node || node.isDisposed()) return;
    var scene = node.getScene(), candidates = new Set(node.metadata && node.metadata.ownedMaterials || []);
    function collect(mat) { if (!mat || candidates.has(mat)) return; candidates.add(mat); (mat.subMaterials || []).forEach(collect); }
    collect(node.material); if (node.getChildMeshes) node.getChildMeshes().forEach(function(mesh){collect(mesh.material);});
    node.dispose(false, false);
    function uses(mat, candidate) { return mat === candidate || !!(mat && mat.subMaterials && mat.subMaterials.some(function(sub){return uses(sub,candidate);})); }
    candidates.forEach(function(mat){if(!scene.meshes.some(function(mesh){return uses(mesh.material,mat);}))mat.dispose(false,true,false);});
  }
  function mergeByMaterial(root, prefix, excluded) {
    excluded = excluded || []; var groups = {}, merged = [];
    root.getChildMeshes().forEach(function(mesh){if(!mesh.material || excluded.indexOf(mesh)>=0 || mesh.isDisposed())return;var key=String(mesh.material.uniqueId);(groups[key]||(groups[key]=[])).push(mesh);});
    Object.keys(groups).forEach(function(key){var meshes=groups[key];if(meshes.length<3)return;var combined=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,true);if(combined){combined.name=prefix+'-'+key;combined.parent=root;combined.isPickable=false;combined.receiveShadows=true;merged.push(combined);}});
    return merged;
  }

  function characterInfo(id) {
    if (global.InsectCharacters) return global.InsectCharacters.getById(id);
    return { id: id || 'original', name: '탐험가', body: '#5ed6f3', accent: '#fff0a6', skin: '#f2c9a5', hair: '#3c2b32', shape: 'round', accessory: 'badge' };
  }

  function createAvatar(scene, id, nickname, pickData) {
    var info = characterInfo(CHARACTER_IDS.indexOf(id) >= 0 ? id : 'original');
    var root = new B.TransformNode('avatar-' + (pickData ? pickData.id : 'local'), scene);
    var bodyMat = material(scene, 'clothes-' + info.id, info.body, 0.05);
    var accentMat = material(scene, 'accent-' + info.id, info.accent, 0.12);
    var skinMat = material(scene, 'skin-' + info.id, info.skin);
    var hairMat = material(scene, 'hair-' + info.id, info.hair);
    var darkMat = material(scene, 'boots-' + info.id, '#233033');
    var sturdy = info.shape === 'sturdy', light = info.shape === 'light';
    var torso = part(scene, root, 'torso', 'sphere', { diameterX: sturdy ? 1.02 : 0.84, diameterY: light ? 1.05 : 1.18, diameterZ: 0.62, segments: 14 }, [0, 1.17, 0], bodyMat);
    var head = part(scene, root, 'head', 'sphere', { diameterX: light ? 0.7 : 0.78, diameterY: light ? 0.78 : 0.84, diameterZ: 0.72, segments: 16 }, [0, 2.04, 0], skinMat);
    var hair = part(scene, root, 'hair', 'sphere', { diameterX: 0.83, diameterY: 0.38, diameterZ: 0.75, segments: 14 }, [0, 2.35, -0.03], hairMat);
    var arms = [], legs = [], knees = [];
    [-1, 1].forEach(function (side) {
      var suffix = side < 0 ? 'l' : 'r';
      var shoulder = new B.TransformNode('shoulder-' + suffix, scene); shoulder.parent = root; shoulder.position.set(side * 0.57, 1.62, 0);
      part(scene, shoulder, 'arm-' + suffix, 'cylinder', { height: 0.87, diameter: 0.27, tessellation: 10 }, [0, -0.42, 0], bodyMat);
      part(scene, shoulder, 'hand-' + suffix, 'sphere', { diameter: 0.3, segments: 10 }, [0, -0.85, 0], skinMat);
      var hip = new B.TransformNode('hip-' + suffix, scene); hip.parent = root; hip.position.set(side * 0.23, 0.78, 0);
      part(scene, hip, 'leg-' + suffix, 'cylinder', { height: 0.38, diameter: 0.31, tessellation: 10 }, [0, -0.19, 0], darkMat);
      var knee = new B.TransformNode('knee-' + suffix, scene); knee.parent = hip; knee.position.y = -0.38;
      part(scene, knee, 'shin-' + suffix, 'cylinder', { height: 0.35, diameter: 0.29, tessellation: 10 }, [0, -0.17, 0], darkMat);
      part(scene, knee, 'boot-' + suffix, 'sphere', { diameterX: 0.38, diameterY: 0.3, diameterZ: 0.58, segments: 10 }, [0, -0.3, 0.1], darkMat);
      arms.push(shoulder); legs.push(hip); knees.push(knee);
    });
    part(scene, root, 'collar', 'torus', { diameter: sturdy ? 0.78 : 0.68, thickness: 0.08, tessellation: 16 }, [0, 1.7, 0], accentMat).rotation.x = Math.PI / 2;
    part(scene, root, 'belt', 'torus', { diameter: sturdy ? 0.86 : 0.7, thickness: 0.07, tessellation: 16 }, [0, 0.94, 0], darkMat).rotation.x = Math.PI / 2;
    part(scene, root, 'eye-l', 'sphere', { diameter: 0.085, segments: 8 }, [-0.17, 2.08, 0.35], darkMat);
    part(scene, root, 'eye-r', 'sphere', { diameter: 0.085, segments: 8 }, [0.17, 2.08, 0.35], darkMat);
    var cheekMat = material(scene, 'cheek-' + info.id, '#e9988d', 0.03);
    part(scene, root, 'cheek-l', 'sphere', { diameterX: 0.1, diameterY: 0.055, diameterZ: 0.035, segments: 8 }, [-0.27, 1.94, 0.35], cheekMat);
    part(scene, root, 'cheek-r', 'sphere', { diameterX: 0.1, diameterY: 0.055, diameterZ: 0.035, segments: 8 }, [0.27, 1.94, 0.35], cheekMat);
    if (info.accessory === 'sprout') {
      part(scene, root, 'sprout', 'cylinder', { height: 0.43, diameter: 0.08, tessellation: 7 }, [0, 2.68, 0], accentMat);
      var leaf = part(scene, root, 'leaf', 'sphere', { diameterX: 0.42, diameterY: 0.14, diameterZ: 0.25, segments: 7 }, [0.2, 2.84, 0], accentMat); leaf.rotation.z = -0.35;
    } else if (info.accessory === 'hood') {
      var hood = part(scene, root, 'hood', 'torus', { diameter: 0.92, thickness: 0.15, tessellation: 12 }, [0, 2.02, 0], accentMat); hood.rotation.x = Math.PI / 2;
    } else if (info.accessory === 'lamp') {
      var band = part(scene, root, 'lamp-band', 'box', { width: 0.84, height: 0.13, depth: 0.82 }, [0, 2.36, 0], darkMat);
      part(scene, root, 'lamp', 'box', { size: 0.22 }, [0, 2.43, 0.43], accentMat);
    } else if (info.accessory === 'scarf') {
      var scarf = part(scene, root, 'scarf', 'torus', { diameter: 0.68, thickness: 0.11, tessellation: 12 }, [0, 1.68, 0], accentMat); scarf.rotation.x = Math.PI / 2;
    } else if (info.accessory === 'satchel') {
      part(scene, root, 'satchel', 'box', { width: 0.44, height: 0.5, depth: 0.22 }, [0.48, 0.95, -0.17], accentMat);
    } else {
      part(scene, root, 'badge', 'cylinder', { height: 0.06, diameter: 0.23, tessellation: 10 }, [0, 1.28, 0.29], accentMat).rotation.x = Math.PI / 2;
    }
    label(scene, root, nickname || info.name, 3.02, pickData && pickData.busy ? '#ffd166' : '#ffffff');
    root.getChildMeshes().forEach(function (mesh) { mesh.isPickable = !!pickData; mesh.metadata = pickData ? { selectTarget: pickData } : {}; });
    root.metadata = { id: info.id, torso: torso, head: head, hair: hair, arms: arms, legs: legs, knees: knees, walk: 0, walkWeight: 0, targetX: 0, targetZ: 0 };
    return root;
  }

  function equipVehicle(avatar, id) {
    var rig=avatar.metadata;if(rig.mount===id)return;
    if(rig.vehicle)disposeNode(rig.vehicle);rig.vehicle=null;rig.wheels=[];rig.mount=id||'';
    rig.legs.forEach(function(leg,i){leg.position.x=i? .23:-.23;leg.rotation.z=0;});
    if(!id)return;
    var scene=avatar.getScene(),bike=id==='motorcycle',vehicle=new B.TransformNode('ride-'+id,scene);vehicle.parent=avatar;rig.vehicle=vehicle;
    var paint=material(scene,'ride-paint',bike?'#db6e41':'#d9ac6c'),steel=material(scene,'ride-steel','#849caa'),rubber=material(scene,'ride-rubber','#20313a'),lamp=material(scene,'ride-lamp','#fff4b0',.65);
    vehicle.position.y=bike?-.36:-.2;
    var points=bike?[[0,-.1,-.95],[0,-.1,1.03]]:[[-.8,-.22,-.45],[.8,-.22,-.45]];
    points.forEach(function(p){var wheel=new B.TransformNode('ride-wheel',scene);wheel.parent=vehicle;wheel.position.set(p[0],p[1],p[2]);rig.wheels.push(wheel);part(scene,wheel,'tire','cylinder',{height:.24,diameter:.78,tessellation:20},[0,0,0],rubber).rotation.z=Math.PI/2;part(scene,wheel,'rim','cylinder',{height:.26,diameter:.53,tessellation:12},[0,0,0],steel).rotation.z=Math.PI/2;for(var k=0;k<4;k++){var spoke=part(scene,wheel,'spoke','box',{width:.28,height:.045,depth:.52},[0,0,0],paint);spoke.rotation.x=k*Math.PI/4;}});
    if(bike){
      part(scene,vehicle,'bike-frame','box',{width:.36,height:.25,depth:1.7},[0,.1,0],steel);
      part(scene,vehicle,'bike-engine','box',{width:.5,height:.48,depth:.62},[0,.35,.08],rubber);
      part(scene,vehicle,'bike-tank','sphere',{diameterX:.65,diameterY:.55,diameterZ:.83,segments:12},[0,.78,.3],paint);
      part(scene,vehicle,'bike-seat','box',{width:.67,height:.15,depth:.66},[0,1,-.29],rubber);
      part(scene,vehicle,'bike-fork','cylinder',{height:1.1,diameter:.12,tessellation:8},[0,.45,.94],steel).rotation.x=-.18;
      part(scene,vehicle,'bike-headlight','sphere',{diameter:.31,segments:10},[0,.93,1.13],lamp);
      part(scene,vehicle,'bike-tail-light','box',{width:.24,height:.12,depth:.08},[0,.7,-.8],paint);
      part(scene,vehicle,'bike-footrests','box',{width:1.06,height:.07,depth:.15},[0,.6,.22],steel);
    }else{
      part(scene,vehicle,'cart-deck','box',{width:1.6,height:.16,depth:1.65},[0,.02,-.2],paint);
      [-.76,.76].forEach(function(x){part(scene,vehicle,'cart-rail','box',{width:.09,height:.4,depth:1.6},[x,.28,-.2],paint);part(scene,vehicle,'cart-handle-post','cylinder',{height:1.4,diameter:.09,tessellation:8},[x,.72,.74],steel);});
      for(var plank=0;plank<6;plank++)part(scene,vehicle,'cart-plank','box',{width:1.48,height:.025,depth:.018},[0,.115,-.87+plank*.26],steel);
      part(scene,vehicle,'cart-back','box',{width:1.6,height:.35,depth:.09},[0,.25,-1.01],paint);
    }
    part(scene,vehicle,'ride-handle','box',{width:1.45,height:.1,depth:.12},[0,bike?1.61:1.46,.77],rubber);
  }

  function createCreature(scene, speciesId, target) {
    var root = new B.TransformNode('creature-' + target.id, scene);
    var data = global.InsectData && (global.InsectData.speciesById ? global.InsectData.speciesById[speciesId] : null);
    var category = String((data && (data.category || data.species)) || speciesId || 'beetle').toLowerCase();
    var style = String((data && data.animationSet) || category).toLowerCase();
    var rare = data && (data.rarity === 'rare' || data.rarity === 'elite' || data.rarity === 'legendary');
    var colors = {
      fern_raptor:'#72b876',marsh_spitter:'#778ccb',granite_triceratops:'#aa9070',crystal_ankylosaur:'#588fb8',ember_raptor:'#d9774b',ancient_rex:'#874e60',
      dew_ladybird: '#a94748', reed_cricket: '#625844', clover_grasshopper: '#668654', bark_ant: '#713f35', pond_skater: '#35494a', moss_caterpillar: '#718e58', amber_grub: '#b29158', stream_nymph: '#647b71', granary_weevil: '#765642', stone_ground_beetle: '#2e4045', orchard_longhorn: '#81583f', honey_mason_bee: '#ad843a', azure_dragonfly: '#478f97', moon_moth: '#9b91ae', sun_scarab: '#9d8335', violet_mantis: '#667658', mist_butterfly: '#679ca8', cave_stag: '#493641', king_stag: '#38233c', storm_cicada: '#557c73', ancient_rhino: '#37513c'
    };
    var bodyColor = colors[speciesId] || (rare ? '#d99aff' : '#334c38');
    var bodyMat = material(scene, 'insectBody', bodyColor, rare ? 0.22 : 0.05);
    var darkMat = material(scene, 'insectJoint', '#202b27');
    var accentMat = material(scene, 'insectAccent', speciesId === 'sun_scarab' ? '#ffe584' : speciesId === 'violet_mantis' ? '#efb5ff' : '#ead58b', rare ? 0.35 : 0.08);
    var wingMat = material(scene, 'insectWing', speciesId === 'mist_butterfly' ? '#b7ecff' : speciesId === 'moon_moth' ? '#e7dafa' : '#bcecf1', 0.12, 0.68);
    var eyeMat = material(scene, 'insectEye', '#090e0d', 0.02); eyeMat.specularColor = new B.Color3(.08,.1,.09); eyeMat.specularPower = 24;
    bodyMat.specularColor = new B.Color3(0.18, 0.21, 0.18); bodyMat.specularPower = 46;
    darkMat.specularColor = new B.Color3(0.025, 0.03, 0.025); darkMat.specularPower = 12;
    accentMat.specularColor = new B.Color3(0.12, 0.11, 0.08); accentMat.specularPower = 28;
    wingMat.backFaceCulling = false; wingMat.specularColor = new B.Color3(0.12, 0.16, 0.18); wingMat.specularPower = 38;
    if (typeof document !== 'undefined') {
      var chitinTexture = new B.DynamicTexture('chitin-grain-' + speciesId, { width: 128, height: 128 }, scene, false), chitinContext = chitinTexture.getContext(), grainRandom = seeded(String(speciesId).split('').reduce(function(sum,ch){return sum+ch.charCodeAt(0);}, 31));
      chitinContext.fillStyle = '#deded8'; chitinContext.fillRect(0,0,128,128);
      for(var grain=0;grain<280;grain+=1){var shade=grainRandom()>.5?45:205;chitinContext.fillStyle='rgba('+shade+','+shade+','+shade+','+(.035+grainRandom()*.065)+')';chitinContext.beginPath();chitinContext.arc(grainRandom()*128,grainRandom()*128,.35+grainRandom()*1.2,0,Math.PI*2);chitinContext.fill();}
      chitinTexture.wrapU=chitinTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;chitinTexture.uScale=chitinTexture.vScale=2.4;chitinTexture.update(false);bodyMat.diffuseTexture=chitinTexture;
      var wingTexture = new B.DynamicTexture('wing-pattern-' + speciesId, { width: 256, height: 256 }, scene, false), wingContext = wingTexture.getContext();
      wingContext.clearRect(0, 0, 256, 256); wingContext.fillStyle = speciesId === 'mist_butterfly' ? 'rgba(132,215,235,.7)' : speciesId === 'moon_moth' ? 'rgba(186,170,204,.78)' : 'rgba(180,220,217,.56)';
      wingContext.beginPath(); wingContext.moveTo(18, 128); wingContext.bezierCurveTo(25, 30, 160, 8, 238, 74); wingContext.bezierCurveTo(252, 130, 185, 230, 18, 128); wingContext.fill();
      wingContext.strokeStyle = speciesId === 'mist_butterfly' ? 'rgba(35,108,125,.72)' : 'rgba(55,83,70,.58)'; wingContext.lineWidth = 4;
      [[18,128,230,76],[18,128,220,125],[18,128,188,195],[70,96,150,52],[78,142,174,111],[74,156,150,199]].forEach(function (line) { wingContext.beginPath(); wingContext.moveTo(line[0], line[1]); wingContext.quadraticCurveTo((line[0] + line[2]) * 0.52, (line[1] + line[3]) * 0.38, line[2], line[3]); wingContext.stroke(); });
      if (speciesId === 'mist_butterfly' || speciesId === 'moon_moth') { wingContext.fillStyle = speciesId === 'moon_moth' ? 'rgba(43,36,60,.72)' : 'rgba(246,244,184,.86)'; wingContext.beginPath(); wingContext.arc(154, 104, 24, 0, Math.PI * 2); wingContext.fill(); wingContext.fillStyle = 'rgba(245,245,224,.84)'; wingContext.beginPath(); wingContext.arc(154, 104, 10, 0, Math.PI * 2); wingContext.fill(); }
      wingTexture.hasAlpha = true; wingTexture.update(false); wingMat.diffuseTexture = wingTexture; wingMat.opacityTexture = wingTexture; wingMat.useAlphaFromDiffuseTexture = true;
    }
    var wings = [], dinoLegs = [], dinoTail = null;
    function sphere(name, x, y, z, sx, sy, sz, mat) { return part(scene, root, name, 'sphere', { diameterX: sx, diameterY: sy, diameterZ: sz, segments: 9 }, [x, y, z], mat || bodyMat); }
    function bar(name, x, y, z, width, height, depth, mat, rx, ry, rz) { var mesh = part(scene, root, name, 'box', { width: width, height: height, depth: depth }, [x, y, z], mat || darkMat); mesh.rotation.set(rx || 0, ry || 0, rz || 0); return mesh; }
    function cylinder(name, x, y, z, height, diameter, mat, rx, ry, rz, top) { var mesh = part(scene, root, name, 'cylinder', { height: height, diameter: diameter, diameterTop: top === undefined ? diameter : top, tessellation: 8 }, [x, y, z], mat || bodyMat); mesh.rotation.set(rx || 0, ry || 0, rz || 0); return mesh; }
    function tube(name, points, startRadius, endRadius, mat) {
      var path = points.map(function (point) { return new B.Vector3(point[0], point[1], point[2]); });
      var mesh = B.MeshBuilder.CreateTube(name, { path: path, tessellation: 7, cap: B.Mesh.CAP_ALL, radiusFunction: function (index) { var ratio = index / Math.max(1, path.length - 1); return startRadius + (endRadius - startRadius) * ratio; } }, scene);
      mesh.parent = root; mesh.material = mat || darkMat; mesh.isPickable = false; return mesh;
    }
    function eyes(z, spread, y) { sphere('compound-eye-l', -spread, y || 0.65, z, 0.075, 0.085, 0.065, eyeMat); sphere('compound-eye-r', spread, y || 0.65, z, 0.075, 0.085, 0.065, eyeMat); }
    function basicLegs(length, rearScale, pairs) {
      for (var i = 0; i < (pairs || 3); i += 1) {
        var zz = 0.48 - i * 0.43, long = i === 2 ? (rearScale || 1) : 1, sweep = (i - 1) * 0.18;
        for (var side = -1; side <= 1; side += 2) {
          var hip = side * 0.29, knee = side * (0.55 + 0.22 * long), ankle = side * (0.72 + length * 0.38 * long), foot = side * (0.82 + length * 0.42 * long);
          tube('jointed-leg', [[hip,0.48,zz],[knee,0.31,zz+sweep],[ankle,0.12,zz+sweep*1.35],[foot,0.085,zz+sweep*1.7]], 0.065, 0.025, darkMat);
          sphere('leg-joint', knee, 0.31, zz+sweep, 0.13, 0.13, 0.13, darkMat);
          tube('foot-claw-a', [[foot,0.085,zz+sweep*1.7],[foot+side*.13,0.06,zz+sweep*1.7+.12]], .025, .008, darkMat);
          tube('foot-claw-b', [[foot,0.085,zz+sweep*1.7],[foot+side*.12,0.06,zz+sweep*1.7-.09]], .025, .008, darkMat);
        }
      }
    }
    function antennae(length, spread) {
      for (var side = -1; side <= 1; side += 2) tube('curved-antenna', [[side*spread,.72,.91],[side*(spread+.13),.88,1.12],[side*(spread+.28),.98,1.12+length*.42],[side*(spread+.38),.87,1.06+length*.82]], .035, .012, accentMat);
    }
    function flatWing(name, x, y, z, sx, sy, sz, angle) { var wing = B.MeshBuilder.CreatePlane(name, { width: sx, height: sz, sideOrientation: B.Mesh.DOUBLESIDE }, scene); wing.parent = root; wing.position.set(x,y,z); wing.rotation.x = Math.PI/2; wing.rotation.y = angle || 0; wing.material = wingMat; wing.isPickable = false; wings.push(wing); return wing; }

    var isLarva = style === 'larva' || speciesId === 'moss_caterpillar' || speciesId === 'amber_grub';
    var isDragon = style === 'dragonfly' || style === 'aquatic';
    var isButterfly = style === 'butterfly' || style === 'moth';
    var isMantis = style === 'mantis';
    var isHopper = style === 'hopper';
    var isAnt = speciesId === 'bark_ant';
    var isSkater = style === 'water_glide';
    var isBee = style === 'flyer';
    var isCicada = style === 'cicada';
    var isStag = style === 'stag';
    var isRhino = style === 'rhino_boss';
    var isSpider = category.indexOf('거미') >= 0 || category.indexOf('spider') >= 0;

    if (style.indexOf('dino_')===0) {
      var heavy=style==='dino_trike'||style==='dino_anky',rex=style==='dino_rex',spitter=style==='dino_spitter';
      sphere('dinosaur-body',0,heavy?.9:1.3,-.2,heavy?1.55:1.05,heavy?1.05:1.5,heavy?2.25:1.45);
      sphere('dinosaur-belly',0,heavy?.7:1.1,.17,heavy?1.12:.73,heavy?.62:1.1,heavy?1.5:1.05,accentMat);
      tube('dinosaur-neck',[[0,heavy?1:1.6,.32],[0,heavy?1.1:1.94,.64],[0,heavy?1.12:2.05,.96]],heavy?.42:.32,heavy?.38:.27,bodyMat);
      sphere('dinosaur-head',0,heavy?1.15:2.08,1.12,heavy?.86:rex?1.08:.72,heavy?.72:rex?.8:.64,heavy?1.08:rex?1.4:1.06);
      sphere('dinosaur-muzzle',0,heavy?1:1.93,1.63,heavy?.64:rex?.82:.6,.26,.65,bodyMat);
      sphere('dinosaur-mouth',0,heavy?.9:1.82,1.64,heavy?.57:rex?.74:.52,.08,.59,darkMat);
      sphere('dinosaur-lower-jaw',0,heavy?.85:1.77,1.6,heavy?.58:rex?.75:.52,.12,.64,accentMat);
      eyes(1.43,heavy?.34:rex?.43:.29,heavy?1.36:2.25);
      for(var tooth=0;tooth<6;tooth++){var ts=tooth%2?-1:1;cylinder('dinosaur-tooth',ts*(rex?.29:.23),heavy?.98:1.91,1.48+Math.floor(tooth/2)*.15,.16,.09,accentMat,Math.PI,0,0,.015);}
      for(var ds=-1;ds<=1;ds+=2){
        var leg=new B.TransformNode('dinosaur-leg',scene);leg.parent=root;leg.position.set(ds*(heavy?.58:.43),heavy?.76:.96,heavy?-.54:-.32);
        part(scene,leg,'dinosaur-thigh','sphere',{diameterX:.46,diameterY:.75,diameterZ:.6},[0,-.13,0],bodyMat);
        part(scene,leg,'dinosaur-shin','cylinder',{height:.63,diameter:.24,tessellation:8},[0,-.57,.18],bodyMat);
        part(scene,leg,'dinosaur-foot','sphere',{diameterX:.46,diameterY:.2,diameterZ:.7,segments:8},[0,-.86,.32],bodyMat);
        for(var toe=-1;toe<=1;toe++)part(scene,leg,'dinosaur-toe','sphere',{diameterX:.08,diameterY:.07,diameterZ:.22,segments:6},[toe*.12,-.85,.64],accentMat);dinoLegs.push(leg);
        if(heavy){var front=new B.TransformNode('dinosaur-front-leg',scene);front.parent=root;front.position.set(ds*.55,.67,.65);part(scene,front,'dinosaur-front-shin','cylinder',{height:.65,diameter:.3,tessellation:8},[0,-.22,0],bodyMat);part(scene,front,'dinosaur-front-foot','sphere',{diameterX:.4,diameterY:.18,diameterZ:.55,segments:8},[0,-.57,.12],bodyMat);dinoLegs.push(front);}
        else {tube('dinosaur-arm',[[ds*.34,1.58,.38],[ds*.52,1.35,.62],[ds*.49,1.29,.94]],.11,.06,bodyMat);tube('dinosaur-claw',[[ds*.49,1.29,.94],[ds*.49,1.2,1.1]],.05,.01,accentMat);}
      }
      dinoTail=tube('dinosaur-tail',[[0,heavy?.9:1.1,-.84],[0,heavy?.8:1.2,-1.35],[0,.9,-2.03],[0,.72,-2.8]],heavy?.32:.25,.035,bodyMat);
      if(style==='dino_anky'){sphere('tail-club',0,.72,-2.66,.84,.65,.7,accentMat);for(var plate=0;plate<7;plate++){var px=(plate%3-1)*.39,pz=-.83+Math.floor(plate/3)*.52;cylinder('crystal-armor',px,1.52,pz,.62,.3,wingMat,0,0,0,.02);}}
      if(style==='dino_trike'){sphere('dinosaur-frill',0,1.38,.8,1.38,1.05,.22,accentMat);for(var horn=-1;horn<=1;horn++)tube('dinosaur-horn',[[horn*.28,1.4,1.38],[horn*.31,1.58,1.75],[horn*.28,1.6,2.04]],.12,.012,accentMat);}
      if(spitter){for(var fin=-1;fin<=1;fin+=2)sphere('dinosaur-crest',fin*.2,2.45,1.06,.13,.5,.8,accentMat);}
      for(var stripe=0;stripe<4;stripe++)sphere('dinosaur-back-scale',0,heavy?1.5:1.85,-.8+stripe*.31,.3,.18,.16,accentMat);
    } else if (isLarva) {
      for (var segment = 0; segment < 7; segment += 1) {
        var size = 0.5 + Math.sin((segment + 1) / 8 * Math.PI) * 0.2;
        sphere('larva-segment', 0, 0.38 + (segment % 2) * 0.04, -0.9 + segment * 0.31, size, size * 0.75, size, segment === 6 ? accentMat : bodyMat);
      }
      eyes(1.05, 0.13, 0.53);
      for (var foot = 0; foot < 5; foot += 1) { sphere('larva-foot-l', -0.24, 0.13, -0.42 + foot * 0.29, 0.13, 0.18, 0.13, darkMat); sphere('larva-foot-r', 0.24, 0.13, -0.42 + foot * 0.29, 0.13, 0.18, 0.13, darkMat); }
      if (speciesId === 'moss_caterpillar') for (var tuft = 0; tuft < 5; tuft += 1) cylinder('tuft', 0, 0.82, -0.48 + tuft * 0.31, 0.22, 0.06, accentMat, 0, 0, 0, 0);
    } else if (isDragon) {
      sphere('thorax', 0, 0.58, 0.45, 0.68, 0.55, 0.72); sphere('head', 0, 0.6, 0.92, 0.5, 0.45, 0.48, bodyMat); eyes(1.1, 0.19, 0.67);
      for (var abdomen = 0; abdomen < 6; abdomen += 1) sphere('abdomen', 0, 0.53, 0.12 - abdomen * 0.34, 0.35 - abdomen * 0.025, 0.31, 0.46, abdomen % 2 ? accentMat : bodyMat);
      if (style === 'dragonfly') {
        flatWing('wing-front-l', -0.68, 0.72, 0.2, 1.35, 0.1, 0.5, -0.2); flatWing('wing-front-r', 0.68, 0.72, 0.2, 1.35, 0.1, 0.5, 0.2);
        flatWing('wing-rear-l', -0.62, 0.68, -0.28, 1.15, 0.09, 0.42, 0.18); flatWing('wing-rear-r', 0.62, 0.68, -0.28, 1.15, 0.09, 0.42, -0.18);
      } else basicLegs(0.75, 1.2);
    } else if (isButterfly) {
      sphere('thorax', 0, 0.58, 0.15, 0.43, 0.5, 0.78); sphere('head', 0, 0.6, 0.68, 0.42, 0.4, 0.42); eyes(0.85, 0.15, 0.67); antennae(0.72, 0.15);
      flatWing('upper-wing-l', -0.64, 0.66, 0.08, 1.15, 0.12, 1.25, -0.25); flatWing('upper-wing-r', 0.64, 0.66, 0.08, 1.15, 0.12, 1.25, 0.25);
      flatWing('lower-wing-l', -0.53, 0.62, -0.63, 0.82, 0.1, 0.92, 0.18); flatWing('lower-wing-r', 0.53, 0.62, -0.63, 0.82, 0.1, 0.92, -0.18);
      if (style === 'butterfly') { sphere('wing-dot-l', -0.66, 0.74, 0.12, 0.25, 0.08, 0.25, accentMat); sphere('wing-dot-r', 0.66, 0.74, 0.12, 0.25, 0.08, 0.25, accentMat); }
    } else if (isMantis) {
      sphere('abdomen', 0, 0.52, -0.45, 0.55, 0.52, 1.25); sphere('thorax', 0, 0.72, 0.34, 0.38, 0.65, 0.85); sphere('head', 0, 0.86, 0.92, 0.68, 0.42, 0.46, bodyMat); eyes(1.12, 0.27, 0.94); antennae(0.82, 0.18);
      basicLegs(0.85, 1.1);
      for (var side = -1; side <= 1; side += 2) { tube('raptor-arm', [[side*.18,.82,.48],[side*.5,1.02,.76],[side*.62,.7,1.12]], .09, .05, bodyMat); tube('sickle-blade', [[side*.62,.7,1.12],[side*.48,.55,1.46],[side*.28,.51,1.58]], .065, .008, accentMat); for(var tooth=0;tooth<4;tooth+=1) tube('sickle-tooth', [[side*(.57-tooth*.045),.65-tooth*.03,1.2+tooth*.085],[side*(.44-tooth*.04),.63-tooth*.03,1.22+tooth*.085]], .022,.004,accentMat); }
    } else if (isHopper) {
      sphere('abdomen', 0, 0.5, -0.34, 0.64, 0.55, 1.32); sphere('thorax', 0, 0.6, 0.48, 0.62, 0.62, 0.72); sphere('head', 0, 0.62, 0.98, 0.52, 0.52, 0.5, bodyMat); eyes(1.18, 0.19, 0.72); antennae(speciesId === 'reed_cricket' ? 1.15 : 0.68, 0.15);
      basicLegs(0.68, 1, 2);
      for(var hopSide=-1;hopSide<=1;hopSide+=2){tube('hopper-femur',[[hopSide*.28,.48,-.42],[hopSide*.7,.75,-.68],[hopSide*1.12,.58,-.9]],.13,.08,bodyMat);sphere('hopper-knee',hopSide*1.12,.58,-.9,.19,.19,.19,darkMat);tube('hopper-tibia',[[hopSide*1.12,.58,-.9],[hopSide*1.35,.22,-1.38],[hopSide*1.48,.09,-1.72]],.075,.025,darkMat);tube('hopper-tarsus',[[hopSide*1.48,.09,-1.72],[hopSide*1.72,.055,-1.88]],.03,.006,darkMat);}
    } else if (isAnt) {
      sphere('abdomen', 0, 0.48, -0.68, 0.78, 0.62, 0.94); sphere('petiole-rear', 0, 0.44, -0.18, 0.18, 0.23, 0.2, darkMat); sphere('petiole-front', 0, 0.45, 0.02, 0.14, 0.2, 0.16, darkMat); sphere('thorax', 0, 0.49, 0.32, 0.45, 0.46, 0.55); sphere('head', 0, 0.52, 0.8, 0.56, 0.5, 0.54); eyes(1.04, 0.2, 0.6); antennae(0.75, 0.17); basicLegs(0.88, 1.15);
    } else if (isSkater) {
      sphere('body', 0, 0.48, -0.05, 0.34, 0.3, 1.32); sphere('head', 0, 0.5, 0.77, 0.38, 0.34, 0.4); eyes(0.97, 0.14, 0.57); antennae(0.62, 0.13);
      for (var sk = 0; sk < 3; sk += 1) { var skz = 0.38 - sk * 0.52, skSweep=(sk-1)*.42; for(var skSide=-1;skSide<=1;skSide+=2){ tube('skater-jointed-leg',[[skSide*.16,.47,skz],[skSide*.62,.36,skz+skSweep*.32],[skSide*1.08,.14,skz+skSweep*.72],[skSide*1.48,.08,skz+skSweep]],.035,.012,darkMat); tube('skater-foot',[[skSide*1.48,.08,skz+skSweep],[skSide*1.73,.055,skz+skSweep+.08]],.014,.004,darkMat); } }
    } else if (isBee) {
      sphere('abdomen', 0, 0.54, -0.32, 0.72, 0.58, 1.1); sphere('stripe-a', 0, 0.55, -0.2, 0.75, 0.61, 0.2, darkMat); sphere('stripe-b', 0, 0.55, -0.58, 0.64, 0.58, 0.18, darkMat); sphere('thorax', 0, 0.6, 0.42, 0.7, 0.65, 0.72, darkMat); sphere('head', 0, 0.62, 0.93, 0.55, 0.52, 0.5, bodyMat); eyes(1.13, 0.21, 0.7); antennae(0.48, 0.16); basicLegs(0.72, 1);
      flatWing('bee-wing-l', -0.48, 0.82, 0.02, 0.72, 0.11, 1.0, -0.38); flatWing('bee-wing-r', 0.48, 0.82, 0.02, 0.72, 0.11, 1.0, 0.38);
    } else if (isCicada) {
      sphere('body', 0, 0.58, -0.12, 0.82, 0.58, 1.42); sphere('head', 0, 0.64, 0.76, 0.78, 0.5, 0.55, bodyMat); eyes(1.0, 0.3, 0.72); basicLegs(0.78, 1.1);
      flatWing('cicada-wing-l', -0.74, 0.71, -0.3, 1.55, 0.1, 1.9, -0.22); flatWing('cicada-wing-r', 0.74, 0.71, -0.3, 1.55, 0.1, 1.9, 0.22);
    } else if (isSpider) {
      sphere('abdomen', 0, 0.5, -0.38, 0.9, 0.65, 1.0); sphere('head', 0, 0.48, 0.42, 0.62, 0.5, 0.65); eyes(0.75, 0.2, 0.58);
      for (var spiderLeg = 0; spiderLeg < 4; spiderLeg += 1) { var slz = 0.48 - spiderLeg * 0.3, spiderSweep=(spiderLeg-1.5)*.24; for(var spiderSide=-1;spiderSide<=1;spiderSide+=2) tube('spider-jointed-leg',[[spiderSide*.24,.48,slz],[spiderSide*.65,.53,slz+spiderSweep],[spiderSide*1.0,.19,slz+spiderSweep*1.4],[spiderSide*1.2,.08,slz+spiderSweep*1.7]],.055,.014,darkMat); }
    } else {
      var shellWidth=isRhino ? .56 : .47, shellHeight=isRhino ? .72 : .62, shellDepth=isRhino ? 1.38 : 1.18;
      sphere('elytron-left', -.21, 0.55, -0.22, shellWidth, shellHeight, shellDepth); sphere('elytron-right', .21, 0.55, -0.22, shellWidth, shellHeight, shellDepth);
      var shellRim=part(scene,root,'elytron-rim','torus',{diameter:isRhino?.9:.78,thickness:.035,tessellation:28},[0,.59,-.22],darkMat);shellRim.scaling.z=isRhino?1.45:1.35;
      bar('elytron-groove',0,.89,-.22,.035,.025,shellDepth*.82,darkMat);
      for(var pit=0;pit<8;pit+=1){var pitSide=pit%2?-1:1; sphere('shell-puncture',pitSide*(.13+(pit%3)*.045),.875-Math.floor(pit/4)*.02,-.62+(pit%4)*.27,.035,.018,.035,darkMat);}
      sphere('thorax', 0, 0.57, 0.48, 0.76, 0.62, 0.72); sphere('head', 0, 0.55, 0.96, 0.62, 0.52, 0.55, darkMat); eyes(1.18, 0.21, 0.64); basicLegs(isRhino || isStag ? 0.94 : 0.8, isRhino ? 1.25 : 1.05);
      if (speciesId === 'dew_ladybird') { sphere('spot-l', -0.25, 0.86, -0.18, 0.18, 0.08, 0.18, darkMat); sphere('spot-r', 0.25, 0.86, -0.18, 0.18, 0.08, 0.18, darkMat); sphere('spot-back', 0, 0.83, -0.58, 0.2, 0.08, 0.2, darkMat); }
      if (speciesId === 'granary_weevil') cylinder('snout', 0, 0.51, 1.35, 0.72, 0.18, bodyMat, Math.PI / 2, 0, 0); else antennae(speciesId === 'orchard_longhorn' ? 1.5 : 0.48, 0.18);
      if (isStag) { for (var jawSide = -1; jawSide <= 1; jawSide += 2) { tube('stag-curved-mandible',[[jawSide*.17,.57,1.08],[jawSide*.48,.64,1.38],[jawSide*.76,.59,1.72],[jawSide*.64,.53,2.12]],.11,.025,accentMat); for(var jawTooth=0;jawTooth<4;jawTooth+=1) tube('mandible-tooth',[[jawSide*(.48+jawTooth*.055),.59,1.48+jawTooth*.14],[jawSide*(.25+jawTooth*.035),.55,1.56+jawTooth*.14]],.034,.006,accentMat); } }
      if (isRhino) { tube('rhino-curved-horn',[[0,.7,1.02],[0,.75,1.48],[0,1.02,1.92],[0,1.48,2.25],[0,1.68,2.03]],.145,.018,accentMat); tube('thorax-horn',[[0,.84,.5],[0,1.12,.76],[0,1.32,1.08]],.095,.018,accentMat); }
      if (speciesId === 'sun_scarab') { var shellLine = bar('shell-line', 0, 0.88, -0.23, 0.045, 0.06, 1.08, accentMat); shellLine.rotation.x = 0; }
    }
    var authoredScale = data && Number(data.scale) ? clamp(Number(data.scale), 0.65, 2.5) : 1;
    mergeByMaterial(root, 'creature-merged', wings.concat(dinoLegs.flatMap(function(n){return n.getChildMeshes();})).concat(dinoTail?[dinoTail]:[]));
    var overallScale = (rare ? 1.18 : 1) * authoredScale * (target.boss ? 1.65 : 1);
    root.scaling.setAll(overallScale);
    if (target && Number.isFinite(Number(target.level))) {
      var creatureName = target.bossName || (data && data.name ? data.name : '야생 곤충');
      var nameplate = label(scene, root, (target.boss ? '♛ 보스 [' : '[') + global.InsectData.rarity[data.rarity].label + '] Lv.' + Math.max(1, Math.floor(Number(target.level))) + ' ' + creatureName, Math.max(2.6, overallScale * 2) / overallScale, '#ffffff');
      nameplate.scaling.setAll(1 / overallScale);
    }
    root.getChildMeshes().forEach(function (mesh) { mesh.isPickable = true; mesh.metadata = { selectTarget: { type: 'spawn', id: target.id } }; });
    root.metadata = { speciesId: speciesId, ownedMaterials: [bodyMat,darkMat,accentMat,wingMat,eyeMat], wings: wings, dinoLegs: dinoLegs, dinoTail: dinoTail, baseY: 0, phase: Math.random() * 10 };
    return root;
  }

  function create(options) {
    options = options || {};
    if (!B) throw new Error('Babylon.js가 먼저 로드되어야 합니다.');
    if (!options.canvas) throw new Error('InsectWorld.create에는 canvas가 필요합니다.');
    var canvas = options.canvas, onMove = typeof options.onMove === 'function' ? options.onMove : function () {}, onSelect = typeof options.onSelect === 'function' ? options.onSelect : function () {};
    var onBattleHit = typeof options.onBattleHit === 'function' ? options.onBattleHit : function () {};
    var onFootstep = typeof options.onFootstep === 'function' ? options.onFootstep : function () {};
    var engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true });
    var scene = new B.Scene(engine); scene.clearColor = new B.Color4(0.48, 0.63, 0.65, 1);
    scene.imageProcessingConfiguration.contrast = 1.08; scene.imageProcessingConfiguration.exposure = 1.0;
    scene.fogMode = B.Scene.FOGMODE_LINEAR; scene.fogColor = new B.Color3(0.48, 0.63, 0.65); scene.fogStart = 75; scene.fogEnd = 185;
    var savedRadius = 29;
    try {
      var storedRadius = Number(global.localStorage.getItem('insect.cameraRadius'));
      if (Number.isFinite(storedRadius) && storedRadius >= 10) savedRadius = clamp(storedRadius, 16, 52);
      if (global.localStorage.getItem('insect.cameraVersion') !== '2') {
        savedRadius = Math.max(29, savedRadius);
        global.localStorage.setItem('insect.cameraVersion', '2');
        global.localStorage.setItem('insect.cameraRadius', String(savedRadius));
      }
    } catch (_) {}
    var camera = new B.ArcRotateCamera('explore-camera', Math.PI / 2, 1.03, savedRadius, new B.Vector3(0, 1.4, 0), scene);
    camera.lowerRadiusLimit = 16; camera.upperRadiusLimit = 52; camera.lowerBetaLimit = 0.55; camera.upperBetaLimit = 1.34; camera.wheelPrecision = 35; camera.panningSensibility = 0;
    camera.minZ = 0.5; camera.maxZ = 400;
    camera.attachControl(canvas, true);
    camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    // Handle only canvas contacts, so the movement stick never becomes a pinch finger.
    camera.inputs.removeByType('ArcRotateCameraPointersInput');
    var viewPointers = new Map(), pinchStart = null, cameraDragged = false;
    function contactDistance() { var points = Array.from(viewPointers.values()); return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y); }
    function cameraDown(event) {
      if (!controlsEnabled || battleMode || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (!viewPointers.size) cameraDragged = false;
      viewPointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
      canvas.setPointerCapture(event.pointerId);
      if (viewPointers.size === 2) { pinchStart = { distance: Math.max(24, contactDistance()), radius: camera.radius }; cameraDragged = true; }
      event.preventDefault();
    }
    function cameraMove(event) {
      var previous = viewPointers.get(event.pointerId); if (!previous) return;
      var dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      previous.x = event.clientX; previous.y = event.clientY;
      if (Math.hypot(previous.x - previous.startX, previous.y - previous.startY) > 7) cameraDragged = true;
      if (viewPointers.size === 2 && pinchStart) {
        camera.radius = clamp(pinchStart.radius * pinchStart.distance / Math.max(24, contactDistance()), camera.lowerRadiusLimit, camera.upperRadiusLimit);
        camera.inertialRadiusOffset = 0;
      } else if (viewPointers.size === 1) {
        camera.alpha -= dx * 0.005;
        camera.beta = clamp(camera.beta - dy * 0.005, camera.lowerBetaLimit, camera.upperBetaLimit);
      }
      event.preventDefault();
    }
    function cameraUp(event) { viewPointers.delete(event.pointerId); pinchStart = null; }
    canvas.addEventListener('pointerdown', cameraDown);
    canvas.addEventListener('pointermove', cameraMove, { passive: false });
    canvas.addEventListener('pointerup', cameraUp);
    canvas.addEventListener('pointercancel', cameraUp);
    canvas.addEventListener('lostpointercapture', cameraUp);
    var explorationCamera = { alpha: camera.alpha, beta: camera.beta, radius: savedRadius }, radiusSaveTimer = 0, lastRadius = savedRadius;
    var light = new B.HemisphericLight('sunlight', new B.Vector3(-0.25, 1, 0.35), scene); light.intensity = 0.68; light.diffuse = new B.Color3(.76,.86,1); light.groundColor = new B.Color3(0.16, 0.23, 0.28);
    var sun = new B.DirectionalLight('sun', new B.Vector3(-0.6, -1, 0.35), scene); sun.intensity = 0.62; sun.diffuse = new B.Color3(1,.84,.66); sun.position.set(35, 70, -35);
    var shadows = new B.ShadowGenerator(512, sun); shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 8; shadows.bias = 0.002;
    function addShadowModel(node) { if (node && node.getChildMeshes) node.getChildMeshes().forEach(function (mesh) { if (mesh.name !== 'label') shadows.addShadowCaster(mesh, false); }); }
    var worldRoot = new B.TransformNode('exploration-world', scene), battleRoot = new B.TransformNode('battle-arena', scene); battleRoot.setEnabled(false);
    var mats = {
      path: material(scene, 'path', '#c6ae78'), water: material(scene, 'water', '#4ca5b4', 0.12, 0.82), wood: material(scene, 'wood', '#765337'), leaf: material(scene, 'leaf', '#3d7951'),
      rock: material(scene, 'rock', '#716f6b'), metal: material(scene, 'metal', '#69777b'), roof: material(scene, 'roof', '#31545c'), glow: material(scene, 'glow', '#b8f4e1', 0.4), leafLight: material(scene, 'leafLight', '#567b4c')
    };
    var rand = seeded(20260920);
    function worldPart(name, kind, opts, pos, mat, parent) { var mesh = part(scene, parent || worldRoot, name, kind, opts, pos, mat); mesh.receiveShadows = true; return mesh; }

    BIOMES.forEach(function (biome) {
      // Adjacent tiles share one edge instead of overlapping coplanar surfaces.
      var minX = biome.x < 0 ? -120 : biome.x === 0 ? -36 : 36, maxX = biome.x < 0 ? -36 : biome.x === 0 ? 36 : 120;
      var minZ = biome.z < 0 ? -120 : biome.z === 0 ? -36 : 36, maxZ = biome.z < 0 ? -36 : biome.z === 0 ? 36 : 120;
      var ground = worldPart('biome-' + biome.id, 'box', { width: maxX - minX, height: 0.6, depth: maxZ - minZ }, [(minX + maxX) / 2, -0.35, (minZ + maxZ) / 2], groundMaterial(scene, biome, 7300 + biome.x * 3 + biome.z));
      ground.metadata = { biome: biome.id };
      label(scene, worldRoot, biome.name, 0, '#ffffff').position.set(biome.x, 6.5, biome.z);
    });
    // Scenery continues beyond the playable boundary; there is no cut-off terrain edge.
    var distantMat = material(scene, 'distant-meadow', '#5e825f');
    worldPart('distant-ground', 'box', { width: 900, height: .5, depth: 900 }, [0, -.8, 0], distantMat);
    for (var hillIndex = 0; hillIndex < 32; hillIndex++) {
      var hillAngle = hillIndex / 32 * Math.PI * 2;
      var hillDistance = 170 + (hillIndex % 3) * 16;
      worldPart('distant-hill', 'sphere', { diameterX: 62, diameterY: 34 + (hillIndex % 4) * 7, diameterZ: 56, segments: 10 }, [Math.cos(hillAngle) * hillDistance, 0, Math.sin(hillAngle) * hillDistance], distantMat);
    }
    [-72, 0, 72].forEach(function (x) { worldPart('road-z', 'box', { width: 9, height: 0.16, depth: 240 }, [x, 0.04, 0], mats.path); });
    [-72, 0, 72].forEach(function (z) {
      [[-120, -76.5], [-67.5, -4.5], [4.5, 67.5], [76.5, 120]].forEach(function (span) {
        worldPart('road-x', 'box', { width: span[1] - span[0], height: 0.16, depth: 9 }, [(span[0] + span[1]) / 2, 0.04, z], mats.path);
      });
    });
    worldPart('river', 'box', { width: 28, height: 0.25, depth: 235 }, [91, 0.08, 0], mats.water);
    [-72, 0, 72].forEach(function (z) { worldPart('bridge', 'box', { width: 34, height: 0.55, depth: 7 }, [91, 0.55, z], mats.wood); });
    // 구름은 지형 경계를 부드럽게 가려 주면서 멀리 있는 사냥터의 분위기를 살린다.
    var cloudMat = material(scene, 'sky-cloud', '#f4fff9', 0.08, 0.88);
    [[-95,-88,18],[-32,-108,23],[42,-86,19],[106,-46,24],[-105,19,20],[-37,55,26],[40,21,18],[104,91,24],[-18,-36,16],[25,-44,18],[-20,-150,14],[25,-155,18],[-148,-15,18],[147,15,19],[20,150,18]].forEach(function (cloudInfo, cloudIndex) {
      for (var puff = 0; puff < 4; puff += 1) {
        var cloud = worldPart('cloud-puff', 'sphere', { diameter: 4.6 + (puff % 2), segments: 8 }, [cloudInfo[0] + puff * 2.2, cloudInfo[2] + (puff % 2) * .55, cloudInfo[1] + (puff % 3) * 1.4], cloudMat);
        cloud.scaling.y = .42 + (cloudIndex % 2) * .06; cloud.isPickable = false;
      }
    });

    for (var treeIndex = 0; treeIndex < 46; treeIndex += 1) {
      var tx = -108 + rand() * 67, tz = -108 + rand() * 67;
      var tree = new B.TransformNode('tree', scene); tree.parent = worldRoot; tree.position.set(tx, 0, tz);
      var treeHeight = 4.5 + rand() * 2.8;
      part(scene, tree, 'trunk', 'cylinder', { height: treeHeight, diameterTop: 0.62, diameterBottom: 1.2, tessellation: 9 }, [0, treeHeight / 2, 0], mats.wood);
      part(scene, tree, 'crown', 'sphere', { diameterX: 4.2 + rand() * 2.2, diameterY: 3.7 + rand() * 2, diameterZ: 4.3 + rand() * 2, segments: 10 }, [0, treeHeight + 1.1, 0], mats.leaf);
      part(scene, tree, 'crown-small', 'sphere', { diameter: 3.2 + rand(), segments: 9 }, [-1.5 + rand() * 3, treeHeight + 2.3, -1 + rand() * 2], mats.leaf);
    }
    for (var rockIndex = 0; rockIndex < 22; rockIndex += 1) {
      var rx = 43 + rand() * 62, rz = -108 + rand() * 63;
      var rock = worldPart('boulder', 'sphere', { diameter: 3 + rand() * 4, segments: 6 }, [rx, 1, rz], mats.rock); rock.scaling.y = 0.65 + rand() * 0.6;
    }
    for (var reedIndex = 0; reedIndex < 36; reedIndex += 1) {
      var reed = worldPart('reed', 'cylinder', { height: 2 + rand(), diameter: 0.13, tessellation: 5 }, [-106 + rand() * 66, 1, -30 + rand() * 59], mats.leaf);
      reed.rotation.z = (rand() - 0.5) * 0.25;
    }
    var flowerMats = [material(scene, 'flowerPink', '#f5a6ba', 0.08), material(scene, 'flowerGold', '#f5d76e', 0.08), material(scene, 'flowerBlue', '#91c8eb', 0.08)];
    // Low wildflower clusters leave room to see and approach collectible insects.
    for (var meadow = 0; meadow < 80; meadow++) {
      var mx = -31 + rand() * 62, mz = -116 + rand() * 74;
      if (Math.abs(mx) < 6 || Math.abs(mz + 72) < 6) continue;
      for (var petal = 0; petal < 3; petal++) {
        var fx = mx + (petal - 1) * .38, fz = mz + (petal % 2) * .4;
        worldPart('meadow-stem', 'cylinder', { height: .55, diameter: .05, tessellation: 4 }, [fx, .28, fz], mats.leaf);
        worldPart('meadow-flower', 'sphere', { diameter: .3, segments: 5 }, [fx, .58, fz], flowerMats[meadow % 3]);
      }
    }
    for (var plantIndex = 0; plantIndex < 95; plantIndex += 1) {
      var px = -112 + rand() * 224, pz = -112 + rand() * 224;
      if (Math.abs(px % 72) < 8 || Math.abs(pz % 72) < 8 || Math.hypot(px, pz) < 24) continue;
      if (plantIndex % 3) {
        var bush = worldPart('bush', 'sphere', { diameterX: 1.5 + rand(), diameterY: 0.8 + rand() * 0.6, diameterZ: 1.4 + rand(), segments: 7 }, [px, 0.45, pz], mats.leaf); bush.rotation.y = rand() * Math.PI;
      } else {
        worldPart('flower-stem', 'cylinder', { height: 0.7, diameter: 0.06, tessellation: 5 }, [px, 0.35, pz], mats.leaf);
        worldPart('wildflower', 'sphere', { diameter: 0.34, segments: 6 }, [px, 0.77, pz], flowerMats[plantIndex % flowerMats.length]);
      }
    }
    for (var cropIndex = 0; cropIndex < 6; cropIndex += 1) {
      worldPart('crop-row', 'box', { width: 4, height: 0.45, depth: 42 }, [-104 + cropIndex * 8, 0.3, 77], material(scene, 'crop', cropIndex % 2 ? '#6f8a3c' : '#a38d3b'));
    }
    var lab = new B.TransformNode('research-lab', scene); lab.parent = worldRoot; lab.position.set(0, 0, -6);
    var labWallMat = material(scene, 'labWall', '#cbbda5'), labStoneMat = material(scene, 'labStone', '#77756d');
    part(scene, lab, 'lab-foundation', 'box', { width: 19, height: 1.1, depth: 11 }, [0, .55, 0], labStoneMat);
    part(scene, lab, 'lab-main', 'box', { width: 18, height: 4.4, depth: 10 }, [0, 3.0, 0], labWallMat);
    var roofL = part(scene, lab, 'lab-roof-left', 'box', { width: 10.8, height: 0.5, depth: 12 }, [-4.6, 6.65, 0], mats.roof); roofL.rotation.z = -0.38;
    var roofR = part(scene, lab, 'lab-roof-right', 'box', { width: 10.8, height: 0.5, depth: 12 }, [4.6, 6.65, 0], mats.roof); roofR.rotation.z = 0.38;
    part(scene, lab, 'chimney', 'box', { width: 1.2, height: 3.2, depth: 1.2 }, [5.8, 7.1, -1.8], mats.wood);
    part(scene, lab, 'front-top-beam', 'box', { width: 18.5, height: .36, depth: .4 }, [0, 5.05, 5.16], mats.wood);
    part(scene, lab, 'front-base-beam', 'box', { width: 18.5, height: .32, depth: .4 }, [0, 1.08, 5.16], mats.wood);
    [-8.2,-3.1,3.1,8.2].forEach(function(beamX){part(scene,lab,'front-timber','box',{width:.34,height:4.2,depth:.42},[beamX,3.02,5.18],mats.wood);});
    var braceL=part(scene,lab,'cross-brace','box',{width:.28,height:3.7,depth:.43},[-6.0,3.05,5.2],mats.wood);braceL.rotation.z=.7;var braceR=part(scene,lab,'cross-brace','box',{width:.28,height:3.7,depth:.43},[6.0,3.05,5.2],mats.wood);braceR.rotation.z=-.7;
    part(scene,lab,'door-frame-top','box',{width:3.8,height:.28,depth:.42},[0,3.55,5.25],mats.wood);part(scene,lab,'door-frame-l','box',{width:.28,height:3.4,depth:.42},[-1.78,2.0,5.25],mats.wood);part(scene,lab,'door-frame-r','box',{width:.28,height:3.4,depth:.42},[1.78,2.0,5.25],mats.wood);
    for (var windowSide = -1; windowSide <= 1; windowSide += 2) { part(scene, lab, 'window', 'box', { width: 3, height: 2, depth: 0.18 }, [windowSide * 5.2, 2.8, 5.08], mats.glow); part(scene, lab, 'window-bar-v', 'box', { width: 0.16, height: 2.1, depth: 0.22 }, [windowSide * 5.2, 2.8, 5.2], mats.wood); part(scene, lab, 'window-bar-h', 'box', { width: 3.1, height: .16, depth: .22 }, [windowSide * 5.2, 2.8, 5.2], mats.wood); }
    for(var shingle=0;shingle<9;shingle+=1){var sx=-8+shingle*2;var sl=part(scene,lab,'roof-shingle','box',{width:.09,height:.1,depth:12.15},[sx,8.35-Math.abs(sx)*.38,0],mats.wood);sl.rotation.z=sx<0?-.38:.38;}
    part(scene,lab,'left-eave','box',{width:.45,height:.38,depth:12.5},[-9.6,5.05,0],mats.wood);part(scene,lab,'right-eave','box',{width:.45,height:.38,depth:12.5},[9.6,5.05,0],mats.wood);
    for(var gardenSide=-1;gardenSide<=1;gardenSide+=2){part(scene,lab,'garden-bed','box',{width:4.3,height:.55,depth:1.7},[gardenSide*11,.28,4.5],mats.wood);for(var gardenPlant=0;gardenPlant<5;gardenPlant+=1){part(scene,lab,'garden-stem','cylinder',{height:.7,diameter:.06,tessellation:5},[gardenSide*11-1.5+gardenPlant*.72,.85,4.5],mats.leaf);part(scene,lab,'garden-flower','sphere',{diameter:.28,segments:6},[gardenSide*11-1.5+gardenPlant*.72,1.22,4.5],flowerMats[(gardenPlant+(gardenSide>0?1:0))%flowerMats.length]);}}
    part(scene, lab, 'lab-door', 'box', { width: 3.4, height: 3.3, depth: 0.2 }, [0, 1.65, 5.08], mats.glow);
    var safeRing = worldPart('safe-zone-ring', 'torus', { diameter: 43, thickness: 0.22, tessellation: 64 }, [0, 0.18, 0], mats.glow);
    // Open corner fences mark the village without obstructing the main paths.
    [-1, 1].forEach(function (side) {
      for (var fence = 0; fence < 4; fence++) {
        worldPart('village-post', 'box', { width: .3, height: 1.35, depth: .3 }, [side * (9 + fence * 2.3), .68, 16], mats.wood);
        if (fence < 3) worldPart('village-rail', 'box', { width: 2.3, height: .15, depth: .15 }, [side * (10.15 + fence * 2.3), .95, 16], mats.wood);
      }
      worldPart('welcome-lantern-post', 'cylinder', { height: 3.4, diameter: .22, tessellation: 8 }, [side * 5, 1.7, 20], mats.wood);
      worldPart('welcome-lantern', 'box', { size: .65 }, [side * 5, 3.1, 20], mats.glow);
    });
    var barn = new B.TransformNode('barn', scene); barn.parent = worldRoot; barn.position.set(-82, 0, 80);
    part(scene, barn, 'barn-body', 'box', { width: 18, height: 8, depth: 14 }, [0, 4, 0], material(scene, 'barnRed', '#8d5344'));
    var barnRoof = part(scene, barn, 'barn-roof', 'cylinder', { height: 15, diameter: 14, tessellation: 3 }, [0, 8.2, 0], mats.roof); barnRoof.rotation.z = Math.PI / 2;
    for (var pole = 0; pole < 5; pole += 1) worldPart('facility-pole', 'box', { width: 0.7, height: 7, depth: 0.7 }, [54 + pole * 10, 3.5, 67 + (pole % 2) * 18], mats.metal);
    worldPart('facility', 'box', { width: 25, height: 7, depth: 17 }, [73, 3.5, 75], mats.metal);
    var tank = worldPart('tank', 'cylinder', { height: 8, diameter: 10, tessellation: 14 }, [93, 4, 91], mats.metal);
    var cave = worldPart('cave-mound', 'sphere', { diameter: 30, segments: 10 }, [1, 7, 85], mats.rock); cave.scaling.y = 0.65;
    worldPart('cave-mouth', 'cylinder', { height: 4, diameter: 9, tessellation: 12 }, [1, 2, 70], material(scene, 'caveDark', '#151d20')).rotation.x = Math.PI / 2;
    // Expand the authored landscape while keeping village buildings and collision sizes unchanged.
    worldRoot.getChildren().forEach(function(node){
      if(node.name==='research-lab'||node.name==='safe-zone-ring'||node.name.indexOf('village-')===0||node.name.indexOf('welcome-')===0)return;
      node.position.x*=2;node.position.z*=2;
      if(/^(biome-|road-|distant-|river$|crop-row$)/.test(node.name)){node.scaling.x*=2;node.scaling.z*=2;}
      if(node.name==='cave-mouth')node.position.z=155;
    });
    var crystalMat=material(scene,'cave-crystal','#82dcff',.65),emberMat=material(scene,'ember-crack','#ed7948',.5);
    for(var landmark=0;landmark<24;landmark++){
      var la=landmark*2.39996,lr=25+(landmark%4)*12;
      var shard=worldPart('cave-crystal','cylinder',{height:2+landmark%4,diameterTop:0,diameterBottom:1.2,tessellation:5},[Math.cos(la)*lr,1.1,144+Math.sin(la)*lr],crystalMat);shard.rotation.z=(landmark%3-1)*.2;
      if(landmark<16)worldPart('facility-ember','box',{width:3,height:.12,depth:.5},[144+Math.cos(la)*lr,.12,144+Math.sin(la)*lr],emberMat);
    }
    global.InsectData.biomes.filter(function(b){return b.special;}).forEach(function(b){
      var x=b.center.x,z=b.center.z,groundMat=material(scene,'special-ground-'+b.id,b.color),rim=material(scene,'special-rim-'+b.id,b.id==='nest'?'#c6a5ed':b.id==='mine'?'#8edde8':'#e5c181',.4);
      worldPart('special-floor-'+b.id,'cylinder',{diameter:49,height:.25,tessellation:36},[x,.03,z],groundMat);
      for(var n=0;n<14;n++){
        var angle=n/14*Math.PI*2;if(b.id==='mine'?Math.sin(angle)>.75:b.id==='nest'?Math.cos(angle)<-.75:Math.sin(angle)<-.75)continue;
        worldPart('special-wall-'+b.id,'sphere',{diameterX:6,diameterY:7+n%3,diameterZ:5,segments:7},[x+Math.cos(angle)*24,2,z+Math.sin(angle)*24],mats.rock);
        worldPart('special-crystal-'+b.id,'cylinder',{diameterTop:0,diameterBottom:1.3,height:3+n%3,tessellation:5},[x+Math.cos(angle)*20,2,z+Math.sin(angle)*20],rim);
      }
      var sign=label(scene,worldRoot,b.name,0,'#fff1c4');sign.position.set(b.id==='nest'?x-19:x,4,b.id==='mine'?z+19:b.id==='nest'?z:z-19);
      // 표지와 랜턴을 입구에 모아 출입구를 알아보기 쉽게 한다.
      [-5,5].forEach(function(dx){worldPart('entry-post','cylinder',{height:4,diameter:.45,tessellation:8},[b.id==='nest'?x-20:x+dx,2,b.id==='mine'?z+20:b.id==='nest'?z+dx:z-20],mats.wood);worldPart('entry-lamp','sphere',{diameter:.8,segments:8},[b.id==='nest'?x-20:x+dx,4,b.id==='mine'?z+20:b.id==='nest'?z+dx:z-20],rim);});
      if(b.id==='mine')for(var rail=0;rail<2;rail++)worldPart('mine-rail','box',{width:.16,height:.15,depth:23},[x+(rail?1.3:-1.3),.3,z-9],mats.metal);
      if(b.id==='sanctum')worldPart('guardian-ring','torus',{diameter:18,thickness:.3,tessellation:40},[x,.35,z],rim);
    });
    mergeByMaterial(worldRoot, 'world-static');
    worldRoot.getChildMeshes().forEach(function (staticMesh) { staticMesh.freezeWorldMatrix(); });

    var guide = createAvatar(scene, 'botanist', '미라 연구원', { type: 'npc', id: 'guide-mira' }); guide.parent = worldRoot; guide.position.set(7, 0.4, 11); addShadowModel(guide);
    var questMarker = label(scene, guide, '! 채집 의뢰', 3.9, '#ffe99b');
    var driftingClouds = new B.TransformNode('drifting-clouds', scene); driftingClouds.parent = worldRoot;
    var cloudBase = [];
    [[-38, 14, -22], [32, 18, -38], [-42, 20, 46], [49, 16, 40]].forEach(function (point, index) {
      var group = new B.TransformNode('cloud-group', scene); group.parent = driftingClouds; group.position.set(point[0], point[1], point[2]);
      cloudBase.push({ root: group, x: point[0], index: index });
      for (var puff = 0; puff < 4; puff++) {
        var puffMesh = part(scene, group, 'drifting-puff', 'sphere', { diameter: 4.8, segments: 8 }, [puff * 2.3, (puff % 2) * .5, (puff % 3) * .8], cloudMat);
        puffMesh.scaling.y = .38; puffMesh.isPickable = false;
      }
    });
    var localAvatar = createAvatar(scene, characterInfo(options.characterId || 'original').id, '', null); localAvatar.parent = worldRoot; localAvatar.position.set(0, 0.4, 12);
    addShadowModel(localAvatar);
    var companions = {}, resourceModels = {}, followTrail = [], serverPositionAt = 0, localSprint = false, localMount = '';
    var remote = {}, spawns = {}, latest = { players: [], spawns: [] }, battleActors = {}, battleViewSide = 'a', arenaDecor = [], eventQueue = [], activeEvent = null, battleMode = false;
    var navTarget=null,navRoute=[],navUpdated=0;
    var navArrow = new B.TransformNode('navigation-arrow',scene);navArrow.parent=worldRoot;navArrow.setEnabled(false);
    var arrowMat=material(scene,'navigation-gold','#ffe284',1);
    var arrowShaft=B.MeshBuilder.CreateBox('navigation-shaft',{width:.32,height:.14,depth:1.8},scene);arrowShaft.parent=navArrow;arrowShaft.material=arrowMat;
    for(var arrowSide=-1;arrowSide<=1;arrowSide+=2){var wing=B.MeshBuilder.CreateBox('navigation-tip',{width:.32,height:.14,depth:1.15},scene);wing.parent=navArrow;wing.position.set(arrowSide*.36,0,.72);wing.rotation.y=-arrowSide*.7;wing.material=arrowMat;}
    navArrow.getChildMeshes().forEach(function(m){m.isPickable=false;});
    var navHud=document.createElement('div');navHud.className='ix-navigation';navHud.hidden=true;navHud.setAttribute('role','status');
    var navText=document.createElement('span'),navCancel=document.createElement('button');navCancel.textContent='안내 종료';navCancel.setAttribute('aria-label','길 안내 종료');navHud.append(navText,navCancel);document.body.appendChild(navHud);
    var skillBanner=document.createElement('div');skillBanner.className='ix-skill-banner';skillBanner.hidden=true;document.body.appendChild(skillBanner);
    navCancel.addEventListener('click',function(){setNavigation(null);});
    function setNavigation(target){navTarget=target;navRoute=[];navUpdated=0;navHud.hidden=!target;navArrow.setEnabled(!!target);}
    function updateNavigation(now){
      var shown=!!navTarget&&controlsEnabled&&!battleMode;navHud.hidden=!shown;navArrow.setEnabled(shown);if(!shown)return;
      var point={x:localAvatar.position.x,z:localAvatar.position.z},N=global.InsectNavigation;
      if(N.distance(point,navTarget)<4){navText.textContent=navTarget.name+' 도착!';navArrow.setEnabled(false);return;}
      if(now-navUpdated>700||!navUpdated){navRoute=N.route(point,navTarget);navUpdated=now;}
      if(!navRoute.length){navText.textContent='경로를 다시 찾는 중…';navArrow.setEnabled(false);return;}
      var next=navRoute[0],dx=next.x-point.x,dz=next.z-point.z;
      navArrow.position.set(point.x,3.9+Math.sin(now/250)*.12,point.z);navArrow.rotation.y=Math.atan2(dx,dz);
      var remaining=N.distance(point,next);for(var i=1;i<navRoute.length;i++)remaining+=N.distance(navRoute[i-1],navRoute[i]);
      navText.textContent='➤ '+navTarget.name+' · '+Math.ceil(remaining)+'m'+(navRoute.length>1?' · 장애물 우회':'');
    }
    var controlsEnabled = options.enabled !== false;
    var input = { up: false, down: false, left: false, right: false, joyX: 0, joyZ: 0, sentX: 99, sentZ: 99 };
    function key(event, down) {
      var code = event.code;
      var direction = code === 'KeyW' || code === 'ArrowUp' ? 'up' : code === 'KeyS' || code === 'ArrowDown' ? 'down' : code === 'KeyA' || code === 'ArrowLeft' ? 'left' : code === 'KeyD' || code === 'ArrowRight' ? 'right' : '';
      if (!direction) return;
      if (!down) { input[direction] = false; return; }
      if (!controlsEnabled || (event.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable))) return;
      input[direction] = true; event.preventDefault();
    }
    function keyDown(event) { key(event, true); } function keyUp(event) { key(event, false); }
    function releaseInput() { input.up = input.down = input.left = input.right = false; input.joyX = input.joyZ = 0; joystick = null; viewPointers.clear(); pinchStart = null; if (joystickKnob) joystickKnob.style.transform = 'translate(0,0)'; }
    global.addEventListener('keydown', keyDown); global.addEventListener('keyup', keyUp); global.addEventListener('blur', releaseInput);
    var joystick = null;
    var joystickElement = null, joystickKnob = null;
    if (typeof document !== 'undefined') {
      joystickElement = document.createElement('div'); joystickElement.setAttribute('aria-label', '이동 스틱');
      joystickElement.style.cssText = 'position:fixed;left:max(22px,env(safe-area-inset-left));bottom:max(24px,env(safe-area-inset-bottom));width:112px;height:112px;border:2px solid rgba(255,255,255,.6);border-radius:50%;background:rgba(16,48,38,.38);box-shadow:inset 0 0 30px rgba(255,255,255,.13),0 8px 30px rgba(0,0,0,.18);backdrop-filter:blur(5px);z-index:8;touch-action:none;display:none';
      joystickKnob = document.createElement('div'); joystickKnob.style.cssText = 'position:absolute;left:31px;top:31px;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#efffdc,#7fd49b);box-shadow:0 5px 16px rgba(0,0,0,.28);pointer-events:none'; joystickElement.appendChild(joystickKnob);
      (canvas.parentElement || document.body).appendChild(joystickElement);
      joystickElement.style.display = global.matchMedia && global.matchMedia('(pointer:coarse)').matches && controlsEnabled ? 'block' : 'none';
    }
    function pointerDown(event) {
      if (!controlsEnabled || !joystickElement || joystick) return;
      var rect = joystickElement.getBoundingClientRect(); joystick = { id: event.pointerId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      joystickElement.setPointerCapture(event.pointerId); pointerMove(event); event.stopPropagation(); event.preventDefault();
    }
    function pointerMove(event) {
      if (!joystick || joystick.id !== event.pointerId) return;
      var dx = (event.clientX - joystick.x) / 38, dz = (event.clientY - joystick.y) / 38, distance = Math.hypot(dx,dz);
      var strength = distance < .1 ? 0 : Math.min(1,(distance-.1)/.9);
      input.joyX = distance ? dx/distance*strength : 0; input.joyZ = distance ? dz/distance*strength : 0;
      if (joystickKnob) joystickKnob.style.transform = 'translate(' + (input.joyX * 28) + 'px,' + (input.joyZ * 28) + 'px)'; event.preventDefault();
    }
    function pointerUp(event) { if (joystick && joystick.id === event.pointerId) { joystick = null; input.joyX = 0; input.joyZ = 0; if (joystickKnob) joystickKnob.style.transform = 'translate(0,0)'; event.stopPropagation(); } }
    if (joystickElement) { joystickElement.addEventListener('pointerdown', pointerDown); joystickElement.addEventListener('pointermove', pointerMove, { passive: false }); joystickElement.addEventListener('pointerup', pointerUp); joystickElement.addEventListener('pointercancel', pointerUp); joystickElement.addEventListener('lostpointercapture', pointerUp); }
    scene.onPointerObservable.add(function (info) {
      if (cameraDragged || viewPointers.size > 1 || info.type !== B.PointerEventTypes.POINTERPICK || !info.pickInfo || !info.pickInfo.hit) return;
      var target = info.pickInfo.pickedMesh && info.pickInfo.pickedMesh.metadata && info.pickInfo.pickedMesh.metadata.selectTarget;
      if (target) onSelect({ type: target.type, id: target.id });
    });

    function syncEntityMap(items, map, make, idKey) {
      var present = {};
      (items || []).forEach(function (item) {
        var id = String(item[idKey] || item.id || ''); if (!id) return; present[id] = true;
        if (idKey === 'uid' && map[id] && item.character && map[id].metadata.id !== item.character) { disposeNode(map[id]); delete map[id]; }
        if (!map[id]) map[id] = make(item);
        if(idKey==='uid')equipVehicle(map[id],item.mount||'');
        map[id].metadata.targetX = clamp(item.x, -WORLD_HALF + 2, WORLD_HALF - 2); map[id].metadata.targetZ = clamp(item.z, -WORLD_HALF + 2, WORLD_HALF - 2);
      });
      Object.keys(map).forEach(function (id) { if (!present[id]) { disposeNode(map[id]); delete map[id]; } });
    }
    function createResource(node) {
      var root = new B.TransformNode('resource-' + node.id, scene); root.parent = worldRoot; root.position.set(node.x,0,node.z);root.metadata={kind:node.kind};
      if(node.kind==='berries') {
        part(scene,root,'berry-bush','sphere',{diameterX:2.1,diameterY:1.5,diameterZ:1.8,segments:8},[0,.7,0],mats.leaf);
        var berryMat=material(scene,'berry-red','#d65780',.2);
        for(var i=0;i<7;i++)part(scene,root,'berry-fruit','sphere',{diameter:.27,segments:6},[Math.sin(i*2.4)*.8,1+(i%3)*.17,Math.cos(i*2.4)*.65],berryMat);
      } else if(node.kind==='egg') {
        part(scene,root,'egg-nest','torus',{diameter:2.2,thickness:.3,tessellation:16},[0,.25,0],mats.wood);
        var eggMat=material(scene,'moon-egg','#efe4ff',.35);
        part(scene,root,'cave-egg','sphere',{diameterX:.95,diameterY:1.4,diameterZ:.95,segments:14},[0,.85,0],eggMat);
      } else {
        part(scene,root,'ore-rock','sphere',{diameterX:2,diameterY:1.2,diameterZ:1.6,segments:6},[0,.45,0],mats.rock);
        var crystalMat=material(scene,'ore-crystal','#8ee1df',.6);
        for(var j=0;j<3;j++){var crystal=part(scene,root,'ore-spire','cylinder',{height:1.1+j*.25,diameterTop:0,diameterBottom:.45,tessellation:5},[(j-1)*.45,1.05,(j%2)*.3],crystalMat);crystal.rotation.z=(j-1)*.3;}
      }
      label(scene,root,node.name,2.25,'#ffe39a');
      root.getChildMeshes().forEach(function(mesh){mesh.isPickable=true;mesh.metadata={selectTarget:{type:'resource',id:node.id}};});
      addShadowModel(root);return root;
    }
    function syncCompanions() {
      var profile=latest.profile || {}, collection=profile.collection || [], present={};
      (profile.team || []).forEach(function(id,index){
        var creature=collection.find(function(c){return c.id===id;});if(!creature)return;present[id]=true;
        var old=companions[id];if(old&&old.metadata.speciesId!==creature.speciesId){disposeNode(old);delete companions[id];}
        if(!companions[id]) {
          var model=createCreature(scene,creature.speciesId,{id:'companion-'+id});model.parent=worldRoot;
          model.scaling.scaleInPlace(.6);model.position.set(localAvatar.position.x, .25, localAvatar.position.z-(index+1)*1.7);
          model.metadata.companionId=id;
          model.getChildMeshes().forEach(function(mesh){mesh.isPickable=false;mesh.metadata={};});
          // 동료 이름은 팀 HUD에 표시해 캐릭터 주변을 가리지 않는다.
          companions[id]=model;addShadowModel(model);
        }
        companions[id].metadata.slot=index;
      });
      Object.keys(companions).forEach(function(id){if(!present[id]){disposeNode(companions[id]);delete companions[id];}});
    }
    function followCompanions(dt,now) {
      var head={x:localAvatar.position.x,z:localAvatar.position.z};
      if(!followTrail.length || Math.hypot(head.x-followTrail[0].x,head.z-followTrail[0].z)>.3){followTrail.unshift(head);if(followTrail.length>120)followTrail.pop();}
      Object.keys(companions).forEach(function(id){
        var model=companions[id],gap=2.3+model.metadata.slot*1.6, remaining=gap;
        var target={x:head.x-Math.sin(localAvatar.rotation.y)*gap,z:head.z-Math.cos(localAvatar.rotation.y)*gap};
        for(var i=1;i<followTrail.length;i++){
          var a=followTrail[i-1],b=followTrail[i],d=Math.hypot(a.x-b.x,a.z-b.z);
          if(d>=remaining){var f=remaining/Math.max(d,.001);target={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};break;}remaining-=d;
        }
        var dx=target.x-model.position.x,dz=target.z-model.position.z;
        if(Math.hypot(dx,dz)>18){model.position.x=target.x;model.position.z=target.z;}
        else {var blend=1-Math.exp(-dt*10);model.position.x+=dx*blend;model.position.z+=dz*blend;}
        if(Math.hypot(dx,dz)>.06){var angle=Math.atan2(dx,dz)-model.rotation.y;model.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*(1-Math.exp(-dt*12));}
        (model.metadata.dinoLegs||[]).forEach(function(leg,li){leg.rotation.x=Math.sin(now/120+(li%2?Math.PI:0))*Math.min(.4,Math.hypot(dx,dz)*.2);});
        model.position.y=.25+Math.abs(Math.sin(now/150+model.metadata.slot))*Math.min(.14,Math.hypot(dx,dz)*.07);
        (model.metadata.wings||[]).forEach(function(wing,wi){wing.rotation.z=(wi?1:-1)*(.3+Math.abs(Math.sin(now/100))*.55);});
      });
    }
    function setState(snapshot) {
      snapshot = snapshot || {}; latest = Object.assign({}, latest, snapshot);
      var localId = typeof latest.you === 'string' ? latest.you : latest.you && latest.you.uid;
      var localRecord = typeof latest.you === 'object' && latest.you ? latest.you : (latest.players || []).find(function (player) { return String(player.uid) === String(localId); });
      if (localRecord) {
        serverPositionAt = performance.now(); localSprint = !!localRecord.sprinting;localMount=localRecord.mount||'';equipVehicle(localAvatar,localMount);
        localAvatar.metadata.targetX = clamp(localRecord.x, -238, 238); localAvatar.metadata.targetZ = clamp(localRecord.z, -238, 238);
        if (!battleMode && Math.hypot(localAvatar.position.x - localRecord.x, localAvatar.position.z - localRecord.z) > 30) {
          followTrail = [];
          localAvatar.position.x = localAvatar.metadata.targetX; localAvatar.position.z = localAvatar.metadata.targetZ;
          camera.target.x = localAvatar.position.x; camera.target.z = localAvatar.position.z;
        }
        if (!battleMode && localRecord.character && localRecord.character !== localAvatar.metadata.id) setCharacter(localRecord.character);
        if (localRecord.nickname && localAvatar.metadata.nickname !== localRecord.nickname) {
          localAvatar.metadata.nickname = localRecord.nickname;
          var plate = localAvatar.getChildMeshes().find(function(mesh){return mesh.name === 'label';});
          if (plate && plate.material && plate.material.diffuseTexture) {plate.material.diffuseTexture.getContext().clearRect(0,0,512,80);plate.material.diffuseTexture.drawText(localRecord.nickname, null, 55, 'bold 40px sans-serif', '#ffffff', 'rgba(14,30,25,.82)', true);}
        }
      }
      var quest = latest.profile && latest.profile.quest;
      var definition=global.InsectData.quests.find(function(q){return q.id === (quest && quest.id);}) || global.InsectData.quests[0];
      var markerText = !quest || quest.status === 'available' ? '! 새 의뢰' : quest.status === 'ready' ? '✓ 보상 받기' : quest.status === 'complete' ? '! 다음 의뢰' : definition.name + ' ' + quest.progress + '/' + quest.target;
      if (questMarker.metadata !== markerText && questMarker.material && questMarker.material.diffuseTexture) {
        questMarker.metadata = markerText;
        questMarker.material.diffuseTexture.getContext().clearRect(0,0,512,80);
        questMarker.material.diffuseTexture.drawText(markerText, null, 55, 'bold 40px sans-serif', '#ffe99b', 'rgba(14,30,25,.82)', true);
      }
      var otherPlayers = (latest.players || []).filter(function (player) { return !localId || String(player.uid) !== String(localId); });
      syncEntityMap(otherPlayers, remote, function (p) { var avatar = createAvatar(scene, p.character, p.nickname, { type: 'player', id: String(p.uid), busy: p.busy }); avatar.parent = worldRoot; avatar.position.set(p.x || 0, 0.4, p.z || 0); addShadowModel(avatar); return avatar; }, 'uid');
      syncEntityMap((latest.spawns || []).filter(function (s) { return s.available !== false && Math.hypot(s.x-localAvatar.metadata.targetX,s.z-localAvatar.metadata.targetZ)<85; }), spawns, function (s) { var creature = createCreature(scene, s.speciesId, s);if(s.group){(s.members||[]).slice(1).forEach(function(m,i){var member=createCreature(scene,m.speciesId,Object.assign({},s,{id:s.id+'-member-'+i}));member.parent=creature;member.position.set(i?2.5:-2.5,0,1.7);member.getChildMeshes().forEach(function(mesh){mesh.isPickable=true;mesh.metadata={selectTarget:{type:'spawn',id:s.id}};});});label(scene,creature,'3마리 무리 · 자동 턴제',3.1,'#ffc96e');} creature.parent = worldRoot; creature.position.set(s.x || 0, 0.2, s.z || 0); addShadowModel(creature); return creature; }, 'id');
      syncEntityMap((latest.resources || []).filter(function(n){return n.available;}),resourceModels,createResource,'id');
      syncCompanions();
      var shouldBattle = !!latest.battle;
      if (shouldBattle !== battleMode) switchBattle(shouldBattle, latest.battle);
    }
    function setCharacter(id) {
      id = CHARACTER_IDS.indexOf(id) >= 0 ? id : 'original';
      if (localAvatar && localAvatar.metadata.id === id) return;
      var position = localAvatar ? localAvatar.position.clone() : new B.Vector3(0, 0.4, 12), targetX = localAvatar ? localAvatar.metadata.targetX : position.x, targetZ = localAvatar ? localAvatar.metadata.targetZ : position.z;
      disposeNode(localAvatar); localAvatar = createAvatar(scene, id, '', null); localAvatar.parent = battleMode ? battleRoot : worldRoot; localAvatar.position.copyFrom(position); localAvatar.metadata.targetX = targetX; localAvatar.metadata.targetZ = targetZ;
      addShadowModel(localAvatar);
      if (global.InsectCharacters) global.InsectCharacters.select(id);
    }
    function setEnabled(enabled) {
      controlsEnabled = !!enabled;
      if (!controlsEnabled) { releaseInput(); onMove({ x: 0, z: 0 }); }
      if (joystickElement) joystickElement.style.display = controlsEnabled && !battleMode && global.matchMedia && global.matchMedia('(pointer:coarse)').matches ? 'block' : 'none';
    }
    function arenaCreature(name, x, z, color, side) {
      var species = global.InsectData && global.InsectData.speciesById && global.InsectData.speciesById[color];
      var displayName = name || species && species.name || '미확인 곤충';
      var root = createCreature(scene, color || 'beetle', { id: 'arena-' + side + '-' + displayName }); root.parent = battleRoot; root.scaling.setAll(2.25); root.position.set(x, 40.5, z); root.metadata.home = root.position.clone(); root.metadata.side = side; label(scene, root, displayName, 1.55, side === 'player' ? '#bfffe0' : '#ffd1c7'); return root;
    }
    var battleModels={},battleReserves=[];
    function refreshBattleSide(rawSide,creatureId){
      var side=latest.battle?.sides?.[rawSide];if(!side)return;
      var c=side.team.find(function(c){return c.id===creatureId;})||side.team[side.active||0];
      if(c&&battleModels[c.id]){battleActors[rawSide===battleViewSide?'player':'enemy']=battleModels[c.id];battleModels[c.id].setEnabled(true);}
    }
    function refreshReserves(){
      if(!latest.battle?.sides)return;
      ['a','b'].forEach(function(key){var side=latest.battle.sides[key],mine=key===battleViewSide;
        side.team.forEach(function(c,i){
          var model=battleModels[c.id];
          if(!model){model=arenaCreature(c.nickname,mine?-7:7,(i-(side.team.length-1)/2)*6,c.speciesId,mine?'player':'enemy');model.metadata.creatureId=c.id;model.rotation.y=mine?Math.PI/2:-Math.PI/2;battleModels[c.id]=model;addShadowModel(model);}
          model.metadata.reserve=i!==side.active;
          model.setEnabled(c.hp>0);model.position.copyFrom(model.metadata.home);model.scaling.setAll(2.25);model.rotation.x=model.rotation.z=0;
        });
      });
      battleReserves=Object.values(battleModels).filter(function(m){return m.metadata.reserve;});
    }
    function refreshBattleActors(){refreshReserves();refreshBattleSide(battleViewSide);refreshBattleSide(battleViewSide==='a'?'b':'a');}
    function switchBattle(enabled, battle) {
      if (enabled) explorationCamera = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius };
      camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
      if(activeEvent?.data?.remainingHp===0){var down=battleModels[activeEvent.data.targetCreatureId];if(down)down.setEnabled(false);}
      if (activeEvent && activeEvent.resolve) activeEvent.resolve(activeEvent.data);
      eventQueue.forEach(function (queued) { if (queued.resolve) queued.resolve(queued.data); });
      battleMode = enabled; releaseInput(); worldRoot.setEnabled(!enabled); battleRoot.setEnabled(enabled); eventQueue.length = 0; activeEvent = null;
      if (joystickElement) joystickElement.style.display = !enabled && controlsEnabled && global.matchMedia && global.matchMedia('(pointer:coarse)').matches ? 'block' : 'none';
      Object.values(battleModels).forEach(disposeNode);battleModels={};battleActors={};
      arenaDecor.forEach(disposeNode); arenaDecor = [];battleReserves.forEach(disposeNode);battleReserves=[];
      if (enabled) {
        var arenaBiome=global.InsectData.biomes.find(function(b){return b.id===battle.biomeId;})||global.InsectData.biomes.find(function(b){return b.id==='safe';});
        var rockyArena=['cave','rock','facility','mine','nest','sanctum'].indexOf(arenaBiome.id)>=0;
        scene.clearColor=rockyArena?new B.Color4(.09,.13,.2,1):new B.Color4(.48,.63,.65,1);
        scene.fogColor=rockyArena?new B.Color3(.09,.13,.2):new B.Color3(.48,.63,.65);
        var floor = B.MeshBuilder.CreateCylinder('arena-floor', { height: 0.9, diameter: 54, tessellation: 56 }, scene); floor.parent = battleRoot; floor.position.y = 40;
        floor.material = groundMaterial(scene, { id: rockyArena?arenaBiome.id:'arena', color: arenaBiome.color }, 909); floor.receiveShadows = true; arenaDecor.push(floor);
        for (var arenaRock=0;arenaRock<18;arenaRock+=1){var rockAngle=arenaRock/18*Math.PI*2,rockRadius=25.5+(arenaRock%3)*.32;var boundaryRock=part(scene,battleRoot,'arena-boundary-rock','sphere',{diameterX:1.4+(arenaRock%3)*.35,diameterY:.8+(arenaRock%2)*.35,diameterZ:1.2+(arenaRock%4)*.22,segments:7},[Math.cos(rockAngle)*rockRadius,40.72,Math.sin(rockAngle)*rockRadius],mats.rock);boundaryRock.rotation.y=rockAngle;arenaDecor.push(boundaryRock);}
        for(var arenaGrass=0;arenaGrass<(rockyArena?0:24);arenaGrass+=1){var grassAngle=arenaGrass/24*Math.PI*2+.18,grassRadius=18.5+(arenaGrass%5)*1.15;for(var blade=0;blade<2;blade+=1){var grassBlade=part(scene,battleRoot,'arena-grass','cylinder',{height:.8+(blade*.14),diameter:.07,tessellation:5},[Math.cos(grassAngle)*grassRadius+(blade-.5)*.18,41.0,Math.sin(grassAngle)*grassRadius],mats.leaf);grassBlade.rotation.z=(blade-.5)*.25;arenaDecor.push(grassBlade);}}
        for(var logIndex=0;logIndex<4;logIndex+=1){var logAngle=logIndex*Math.PI/2+.6;var log=part(scene,battleRoot,'arena-log','cylinder',{height:4.2,diameter:.72,tessellation:10},[Math.cos(logAngle)*22.5,40.8,Math.sin(logAngle)*22.5],mats.wood);log.rotation.z=Math.PI/2;log.rotation.y=-logAngle;arenaDecor.push(log);}
        for(var arenaTree=0;arenaTree<(rockyArena?0:15);arenaTree+=1){var treeAngle=arenaTree/15*Math.PI*2+.12,treeRadius=25+(arenaTree%2)*1.1,treeX=Math.cos(treeAngle)*treeRadius,treeZ=Math.sin(treeAngle)*treeRadius,farCanopy=Math.sin(treeAngle)>-.05?1.45:1;var arenaTrunk=part(scene,battleRoot,'arena-tree-trunk','cylinder',{height:8+(arenaTree%3),diameterTop:.72,diameterBottom:1.45,tessellation:9},[treeX,44.6,treeZ],mats.wood);arenaTrunk.rotation.z=(arenaTree%3-1)*.04;arenaDecor.push(arenaTrunk);for(var branchSide=-1;branchSide<=1;branchSide+=2){var arenaBranch=part(scene,battleRoot,'arena-tree-branch','cylinder',{height:3.2,diameterTop:.22,diameterBottom:.48,tessellation:7},[treeX+branchSide*.85,47.0,treeZ],mats.wood);arenaBranch.rotation.z=branchSide*1.0;arenaBranch.rotation.y=-treeAngle;arenaDecor.push(arenaBranch);}for(var crownIndex=0;crownIndex<3;crownIndex+=1){var crownMat=crownIndex%2?mats.leafLight:mats.leaf;var arenaCrown=part(scene,battleRoot,'arena-tree-crown','sphere',{diameterX:(5.2+crownIndex*.6)*farCanopy,diameterY:(4.1+crownIndex*.35)*farCanopy,diameterZ:(5.0+crownIndex*.5)*farCanopy,segments:9},[treeX+(crownIndex-1)*1.2,48.0+crownIndex*.78,treeZ+(crownIndex%2?1:-.7)],crownMat);arenaDecor.push(arenaCrown);}}
        for(var hedgeIndex=0;hedgeIndex<(rockyArena?0:9);hedgeIndex+=1){var hedgeAngle=.08+hedgeIndex/8*(Math.PI-.16),hedgeRadius=23.8;var hedge=part(scene,battleRoot,'arena-understory','sphere',{diameterX:6.3,diameterY:3.8,diameterZ:5.2,segments:8},[Math.cos(hedgeAngle)*hedgeRadius,42.8,Math.sin(hedgeAngle)*hedgeRadius],hedgeIndex%2?mats.leafLight:mats.leaf);arenaDecor.push(hedge);}
        for(var fernIndex=0;fernIndex<(rockyArena?0:16);fernIndex+=1){var fernAngle=fernIndex/16*Math.PI*2+.3,fernRadius=20.5+(fernIndex%4)*1.2;for(var frond=0;frond<3;frond+=1){var fern=part(scene,battleRoot,'arena-fern','sphere',{diameterX:.22,diameterY:.12,diameterZ:1.6,segments:6},[Math.cos(fernAngle)*fernRadius+Math.sin(frond)*.35,41.05+frond*.08,Math.sin(fernAngle)*fernRadius+Math.cos(frond)*.35],frond%2?mats.leafLight:mats.leaf);fern.rotation.y=fernAngle+(frond-1)*.34;fern.rotation.x=.2;arenaDecor.push(fern);}}
        if(rockyArena){
          var arenaGlow=material(scene,'arena-crystal',arenaBiome.id==='facility'?'#ff8658':'#8adeff',.7);
          for(var crystal=0;crystal<16;crystal++){var angle=crystal/16*Math.PI*2;var shard=part(scene,battleRoot,'arena-crystal','cylinder',{height:3+crystal%4,diameterBottom:1.2,diameterTop:0,tessellation:5},[Math.cos(angle)*23,42,Math.sin(angle)*23],arenaGlow);shard.rotation.z=(crystal%3-1)*.18;arenaDecor.push(shard);}
        }
        arenaDecor = arenaDecor.concat(mergeByMaterial(battleRoot, 'arena-static'));
        arenaDecor.forEach(function(staticArenaMesh){if(!staticArenaMesh.isDisposed())staticArenaMesh.freezeWorldMatrix();});
        var viewerId = typeof latest.you === 'string' ? latest.you : latest.you && latest.you.uid;
        battleViewSide = battle && battle.sides && battle.sides.a && String(battle.sides.a.uid) === String(viewerId) ? 'a' : 'b';
        var foeSide = battleViewSide === 'a' ? 'b' : 'a', yourSide = battle && battle.sides && battle.sides[battleViewSide], enemySide = battle && battle.sides && battle.sides[foeSide];
        var your = yourSide && yourSide.team && yourSide.team[yourSide.active || 0] || battle && (battle.yourActive || battle.player || battle.you);
        var enemy = enemySide && enemySide.team && enemySide.team[enemySide.active || 0] || battle && (battle.enemyActive || battle.enemy || battle.opponent);
        refreshBattleActors();
        camera.setTarget(new B.Vector3(0, 41.4, 0)); camera.alpha = -Math.PI / 2; camera.beta = 1.12; camera.radius = 31;
      } else { scene.clearColor=new B.Color4(.48,.63,.65,1);scene.fogColor=new B.Color3(.48,.63,.65);camera.setTarget(localAvatar.position.add(new B.Vector3(0, 1.5, 0))); camera.alpha = explorationCamera.alpha; camera.beta = explorationCamera.beta; camera.radius = explorationCamera.radius; }
    }
    function playEvents(events) {
      if (!Array.isArray(events)) events = events ? [events] : [];
      return Promise.all(events.map(function (event) {
        return new Promise(function (resolve) { eventQueue.push({ data: Object.assign({}, event), resolve: resolve }); });
      })).then(function (completed) { if (battleMode && latest.battle && latest.battle.sides) refreshBattleActors(); return completed; });
    }
    function finishBattleEvent() {
      skillBanner.hidden=true;
      if (activeEvent && activeEvent.effect) disposeNode(activeEvent.effect);
      if (activeEvent && activeEvent.projectile) disposeNode(activeEvent.projectile);
      if (activeEvent && activeEvent.data && activeEvent.data.type === 'switch') { refreshBattleSide(activeEvent.data.actorSide || activeEvent.data.side || battleViewSide, activeEvent.data.creatureId); if(options.onBattleSwitch)options.onBattleSwitch(activeEvent.data); }
      if (activeEvent && activeEvent.resolve) activeEvent.resolve(activeEvent.data);
      activeEvent = null;
    }
    function runBattleEvent(dt) {
      if (!activeEvent && eventQueue.length) { activeEvent = eventQueue.shift(); activeEvent.startedAt = performance.now(); activeEvent.time = 0; activeEvent.hit = false; }
      if (!activeEvent) return;
      var ev = activeEvent.data;
      if (!activeEvent.prepared) {
        activeEvent.prepared = true;
        if((ev.type==='attack'||ev.type==='skill')&&options.onBattleActor)options.onBattleActor(ev);
        if(ev.type==='skill'){skillBanner.textContent=ev.message;skillBanner.hidden=false;if(options.onSkillStart)options.onSkillStart(ev);}
        if ((ev.type==='attack'||ev.type==='skill') && ev.actorCreatureId && (ev.actorSide === 'a' || ev.actorSide === 'b')) refreshBattleSide(ev.actorSide, ev.actorCreatureId);
        if (ev.targetCreatureId && (ev.targetSide === 'a' || ev.targetSide === 'b')) refreshBattleSide(ev.targetSide, ev.targetCreatureId);
      }
      var actorSide = ev.actorSide || ev.side || (ev.actor === 'enemy' ? 'enemy' : 'player'), targetSide = ev.targetSide || (actorSide === 'player' ? 'enemy' : 'player');
      if (actorSide === 'a' || actorSide === 'b') actorSide = actorSide === battleViewSide ? 'player' : 'enemy';
      if (targetSide === 'a' || targetSide === 'b') targetSide = targetSide === battleViewSide ? 'player' : 'enemy';
      var actor = battleActors[actorSide], target = battleActors[targetSide]; if (!actor || !target) { finishBattleEvent(); return; }
      activeEvent.time = (performance.now() - activeEvent.startedAt) / 1000; var t = activeEvent.time, type = ev.type || ev.action || 'attack', skill = type === 'skill', ranged = ev.attackKind === 'ranged' || ev.attackKind === 'sonic';
      var skillCode = String(ev.skillId || ''), skillSeed = 0; for (var si = 0; si < skillCode.length; si += 1) skillSeed += skillCode.charCodeAt(si); var skillStyle = skillSeed % 3;
      if (type === 'victory' || type === 'defeat') { actor.rotation.y += dt * 7; actor.position.y = 40.5 + Math.abs(Math.sin(t * 8)) * 1.3; if (t > 1.6) finishBattleEvent(); return; }
      if (type === 'switch') { actor.rotation.y += dt * 9; actor.scaling.setAll(Math.max(.08, 2.25 * (1 - t / .68))); if (t > .68) finishBattleEvent(); return; }
      if (type === 'capture') {
        if (!activeEvent.effect) { activeEvent.effect = B.MeshBuilder.CreateTorus('capture-net', { diameter: 3.5, thickness: .09, tessellation: 28 }, scene); activeEvent.effect.parent = battleRoot; activeEvent.effect.position.copyFrom(target.position.add(new B.Vector3(0,1.05,0))); activeEvent.effect.rotation.x = Math.PI/2; activeEvent.effect.material = mats.glow; }
        activeEvent.effect.rotation.y += dt*8; activeEvent.effect.scaling.setAll(.65+Math.sin(Math.min(1,t/.8)*Math.PI)*.5); if(t>1.05)finishBattleEvent(); return;
      }
      if (type !== 'attack' && type !== 'skill') { actor.position.y = actor.metadata.home.y + Math.abs(Math.sin(t*8))*.18; if(t>.5){actor.position.copyFrom(actor.metadata.home);finishBattleEvent();} return; }
      var fx = global.InsectData.skillEffects[ev.skillId] || {color:'#d5b2ff',style:'wave'};
      if(skill){
        if(!activeEvent.effect){
          var effect=new B.TransformNode('skill-effect-'+ev.skillId,scene);effect.parent=battleRoot;
          var effectMat=material(scene,'skill-light-'+ev.skillId,fx.color,1);effectMat.disableLighting=true;
          for(var f=0;f<3;f++){
            var mesh=fx.style==='slash'?B.MeshBuilder.CreateBox('skill-slash',{width:5,height:.12,depth:.23},scene):B.MeshBuilder.CreateTorus('skill-ring',{diameter:3+f*.8,thickness:.09,tessellation:36},scene);
            mesh.parent=effect;mesh.material=effectMat;mesh.isPickable=false;
            mesh.rotation.set(fx.style==='guard'?f*Math.PI/3:Math.PI/2,0,fx.style==='slash'?(f-1)*.7:f*.4);mesh.position.y=f*.24;
          }
          activeEvent.effect=effect;
        }
        var center=t<.5||fx.style==='guard'?actor:target;
        activeEvent.effect.position.copyFrom(center.position.add(new B.Vector3(0,1.3,0)));
        activeEvent.effect.rotation.y+=dt*2;activeEvent.effect.scaling.setAll(.5+Math.min(1,t*1.8));
        activeEvent.effect.getChildMeshes().forEach(function(m){m.visibility=Math.max(0,1-Math.max(0,t-.85)*2);});
      }
      var home = actor.metadata.home, direction = target.position.subtract(home), distance = direction.length(); if (distance > 0.01) direction.normalize();
      var progress = t < 0.42 ? t / 0.42 : t < 0.82 ? 1 : t < 1.35 ? 1 - (t - 0.82) / 0.53 : 0;
      actor.position.copyFrom(ranged ? home : home.add(direction.scale(Math.max(0, progress) * Math.max(0, distance - 3.2))));
      if(ranged){
        actor.position.x+=Math.sin(Math.min(1,t/.65)*Math.PI)*(actorSide==='player'?-.4:.4);
        if(t>=.2&&t<.63){
          if(!activeEvent.projectile){var shot=B.MeshBuilder.CreateSphere(skill?'skill-projectile':'normal-projectile',{diameter:skill?1.25:.48,segments:10},scene);shot.parent=battleRoot;shot.material=material(scene,'projectile-light',skill?fx.color:'#aeeeff',1);shot.isPickable=false;activeEvent.projectile=shot;}
          var flight=Math.max(0,Math.min(1,(t-.2)/.36)),origin=home.add(new B.Vector3(0,1.5,0)),destination=target.metadata.home.add(new B.Vector3(0,1.4,0));
          activeEvent.projectile.position.copyFrom(B.Vector3.Lerp(origin,destination,flight));activeEvent.projectile.position.y+=Math.sin(flight*Math.PI)*(skill?1.2:.35);activeEvent.projectile.scaling.setAll(skill?1+Math.sin(t*35)*.15:1);
        }else if(activeEvent.projectile){disposeNode(activeEvent.projectile);activeEvent.projectile=null;}
      }
      if (skill) { actor.rotation.z = Math.sin(t * (16 + skillStyle * 3)) * (0.14 + skillStyle * .04); actor.rotation.y = (actorSide === 'player' ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * (5 + skillStyle)) * (.12 + skillStyle * .05); actor.position.y += Math.max(0, Math.sin(Math.min(1, t / .72) * Math.PI)) * (.28 + skillStyle * .17); actor.scaling.setAll(2.25 + Math.max(0, Math.sin(Math.min(1, t / 0.65) * Math.PI)) * (0.52 + skillStyle * .1)); }
      else {
        actor.rotation.x = -Math.sin(Math.min(1, t / .56) * Math.PI) * .28;
        actor.position.y += Math.sin(Math.min(1, t / .82) * Math.PI) * .85;
        actor.rotation.z = Math.sin(t * 18) * .08;
      }
      if(ranged){actor.position.y=home.y+Math.sin(Math.min(1,t/.8)*Math.PI)*(skill?.3:.12);actor.rotation.x=-Math.sin(t*6)*(skill?.2:.09);}
      (actor.metadata.wings || []).forEach(function(wing, wi){wing.rotation.z=(wi ? 1 : -1) * (.3 + Math.abs(Math.sin(t * 32)) * .9);});
      if (t >= 0.56 && !activeEvent.hit) {
        activeEvent.hit = true;
        if (ev.missed) { onBattleHit(ev); return; }
        target.scaling.set(2.55, 1.75, 2.55); target.rotation.z += actorSide === 'player' ? -0.28 : 0.28;
        onBattleHit(ev);
        var skillColors = ['#c4a7ff', '#7de3c4', '#ff9f7d']; var burstMat = material(scene, 'hitBurst', skill ? fx.color : '#ffe17a', 0.9);
        for (var i = 0; i < (skill ? 12 : 6); i += 1) { var spark = B.MeshBuilder.CreateSphere('hit-spark', { diameter: skill ? 0.34 : 0.24, segments: 5 }, scene); spark.parent = battleRoot; spark.position.copyFrom(target.position.add(new B.Vector3((i % 4 - 1.5) * 0.45, 1.0 + (i % 3) * 0.42, (i % 2 - 0.5) * 0.8))); spark.material = burstMat; setTimeout(function (mesh) { disposeNode(mesh); }, 440, spark); }
      }
      if (t > 0.9) { target.scaling.setAll(2.25); target.rotation.z *= 0.82; }
      if (t > 1.4) { actor.position.copyFrom(home); actor.rotation.x = actor.rotation.z = 0; actor.rotation.y = actorSide === 'player' ? Math.PI / 2 : -Math.PI / 2; actor.scaling.setAll(2.25); finishBattleEvent(); }
    }
    function animateAvatar(avatar, dt, speed) {
      if (!avatar || !avatar.metadata || !avatar.metadata.legs) return;
      var rig = avatar.metadata, weight = speed > 0.15 ? clamp(speed / 7, 0, 1) : 0;
      rig.walkWeight += (weight - rig.walkWeight) * Math.min(1, dt * 14);
      if(rig.mount){
        var bike=rig.mount==='motorcycle';rig.walk+=dt*speed;avatar.position.y=(bike?.9:.83)+Math.sin(rig.walk*1.3)*.017*weight;
        rig.legs.forEach(function(leg,i){leg.position.x=(i?1:-1)*(bike?.42:.3);leg.rotation.x=bike?-1.12:-.1;leg.rotation.z=(i?1:-1)*.06;});
        rig.knees.forEach(function(knee){knee.rotation.x=bike?1.37:.18;});rig.arms.forEach(function(arm){arm.rotation.x=-1.13;});
        rig.wheels.forEach(function(wheel){wheel.rotation.x+=dt*speed/.39;});return false;
      }
      var previousStep = Math.floor((rig.walk + Math.PI / 2) / Math.PI);
      rig.walk += dt * (3 + Math.min(speed, 16) * 1.25);
      var swing = Math.sin(rig.walk) * 0.72 * rig.walkWeight;
      rig.legs[0].rotation.x = swing; rig.legs[1].rotation.x = -swing;
      rig.arms[0].rotation.x = -swing * 0.8; rig.arms[1].rotation.x = swing * 0.8;
      rig.knees[0].rotation.x = Math.max(0, -Math.sin(rig.walk)) * 0.8 * rig.walkWeight;
      rig.knees[1].rotation.x = Math.max(0, Math.sin(rig.walk)) * 0.8 * rig.walkWeight;
      avatar.position.y = 0.4 + Math.abs(Math.sin(rig.walk)) * 0.075 * rig.walkWeight;
      return speed > 0.8 && rig.walkWeight > 0.2 && previousStep !== Math.floor((rig.walk + Math.PI / 2) / Math.PI);
    }
    var radar=document.createElement('canvas');radar.className='ix-radar';radar.width=320;radar.height=354;radar.setAttribute('aria-label','몬스터 레이더: 초록 약함, 노랑 비슷함, 빨강 강함, 보라 매우 강함, 별 보스');document.body.appendChild(radar);
    var radarAt=0;
    function drawRadar(now){
      radar.hidden=!controlsEnabled||battleMode||!!document.querySelector('.ix-drawer,.ix-modal-backdrop');if(radar.hidden||now-radarAt<100)return;radarAt=now;
      var ctx=radar.getContext('2d'),cx=160,cy=160,r=142,range=65;ctx.clearRect(0,0,320,354);ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='rgba(9,30,30,.83)';ctx.fill();ctx.clip();
      ctx.strokeStyle='rgba(139,209,183,.23)';ctx.lineWidth=2;[r/3,r*2/3,r].forEach(function(radius){ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();});ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
      var profile=latest.profile||{},team=(profile.team||[]).map(function(id){return(profile.collection||[]).find(function(c){return c.id===id;});}).filter(Boolean),level=team.length?team.reduce(function(n,c){return n+c.level;},0)/team.length:1;
      (latest.spawns||[]).forEach(function(s){if(!s.available)return;var dx=s.x-localAvatar.position.x,dz=s.z-localAvatar.position.z;if(Math.hypot(dx,dz)>range)return;var x=cx+dx/range*r,y=cy+dz/range*r,diff=s.level-level,color=diff>=10?'#cf87ff':diff>=4?'#ff7474':diff>=-2?'#ffe077':'#76e1a1';ctx.fillStyle=s.reservedBy?'#86969b':color;ctx.strokeStyle='#10252a';ctx.lineWidth=2;
        if(s.boss){ctx.beginPath();for(var p=0;p<10;p++){var a=p*Math.PI/5-Math.PI/2,rr=p%2?6:14;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();}
        else {ctx.beginPath();ctx.arc(x,y,s.group?7:4.5,0,Math.PI*2);ctx.fill();if(s.group){ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.strokeStyle=color;ctx.stroke();}}
      });
      (latest.players||[]).filter(function(p){return p.uid!==latest.you;}).forEach(function(p){var dx=(p.x-localAvatar.position.x)/range*r,dz=(p.z-localAvatar.position.z)/range*r;if(Math.hypot(dx,dz)>r)return;ctx.fillStyle='#7bddff';ctx.fillRect(cx+dx-4,cy+dz-4,8,8);});
      ctx.translate(cx,cy);ctx.rotate(-localAvatar.rotation.y);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(-7,-7);ctx.lineTo(0,-3);ctx.lineTo(7,-7);ctx.closePath();ctx.fill();ctx.restore();
      ctx.strokeStyle='#91c9b3';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#eafff4';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('북',160,17);ctx.font='17px sans-serif';ctx.fillText('주변 65m · ★ 보스',160,326);ctx.font='14px sans-serif';[['약함','#76e1a1'],['비슷','#ffe077'],['강함','#ff7474'],['위험','#cf87ff']].forEach(function(item,i){ctx.fillStyle=item[1];ctx.fillText(item[0],52+i*72,349);});
    }
    var lastIntentAt = 0;
    scene.onBeforeRenderObservable.add(function () {
      var dt = Math.min(0.05, engine.getDeltaTime() / 1000), now = performance.now();
      updateNavigation(now);drawRadar(now);
      if (battleMode) { runBattleEvent(dt); return; }
      cloudBase.forEach(function (cloud) { cloud.root.position.x = cloud.x + Math.sin(now / 35000 + cloud.index) * 9; });
      questMarker.position.y = 3.9 + Math.sin(now / 550) * .12;
      var x = clamp((input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joyX, -1, 1), z = clamp((input.down ? 1 : 0) - (input.up ? 1 : 0) + input.joyZ, -1, 1), length = Math.hypot(x, z);
      if (length > 1) { x /= length; z /= length; }
      if (!controlsEnabled || document.querySelector('.ix-modal-backdrop,.ix-drawer')) { x = z = 0; length = 0; }
      // Map screen right/down to the camera's horizontal world axes, also while orbiting.
      var strength = Math.hypot(x, z);
      var screenX = x, screenZ = z, alpha = camera.alpha;
      x = -screenX * Math.sin(alpha) + screenZ * Math.cos(alpha);
      z = screenX * Math.cos(alpha) + screenZ * Math.sin(alpha);
      var worldLength = Math.hypot(x, z);
      if (worldLength > 0) { x *= strength / worldLength; z *= strength / worldLength; }
      if (now - lastIntentAt > 48 && (Math.abs(x - input.sentX) > 0.02 || Math.abs(z - input.sentZ) > 0.02 || length > 0)) { onMove({ x: x, z: z }); input.sentX = x; input.sentZ = z; lastIntentAt = now; }
      var beforeX = localAvatar.position.x, beforeZ = localAvatar.position.z;
      if (latest.you) {
        var lead = length > .05 ? Math.min(.12,Math.max(0,(now-serverPositionAt)/1000)+.04) : 0;
        var visualX=clamp(localAvatar.metadata.targetX+x*(global.InsectData.mounts[localMount]?.speed||(localSprint?16:9))*lead,-238,238),visualZ=clamp(localAvatar.metadata.targetZ+z*(global.InsectData.mounts[localMount]?.speed||(localSprint?16:9))*lead,-238,238);
        var blocked=OBSTACLES.some(function(o){return o.type==='circle'?Math.hypot(visualX-o.x,visualZ-o.z)<o.radius+1.15:Math.abs(visualX-o.x)<o.width/2+1.15&&Math.abs(visualZ-o.z)<o.depth/2+1.15;});
        if(blocked){visualX=localAvatar.metadata.targetX;visualZ=localAvatar.metadata.targetZ;}
        var smooth=1-Math.exp(-dt*22);localAvatar.position.x+=(visualX-localAvatar.position.x)*smooth;localAvatar.position.z+=(visualZ-localAvatar.position.z)*smooth;
      }
      else { localAvatar.position.x = clamp(localAvatar.position.x + x * dt * 9, -238, 238); localAvatar.position.z = clamp(localAvatar.position.z + z * dt * 9, -238, 238); }
      var actualX = localAvatar.position.x - beforeX, actualZ = localAvatar.position.z - beforeZ;
      if (Math.hypot(actualX,actualZ)>.002 || length>.05) { var facing=Math.atan2(length>.05?x:actualX,length>.05?z:actualZ)-localAvatar.rotation.y;localAvatar.rotation.y+=Math.atan2(Math.sin(facing),Math.cos(facing))*(1-Math.exp(-dt*20)); }
      followCompanions(dt,now);
      var stepped = animateAvatar(localAvatar, dt, Math.hypot(actualX, actualZ) / Math.max(dt, 0.001));
      if (stepped && controlsEnabled && length > 0.05 && !document.hidden) {
        var onPath = [-144, 0, 144].some(function (axis) { return Math.abs(localAvatar.position.x - axis) < 4.5 || Math.abs(localAvatar.position.z - axis) < 4.5; });
        onFootstep({ surface: onPath ? 'path' : 'grass', foot: Math.floor((localAvatar.metadata.walk + Math.PI / 2) / Math.PI) % 2 });
      }
      if (controlsEnabled && Math.abs(camera.radius - lastRadius) > 0.02) {
        lastRadius = camera.radius; clearTimeout(radiusSaveTimer);
        var radiusToSave = clamp(camera.radius, 16, 52);
        radiusSaveTimer = setTimeout(function () { try { global.localStorage.setItem('insect.cameraRadius', String(radiusToSave)); } catch (_) {} }, 300);
      }
      camera.target.x += (localAvatar.position.x - camera.target.x) * Math.min(1, dt * 6); camera.target.z += (localAvatar.position.z - camera.target.z) * Math.min(1, dt * 6); camera.target.y = 1.4;
      Object.keys(remote).forEach(function (id) { var avatar = remote[id], dx = avatar.metadata.targetX - avatar.position.x, dz = avatar.metadata.targetZ - avatar.position.z, moving = Math.abs(dx) + Math.abs(dz) > 0.025, blend = Math.min(1, dt * 8); avatar.position.x += dx * blend; avatar.position.z += dz * blend; if (moving) avatar.rotation.y = Math.atan2(dx, dz); animateAvatar(avatar, dt, Math.hypot(dx, dz) * blend / Math.max(dt, 0.001)); });
      Object.keys(spawns).forEach(function (id) { var creature = spawns[id]; creature.position.x += (creature.metadata.targetX - creature.position.x) * Math.min(1, dt * 7); creature.position.z += (creature.metadata.targetZ - creature.position.z) * Math.min(1, dt * 7); creature.metadata.phase += dt * 4; (creature.metadata.dinoLegs||[]).forEach(function(leg,li){leg.rotation.x=Math.sin(creature.metadata.phase+(li%2?Math.PI:0))*.25;}); if(creature.metadata.dinoTail)creature.metadata.dinoTail.rotation.y=Math.sin(creature.metadata.phase*.6)*.1; creature.position.y = 0.25 + Math.abs(Math.sin(creature.metadata.phase)) * 0.17; creature.metadata.wings.forEach(function (wing, wi) { wing.rotation.z = (wi ? 1 : -1) * (0.3 + Math.abs(Math.sin(creature.metadata.phase * 3)) * 0.55); }); });
    });
    function resize() { engine.resize(); } global.addEventListener('resize', resize);
    engine.runRenderLoop(function () { scene.render(); });
    function dispose() {
      clearTimeout(radiusSaveTimer);
      canvas.removeEventListener('pointerdown', cameraDown); canvas.removeEventListener('pointermove', cameraMove); canvas.removeEventListener('pointerup', cameraUp); canvas.removeEventListener('pointercancel', cameraUp); canvas.removeEventListener('lostpointercapture', cameraUp);
      if (activeEvent && activeEvent.resolve) activeEvent.resolve(activeEvent.data);
      eventQueue.forEach(function (queued) { if (queued.resolve) queued.resolve(queued.data); });
      global.removeEventListener('keydown', keyDown); global.removeEventListener('keyup', keyUp); global.removeEventListener('blur', releaseInput); global.removeEventListener('resize', resize);
      if (joystickElement) { joystickElement.removeEventListener('pointerdown', pointerDown); joystickElement.removeEventListener('pointermove', pointerMove); joystickElement.removeEventListener('pointerup', pointerUp); joystickElement.removeEventListener('pointercancel', pointerUp); joystickElement.removeEventListener('lostpointercapture', pointerUp); joystickElement.remove(); }
      navHud.remove();skillBanner.remove();radar.remove();
      scene.dispose(); engine.dispose();
    }
    return { setNavigation: setNavigation, getNavigation: function(){return {target:navTarget,route:navRoute};}, setState: setState, setCharacter: setCharacter, setEnabled: setEnabled, playEvents: playEvents, dispose: dispose, scene: scene, camera: camera };
  }

  global.InsectWorld = Object.freeze({
    create: create,
    createCreatureModel: function (scene, speciesId, id) { return createCreature(scene, speciesId, { id: id || ('preview-' + speciesId) }); },
    createAvatarModel: function (scene, characterId, name) { return createAvatar(scene, characterId, name || '', null); },
    biomes: BIOMES.map(function(b){return Object.assign({},b,{x:b.x*2,z:b.z*2});}),
    obstacles: OBSTACLES,
    worldSize: WORLD_HALF * 2,
    safeZone: Object.freeze({ x: 0, z: 0, radius: 22 })
  });
})(window);
