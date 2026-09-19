(function (global) {
  'use strict';

  function create(options) {
    options = options || {};
    var B = options.BABYLON || global.BABYLON;
    var canvas = options.canvas, ownsEngine = !options.engine, engine = options.engine || null, scene = options.scene || null;
    if (!B || !canvas || !global.SkyTowerWorld) throw new Error('SkyTowerGame: Babylon.js, canvas, world.js가 필요합니다.');
    if (!engine) engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true });
    if (!scene) {
      scene = new B.Scene(engine);
      scene.clearColor = new B.Color4(0.035, 0.075, 0.16, 1);
      new B.HemisphericLight('skyFill', new B.Vector3(0.25, 1, 0.2), scene).intensity = 0.88;
      var sun = new B.DirectionalLight('skySun', new B.Vector3(-0.35, -1, 0.45), scene); sun.position.set(24, 70, -32); sun.intensity = 1.25;
      scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = 0.006; scene.fogColor = new B.Color3(0.04, 0.09, 0.18);
    }
    var world = global.SkyTowerWorld.create(scene, options.world);
    var profile = Object.assign({ id: 'local', name: '플레이어', character: 'original' }, options.profile || {});
    function avatarProfile(base) {
      var characterId = base.characterId || base.character;
      var known = global.SkyTowerCharacters && global.SkyTowerCharacters.list && global.SkyTowerCharacters.list.some(function (item) { return item.id === characterId; });
      var character = known && global.SkyTowerCharacters.getById ? global.SkyTowerCharacters.getById(characterId) : null;
      var legacySource = base.imageUrl || base.avatar || (character && character.preview);
      var selectedImage = characterId === 'original' && global.SkyTowerCharacters && global.SkyTowerCharacters.resolveLegacyAvatar ? global.SkyTowerCharacters.resolveLegacyAvatar(legacySource) : ((character && character.preview) || legacySource);
      var result = Object.assign({}, character || {}, base, { character: characterId || 'original', imageUrl: selectedImage, name: base.name || base.nickname || '플레이어' });
      if (characterId === 'original' && selectedImage) result.frames = { idle: selectedImage, jump: selectedImage, walkA: selectedImage, walkB: selectedImage };
      return result;
    }
    profile = avatarProfile(profile);
    var avatar = world.createAvatar(profile), remotes = new Map(), running = false, observer = null, accumulator = 0, time = 0;
    var startEpoch = Number(options.startEpoch) || Date.now();
    var now = typeof options.now === 'function' ? options.now : Date.now;
    var input = { x: 0, z: 0, jump: false, cameraX: 0, cameraY: 0 }, keys = Object.create(null);
    var state = { position: world.spawn.clone(), velocity: B.Vector3.Zero(), facing: Math.PI, grounded: false, ground: null, coyote: 0, jumpBuffer: 0, hazardCooldown: 0, fallEmitted: false, checkpoint: 0, falls: 0, finished: false, animation: 'idle', elapsed: 0 };
    var camera = options.camera || new B.ArcRotateCamera('towerCamera', -Math.PI / 2, 1.05, 11, state.position.clone(), scene);
    camera.lowerRadiusLimit = 6; camera.upperRadiusLimit = 16; camera.lowerBetaLimit = 0.55; camera.upperBetaLimit = 1.35; camera.wheelPrecision = 35; camera.panningSensibility = 0;
    // 포인터 시점 입력은 UI가 skytower:input으로 단일 관리한다. Babylon 기본 포인터 입력은 중복 회전을 막기 위해 붙이지 않는다.
    avatar.position.copyFrom(state.position);
    var PLAYER_RADIUS = 0.38, PLAYER_HALF = 0.92, STEP = 1 / 120;
    var paused = false;

    function emit(type, data) {
      if (options.ui && options.ui.onEvent) options.ui.onEvent(type, data);
      global.dispatchEvent(new CustomEvent('sky-tower:event', { detail: { type: type, data: data } }));
    }
    function publishState() {
      var publicState = getState();
      if (options.ui && options.ui.onState) options.ui.onState(publicState);
      global.dispatchEvent(new CustomEvent('sky-tower:state', { detail: publicState }));
    }
    function getState() { return { checkpoint: state.checkpoint, checkpointCount: world.checkpoints.length - 1, falls: state.falls, finished: state.finished, elapsed: state.elapsed, animation: state.animation, height: state.position.y, progress: Math.min(1, state.position.y / world.finishY) }; }
    function getSnapshot() { return { position: { x: state.position.x, y: state.position.y, z: state.position.z }, rotation: { x: 0, y: state.facing, z: 0 }, animation: state.animation, character: profile.character || profile.id, name: profile.name, checkpoint: state.checkpoint, falls: state.falls }; }

    function respawn(manual) {
      var cp = world.checkpoints[state.checkpoint] || world.checkpoints[0];
      state.position.copyFrom(cp.position); state.velocity.set(0, 0, 0); state.grounded = false; state.ground = null; state.coyote = 0; state.jumpBuffer = 0; state.hazardCooldown = 0; state.fallEmitted = false; input.jump = false; state.falls += manual ? 0 : 1;
      if (!state.finished) state.animation = 'idle';
      emit('respawn', { manual: !!manual, checkpoint: state.checkpoint, falls: state.falls });
    }

    function standingOn(p, oldY, newY) {
      if (!p.active) return false;
      var top = p.mesh.position.y + p.height / 2, feetOld = oldY - PLAYER_HALF, feetNew = newY - PLAYER_HALF;
      return feetOld >= top - 0.18 && feetNew <= top + 0.1 && Math.abs(state.position.x - p.mesh.position.x) <= p.width / 2 + PLAYER_RADIUS * 0.45 && Math.abs(state.position.z - p.mesh.position.z) <= p.depth / 2 + PLAYER_RADIUS * 0.45;
    }

    function simulate(dt) {
      if (state.finished) { state.velocity.scaleInPlace(Math.pow(0.02, dt)); return; }
      var wasGrounded = state.grounded;
      state.elapsed += dt; state.coyote = state.grounded ? 0.11 : Math.max(0, state.coyote - dt); state.jumpBuffer = Math.max(0, state.jumpBuffer - dt); state.hazardCooldown = Math.max(0, state.hazardCooldown - dt);
      if (input.jump) { state.jumpBuffer = 0.16; input.jump = false; }
      var forward = new B.Vector3(-Math.cos(camera.alpha), 0, -Math.sin(camera.alpha));
      var right = new B.Vector3(forward.z, 0, -forward.x);
      var ix = input.x + (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      var iz = input.z + (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      var wish = right.scale(ix).add(forward.scale(iz)); if (wish.lengthSquared() > 1) wish.normalize();
      var targetX = wish.x * 5.6, targetZ = wish.z * 5.6, response = state.grounded ? 18 : 7;
      state.velocity.x += (targetX - state.velocity.x) * Math.min(1, response * dt); state.velocity.z += (targetZ - state.velocity.z) * Math.min(1, response * dt);
      if (state.jumpBuffer > 0 && (state.grounded || state.coyote > 0)) { state.velocity.y = 11; state.grounded = false; state.ground = null; state.jumpBuffer = 0; state.coyote = 0; emit('jump', null); }
      state.velocity.y = Math.max(-18, state.velocity.y - 21 * dt);
      if (state.ground && state.ground.active) state.position.addInPlace(state.ground.delta);
      var oldY = state.position.y; state.position.x += state.velocity.x * dt; state.position.z += state.velocity.z * dt; var nextY = state.position.y + state.velocity.y * dt;
      var landed = null;
      if (state.velocity.y <= 0) for (var i = 0; i < world.platforms.length; i++) if (standingOn(world.platforms[i], oldY, nextY)) { landed = world.platforms[i]; break; }
      if (landed) { state.position.y = landed.mesh.position.y + landed.height / 2 + PLAYER_HALF; state.velocity.y = 0; state.grounded = true; state.ground = landed; if (!wasGrounded) emit('land', null); state.fallEmitted = false; }
      else { state.position.y = nextY; state.grounded = false; state.ground = null; }
      if (!state.grounded && state.velocity.y < -2.2 && !state.fallEmitted) { state.fallEmitted = true; emit('fall', null); }
      for (var h = 0; h < world.hazards.length; h++) {
        var hz = world.hazards[h], dy = Math.abs(state.position.y - hz.node.position.y);
        if (state.hazardCooldown <= 0 && dy < 1.15) { var local = state.position.subtract(hz.node.position), a = -hz.node.rotation.y, lx = local.x * Math.cos(a) - local.z * Math.sin(a), lz = local.x * Math.sin(a) + local.z * Math.cos(a); if (Math.abs(lx) < hz.length / 2 + PLAYER_RADIUS && Math.abs(lz) < hz.radius + PLAYER_RADIUS) { state.hazardCooldown = 0.6; state.velocity.y = 5.5; state.velocity.x += Math.sign(local.x || 1) * 6; state.velocity.z += Math.sign(local.z || 1) * 6; emit('hazard', null); } }
      }
      var cp = world.checkpoints[state.checkpoint + 1];
      if (cp && state.grounded && state.ground === cp.platform) { var d = state.position.subtract(cp.position); if (Math.abs(d.x) < cp.platform.width / 2 && Math.abs(d.z) < cp.platform.depth / 2) { state.checkpoint += 1; emit('checkpoint', { index: state.checkpoint, total: world.checkpoints.length - 1, position: { x: cp.position.x, y: cp.position.y, z: cp.position.z } }); if (cp.finish) { state.finished = true; state.animation = 'finish'; emit('finish', { elapsed: state.elapsed, falls: state.falls }); } } }
      if (state.position.y < -8 || Math.abs(state.position.x) > 45 || Math.abs(state.position.z) > 45) respawn(false);
      if (!state.finished) state.animation = !state.grounded ? (state.velocity.y > 0 ? 'jump' : 'fall') : wish.lengthSquared() > 0.03 ? 'run' : 'idle';
      if (wish.lengthSquared() > 0.02) state.facing = Math.atan2(wish.x, wish.z);
    }

    function animateAvatar(node, animation, dt) {
      if (!node || !node.metadata) return; var md = node.metadata; md.animTime += dt; var run = animation === 'run' ? Math.sin(md.animTime * 11) * 0.48 : 0;
      md.legs[0].rotation.x = run; md.legs[1].rotation.x = -run; md.body.position.y = 0.82 + (animation === 'run' ? Math.abs(Math.sin(md.animTime * 11)) * 0.05 : 0); node.scaling.y += ((animation === 'jump' ? 1.08 : animation === 'fall' ? 0.94 : 1) - node.scaling.y) * Math.min(1, dt * 10);
      if (md.frameTextures && md.portraitMaterial) { var key = animation === 'run' ? (Math.floor(md.animTime * 7) % 2 ? 'walkA' : 'walkB') : animation === 'jump' || animation === 'fall' ? 'jump' : 'idle'; if (md.frameTextures[key] && key !== md.frameKey) { md.frameKey = key; md.portraitMaterial.diffuseTexture = md.frameTextures[key]; md.portraitMaterial.opacityTexture = md.frameTextures[key]; } }
    }
    function frame() {
      var dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000); accumulator += dt; time = (now() - startEpoch) / 1000;
      if (!paused) while (accumulator >= STEP) { accumulator -= STEP; world.update(STEP, time - accumulator); simulate(STEP); }
      else { accumulator = 0; world.update(dt, time); }
      avatar.position.copyFrom(state.position); avatar.position.y -= PLAYER_HALF; avatar.rotation.y = state.facing; animateAvatar(avatar, state.animation, dt);
      camera.target = B.Vector3.Lerp(camera.target, state.position.add(new B.Vector3(0, 0.8, 0)), 1 - Math.pow(0.001, dt));
      remotes.forEach(function (r) { var visualTarget = r.target.clone(); visualTarget.y -= PLAYER_HALF; r.node.position = B.Vector3.Lerp(r.node.position, visualTarget, 1 - Math.pow(0.003, dt)); r.node.rotation.y += Math.atan2(Math.sin(r.facing - r.node.rotation.y), Math.cos(r.facing - r.node.rotation.y)) * Math.min(1, dt * 12); animateAvatar(r.node, r.animation, dt); });
      publishState();
    }

    function upsertRemotePlayer(id, snapshot) {
      if (!id || id === profile.id || !snapshot || !snapshot.position) return;
      var remoteProfile = avatarProfile({ id: id, name: snapshot.name || snapshot.nickname || '친구', character: snapshot.character || 'original', avatar: snapshot.avatar });
      var visualKey = [remoteProfile.character, remoteProfile.name, remoteProfile.imageUrl || ''].join('\n');
      var r = remotes.get(id);
      if (!r) {
        r = { node: world.createAvatar(remoteProfile), target: new B.Vector3(), facing: 0, animation: 'idle', visualKey: visualKey };
        remotes.set(id, r); r.node.position.set(snapshot.position.x, snapshot.position.y - PLAYER_HALF, snapshot.position.z);
      } else if (r.visualKey !== visualKey) {
        var oldNode = r.node, replacement = world.createAvatar(remoteProfile);
        replacement.position.copyFrom(oldNode.position); replacement.rotation.copyFrom(oldNode.rotation); replacement.scaling.copyFrom(oldNode.scaling);
        r.node = replacement; r.visualKey = visualKey; oldNode.dispose(false, true);
      }
      r.target.set(Number(snapshot.position.x) || 0, Number(snapshot.position.y) || 0, Number(snapshot.position.z) || 0); r.facing = snapshot.rotation ? Number(snapshot.rotation.y) || 0 : Number(snapshot.facing) || 0; r.animation = snapshot.animation || 'idle';
    }
    function removeRemotePlayer(id) { var r = remotes.get(id); if (r) { r.node.dispose(false, true); remotes.delete(id); } }
    function keyDown(e) { if (paused) return; keys[e.code] = true; if (e.code === 'Space') { input.jump = true; e.preventDefault(); } if (e.code === 'KeyR' && !state.finished) respawn(true); }
    function keyUp(e) { keys[e.code] = false; }
    global.addEventListener('keydown', keyDown); global.addEventListener('keyup', keyUp);

    function start() { if (!running) { running = true; observer = scene.onBeforeRenderObservable.add(frame); if (ownsEngine) engine.runRenderLoop(function () { scene.render(); }); emit('ready', { checkpoints: world.checkpoints.length - 1 }); } }
    function stop() { if (running) { running = false; scene.onBeforeRenderObservable.remove(observer); observer = null; if (ownsEngine) engine.stopRenderLoop(); } }
    function dispose() { stop(); global.removeEventListener('keydown', keyDown); global.removeEventListener('keyup', keyUp); global.removeEventListener('skytower:input', towerInput); remotes.forEach(function (_, id) { removeRemotePlayer(id); }); avatar.dispose(false, true); world.dispose(); if (!options.camera) camera.dispose(); if (ownsEngine) { scene.dispose(); engine.dispose(); } }
    function setInput(next) { if (!next) return; if (Number.isFinite(next.x)) input.x = Math.max(-1, Math.min(1, next.x)); if (Number.isFinite(next.z)) input.z = Math.max(-1, Math.min(1, next.z)); if (next.jump) input.jump = true; if (Number.isFinite(next.cameraX)) camera.alpha += next.cameraX; if (Number.isFinite(next.cameraY)) camera.beta = Math.max(camera.lowerBetaLimit, Math.min(camera.upperBetaLimit, camera.beta + next.cameraY)); }
    function setProfile(next) { profile = avatarProfile(Object.assign({}, profile, next || {})); var old = avatar; avatar = world.createAvatar(profile); avatar.position.copyFrom(state.position); avatar.position.y -= PLAYER_HALF; avatar.rotation.y = state.facing; old.dispose(false, true); return profile; }
    function towerInput(e) {
      var d = e.detail || {};
      if (d.type === 'move') setInput({ x: Number(d.x) || 0, z: Number(d.y) || 0 });
      else if (d.type === 'look') setInput({ cameraX: (Number(d.x) || 0) * -0.005, cameraY: (Number(d.y) || 0) * 0.005 });
      else if (d.type === 'jump' && d.active !== false) setInput({ jump: true });
      else { var move = d.move || d, look = d.look || {}; setInput({ x: Number(move.x) || 0, z: Number(move.y != null ? move.y : move.z) || 0, jump: !!d.jump, cameraX: Number(look.x) || 0, cameraY: Number(look.y) || 0 }); }
    }
    function restoreState(saved) {
      saved = saved || {};
      var checkpoint = Math.max(0, Math.min(world.checkpoints.length - 1, Math.floor(Number(saved.checkpoint) || 0)));
      state.checkpoint = checkpoint; state.falls = Math.max(0, Math.floor(Number(saved.falls) || 0)); state.elapsed = Math.max(0, Number(saved.elapsed) || 0); state.finished = !!saved.finished && checkpoint === world.checkpoints.length - 1;
      var cp = world.checkpoints[checkpoint]; state.position.copyFrom(cp.position); state.velocity.set(0, 0, 0); state.grounded = false; state.ground = null; state.animation = state.finished ? 'finish' : 'idle'; avatar.position.copyFrom(state.position); avatar.position.y -= PLAYER_HALF; publishState(); return getState();
    }
    function restart() { paused = false; state.checkpoint = 0; state.falls = 0; state.elapsed = 0; state.finished = false; state.animation = 'idle'; respawn(true); publishState(); return getState(); }
    function setPaused(value) { paused = !!value; if (paused) { input.x = 0; input.z = 0; input.jump = false; keys = Object.create(null); } return paused; }
    function debugStep(dt) { dt = Math.max(0, Math.min(0.1, Number(dt) || STEP)); world.update(dt, time += dt); simulate(dt); avatar.position.copyFrom(state.position); avatar.position.y -= PLAYER_HALF; }
    function debugSetPlayer(position, velocity) { state.position.set(position.x, position.y, position.z); state.velocity.set(velocity && velocity.x || 0, velocity && velocity.y || 0, velocity && velocity.z || 0); state.grounded = false; state.ground = null; state.coyote = 0; state.jumpBuffer = 0; state.fallEmitted = false; }
    global.addEventListener('skytower:input', towerInput);
    return { start: start, stop: stop, dispose: dispose, setInput: setInput, setProfile: setProfile, setPaused: setPaused, restoreState: restoreState, restart: restart, upsertRemotePlayer: upsertRemotePlayer, removeRemotePlayer: removeRemotePlayer, respawn: function () { respawn(true); }, getSnapshot: getSnapshot, getState: getState, setStartEpoch: function (value) { startEpoch = Number(value) || Date.now(); }, world: world, avatar: avatar, camera: camera, engine: engine, scene: scene, _debugStep: debugStep, _debugSetPlayer: debugSetPlayer };
  }

  global.SkyTowerGame = { create: create };
})(window);
