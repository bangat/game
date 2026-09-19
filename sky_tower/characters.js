(function () {
  'use strict';

  const STORAGE_KEY = 'skyTower.character.v1';
  const ASSET_ROOT = '../seoa_tower_assets/characters/';
  let memorySelection = 'original';
  function readStorage(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function writeStorage(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  const legacyMap = { default_bomber: '../아바타폴더/기본캐정면.png', penguin_parka: '../아바타폴더/펭귄정면.png', puppy_set: '../아바타폴더/강아지정면.png' };
  function resolveLegacyAvatar(value) {
    value = value || readStorage('userAvatar') || 'default_bomber';
    if (legacyMap[value]) return legacyMap[value];
    if (/^(\.\.\/아바타폴더\/|\.\/아바타폴더\/|\/아바타폴더\/)[^?#]+\.(png|webp|gif|jpe?g)$/i.test(value)) return value.replace(/^\.\//, '../');
    return legacyMap.default_bomber;
  }
  const LEGACY_AVATAR = resolveLegacyAvatar();
  const definitions = [
    { id: 'original', name: '나의 원래 캐릭터', tagline: '늘 함께하던 모습 그대로', accent: '#7dd3fc', legacy: true },
    { id: 'beige', name: '구름콩', tagline: '폭신한 균형 감각', accent: '#f5d8ad', accessory: 'cloud-cap' },
    { id: 'green', name: '새싹별', tagline: '한 칸 더 높이 폴짝', accent: '#86efac', accessory: 'sprout' },
    { id: 'pink', name: '노을링', tagline: '따뜻한 빛을 남기는 탐험가', accent: '#f9a8d4', accessory: 'wings' },
    { id: 'purple', name: '밤하늘', tagline: '침착하게 길을 찾는 별지기', accent: '#c4b5fd', accessory: 'wizard-hat' },
    { id: 'yellow', name: '햇살콩', tagline: '넘어져도 씩씩한 도전자', accent: '#fde047', accessory: 'sun-crown' }
  ];

  function paths(id) {
    if (id === 'original') return { idle: LEGACY_AVATAR, jump: LEGACY_AVATAR, walkA: LEGACY_AVATAR, walkB: LEGACY_AVATAR };
    const base = ASSET_ROOT + 'character_' + id + '_';
    return { idle: base + 'idle.svg', jump: base + 'jump.svg', walkA: base + 'walk_a.svg', walkB: base + 'walk_b.svg' };
  }
  const characters = definitions.map((item) => Object.freeze(Object.assign({}, item, { free: true, frames: paths(item.id), preview: paths(item.id).idle })));
  function getById(id) { return characters.find((item) => item.id === id) || characters[0]; }
  function getSelected() { return getById(readStorage(STORAGE_KEY) || memorySelection); }
  function select(id) {
    const picked = getById(id);
    memorySelection = picked.id;
    writeStorage(STORAGE_KEY, picked.id);
    window.dispatchEvent(new CustomEvent('skytower:character', { detail: picked }));
    return picked;
  }
  async function preload(character) {
    const picked = typeof character === 'string' ? getById(character) : (character || getSelected());
    await Promise.all(Object.values(picked.frames).map((src) => new Promise((resolve) => {
      const image = new Image(); image.onload = image.onerror = resolve; image.src = src;
    })));
    return picked;
  }
  function createMaterial(scene, character, name) {
    if (!window.BABYLON || !scene) return null;
    const picked = typeof character === 'string' ? getById(character) : (character || getSelected());
    const mat = new BABYLON.StandardMaterial(name || ('character-' + picked.id), scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(picked.accent);
    mat.emissiveColor = BABYLON.Color3.FromHexString(picked.accent).scale(0.18);
    mat.specularColor = new BABYLON.Color3(0.12, 0.12, 0.18);
    return mat;
  }
  window.SkyTowerCharacters = Object.freeze({ list: characters, getById, getSelected, select, preload, createMaterial, resolveLegacyAvatar, storageKey: STORAGE_KEY });
})();
