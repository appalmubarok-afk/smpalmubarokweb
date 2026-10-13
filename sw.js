/* Service Worker SMP IT Al Mubarok
 * - Halaman (navigasi): jaringan dulu, kalau offline pakai salinan terakhir / offline.html
 * - Aset statis satu domain (gambar, css, font): tampil cepat dari cache lalu diperbarui diam-diam
 * - Permintaan data ke Apps Script (script.google.com) TIDAK pernah disentuh -> data selalu terbaru
 * Naikkan VERSI kalau mau memaksa semua HP membuang cache lama. */
const VERSI = 'v1';
const CACHE_APP = 'smpit-app-' + VERSI;
const CACHE_CDN = 'smpit-cdn-' + VERSI;
const PRECACHE = ['/offline.html', '/logo.png'];
const CDN_BOLEH = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(function (c) { return c.addAll(PRECACHE); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('smpit-') === 0 && k !== CACHE_APP && k !== CACHE_CDN;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function staleWhileRevalidate(req, namaCache) {
  return caches.open(namaCache).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var ambil = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || ambil;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Halaman utama / navigasi
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && url.origin === self.location.origin) {
          var salinan = res.clone();
          caches.open(CACHE_APP).then(function (c) { c.put('/', salinan); });
        }
        return res;
      }).catch(function () {
        return caches.match('/').then(function (hit) {
          return hit || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // Aset satu domain
  if (url.origin === self.location.origin) {
    if (url.pathname === '/sw.js') return;
    e.respondWith(staleWhileRevalidate(req, CACHE_APP));
    return;
  }

  // CDN yang dipakai situs (FontAwesome, SweetAlert, font)
  if (CDN_BOLEH.indexOf(url.hostname) !== -1) {
    e.respondWith(staleWhileRevalidate(req, CACHE_CDN));
    return;
  }
  // Selain itu (Apps Script, YouTube, Google Translate, dll) -> biarkan langsung ke jaringan
});
