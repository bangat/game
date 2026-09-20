// 공개 앱은 PC와 독립적인 클라우드 서버에 연결합니다.
// 로컬 개발/에뮬레이터는 같은 출처의 테스트 서버를 사용합니다.
window.InsectConfig = { socketUrl: /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(location.hostname)
  ? '' : 'wss://insect-expedition-2lzavbkeoa-du.a.run.app/insect_expedition/ws' };
