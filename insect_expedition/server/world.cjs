'use strict';

const crypto = require('node:crypto');

const WORLD_LIMIT = 120;
const SAFE_RADIUS = 22;
const PLAYER_RADIUS = 1.15;
const MOVE_SPEED = 9;
const OBSTACLES = Object.freeze([
  { id: 'lab', type: 'box', x: 0, z: -6, width: 18, depth: 10 },
  { id: 'forest-log', type: 'box', x: -68, z: -62, width: 18, depth: 4 },
  { id: 'rock-arch-a', type: 'circle', x: 73, z: -70, radius: 6 },
  { id: 'rock-arch-b', type: 'circle', x: 91, z: -83, radius: 5 },
  { id: 'farm-barn', type: 'box', x: -82, z: 80, width: 18, depth: 14 },
  { id: 'cave-mound', type: 'circle', x: 1, z: 85, radius: 14 },
  { id: 'facility-main', type: 'box', x: 73, z: 75, width: 25, depth: 17 },
  { id: 'facility-tank', type: 'circle', x: 93, z: 91, radius: 6 }
]);

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

function movePlayer(player, intent, now = Date.now()) {
  const ix = clamp(Number(intent.x) || 0, -1, 1);
  const iz = clamp(Number(intent.z) || 0, -1, 1);
  const magnitude = Math.hypot(ix, iz);
  const elapsed = clamp((now - (player.lastMoveAt || now - 50)) / 1000, 0.016, 0.25);
  player.lastMoveAt = now;
  if (!magnitude) return false;
  const factor = MOVE_SPEED * elapsed / Math.max(1, magnitude);
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
  const habitat = catalog.map((creature, index) => {
    const biome = regions.find((item) => (item.habitats || [item.habitat]).includes(creature.habitat)) || regions.find((item) => item.id === 'safe') || { center: { x: 0, z: 0 } };
    const used = counts.get(biome.id) || 0;
    counts.set(biome.id, used + 1);
    let point = null;
    for (let attempt = 0; attempt < HABITAT_OFFSETS.length; attempt += 1) {
      const offset = HABITAT_OFFSETS[(used + attempt) % HABITAT_OFFSETS.length];
      const candidate = { x: clamp(biome.center.x + offset[0], -110, 110), z: clamp(biome.center.z + offset[1], -110, 110) };
      if (!pointBlocked(candidate, 2)) { point = candidate; break; }
    }
    point ||= { x: clamp(biome.center.x, -110, 110), z: clamp(biome.center.z, -110, 110) };
    const field = ['rare', 'evolved', 'elite', 'monster'].includes(creature.rarity);
    const level = field ? 5 + ['rare', 'evolved', 'elite', 'monster'].indexOf(creature.rarity) * 2 + index % 3 : 1 + index % 4;
    return makeSpawn(`habitat-${creature.id}`, creature.id, point.x, point.z, field, level);
  });
  return [...tutorial, ...habitat];
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
  return { id: spawn.id, speciesId: spawn.speciesId, x: spawn.x, z: spawn.z, available: spawn.available, reservedBy: spawn.reservedBy, field: spawn.field, level: spawn.level };
}

module.exports = {
  WORLD_LIMIT, SAFE_RADIUS, MOVE_SPEED, OBSTACLES, distance, inSafeZone, pointBlocked,
  segmentBlocked, movePlayer, makeSpawns, updateSpawns, publicSpawn, GUIDE
};
