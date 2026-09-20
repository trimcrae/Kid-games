#!/usr/bin/env node
/* ===========================================================
   fetch-expedition-panoramas.mjs — real 360° viewpoints.
   -----------------------------------------------------------
   For each expedition in games/photo-expedition/panoramas-manifest.json,
   finds a free-licensed equirectangular (360°) photograph on Wikimedia
   Commons, so the game can put a "Look around for real" viewpoint in the
   3D world: the photographer stands inside the real place, turns around,
   and takes pictures with the same camera.

   Only true 2:1 panoramas filed as panoramas are accepted, with the place
   named in the title or categories. Saves panoramas/<site>.jpg and writes
   panoramas/manifest.js with the photographer, licence and source page.

   Runs in GitHub Actions (open internet). Usage:
     node tools/fetch-expedition-panoramas.mjs [--force]
   =========================================================== */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAME = resolve(ROOT, "games/photo-expedition");
const MANIFEST = resolve(GAME, "panoramas-manifest.json");
const OUT_DIR = resolve(GAME, "panoramas");
const OUT_MANIFEST = resolve(OUT_DIR, "manifest.js");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "kid-games-photo-expedition/1.0 (https://github.com/trimcrae/kid-games; family arcade viewpoints)";
const FORCE = process.argv.includes("--force");
const exists = (p) => access(p).then(() => true).catch(() => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params, attempt = 1) {
  const url = API + "?" + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) { if (attempt >= 4) throw e; await sleep(1500 * attempt); return api(params, attempt + 1); }
}
const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function search(q) {
  const data = await api({ action: "query", list: "search", srsearch: q, srnamespace: "6", srlimit: "30" });
  if (data.error) return [];
  return (data.query && data.query.search ? data.query.search : []).map((r) => r.title);
}
async function infos(titles, width) {
  const data = await api({ action: "query", titles: titles.join("|"), prop: "imageinfo|categories", cllimit: "100", iiprop: "url|size|mime|extmetadata", iiurlwidth: String(width) });
  const pages = (data.query && data.query.pages) || [];
  return pages.filter((p) => p.imageinfo && p.imageinfo[0]).map((p) => ({ title: p.title, cats: (p.categories || []).map((c) => c.title), ...p.imageinfo[0] }));
}
function reject(info, entry) {
  if (info.mime !== "image/jpeg") return "not jpeg";
  const ratio = info.width / info.height;
  if (Math.abs(ratio - 2) > 0.06) return "not 2:1 (" + ratio.toFixed(2) + ")";
  if (info.width < 3000) return "small";
  const meta = info.extmetadata || {};
  const lic = String((meta.LicenseShortName || {}).value || "").toLowerCase();
  if (/nc|nd/.test(lic) || lic === "") return "licence";
  if (String((meta.Restrictions || {}).value || "")) return "restricted";
  const strong = [info.title, strip((meta.ObjectName || {}).value), info.cats.join(" | ")].join(" \n ");
  if (!/equirectangular|360°|360 degree|spherical panorama|photo sphere|photosphere|panoram|LG-R105|Theta|Insta360|Gear 360|GoPro Max|Mapillary/i.test(strong)) return "not filed as a panorama";
  if (/interior|indoor|museum|church|cathedral|mosque|station|shop|office|hotel|room|hall|inside/i.test(strong)) return "indoors";
  if (/Mapillary|LG-R105/i.test(strong)) return "handheld sphere (photographer in frame)";
  if (!entry.must.some((m) => new RegExp(m, "i").test(strong))) return "no must match";
  return "";
}
async function find(entry, width, used) {
  for (const term of entry.terms) {
    const titles = (await search(term + " -interior -indoor")).filter((t) => !used.has(t));
    await sleep(250);
    for (let i = 0; i < titles.length; i += 10) {
      const batch = await infos(titles.slice(i, i + 10), width);
      const why = {}; let pick = null, fallback = null;
      for (const x of batch) {
        const r = reject(x, entry); why[r || "ok"] = (why[r || "ok"] || 0) + 1; if (r) continue;
        // handheld Mapillary spheres usually have the photographer's arm in the bottom of the frame: last resort only
        if (/Mapillary/i.test(x.title)) { if (!fallback) fallback = x; } else if (!pick) pick = x;
      }
      console.log(`\n    ${term} → ${batch.length}: ${Object.entries(why).map(([k, v]) => k + "×" + v).join(", ")}`);
      if (pick) return pick;
      if (fallback && !entry._fallback) entry._fallback = fallback;
      await sleep(250);
    }
  }
  return entry._fallback || null;
}
async function download(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) { if (attempt >= 4) throw e; await sleep(2000 * attempt); return download(url, attempt + 1); }
}
async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  await mkdir(OUT_DIR, { recursive: true });
  let credits = {};
  try { const src = await readFile(OUT_MANIFEST, "utf8"); const m = src.match(/=\s*(\{[\s\S]*\});?\s*$/); credits = m ? JSON.parse(m[1]) : {}; } catch (e) {}
  const used = new Set(Object.values(credits).map((c) => "File:" + c.title));
  let fetched = 0, failed = 0;
  for (const entry of manifest.entries) {
    const file = resolve(OUT_DIR, entry.site + ".jpg");
    if (!FORCE && credits[entry.site] && (await exists(file))) continue;
    process.stdout.write(`• ${entry.site} … `);
    try {
      const pick = await find(entry, manifest.width || 4096, used);
      if (!pick) { console.log("nothing suitable"); failed++; continue; }
      const buf = await download(pick.thumburl || pick.url);
      await writeFile(file, buf);
      const meta = pick.extmetadata || {};
      credits[entry.site] = { file: entry.site + ".jpg", title: pick.title.replace(/^File:/, ""), artist: strip((meta.Artist || {}).value).slice(0, 120), license: strip((meta.LicenseShortName || {}).value), licenseUrl: strip((meta.LicenseUrl || {}).value), page: pick.descriptionurl, width: pick.thumbwidth || pick.width, height: pick.thumbheight || pick.height };
      used.add(pick.title); fetched++;
      console.log(`${credits[entry.site].title} (${Math.round(buf.length / 1024)} KB, ${credits[entry.site].license})`);
    } catch (e) { failed++; console.log("failed: " + (e && e.message ? e.message : e)); }
  }
  await writeFile(OUT_MANIFEST, "/* Generated by tools/fetch-expedition-panoramas.mjs — do not edit by hand.\n   Real 360° photographs from Wikimedia Commons, one per expedition, with their credits. */\nwindow.PANORAMA_MANIFEST = " + JSON.stringify(credits, null, 1) + ";\n");
  console.log(`\nDone: ${fetched} fetched, ${failed} without a panorama.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
