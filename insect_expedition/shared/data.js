(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  if (root) root.InsectData = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const rarity = {
    common: { label: '하급', color: '#9fc99b', capture: 0.86, reward: 2 },
    uncommon: { label: '중급', color: '#69c5a3', capture: 0.68, reward: 3 },
    rare: { label: '레어', color: '#70a8ff', capture: 0.38, reward: 5 },
    evolved: { label: '고급', color: '#b28cff', capture: 0.52, reward: 4 },
    elite: { label: '에픽', color: '#ffad55', capture: 0.24, reward: 7 },
    monster: { label: '전설', color: '#ff647e', capture: 0.14, reward: 10 }
  };

  const attack = (id, name, power, accuracy, kind) => ({ id, name, power, accuracy, kind: kind || 'physical' });
  const skill = (id, name, power, accuracy, cooldown, effect, description) => ({ id, name, power, accuracy, cooldown, effect, description });
  const row = (id, name, category, stage, habitat, preferredConditions, rank, stats, normalAttack, uniqueSkill, captureDifficulty, scale, animationSet, evolvesTo) => ({
    id, name, category, stage, habitat, rarity: rank,
    spawnConditions: { mode: 'habitat', time: '모두', weather: '모두', near: preferredConditions.near },
    baseStats: { maxHealth: stats[0], attack: stats[1], defense: stats[2], speed: stats[3] },
    normalAttack, skill: uniqueSkill, captureDifficulty, scale, animationSet, evolvesTo: evolvesTo || null
  });

  const species = [
    row('dew_ladybird', '이슬점무당벌레', '무당벌레', '성충', '초원', { time: '낮', weather: '맑음', near: '야생화' }, 'common', [34, 12, 11, 15], attack('wing_bump', '날개 콩', 16, 0.96), null, 12, 0.7, 'small_crawl'),
    row('reed_cricket', '갈대귀뚜라미', '귀뚜라미', '성충', '습지', { time: '밤', weather: '모두', near: '갈대' }, 'common', [38, 14, 10, 14], attack('reed_kick', '갈대 차기', 17, 0.94), null, 14, 0.82, 'hopper'),
    row('clover_grasshopper', '토끼풀메뚜기', '메뚜기', '성충', '초원', { time: '낮', weather: '모두', near: '토끼풀' }, 'common', [40, 15, 10, 17], attack('spring_kick', '통통 발차기', 18, 0.92), null, 15, 0.9, 'hopper'),
    row('bark_ant', '나무결개미', '개미', '성충', '숲', { time: '모두', weather: '모두', near: '고목' }, 'common', [36, 13, 14, 12], attack('jaw_nip', '턱 집기', 15, 0.98), null, 10, 0.55, 'small_crawl'),
    row('pond_skater', '물빛소금쟁이', '소금쟁이', '성충', '습지', { time: '낮', weather: '맑음', near: '수면' }, 'common', [35, 12, 9, 21], attack('ripple_tap', '물결 톡', 14, 0.97), null, 13, 0.75, 'water_glide'),
    row('moss_caterpillar', '이끼털애벌레', '나방', '유충', '숲', { time: '모두', weather: '습함', near: '이끼' }, 'common', [42, 11, 15, 8], attack('soft_roll', '몸말이', 15, 0.96), null, 11, 0.82, 'larva', 'moon_moth'),
    row('amber_grub', '호박빛굼벵이', '풍뎅이', '유충', '농장', { time: '모두', weather: '모두', near: '퇴비' }, 'common', [45, 12, 16, 7], attack('soil_shove', '흙 밀기', 16, 0.95), null, 12, 0.9, 'larva', 'sun_scarab'),
    row('stream_nymph', '개울잠자리수채', '잠자리', '유충', '강가', { time: '모두', weather: '모두', near: '얕은 물' }, 'uncommon', [43, 15, 13, 13], attack('water_lunge', '물속 돌진', 18, 0.93), null, 22, 0.85, 'aquatic', 'azure_dragonfly'),
    row('granary_weevil', '곡식바구미', '바구미', '성충', '농장', { time: '저녁', weather: '모두', near: '곡식자루' }, 'common', [33, 13, 12, 11], attack('snout_poke', '주둥 찌르기', 16, 0.97), null, 13, 0.62, 'small_crawl'),
    row('stone_ground_beetle', '돌틈먼지벌레', '딱정벌레', '성충', '바위터', { time: '밤', weather: '모두', near: '바위' }, 'uncommon', [49, 17, 18, 12], attack('shell_ram', '딱지 돌진', 20, 0.93), null, 25, 1.0, 'beetle'),
    row('orchard_longhorn', '과수원하늘소', '하늘소', '성충', '농장', { time: '낮', weather: '맑음', near: '과수원' }, 'uncommon', [46, 18, 15, 13], attack('antenna_sweep', '더듬이 휩쓸기', 20, 0.94), null, 27, 1.1, 'beetle'),
    row('honey_mason_bee', '꽃담벌', '벌', '성충', '초원', { time: '낮', weather: '맑음', near: '야생화' }, 'uncommon', [39, 17, 11, 22], attack('pollen_dash', '꽃가루 돌진', 18, 0.93), null, 26, 0.72, 'flyer'),
    row('azure_dragonfly', '푸른시내잠자리', '잠자리', '성충', '강가', { time: '낮', weather: '맑음', near: '폭포' }, 'evolved', [58, 24, 14, 30], attack('wing_cut', '물빛 날개베기', 24, 0.94), skill('sky_current', '하늘물살', 36, 0.9, 2, { status: 'swift', turns: 2 }, '바람을 타고 빨라지는 연속 돌진'), 48, 1.15, 'dragonfly'),
    row('moon_moth', '달무늬큰나방', '나방', '성충', '숲', { time: '밤', weather: '맑음', near: '달꽃' }, 'evolved', [62, 22, 18, 20], attack('dust_flap', '비늘가루 날갯짓', 22, 0.95), skill('moon_drowse', '달빛잠결', 28, 0.92, 3, { status: 'drowsy', turns: 1 }, '달빛 가루로 상대의 다음 공격을 늦춘다'), 50, 1.25, 'moth'),
    row('sun_scarab', '햇살방패풍뎅이', '풍뎅이', '성충', '농장', { time: '낮', weather: '맑음', near: '해바라기' }, 'evolved', [72, 23, 26, 12], attack('sun_shell', '햇살 등딱지', 23, 0.96), skill('golden_guard', '황금껍질', 20, 1, 3, { status: 'guard', turns: 2 }, '껍질을 빛내 받는 피해를 줄인다'), 52, 1.35, 'scarab'),
    row('violet_mantis', '보랏빛사마귀', '사마귀', '성충', '폐시설', { time: '저녁', weather: '모두', near: '금속 잔해' }, 'rare', [55, 28, 14, 25], attack('sickle_jab', '낫팔 찌르기', 25, 0.92), skill('violet_cross', '보랏빛 교차베기', 39, 0.86, 2, { status: 'exposed', turns: 2 }, '교차 공격으로 방어 틈을 만든다'), 57, 1.3, 'mantis'),
    row('mist_butterfly', '안개유리나비', '나비', '성충', '습지', { time: '아침', weather: '안개', near: '흰꽃' }, 'rare', [50, 22, 13, 29], attack('glass_wing', '유리날개 스침', 21, 0.97), skill('mist_mirror', '안개거울', 30, 0.95, 3, { status: 'blur', turns: 2 }, '잔상을 만들어 상대의 명중을 낮춘다'), 60, 1.05, 'butterfly'),
    row('cave_stag', '동굴사슴벌레', '사슴벌레', '성충', '동굴', { time: '모두', weather: '모두', near: '수정광맥' }, 'elite', [88, 31, 28, 14], attack('antler_toss', '큰턱 뒤집기', 28, 0.91), skill('crystal_clamp', '수정턱 봉쇄', 46, 0.84, 3, { status: 'stunned', turns: 1 }, '수정처럼 단단한 턱으로 행동을 봉쇄한다'), 72, 1.7, 'stag', 'king_stag'),
    row('king_stag', '왕사슴벌레', '사슴벌레', '성충', '동굴', { time: '모두', weather: '모두', near: '수정광맥' }, 'monster', [118, 42, 34, 18], attack('royal_clamp', '왕턱 내려찍기', 35, 0.92), skill('kingdom_crush', '왕의 협공', 58, 0.86, 3, { status: 'exposed', turns: 2 }, '거대한 턱으로 적의 빈틈을 완전히 드러낸다'), 82, 2.08, 'stag'),
    row('storm_cicada', '폭우울림매미', '매미', '성충', '숲', { time: '낮', weather: '비', near: '큰 나무' }, 'elite', [82, 29, 21, 23], attack('sound_burst', '울림 파동', 27, 0.93, 'sonic'), skill('storm_chorus', '폭우합창', 43, 0.88, 3, { status: 'weakened', turns: 2 }, '굵은 울음으로 공격력을 떨어뜨린다'), 74, 1.65, 'cicada'),
    row('ancient_rhino', '고목왕장수풍뎅이', '장수풍뎅이', '성충', '고목숲', { time: '밤', weather: '모두', near: '천년고목' }, 'monster', [132, 38, 34, 16], attack('horn_drive', '왕뿔 밀어붙이기', 31, 0.91), skill('forest_upheaval', '고목숲 뒤엎기', 54, 0.83, 3, { status: 'exposed', turns: 2 }, '뿔로 땅을 들어 올려 큰 충격을 준다'), 88, 2.35, 'rhino_boss')
  ];

  const speciesById = Object.fromEntries(species.map(item => [item.id, item]));
  const biomes = [
    { id:'forest', name:'솔방울 숲', habitat:'숲', habitats:['숲','고목숲'], center:{x:-72,z:-72}, radius:36, safe:false, color:'#315f45' },
    { id:'grassland', name:'바람 초원', habitat:'초원', center:{x:0,z:-72}, radius:36, safe:false, color:'#78a95a' },
    { id:'rock', name:'볕바위 지대', habitat:'바위터', center:{x:72,z:-72}, radius:36, safe:false, color:'#8b806d' },
    { id:'wetland', name:'물안개 습지', habitat:'습지', center:{x:-72,z:0}, radius:36, safe:false, color:'#4d7d69' },
    { id:'safe', name:'이슬숲 연구소', habitat:'초원', center:{x:0,z:0}, radius:22, safe:true, color:'#82b96b' },
    { id:'river', name:'은물결 강', habitat:'강가', center:{x:72,z:0}, radius:36, safe:false, color:'#4b8a88' },
    { id:'farm', name:'해바라기 농장', habitat:'농장', center:{x:-72,z:72}, radius:36, safe:false, color:'#8e9a55' },
    { id:'cave', name:'울림 동굴', habitat:'동굴', center:{x:0,z:72}, radius:36, safe:false, color:'#4b4b55' },
    { id:'facility', name:'버려진 온실', habitat:'폐시설', center:{x:72,z:72}, radius:36, safe:false, color:'#59666a' }
  ];
  // 현재 지역은 고정된 탐험 시간대입니다. 낮밤·날씨 조건을 구현된 기능으로 표시하지 않습니다.
  species.forEach(item => { item.spawnConditions.time = '모두'; item.spawnConditions.weather = '모두'; });
  const obstacles = [
    { id: 'lab', type: 'box', x: 0, z: -6, width: 18, depth: 10 },
    { id: 'forest-log', type: 'box', x: -68, z: -62, width: 18, depth: 4 },
    { id: 'rock-arch-a', type: 'circle', x: 73, z: -70, radius: 6 },
    { id: 'rock-arch-b', type: 'circle', x: 91, z: -83, radius: 5 },
    { id: 'farm-barn', type: 'box', x: -82, z: 80, width: 18, depth: 14 },
    { id: 'cave-mound', type: 'circle', x: 1, z: 85, radius: 14 },
    { id: 'facility-main', type: 'box', x: 73, z: 75, width: 25, depth: 17 },
    { id: 'facility-tank', type: 'circle', x: 93, z: 91, radius: 6 }
  ];
  const characters = [
    { id: 'original', name: '나의 탐험가', role: '익숙한 모습', body: '#5ed6f3', accent: '#fff0a6', skin: '#f2c9a5', hair: '#3c2b32', shape: 'round', accessory: 'badge', free: true },
    { id: 'scout', name: '솔잎 정찰가', role: '숲길 안내', body: '#4fb477', accent: '#d9f99d', skin: '#dca982', hair: '#27352c', shape: 'light', accessory: 'scarf', free: true },
    { id: 'botanist', name: '새봄 연구가', role: '식생 관찰', body: '#9b7bd5', accent: '#f5d0fe', skin: '#f1c7a8', hair: '#5b3547', shape: 'round', accessory: 'sprout', free: true },
    { id: 'beekeeper', name: '꿀빛 돌봄이', role: '벌과 꽃의 친구', body: '#f0b83f', accent: '#fff4a8', skin: '#b97855', hair: '#28241f', shape: 'sturdy', accessory: 'hood', free: true },
    { id: 'miner', name: '조약돌 탐사대', role: '동굴 조사', body: '#6582b8', accent: '#bde6ff', skin: '#e5b58e', hair: '#46352e', shape: 'sturdy', accessory: 'lamp', free: true },
    { id: 'river', name: '물결 기록가', role: '습지와 강 관찰', body: '#3ea6a0', accent: '#a7f3d0', skin: '#c98962', hair: '#233747', shape: 'light', accessory: 'satchel', free: true }
  ];
  const rarityOrder = ['common', 'uncommon', 'evolved', 'rare', 'elite', 'monster'];
  const quests = [
    {id:'dew-sample',name:'첫 채집 기록',type:'capture',target:3,feeds:3,description:'전투에서 승리해 곤충 3마리 채집'},
    {id:'battle-practice',name:'자신감 쑥쑥',type:'victory',target:3,feeds:4,description:'야생 곤충과 전투에서 3회 승리'},
    {id:'feed-friends',name:'든든한 탐험대',type:'feed',target:2,feeds:5,description:'보유 곤충에게 사료 2회 주기'},
    {id:'forest-collection',name:'숲 친구 모으기',type:'capture',target:4,feeds:6,description:'전투에서 승리해 곤충 4마리 채집'},
    {id:'battle-veteran',name:'숙련 탐험가',type:'victory',target:5,feeds:7,description:'야생 곤충과 전투에서 5회 승리'}
  ];
  const resources = {
    berries: {name:'숲 열매',icon:'🫐',sell:5}, ore: {name:'빛나는 광석',icon:'💎',sell:9}
  };
  const resourceNodes = [
    {id:'berries-camp',kind:'berries',name:'산딸기 덤불',x:-5,z:26},
    {id:'ore-camp',kind:'ore',name:'반짝 광맥',x:18,z:23},
    {id:'berries-forest',kind:'berries',name:'숲 열매 덤불',x:-60,z:-50},
    {id:'berries-grass',kind:'berries',name:'들딸기 덤불',x:10,z:-50},
    {id:'ore-rock',kind:'ore',name:'볕바위 광맥',x:55,z:-50},
    {id:'ore-cave',kind:'ore',name:'동굴 입구 광맥',x:18,z:55},
    {id:'berries-farm',kind:'berries',name:'농장 열매',x:-55,z:58}
  ];
  const shop = [
    {id:'feed',name:'곤충 사료',price:15,feeds:1,description:'경험치 +84 · 보유 곤충에게 사용'},
    {id:'feed-pack',name:'사료 묶음',price:60,feeds:5,description:'곤충 사료 5개 · 낱개보다 저렴해요'},
    {id:'stone-egg',name:'돌틈 알',price:120,speciesId:'stone_ground_beetle',level:2,description:'Lv.2 돌틈먼지벌레가 바로 부화해요'},
    {id:'moon-cocoon',name:'달빛 고치',price:320,speciesId:'moon_moth',level:3,description:'Lv.3 달무늬큰나방이 바로 깨어나요'},
    {id:'stag-egg',name:'동굴의 알',price:650,speciesId:'cave_stag',level:3,description:'Lv.3 동굴사슴벌레가 바로 부화해요'}
  ];
  const collectionMilestones = [{ count: 5, feeds: 5 }, { count: 10, feeds: 10 }, { count: 15, feeds: 15 }, { count: 21, feeds: 25 }];

  return Object.freeze({ title: '이슬숲 탐험대', world: { minX: -120, maxX: 120, minZ: -120, maxZ: 120, spawn: { x: 0, y: 1, z: 0 }, arena: { x: 0, y: 1, z: 0 } }, rarity, rarityOrder, quests, resources, resourceNodes, shop, collectionMilestones, species, speciesById, biomes, obstacles, characters });
});
