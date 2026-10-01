/* ===========================================================
   Service worker — keeps the arcade's visited pages available
   for car rides. Images and narration cache as they are played.

   Pages and code use the network first; artwork uses a cached
   copy while refreshing in the background. Warming follows only
   local code and styles, with a small queue and no media crawl.
   =========================================================== */

const VERSION = "v12";
const SCOPE = new URL(self.registration.scope);
// GitHub Pages projects share an origin, so each arcade scope owns
// its cache names as well as its URLs.
const CACHE_PREFIX = "arcade-" + encodeURIComponent(SCOPE.pathname) + "-";
const CACHE = CACHE_PREFIX + VERSION;

const CORE = [
  "./",
  "assets/css/style.css?v=20261001-improvements",
  "assets/js/games.js?v=20260915-mystery",
  "assets/js/app.js?v=20261001-improvements",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
];
const MAX_WARM_PAGES = 64;
const MAX_WARM_RESOURCES = 384;
const WARM_CONCURRENCY = 4;
const MAX_CODE_BYTES = 2 * 1024 * 1024;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE.map((u) => new URL(u, SCOPE).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function localUrl(value, base) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, base);
    if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return null;
    url.hash = "";
    return url;
  } catch (e) { return null; }
}

// Keep cache writes inside the event's lifetime, but never let a
// full cache or a partial media response interrupt the actual game.
async function remember(cache, request, response) {
  if (!response.ok || response.status === 206) return;
  const finalUrl = response.url && localUrl(response.url, SCOPE);
  if (response.url && !finalUrl) return;
  try { await cache.put(request, response.clone()); } catch (e) { /* storage may be full */ }
}

async function saveResponse(request, response) {
  // Clone before awaiting CacheStorage: the page may consume the body
  // as soon as respondWith returns the original response.
  const copy = response.clone();
  const cache = await caches.open(CACHE);
  await remember(cache, request, copy);
}

/* The landing page posts {warm: ["games/…/", …]}. Deduplicate its
   installing/ready messages and limit concurrent downloads. Literal
   static and dynamic imports include the 3D games' .mjs dependencies;
   image, audio and model files still download only when needed. */
const pendingPages = new Set();
const queuedPages = new Set();
let warmTask = null;

self.addEventListener("message", (e) => {
  const urls = e.data && e.data.warm;
  if (!Array.isArray(urls)) return;
  urls.slice(0, MAX_WARM_PAGES).forEach((value) => {
    const url = localUrl(value, SCOPE);
    if (!url || !(/\/$|\.html$/i.test(url.pathname)) || queuedPages.has(url.href)) return;
    if (queuedPages.size >= MAX_WARM_PAGES) return;
    queuedPages.add(url.href);
    pendingPages.add(url.href);
  });
  if (!pendingPages.size && !warmTask) return;
  if (!warmTask) {
    warmTask = (async () => {
      const cache = await caches.open(CACHE);
      while (pendingPages.size) {
        const pages = Array.from(pendingPages);
        pendingPages.clear();
        await warmPages(cache, pages);
      }
    })().catch(() => { /* offline or storage unavailable */ }).finally(() => {
      queuedPages.clear();
      warmTask = null;
    });
  }
  e.waitUntil(warmTask);
});

async function warmPages(cache, pages) {
  const queue = pages.map((url) => ({ url, page: true }));
  const seen = new Set(pages);

  function addCode(value, base) {
    const url = localUrl(value, base);
    if (!url || !/\.(?:m?js|css)$/i.test(url.pathname) || seen.has(url.href) || seen.size >= MAX_WARM_RESOURCES) return;
    seen.add(url.href);
    queue.push({ url: url.href, page: false });
  }

  async function warm(item) {
    try {
      const response = await fetch(item.url, { cache: "no-cache", redirect: "error" });
      if (!response.ok || !localUrl(response.url || item.url, SCOPE)) return;
      const length = Number(response.headers.get("content-length"));
      if (length > MAX_CODE_BYTES) return;
      const copy = response.clone();
      const source = await response.text();
      if (source.length > MAX_CODE_BYTES) return;
      // Await the write before inspecting dependencies or finishing the
      // message; unawaited puts can be lost when the worker goes idle.
      await remember(cache, item.url, copy);
      let match;
      if (item.page) {
        const attributes = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
        while ((match = attributes.exec(source))) addCode(match[1].replace(/&amp;/g, "&"), item.url);
      } else if (/\.css$/i.test(new URL(item.url).pathname)) {
        const imports = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi;
        while ((match = imports.exec(source))) addCode(match[1], item.url);
      } else {
        const imports = /\b(?:import|export)\s+(?:[^;"'()]*?\bfrom\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g;
        while ((match = imports.exec(source))) {
          const value = match[1] || match[2];
          // Bare module names need an import map, not URL resolution.
          if (/^(?:\.{1,2}\/|\/|https?:\/\/)/.test(value)) addCode(value, item.url);
        }
      }
    } catch (e) { /* a missing optional resource must not stop the queue */ }
  }

  while (queue.length) {
    await Promise.all(queue.splice(0, WARM_CONCURRENCY).map(warm));
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = localUrl(req.url, SCOPE);
  if (!url) return;

  if (req.mode === "navigate" || /\.(?:m?js|css)$/i.test(url.pathname)) {
    const fresh = fetch(req, { cache: "no-cache" });
    e.waitUntil(fresh.then((res) => saveResponse(req, res)).catch(() => {}));
    e.respondWith(fresh.catch(async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      if (req.mode === "navigate" && url.href !== SCOPE.href) return Response.redirect(SCOPE.href);
      return new Response("This page is not available offline yet.", { status: 503 });
    }));
    return;
  }

  const fresh = fetch(req);
  e.waitUntil(fresh.then((res) => saveResponse(req, res)).catch(() => {}));
  e.respondWith(caches.open(CACHE).then((cache) => cache.match(req)).then((cached) =>
    cached || fresh.catch(() => new Response("Not available offline yet.", { status: 503 }))
  ));
});
