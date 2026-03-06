# kid_rpg 에셋 선정안

## 방향

현재 Three.js 프리미티브 기반 초안은 폐기 대상입니다.

현재의 `도트 타일셋 중심 후보`도 방향이 다릅니다.

비주얼 방향은 아래로 다시 고정합니다.

- `잠룡 계열의 어두운 모바일 ARPG 감성`
- `레트로 도트`가 아니라 `고해상도 2D/2.5D 다크 판타지`
- `작은 타일맵 중심`보다 `배경판 + 구조물 오버레이 + 캐릭터/몬스터 + 무거운 HUD`
- `상단/하단 HUD가 실제 모바일 RPG처럼 붙는 구조`
- `NPC, 퀘스트, 포탈, 보스방`이 자연스럽게 올라가는 필드/던전 화면

## 1차 우선 후보

### 1. 캐릭터 / 직업 / NPC

우선 후보:

- Top-Down Wizard Characters Pack – Male, Veteran, Female
  - 링크: https://craftpix.net/product/top-down-wizard-characters-pack-male-veteran-female/
  - 이유: 픽셀이 아니라 벡터 기반이라 고해상도 모바일 화면에 덜 허접해 보임
- Free Medieval Bandit 4-Direction Character Pack
  - 링크: https://craftpix.net/freebies/free-medieval-bandit-4-direction-character-pack/
  - 이유: 도적, 적 인간형, NPC 전환이 쉬운 4방향 캐릭터 후보
- Universal LPC Sprite Sheet Character Generator
  - 링크: https://gaurav0.github.io/projects/universal-lpc-spritesheet-character-generator/
  - 이유: 벡터 캐릭터가 부족할 때 NPC 대량 생산용 백업 후보

사용 계획:

- 플레이어 3직업: 전사 / 마법사 / 궁수
- NPC: 마을 안내, 퀘스트 NPC, 상점 NPC, 순간이동 NPC
- 우선은 `벡터/고해상도 탑다운 캐릭터`를 먼저 보고, LPC는 백업으로만 둠

### 2. 몬스터 / 보스

우선 후보:

- Free Top-Down Goblin Character Sprite
  - 링크: https://craftpix.net/freebies/free-top-down-goblin-character-sprite/
  - 이유: 필드 잡몹/고블린 계열 후보
- Top-Down Boss Characters – Rock, Earth, Ice Monsters
  - 링크: https://craftpix.net/product/top-down-boss-characters-pack-3-rock-earth-ice-monsters/
  - 이유: 원소형 보스 후보
- Top-Down Fantasy Boss Characters Pack 2 – Yeti, Ogre, Cyclops
  - 링크: https://craftpix.net/product/top-down-fantasy-boss-characters-pack-2-yeti-ogre-cyclops/
  - 이유: 중보스/대형 보스 후보

사용 계획:

- 초반 필드: 고블린/밴딧/소형 몬스터
- 중급 필드: 정예 인간형 + 원소 몬스터
- 보스방: 골렘/오우거/사이클롭스급

### 3. 맵 / 필드 / 던전 / 구조물

우선 후보:

- Dungeon Top Down 2D Game Tileset
  - 링크: https://craftpix.net/product/dungeon-top-down-2d-game-tileset/
  - 이유: 던전형 구조물, 길, 오브젝트 후보. 기존 도트 타일보다 해상도와 완성도가 높음
- Top-Down 2D Game Vector Tileset for TD
  - 링크: https://craftpix.net/product/top-down-2d-game-vector-tileset-for-td/
  - 이유: 필드/길/지형/구조물 변주용
- Horizontal Dark Magic Battle Backgrounds
  - 링크: https://craftpix.net/product/horizontal-dark-magic-battle-backgrounds/
  - 이유: `잠룡` 같은 어두운 판타지 배경판 참고용
- Dragon Dungeon Battle Backgrounds
  - 링크: https://craftpix.net/product/dragon-dungeon-battle-backgrounds/
  - 이유: 보스룸/용 던전 감성 배경판 후보
- Free Elven Land Game Battle Backgrounds
  - 링크: https://craftpix.net/freebies/free-elven-land-game-battle-backgrounds/
  - 이유: 무료 배경판 중 우선 후보
- Cave Horizontal RPG Battle Backgrounds
  - 링크: https://craftpix.net/product/cave-horizontal-rpg-battle-backgrounds/
  - 이유: 동굴/던전형 전장 배경판 후보

사용 계획:

- `작은 반복 타일`보다 `큰 배경판`을 먼저 깔고 그 위에 구조물/오브젝트를 올림
- 마을 허브 1개
- 초반 필드 1개
- 중급 필드 1개
- 보스 제단/던전 1개
- 구조물: 집, 기둥, 계단, 다리, 제단, 상점 진열대, 워프 지점

### 4. 스킬 이펙트 / 히트 이펙트

우선 후보:

- Pixel Animated vFXs
  - 링크: https://opengameart.org/content/pixel-animated-vfxs
  - 이유: 순수 후보 유지. 실제 채택은 더 진한 효과 위주로 선별 필요
- Generic Art Collection
  - 링크: https://lpc.opengameart.org/content/generic-art-collection
  - 이유: 포탈/보조 오브젝트 후보

사용 계획:

- 전사: 베기 잔상, 충격파
- 마법사: 발사체, 폭발, 마법진
- 궁수: 화살 궤적, 연사 히트
- 공통: 드랍 획득, 레벨업, 순간이동, 보스 경고

### 5. 아이템 아이콘 / UI

우선 후보:

- Ancient Realms – Dark Fantasy RPG UI Pack
  - 링크: https://desertcodex.itch.io/dark-fantasy
  - 이유: 현재 요구에 가장 가까운 `다크 판타지 HUD` 후보
- Fantasy RPG UI Pack
  - 링크: https://moon-tribe.itch.io/fantasy-rpg-ui-pack
  - 이유: 무거운 RPG 패널, 프레임, 스킬 UI 참고용
- 700+ RPG Icons
  - 링크: https://opengameart.org/content/700-rpg-icons
  - 이유: 장비, 주문서, 소비품, 드랍 아이콘 보충용
- Fantasy UI Pack
  - 링크: https://galxrum.itch.io/fantasyuipack
  - 이유: 모바일 버튼/탭 배치 참고용

사용 계획:

- 상단 상태창
- 우측 메뉴 아이콘
- 하단 스킬바
- 퀘스트 추적바
- 인벤토리, 장비창, 상점창
- 현재 유리패널 HTML 느낌은 폐기

### 6. 사운드

우선 후보:

- RPG Audio
  - 링크: https://www.kenney.nl/assets/rpg-audio
  - 이유: 타격, 장비, UI, 보상 계열 기본 효과음 보강용

사용 계획:

- 기본 공격, 스킬, 히트, 처치, 아이템 획득, 버튼 클릭, 순간이동

## 버릴 것

- 현재 Three.js 프리미티브 캐릭터/몬스터 외형
- 지금의 밝은 유리 패널형 HUD
- 작은 도트 타일셋 중심 후보
- 랜덤하게 찍어낸 테스트맵 구조
- NPC 없는 단순 전투장

## 다음 작업 순서

1. `잠룡 느낌`에 맞는 필드/던전/배경판 먼저 확정
2. 그 배경판과 맞는 캐릭터/몬스터 세트 확정
3. HUD를 다크 판타지 UI 후보로 교체
4. NPC, 포탈, 상점, 퀘스트 포인트용 구조물 후보 확정
5. 그 다음에야 클라이언트 렌더링과 UI를 다시 짬
