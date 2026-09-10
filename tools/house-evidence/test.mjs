import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {init,load,save,validate,report,coveredRanges,repo,privateWorkspace,privateArtifact,addVideo,parseTranscript,hashFile,refreshBaseline} from './core.mjs';
import {byteRange,startServer} from './server.mjs';
import {extractionPlan} from './extract.mjs';

function fixture(t) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'house-evidence-test-'));
  t.after(() => {
    const resolved=fs.realpathSync(directory), parent=fs.realpathSync(os.tmpdir());
    assert.equal(path.dirname(resolved),parent);
    assert(path.basename(resolved).startsWith('house-evidence-test-'));
    fs.rmSync(resolved,{recursive:true});
  });
  const workspace=path.join(directory,'evidence');
  init(workspace); return workspace;
}
function source(s) {
  s.videos.push({id:'tour-1',label:'Synthetic',path:path.resolve(os.tmpdir(),'synthetic.webm'),sha256:'a'.repeat(64),bytes:100,durationSeconds:100,transcript:[]});
}
function observation(s) {
  s.observations.push({id:'obs-1',videoId:'tour-1',start:10,end:15,roomId:'kitchen',aspect:'layout',basis:'visual',confidence:'medium',
    statement:'Synthetic test observation',viewpoint:'Standing in doorway, facing sink',targets:['camera:kitchen'],relatedRoomId:'garage'});
}
test('baseline covers real destinations, preserves uncertainty and refuses publishing private files',t => {
  const dir=fixture(t), s=load(dir);
  assert.equal(s.model.rooms.length,23);
  assert(s.questions.some(q => q.id === 'ensuite-attachment' && q.status === 'open'));
  assert.equal(validate(s).length,0);
  assert(report(s).rooms.every(r => Object.values(r.aspects).every(v => v === 'unreviewed')));
  assert.throws(() => init(dir),/EEXIST/);
  assert.throws(() => privateWorkspace(path.join(repo,'private')),/outside/);
});
test('coverage unions overlaps, keeps audio separate and exposes all gaps',t => {
  assert.deepEqual(coveredRanges([{start:10,end:20},{start:15,end:35},{start:0,end:5},{start:35,end:40}],100),{seconds:35,gaps:[[5,10],[40,100]]});
  const s=load(fixture(t)); source(s); observation(s);
  s.reviewedRanges=[{videoId:'tour-1',start:0,end:20,channel:'visual'},{videoId:'tour-1',start:10,end:30,channel:'visual'}];
  const v=report(s).videos[0];
  assert.equal(v.visualReviewedSeconds,30); assert.equal(v.audioReviewedSeconds,0);
  assert.deepEqual(v.audioGaps,[[0,100]]);
  assert.equal(report(s).rooms.find(r => r.id === 'kitchen').aspects.layout,'unreviewed');
  s.videos[0].durationSeconds=null;
  assert.equal(report(s).videos[0].visualGaps,null);
});
test('evidence validates temporal/source links, exact model targets and direct support',t => {
  const s=load(fixture(t)); source(s); observation(s);
  assert.deepEqual(validate(s),[]);
  s.observations[0].end=101;
  assert(validate(s).some(e => e.includes('exceeds video')));
  s.observations[0].end=15; s.observations[0].targets=['asset:invented'];
  assert(validate(s).some(e => e.includes('unknown model target')));
  s.observations[0].targets=[]; s.observations[0].basis='inference';
  s.reviews=[{roomId:'kitchen',aspect:'layout',status:'supported',observationIds:['obs-1'],note:''}];
  assert(validate(s).some(e => e.includes('direct evidence')));
  s.observations[0].basis='visual';
  assert(report(s).warnings.some(w => w.includes('opposing viewpoints')));
  s.questions[0].status='resolved';
  assert(validate(s).some(e => e.includes('resolution needs evidence')));
  s.reviews[0].roomId='ensuite';
  assert(validate(s).some(e => e.includes('another room/aspect')));
  s.observations[0].basis='measurement';
  assert(validate(s).some(e => e.includes('measurement needs')));
  s.questions[0].resolutionObservationIds=['obs-1'];
  assert(validate(s).some(e => e.includes('relevant direct evidence')));
});
test('bounded ledger saves retain recovery and reject stale clients/source changes',t => {
  const dir=fixture(t), original=load(dir);
  const next=save(dir,original);
  assert.equal(next.revision,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'session.json.bak'))).revision,0);
  assert.throws(() => save(dir,original),/changed elsewhere/);
  const changed=load(dir); changed.model.cameras.push('invented');
  assert.throws(() => save(dir,changed),/immutable/);
  const injected=load(dir); source(injected);
  assert.throws(() => save(dir,injected),/Register video sources/);
});
test('registration fingerprints originals in place; duplicates rejected without copies',async t => {
  const dir=fixture(t), file=path.join(path.dirname(dir),'synthetic.webm');
  fs.writeFileSync(file,Buffer.from('synthetic source, no personal footage'));
  const options={duration:'12',ffprobe:path.join(dir,'missing-ffprobe')};
  const s=await addVideo(dir,file,'tour-1',options);
  assert.equal(s.videos[0].sha256,await hashFile(file));
  assert.equal(s.videos[0].path,fs.realpathSync(file));
  await assert.rejects(addVideo(dir,file,'tour-2',options),/already registered/);
  await assert.rejects(addVideo(dir,path.join(dir,'session.json'),'tour-3',options),/outside the managed/);
  assert.equal(fs.readFileSync(file,'utf8'),'synthetic source, no personal footage');
});
test('transcript import preserves timing/text and marks even claimed reviewed input unverified',() => {
  const cues=parseTranscript('WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nDoor on left.\n\n00:04.000 --> 00:05.000\nReverse angle.\n');
  assert.equal(cues[0].start,1); assert.equal(cues[0].end,3.5); assert.equal(cues[1].start,4);
  assert(cues.every(c => c.reviewed === false));
  assert.equal(parseTranscript('1\n00:01:02,100 --> 00:01:03,200\nNarration.')[0].start,62.1);
  assert.equal(parseTranscript('[{"start":0,"end":1,"text":"test","reviewed":true}]')[0].reviewed,false);
  assert.throws(() => parseTranscript('Untimed transcript'),/No timed/);
});
test('sampling plans span long videos, bound disk growth, reject out-of-range times',() => {
  const v={id:'tour-1',sha256:'a'.repeat(64),durationSeconds:3600};
  const p=extractionPlan(v,{limit:80});
  assert.equal(p.times.length,80); assert(p.times.at(-1)>3500);
  assert.equal(p.expectedBytes,160*1024**2);
  assert.throws(() => extractionPlan(v,{limit:121}),/1–120/);
  assert.throws(() => extractionPlan(v,{times:'-1,2'}),/within/);
  assert.throws(() => extractionPlan(v,{times:'3600'}),/within/);
  assert.throws(() => extractionPlan({...v,durationSeconds:null}),/unknown/);
});
test('HTTP byte ranges support seeking and suffixes and refuse invalid ranges',() => {
  assert.deepEqual(byteRange('bytes=2-5',10),{start:2,end:5,partial:true});
  assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9,partial:true});
  assert.deepEqual(byteRange('bytes=8-',10),{start:8,end:9,partial:true});
  for (const bad of ['bytes=-0','bytes=10-','bytes=5-2','bytes=0-1,3-4','bytes=-','items=1-2']) assert.equal(byteRange(bad,10),null);
});
test('local server streams exact bytes; blocks source injection, cross-origin writes and stale saves',async t => {
  const dir=fixture(t), file=path.join(path.dirname(dir),'synthetic.webm');
  fs.writeFileSync(file,'0123456789');
  await addVideo(dir,file,'tour-1',{duration:10,ffprobe:path.join(dir,'missing-ffprobe')});
  const server=await startServer(dir,0);
  t.after(() => {server.closeAllConnections(); server.close();});
  const url=`http://127.0.0.1:${server.address().port}`;
  const stream=await fetch(`${url}/media/tour-1`,{headers:{Range:'bytes=2-5'}});
  assert.equal(stream.status,206); assert.equal(await stream.text(),'2345');
  assert.equal(stream.headers.get('content-range'),'bytes 2-5/10');
  assert.equal((await fetch(`${url}/media/tour-1`,{headers:{Range:'bytes=30-'}})).status,416);
  assert.equal((await fetch(`${url}/api/session`,{headers:{Origin:'https://example.com'}})).status,403);
  const foreignHost=await new Promise((resolve,reject) => {
    const req=http.get(`${url}/api/session`,{headers:{Host:'attacker.example'}},response => {response.resume();resolve(response.statusCode);});
    req.on('error',reject);
  });
  assert.equal(foreignHost,403);
  const s=await (await fetch(`${url}/api/session`)).json();
  const put=body => fetch(`${url}/api/session`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const injection=structuredClone(s); injection.videos[0].path=path.join(dir,'session.json');
  assert.equal((await put(injection)).status,400);
  const removeGuard=structuredClone(s); delete removeGuard.videos[0].mtimeMs;
  assert.equal((await put(removeGuard)).status,400);
  assert.equal((await put(s)).status,200);
  assert.equal((await put(s)).status,409);
  fs.writeFileSync(file,'modified-original');
  assert.equal((await fetch(`${url}/media/tour-1`)).status,409);
});
test('artifact junctions cannot redirect private output into another directory',t => {
  const dir=fixture(t), other=path.join(path.dirname(dir),'other'); fs.mkdirSync(other);
  fs.symlinkSync(other,path.join(dir,'frames'),'junction');
  assert.throws(() => privateArtifact(dir,'frames/tour-1/output.jpg'),/symbolic links/);
  assert.throws(() => privateArtifact(dir,'../escaped.json'),/within/);
});
test('baseline refresh retains a verified recovery ledger and refuses once review begins',t => {
  const dir=fixture(t), before=fs.readFileSync(path.join(dir,'session.json'));
  const next=refreshBaseline(dir);
  const archive=fs.readdirSync(dir).find(f => f.startsWith('baseline-'));
  assert(fs.readFileSync(path.join(dir,archive)).equals(before));
  assert.equal(next.revision,1);
  source(next); observation(next); save(dir,next,{allowSources:true});
  assert.throws(() => refreshBaseline(dir),/Review has begun/);
});
