// Une seule valeur à changer à chaque version (identique au ?v= de index.html).
const VERSION = '20261025-weekend';
const CACHE = 'mon-or-' + VERSION;
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c =>
        c.addAll(
          [
            './',
            './gold-chart.js',
            './pc-theme.css',
            './index.html',
            './edit-fields.js',
            './quick-prices.js',
            './quick-prices.css',
            './freshness.js',
            './app.js',
            './fiscal.js',
            './estimation.js',
            './estimation.css',
            './silver.js',
            './c3e.js',
            './mobile.js',
            './alignment.js',
            './calculs-goldapp.css',
            './mobile.css',
            './update.js',
            './print.js',
            './print.css',
            './logo-cndo.png',
            './manifest.webmanifest',
            './icon.svg',
          ]
            .flatMap(url => (/\.(js|css)$/.test(url) ? [url, url + '?v=' + VERSION] : [url]))
            .map(url => new Request(url, { cache: 'reload' }))
        )
      )
  );
});
self.addEventListener('activate', e =>
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    ])
  )
);
self.addEventListener('fetch', e => {
  if (
    new URL(e.request.url).origin !== self.location.origin ||
    new URL(e.request.url).pathname.includes('/api/')
  )
    return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => {
        if (r.ok && e.request.method === 'GET') {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
