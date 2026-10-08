// Zuqio service worker: önce ağdan dener (güncellemeler hemen gelsin),
// bağlantı yoksa son kaydedilen sürümü gösterir.
const CACHE = 'zuqio-v6';
const ASSETS = ['./', 'index.html', 'app.js', 'questions.js', 'questions-en.js', 'firebase-config.js', 'manifest.webmanifest',
  'ic0.png', 'ic1.png', 'ic2.png', 'ic3.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'google-g.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
