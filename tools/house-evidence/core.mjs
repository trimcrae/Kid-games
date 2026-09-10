import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {aspects, checklist, rooms, initialQuestions} from './catalog.mjs';

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const defaultWorkspace = path.join(os.homedir(), '.codex', 'private', 'house-evidence');
export const reserveBytes = 10 * 1024 ** 3;
export const maxSessionBytes = 8 * 1024 ** 2;
const arr = Array.isArray;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const str = s => typeof s === 'string' && s.trim().length > 0;
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function isInside(parent, child) {
  const rel = path.relative(parent,child);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
// Resolve existing ancestors too: a junction/symlink must not route private data into Git.
export function resolvedLocation(location) {
  const absolute = path.resolve(location);
  if (fs.existsSync(absolute)) return fs.realpathSync(absolute);
  return path.join(resolvedLocation(path.dirname(absolute)),path.basename(absolute));
}
export function privateWorkspace(location) {
  const resolved = resolvedLocation(location);
  if (isInside(fs.realpathSync(repo),resolved)) throw new Error('Keep the private workspace outside the repository (and GitHub Pages).');
  return resolved;
}
export function privateArtifact(location,relative) {
  const workspace=privateWorkspace(location), output=path.resolve(workspace,relative);
  if (!isInside(workspace,output) || output === workspace) throw new Error('Artifact must stay within the private workspace.');
  let current=workspace;
  for (const part of path.relative(workspace,output).split(path.sep)) {
    current=path.join(current,part);
    try {
      const stat=fs.lstatSync(current); // lstat also catches dangling links.
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error('Private artifacts cannot use symbolic links, junctions or hard links.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!isInside(workspace,resolvedLocation(output))) throw new Error('Artifact resolves outside the private workspace.');
  return output;
}
export function headroom(location, expectedBytes = 0) {
  let existing = path.resolve(location);
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const stat = fs.statfsSync(existing);
  const freeBytes = stat.bavail * stat.bsize;
  if (freeBytes - expectedBytes < reserveBytes) throw new Error('Insufficient disk headroom: output must leave at least 10 GiB free.');
  return {freeBytes,expectedBytes,reserveBytes};
}
export function modelSnapshot() {
  const inventory = JSON.parse(fs.readFileSync(path.join(repo,'models/house/inventory.json'),'utf8'));
  const sourceFiles = [...inventory.source_files.map(n => `models/house/${n}`),
    'models/house/export_walkthrough.py','models/house/verify.py',
    'house-test/rooms.mjs','house-test/walkthrough.js','house-test/activities.mjs'];
  const currentGeneratorHash=digest(Buffer.concat(inventory.source_files.map(n => fs.readFileSync(path.join(repo,'models/house',n)))));
  return {generatorSha256:inventory.generator_sha256,generatedFromCurrentSources:currentGeneratorHash === inventory.generator_sha256,
    sourceHashes:Object.fromEntries(sourceFiles.map(f => [f,digest(fs.readFileSync(path.join(repo,f)))])),
    coordinateSystem:'metres; Blender (X,Y,Z) → browser (X,Z,-Y). Front -Y, rear +Y, wing +X. Positions and elevations are estimates.',
    sourceFiles,cameras:inventory.cameras,rooms,checklist,
    assets:inventory.assets.map(({name,collection,photos,confidence}) => ({name,collection,photos,confidence})),
    renderingLimit:'Browser currently omits procedural textures and modifiers, and forces roughness .83 / metalness 0. Verify realism in the game as well as Blender.'};
}
export function init(location) {
  const workspace = privateWorkspace(location);
  headroom(workspace,maxSessionBytes);
  fs.mkdirSync(workspace,{recursive:true});
  const session = {version:1,revision:0,createdAt:new Date().toISOString(),model:modelSnapshot(),
    videos:[],observations:[],reviews:[],reviewedRanges:[],questions:structuredClone(initialQuestions),changes:[]};
  fs.writeFileSync(privateArtifact(workspace,'session.json'),JSON.stringify(session,null,2)+'\n',{flag:'wx'});
  return session;
}
export function load(location) {
  const file = privateArtifact(location,'session.json');
  if (fs.statSync(file).size > maxSessionBytes) throw new Error('Session exceeds 8 MiB limit; split the review into smaller sessions.');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
export function validate(s) {
  const errors = [];
  const check = (ok,msg) => { if (!ok) errors.push(msg); };
  if (!s || s.version !== 1 || !Number.isInteger(s.revision) || s.revision < 0) return ['Invalid session version/revision'];
  if (!s.model || !arr(s.model.rooms) || !arr(s.model.assets) || !arr(s.model.cameras) || !arr(s.model.sourceFiles)) return ['Missing model snapshot'];
  for (const key of ['videos','observations','reviews','reviewedRanges','questions','changes']) {
    if (!arr(s[key]) || s[key].some(x => !x || typeof x !== 'object' || arr(x))) errors.push(`Invalid ${key} array`);
  }
  if (errors.length) return errors;
  const roomIds = new Set(s.model.rooms.map(r => r.id));
  const targets = new Set([...s.model.assets.map(a => `asset:${a.name}`),...s.model.cameras.map(c => `camera:${c}`),...s.model.sourceFiles.map(f => `file:${f}`)]);
  const videos = new Map(s.videos.map(v => [v.id,v]));
  const observations = new Map(s.observations.map(o => [o.id,o]));
  for (const key of ['videos','observations','questions','changes']) {
    const ids = s[key].map(x => x.id);
    check(ids.every(str) && new Set(ids).size === ids.length,`Missing/duplicate ${key} IDs`);
  }
  function range(r, label) {
    const video = videos.get(r.videoId);
    check(!!video,`${label}: unknown video`);
    check(finite(r.start) && finite(r.end) && r.start >= 0 && r.end >= r.start,`${label}: invalid time range`);
    if (video?.durationSeconds != null) check(r.end <= video.durationSeconds + .05,`${label}: exceeds video duration`);
  }
  function refs(ids,label) {
    check(arr(ids) && ids.every(id => observations.has(id)),`${label}: unknown observation reference`);
  }
  for (const v of s.videos) {
    check(/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.id),`Invalid video ID: ${v.id}`);
    check(str(v.label) && str(v.path) && path.isAbsolute(v.path),`${v.id}: missing label/absolute path`);
    check(/^[a-f0-9]{64}$/.test(v.sha256) && Number.isSafeInteger(v.bytes) && v.bytes > 0,`${v.id}: invalid source fingerprint`);
    check(v.durationSeconds === null || (finite(v.durationSeconds) && v.durationSeconds > 0),`${v.id}: invalid duration`);
    check(arr(v.transcript),`${v.id}: transcript must be an array`);
    for (const t of (arr(v.transcript) ? v.transcript : [])) {
      if (!t || typeof t !== 'object') { errors.push(`${v.id}: invalid transcript cue`); continue; }
      range({...t,videoId:v.id},`${v.id} transcript`);
      check(str(t.text) && typeof t.reviewed === 'boolean',`${v.id}: invalid transcript text/review flag`);
    }
  }
  for (const o of s.observations) {
    range(o,o.id);
    check(roomIds.has(o.roomId) && aspects.includes(o.aspect),`${o.id}: unknown room/aspect`);
    check(o.relatedRoomId == null || roomIds.has(o.relatedRoomId),`${o.id}: unknown adjoining room`);
    check(['visual','narration','measurement','inference'].includes(o.basis),`${o.id}: invalid evidence basis`);
    check(['low','medium','high'].includes(o.confidence),`${o.id}: invalid confidence`);
    check(str(o.statement) && str(o.viewpoint),`${o.id}: statement and standing/facing viewpoint required`);
    check(arr(o.targets) && o.targets.every(t => targets.has(t)),`${o.id}: unknown model target`);
    if (o.basis === 'measurement') {
      const m=o.measurement;
      check(m && finite(m.value) && m.value > 0 && ['m','cm','mm','ft','in','count'].includes(m.unit) && str(m.method) && str(m.uncertainty),`${o.id}: measurement needs positive value, unit, method and uncertainty`);
    }
  }
  const reviewKeys = new Set();
  for (const r of s.reviews) {
    const key = `${r.roomId}/${r.aspect}`;
    check(!reviewKeys.has(key),`${key}: duplicate coverage review`); reviewKeys.add(key);
    check(roomIds.has(r.roomId) && aspects.includes(r.aspect),`${key}: unknown room/aspect`);
    check(['partial','supported','conflict','unseen','not-applicable'].includes(r.status),`${key}: invalid coverage status`);
    refs(r.observationIds,key);
    const evidence = (arr(r.observationIds) ? r.observationIds : []).map(id => observations.get(id)).filter(Boolean);
    check(evidence.every(o => o.roomId === r.roomId && o.aspect === r.aspect),`${key}: evidence belongs to another room/aspect`);
    if (r.status === 'supported') check(evidence.some(o => o.basis !== 'inference'),`${key}: supported needs direct evidence`);
    if (['unseen','not-applicable','conflict'].includes(r.status)) check(str(r.note),`${key}: explanation required`);
  }
  for (const r of s.reviewedRanges) {
    range(r,'Reviewed range');
    check(r.end > r.start && ['visual','audio'].includes(r.channel),'Reviewed range needs a positive duration and visual/audio channel');
  }
  for (const q of s.questions) {
    check(roomIds.has(q.roomId) && str(q.question) && ['open','resolved'].includes(q.status),`${q.id}: invalid question`);
    refs(q.resolutionObservationIds,q.id);
    if (q.status === 'resolved') {
      const evidence=(arr(q.resolutionObservationIds) ? q.resolutionObservationIds : []).map(id => observations.get(id)).filter(Boolean);
      check(evidence.length > 0,`${q.id}: resolution needs evidence`);
      check(evidence.some(o => (o.roomId === q.roomId || o.relatedRoomId === q.roomId) && o.basis !== 'inference'),`${q.id}: resolution needs relevant direct evidence`);
    }
  }
  for (const c of s.changes) {
    refs(c.observationIds,c.id);
    check(str(c.summary) && ['proposed','applied','verified'].includes(c.status),`${c.id}: invalid change`);
    check(arr(c.targets) && c.targets.length > 0 && c.targets.every(t => targets.has(t)),`${c.id}: change needs exact model targets`);
    check(c.observationIds?.length > 0,`${c.id}: change needs evidence`);
    if (c.status === 'verified') check(str(c.verification),`${c.id}: verified change needs comparison/test receipt`);
  }
  return errors;
}
export function save(location, next, {allowSources = false} = {}) {
  const workspace = privateWorkspace(location);
  const errors = validate(next);
  if (errors.length) throw new Error(errors.slice(0,15).join('\n'));
  const lock=privateArtifact(workspace,'session.lock');
  try { fs.closeSync(fs.openSync(lock,'wx')); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Another writer or an interrupted save owns session.lock. Inspect it before retrying.'); throw error; }
  try {
  const current = load(workspace);
  if (current.revision !== next.revision) { const error = new Error('Session changed elsewhere; reload before saving.'); error.status = 409; throw error; }
  if (JSON.stringify(current.model) !== JSON.stringify(next.model)) throw new Error('The baseline model snapshot is immutable. Start a new session for a new baseline.');
  if (!allowSources) {
    const sourceIdentity = videos => videos.map(({durationSeconds,transcript,...identity}) => identity);
    if (JSON.stringify(sourceIdentity(current.videos)) !== JSON.stringify(sourceIdentity(next.videos))) throw new Error('Register video sources using the local CLI.');
    for (const v of next.videos) {
      const duration = current.videos.find(x => x.id === v.id).durationSeconds;
      if (duration !== null && duration !== v.durationSeconds) throw new Error('Existing source duration cannot change in the reviewer.');
    }
  }
  const result = {...next,revision:next.revision+1,updatedAt:new Date().toISOString()};
  const bytes = JSON.stringify(result,null,2)+'\n';
  if (Buffer.byteLength(bytes) > maxSessionBytes) throw new Error('Session exceeds 8 MiB limit.');
  headroom(workspace,Buffer.byteLength(bytes)*3);
  const file = privateArtifact(workspace,'session.json');
  const temporary = privateArtifact(workspace,'session.json.tmp');
  const backup = privateArtifact(workspace,'session.json.bak');
  // Bounded recovery: one previous ledger; originals and frames are never removed.
  fs.writeFileSync(temporary,bytes,{flag:'wx'});
  try { fs.copyFileSync(file,backup); fs.renameSync(temporary,file); }
  catch (error) { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); throw error; }
  return result;
  } finally { fs.unlinkSync(lock); }
}
export function coveredRanges(ranges, duration) {
  const merged = [];
  for (const r of [...ranges].sort((a,b) => a.start-b.start)) {
    const start = Math.max(0,r.start), end = Math.min(duration,r.end);
    if (end <= start) continue;
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1],end);
    else merged.push([start,end]);
  }
  const gaps = []; let cursor = 0;
  for (const [start,end] of merged) { if (start > cursor) gaps.push([cursor,start]); cursor=end; }
  if (cursor < duration) gaps.push([cursor,duration]);
  return {seconds:merged.reduce((n,[a,b]) => n+b-a,0),gaps};
}
export function report(s) {
  const errors = validate(s);
  if (errors.length) throw new Error(errors.join('\n'));
  const warnings = [];
  if (s.model.generatedFromCurrentSources === false) warnings.push('Generated house inventory was already stale at intake. Rebuild and verify it before comparing model changes.');
  if (!s.videos.length) warnings.push('No walkthroughs registered. All video coverage is still unreviewed.');
  for (const [f,hash] of Object.entries(s.model.sourceHashes || {})) {
    if (!fs.existsSync(path.join(repo,f)) || digest(fs.readFileSync(path.join(repo,f))) !== hash) warnings.push(`Model baseline changed: ${f}. Reconcile observations before applying edits.`);
  }
  warnings.push(s.model.renderingLimit);
  for (const r of s.reviews.filter(r => r.status === 'supported')) {
    const evidence = s.observations.filter(o => r.observationIds.includes(o.id));
    if (['layout','openings'].includes(r.aspect) && new Set(evidence.filter(o => o.basis === 'visual').map(o => o.viewpoint.trim())).size < 2) warnings.push(`${r.roomId}/${r.aspect}: needs visual checks from opposing viewpoints; evidence support is not complete coverage.`);
    if (r.aspect === 'dimensions' && !evidence.some(o => o.basis === 'measurement')) warnings.push(`${r.roomId}: dimensions remain estimated; no measurement evidence recorded.`);
  }
  const videoReports = s.videos.map(v => {
    if (v.durationSeconds === null) warnings.push(`${v.label}: duration unknown; open the video or register with ffprobe to audit full coverage.`);
    if (v.transcript.some(t => !t.reviewed)) warnings.push(`${v.label}: imported transcript contains unverified narration.`);
    const visual = coveredRanges(s.reviewedRanges.filter(r => r.videoId === v.id && r.channel === 'visual'),v.durationSeconds ?? 0);
    const audio = coveredRanges(s.reviewedRanges.filter(r => r.videoId === v.id && r.channel === 'audio'),v.durationSeconds ?? 0);
    return {id:v.id,label:v.label,durationSeconds:v.durationSeconds,visualReviewedSeconds:visual.seconds,audioReviewedSeconds:audio.seconds,
      visualGaps:v.durationSeconds === null ? null : visual.gaps,audioGaps:v.durationSeconds === null ? null : audio.gaps};
  });
  return {rooms:s.model.rooms.map(r => ({id:r.id,name:r.name,aspects:Object.fromEntries(aspects.map(a => [a,s.reviews.find(x => x.roomId === r.id && x.aspect === a)?.status || 'unreviewed']))})),
    videos:videoReports,openQuestions:s.questions.filter(q => q.status === 'open'),warnings,
    changes:s.changes,observationCount:s.observations.length};
}
export async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export function probe(file, executable = 'ffprobe') {
  const p = spawnSync(executable,['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});
  if (p.error?.code === 'ENOENT') return null;
  if (p.error || p.status !== 0) throw new Error('ffprobe could not inspect this video. Check the file or executable path.');
  const data = JSON.parse(p.stdout);
  if (!data.streams?.some(s => s.codec_type === 'video')) throw new Error('Source has no video stream.');
  const duration = Number(data.format?.duration);
  return {durationSeconds:finite(duration) && duration > 0 ? duration : null,
    streams:data.streams.map(({codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels,tags,side_data_list}) =>
      ({codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels,rotation:side_data_list?.find(x => x.rotation != null)?.rotation ?? tags?.rotate ?? null}))};
}
export async function addVideo(location,file,id,options = {}) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('Video ID must use lowercase letters, numbers and hyphens (max 80).');
  const source = fs.realpathSync(file), stat = fs.statSync(source);
  if (!stat.isFile() || stat.size <= 0) throw new Error('Source must be a nonempty video file.');
  if (isInside(repo,source)) {
    // The homeowner's local drop folder is deliberately excluded from deployment.
    // Refuse all other repository paths and any reference already tracked by Git.
    const relative=path.relative(repo,source);
    const ignored=spawnSync('git',['check-ignore','--quiet','--',relative],{cwd:repo,windowsHide:true});
    const tracked=spawnSync('git',['ls-files','--error-unmatch','--',relative],{cwd:repo,windowsHide:true});
    if (!isInside(path.join(repo,'House Tours'),source) || ignored.status !== 0 || tracked.status !== 1) throw new Error('Keep originals outside the repository or in its untracked, Git-ignored House Tours folder.');
  }
  if (isInside(privateWorkspace(location),source)) throw new Error('Keep originals outside the managed evidence workspace so ledger/frame writes cannot overwrite them.');
  const current = load(location);
  if (current.videos.some(v => v.id === id)) throw new Error('Video ID already registered.');
  const metadata = probe(source,options.ffprobe);
  const sha256 = await hashFile(source);
  if (current.videos.some(v => v.sha256 === sha256)) throw new Error('This exact video is already registered.');
  const after = fs.statSync(source);
  if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) throw new Error('Video changed during registration; finish copying it, then retry.');
  const durationSeconds = options.duration == null ? metadata?.durationSeconds ?? null : Number(options.duration);
  current.videos.push({id,label:options.label || path.basename(source),path:source,sha256,bytes:stat.size,mtimeMs:stat.mtimeMs,
    durationSeconds,metadata,transcript:[]});
  return save(location,current,{allowSources:true});
}
export function parseTranscript(text) {
  if (text.trim().startsWith('[')) return JSON.parse(text).map(t => ({start:t.start,end:t.end,text:t.text,reviewed:false}));
  const result = [];
  const time = token => token.replace(',','.').split(':').reduce((n,p) => n*60+Number(p),0);
  for (const block of text.replace(/^\uFEFF/,'').replace(/\r/g,'').split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    const i = lines.findIndex(line => line.includes('-->'));
    if (i < 0) continue;
    const match = lines[i].match(/^(\d{1,2}:\d{2}(?::\d{2})?[.,]\d+)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?[.,]\d+)/);
    if (!match) throw new Error('Invalid transcript timestamp. Use timed VTT, SRT or JSON cues.');
    result.push({start:time(match[1]),end:time(match[2]),text:lines.slice(i+1).join('\n'),reviewed:false});
  }
  if (!result.length) throw new Error('No timed transcript cues found.');
  return result;
}
