# kid_rpg_asset_plan

`kid_rpg` 본작업 전에 먼저 검수할 에셋 계획 폴더입니다.

목표 방향:

- `잠룡` 같은 어두운 모바일 ARPG 감성
- 작은 레트로 도트가 아니라 `고해상도 2D/2.5D 다크 판타지`
- `배경판 + 구조물 오버레이 + 캐릭터/몬스터 + 무거운 HUD` 구조
- 실제 게임 같은 상단 상태바, 우측 메뉴, 하단 스킬바
- 4방향 캐릭터, 몬스터, NPC, 필드/던전 배경, 구조물, 스킬 이펙트, 아이템 아이콘을 먼저 고정

구성:

- [ASSET_SELECTION.md](./ASSET_SELECTION.md): 카테고리별 우선 후보와 사용 이유
- [PROTOTYPE_PICKLIST.md](./PROTOTYPE_PICKLIST.md): 지금 바로 프로토타입에 넣을 1차 채택 세트
- [sources.json](./sources.json): 소스 정리용 manifest
- [gallery.html](./gallery.html): 시각 검수용 미리보기 갤러리
- `previews/`: 로컬 저장 썸네일 폴더
- `open_gallery.cmd`: 갤러리 바로 열기
- `characters_npc/`: 플레이어, 직업, NPC 후보 정리용
- `monsters/`: 일반 몬스터, 보스 후보 정리용
- `vfx/`: 스킬 이펙트, 히트 이펙트 후보 정리용
- `items_ui/`: 아이템 아이콘, HUD/UI 후보 정리용
- `maps_tiles/`: 필드/던전 배경판, 구조물, 타일보조 후보 정리용
- `audio/`: 효과음, BGM 후보 정리용

지금 단계에서는 무작정 다운로드보다, `도트 감성 제거`와 `잠룡형 모바일 RPG 무드`에 맞는 후보를 먼저 추려 두는 데 집중합니다.

빠른 확인:

```cmd
open_gallery.cmd
```

검수 포인트:

- 스샷처럼 실제 모바일 RPG 느낌이 나는가
- 캐릭터/NPC/몬스터 스타일이 서로 충돌하지 않는가
- 필드/던전이 테스트맵처럼 보이지 않는가
- HUD가 웹페이지 패널처럼 보이지 않는가
- 스킬 이펙트가 충분히 화려한가
