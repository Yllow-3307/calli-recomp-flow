/* Service Worker — Calli Recomp Tracker
 * Stratégie : réseau d'abord pour les pages (repli cache hors-ligne),
 * cache d'abord pour les assets statiques hashés par Vite.
 * Les appels API (Supabase, auth) ne sont JAMAIS interceptés ni mis en cache.
 * V11.0 : ajout du listener push pour les notifications.
 */
const VERSION = "v4";
const CACHE_NAME = `calli-recomp-${VERSION}`;
const OFFLINE_URL = "/";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Pré-cache tolérant : si une ressource manque, l'install du SW ne plante pas.
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url).catch(() => undefined))),
      )
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

// ── Gestion des notifications push (V11.0) ───────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Rappel Calli Recomp",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/favicon-32.png",
      tag: data.tag || "calli-reminder",
      data: data.data || { url: "/" },
      vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(data.title || "Calli Recomp", options));
  } catch {
    // Fallback : message texte simple
    event.waitUntil(
      self.registration.showNotification("Calli Recomp", {
        body: event.data.text(),
        icon: "/icon-192.png",
        tag: "calli-reminder",
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "navigate", url });
          return;
        }
      }
      if (clients.openWindow) clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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
