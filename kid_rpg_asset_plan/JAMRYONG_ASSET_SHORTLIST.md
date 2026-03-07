# 잠룡 Phaser ARPG 에셋 1차 숏리스트

`잠룡 세계관 + Another Dungeon식 작은 HUD/전투면`을 기준으로 1차 채택 후보를 정리한 문서다.  
무료를 기본으로 잡고, `현재 5달러 이하`로 확인된 유료 후보는 별도 참고 리스트로 분리했다.  
또한 외부 에셋 없이 내가 바로 제작하거나 빠르게 보정할 수 있는 영역도 따로 분리했다.

## 기준

- 웹/PWA 공개를 감안해 `itch.io`, `CraftPix`, `OpenGameArt`, `Kenney` 계열을 우선한다.
- `Unity Asset Store` 자산은 참고용으로만 보고, 공개 웹 배포용 메인 후보에서는 보수적으로 다룬다.
- 한 통합팩으로 끝내지 않고 `메인 통합팩 + 직업/몬스터/VFX/UI 보조 조합`으로 맞춘다.
- 무료를 기본으로 하되, `톤 적합도`가 높고 `2026-03-07 기준 5달러 이하`인 유료 후보는 watchlist로 유지한다.
- `주인공급 캐릭터 원본 도트`, `대형 보스 원본 아트`는 외부 후보가 필요하고, HUD 조각/오버레이/간단 VFX/리컬러/로딩 연출은 직접 생성 가능 영역으로 분리한다.

## 1차 추천 조합

- 메인 통합팩: `KIT-01 Fantasy Top-down ARPG Pixel-art Asset Pack`
- 보조 필드/오브젝트: `KIT-02 Ninja Adventure Asset Pack`
- 백업 통합팩: `KIT-03 Free Top-Down Roguelike Game Kit Pixel Art`
- 직업 기본형: `CHR-01 Swordman`, `CHR-02 Mage`, `CHR-03 Elite Archer`
- 몬스터 기본형: `MON-01 Topdown Monster Pack`, `MON-02 Free Fantasy Enemies Pixel Art Sprite Pack`
- 보스 기본형: `BOSS-01 Topdown RPG Bosses 1`
- 던전/필드 타일: `MAP-01`, `MAP-02`, `MAP-03`, `MAP-04`, `MAP-05`
- HUD/UI: `UI-01`, `UI-02`, `UI-03`
- VFX/오디오: `VFX-01`, `VFX-02`, `VFX-03`, `AUD-01`

## 무료 우선 기준 조합

- `CHR-01` Swordman - Top Down Pixel Art Character Assets
  - 링크: https://sanctumpixel.itch.io/swordman-top-down-pixel-art-character-assets
  - 용도: 전사 기본 주인공
- `KIT-03` Free Top-Down Roguelike Game Kit Pixel Art
  - 링크: https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/
  - 용도: 무료 통합 백업 킷
- `MON-02` Free Fantasy Enemies Pixel Art Sprite Pack
  - 링크: https://craftpix.net/freebies/free-fantasy-enemies-pixel-art-sprite-pack/
  - 용도: 초반 필드 몬스터 보강
- `MAP-04` Free Cursed Land Top-Down Pixel Art Tileset
  - 링크: https://craftpix.net/freebies/free-cursed-land-top-down-pixel-art-tileset/
  - 용도: 어두운 필드/중반 지역
- `MAP-05` Free Forest Objects Top-Down Pixel Art
  - 링크: https://craftpix.net/freebies/free-forest-objects-top-down-pixel-art/
  - 용도: 필드 소품/숲 보강
- `AUD-01` Kenney RPG Audio
  - 링크: https://www.kenney.nl/assets/rpg-audio
  - 용도: 기본 전투/UI 효과음

메모:
완전 무료만으로도 초안은 가능하지만, `직업 다양성`, `보스 존재감`, `무협/어나더던전급 톤 통일`은 추가 보정이 필요하다.

## 유료 5달러 이하 참고 리스트

- `PAID-01` Elite Archer - Top Down Pixel Art Character Assets
  - 링크: https://sanctumpixel.itch.io/elite-archer-top-down-pixel-art-character-assets
  - 확인 가격: `$2.80 USD`
  - 확인 날짜: `2026-03-07`
  - 용도: 궁수 메인 플레이어 후보
  - 메모: 무료 기준 조합이 약한 원거리 직업을 바로 보강하기 좋다.
- `PAID-02` Pixel Magic Effect Pack
  - 링크: https://kapoz.itch.io/pixel-magic-effect-pack
  - 확인 가격: `$3.00 USD`
  - 확인 날짜: `2026-03-07`
  - 용도: 마법 충돌/버프/VFX 보강
  - 메모: `itch.io` rate limit이 있었으므로 구매 직전 원본 페이지 재확인 권장.

