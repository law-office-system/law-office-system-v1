// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — Law Office Management System
// Strategy: Stale-While-Revalidate for static assets
//           Network-First for navigation (HTML pages)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'law-office-v2';
const STATIC_CACHE = 'law-office-static-v2';

// الملفات اللي هنخزنها فوراً (App Shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// امتدادات الملفات الثابتة
const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot'
];

// ─── INSTALL: تخزين الـ App Shell ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVATE: تنظيف الـ Caches القديمة ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ─── FETCH: استراتيجيات الـ Caching ─────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الـ requests اللي مش GET
  if (request.method !== 'GET') return;

  // ─── 1. Navigation requests (HTML pages) → Network First ───
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // لو مفيش cache، رجع صفحة fallback
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // ─── 2. Firebase / Google APIs → Pass Through (مش هنخزنهم) ───
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // ─── 3. Static Assets (JS, CSS, Images, Fonts) → Stale-While-Revalidate ───
  const isStatic = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          // جلب النسخة الجديدة في الخلفية
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // لو الفشل ومفيش cache، رجع error
              if (!cached) {
                return new Response('Offline', { status: 503 });
              }
              return cached;
            });

          // رجع الـ cache فوراً لو موجود، ولو مش موجود استنى الـ network
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // ─── 4. باقي الـ requests → Cache First ───
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request);
    })
  );
});

// ─── MESSAGE: استقبال أوامر من الـ Main Thread ──────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});