// PULSO·CAFÉ — service worker
// Estrategia: cache-first para el cascarón de la app, red primero para todo lo demás.

const CACHE_NAME = "pulso-cafe-v1";
const ARCHIVOS_NUCLEO = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_NUCLEO))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo interceptamos peticiones GET del mismo origen o el cascarón principal
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;

      return fetch(request)
        .then((respuestaRed) => {
          // Cachea copias de recursos propios (no de CDNs externos) para uso offline futuro
          if (request.url.startsWith(self.location.origin)) {
            const copia = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return respuestaRed;
        })
        .catch(() => {
          // Si no hay red y no está en caché, ofrece el cascarón principal como respaldo
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
