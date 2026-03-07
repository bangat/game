# kid_rpg_asset_plan

`kid_rpg`를 `어나더던전` 같은 고퀄 도트 ARPG 톤으로 갈아엎기 전에,
먼저 에셋 후보를 눈으로 확인하는 검수 폴더입니다.

핵심 방향:

- 3D 느낌 제거
- 도트 기반 ARPG 시점
- 상단 상태창 + 하단 스킬바 구조
- 땅과 구조물이 붙어 보이는 맵
- 캐릭터, 몬스터, VFX, HUD를 같은 톤으로 정리

주요 파일:

- [sources.json](./sources.json): 후보 원본 매니페스트
- [gallery.html](./gallery.html): 검수용 갤러리
- [ASSET_SELECTION.md](./ASSET_SELECTION.md): 1차 픽 요약
- [UI_LAYOUT.md](./UI_LAYOUT.md): 모바일 HUD 배치 원칙
- [ui_layout.html](./ui_layout.html): 모바일 HUD 목업
- [preview_manifest.json](./preview_manifest.json): 자동 수집 결과
- [generate_gallery.py](./generate_gallery.py): 갤러리 생성기
- [sync_preview_assets.ps1](./sync_preview_assets.ps1): `previews/` 이미지를 카테고리 폴더로 복사

카테고리:

- `reference`: Another Dungeon 공식 레퍼런스
- `full_kits`: 전체 톤을 빨리 맞추는 통합 킷
- `characters_npc`: 직업 / NPC 후보
- `monsters`: 일반 몬스터 / 보스 후보
- `maps_tiles`: 땅 / 길 / 던전 / 구조물 후보
- `items_ui`: HUD / 상태창 / 아이콘 후보
- `vfx`: 스킬 / 피격 / 순간이동 효과 후보
- `audio`: 효과음 / 배경음악 후보

로컬 확인:

```powershell
cd C:\Users\user\Desktop\미니게임지옥\kid_rpg_asset_plan
python generate_gallery.py
```

브라우저로 바로 열기:

```cmd
open_gallery.cmd
```

HUD 목업 보기:

```cmd
open_ui_layout.cmd
```

로컬 웹서버 실행:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve_gallery.ps1
```
