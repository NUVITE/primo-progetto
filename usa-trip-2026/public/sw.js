/**
 * Service worker orientato al risparmio di dati: negli USA il traffico e'
 * limitato, quindi tutto cio' che non cambia mai va scaricato una volta sola.
 *
 * - /_next/static/*  -> cache-first per sempre (i nomi contengono un hash:
 *                       quando cambia il contenuto cambia anche l'URL)
 * - font e icone     -> cache-first
 * - pagine           -> network-first con ricaduta sulla cache, cosi' si vedono
 *                       gli aggiornamenti ma senza rete si naviga comunque
 *
 * I documenti personali (PDF) non finiscono qui di proposito: restano nella
 * cache HTTP normale del browser, che si svuota insieme ai dati di navigazione.
 */

const STATIC_CACHE = "usa2026-static-v2";
const PAGE_CACHE = "usa2026-pages-v2";
const KEEP = [STATIC_CACHE, PAGE_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(woff2?|png|svg|jpg|jpeg|webp)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Mai intercettare login e download documenti: autenticazione e dati privati.
  if (url.pathname.startsWith("/login") || url.pathname.includes("/download")) return;

  // Risorse immutabili: se ce l'ho, non ripasso dalla rete.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pagine: prima la rete (per vedere gli orari aggiornati), poi la cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
    );
  }
});
