# kid_rpg_asset_plan

`kid_rpg`를 폐기하고 새 Phaser 기반 잠룡 ARPG를 준비하기 전에,
에셋 후보와 기준 문서를 로컬에서 검수하는 폴더다.

## 주요 문서

- [ANOTHER_DUNGEON_REBUILD_PROMPT.md](./ANOTHER_DUNGEON_REBUILD_PROMPT.md): 기존 재구성 방향 기준 프롬프트
- [MASTER_PROMPT.md](./MASTER_PROMPT.md): 새 Phaser 잠룡 ARPG 구현 기준 프롬프트
- [MOCKUP_SPEC.md](./MOCKUP_SPEC.md): 씬 흐름, HUD, 전투 연출 목업 명세
- [JAMRYONG_ASSET_SHORTLIST.md](./JAMRYONG_ASSET_SHORTLIST.md): 1차 에셋 추천 조합과 카테고리별 숏리스트, 무료 기준/유료 참고/직접 생성 가능 영역 분리
- [ASSET_SELECTION.md](./ASSET_SELECTION.md): 에셋 선정 요약
- [FREE_FULL_PACK_SHORTLIST.md](./FREE_FULL_PACK_SHORTLIST.md): 무료 통합팩/보조팩 우선순위 메모
- [UI_LAYOUT.md](./UI_LAYOUT.md): 모바일 HUD 배치 기준

## 검수 파일

- [sources.json](./sources.json): 후보 원본 매니페스트
- [jamryong_asset_seed.json](./jamryong_asset_seed.json): 새 모바일 검수 게시판에 넣을 번호형 시드 데이터와 직접 생성 가능 항목 분리본
- [selection_state.json](./selection_state.json): 검수 게시판에서 저장한 선택 상태
- [approved_assets.json](./approved_assets.json): 채택된 항목만 추린 export 파일
- [preview_manifest.json](./preview_manifest.json): 미리보기 수집 결과
- [gallery.html](./gallery.html): 전체 갤러리
- [free_full_kits.html](./free_full_kits.html): 무료 통합팩 우선 검수판
- [ui_layout.html](./ui_layout.html): HUD 목업
- [asset_board.html](./asset_board.html): 모바일용 에셋 검수 게시판

## 스크립트

- [generate_gallery.py](./generate_gallery.py): 갤러리 생성기
- [sync_preview_assets.ps1](./sync_preview_assets.ps1): preview 이미지 동기화
- [serve_gallery.ps1](./serve_gallery.ps1): 로컬 HTTP 서버 실행
- [asset_board_server.js](./asset_board_server.js): 저장 가능한 검수 게시판 로컬 서버
- [serve_asset_board.ps1](./serve_asset_board.ps1): 검수 게시판 서버 실행

## 실행

```powershell
cd C:\Users\user\Desktop\미니게임지옥\kid_rpg_asset_plan
python generate_gallery.py
powershell -ExecutionPolicy Bypass -File .\serve_gallery.ps1
powershell -ExecutionPolicy Bypass -File .\serve_asset_board.ps1
```

## 방향

- 3D 구조 보수 금지
- Phaser 기반 2D 탑다운 ARPG 재구성
- 작은 HUD, 넓은 전투면
- 잠룡 세계관 + Another Dungeon식 HUD 밀도
- 에셋은 검수판 승인 후에만 게임에 반영
