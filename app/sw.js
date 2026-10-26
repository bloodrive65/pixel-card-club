// Pixel Card Club - offline support for the web / Home Screen version.
// Network first (so updates show up right away), falling back to the cached copy when offline.
const CACHE = 'pcc-v2';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([
    './', './index.html', './manifest.webmanifest', './icon.png', './icon-180.png', './icon-192.png', './icon-512.png',
    './js/font.js', './js/engine.js', './js/cards.js', './js/western.js', './js/ui.js', './js/roster.js', './js/table.js',
    './js/games/blackjack.js', './js/games/solitaire.js', './js/games/gofish.js', './js/games/war.js', './js/games/crazy8.js',
    './js/games/spider.js', './js/games/holdem.js', './js/rulebook.js', './js/main.js'
  ]).catch(() => {})));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
