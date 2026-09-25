// Plan cleanup after reviewed images reach main. Does not delete anything.
// node tools/plan-adventure-cleanup.mjs --plan PRIVATE_PATH [--keep PENDING_JSON]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const planPath = option('--plan');
if (!planPath) throw Error('Provide --plan with a private output path outside the repository.');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativePlan = path.relative(repo, path.resolve(planPath));
if (!relativePlan.startsWith('..' + path.sep) && !path.isAbsolute(relativePlan)) throw Error('Keep the cleanup plan outside the repository.');
const codexHome = process.env.CODEX_HOME || path.join(process.env.USERPROFILE, '.codex');
const generatedRoot = path.join(codexHome, 'generated_images');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
const remoteMain = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
const protectedOriginals = new Set();
function protect(value) {
  if (typeof value === 'string' && /generated_images.*\.png$/i.test(value)) protectedOriginals.add(path.resolve(value).toLowerCase());
  else if (Array.isArray(value)) value.forEach(protect);
  else if (value && typeof value === 'object') Object.values(value).forEach(protect);
}
if (option('--keep')) protect(JSON.parse(fs.readFileSync(option('--keep'), 'utf8')));
const files = new Map();
for (const dir of fs.readdirSync(generatedRoot, { withFileTypes: true }).filter(d => d.isDirectory())) {
  const folder = path.join(generatedRoot, dir.name);
  for (const file of fs.readdirSync(folder, { withFileTypes: true }).filter(f => f.isFile() && f.name.endsWith('.png'))) {
    // Refuse ambiguous filenames instead of selecting a possibly unrelated original.
    files.set(file.name, files.has(file.name) ? null : path.join(folder, file.name));
  }
}
const published = new Map(git('ls-tree', '-r', remoteMain).split('\n').flatMap(line => {
  const match = line.match(/^\d+ blob (\w+)\t(.+)$/);
  return match ? [[match[2], match[1]]] : [];
}));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
// A task may scope cleanup to another generated-image collection with the same receipts.
const base = path.resolve(repo, option('--asset-dir') || 'games/adventure/art/generated');
const relativeBase = path.relative(repo, base);
if (!relativeBase || relativeBase.startsWith('..') || path.isAbsolute(relativeBase)) throw Error('Asset directory must be inside the repository.');
const items = [];
for (const file of fs.readdirSync(path.join(base, 'receipts')).filter(f => f.endsWith('.json'))) {
  const receipt = path.join(base, 'receipts', file);
  const r = JSON.parse(fs.readFileSync(receipt));
  const source = files.get(r.originalFile);
  if (!r.reviewed || !source || protectedOriginals.has(path.resolve(source).toLowerCase())) continue;
  const retained = path.join(base, r.file);
  const relative = path.relative(repo, retained).replaceAll(path.sep, '/');
  if (!published.has(relative)) continue;
  const sourceBytes = fs.readFileSync(source), finalBytes = fs.readFileSync(retained);
  if (hash(sourceBytes) !== r.originalSha256 || hash(finalBytes) !== r.sha256) throw Error(`Image changed: ${r.file}`);
  const blob = crypto.createHash('sha1').update(`blob ${finalBytes.length}\0`).update(finalBytes).digest('hex');
  if (blob !== published.get(relative)) continue;
  // Both image and receipt must be published, not merely present in the worktree.
  const receiptRelative = path.relative(repo, receipt).replaceAll(path.sep, '/');
  if (!published.has(receiptRelative)) continue;
  const publishedReceipt = JSON.parse(git('show', `${remoteMain}:${receiptRelative}`));
  if (publishedReceipt.sha256 !== r.sha256 || publishedReceipt.originalSha256 !== r.originalSha256 || !publishedReceipt.reviewed) continue;
  items.push({ source, sourceSha256: r.originalSha256, bytes: sourceBytes.length, retained, retainedSha256: r.sha256, gitBlob: blob, receipt });
}
fs.writeFileSync(planPath, JSON.stringify({ created: new Date().toISOString(), remoteMain, generatedRoot, repo, protectedOriginals: [...protectedOriginals], items }, null, 2) + '\n');
console.log(JSON.stringify({ eligibleOriginals: items.length, reclaimBytes: items.reduce((n, i) => n + i.bytes, 0), plan: planPath }));
