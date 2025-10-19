// service-worker.js

const CACHE_NAME = 'minigame-heaven-v1'; // ✨ 캐시 이름 변경 (프로젝트에 맞게)
const URLS_TO_CACHE = [
  '/', // 루트 경로
  '/index.html',
  '/대기실.html', // ✨ 주요 HTML 파일 추가
  '/게임방.html', // ✨ 주요 HTML 파일 추가
  /* '/styles.css', // 만약 CSS 파일이 분리되어 있다면 추가 */
  /* '/script.js',  // 만약 JS 파일이 분리되어 있다면 추가 */

  // ✨ manifest.json 에 정의된 아이콘 경로와 일치시키세요
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // 다른 크기 아이콘이나 이미지 에셋이 있다면 추가
];

// 서비스 워커 설치: URLS_TO_CACHE 목록의 파일을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        // addAll은 하나라도 실패하면 전체가 실패합니다. 경로가 정확한지 확인!
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
});

// 요청 가로채기: 캐시 우선 전략 (Cache First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시된 응답 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크에서 가져옴
        return fetch(event.request)
          .then(networkResponse => {
            // (선택사항) 가져온 응답을 캐시에 저장할 수도 있습니다.
            // caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
            return networkResponse;
          })
          .catch(err => {
            console.error('Fetch failed:', err);
            // 오프라인 페이지 등을 반환할 수 있습니다.
          });
      })
  );
});

// 서비스 워커 활성화: 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]; // 현재 버전의 캐시만 남김
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 즉시 클라이언트를 제어하도록 설정 (선택사항)
  return self.clients.claim();
});
