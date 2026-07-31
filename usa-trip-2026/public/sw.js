const CACHE_NAME = "usa2026-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-network-race solo per le navigazioni di pagina (non per le chiamate RSC/API interne di Next,
// né per /login o i download documenti): se manca la connessione, mostra l'ultima versione vista.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/login") || url.pathname.includes("/download")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
