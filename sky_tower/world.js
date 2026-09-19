(function (global) {
  'use strict';

  var B = global.BABYLON;
  var COLORS = {
    stone: new B.Color3(0.18, 0.25, 0.39),
    edge: new B.Color3(0.31, 0.78, 0.96),
    checkpoint: new B.Color3(0.24, 0.95, 0.62),
    danger: new B.Color3(1, 0.24, 0.34),
    gold: new B.Color3(1, 0.72, 0.18)
  };

  function material(scene, name, color, emissive) {
    var m = new B.StandardMaterial(name, scene);
    m.diffuseColor = color;
    m.specularColor = new B.Color3(0.1, 0.14, 0.2);
    m.emissiveColor = color.scale(emissive || 0);
    return m;
  }

  function makeLabel(scene, text) {
    var plane = B.MeshBuilder.CreatePlane('nameplate', { width: 2.7, height: 0.52 }, scene);
    plane.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') { plane.isVisible = false; plane.position.y = 2.15; return plane; }
    var tex = new B.DynamicTexture('nameTexture', { width: 512, height: 96 }, scene, false);
    tex.hasAlpha = true;
    tex.drawText(String(text || '플레이어').slice(0, 14), null, 65, 'bold 38px sans-serif', '#ffffff', 'rgba(9,16,30,.72)', true);
    var mat = new B.StandardMaterial('nameMaterial', scene);
    mat.diffuseTexture = tex;
    mat.opacityTexture = tex;
    mat.emissiveColor = B.Color3.White();
    mat.disableLighting = true;
    plane.material = mat;
    plane.position.y = 2.15;
    return plane;
  }

  function createAvatar(scene, profile) {
    profile = profile || {};
    var root = new B.TransformNode('avatar-' + (profile.id || 'player'), scene);
    var bodyMat = material(scene, 'avatarBody', B.Color3.FromHexString(profile.color || '#5DE1FF'), 0.08);
    var darkMat = material(scene, 'avatarDark', new B.Color3(0.08, 0.12, 0.22));
    var body = B.MeshBuilder.CreateCapsule('body', { height: 1.25, radius: 0.38, tessellation: 12 }, scene);
    body.parent = root; body.position.y = 0.82; body.material = bodyMat;
    var head = B.MeshBuilder.CreateSphere('head', { diameter: 0.7, segments: 12 }, scene);
    head.parent = root; head.position.y = 1.63; head.material = bodyMat;
    var visor = B.MeshBuilder.CreateSphere('visor', { diameter: 0.42, segments: 10, slice: 0.52 }, scene);
    visor.parent = root; visor.position.set(0, 1.66, 0.29); visor.rotation.x = Math.PI / 2; visor.material = darkMat;
    var legL = B.MeshBuilder.CreateBox('legL', { width: 0.24, height: 0.55, depth: 0.28 }, scene);
    var legR = legL.clone('legR');
    legL.parent = root; legR.parent = root; legL.position.set(-0.2, 0.27, 0); legR.position.set(0.2, 0.27, 0); legL.material = legR.material = darkMat;
    var label = makeLabel(scene, profile.name); label.parent = root;
    var imageUrl = profile.imageUrl || profile.preview || (profile.frames && profile.frames.idle);
    if (imageUrl) {
      var portrait = B.MeshBuilder.CreatePlane('avatarPortrait', { width: 1.28, height: 1.5 }, scene);
      var portraitMat = new B.StandardMaterial('avatarPortraitMaterial', scene);
      var portraitTex = new B.Texture(imageUrl, scene, true, true);
      portraitTex.hasAlpha = true; portraitMat.diffuseTexture = portraitTex; portraitMat.opacityTexture = portraitTex;
      portraitMat.emissiveColor = B.Color3.White(); portraitMat.disableLighting = true; portraitMat.backFaceCulling = false;
      portrait.parent = root; portrait.position.set(0, 1.05, -0.41); portrait.material = portraitMat; portrait.billboardMode = B.Mesh.BILLBOARDMODE_Y;
      body.visibility = 0.2; head.visibility = 0.2;
    }
    var accentMat = material(scene, 'avatarAccessory', B.Color3.FromHexString(profile.accent || profile.color || '#FDE047'), 0.15);
    function accessoryMesh(kind, opts, pos, rotation) {
      var mesh = kind === 'sphere' ? B.MeshBuilder.CreateSphere('accessory', opts, scene) : kind === 'cylinder' ? B.MeshBuilder.CreateCylinder('accessory', opts, scene) : B.MeshBuilder.CreateBox('accessory', opts, scene);
      mesh.parent = root; mesh.position.copyFromFloats(pos[0], pos[1], pos[2]); if (rotation) mesh.rotation.copyFromFloats(rotation[0], rotation[1], rotation[2]); mesh.material = accentMat; return mesh;
    }
    if (profile.accessory === 'cloud-cap') {
      accessoryMesh('sphere', { diameter: 0.48, segments: 8 }, [-0.22, 2.02, 0]); accessoryMesh('sphere', { diameter: 0.56, segments: 8 }, [0.12, 2.08, 0]);
    } else if (profile.accessory === 'sprout') {
      accessoryMesh('cylinder', { height: 0.42, diameter: 0.09, tessellation: 8 }, [0, 2.12, 0], [0, 0, -0.18]); accessoryMesh('sphere', { diameterX: 0.38, diameterY: 0.13, diameterZ: 0.22, segments: 8 }, [0.18, 2.31, 0]);
    } else if (profile.accessory === 'wings') {
      accessoryMesh('sphere', { diameterX: 0.2, diameterY: 0.72, diameterZ: 0.52, segments: 10 }, [-0.48, 1.12, -0.12], [0, 0, -0.45]); accessoryMesh('sphere', { diameterX: 0.2, diameterY: 0.72, diameterZ: 0.52, segments: 10 }, [0.48, 1.12, -0.12], [0, 0, 0.45]);
    } else if (profile.accessory === 'wizard-hat') {
      accessoryMesh('cylinder', { height: 0.86, diameterTop: 0, diameterBottom: 0.76, tessellation: 14 }, [0, 2.17, 0], [0, 0, -0.14]);
    } else if (profile.accessory === 'sun-crown') {
      for (var ray = 0; ray < 7; ray++) { var angle = ray / 7 * Math.PI * 2; accessoryMesh('box', { width: 0.1, height: 0.38, depth: 0.1 }, [Math.cos(angle) * 0.32, 2.13 + Math.sin(angle) * 0.12, Math.sin(angle) * 0.16], [0, 0, -angle]); }
    }
    var frameTextures = null;
    if (portrait && profile.frames) { frameTextures = {}; Object.keys(profile.frames).forEach(function (key) { frameTextures[key] = key === 'idle' ? portraitTex : new B.Texture(profile.frames[key], scene, true, true); frameTextures[key].hasAlpha = true; }); }
    root.metadata = { body: body, head: head, legs: [legL, legR], portrait: portrait, portraitMaterial: portraitMat, frameTextures: frameTextures, frameKey: 'idle', profile: profile, animTime: 0 };
    return root;
  }

  function create(scene, options) {
    options = options || {};
    var platforms = [], hazards = [], decorations = [], checkpoints = [];
    var mats = {
      stone: material(scene, 'skyStone', COLORS.stone),
      stoneMid: material(scene, 'skyStoneMid', new B.Color3(0.22, 0.2, 0.46)),
      stoneHigh: material(scene, 'skyStoneHigh', new B.Color3(0.32, 0.18, 0.44)),
      edge: material(scene, 'skyEdge', COLORS.edge, 0.16),
      moving: material(scene, 'skyMoving', new B.Color3(0.2, 0.68, 0.92), 0.2),
      checkpoint: material(scene, 'skyCheckpoint', COLORS.checkpoint, 0.22),
      danger: material(scene, 'skyDanger', COLORS.danger, 0.25),
      gold: material(scene, 'skyGold', COLORS.gold, 0.25)
    };

    function addPlatform(x, y, z, w, d, type, extra) {
      extra = extra || {};
      var mesh = B.MeshBuilder.CreateBox('platform-' + platforms.length, { width: w, height: extra.height || 0.55, depth: d }, scene);
      mesh.position.set(x, y, z);
      mesh.material = type === 'checkpoint' ? mats.checkpoint : type === 'finish' ? mats.gold : type === 'moving' ? mats.moving : y >= 40 ? mats.stoneHigh : y >= 20 ? mats.stoneMid : mats.stone;
      mesh.receiveShadows = true;
      var p = { mesh: mesh, base: new B.Vector3(x, y, z), width: w, depth: d, height: extra.height || 0.55, type: type || 'solid', active: true, phase: extra.phase || 0, axis: extra.axis || 'x', range: extra.range || 0, speed: extra.speed || 1, previous: new B.Vector3(x, y, z), delta: B.Vector3.Zero(), timer: 0 };
      platforms.push(p);
      var rim = B.MeshBuilder.CreateBox('platform-rim-' + platforms.length, { width: w + 0.08, height: 0.09, depth: d + 0.08 }, scene);
      rim.position.set(x, y + p.height / 2 + 0.05, z); rim.material = type === 'moving' ? mats.moving : type === 'finish' ? mats.gold : mats.edge; rim.parent = mesh; rim.position.set(0, p.height / 2 + 0.05, 0);
      if (type === 'checkpoint' || type === 'finish') {
        var index = checkpoints.length;
        checkpoints.push({ index: index, position: new B.Vector3(x, y + p.height / 2 + 1.05, z), platform: p, finish: type === 'finish' });
        var ring = B.MeshBuilder.CreateTorus('checkpoint-ring-' + index, { diameter: Math.min(w, d) * 0.62, thickness: 0.12, tessellation: 32 }, scene);
        ring.position.set(x, y + 0.52, z); ring.material = type === 'finish' ? mats.gold : mats.checkpoint; decorations.push(ring);
      }
      return p;
    }

    function addSpinner(y, length, speed, phase) {
      var hub = new B.TransformNode('spinner', scene); hub.position.set(0, y, 0);
      var bar = B.MeshBuilder.CreateBox('spinner-bar', { width: length, height: 0.34, depth: 0.42 }, scene);
      bar.parent = hub; bar.material = mats.danger;
      hazards.push({ type: 'spinner', node: hub, length: length, radius: 0.42, speed: speed, phase: phase || 0 });
    }

    // 각 구간은 최대 수평 4.4m, 높이 2.1m로 기본 점프(약 5.5m 수평)에 여유를 둔다.
    addPlatform(0, 0, 0, 10, 10, 'checkpoint');
    var route = [
      [3.5,2,0,4,3], [4.5,4,3.5,3.5,3.5], [1.5,6,5.5,4,3], [-2,8,5,3.4,3.4], [-4.5,10,2,4,3],
      [-4,12,-2,3.2,3.2,'moving',{axis:'x',range:2.1,speed:1.05}], [0,14,-3.8,4,3], [3.8,16,-2.5,3.3,3.3,'vanish',{phase:0.6}], [4.2,18,1.5,4,3], [1,20,3.8,7,6,'checkpoint'],
      [-3,22,4.2,3.1,3.1], [-5,24,1,3.4,3.4,'moving',{axis:'z',range:2.2,speed:1.2}], [-3.5,26,-3,3.1,3.1], [0,28,-4.5,3.2,3.2,'vanish',{phase:1.8}], [3.8,30,-3,3.4,3.4],
      [5,32,0.8,3.2,3.2], [2.5,34,4,3.2,3.2,'moving',{axis:'x',range:2,speed:1.35}], [-1.5,36,4.5,3,3], [-4.5,38,2,3.4,3.4,'vanish',{phase:0}], [-2,40,-1,7,6,'checkpoint'],
      [2,42,-3.5,3,3], [5,44,-1.5,3,3,'moving',{axis:'z',range:1.8,speed:1.4}], [4,46,2.5,3,3,'vanish',{phase:1}], [0.5,48,4.5,3,3], [-3.2,50,3.2,3,3],
      [-5,52,0,3,3,'moving',{axis:'x',range:2,speed:1.55}], [-3,54,-3.5,3,3,'vanish',{phase:2}], [1,56,-4,3,3], [4.5,58,-1.5,4,4], [0,60,0,8,8,'finish']
    ];
    route.forEach(function (r) { addPlatform(r[0], r[1], r[2], r[3], r[4], r[5], r[6]); });
    addSpinner(20.85, 6.2, 1.25, 0); addSpinner(40.85, 6.1, -1.55, 1); addSpinner(60.85, 7.2, 1.8, 2);

    // 단순 인스턴스를 사용한 저폴리 배경. 드로우콜을 억제하면서 각 구간의 높이감을 만든다.
    var cloudMat = material(scene, 'cloudMaterial', new B.Color3(0.72, 0.86, 1), 0.08);
    mats.cloud = cloudMat;
    var cloudSource = B.MeshBuilder.CreateSphere('cloudSource', { diameter: 2.6, segments: 6 }, scene); cloudSource.material = cloudMat; cloudSource.isVisible = false; decorations.push(cloudSource);
    for (var cloudIndex = 0; cloudIndex < 36; cloudIndex++) {
      var cloud = cloudSource.createInstance('cloud-' + cloudIndex), angle = cloudIndex * 2.399, radius = 13 + cloudIndex % 5 * 2.8;
      cloud.position.set(Math.cos(angle) * radius, 2 + cloudIndex * 1.72, Math.sin(angle) * radius); cloud.scaling.set(1.5 + cloudIndex % 3 * 0.5, 0.35 + cloudIndex % 2 * 0.12, 0.75 + cloudIndex % 4 * 0.18); decorations.push(cloud);
    }
    var islandMat = material(scene, 'islandMaterial', new B.Color3(0.12, 0.16, 0.28)); mats.island = islandMat;
    for (var islandIndex = 0; islandIndex < 9; islandIndex++) {
      var islandAngle = islandIndex * 2.17, island = B.MeshBuilder.CreateCylinder('floating-island', { height: 3.8, diameterTop: 5, diameterBottom: 0.5, tessellation: 7 }, scene);
      island.position.set(Math.cos(islandAngle) * (18 + islandIndex % 3 * 4), 5 + islandIndex * 6.6, Math.sin(islandAngle) * (18 + islandIndex % 3 * 4)); island.material = islandMat; decorations.push(island);
    }
    for (var arrowIndex = 0; arrowIndex < route.length; arrowIndex += 5) {
      var next = route[Math.min(route.length - 1, arrowIndex + 1)], arrow = B.MeshBuilder.CreateCylinder('route-arrow', { height: 0.7, diameterTop: 0, diameterBottom: 0.7, tessellation: 3 }, scene);
      arrow.position.set(next[0], next[1] + 1.65, next[2]); arrow.rotation.x = Math.PI; arrow.material = mats.gold; decorations.push(arrow);
    }
    var beacon = B.MeshBuilder.CreateCylinder('summit-beacon', { height: 13, diameterTop: 0.18, diameterBottom: 1.3, tessellation: 12 }, scene);
    beacon.position.set(0, 67, 0); beacon.material = mats.gold; decorations.push(beacon);

    function update(dt, time) {
      platforms.forEach(function (p) {
        p.previous.copyFrom(p.mesh.position);
        if (p.type === 'moving') p.mesh.position[p.axis] = p.base[p.axis] + Math.sin(time * p.speed + p.phase) * p.range;
        if (p.type === 'vanish') {
          var cycle = (time + p.phase) % 4.4;
          p.active = cycle < 2.9;
          p.mesh.isVisible = p.active;
          p.mesh.visibility = cycle > 2.45 && cycle < 2.9 ? 0.25 + Math.abs(Math.sin(cycle * 18)) * 0.65 : 1;
        }
        p.delta.copyFrom(p.mesh.position).subtractInPlace(p.previous);
      });
      hazards.forEach(function (h) { h.node.rotation.y = time * h.speed + h.phase; });
      decorations.forEach(function (m, i) { m.rotation.y += dt * (0.7 + i * 0.01); });
    }

    function dispose() {
      platforms.forEach(function (p) { p.mesh.dispose(); }); hazards.forEach(function (h) { h.node.dispose(false, true); }); decorations.forEach(function (m) { m.dispose(); });
      Object.keys(mats).forEach(function (k) { mats[k].dispose(); });
    }

    return { platforms: platforms, hazards: hazards, checkpoints: checkpoints, spawn: checkpoints[0].position.clone(), finishY: 60, update: update, dispose: dispose, createAvatar: function (p) { return createAvatar(scene, p); } };
  }

  global.SkyTowerWorld = { create: create };
})(window);
