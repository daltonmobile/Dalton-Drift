// ═══════════════════════════════════════════
// service-worker.js — PWA offline cache
// ═══════════════════════════════════════════

const CACHE = 'dalton-drift-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/utils.js',
  '/js/sprites.js',
  '/js/audio.js',
  '/js/road.js',
  '/js/traffic.js',
  '/js/player.js',
  '/js/game.js',
  '/js/ui.js',
  '/js/achievements.js',
  '/js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
