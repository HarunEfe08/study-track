// Service worker: site internet yokken de açılsın diye.
// Önce internetten almayı deniyor (güncel dosya gelsin), olmazsa önbellekten veriyor.
const SURUM = "studytrack-v5";
const DOSYALAR = [
  "./", "index.html", "css/stil.css",
  "js/mantik.js", "js/depolama.js", "js/yardimcilar.js", "js/ekranlar.js", "js/uygulama.js",
  "tema/tema.css", "tema/tema.js", "tema/manifest.webmanifest",
  "tema/simge-192.png", "tema/simge-512.png", "tema/simge-maskable-512.png", "tema/gizlilik.html"
];

self.addEventListener("install", function (olay) {
  olay.waitUntil(
    caches.open(SURUM).then(function (onbellek) {
      // biri bulunamazsa hepsi bozulmasın 
      return Promise.allSettled(DOSYALAR.map(function (d) { return onbellek.add(d); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

// eski sürümlerin önbelleğini sil
self.addEventListener("activate", function (olay) {
  olay.waitUntil(
    caches.keys().then(function (adlar) {
      return Promise.all(adlar.filter(function (a) { return a !== SURUM; }).map(function (a) { return caches.delete(a); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (olay) {
  const istek = olay.request;
  if (istek.method !== "GET" || new URL(istek.url).origin !== self.location.origin) return;

  olay.respondWith(
    fetch(istek).then(function (yanit) {
      if (yanit.ok) {
        const kopya = yanit.clone();
        caches.open(SURUM).then(function (onbellek) { onbellek.put(istek, kopya); });
      }
      return yanit;
    }).catch(function () {
      return caches.match(istek).then(function (kayitli) {
        return kayitli || caches.match("index.html");
      });
    })
  );
});
