# kid_rpg 에셋 선정안

## 방향

현재 Three.js 프리미티브 기반 초안은 폐기 대상입니다.

비주얼 방향은 아래로 고정합니다.

- `도트 2.5D 액션 RPG`
- `상단/하단 HUD가 실제 모바일 RPG처럼 붙는 구조`
- `타일 기반 필드 + 던전`
- `4방향 캐릭터/NPC + 몬스터 애니메이션`
- `스킬 이펙트와 아이템 아이콘이 충분히 풍부한 구성`

## 1차 우선 후보

### 1. 캐릭터 / 직업 / NPC

우선 후보:

- Universal LPC Sprite Sheet Character Generator
  - 링크: https://gaurav0.github.io/projects/universal-lpc-spritesheet-character-generator/
  - 이유: 직업별 외형, 머리, 장비, 의상 조합이 가능해서 플레이어/마을 NPC/상점 NPC/퀘스트 NPC를 한 스타일로 통일하기 좋음
- [LPC Revised] Character Basics
  - 링크: https://opengameart.org/content/lpc-revised-character-basics
  - 이유: 4방향 기본 인체와 애니메이션 기반으로 쓰기 좋음
- [LPC Expanded] Sit, Run, Jump, & More
  - 링크: https://opengameart.org/content/expanded-universal-lpc-spritesheet-idle-run-jump-lpc-revised-combat-and-assets
  - 이유: 걷기만이 아니라 달리기/확장 모션까지 확보 가능

사용 계획:

- 플레이어 3직업: 전사 / 마법사 / 궁수
- NPC: 마을 안내, 퀘스트 NPC, 상점 NPC, 순간이동 NPC
- 같은 베이스에서 색상/장비만 바꿔 일관성 유지

### 2. 몬스터 / 보스

우선 후보:

- [LPC] Monsters
  - 링크: https://opengameart.org/content/lpc-monsters
  - 이유: 캐릭터와 톤을 크게 어긋나지 않게 맞추기 쉬움
- OpenGameArt Top down monster game collection
  - 링크: https://opengameart.org/content/top-down-monster-game
  - 이유: 슬라임, 언데드, 동물형, 보스형 후보를 빠르게 넓게 검토하기 좋음

사용 계획:

- 초원: 슬라임, 늑대, 작은 언데드
- 협곡/중급 필드: 위습, 늑대 강화형, 골렘
- 제단/보스: 거대 몬스터 1종 + 정예 몬스터 1종

### 3. 맵 / 타일 / 구조물

우선 후보:

- Brown Rock Tileset - Top Down RPG Pixel Art
  - 링크: https://opengameart.org/content/brown-rock-tileset-top-down-rpg-pixel-art
  - 이유: 바닥, 기둥, 다리, 계단, 집까지 있어서 테스트맵 느낌을 벗어나기 좋음
- Tiny Dungeon
  - 링크: https://www.kenney.nl/assets/tiny-dungeon
  - 이유: 16x16 던전 타일이 정리돼 있고 CC0라 다루기 편함
- Kenney tilemap usage guide
  - 링크: https://kenney.nl/knowledge-base/game-assets-2d/importing-and-using-tilemaps
  - 이유: 실제 타일맵 파이프라인 정리 참고용

사용 계획:

- 마을 허브 1개
- 초반 필드 1개
- 중급 필드 1개
- 보스 제단/던전 1개
- 구조물: 집, 기둥, 계단, 다리, 제단, 상점 진열대, 워프 지점

### 4. 스킬 이펙트 / 히트 이펙트

우선 후보:

- Pixel Animated vFXs
  - 링크: https://opengameart.org/content/pixel-animated-vfxs
  - 이유: 마법/폭발/타격 이펙트에 바로 검토 가능
- LPC Generic Art Collection
  - 링크: https://lpc.opengameart.org/content/generic-art-collection
  - 이유: 포탈, 효과, 보조 오브젝트 후보까지 같이 볼 수 있음

사용 계획:

- 전사: 베기 잔상, 충격파
- 마법사: 발사체, 폭발, 마법진
- 궁수: 화살 궤적, 연사 히트
- 공통: 드랍 획득, 레벨업, 순간이동, 보스 경고

### 5. 아이템 아이콘 / UI

우선 후보:

- 700+ RPG Icons
  - 링크: https://opengameart.org/content/700-rpg-icons
  - 이유: 장비, 소비품, 재료, 스크롤, 스킬 아이콘 후보를 빠르게 채우기 좋음
- UI Pack - Pixel Adventure
  - 링크: https://kenney.nl/assets/ui-pack-pixel-adventure
  - 이유: 현재 삼류 HTML 패널 느낌을 버리고 실제 게임 패널 느낌으로 교체하기 좋음
- Pixel UI Pack
  - 링크: https://kenney.nl/assets/pixel-ui-pack
  - 이유: 보조 패널/버튼/프레임 확장용
- Simple RPG GUI
  - 링크: https://opengameart.org/content/simple-rpg-gui
  - 이유: HUD 감성 비교용 후보

사용 계획:

- 상단 상태창
- 우측 메뉴 아이콘
- 하단 스킬바
- 퀘스트 추적바
- 인벤토리, 장비창, 상점창

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
- 랜덤하게 찍어낸 테스트맵 구조
- NPC 없는 단순 전투장

## 다음 작업 순서

1. 위 후보 중 실제 채택할 세트 확정
2. 채택한 에셋을 각 폴더에 실제 다운로드
3. 캐릭터/NPC/몬스터 스프라이트 시트 정리
4. 타일맵 샘플 3장 제작
5. HUD 목업 교체
6. 그 다음에야 클라이언트 렌더링과 UI를 다시 짬
