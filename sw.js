const CACHE_NAME = 'minigame-heaven-v2'; // ✨ 기존 이름 유지

// ✨ [중요] 캐시할 파일 목록
// index.html 과 다른 HTML 파일에서 사용하는 모든 핵심 리소스를 포함해야 합니다.
const URLS_TO_CACHE = [
  '/', // '/' 또는 'index.html'을 가리키는 루트 경로
  'index.html',
  '대기실.html',
  '게임방.html',

  // ✨ [확인!] 이 경로가 manifest.json 과 일치하는지,
  //           실제 파일이 이 경로에 있는지 꼭! 확인하세요.
  // (만약 'images/icons/' 폴더에 있다면 경로를 수정해야 합니다)
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',

  // ✨ [필수 추가] index.html에서 사용하는 외부 리소스
  'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff',
  
  // ✨ [필수 추가] index.html, 대기실.html 등에서 사용하는 사운드
  'https://blog.kakaocdn.net/dna/dC0WAE/dJMb84DsZw6/AAAAAAAAAAAAAAAAAAAAAC8XpuPuNVEsdp6Ia-d35XR-m3FCZxObUR5uFI1tk2iv/%EB%B2%84%ED%8A%BC%EC%82%AC%EC%9A%B4%EB%93%9C.mp3?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1761922799&allow_ip=&allow_referer=&signature=RdbjxdP75HLHSpBIhymVkYpUOA0%D&attach=1&knm=tfile.mp3',
  'https://blog.kakaocdn.net/dna/dEAY2/dJMb88H2R2G/AAAAAAAAAAAAAAAAAAAAAPg0_H0XgRz8g-U-2Qk-5K2uWlT2sFpA-Vz_86X37x-o/%EC%9E%85%EC%9E%A5%EC%82%AC%EC%9A%B4%EB%93%9C.mp3?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1761922799&allow_ip=&allow_referer=&signature=8yD70E4Y6rV3d9W5D%252B19eYd%252BYcM%253D&attach=1&knm=tfile.mp3',
  'https://blog.kakaocdn.net/dna/brwD6P/dJMb856J6l3/AAAAAAAAAAAAAAAAAAAAAI1QcI8lW7rA0zH8m8M7p7y7dE0g0-z04sXUqN_S7-kO/%ED%87%B4%EC%9E%A5%EC%82%AC%EC%9A%B4%EB%93%9C.mp3?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1761922799&allow_ip=&allow_referer=&signature=8yA7x4n75s5G6j%252B11uA%252BF5hXj8A%253D&attach=1&knm=tfile.mp3',

  // ✨ [필수 추가] Firebase 스크립트 (네트워크 불안정 시에도 앱 로딩)
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened:', CACHE_NAME);
        // addAll은 하나라도 실패하면 전체가 실패합니다.
        return cache.addAll(URLS_TO_CACHE); 
      })
      .catch(err => {
        // ✨ 설치 실패 시, 어떤 파일이 문제인지 확인하기 위함
        console.error('[SW] cache.addAll FAILED:', err);
      })
  );
  self.skipWaiting(); // ✨ 즉시 활성화되도록 추가
});

// 요청 가로채기: 캐시 우선 전략 (Cache First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // 1. 캐시에 있으면 캐시된 응답 반환
        }
        
        // 2. 캐시에 없으면 네트워크로 요청
        // (주의: Firebase DB/Auth 실시간 통신 등은 캐시하면 안 되므로
        //  'Cache First' 전략은 간단하지만, 나중에 'Network First'로 고도화가 필요할 수 있습니다)
        return fetch(event.request); 
      })
  );
});

// 서비스 워커 활성화: 오래된 캐시 정리 (기존 코드와 동일)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]; // 현재 버전의 캐시만 남김
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
