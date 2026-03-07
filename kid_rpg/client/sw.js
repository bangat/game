const CACHE_NAME = 'kid-rpg-pwa-v1';
const CORE_ASSETS = [
    '/',
    '/manifest.webmanifest',
    '/client/index.html',
    '/client/styles.css',
    '/client/app.js',
    '/client/assets/skins/dark-fantasy/manifest.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch((error) => {
            console.error('sw install failed', error);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
            return Promise.resolve();
        }));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);

    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                return await fetch(event.request);
            } catch (error) {
                const cache = await caches.open(CACHE_NAME);
                return cache.match('/client/index.html');
            }
        })());
        return;
    }

    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) {
            fetch(event.request).then((response) => {
                if (response.ok) cache.put(event.request, response.clone());
            }).catch(() => {});
            return cached;
        }
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
    })());
});
