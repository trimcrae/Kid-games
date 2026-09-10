import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {load,privateWorkspace,privateArtifact,headroom,hashFile,digest} from './core.mjs';

// No packages, codecs or models are downloaded. Reuse a local ffmpeg if supplied.
export function extractionPlan(video,options={}) {
  const limit = Number(options.limit ?? 80), interval = Number(options.interval ?? 15);
  if (!Number.isInteger(limit) || limit < 1 || limit > 120) throw new Error('Frame limit must be 1–120.');
  if (!Number.isFinite(interval) || interval <= 0) throw new Error('Interval must be positive seconds.');
  const duration = video.durationSeconds;
  if (!(duration > 0)) throw new Error('Video duration is unknown. Open it in the reviewer or add the source with --duration seconds.');
  let times;
  if (options.times != null) {
    times = [...new Set(options.times.split(',').map(x => Number(x.trim())))].sort((a,b) => a-b);
    if (times.some(t => !Number.isFinite(t) || t < 0 || t >= duration)) throw new Error('Sample timestamps must be within the source duration.');
    if (times.length > limit) throw new Error('Requested timestamps exceed the frame limit.');
  } else {
    // If capped, distribute the overview across the whole video, not only its start.
    const count = Math.min(limit,Math.ceil(duration/interval));
    const step = Math.max(interval,duration/count);
    times = Array.from({length:count},(_,i) => Number((i*step).toFixed(3))).filter(t => t < duration);
  }
  if (!times.length) throw new Error('No frame timestamps requested.');
  return {videoId:video.id,sourceSha256:video.sha256,times,maxSide:1280,
    expectedBytes:times.length*2*1024**2,
    note:'Overview samples are not a complete review. Revisit transitions, reverse angles, details and narration in the original. Requested times have source-frame precision.'};
}
export async function extract(location,id,options={}) {
  const workspace = privateWorkspace(location);
  const video = load(workspace).videos.find(v => v.id === id);
  if (!video) throw new Error('Unknown video ID.');
  const plan = extractionPlan(video,options);
  const storage = headroom(workspace,plan.expectedBytes);
  if (options.plan) return {...plan,storage};
  const ffmpeg = options.ffmpeg || 'ffmpeg';
  const available = spawnSync(ffmpeg,['-version'],{windowsHide:true,timeout:10000,maxBuffer:8192});
  if (available.error || available.status !== 0) throw new Error('No working local ffmpeg found. Pass --ffmpeg <installed executable>. The browser reviewer works without it.');
  if (await hashFile(video.path) !== video.sha256) throw new Error('Source fingerprint changed; refusing to extract from different footage.');
  const signature = digest(JSON.stringify(plan)).slice(0,12);
  const output = privateArtifact(workspace,path.join('frames',id,signature));
  if (fs.existsSync(output)) throw new Error(`This sample batch already exists at ${output}. Reuse its frames; partial batches retain evidence for inspection.`);
  fs.mkdirSync(output,{recursive:true});
  const receipt = {...plan,createdAt:new Date().toISOString(),complete:false,frames:[]};
  const receiptFile = privateArtifact(workspace,path.relative(workspace,path.join(output,'receipt.json')));
  const writeReceipt = () => fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
  writeReceipt();
  const before=fs.statSync(video.path);
  const checkSource=() => {
    const now=fs.statSync(video.path);
    if (now.size !== before.size || now.mtimeMs !== before.mtimeMs) {
      receipt.error='Source changed during extraction; frames are not verified against the registered original.'; writeReceipt();
      throw new Error(receipt.error);
    }
  };
  for (const [index,time] of plan.times.entries()) {
    checkSource();
    headroom(output,2*1024**2);
    const file = `frame-${String(index+1).padStart(3,'0')}-${time.toFixed(3)}s.jpg`;
    privateArtifact(workspace,path.relative(workspace,path.join(output,file)));
    const p = spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-n','-ss',String(time),'-i',video.path,
      '-map','0:v:0','-frames:v','1','-vf','scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-q:v','3',path.join(output,file)],{windowsHide:true,timeout:60000,maxBuffer:16384});
    if (p.error || p.status !== 0 || !fs.existsSync(path.join(output,file))) throw new Error(`Frame extraction failed at ${time}s; receipt preserves successful frames in ${output}.`);
    const bytes = fs.statSync(path.join(output,file)).size;
    receipt.frames.push({file,requestedSeconds:time,bytes,sha256:await hashFile(path.join(output,file))});
    writeReceipt();
    if (bytes > 2*1024**2) throw new Error('Frame exceeded the 2 MiB per-frame budget. Partial receipt retained.');
    options.progress?.(`Frame ${index+1}/${plan.times.length}: ${time}s`);
  }
  checkSource();
  if (await hashFile(video.path) !== video.sha256) {
    receipt.error='Source hash changed during extraction; batch remains unverified.'; writeReceipt(); throw new Error(receipt.error);
  }
  receipt.complete=true; writeReceipt();
  return {output,frames:receipt.frames.length,bytes:receipt.frames.reduce((n,f) => n+f.bytes,0)};
}
