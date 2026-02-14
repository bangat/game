/* ===== 1) 스코프-상대 BASE 경로 계산 ===== */
// 앱이 루트가 아닌 하위 폴더에 배포되어도 경로를 올바르게 계산합니다.
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname
  : SCOPE_URL.pathname + '/'; // ex) '/minigame/' 또는 '/'

/* ===== 2) 캐시 버전 및 이름 설정 ===== */
// ✨ 앱을 업데이트할 때마다 이 버전을 변경하세요 (예: v1.0.1)
const SW_VERSION = 'v1.1.4';
const CACHE_NAME = `minigame-heaven-${SW_VERSION}`;

/* ===== 3) 프리캐시 목록 (핵심!) ===== */
// ✨ "설치 아이콘"만 뜨게 하기 위한 최소한의 핵심 파일 목록입니다.
// ✨ (리버시.html, 메모리게임.html 등은 일부러 뺐습니다)
const PRECACHE_FILES = [
  `${BASE_PATH}`,             // 루트 경로 (index.html)
  `${BASE_PATH}index.html`,
  `${BASE_PATH}대기실.html`,
  `${BASE_PATH}게임방.html`,
  `${BASE_PATH}manifest.json`, // PWA 설치에 필수적이므로 캐시합니다.

  // ✨ 이 경로가 실제 파일 위치와 일치하는지 확인하세요.
  // (스크린샷 보니 'icons' 폴더가 맞습니다)
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
        // 이 목록의 파일만 캐시합니다.
        return cache.addAll(PRECACHE_FILES);
      })
      .catch(err => {
        // 이 목록의 파일 경로가 하나라도 틀리면 설치가 실패합니다.
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

/* ===== 6) Fetch 이벤트 처리 (린넨실과 동일한 전략) ===== */

// 6-1) 네비게이션 요청 (HTML 페이지 로드) - 네트워크 우선
async function handleNavigation(request) {
  try {
    // 1. 네트워크에서 최신 버전을 가져옵니다. (리버시.html 등)
    const fresh = await fetch(request, { cache: 'no-store' });
    return fresh;
  } catch (e) {
    // 2. 오프라인/네트워크 실패 시 캐시에서 기본 페이지(앱 셸)를 반환합니다.
    console.warn('[SW] Navigation failed, serving shell from cache.', e);
    const cache = await caches.open(CACHE_NAME);
    // 오프라인일 때 리버시.html을 요청해도 index.html을 보여줍니다.
    return (await cache.match(`${BASE_PATH}index.html`))
           || (await cache.match(PRECACHE_FILES[0])); // 루트
  }
}

// 6-2) 정적 자원 (JS, CSS, 이미지 등) - Stale-While-Revalidate
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(res => {
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  }).catch(err => {
    console.warn('[SW] Asset fetch failed:', err);
    return null;
  });

  return cached || (await fetchPromise);
}

// 6-3) 메인 Fetch 이벤트 리스너
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // [수정] 1. 페이지 이동 요청인 경우 (HTML)
    if (req.mode === 'navigate') {
        event.respondWith(handleNavigation(req));
        return;
    }

    // [수정] 2. "내부" 자원(JS, CSS, 로컬 이미지 등) 요청인 경우
    // (Firebase 같은 외부 요청은 이 조건에 해당하지 않음)
    if (url.origin === self.location.origin) {
        // [신규] 단, Firebase DB/Auth 요청은 서비스 워커가 처리하지 않도록 예외 처리
        if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebaseapp.com')) {
             return; // 즉시 네트워크로 보냄
        }
        event.respondWith(handleAsset(req));
        return;
    }

    // [수정] 3. 위 2가지(네비게이션, 로컬파일) 외의 모든 요청(Firebase DB, 폰트 등)은
    // 서비스 워커가 "절대" 건드리지 않고 브라우저가 직접 처리하도록 즉시 반환합니다.
    return;
});
