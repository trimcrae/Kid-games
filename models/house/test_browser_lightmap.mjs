// Baked-light sidecar contract (BAKED-LIGHTING-DESIGN.md) on a real export:
//   node models/house/test_browser_lightmap.mjs [export dir]   (default house-test/)
// An export without a bakedLight block passes as "not baked". Fast: hashes,
// counts and one pass over the UV pairs; the PNGs are only parsed, not decoded.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] || process.env.LIGHTMAP_DIR || join(here, '../../house-test'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(join(dir, 'house.json'), 'utf8'));
const d = manifest.bakedLight;
if (!d) {
  console.log('PASS no bakedLight block in', dir, '(house opens with live light only)');
  process.exit(0);
}
const mesh = gunzipSync(readFileSync(join(dir, 'house.mesh.gz')));
const vertices = mesh.length / 24;
assert.equal(d.version, 1);
assert.equal(d.encoding, 'gamma2.2');
assert.equal(d.meshSha256, manifest.meshSha256, 'bakedLight must bind the manifest mesh');
assert.equal(sha(mesh), manifest.meshSha256, 'mesh file must match its manifest hash');
if (manifest.ambientOcclusion) assert.equal(d.meshSha256, manifest.ambientOcclusion.meshSha256);
let covered = 0;
for (const g of manifest.groups) { assert.equal(g.offset, covered * 24); covered += g.count; }
assert.equal(covered, vertices, 'groups cover the whole mesh');

// UV sidecar: 2 x uint16 LE per vertex, sentinel pair or both inside [0, 1).
const raw = gunzipSync(readFileSync(join(dir, d.uv.url)));
assert.equal(d.uv.encoding, 'uint16-pair');
assert.equal(d.uv.vertexCount, vertices, 'UV vertex count equals mesh vertex count');
assert.equal(raw.length, vertices * 4, 'UV byte length equals 4 x vertices');
assert.equal(sha(raw), d.uv.sha256, 'raw UV hash');
const uv = new Uint16Array(raw.buffer, raw.byteOffset, raw.length / 2);
let baked = 0, half = 0, bakedInProps = 0;
const propRanges = manifest.groups.filter(g => g.prop).map(g => [g.offset / 24, g.offset / 24 + g.count]);
for (let i = 0; i < uv.length; i += 2) {
  const u = uv[i], v = uv[i + 1];
  if (u === 65535 && v === 65535) continue;
  if (u >= 65534 || v >= 65534) { half++; continue; }
  baked++;
  const vertex = i / 2;
  if (propRanges.some(([a, b]) => vertex >= a && vertex < b)) bakedInProps++;
}
assert.equal(half, 0, 'no half-sentinel or out-of-range UV (u, v must be < 65534 when baked)');
assert(baked > 0, 'some vertices are baked');
assert(baked < vertices, 'the prototype leaves unbaked vertices');
assert.equal(baked, d.uv.bakedVertices, 'bakedVertices matches the sidecar');
assert.equal(bakedInProps, 0, 'moving props stay unbaked');
// Unbaked glass keeps live light.
let glassBaked = 0;
for (const g of manifest.groups.filter(g => g.glass))
  for (let k = g.offset / 24; k < g.offset / 24 + g.count; k++)
    if (uv[2 * k] !== 65535) glassBaked++;
assert.equal(glassBaked, 0, 'glass stays unbaked');

// Pages: same-size 8-bit RGB PNGs, not colour managed, hashes as recorded.
const pages = Object.fromEntries(d.pages.map(p => [p.id, p]));
assert.deepEqual(Object.keys(pages).sort(), ['day', 'night']);
for (const p of Object.values(pages)) {
  const file = join(dir, p.url);
  assert(existsSync(file), p.url + ' exists');
  const png = readFileSync(file);
  assert.equal(sha(png), p.sha256, p.id + ' page hash');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', p.id + ' is a PNG');
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at), type = png.toString('ascii', at + 4, at + 8);
    chunks.push(type);
    if (type === 'IHDR') {
      assert.equal(png.readUInt32BE(at + 8), p.width, p.id + ' width');
      assert.equal(png.readUInt32BE(at + 12), p.height, p.id + ' height');
      assert.equal(png[at + 16], 8, p.id + ' 8-bit');
      assert.equal(png[at + 17], 2, p.id + ' RGB');
    }
    at += 12 + length;
  }
  for (const managed of ['gAMA', 'sRGB', 'iCCP', 'cHRM'])
    assert(!chunks.includes(managed), p.id + ' carries no colour-management chunk ' + managed);
  assert(p.scale > 0 && p.scale < 1e4, p.id + ' scale');
}
assert.equal(pages.day.width, pages.night.width);
assert.equal(pages.day.height, pages.night.height);
assert(Array.isArray(d.rooms) && d.rooms.length > 0);
assert(d.bake && d.bake.samples > 0 && d.bake.margin >= 4 && d.bake.objects > 0 && d.bake.texelsPerMetre > 0);
console.log(`PASS baked light in ${dir}: ${baked}/${vertices} vertices baked, ` +
  `${pages.day.width}x${pages.day.height} pages, scales day ${pages.day.scale} night ${pages.night.scale}`);
