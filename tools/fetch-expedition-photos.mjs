#!/usr/bin/env node
/* ===========================================================
   fetch-expedition-photos.mjs — real photographs for Photo Expedition.
   -----------------------------------------------------------
   Reads games/photo-expedition/photos-manifest.json and, for every
   entry whose file is missing, asks Wikimedia Commons for its
   FEATURED PICTURES (then Quality Images) matching the entry's search
   terms. Featured pictures are the best photographs on Commons, judged
   by the community, and every one is free to use with a credit — which
   is exactly the "National Geographic level" the field guide wants.

   Each photo is saved at a sensible width into
   games/photo-expedition/photos/<id>.jpg and the photographer, licence
   and source page are written to photos/manifest.js, which the game
   reads to show a proper credit under every picture.

   Runs in GitHub Actions (see .github/workflows/fetch-expedition-photos.yml)
   because sandboxed dev environments cannot reach commons.wikimedia.org.

   Usage:
     node tools/fetch-expedition-photos.mjs            # only missing photos
     node tools/fetch-expedition-photos.mjs --force    # re-fetch everything
     node tools/fetch-expedition-photos.mjs --only lion,zebra
   =========================================================== */
import { readFile, writeFile, mkdir, access, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAME = resolve(ROOT, "games/photo-expedition");
const MANIFEST = resolve(GAME, "photos-manifest.json");
const OUT_DIR = resolve(GAME, "photos");
const OUT_MANIFEST = resolve(OUT_DIR, "manifest.js");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "kid-games-photo-expedition/1.0 (https://github.com/trimcrae/kid-games; family arcade field guide)";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only"));
const ONLY = onlyArg ? new Set((onlyArg.split("=")[1] || args[args.indexOf(onlyArg) + 1] || "").split(",").filter(Boolean)) : null;

const exists = (p) => access(p).then(() => true).catch(() => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Pools searched in order. Featured pictures first — the cream of Commons.
   Never fall through to an unreviewed search: this is a kids' game. */
const POOLS = [
  'incategory:"Featured pictures on Wikimedia Commons"',
  'incategory:"Quality images"'
];
/* keep the field guide to living animals in the wild */
const EXCLUDE = " -skull -skeleton -taxidermy -carcass -hunting -stuffed -statue -painting -drawing -map -stamp -coin";

async function api(params, attempt = 1) {
  const url = API + "?" + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    if (attempt >= 4) throw e;
    await sleep(1500 * attempt);
    return api(params, attempt + 1);
  }
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function search(query) {
  const data = await api({ action: "query", list: "search", srsearch: query, srnamespace: "6", srlimit: "25", srqiprofile: "classic" });
  return (data.query && data.query.search ? data.query.search : []).map((r) => r.title);
}

async function imageInfo(titles, width) {
  const data = await api({
    action: "query", titles: titles.join("|"), prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata", iiurlwidth: String(width)
  });
  const pages = (data.query && data.query.pages) || [];
  const byTitle = new Map();
  for (const p of pages) if (p.imageinfo && p.imageinfo[0]) byTitle.set(p.title, { title: p.title, ...p.imageinfo[0] });
  return titles.map((t) => byTitle.get(t)).filter(Boolean);
}

function acceptable(info) {
  if (info.mime !== "image/jpeg") return false;
  if (!info.width || !info.height) return false;
  const ratio = info.width / info.height;
  if (ratio < 1.15 || ratio > 2.2) return false;      // landscape, not panoramic strips
  if (info.width < 1400) return false;
  const meta = info.extmetadata || {};
  const lic = String((meta.LicenseShortName || {}).value || "").toLowerCase();
  if (/nc|nd/.test(lic) || lic === "") return false;   // only free licences
  if (String((meta.Restrictions || {}).value || "")) return false;
  return true;
}

async function findPhoto(entry, width) {
  for (const pool of POOLS) {
    for (const term of entry.terms) {
      const titles = await search(pool + " " + term + EXCLUDE);
      await sleep(250);
      if (!titles.length) continue;
      const infos = await imageInfo(titles.slice(0, 10), width);
      const pick = infos.find(acceptable);
      if (pick) return { pick, pool: pool.includes("Featured") ? "featured" : "quality", term };
      await sleep(250);
    }
  }
  return null;
}

async function download(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) throw new Error("not an image (" + type + ")");
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (attempt >= 4) throw e;
    await sleep(2000 * attempt);
    return download(url, attempt + 1);
  }
}

async function loadExisting() {
  try {
    const src = await readFile(OUT_MANIFEST, "utf8");
    const m = src.match(/=\s*(\{[\s\S]*\});?\s*$/);
    return m ? JSON.parse(m[1]) : {};
  } catch (e) { return {}; }
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const width = manifest.width || 1400;
  await mkdir(OUT_DIR, { recursive: true });
  const credits = await loadExisting();
  let fetched = 0, skipped = 0, failed = 0;

  for (const entry of manifest.entries) {
    if (ONLY && !ONLY.has(entry.id)) continue;
    const file = resolve(OUT_DIR, entry.id + ".jpg");
    if (!FORCE && credits[entry.id] && (await exists(file))) { skipped++; continue; }
    process.stdout.write(`• ${entry.id} … `);
    try {
      const found = await findPhoto(entry, width);
      if (!found) { console.log("nothing suitable found"); failed++; continue; }
      const { pick, pool, term } = found;
      const buf = await download(pick.thumburl || pick.url);
      await writeFile(file, buf);
      const meta = pick.extmetadata || {};
      credits[entry.id] = {
        file: entry.id + ".jpg",
        title: pick.title.replace(/^File:/, ""),
        artist: stripHtml((meta.Artist || {}).value).slice(0, 120),
        license: stripHtml((meta.LicenseShortName || {}).value),
        licenseUrl: stripHtml((meta.LicenseUrl || {}).value),
        page: pick.descriptionurl,
        pool, term,
        width: pick.thumbwidth || pick.width, height: pick.thumbheight || pick.height
      };
      fetched++;
      console.log(`${pool}: ${credits[entry.id].title} (${Math.round(buf.length / 1024)} KB, ${credits[entry.id].license})`);
      await sleep(400);
    } catch (e) {
      failed++;
      console.log("failed: " + (e && e.message ? e.message : e));
    }
  }

  const body = "/* Generated by tools/fetch-expedition-photos.mjs — do not edit by hand.\n" +
    "   Which real photographs exist in this folder, and who took them. Every one is a\n" +
    "   free-licensed Featured or Quality picture from Wikimedia Commons; the game shows\n" +
    "   the credit under each picture. */\n" +
    "window.PHOTO_MANIFEST = " + JSON.stringify(credits, null, 1) + ";\n";
  await writeFile(OUT_MANIFEST, body);
  console.log(`\nDone: ${fetched} fetched, ${skipped} already there, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
