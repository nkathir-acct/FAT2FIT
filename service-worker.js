/* ==========================================================================
   FAT2FIT — SERVICE WORKER
   ==========================================================================
   Caches the app shell (markup, styles, logic, content, icons) so the app
   loads instantly on repeat visits and keeps working once installed to the
   Home Screen, even with a poor or absent connection. Exercise videos and
   muscle images are intentionally left uncached here — they're user-
   supplied and may be added/replaced after this file is deployed.

   Bump CACHE_NAME whenever a shell file changes, so returning visitors get
   the new version instead of a stale cached copy.
   ========================================================================== */

const CACHE_NAME = "fat2fit-shell-v2";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./script.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell, falling back to the network (and quietly
// updating the cache) for anything else — including exercise media. If a
// request is neither cached nor reachable (e.g. offline, media never
// downloaded), the fetch simply fails as it normally would.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
