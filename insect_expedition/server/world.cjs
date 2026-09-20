'use strict';

const crypto = require('node:crypto');

const Data = require('../shared/data.js');
const WORLD_LIMIT = Data.world.maxX;
const SAFE_RADIUS = 22;
const PLAYER_RADIUS = 1.15;
const MOVE_SPEED = 9;
const SPRINT_SPEED = 16;
const OBSTACLES = Object.freeze(Data.obstacles);

const TUTORIAL_POINTS = Object.freeze([[-8, 18], [8, 17], [-12, 25], [12, 28], [28, 22], [-30, 18]]);
const HABITAT_OFFSETS = Object.freeze([[-17, -13], [17, -14], [-17, 14], [18, 15], [0, -19], [0, 19], [-21, 0], [21, 0]]);
const GUIDE = Object.freeze({ id: 'guide-mira', name: '미라 연구원', x: 7, z: 11, radius: 4 });

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function inSafeZone(point) { return Math.hypot(point.x, point.z) <= SAFE_RADIUS; }

function pointBlocked(point, padding = PLAYER_RADIUS) {
  return OBSTACLES.some((obstacle) => {
    if (obstacle.type === 'circle') return Math.hypot(point.x - obstacle.x, point.z - obstacle.z) < obstacle.radius + padding;
    return Math.abs(point.x - obstacle.x) < obstacle.width / 2 + padding && Math.abs(point.z - obstacle.z) < obstacle.depth / 2 + padding;
  });
}

function segmentBlocked(a, b) {
  const length = Math.max(1, Math.ceil(distance(a, b) / 1.25));
  for (let index = 1; index < length; index += 1) {
    const t = index / length;
    if (pointBlocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, 0.25)) return true;
  }
  return false;
}

function updateStamina(player, now = Date.now()) {
  if (!Number.isFinite(player.stamina)) player.stamina = 100;
  const since = Number.isFinite(player.staminaAt) ? player.staminaAt : now;
  const seconds = Math.max(0, (now - since) / 1000);
  const movingSeconds = player.sprinting && player.moveActive && !player.busy && !player.mount
    ? Math.max(0, (Math.min(now, (player.lastMoveAt || since) + 350) - since) / 1000) : 0;
  player.stamina = clamp(player.stamina - movingSeconds * 4 + (seconds - movingSeconds) * 14, 0, 100);
  if (player.stamina <= 0) player.sprinting = false;
  player.staminaAt = now;
}

function movePlayer(player, intent, now = Date.now()) {
  updateStamina(player, now);
  const ix = clamp(Number(intent.x) || 0, -1, 1);
  const iz = clamp(Number(intent.z) || 0, -1, 1);
  const magnitude = Math.hypot(ix, iz);
  const elapsed = clamp((now - (player.lastMoveAt || now - 50)) / 1000, 0.016, 0.25);
  player.lastMoveAt = now;
  player.moveActive = magnitude > 0;
  if (!magnitude) return false;
  const factor = (Data.mounts[player.mount]?.speed || (player.sprinting && player.stamina > 0 ? SPRINT_SPEED : MOVE_SPEED)) * elapsed / Math.max(1, magnitude);
  const candidate = {
    x: clamp(player.x + ix * factor, -WORLD_LIMIT, WORLD_LIMIT),
    z: clamp(player.z + iz * factor, -WORLD_LIMIT, WORLD_LIMIT)
  };
  if (pointBlocked(candidate)) return false;
  player.x = candidate.x;
  player.z = candidate.z;
  return true;
}

function makeSpawns(species, biomes) {
  const catalog = Array.isArray(species) ? species : [];
  const regions = Array.isArray(biomes) ? biomes : [];
  const fieldCatalog = catalog.filter((item) => ['uncommon', 'rare', 'evolved', 'elite', 'monster'].includes(item.rarity));
  const commonCatalog = catalog.filter((item) => item.rarity === 'common');
  const tutorial = TUTORIAL_POINTS.map(([x, z], index) => {
    const creature = index === 4 ? fieldCatalog[0] : commonCatalog[index % Math.max(1, commonCatalog.length)];
    return makeSpawn(`tutorial-${index + 1}`, creature && creature.id, x, z, index === 4, 1);
  });
  const counts = new Map();
  const habitat = catalog.flatMap((creature) => {
    const biome = regions.find(b=>!b.safe&&(b.habitats||[b.habitat]).includes(creature.habitat));
    if(!biome)return [];
    return [0,1,2].map(pack=>{
      const used=counts.get(biome.id)||0;counts.set(biome.id,used+1);
      let point;
      for(let attempt=0;attempt<32;attempt++){
        const angle=(used+attempt)*2.39996, radius=18+((used+attempt)%4)*11;
        const p={x:biome.center.x+Math.cos(angle)*radius,z:biome.center.z+Math.sin(angle)*radius};
        if(!pointBlocked(p,3)){point=p;break;}
      }
      point ||= {x:biome.center.x,z:biome.center.z-25};
      const rank=Math.max(0,Data.rarityOrder.indexOf(creature.rarity));
      const range=biome.levels||[3,8],level=Math.min(range[1],range[0]+Math.floor(rank/2)+pack);
      return {...makeSpawn('habitat-'+creature.id+(pack?'-'+(pack+1):''),creature.id,point.x,point.z,true,level),biomeId:biome.id};
    });
  });
  const bosses = require('../shared/data.js').fieldBosses.map(b => ({...makeSpawn(b.id,b.speciesId,b.x,b.z,true,b.level),boss:true,biomeId:b.biomeId,bossName:b.name}));
  const groups=regions.filter(b=>!b.safe).map(b=>{
    const local=catalog.filter(c=>(b.habitats||[b.habitat]).includes(c.habitat));
    const members=[0,1,2].map((n)=>({speciesId:local[(local.length-1+n)%local.length].id,level:b.levels[0]+n}));
    let point={x:b.center.x+36,z:b.center.z+24};if(pointBlocked(point,4))point={x:b.center.x-36,z:b.center.z-24};
    return {...makeSpawn('group-'+b.id,members[0].speciesId,point.x,point.z,true,members[0].level),biomeId:b.id,members,group:true};
  });
  return [...tutorial, ...habitat, ...bosses, ...groups];
}

function makeSpawn(id, speciesId, x, z, field, level) {
  return { id, speciesId, x, z, available: true, reservedBy: null, respawnAt: 0, field, level, nonce: crypto.randomBytes(4).toString('hex') };
}

function updateSpawns(spawns, now = Date.now()) {
  for (const spawn of spawns) {
    if (!spawn.available && !spawn.reservedBy && spawn.respawnAt && spawn.respawnAt <= now) {
      spawn.available = true;
      spawn.respawnAt = 0;
      spawn.nonce = crypto.randomBytes(4).toString('hex');
    }
  }
}

function publicSpawn(spawn) {
  return { id: spawn.id, speciesId: spawn.speciesId, x: spawn.x, z: spawn.z, available: spawn.available, reservedBy: spawn.reservedBy, field: spawn.field, level: spawn.level, group: !!spawn.group, members: spawn.members, boss: !!spawn.boss, biomeId: spawn.biomeId, bossName: spawn.bossName, respawnAt: spawn.respawnAt };
}

module.exports = {
  WORLD_LIMIT, SAFE_RADIUS, MOVE_SPEED, SPRINT_SPEED, updateStamina, OBSTACLES, distance, inSafeZone, pointBlocked,
  segmentBlocked, movePlayer, makeSpawns, updateSpawns, publicSpawn, GUIDE
};
