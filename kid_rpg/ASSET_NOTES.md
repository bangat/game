# Asset Notes

이 초안은 바로 실행 가능한 구조를 우선해서 다음 방식으로 구성했다.

- 현재 3D 캐릭터/몬스터/무기/이펙트는 Three.js 프리미티브 기반 임시 구현이다.
- 현재 효과음과 배경음악은 Web Audio API로 생성하는 합성 사운드다.
- 즉시 실행성과 라이선스 안정성을 위해 외부 리소스 의존을 최소화했다.

추후 교체 권장 후보:

- 캐릭터/몬스터: Kenney, Quaternius, Mixamo, Poly Pizza
- 환경/구조물: Quaternius, Kenney, Poly Haven
- 효과음/BGM: OpenGameArt, freesound, Kenney audio packs

교체 구조 원칙:

- `client/app.js`의 `createPlayerModel`, `createEnemyModel`, `AudioEngine`는 교체 지점이다.
- 에셋을 추가할 때는 `client/assets/` 하위로 넣고 manifest 형태로 분리한다.
- 공개 배포 전에는 라이선스 상태를 다시 정리한다.
