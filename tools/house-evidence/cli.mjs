#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {defaultWorkspace,init,load,save,validate,report,addVideo,parseTranscript,hashFile} from './core.mjs';
import {startServer} from './server.mjs';
import {extract} from './extract.mjs';

const help = `Private house walkthrough evidence (Node, no install)

  init                         Create a private session and current model baseline
  add-video --file PATH --id ID Register an original in place; SHA-256, no copy
      [--label NAME] [--ffprobe PATH] [--duration SECONDS]
  serve [--port 8766]           Review video, narration, evidence and gaps locally
  transcript --id ID --file PATH Import timed VTT/SRT/JSON as UNVERIFIED narration
  extract --id ID [--plan]      Budget / extract up to 80 overview JPEGs
      [--times 12,23.5] [--interval 15] [--limit 80] [--ffmpeg PATH]
  check [--hash]                Validate links/ranges; optionally rehash originals
  report                       Print room, audio/video coverage and open questions

All commands accept --workspace PATH (must be outside this repository).
Default: ${defaultWorkspace}
Originals, transcripts, frames and session.json stay local; no uploads or ASR.
Original videos with audio play in the reviewer. ffprobe/ffmpeg are optional.
`;
function argumentsFor(argv) {
  const [command='help',...args]=argv; const options={};
  const flags = new Set(['plan','hash','help']);
  const allowed = new Set(['workspace','file','id','label','ffprobe','duration','port','times','interval','limit','ffmpeg',...flags]);
  for (let i=0;i<args.length;i++) {
    const name=args[i].replace(/^--/,'');
    if (!args[i].startsWith('--') || !allowed.has(name)) throw new Error(`Unknown option: ${args[i]}`);
    if (flags.has(name)) options[name]=true;
    else { if (!args[i+1] || args[i+1].startsWith('--')) throw new Error(`Missing --${name} value`); options[name]=args[++i]; }
  }
  return {command,options};
}
try {
  const {command,options}=argumentsFor(process.argv.slice(2));
  const workspace=options.workspace || defaultWorkspace;
  const required = key => { if (!options[key]) throw new Error(`--${key} is required`); return options[key]; };
  if (command === 'help' || command === '--help' || options.help) console.log(help);
  else if (command === 'init') {
    const s=init(workspace); console.log(`Ready: ${path.resolve(workspace)}\n${s.model.rooms.length} real rooms; ${s.questions.length} priority questions; no footage reviewed.`);
  } else if (command === 'add-video') {
    const s=await addVideo(workspace,required('file'),required('id'),options);
    console.log(`Registered ${s.videos.at(-1).id} in place. Duration: ${s.videos.at(-1).durationSeconds ?? 'unknown (open in reviewer)'}.`);
  } else if (command === 'serve') {
    const port=Number(options.port ?? 8766);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be 1024–65535.');
    const server=await startServer(workspace,port);
    console.log(`Review: http://127.0.0.1:${server.address().port}\nPrivate workspace: ${path.resolve(workspace)}\nCtrl+C stops the local server.`);
  } else if (command === 'transcript') {
    const s=load(workspace), video=s.videos.find(v => v.id === required('id'));
    if (!video) throw new Error('Unknown video ID.');
    if (video.transcript.length) throw new Error('Transcript already present; review/edit it in session.json instead of overwriting it.');
    const file=required('file');
    if (fs.statSync(file).size > 4*1024**2) throw new Error('Transcript exceeds 4 MiB limit.');
    video.transcript=parseTranscript(fs.readFileSync(file,'utf8'));
    save(workspace,s); console.log(`Imported ${video.transcript.length} unverified cues. Listen and correct against the original narration.`);
  } else if (command === 'extract') {
    console.log(JSON.stringify(await extract(workspace,required('id'),{...options,progress:console.log}),null,2));
  } else if (command === 'check') {
    const s=load(workspace), errors=validate(s);
    for (const v of s.videos) {
      if (!fs.existsSync(v.path)) errors.push(`${v.id}: source file missing`);
      else if (fs.statSync(v.path).size !== v.bytes) errors.push(`${v.id}: source size changed`);
      else if (v.mtimeMs != null && fs.statSync(v.path).mtimeMs !== v.mtimeMs) errors.push(`${v.id}: source modification time changed`);
      else if (options.hash && await hashFile(v.path) !== v.sha256) errors.push(`${v.id}: source hash changed`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`Valid evidence ledger: ${s.videos.length} videos, ${s.observations.length} observations. Validation is not confirmation of house accuracy.`);
  } else if (command === 'report') {
    const r=report(load(workspace));
    console.log(`Evidence: ${r.observationCount} observations\nRoom | layout | openings | dimensions | materials | furniture | lighting`);
    for (const room of r.rooms) console.log(`${room.name} | ${Object.values(room.aspects).join(' | ')}`);
    for (const v of r.videos) console.log(`${v.label}: visual ${v.visualReviewedSeconds}s, audio ${v.audioReviewedSeconds}s / ${v.durationSeconds ?? 'unknown'}s\n  Visual gaps ${JSON.stringify(v.visualGaps)}; audio gaps ${JSON.stringify(v.audioGaps)}`);
    console.log('\nOpen questions:'); for (const q of r.openQuestions) console.log(`- ${q.id}: ${q.question}`);
    console.log('\nReview notes:'); for (const w of r.warnings) console.log(`- ${w}`);
  } else throw new Error(`Unknown command: ${command}. Run with --help.`);
} catch (error) { console.error(error.message); process.exitCode=1; }
