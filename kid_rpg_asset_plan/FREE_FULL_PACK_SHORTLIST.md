# 무료 통팩 우선 검수판

현재 `kid_rpg` 화면은 `Another Dungeon` 기준과 거리가 멉니다.
그래서 기존 HUD를 덧칠하는 대신, `무료 또는 Name your own price` 기준의 통팩 중심으로 다시 고르기 위한 별도 검수판을 만듭니다.

## 왜 방향을 바꾸는지

- 현재 화면은 예전 레이아웃 잔재가 남아 있어 HUD가 큽니다.
- 필드 바닥이 임시 타일 느낌이라 승인된 톤과 다릅니다.
- UI 프레임이 이전 버전 구조를 그대로 끌고 와서 `Another Dungeon`식 밀도와 다릅니다.
- 그래서 조각 에셋을 섞는 방식보다 `통팩으로 한 번에 톤을 맞추는 방식`이 더 빠르고 안전합니다.

## 1순위 무료 통팩

### 1. Ninja Adventure Asset Pack

- 링크: https://pixel-boy.itch.io/ninja-adventure-asset-pack
- 분류: 무료 / Name your own price / CC0
- 강점:
  - 탑다운 필드, 캐릭터, 몬스터, 오브젝트가 한 톤으로 정리됨
  - 실제 ARPG 화면 밀도를 빠르게 맞추기 좋음
  - 초보 사냥터와 필드 레이아웃 검수에 가장 적합
- 용도:
  - 첫 필드 사냥터 기본 베이스
  - 마을 외곽 / 길 / 초반 전투면

### 2. Free Top-Down Roguelike Game Kit Pixel Art

- 링크: https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/
- 분류: 무료
- 강점:
  - 캐릭터, 적, 타일, UI까지 한 번에 확보 가능
  - 현재처럼 UI와 바닥이 따로 노는 문제를 줄이기 좋음
  - 빠르게 `통파일 기준` 초안을 다시 세울 때 유리
- 용도:
  - 백업용 메인 통팩
  - 화면 전체를 한 번에 갈아탈 때 사용

## 보조 후보

### 3. Top-Down Dungeon - 2D Asset Pack

- 링크: https://philtacular.itch.io/top-down-dungeon
- 분류: 무료 / Name your own price
- 강점:
  - 던전 바닥/벽/통로가 잘 붙어서 현재처럼 붕 떠 보이지 않음
- 용도:
  - 던전 구역 전용 보강

### 4. Pixel HUD UI

- 링크: https://indigolay.itch.io/pixel-hud-ui
- 분류: 무료 / Name your own price
- 강점:
  - 지금처럼 큰 HTML 카드 대신 작은 픽셀 HUD 프레임으로 교체 가능
- 용도:
  - 상단 상태창
  - 하단 액션바
  - 슬림 퀘스트 바

## 적용 순서

1. `Ninja Adventure`를 메인 필드 통팩 기준으로 잡는다.
2. 던전은 `Top-Down Dungeon`으로 바닥과 구조물 톤을 보강한다.
3. HUD는 `Pixel HUD UI` 계열로 갈아타고, 기존 큰 카드형 레이아웃은 폐기한다.
4. `CraftPix Free Top-Down Roguelike`는 부족한 칸을 메우는 백업 메인 통팩으로 둔다.

## 로컬 확인 주소

- `http://localhost:43188/free_full_kits.html`
- 기존 전체 보드: `http://localhost:43188/gallery.html`

