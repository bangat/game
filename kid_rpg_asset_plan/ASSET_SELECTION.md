# 에셋 1차 선택 메모

## 목표

기존 `크고 허접한 HTML 박스 UI + 떠 보이는 맵 + 3D 잔상`을 버리고,
`어나더던전`처럼 `도트 기반 모바일 ARPG` 톤으로 전면 교체한다.

핵심 기준:

- 3D 느낌 제거
- 고정형 2D/2.5D 탑뷰 전투화면
- 상단 상태창 + 우측 메뉴 + 하단 스킬바
- 바닥과 구조물이 붙어 보이는 던전/필드
- 캐릭터, 몬스터, VFX, HUD를 한 톤으로 묶기

## 레퍼런스 기준

- `Another Dungeon 공식 메인 플레이 화면`
  - 전투 화면 비율
  - 상단 상태창
  - 하단 스킬바
- `Another Dungeon 공식 다크 던전 무드`
  - 배경 명암
  - 챕터 전환 톤
- `Another Dungeon 공식 캐릭터 라인업`
  - 직업 초상
  - 플레이어 본체 픽셀 밀도

## 1차 우선 후보

### 통합 킷

- `Fantasy Top-down ARPG Pixel-art Asset Pack`
  - 메인 기준 킷
- `Ninja Adventure Asset Pack`
  - 필드 사냥터 / 전투 흐름 / 오브젝트 확인용
- `2D Pixel Dungeon Asset Pack`
  - 던전 구조물용

### 캐릭터 / NPC

- `Swordman - Top Down Pixel Art Character Assets`
  - 전사 메인
- `2D Pixel Art Mage Sprite Pack`
  - 마법사 메인
- `Elite Archer - Top Down Pixel Art Character Assets`
  - 궁수 또는 도적 대체
- `Human NPCs`
  - 마을 / 퀘스트 / 상점 NPC

### 몬스터 / 보스

- `Topdown Monster Pack`
  - 일반 몬스터 기본축
- `Free Fantasy Enemies Pixel Art Sprite Pack`
  - 초반 사냥터 몹
- `Topdown RPG Bosses 1`
  - 챕터 보스 / 정예

### 맵 / 필드 / 던전

- `Top-Down Dungeon - 2D Asset Pack`
  - 던전 바닥 / 벽 / 방
- `Pixel Art Top Down Basic`
  - 기본 지면 / 길 / 바닥 텍스처
- `Pixel Art Top Down Village`
  - 시작 허브 마을
- `Ninja Adventure Asset Pack`
  - 필드 사냥터 / 숲 / 오브젝트
- `Free Cursed Land Top-Down Pixel Art Tileset`
  - 어두운 후반 챕터 지면

### HUD / UI / 아이콘

- `Pixel HUD UI`
  - 상단 상태창 / 하단 액션바
- `Melvin's Essential RPG HUD 16x16 UI Pack`
  - 작고 컴팩트한 모바일 HUD
- `Pixel Tier 16x16 RPG Icon Pack`
  - 스킬 / 아이템 / 드랍 아이콘

### 스킬 / VFX

- `2D Pixel Art Spell Effects Bundle`
  - 메인 마법 스킬
- `Pixel Art Slashes`
  - 전사 평타 / 검기
- `Super Pixel Fantasy FX Pack 1`
  - 보스 패턴 / 화려한 광역기

## 모바일 HUD 배치 원칙

- 상단 좌측:
  - 초상화
  - 레벨
  - HP/MP
  - 전투력
- 상단 중앙:
  - 미니 퀘스트 바
  - `AUTO` 작은 버튼
- 상단 우측:
  - 재화 2~3종
  - 우편 / 설정 / 던전 / 상점 / 메뉴 버튼
- 우측 세로:
  - 접히는 메뉴 버튼 묶음
- 하단 중앙:
  - 스킬 4~5칸
  - 기본 공격
  - 자동 전투
- 하단 최하단:
  - 얇은 EXP 바
- 좌하단:
  - 조이스틱

원칙:

- 메뉴는 `큰 패널 상시 노출`이 아니라 `작은 버튼 진입형`
- 퀘스트는 `미니 퀘스트 바` 중심
- 상세 퀘스트창, 상점, 포인트/캐시, 우편함, 설정, 던전은 별도 버튼 진입
- PWA 안전영역과 노치 영역을 고려해 모서리에서 약간 띄움
- 나중에 PvP 버튼이나 이벤트 버튼이 들어갈 자리를 우측 메뉴 영역에 예약

## 버릴 방향

- 거대한 HTML 사각 박스
- 원근감 강한 3D 카메라
- 바닥과 오브젝트가 따로 노는 떠 있는 맵
- 저해상도 벡터형 캐릭터
- 너무 많은 메뉴를 화면에 상시 노출하는 레이아웃
