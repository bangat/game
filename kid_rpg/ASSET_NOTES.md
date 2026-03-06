# Asset Notes

현재 `kid_rpg`는 `client/assets/skins/dark-fantasy`를 활성 스킨으로 사용합니다.

목표 톤:

- 모바일 다크 판타지 ARPG
- 잠룡 계열 2.5D 분위기
- 나중에 실제 원본 애셋으로 쉽게 교체 가능한 구조

현재 구조:

- 활성 스킨 매니페스트: `client/assets/skins/dark-fantasy/manifest.js`
- 배경판: `client/assets/skins/dark-fantasy/backgrounds/`
- 직업 초상/참조 이미지: `client/assets/skins/dark-fantasy/characters/`
- 몬스터/보스 참조 이미지: `client/assets/skins/dark-fantasy/enemies/`
- UI 참조 이미지: `client/assets/skins/dark-fantasy/ui/`
- 오디오 참조 이미지: `client/assets/skins/dark-fantasy/audio/`

교체 원칙:

- 막히는 원본 애셋은 승인받은 분위기와 비슷한 대체본으로 먼저 반영한다.
- 실제 실행 코드는 파일 경로를 직접 하드코딩하지 않고 스킨 매니페스트만 읽는다.
- 나중에 더 좋은 소스로 교체할 때는 `manifest.js`와 대응 파일만 바꾸면 된다.

현재 반영 방식:

- `client/app.js`는 시작 시 활성 스킨 매니페스트를 읽어 CSS 변수에 주입한다.
- `client/styles.css`는 배경, 직업 초상, HUD, 패널, 버튼 텍스처를 CSS 변수로만 참조한다.
- 즉, UI 톤 교체는 CSS를 다시 뜯지 않고 스킨 폴더 교체 위주로 진행할 수 있다.

주의:

- 현재 프로젝트에 포함된 이미지는 “활성 참조/대체 후보” 성격이 강하다.
- 공개 배포 전환 시에는 라이선스와 최종 원본 소스를 다시 정리해야 한다.
