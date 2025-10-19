/* ===== 1) 스코프-상대 BASE 경로 계산 ===== */
// 앱이 루트가 아닌 하위 폴더에 배포되어도 경로를 올바르게 계산합니다.
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname
  : SCOPE_URL.pathname + '/'; // ex) '/minigame/' 또는 '/'

/* ===== 2) 캐시 버전 및 이름 설정 ===== */
// ✨ 앱을 업데이트할 때마다 이 버전을 변경하세요 (예: v1.0.1)
const SW_VERSION = 'v1.0.0';
const CACHE_NAME = `minigame-heaven-${SW_VERSION}`;

/* ===== 3) 프리캐시 목록 (핵심!) ===== */
// ✨ [중요] 외부 리소스(사운드, 폰트, Firebase)를 모두 제거합니다.
// ✨ [중요] manifest.json을 추가하고 아이콘 경로를 확인하세요.
const PRECACHE_FILES = [
  `${BASE_PATH}`,             // 루트 경로 (index.html)
  `${BASE_PATH}index.html`,
  `${BASE_PATH}대기실.html`,
  `${BASE_PATH}게임방.html`,
  `${BASE_PATH}manifest.json`, // PWA 설치에 필수적이므로 캐시합니다.

  // ✨ 이 경로가 실제 파일 위치와 일치하는지 확인하세요.
  // (예: 만약 'images/icons/' 폴더 안이라면 경로를 수정하세요)
  `${BASE_PATH}icons/icon-192x192.png`,
  `${BASE_PATH}icons/icon-512x512.png`
];

/* ===== 4) 서비스 워커 설치 ===== */
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 즉시 새 워커로 활성화
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell:', PRECACHE_FILES);
        return cache.addAll(PRECACHE_FILES);
      })
      .catch(err => {
        console.error('[SW] Precaching FAILED:', err);
      })
  );
});

/* ===== 5) 서비스 워커 활성화 (오래된 캐시 정리) ===== */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // 새 버전과 이름이 다른 모든 캐시를 삭제합니다.
    await Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      }
    }));
    await self.clients.claim(); // 클라이언트를 즉시 제어
  })());
});

/* ===== 6) Fetch 이벤트 처리 (네트워크 우선 + SWR) ===== */

// 6-1) 네비게이션 요청 (HTML 페이지 로드) - 네트워크 우선
async function handleNavigation(request) {
  try {
    // 1. 네트워크에서 최신 버전을 가져옵니다.
    const fresh = await fetch(request, { cache: 'no-store' });
    return fresh;
  } catch (e) {
    // 2. 오프라인/네트워크 실패 시 캐시에서 기본 페이지(앱 셸)를 반환합니다.
    console.warn('[SW] Navigation failed, serving shell from cache.', e);
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(`${BASE_PATH}index.html`))
           || (await cache.match(PRECACHE_FILES[0])); // 루트
  }
}

// 6-2) 정적 자원 (JS, CSS, 이미지 등) - Stale-While-Revalidate
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // 1. 네트워크로 최신 버전을 요청하는 작업을 시작합니다.
  const fetchPromise = fetch(request).then(res => {
    // 2. 응답이 정상이면 캐시를 최신 버전으로 덮어씁니다.
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  }).catch(err => {
    console.warn('[SW] Asset fetch failed:', err);
    return null; // 네트워크 실패 시 null 반환
  });

  // 3. 캐시된 버전이 있으면 즉시 반환 (빠른 로딩),
  //    없으면 네트워크 요청이 끝날 때까지 기다립니다.
  return cached || (await fetchPromise);
}

// 6-3) 메인 Fetch 이벤트 리스너
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ✨ [핵심] 외부 리소스(폰트, 사운드, Firebase 등)는 SW가 처리하지 않음
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. 페이지 이동 요청인 경우
  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }
  
  // 2. 기타 내부 자원(JS, CSS, 로컬 이미지 등) 요청인 경우
  event.respondWith(handleAsset(req));
});
