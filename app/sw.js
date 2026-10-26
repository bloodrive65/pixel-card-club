// Pixel Card Club - offline support for the web / Home Screen version.
// Network first, always asking GitHub Pages for the newest files (skipping the browser's 10-minute cache),
// and falling back to the saved copy only when offline.
const CACHE = 'pcc-v6';
const CORE = [
  './', './index.html', './version.json', './manifest.webmanifest', './icon.png', './icon-180.png', './icon-192.png', './icon-512.png',
  './js/font.js', './js/engine.js', './js/cards.js', './js/western.js', './js/ui.js', './js/roster.js', './js/table.js',
  './js/games/blackjack.js', './js/games/solitaire.js', './js/games/gofish.js', './js/games/war.js', './js/games/crazy8.js',
  './js/games/spider.js', './js/games/holdem.js', './js/rulebook.js', './js/main.js'
];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) =>
    fetch(u, { cache: 'no-store' }).then((r) => r.ok && c.put(u, r)).catch(() => {})))));
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  // versions before 1.6.4 cannot update themselves, so reload any open copy of those once
  const legacy = keys.some((k) => /^pcc-v[1-4]$/.test(k));
  await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  await self.clients.claim();
  if (legacy) for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(c.url); } catch (_) {} }
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url); url.search = ''; // ?utm_source=... and similar tags do not matter
  const key = req.mode === 'navigate' ? new URL('./', self.registration.scope).href : url.href;
  e.respondWith(
    fetch(req.mode === 'navigate' ? key : req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key, { ignoreSearch: true }).then((r) => r || caches.match(req, { ignoreSearch: true })))
  );
});
