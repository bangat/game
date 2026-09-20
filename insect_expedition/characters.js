(function (global) {
  'use strict';

  var STORAGE_KEY = 'insectExpedition.character.v1';
  var characters = [
    { id: 'original', name: '나의 탐험가', role: '익숙한 모습', body: '#5ed6f3', accent: '#fff0a6', skin: '#f2c9a5', hair: '#3c2b32', shape: 'round', accessory: 'badge' },
    { id: 'scout', name: '솔잎 정찰가', role: '숲길 안내', body: '#4fb477', accent: '#d9f99d', skin: '#dca982', hair: '#27352c', shape: 'light', accessory: 'scarf' },
    { id: 'botanist', name: '새봄 연구가', role: '식생 관찰', body: '#9b7bd5', accent: '#f5d0fe', skin: '#f1c7a8', hair: '#5b3547', shape: 'round', accessory: 'sprout' },
    { id: 'beekeeper', name: '꿀빛 돌봄이', role: '벌과 꽃의 친구', body: '#f0b83f', accent: '#fff4a8', skin: '#b97855', hair: '#28241f', shape: 'sturdy', accessory: 'hood' },
    { id: 'miner', name: '조약돌 탐사대', role: '동굴 조사', body: '#6582b8', accent: '#bde6ff', skin: '#e5b58e', hair: '#46352e', shape: 'sturdy', accessory: 'lamp' },
    { id: 'river', name: '물결 기록가', role: '습지와 강 관찰', body: '#3ea6a0', accent: '#a7f3d0', skin: '#c98962', hair: '#233747', shape: 'light', accessory: 'satchel' }
  ];

  characters.forEach(function (item) { item.free = true; Object.freeze(item); });

  function getById(id) {
    for (var i = 0; i < characters.length; i += 1) if (characters[i].id === id) return characters[i];
    return characters[0];
  }

  function getSelected() {
    var id = 'original';
    try { id = global.localStorage.getItem(STORAGE_KEY) || id; } catch (_) {}
    return getById(id);
  }

  function select(id) {
    var selected = getById(id);
    try { global.localStorage.setItem(STORAGE_KEY, selected.id); } catch (_) {}
    if (typeof global.CustomEvent === 'function' && global.dispatchEvent) {
      global.dispatchEvent(new global.CustomEvent('insect-expedition:character', { detail: selected }));
    }
    return selected;
  }

  global.InsectCharacters = Object.freeze({
    list: Object.freeze(characters.slice()),
    getById: getById,
    getSelected: getSelected,
    select: select,
    storageKey: STORAGE_KEY
  });
})(window);
