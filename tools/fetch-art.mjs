#!/usr/bin/env node
/* ===========================================================
   fetch-art.mjs — generate the arcade's story art from prompts.
   -----------------------------------------------------------
   Reads assets/art/art-manifest.json and, for every entry whose
   output file does not yet exist, fetches a generated image from
   Pollinations (free, no API key) and saves it into the repo.

   This is meant to run in GitHub Actions (see
   .github/workflows/generate-art.yml), where the runner has open
   internet — it will NOT work from sandboxes that block outbound
   image hosts. The committed PNGs are what ships; the live site
   never calls the API at runtime.

   Usage:
     node tools/fetch-art.mjs            # fetch only missing files
     node tools/fetch-art.mjs --force    # re-fetch everything
     node tools/fetch-art.mjs --only id1,id2
   =========================================================== */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = resolve(ROOT, "assets/art/art-manifest.json");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only"));
const ONLY = onlyArg ? new Set((onlyArg.split("=")[1] || args[args.indexOf(onlyArg) + 1] || "").split(",").filter(Boolean)) : null;

const exists = (p) => access(p).then(() => true).catch(() => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUrl(entry, styleSuffix) {
  const prompt = (entry.prompt + (styleSuffix || "")).trim();
  const params = new URLSearchParams({
    width: String(entry.width || 512),
    height: String(entry.height || 512),
    seed: String(entry.seed != null ? entry.seed : 42),
    nologo: "true",
    model: entry.model || "flux"
  });
  return "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?" + params.toString();
}

async function fetchImage(url, attempt = 1) {
  const MAX = 4;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "kid-games-art-bot" } });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) throw new Error("not an image (" + type + ")");
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (attempt >= MAX) throw e;
    const wait = Math.pow(2, attempt) * 1000;
    console.log(`   retry ${attempt}/${MAX - 1} in ${wait / 1000}s (${e.message})`);
    await sleep(wait);
    return fetchImage(url, attempt + 1);
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const images = manifest.images || [];
  const suffix = manifest.styleSuffix || "";
  let made = 0, skipped = 0, failed = 0;

  for (const entry of images) {
    if (ONLY && !ONLY.has(entry.id)) continue;
    const outPath = resolve(ROOT, entry.out);
    if (!FORCE && (await exists(outPath))) { skipped++; console.log(`• skip   ${entry.out} (exists)`); continue; }
    const url = buildUrl(entry, suffix);
    console.log(`• fetch  ${entry.id} -> ${entry.out}`);
    try {
      const buf = await fetchImage(url);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, buf);
      made++;
      console.log(`   saved ${buf.length} bytes`);
    } catch (e) {
      failed++;
      console.error(`   FAILED ${entry.id}: ${e.message}`);
    }
  }

  console.log(`\nDone. ${made} generated, ${skipped} skipped, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
