// Real-browser regressions for the arcade worker, served at a Pages-style
// subdirectory. Run: CHROMIUM_PATH=/usr/bin/chromium node tests/service-worker.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");

// waitForFunction treats a returned Promise as truthy before its false result
// is known. Await cache reads in Node, then poll the resulting boolean.
async function waitForCache(predicate) {
  const deadline = Date.now() + 10000;
  do {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  throw new Error("The expected worker cache write did not finish within 10 seconds");
}

const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const requests = [];
let revision = "one";
let activeWarm = 0;
let peakWarm = 0;
const fixtures = {
  "/kid-games/": ["text/html", "<!doctype html><title>Arcade fixture</title><a href='games/fixture/'>Play</a>"],
  "/kid-games/games/fixture/": ["text/html", `<!doctype html><title>Offline game</title>
    <link rel='stylesheet' href='./screen.css?v=one&amp;theme=bright'>
    <script type='module' src='./main.mjs?v=one'></script>
    <template><img src='./large.webp'><audio src='./narration.mp3'></audio></template>`],
  "/kid-games/games/fixture/main.mjs": ["text/javascript", `import { label } from './dependency.mjs?v=one';
    import './side-effect.mjs';
    export { unused } from './re-export.mjs';
    window.playedLabel = label;
    window.loadBonus = () => import('./bonus.mjs');
    // import '/outside/ignored.mjs';
    // import 'https://example.invalid/ignored.mjs';`],
  "/kid-games/games/fixture/dependency.mjs": ["text/javascript", "import { value } from './nested.mjs'; export const label = 'learning-' + value;"],
  "/kid-games/games/fixture/nested.mjs": ["text/javascript", "export const value = 'works';"],
  "/kid-games/games/fixture/re-export.mjs": ["text/javascript", "export const unused = 1;"],
  "/kid-games/games/fixture/side-effect.mjs": ["text/javascript", "window.sideEffectWorked = true;"],
  "/kid-games/games/fixture/bonus.mjs": ["text/javascript", "export const bonus = 7;"],
  "/kid-games/games/fixture/screen.css": ["text/css", "@import './theme.css'; body { color: green; }"],
  "/kid-games/games/fixture/theme.css": ["text/css", "body { background: white; }"],
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  requests.push(url.pathname + url.search);
  res.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/kid-games/sw.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" }).end(worker);
    return;
  }
  if (url.pathname === "/kid-games/games/redirect/") {
    res.writeHead(302, { Location: "/outside/redirected/" }).end();
    return;
  }
  if (url.pathname === "/kid-games/fresh.mjs") {
    res.writeHead(200, { "Content-Type": "text/javascript" }).end(`export default '${revision}';`);
    return;
  }
  if (url.pathname === "/kid-games/clip.mp3") {
    res.writeHead(206, { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-1/6" }).end("ab");
    return;
  }
  if (url.pathname === "/outside/data.txt") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("outside-network");
    return;
  }
  if (url.pathname === "/kid-games/games/bounded/") {
    const body = Array.from({ length: 450 }, (_, i) => `<script src='./code-${i}.mjs'></script>`).join("");
    res.writeHead(200, { "Content-Type": "text/html" }).end(body);
    return;
  }
  if (/^\/kid-games\/games\/bounded\/code-\d+\.mjs$/.test(url.pathname)) {
    activeWarm++;
    peakWarm = Math.max(peakWarm, activeWarm);
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "text/javascript" }).end("export const value = 1;");
      activeWarm--;
    }, 8);
    return;
  }
  const fixture = fixtures[url.pathname];
  if (fixture) {
    res.writeHead(200, { "Content-Type": fixture[0] }).end(fixture[1]);
    return;
  }
  // The worker's install shell uses small dummy assets in this fixture.
  if (/^\/kid-games\/(?:assets\/|manifest\.webmanifest)/.test(url.pathname)) {
    res.writeHead(200, { "Content-Type": url.pathname.endsWith(".css") ? "text/css" : "text/javascript" }).end("");
    return;
  }
  res.writeHead(404).end("missing fixture");
});

