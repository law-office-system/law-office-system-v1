// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — Law Office Management System
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'law-office-v4';
const STATIC_CACHE = 'law-office-static-v4';

const PRECACHE_ASSETS = ['/', '/index.html', '/favicon.svg'];
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot'];

// ─── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الـ requests اللي مش GET
  if (request.method !== 'GET') return;

  // تجاهل Firebase / Google APIs
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // ─── Navigation requests → Network First ───
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // ─── Static Assets → Stale-While-Revalidate ───
  const isStatic = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) cache.put(request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => cached || new Response('Offline', { status: 503 }));
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // ─── باقي الـ requests → Network First ───
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// ─── MESSAGE ──────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});