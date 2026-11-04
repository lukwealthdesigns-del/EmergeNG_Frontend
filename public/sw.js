/* EmergeNG service worker — app shell + static assets only. Never touches /api or any cross-origin API traffic. */
const VERSION = "v1";
const SHELL = `emergeng-shell-${VERSION}`;
const ASSETS = `emergeng-assets-${VERSION}`;
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).catch(() => {}));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("emergeng-") && ![SHELL, ASSETS].includes(k) && !k.startsWith("emergeng-private")) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) {
    // Map tiles / fonts: let the browser handle them (no caching of third-party API traffic).
    return;
  }
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/health")) return; // never cache the API
  // Navigations: network first, fall back to the cached shell so every route opens offline (client-side router takes over).
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { const res = await fetch(req); const c = await caches.open(SHELL); c.put("/index.html", res.clone()).catch(() => {}); return res; }
      catch { return (await caches.match("/index.html")) || (await caches.match("/")) || new Response("Offline. In an emergency call 112.", { status: 503, headers: { "Content-Type": "text/plain" } }); }
    })());
    return;
  }
  // Hashed build assets: cache-first (immutable). Other static files: stale-while-revalidate.
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res;
    }));
    return;
  }
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

// Background Sync (Chromium): ask an open page to run the sync manager (it owns auth tokens, which the SW must not hold).
self.addEventListener("sync", (e) => {
  if (e.tag === "emergeng-outbox") e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => cs.forEach((c) => c.postMessage({ type: "SYNC_OUTBOX" }))));
});
