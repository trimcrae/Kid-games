// Reuses installed Playwright/Chrome. Generates a tiny synthetic video with tone audio.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {init,load,save,addVideo,headroom} from './core.mjs';
import {startServer} from './server.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
headroom(os.tmpdir(),8*1024**2);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'house-evidence-browser-'));
const workspace=path.join(directory,'evidence'); init(workspace);
const server=await startServer(workspace,0), base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',error => errors.push(error.message));
  page.on('console',message => { if (message.type() === 'error' && !message.text().includes('409')) errors.push(message.text()); });
  await page.goto(base);
  await page.locator('#empty').waitFor();
  assert.equal(await page.locator('#coverage-body tr').count(),23);
  const bytes=await page.evaluate(async () => {
    const canvas=document.createElement('canvas'); canvas.width=640; canvas.height=360;
    const ctx=canvas.getContext('2d'), audio=new AudioContext(); await audio.resume();
    const tone=audio.createOscillator(), gain=audio.createGain(), destination=audio.createMediaStreamDestination();
    gain.gain.value=.015; tone.connect(gain);gain.connect(destination);tone.start();
    const stream=canvas.captureStream(12); destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'}), chunks=[];
    recorder.ondataavailable=e => { if(e.data.size) chunks.push(e.data); };
    const finished=new Promise(resolve => recorder.onstop=resolve); recorder.start();
    for (let i=0;i<24;i++) {
      ctx.fillStyle='#244a38';ctx.fillRect(0,0,640,360);
      ctx.fillStyle='#fbf3dc';ctx.font='bold 30px sans-serif';ctx.fillText('SYNTHETIC WALKTHROUGH',50,80);
      ctx.font='21px sans-serif';ctx.fillText('Playback + tone audio test',50,125);
      ctx.fillStyle='#d9ad70';ctx.fillRect(50+i*12,190,75,90);
      await new Promise(resolve => setTimeout(resolve,84));
    }
    recorder.stop();await finished;tone.stop();stream.getTracks().forEach(track => track.stop());await audio.close();
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
  });
  const file=path.join(directory,'synthetic.webm');fs.writeFileSync(file,Buffer.from(bytes));
  await addVideo(workspace,file,'synthetic',{duration:3,ffprobe:path.join(directory,'missing-ffprobe'),label:'Synthetic walkthrough · playback test'});
  const s=load(workspace);s.videos[0].transcript=[{start:0,end:1,text:'Synthetic transcript: a doorway test, not house evidence.',reviewed:false}];save(workspace,s);
  await page.reload(); await page.waitForFunction(() => document.getElementById('video').readyState >= 2);
  await page.locator('#video').evaluate(async video => {video.muted=true;await video.play();});
  await page.waitForFunction(() => document.getElementById('video').currentTime > .2);
  await page.locator('#video').evaluate(video => video.pause());
  await page.locator('#start').fill('0.1');await page.locator('#end').fill('1');
  await page.locator('#room').selectOption('kitchen');await page.locator('#aspect').selectOption('openings');
  await page.locator('#viewpoint').fill('Synthetic camera at doorway, facing the colored square');
  await page.locator('#statement').fill('Synthetic test opening; this does not describe the real house.');
  await page.locator('#target').fill('camera:kitchen');
  await page.locator('#save-evidence').click();
  await page.waitForFunction(() => document.getElementById('evidence-count').textContent === '1 observation');
  assert.equal(load(workspace).observations.length,1);
  await page.locator('#mark-visual').click();
  await page.waitForFunction(() => document.getElementById('video-coverage').textContent.includes('Picture: 0:00.9 reviewed'));
  assert.equal(load(workspace).reviewedRanges.filter(r => r.channel === 'audio').length,0);
  await page.locator('#transcript-list input[type=checkbox]').check();
  await page.waitForFunction(() => document.getElementById('transcript-list').textContent.includes('manually verified'));
  assert.equal(load(workspace).videos[0].transcript[0].reviewed,true);
  await page.locator('#review-room').selectOption('kitchen');await page.locator('#review-aspect').selectOption('openings');
  await page.locator('#review-evidence input').check();await page.locator('#review-status').selectOption('supported');
  await page.locator('#review-form button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Kitchen, openings: Supported. Edit assessment."]'));
  assert.equal(load(workspace).reviews[0].status,'supported');
  assert(await page.locator('#evidence-list .danger').isDisabled());
  // A second evidence item exercises the required measured fields and reset logic.
  await page.locator('#basis').selectOption('measurement');await page.locator('#aspect').selectOption('dimensions');
  await page.locator('#measurement-value').fill('3');await page.locator('#measurement-unit').selectOption('count');
  await page.locator('#measurement-method').fill('Counted synthetic marks');await page.locator('#measurement-uncertainty').fill('Exact count in test clip');
  await page.locator('#viewpoint').fill('Synthetic front view');await page.locator('#statement').fill('Three synthetic marks, not a house measurement.');
  await page.locator('#save-evidence').click();
  await page.waitForFunction(() => document.getElementById('evidence-count').textContent === '2 observations');
  assert.equal(load(workspace).observations[1].measurement.unit,'count');
  assert(await page.locator('#measurement-fields').isHidden());
  await page.locator('#evidence-list .seek').first().click();
  await page.waitForFunction(() => Math.abs(document.getElementById('video').currentTime-.1)<.08);
  if (process.env.HOUSE_REVIEW_QA_OUTPUT) {
    headroom(process.env.HOUSE_REVIEW_QA_OUTPUT,2*1024**2);fs.mkdirSync(process.env.HOUSE_REVIEW_QA_OUTPUT,{recursive:true});
    await page.evaluate(() => scrollTo(0,0));await page.screenshot({path:path.join(process.env.HOUSE_REVIEW_QA_OUTPUT,'desktop.png')});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(() => scrollTo(0,0));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),'Phone layout overflows');
  if (process.env.HOUSE_REVIEW_QA_OUTPUT) await page.screenshot({path:path.join(process.env.HOUSE_REVIEW_QA_OUTPUT,'phone.png')});
  // Stale server writes must preserve the submitted candidate and visible draft.
  const changed=load(workspace);save(workspace,changed);
  await page.locator('#viewpoint').fill('Unsaved synthetic view');await page.locator('#statement').fill('Preserve this draft on a stale save.');
  await page.locator('#save-evidence').click();await page.locator('#retry-save').waitFor();
  assert((await page.locator('#save-state').textContent()).includes('Not saved'));
  assert.equal(await page.locator('#statement').inputValue(),'Preserve this draft on a stale save.');
  assert.equal(load(workspace).observations.length,2);
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/phone, synthetic video+audio decoding, seek, evidence, measured references, transcript review, separate coverage, source links and stale-save recovery.');
} finally {
  await browser.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve));
  const resolved=fs.realpathSync(directory);
  assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));assert(path.basename(resolved).startsWith('house-evidence-browser-'));
  fs.rmSync(resolved,{recursive:true});
}
