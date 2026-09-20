(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InsectAppearance = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const options = {
    body: [['boy','남자'],['girl','여자']],
    build: [['soft','포근한 체형'],['slim','슬림한 체형']],
    hairStyle: [['crop','보송 숏컷'],['bob','둥근 단발'],['wave','물결 장발'],['ponytail','높은 포니테일'],['twintail','양갈래'],['buns','동글 만두머리']],
    face: [['smile','방긋 웃음'],['bright','반짝 눈'],['sleepy','나른한 눈'],['wink','장난꾸러기']],
    top: [['hoodie','구름 후드'],['cardigan','포근 가디건'],['varsity','별빛 야구점퍼'],['sweater','리본 니트']],
    bottom: [['pants','와이드 팬츠'],['shorts','산책 반바지'],['skirt','플리츠 스커트']],
    shoes: [['sneakers','통통 운동화'],['boots','포근 부츠']],
    headwear: [['none','장식 없음'],['ribbon','큰 리본'],['cat','고양이 머리띠'],['beret','딸기 베레모']],
    accessory: [['none','소품 없음'],['glasses','동그란 안경'],['bag','곰돌이 가방'],['satchel','미니 크로스백']]
  };
  const colors = {
    skin: [['#f6d7bc','우유빛'],['#ebbd97','복숭아빛'],['#d49b76','햇살빛'],['#ae7757','구릿빛'],['#78513e','초콜릿빛']],
    hairColor: [['#302935','밤하늘'],['#745045','코코아'],['#b47b52','카라멜'],['#e6c58e','밀크티'],['#e4a9bb','벚꽃'],['#a8a1d2','라벤더'],['#cee2e7','은빛']],
    eyeColor: [['#342b45','까만 포도'],['#8c6544','헤이즐'],['#5a91ac','하늘'],['#699d83','초록']],
    topColor: [['#b4caed','소다'],['#edb5cc','딸기우유'],['#c6bddf','라일락'],['#b4d6c1','민트'],['#f3dfab','바닐라'],['#52617b','네이비'],['#f3ebe1','크림']],
    bottomColor: [['#7889ad','데님'],['#d8cadf','연보라'],['#f0e3d3','아이보리'],['#4d5065','차콜'],['#c5a18b','모카']],
    accent: [['#f5e2a7','버터'],['#d884a8','로즈'],['#a698d4','보라'],['#87bbaa','민트'],['#f2eee7','하양']]
  };
  const defaults = { body:'boy',build:'soft',height:1,skin:'#f6d7bc',hairStyle:'crop',hairColor:'#745045',face:'smile',eyeColor:'#342b45',top:'hoodie',topColor:'#b4caed',bottom:'pants',bottomColor:'#7889ad',shoes:'sneakers',headwear:'none',accessory:'bag',accent:'#f5e2a7' };
  const presets = [
    {name:'소다 산책',values:{}},
    {name:'딸기 리본',values:{body:'girl',hairStyle:'twintail',hairColor:'#745045',top:'cardigan',topColor:'#edb5cc',bottom:'skirt',bottomColor:'#f0e3d3',headwear:'ribbon',accent:'#d884a8'}},
    {name:'라일락 꿈',values:{body:'girl',hairStyle:'wave',hairColor:'#cee2e7',face:'sleepy',top:'sweater',topColor:'#c6bddf',bottom:'skirt',bottomColor:'#d8cadf',headwear:'cat',accessory:'none',accent:'#a698d4'}},
    {name:'민트 캠퍼스',values:{hairStyle:'crop',hairColor:'#302935',top:'varsity',topColor:'#b4d6c1',bottom:'shorts',accessory:'satchel',accent:'#87bbaa'}},
    {name:'바닐라 곰',values:{hairStyle:'buns',hairColor:'#b47b52',topColor:'#f3dfab',bottomColor:'#c5a18b',headwear:'beret',accessory:'bag'}},
    {name:'밤하늘 별',values:{hairStyle:'bob',hairColor:'#302935',top:'varsity',topColor:'#52617b',bottomColor:'#4d5065',accessory:'glasses',face:'bright',accent:'#f2eee7'}}
  ];
  function normalize(value, characterId) {
    const legacy = {scout:{topColor:'#b4d6c1'},botanist:{topColor:'#c6bddf',hairStyle:'bob'},beekeeper:{topColor:'#f3dfab'},miner:{topColor:'#52617b'},river:{topColor:'#b4d6c1',accessory:'satchel'}};
    const fallback = {...defaults,...legacy[characterId]}, source = value && typeof value === 'object' ? value : {}, result = {};
    for (const [key, list] of Object.entries({...options,...colors})) result[key] = list.some(item => item[0] === source[key]) ? source[key] : fallback[key];
    result.height = typeof source.height === 'number' && Number.isFinite(source.height) ? Math.round(Math.min(1.1,Math.max(.9,source.height))*100)/100 : 1;
    return result;
  }
  function valid(value) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.entries(normalize(value)).every(([key,v]) => value[key] === v) && Object.keys(value).every(key => key in defaults);
  }
  return Object.freeze({options,colors,defaults,presets,normalize,valid,key:value=>JSON.stringify(normalize(value))});
});
