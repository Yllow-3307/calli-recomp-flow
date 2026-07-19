/* Service Worker — Calli Recomp Tracker
 * Stratégie : réseau d'abord pour les pages (repli cache hors-ligne),
 * cache d'abord pour les assets statiques hashés par Vite.
 * Les appels API (Supabase, auth) ne sont JAMAIS interceptés ni mis en cache.
 */
const VERSION = "v3";
const CACHE_NAME = `calli-recomp-${VERSION}`;
const OFFLINE_URL = "/";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // On ne touche qu'aux requêtes same-origin : les API (Supabase…) passent directement.
  if (url.origin !== self.location.origin) return;

  // Navigations (pages HTML) : réseau d'abord, repli sur le cache si hors-ligne
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Assets statiques (JS/CSS hashés, images, polices) : cache d'abord
  if (
    url.pathname.startsWith("/assets/") ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ico|webmanifest)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