(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      headless: true,
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/kid-games/");
    const ownedCache = await page.evaluate(async () => {
      await caches.open("unrelated-app");
      await caches.open("arcade-%2Fother-project%2F-v1");
      await caches.open("arcade-%2Fkid-games%2F-old");
      await caches.open("arcade-v11");
      const outside = await caches.open("unrelated-app");
      await outside.put("/outside/data.txt", new Response("outside-stale-cache"));
      await navigator.serviceWorker.register("/kid-games/sw.js");
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
      const keys = await caches.keys();
      return keys.find((key) => key.startsWith("arcade-%2Fkid-games%2F-") && !key.endsWith("-old"));
    });
    const cacheNames = await page.evaluate(() => caches.keys());
    assert(ownedCache, "Worker did not create a scope-specific cache");
    for (const key of ["unrelated-app", "arcade-%2Fother-project%2F-v1", "arcade-v11"]) {
      assert(cacheNames.includes(key), `Worker removed another app's cache: ${key}`);
    }
    assert(!cacheNames.includes("arcade-%2Fkid-games%2F-old"), "Worker left its own obsolete cache");

    await page.evaluate(() => {
      const urls = [null, {}, "https://example.invalid/", "../outside/", "/kid-games-sibling/", "games/redirect/", "games/fixture/"];
      navigator.serviceWorker.controller.postMessage({ warm: urls });
      navigator.serviceWorker.controller.postMessage({ warm: ["games/fixture/", "games/fixture/"] });
    });
    await waitForCache(() => page.evaluate(async (name) => {
      const cache = await caches.open(name);
      return (await cache.match("/kid-games/games/fixture/bonus.mjs")) &&
        (await cache.match("/kid-games/games/fixture/nested.mjs")) &&
        (await cache.match("/kid-games/games/fixture/theme.css"));
    }, ownedCache));
    assert.equal(requests.filter((p) => p === "/kid-games/games/fixture/").length, 1, "Duplicate warm messages redownloaded the same page");
    assert(!requests.some((p) => /^\/(?:outside|kid-games-sibling)\//.test(p)), "Warming fetched outside the worker scope");
    assert(!requests.some((p) => /large\.webp|narration\.mp3/.test(p)), "Warming downloaded media");
    const warmedKeys = await page.evaluate(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url), ownedCache);
    assert(warmedKeys.some((u) => u.endsWith("screen.css?v=one&theme=bright")), "HTML query parameters were not preserved");
    assert(warmedKeys.some((u) => u.endsWith("re-export.mjs")), "Re-export dependency was not warmed");

    assert.equal(await page.evaluate(async () => (await fetch("/outside/data.txt")).text()), "outside-network", "Worker intercepted another project's URL");
    assert.match(await page.evaluate(async () => (await fetch("fresh.mjs")).text()), /'one'/);
    revision = "two";
    assert.match(await page.evaluate(async () => (await fetch("fresh.mjs")).text()), /'two'/, "A .mjs request returned stale code");
    await waitForCache(() => page.evaluate(async (name) => {
      const response = await (await caches.open(name)).match("/kid-games/fresh.mjs");
      return response && (await response.text()).includes("'two'");
    }, ownedCache));
    const partial = await page.evaluate(async () => {
      const response = await fetch("clip.mp3", { headers: { Range: "bytes=0-1" } });
      return { status: response.status, body: await response.text() };
    });
    assert.deepEqual(partial, { status: 206, body: "ab" });
    assert.equal(await page.evaluate(async (name) => !!(await (await caches.open(name)).match("/kid-games/clip.mp3")), ownedCache), false, "A partial media response was cached");

    await page.evaluate(() => navigator.serviceWorker.controller.postMessage({ warm: ["games/bounded/"] }));
    await waitForCache(() => page.evaluate(async (name) => !!(await (await caches.open(name)).match("/kid-games/games/bounded/code-382.mjs")), ownedCache));
    assert.equal(requests.filter((p) => /\/bounded\/code-/.test(p)).length, 383, "Warm resource limit was not enforced");
    assert(peakWarm <= 4, `Warming exceeded its concurrency bound: ${peakWarm}`);

    await context.setOffline(true);
    await page.goto(base + "/kid-games/games/fixture/");
    await page.waitForFunction(() => window.playedLabel === "learning-works" && window.sideEffectWorked);
    assert.equal(await page.evaluate(async () => (await window.loadBonus()).bonus), 7, "A warmed dynamic import failed offline");
    assert.match(await page.evaluate(async () => (await fetch("/kid-games/fresh.mjs")).text()), /'two'/, "Latest module was not saved for offline use");
    await page.goto(base + "/kid-games/games/unvisited/");
    assert.equal(page.url(), base + "/kid-games/", "Offline fallback left arcade links relative to an unvisited game");
    assert.equal(await page.title(), "Arcade fixture");
    assert.deepEqual(errors, []);
    console.log("PASS: scoped cache cleanup, safe bounded warming, module refresh, nested/dynamic imports offline, partial responses, correct fallback URL");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
