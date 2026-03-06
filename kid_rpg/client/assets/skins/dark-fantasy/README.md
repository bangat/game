# Dark Fantasy Skin

이 폴더는 현재 `kid_rpg` 실행본의 활성 스킨입니다.

핵심 파일:

- `manifest.js`: 실행 코드가 읽는 단일 진입점
- `backgrounds/`: 마을, 필드, 던전 배경판
- `characters/`: 직업 초상 및 참조 캐릭터 이미지
- `enemies/`: 필드 몬스터/보스 참조 이미지
- `ui/`: HUD, 패널, 버튼 톤 이미지
- `audio/`: 오디오 후보 참조 이미지

교체 방법:

1. 같은 용도의 새 파일을 이 폴더에 넣는다.
2. `manifest.js` 경로만 바꾼다.
3. 클라이언트는 자동으로 새 경로를 읽는다.
