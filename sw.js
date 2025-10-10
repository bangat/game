const CACHE_NAME = 'nanmal-game-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // CSS와 JS가 HTML 내부에 있으므로 별도 파일 캐싱은 필요 없습니다.
  // 아이콘 경로들을 추가합니다.
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// 요청에 대한 응답 캐시 또는 네트워크에서 가져오기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시된 응답을 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크에서 가져옴
        return fetch(event.request);
      })
  );
});

// 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

});
