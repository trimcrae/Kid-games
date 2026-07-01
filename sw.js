/* ===========================================================
   Service worker — makes the whole arcade work offline
   (car rides!) once it has been visited.

   Strategy, deliberately boring and safe:
     • Pages (navigations): network FIRST, so a deploy always
       shows up on the next online visit; cached copy only when
       offline.
     • Everything else (css/js/images/audio): serve from cache,
       refresh the cache in the background (stale-while-revalidate).
     • One versioned cache — bump VERSION to flush everything.
   =========================================================== */

const VERSION = "v1";
const CACHE = "arcade-" + VERSION;

const CORE = [
  "./",
  "assets/css/style.css",
  "assets/js/games.js",
  "assets/js/app.js",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The landing page posts {warm: ["games/…/", …]} after registering.
   We fetch each game page and the local scripts/styles it references,
   so every game works offline even before its first play. (Audio and
   images still cache lazily on first play — they're big.) */
self.addEventListener("message", (e) => {
  const urls = e.data && e.data.warm;
  if (!Array.isArray(urls)) return;
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(urls.map((u) => warmPage(cache, u).catch(() => {})))
    )
  );
});

function warmPage(cache, url) {
  const pageUrl = new URL(url, self.registration.scope).href;
  return fetch(pageUrl).then((res) => {
    if (!res.ok) return;
    cache.put(pageUrl, res.clone());
    return res.text().then((html) => {
      const subs = [];
      const re = /(?:src|href)="([^"]+\.(?:js|css))"/g;
      let m;
      while ((m = re.exec(html))) {
        if (!/^https?:/.test(m[1])) subs.push(new URL(m[1], pageUrl).href);
      }
      return Promise.all(subs.map((s) =>
        caches.match(s).then((hit) => hit || fetch(s).then((r) => { if (r.ok) cache.put(s, r.clone()); }).catch(() => {}))
      ));
    });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
