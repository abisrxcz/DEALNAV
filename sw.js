// ============================================================================
// ---> deal offline service worker <---
// ============================================================================
//-> UI Navigation & Layout Guide:
//-> Displays: Background Service Worker providing Progressive Web App (PWA) offline caching and resilience.
//-> User Interactions: Intercepts network requests and serves cached assets seamlessly when operating in low or no-signal dockside conditions.
//->
//-> =========================================================================
//-> WORKFLOW: Service Worker Offline Caching Lifecycle
//-> 1. Install Phase: Pre-caches critical app shell assets ('/' and '/index.html').
//-> 2. Activate Phase: Claims immediate control of active clients without waiting for page reloads.
//-> 3. Fetch Phase: Implements stale-while-revalidate / network-first caching for local assets and CDN dependencies.
//-> =========================================================================

const C = 'deal-v6';
const OPTIONAL_ASSETS = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

//-> Event Handler: Service Worker Install
//-> Purpose: Pre-caches core application shell assets into CacheStorage for instant offline startup.
//-> Parameters: e (ExtendableEvent) - Service worker install event.
//-> State Updates: Opens CacheStorage container named 'deal-v4'.
//-> Storage / API Calls: Uses caches.open(C) and cache.addAll(['/', '/index.html']).
//-> Dynamic UI Updates: Invokes self.skipWaiting() to activate service worker immediately.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(async c => {
    await c.addAll(['/', '/index.html', '/config.js']);
    await Promise.allSettled(OPTIONAL_ASSETS.map(url => c.add(new Request(url, { mode: 'no-cors' }))));
  }));
  self.skipWaiting();
});

//-> Event Handler: Service Worker Activate
//-> Purpose: Deletes old cache versions (so stale pages and data are dropped) and asserts immediate client control across all open browser windows and tabs.
//-> Parameters: e (ExtendableEvent) - Service worker activation event.
//-> State Updates: None.
//-> Storage / API Calls: Calls self.clients.claim().
//-> Dynamic UI Updates: Ensures all running tabs are managed by this service worker version.
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));

//-> Event Handler: Service Worker Fetch
//-> Purpose: Intercepts GET requests, attempts network retrieval with runtime cache updates, and provides offline fallback to cached index.html.
//-> Parameters: e (FetchEvent) - Service worker network fetch event.
//-> State Updates: Clones and stores successful responses into 'deal-v4' cache.
//-> Storage / API Calls: Executes window.fetch(e.request) and caches.match(e.request).
//-> Dynamic UI Updates: Transparently returns cached response or index.html shell when disconnected from internet.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url), same = u.origin === location.origin;
  if (e.request.method !== 'GET' || (!same && !['cdn.jsdelivr.net', 'cdn.tailwindcss.com'].includes(u.hostname))) return;
  e.respondWith(
    fetch(e.request).then(async r => {
      const k = r.clone();
      if (r.ok || r.type === 'opaque') await caches.open(C).then(c => c.put(e.request, k)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || (same && e.request.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
  );
});
