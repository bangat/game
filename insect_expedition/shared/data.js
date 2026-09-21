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
    row('ancient_rhino', '고목왕장수풍뎅이', '장수풍뎅이', '성충', '고목숲', { time: '밤', weather: '모두', near: '천년고목' }, 'monster', [132, 38, 34, 16], attack('horn_drive', '왕뿔 밀어붙이기', 31, 0.91), skill('forest_upheaval', '고목숲 뒤엎기', 54, 0.83, 3, { status: 'exposed', turns: 2 }, '뿔로 땅을 들어 올려 큰 충격을 준다'), 88, 2.35, 'rhino_boss'),
    row('fern_raptor','새싹랩터','공룡','유체','초원',{near:'고사리 군락'},'uncommon',[65,22,15,24],attack('raptor_pounce','날쌘 발톱',22,.96),null,28,1.1,'dino_raptor','ember_raptor'),
    row('marsh_spitter','늪독딜로','공룡','성체','습지',{near:'늪 웅덩이'},'rare',[85,31,22,25],attack('venom_glob','독액 발사',25,.95,'ranged'),skill('venom_comet','맹독 혜성',43,.91,3,{status:'weakened',turns:2},'멀리서 커다란 독액을 발사한다'),61,1.3,'dino_spitter'),
    row('granite_triceratops','화강트리케라','공룡','성체','바위터',{near:'거석'},'elite',[120,38,40,16],attack('triple_horn','세뿔 돌진',29,.94),skill('granite_charge','거석 파쇄',48,.91,3,{status:'guard',turns:2},'뿔을 낮춰 돌진한 뒤 단단한 방어 자세를 취한다'),72,1.65,'dino_trike'),
    row('crystal_ankylosaur','수정안킬로','공룡','성체','동굴',{near:'푸른 수정'},'elite',[140,42,48,12],attack('crystal_tail','수정 꼬리치기',32,.95),skill('crystal_quake','수정 대지진',52,.92,3,{status:'exposed',turns:2},'꼬리로 땅을 내리쳐 수정 충격파를 퍼뜨린다'),77,1.8,'dino_anky'),
    row('ember_raptor','화염랩터','공룡','성체','폐시설',{near:'붉은 균열'},'elite',[110,49,29,34],attack('ember_claw','화염 발톱',32,.96),skill('ember_blast','화염탄 폭격',55,.9,3,{status:'exposed',turns:2},'몸을 낮춘 뒤 거대한 화염탄을 발사한다'),78,1.5,'dino_raptor','ancient_rex'),
    row('ancient_rex','고대폭군렉스','공룡','고대종','동굴',{near:'고대 화석'},'monster',[195,65,48,26],attack('tyrant_bite','폭군의 이빨',39,.93),skill('tyrant_roar','폭군의 포효',68,.9,3,{status:'weakened',turns:2},'거대한 포효의 파동으로 사냥터를 뒤흔든다'),90,2.25,'dino_rex')

  ];

  // 동굴 전용종은 일반 출현과 조합 결과에서 제외한다.
  [['prism_stag','프리즘사슴벌레','cave_stag','elite'],['lunar_moth','월광수호나방','moon_moth','elite'],['aurora_rex','오로라렉스','ancient_rex','monster']].forEach(([id,name,base,rank])=>{
    const source=species.find(s=>s.id===base);
    species.push({...source,id,name,rarity:rank,habitat:'알 동굴',eggOnly:true,modelId:base,evolvesTo:null,baseStats:Object.fromEntries(Object.entries(source.baseStats).map(([k,v])=>[k,Math.round(v*1.18)]))});
  });
  const awakeningNames={dew_ladybird:'별무늬무당벌레',reed_cricket:'청명귀뚜라미',clover_grasshopper:'비취메뚜기',bark_ant:'호위나무개미',pond_skater:'은빛소금쟁이',granary_weevil:'황금바구미',stone_ground_beetle:'강철먼지벌레',orchard_longhorn:'청옥하늘소',honey_mason_bee:'여왕꽃담벌'};
  for(const [id,name] of Object.entries(awakeningNames)){
    const source=species.find(s=>s.id===id),nextId=id+'_awakened';source.evolvesTo=nextId;source.evolutionLevel=source.rarity==='common'?8:12;
    species.push({...source,id:nextId,name,stage:'각성체',rarity:'evolved',modelId:id,evolutionOnly:true,evolvesTo:null,evolutionLevel:null,scale:source.scale*1.18,
      baseStats:Object.fromEntries(Object.entries(source.baseStats).map(([k,v])=>[k,Math.round(v*1.45)])),
      normalAttack:{...source.normalAttack,power:source.normalAttack.power+8},
      skill:skill('awakening_burst','생명의 섬광',35,.95,2,{status:'swift',turns:2},'빛 입자를 터뜨리고 빨라지는 각성 기술')});
  }
  const rangedNormals = new Set(['honey_mason_bee','moon_moth','mist_butterfly','storm_cicada','marsh_spitter']);
  const rangedSkills = new Set(['sky_current','moon_drowse','mist_mirror','storm_chorus','venom_comet','ember_blast','tyrant_roar','crystal_quake']);
  species.forEach(s=>{if(rangedNormals.has(s.id))s.normalAttack.kind='ranged';if(s.skill)s.skill.kind=rangedSkills.has(s.skill.id)?'ranged':'physical';});
  const speciesById = Object.fromEntries(species.map(item => [item.id, item]));
  // 적 전용 데이터는 수집 도감·부화·야생 곤충 목록에 포함하지 않습니다.
  speciesById.forest_zombie={...row('forest_zombie','숲길 좀비','좀비','배회자','전 지역',{near:'숲길'},'uncommon',[95,18,8,9],attack('zombie_swing','비틀거리는 강타',23,.91),null,100,1,'zombie'),enemyOnly:true};
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
  const huntingLevels = {safe:[1,2],grassland:[3,7],farm:[6,11],wetland:[9,14],river:[12,17],rock:[15,20],forest:[17,23],facility:[22,28],cave:[26,32]};
  biomes.forEach(b=>{b.center.x*=2;b.center.z*=2;if(!b.safe)b.radius=72;b.levels=huntingLevels[b.id];});
  biomes.push(
    {id:'mine',name:'별빛 광산',habitat:'광산',center:{x:0,z:-224},radius:25,safe:false,color:'#536c82',levels:[24,32],special:true,description:'부화에 쓰는 온기 수정 채광'},
    {id:'nest',name:'달빛 알 동굴',habitat:'알 동굴',center:{x:224,z:0},radius:25,safe:false,color:'#8e78a7',levels:[30,38],special:true,description:'전용종 알 발굴 · 수정 3개로 부화 시작'},
    {id:'sanctum',name:'고대 수호자의 터',habitat:'성역',center:{x:0,z:224},radius:25,safe:false,color:'#be9360',levels:[42,50],special:true,description:'보스 연구 4종 + 부화 2회로 수호자 도전'}
  );
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
  obstacles.forEach(o=>{if(o.id!=='lab'){o.x*=2;o.z*=2;}});
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
    berries: {name:'숲 열매',icon:'🫐',sell:5}, ore: {name:'빛나는 광석',icon:'💎',sell:9}, crystal: {name:'온기 수정',icon:'🔮',sell:0}, egg: {name:'동굴의 알',icon:'🥚',sell:0}
  };
  Object.assign(resources,{
    sap:{name:'황금 수액',icon:'🍯',sell:7},mushroom:{name:'이슬 버섯',icon:'🍄',sell:6},pollen:{name:'달꽃 가루',icon:'🌼',sell:6},
    shard:{name:'시련 문장',icon:'🔱',sell:0},essence:{name:'수호 정수',icon:'✦',sell:0},bait:{name:'수액 유인 먹이',icon:'🍯',sell:0},tonic:{name:'버섯 회복제',icon:'🧪',sell:0},nectar:{name:'성장 농축액',icon:'💧',sell:0}
  });
  const resourceNodes = [
    {id:'berries-camp',kind:'berries',name:'산딸기 덤불',x:-5,z:26},
    {id:'ore-camp',kind:'ore',name:'반짝 광맥',x:18,z:23},
    {id:'berries-forest',kind:'berries',name:'숲 열매 덤불',x:-60,z:-50},
    {id:'berries-grass',kind:'berries',name:'들딸기 덤불',x:10,z:-50},
    {id:'ore-rock',kind:'ore',name:'볕바위 광맥',x:55,z:-50},
    {id:'ore-cave',kind:'ore',name:'동굴 입구 광맥',x:18,z:55},
    {id:'berries-farm',kind:'berries',name:'농장 열매',x:-55,z:58}
  ];
  resourceNodes.forEach(n=>{if(!n.id.endsWith('-camp')){n.x*=2;n.z*=2;}});
  resourceNodes.push(...[-12,0,12].map((x,i)=>({id:'crystal-'+i,kind:'crystal',name:'온기 수정 광맥',x,z:-218+(i%2)*8})),...[-12,0,12].map((z,i)=>({id:'egg-'+i,kind:'egg',name:'달빛 알 둥지',x:218+(i%2)*8,z})));
  const eggKinds={prism:{name:'프리즘 알',speciesId:'prism_stag',steps:12},lunar:{name:'월광 알',speciesId:'lunar_moth',steps:16},aurora:{name:'오로라 알',speciesId:'aurora_rex',steps:24}};
  const researchGoals=[
    {id:'first-boss',name:'지역의 수호자',text:'서로 다른 지역 보스 1종 처치',metric:'bosses',target:1,gold:200,feeds:5},
    {id:'miner',name:'별빛 광부',text:'별빛 광산에서 온기 수정 6개 채광',metric:'crystals',target:6,gold:300,feeds:8},
    {id:'hatcher',name:'알 연구가',text:'탐험으로 동굴 전용종 2마리 부화',metric:'hatched',target:2,gold:500,feeds:12},
    {id:'explorer',name:'사방의 수호자',text:'서로 다른 지역 보스 4종 처치',metric:'bosses',target:4,gold:700,feeds:20},
    {id:'guardian',name:'고대의 계승자',text:'고대 수호자의 터 보스 처치',metric:'guardian',target:1,gold:1500,feeds:30}
  ];
  const xpForLevel=level=>36+Math.max(0,level-1)*18+Math.max(0,level-10)**2*3;
  const constructionCamps=[{id:'lumber',name:'솔향 벌목장',kind:'wood',x:-214,z:-214},{id:'quarry',name:'조약돌 채석장',kind:'stone',x:214,z:-214},{id:'sandpit',name:'은모래 채집장',kind:'sand',x:-214,z:214}];
  Object.assign(resources,{wood:{name:'건축 목재',icon:'🪵',sell:8,construction:true},stone:{name:'건축 석재',icon:'🪨',sell:10,construction:true},sand:{name:'고운 모래',icon:'⏳',sell:6,construction:true}});
  constructionCamps.forEach(c=>{biomes.push({id:c.id,name:c.name,habitat:'건축 자재',center:{x:c.x,z:c.z},radius:20,safe:false,special:true,color:c.kind==='wood'?'#53764a':c.kind==='stone'?'#93938b':'#c7b47e',levels:[1,1],description:resources[c.kind].name+' 채집'});[-8,0,8].forEach((dx,i)=>resourceNodes.push({id:c.id+'-'+i,kind:c.kind,name:resources[c.kind].name+' 채집터',x:c.x+dx,z:c.z+(i%2)*6}));});
  const mounts = {motorcycle:{name:'숲길 오토바이',icon:'🏍️',speed:22},handcart:{name:'탐험 리어카',icon:'🛒',speed:18}};
  const shop = [
    {id:'deed-small',name:'5평 땅문서',price:2000,deed:'small',description:'가방에서 사용 · 개인 부지 4×4칸 · 계정당 토지 1곳'},
    {id:'deed-large',name:'10평 땅문서',price:3000,deed:'large',description:'가방에서 사용 · 개인 부지 6×5칸 · 계정당 토지 1곳'},
    {id:'mount-motorcycle',name:'숲길 오토바이',price:2000,mountId:'motorcycle',description:'영구 보유 · 이동 속도 22 · 스태미나 소모 없음'},
    {id:'mount-handcart',name:'탐험 리어카',price:1000,mountId:'handcart',description:'영구 보유 · 이동 속도 18 · 스태미나 소모 없음'},
    {id:'feed',name:'곤충 사료',price:15,feeds:1,description:'경험치 +84 · 보유 곤충에게 사용'},
    {id:'feed-pack',name:'사료 묶음',price:60,feeds:5,description:'곤충 사료 5개 · 낱개보다 저렴해요'},
    {id:'stone-egg',name:'돌틈 알',price:120,speciesId:'stone_ground_beetle',level:2,description:'Lv.2 돌틈먼지벌레가 바로 부화해요'},
    {id:'moon-cocoon',name:'달빛 고치',price:320,speciesId:'moon_moth',level:3,description:'Lv.3 달무늬큰나방이 바로 깨어나요'},
    {id:'stag-egg',name:'동굴의 알',price:650,speciesId:'cave_stag',level:3,description:'Lv.3 동굴사슴벌레가 바로 부화해요'}
  ];
  const skillEffects = {
    awakening_burst:{color:'#f6da87',style:'wave',pitch:620},
    sky_current:{color:'#75e6ff',style:'wave',pitch:520}, moon_drowse:{color:'#d5b2ff',style:'wave',pitch:660},
    golden_guard:{color:'#ffe077',style:'guard',pitch:220}, violet_cross:{color:'#d884ff',style:'slash',pitch:880},
    mist_mirror:{color:'#a0ffe3',style:'wave',pitch:740}, crystal_clamp:{color:'#83caff',style:'slash',pitch:330},
    kingdom_crush:{color:'#ffba66',style:'slash',pitch:160}, storm_chorus:{color:'#a0b5ff',style:'wave',pitch:260},
    forest_upheaval:{color:'#a9df78',style:'wave',pitch:100},
    venom_comet:{color:'#c1fa64',style:'wave',pitch:240},granite_charge:{color:'#ffcb89',style:'guard',pitch:180},
    crystal_quake:{color:'#8feaff',style:'wave',pitch:130},ember_blast:{color:'#ff9255',style:'wave',pitch:200},tyrant_roar:{color:'#ff5474',style:'wave',pitch:85}
  };
  const startVillage = { x: 7, z: 14 };
  const fieldBosses = [
    ['forest','ancient_rhino',27,-182,-176,'천년고목의 수호자'],
    ['grassland','fern_raptor',10,36,-116,'초원의 새싹왕'],
    ['rock','granite_triceratops',24,106,-178,'거석의 세뿔 군주'],
    ['wetland','marsh_spitter',18,-182,32,'독안개의 지배자'],
    ['river','azure_dragonfly',21,180,34,'은물결의 비행왕'],
    ['farm','sun_scarab',14,-106,108,'해바라기의 파수꾼'],
    ['cave','ancient_rex',36,-38,124,'울림 동굴의 고대폭군'],
    ['facility','ember_raptor',32,104,108,'화염 온실의 추적자']
  ].map(([biomeId,speciesId,level,x,z,name])=>({id:'boss-'+biomeId,biomeId,speciesId,level,x,z,name}));
  fieldBosses.push(
    {id:'boss-mine',biomeId:'mine',speciesId:'crystal_ankylosaur',level:35,x:14,z:-232,name:'광맥을 지키는 수정갑주'},
    {id:'boss-nest',biomeId:'nest',speciesId:'king_stag',level:40,x:232,z:18,name:'달빛 둥지의 문지기'},
    {id:'boss-sanctum',biomeId:'sanctum',speciesId:'aurora_rex',level:50,x:16,z:228,name:'고대의 오로라 수호자'}
  );
  const fusionTargets = {
    fern_raptor:'marsh_spitter',marsh_spitter:'ember_raptor',granite_triceratops:'ancient_rex',crystal_ankylosaur:'ancient_rex',ember_raptor:'ancient_rex',
    dew_ladybird:'honey_mason_bee',reed_cricket:'stream_nymph',clover_grasshopper:'orchard_longhorn',
    bark_ant:'stone_ground_beetle',pond_skater:'stream_nymph',moss_caterpillar:'moon_moth',
    amber_grub:'sun_scarab',granary_weevil:'orchard_longhorn',stream_nymph:'azure_dragonfly',
    stone_ground_beetle:'sun_scarab',orchard_longhorn:'sun_scarab',honey_mason_bee:'azure_dragonfly',
    azure_dragonfly:'storm_cicada',moon_moth:'storm_cicada',sun_scarab:'cave_stag',
    mist_butterfly:'storm_cicada',violet_mantis:'cave_stag',cave_stag:'king_stag',storm_cicada:'ancient_rhino'
  };
  const fusionRecipes = Object.fromEntries(Object.entries(fusionTargets).map(([id,result])=>[id,{
    result, count:3, gold:[60,120,240,400,700][rarityOrder.indexOf(speciesById[id].rarity)]
  }]));
  const collectionMilestones = [{ count: 5, feeds: 5 }, { count: 10, feeds: 10 }, { count: 15, feeds: 15 }, { count: 21, feeds: 25 }, { count: 27, feeds: 40 }];

  return Object.freeze({ title: '이슬숲 탐험대', world: { minX: -240, maxX: 240, minZ: -240, maxZ: 240, spawn: { x: 0, y: 1, z: 0 }, arena: { x: 0, y: 1, z: 0 } }, constructionCamps, xpForLevel, eggKinds, researchGoals, skillEffects, startVillage, fieldBosses, fusionRecipes, rarity, rarityOrder, quests, resources, resourceNodes, mounts, shop, collectionMilestones, species, speciesById, biomes, obstacles, characters });
});