## 직접 생성 가능 영역

아래 항목은 외부 메인 에셋보다 `내가 직접 빠르게 만들거나 보정하기 쉬운 부분`이다.  
즉시 제작/보정 대상으로 보고, 검수판에서도 외부 후보와 분리해서 보여주는 게 맞다.

- `SELF-01` HUD 프레임/상태바 조각
  - 용도: 상단 얇은 정보바, 하단 미니 퀘스트바, 작은 슬롯 프레임
  - 메모: DOM/CSS + 간단 도트 프레임 조합으로 빠르게 제작 가능
- `SELF-02` 하단 대화창/퀘스트 바 스킨
  - 용도: 잠룡 스타일 말풍선형 메인 퀘스트 대화창
  - 메모: 하단 대화 로그와 진행 버튼은 직접 설계하는 편이 더 정확함
- `SELF-03` 로딩 오버레이/팁 카드
  - 용도: 객잔/필드/던전 이동 시 로딩씬 오버레이
  - 메모: 배경 합성, 타이포, 진행문구는 직접 제작 가능
- `SELF-04` 데미지 텍스트/크리티컬 타이포
  - 용도: 평타/스킬/크리티컬/회복 숫자
  - 메모: Phaser 텍스트 스타일 + 비트맵 폰트 조합으로 직접 구현 가능
- `SELF-05` 간단 피격/VFX 조각
  - 용도: 히트 플래시, 충돌 링, 검기 잔상, 버프 글로우
  - 메모: 파티클/블렌드/짧은 스프라이트 조각은 직접 제작 가능
- `SELF-06` 리컬러/톤 통일 패스
  - 용도: 외부 캐릭터/몬스터/소품의 팔레트 통일
  - 메모: 잠룡/어나더던전 방향에 맞게 채도와 명암을 재정리
- `SELF-07` 객잔 소형 소품/간판
  - 용도: 간판, 현수막, 게시판, 바닥 데칼, 표지판
  - 메모: 무협 객잔 분위기를 만드는 소형 디테일은 직접 제작 효율이 높음
- `SELF-08` 맵 그레이박스/콜리전/스폰 레이아웃
  - 용도: 초보 필드, 던전 입구, 객잔 내부 배치
  - 메모: 실제 플레이 동선과 스폰 구조는 직접 설계하는 편이 낫다

제한:
- `주인공 전신 도트 원본`, `대형 보스 원본 애니메이션`, `고급 타일셋 완성본`은 직접 전부 만드는 것보다 외부 기반을 쓰는 편이 빠르다.

## 카테고리별 후보

### 통합팩

- `KIT-01` Fantasy Top-down ARPG Pixel-art Asset Pack
  - 링크: https://ohanastudio.itch.io/arpg-asset-pack
  - 용도: 메인 기준 통합팩
  - 상태: `primary`
- `KIT-02` Ninja Adventure Asset Pack
  - 링크: https://pixel-boy.itch.io/ninja-adventure-asset-pack
  - 용도: 필드 오브젝트/보조 배경
  - 상태: `support`
- `KIT-03` Free Top-Down Roguelike Game Kit Pixel Art
  - 링크: https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/
  - 용도: 백업 통합팩
  - 상태: `backup`

### 캐릭터

- `CHR-01` Swordman - Top Down Pixel Art Character Assets
  - 링크: https://sanctumpixel.itch.io/swordman-top-down-pixel-art-character-assets
  - 용도: 전사 기본 플레이어
  - 상태: `primary`
- `CHR-02` 2D Pixel Art Mage Sprite Pack
  - 링크: https://elthen.itch.io/2d-pixel-art-mage
  - 용도: 법사 기본 플레이어
  - 상태: `primary`
- `CHR-03` Elite Archer - Top Down Pixel Art Character Assets
  - 링크: https://sanctumpixel.itch.io/elite-archer-top-down-pixel-art-character-assets
  - 용도: 궁수 기본 플레이어
  - 상태: `primary`
- `CHR-04` Human NPCs
  - 링크: https://snoblin.itch.io/human-npcs
  - 용도: 객잔/마을 NPC
  - 상태: `support`

### 몬스터/보스

- `MON-01` Topdown Monster Pack
  - 링크: https://pixelodis.itch.io/topdownmonsterpack
  - 용도: 필드/던전 기본 몬스터
  - 상태: `primary`
