// Une seule valeur à changer à chaque version (identique au ?v= de index.html).
const VERSION = '20261028-plus';
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
            './index.html',
            './style.css',
            './estimation.css',
            './print.css',
            './fiscal.js',
            './freshness.js',
            './gold-chart.js',
            './app.js',
            './estimation.js',
            './silver.js',
            './cours-plus.js',
            './c3e.js',
            './mobile.js',
            './alignment.js',
            './quick-prices.js',
            './print.js',
            './edit-fields.js',
            './update.js',
            './logo-cndo.png',
            './manifest.webmanifest',
            './icon.svg',
            './icon.png',
            './favicon.ico',
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