- `MON-02` Free Fantasy Enemies Pixel Art Sprite Pack
  - 링크: https://craftpix.net/freebies/free-fantasy-enemies-pixel-art-sprite-pack/
  - 용도: 초반 몬스터 다양성
  - 상태: `primary`
- `MON-03` Top-Down Pixel Skeletons Character Sprite Pack
  - 링크: https://craftpix.net/product/top-down-pixel-skeletons-character-sprite-pack/
  - 용도: 던전 언데드 계열
  - 상태: `support`
- `BOSS-01` Topdown RPG Bosses 1
  - 링크: https://elvgames.itch.io/topdown-rpg-bosses1
  - 용도: 필드/던전 보스
  - 상태: `primary`

### 맵/타일/객잔

- `MAP-01` Top-Down Dungeon - 2D Asset Pack
  - 링크: https://philtacular.itch.io/top-down-dungeon
  - 용도: 던전 바닥/벽/통로
  - 상태: `primary`
- `MAP-02` Pixel Art Top Down Basic
  - 링크: https://cainos.itch.io/pixel-art-top-down-basic
  - 용도: 초반 필드/길/잔디
  - 상태: `primary`
- `MAP-03` Pixel Art Top Down Village
  - 링크: https://cainos.itch.io/pixel-art-top-down-village
  - 용도: 객잔 외곽/마을 구조물
  - 상태: `primary`
- `MAP-04` Free Cursed Land Top-Down Pixel Art Tileset
  - 링크: https://craftpix.net/freebies/free-cursed-land-top-down-pixel-art-tileset/
  - 용도: 어두운 중반 필드
  - 상태: `support`
- `MAP-05` Free Forest Objects Top-Down Pixel Art
  - 링크: https://craftpix.net/freebies/free-forest-objects-top-down-pixel-art/
  - 용도: 나무/바위/필드 소품
  - 상태: `support`

### HUD/UI/아이콘

- `UI-01` Pixel HUD UI
  - 링크: https://indigolay.itch.io/pixel-hud-ui
  - 용도: 상단 HUD/하단 슬롯 기준
  - 상태: `primary`
- `UI-02` Melvin's Essential RPG HUD 16x16 UI Pack
  - 링크: https://mononokestudios.itch.io/melvins-essential-rpg-hud-16x16-ui-pack
  - 용도: 미니 버튼/상태바 조각
  - 상태: `primary`
- `UI-03` Pixel Tier 16x16 RPG Icon Pack
  - 링크: https://pixeltier.itch.io/pixeltiers-16x16-rpg-icon-pack
  - 용도: 스킬/아이템 아이콘
  - 상태: `primary`
- `UI-04` 700+ RPG Icons
  - 링크: https://opengameart.org/content/700-rpg-icons
  - 용도: 인벤토리/상점 보조 아이콘
  - 상태: `support`

### 스킬/VFX/오디오

- `VFX-01` 2D Pixel Art Spell Effects Bundle
  - 링크: https://elthen.itch.io/2d-pixel-art-spell-effects-bundle
  - 용도: 마법/버프/이동 이펙트
  - 상태: `primary`
- `VFX-02` Pixel Art Slashes
  - 링크: https://frostwindz.itch.io/pixel-art-slashes
  - 용도: 검기/근접 타격
  - 상태: `primary`
- `VFX-03` Super Pixel Fantasy FX Pack 1
  - 링크: https://untiedgames.itch.io/super-pixel-fantasy-fx-pack-1
  - 용도: 보스/광역기 보강
  - 상태: `support`
- `VFX-04` Pixel Magic Effect Pack
  - 링크: https://kapoz.itch.io/pixel-magic-effect-pack
  - 용도: 충돌/버프/마법 보강
  - 상태: `support`
- `AUD-01` Kenney RPG Audio
  - 링크: https://www.kenney.nl/assets/rpg-audio
  - 용도: 기본 전투/UI 효과음
  - 상태: `primary`

### 보류

- `HOLD-01` Dark fantasy - popular enemies - Free Sample
  - 링크: https://assetstore.unity.com/packages/2d/characters/dark-fantasy-popular-enemies-free-sample-327389
  - 용도: 몬스터 참고
  - 상태: `hold`
  - 메모: 웹/PWA 공개 배포에서 raw asset 추출 이슈가 있어 메인 후보에서는 보류

## 다음 액션

- 검수 게시판에서는 `무료 기준`, `유료 참고`, `직접 생성 가능`을 탭으로 분리한다.
- `SELF-*` 항목은 외부 원본 링크 대신 `내부 제작 예정 메모`와 `용도`를 먼저 보여준다.
- 다음 단계에서 이 문서를 기반으로 `jamryong_asset_seed.json`을 게시판 데이터로 사용한다.
