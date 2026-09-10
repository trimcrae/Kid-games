'use strict';
const $ = id => document.getElementById(id);
const ASPECTS = ['layout', 'openings', 'dimensions', 'materials', 'furniture', 'lighting'];
const drafts = new Set();
let session, report, pending, saving = false, evidenceVideoId = null, pendingSeek = null;
const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
const title = value => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
const time = value => { const n = Math.max(0, Number(value) || 0); return `${Math.floor(n / 60)}:${(n % 60).toFixed(1).padStart(4, '0')}`; };
const currentVideo = () => session?.videos.find(v => v.id === $('video-select').value);
const roomName = id => session.model.rooms.find(r => r.id === id)?.name || id;
function message(id, text = '') { $(id).textContent = text; $(id).hidden = !text; }
function options(el, values) { el.replaceChildren(...values.map(([value, label]) => { const o = node('option', label); o.value = value; return o; })); }
function status() {
  $('retry-save').hidden = !pending || saving;
  $('cancel-save').hidden = !pending || saving;
  if (saving) $('save-state').textContent = 'Saving to this computer…';
  else if (pending) $('save-state').textContent = `Not saved — ${pending.error || 'retry the save.'} Your draft is retained here.`;
  else $('save-state').textContent = drafts.size ? 'Draft not saved — use the form’s save button.' : `Saved locally · revision ${session?.revision ?? 0}`;
  $('save-state').classList.toggle('error', Boolean(pending));
}
async function getJson(url, init) {
  const response = await fetch(url, init);
  let body;
  try { body = await response.json(); } catch { throw new Error(`Server returned ${response.status}; check the local server.`); }
  if (!response.ok) throw new Error(response.status === 409 ? 'This session changed elsewhere. Download your evidence JSON and copy any unsubmitted form drafts before reloading to reconcile it.' : (body.error || `Save failed (${response.status}).`));
  return body;
}
async function refreshReport() {
  try { report = await getJson('/api/report'); renderReport(); }
  catch (error) { message('fatal', `Could not refresh coverage: ${error.message}`); }
}
async function persist(next, onSuccess = () => {}) {
  if (saving) return false;
  if (pending && next !== pending.next) { status(); return false; }
  const controls = pending?.controls || [...document.querySelectorAll('input, textarea, select, button')].map(el => [el, el.disabled]);
  pending = {next, onSuccess, controls};
  saving = true; status();
  controls.forEach(([el]) => { el.disabled = true; });
  let success = false;
  try {
    session = await getJson('/api/session', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(next)});
    pending = null; onSuccess(); success = true;
  } catch (error) { pending.error = error.message; }
  finally { saving = false; controls.forEach(([el, disabled]) => { el.disabled = pending ? !['retry-save', 'cancel-save', 'export'].includes(el.id) : disabled; }); status(); }
  if (success) { renderEvidence(); renderTranscript(); await refreshReport(); }
  return success;
}
function mutate(edit, done) { if (pending || saving) { status(); return; } const next = structuredClone(session); edit(next); return persist(next, done); }
function range() {
  const start = Number($('start').value), end = Number($('end').value), video = currentVideo();
  if (!video) throw new Error('Register a source video first.');
  if ($('start').value === '' || $('end').value === '' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) throw new Error('Choose an out point later than the in point.');
  if (video.durationSeconds && end > video.durationSeconds + .05) throw new Error('The interval extends beyond this video.');
  return {videoId: video.id, start, end};
}
function seekButton(start, end, videoId) {
  const button = node('button', `${time(start)}–${time(end)}`, 'seek'); button.type = 'button';
  button.addEventListener('click', () => {
    if (videoId !== currentVideo()?.id && !selectVideo(videoId)) return;
    if ($('video').readyState >= 1) { pendingSeek = null; $('video').currentTime = start; }
    else pendingSeek = {videoId, start};
  });
  return button;
}
function selectVideo(id) {
  if (drafts.has('evidence') && evidenceVideoId && evidenceVideoId !== id) {
    message('evidence-error', 'Save or cancel your evidence draft before changing source videos.'); $('video-select').value = evidenceVideoId; return false;
  }
  pendingSeek = null; $('video-select').value = id; const video = currentVideo();
  $('video').removeAttribute('src'); $('codec-error').hidden = true;
  if (video) $('video').src = `/media/${encodeURIComponent(video.id)}`;
  $('video').load(); $('start').value = '0'; $('end').value = '0';
  $('video-summary').textContent = video?.durationSeconds ? time(video.durationSeconds) : '';
  renderEvidence(); renderTranscript(); renderVideoCoverage(); return true;
}
function resetEvidence() {
  $('evidence-form').reset(); $('observation-id').value = ''; $('cancel-edit').hidden = true;
  $('save-evidence').textContent = 'Add evidence & save'; evidenceVideoId = null; drafts.delete('evidence'); message('evidence-error'); renderChecklist(); updateMeasurementFields(); status();
}
function renderChecklist() { const prompts = session.model.checklist?.[$('aspect').value]; $('aspect-checklist').textContent = prompts ? `Look for: ${Array.isArray(prompts) ? prompts.join(' · ') : prompts}` : ''; }
function updateMeasurementFields() { const measured = $('basis').value === 'measurement'; $('measurement-fields').hidden = !measured; $('measurement-fields').disabled = !measured; }
function editObservation(observation) {
  if (drafts.has('evidence')) { message('evidence-error', 'Save or cancel the current evidence draft before opening another.'); return; }
  if (observation.videoId !== currentVideo()?.id) selectVideo(observation.videoId);
  $('observation-id').value = observation.id; evidenceVideoId = observation.videoId;
  for (const key of ['roomId', 'aspect', 'basis', 'confidence', 'viewpoint', 'statement', 'relatedRoomId']) $(key === 'roomId' ? 'room' : key === 'relatedRoomId' ? 'related-room' : key).value = observation[key] || '';
  $('start').value = observation.start; $('end').value = observation.end;
  $('target').value = observation.targets?.[0] || ''; $('extra-targets').value = (observation.targets || []).slice(1).join('\n');
  for (const key of ['value', 'unit', 'method', 'uncertainty']) $(`measurement-${key}`).value = observation.measurement?.[key] ?? (key === 'unit' ? 'ft' : '');
  updateMeasurementFields();
  $('cancel-edit').hidden = false; $('cancel-edit').textContent = 'Cancel edit'; $('save-evidence').textContent = 'Save evidence edit'; drafts.add('evidence'); renderChecklist(); status(); $('viewpoint').focus();
}
function renderEvidence() {
  const observations = session.observations.filter(o => o.videoId === currentVideo()?.id);
  $('evidence-count').textContent = `${observations.length} observation${observations.length === 1 ? '' : 's'}`;
  $('evidence-list').replaceChildren();
  if (!observations.length) $('evidence-list').append(node('p', 'No evidence recorded for this source yet.', 'hint'));
  for (const o of [...observations].sort((a, b) => a.start - b.start)) {
    const item = node('article', undefined, 'evidence-item'), meta = node('div', undefined, 'item-meta');
    meta.append(seekButton(o.start, o.end, o.videoId), node('span', `${roomName(o.roomId)} · ${title(o.aspect)} · ${o.basis} · ${o.confidence} confidence`));
    item.append(meta, node('p', o.statement), node('p', `Viewpoint: ${o.viewpoint}`, 'muted'));
    if (o.measurement) item.append(node('p', `Measurement: ${o.measurement.value} ${o.measurement.unit} · ${o.measurement.method} · Uncertainty: ${o.measurement.uncertainty}`, 'muted'));
    if (o.relatedRoomId) item.append(node('p', `Connected to: ${roomName(o.relatedRoomId)}`, 'muted'));
    if (o.targets?.length) item.append(node('p', o.targets.join(' · '), 'muted'));
    const actions = node('div', undefined, 'actions'), edit = node('button', 'Edit', 'quiet'), remove = node('button', 'Remove', 'danger');
    edit.type = remove.type = 'button'; edit.onclick = () => editObservation(o);
    const referenced = session.reviews.some(r => r.observationIds.includes(o.id)) || session.questions.some(q => q.resolutionObservationIds?.includes(o.id)) || session.changes.some(c => JSON.stringify(c).includes(o.id));
    remove.disabled = referenced || saving || Boolean(pending); remove.title = referenced ? 'Remove references from assessments, questions or changes before deleting this evidence.' : 'Remove this observation';
    remove.onclick = () => mutate(next => { next.observations = next.observations.filter(value => value.id !== o.id); });
    actions.append(edit, remove); item.append(actions); $('evidence-list').append(item);
  }
  renderAssessmentEvidence();
}
function renderTranscript() {
  const query = $('transcript-search').value.toLowerCase(), rows = currentVideo()?.transcript || [];
  $('transcript-list').replaceChildren();
  for (const [index, cue] of rows.entries()) {
    if (query && !cue.text.toLowerCase().includes(query)) continue;
    const item = node('div', undefined, 'transcript-row'), label = node('label'), check = node('input'); check.type = 'checkbox'; check.checked = cue.reviewed === true;
    check.disabled = saving || Boolean(pending);
    label.append(check, node('span', cue.reviewed ? 'Transcript text manually verified' : 'Unverified transcript · mark after listening'));
    check.onchange = async () => { const videoId = currentVideo().id, checked = check.checked; check.checked = !checked; await mutate(next => { next.videos.find(v => v.id === videoId).transcript[index].reviewed = checked; }); };
    item.append(seekButton(cue.start, cue.end, currentVideo().id), node('p', cue.text), label); $('transcript-list').append(item);
  }
  if (!$('transcript-list').children.length) $('transcript-list').append(node('p', rows.length ? 'No matching transcript text.' : 'No transcript imported. Use the video’s audio controls to review narration.', 'hint'));
}
function renderVideoCoverage() {
  $('video-coverage').replaceChildren(); const video = report?.videos.find(v => v.id === currentVideo()?.id); if (!video) return;
  for (const [channel, label] of [['visual', 'Picture'], ['audio', 'Narration']]) {
    const gaps = video[`${channel}Gaps`] || [], reviewed = video[`${channel}ReviewedSeconds`] || 0;
    $('video-coverage').append(node('p', `${label}: ${time(reviewed)} reviewed${video.durationSeconds ? ` / ${time(video.durationSeconds)}` : ' · duration unknown'}`));
    if (gaps.length) $('video-coverage').append(node('p', `Unreviewed: ${gaps.slice(0, 8).map(([a, b]) => `${time(a)}–${time(b)}`).join(', ')}${gaps.length > 8 ? ` and ${gaps.length - 8} more intervals` : ''}`));
  }
}
function renderReport() {
  renderVideoCoverage(); $('coverage-body').replaceChildren();
  for (const room of report.rooms) {
    const row = node('tr'); row.append(node('th', room.name));
    for (const aspect of ASPECTS) {
      const value = room.aspects[aspect] || 'unreviewed', td = node('td'), button = node('button', title(value), 'status');
      button.type = 'button'; button.dataset.status = value; button.setAttribute('aria-label', `${room.name}, ${aspect}: ${title(value)}. Edit assessment.`);
      button.onclick = () => { if (drafts.has('review')) { message('review-error', 'Save your current assessment draft before selecting another cell.'); $('review-form').scrollIntoView({block: 'center'}); return; } $('review-room').value = room.id; $('review-aspect').value = aspect; loadAssessment(); $('review-form').scrollIntoView({block: 'center', behavior: 'smooth'}); };
      td.append(button); row.append(td);
    }
    $('coverage-body').append(row);
  }
  const questions = report.openQuestions || []; $('question-count').textContent = String(questions.length); $('questions').replaceChildren();
  for (const q of questions) { const item = node('article', undefined, 'question-item'); item.append(node('div', q.roomId ? roomName(q.roomId) : 'Whole house', 'muted'), node('p', q.question)); $('questions').append(item); }
  if (!questions.length) $('questions').append(node('p', 'No open questions recorded.', 'hint'));
  $('warnings').replaceChildren(...(report.warnings || []).map(w => node('p', w)));
}
function loadAssessment() {
  const review = session.reviews.find(r => r.roomId === $('review-room').value && r.aspect === $('review-aspect').value);
  $('review-status').value = review?.status || 'partial'; $('review-note').value = review?.note || ''; drafts.delete('review'); message('review-error'); renderAssessmentEvidence(review?.observationIds || []); $('review-form').dataset.room = $('review-room').value; $('review-form').dataset.aspect = $('review-aspect').value; status();
}
function renderAssessmentEvidence(selected) {
  if (!session) return;
  selected ??= [...$('review-evidence').querySelectorAll('input:checked')].map(el => el.value);
  const relevant = session.observations.filter(o => o.roomId === $('review-room').value && o.aspect === $('review-aspect').value);
  $('review-evidence').replaceChildren();
  for (const o of relevant) { const label = node('label', undefined, 'check-row'), check = node('input'); check.type = 'checkbox'; check.value = o.id; check.checked = selected.includes(o.id); label.append(check, node('span', `${time(o.start)} · ${o.basis} · ${o.statement}`)); $('review-evidence').append(label); }
  if (!relevant.length) $('review-evidence').append(node('p', 'Add evidence for this room and aspect to link it here.', 'hint'));
}
$('evidence-form').addEventListener('input', () => { drafts.add('evidence'); evidenceVideoId ??= currentVideo()?.id; $('cancel-edit').hidden = false; $('cancel-edit').textContent = $('observation-id').value ? 'Cancel edit' : 'Clear draft'; renderChecklist(); status(); });
$('basis').addEventListener('change', updateMeasurementFields);
$('review-form').addEventListener('input', event => { if (!['review-room', 'review-aspect'].includes(event.target.id)) drafts.add('review'); status(); });
for (const id of ['review-room', 'review-aspect']) $(id).addEventListener('change', () => {
  if (drafts.has('review')) { message('review-error', 'Save the current assessment before changing its room or aspect.'); const previous = $('review-form').dataset; $('review-room').value = previous.room; $('review-aspect').value = previous.aspect; return; }
  loadAssessment(); $('review-form').dataset.room = $('review-room').value; $('review-form').dataset.aspect = $('review-aspect').value;
});
$('evidence-form').onsubmit = async event => {
  event.preventDefault(); message('evidence-error');
  try {
    const observation = {...range(), id: $('observation-id').value || crypto.randomUUID(), roomId: $('room').value, aspect: $('aspect').value, basis: $('basis').value, confidence: $('confidence').value, statement: $('statement').value.trim(), viewpoint: $('viewpoint').value.trim(), targets: [$('target').value, ...$('extra-targets').value.split('\n')].map(v => v.trim()).filter(Boolean), relatedRoomId: $('related-room').value || null};
    if (!observation.statement || !observation.viewpoint) throw new Error('Add both a specific observation and a viewpoint.');
    if (observation.basis === 'measurement') {
      const measurement = {value: Number($('measurement-value').value), unit: $('measurement-unit').value, method: $('measurement-method').value.trim(), uncertainty: $('measurement-uncertainty').value.trim()};
      if (!Number.isFinite(measurement.value) || measurement.value <= 0 || !measurement.method || !measurement.uncertainty) throw new Error('Measurements require a value greater than zero, a unit, how it was measured, and its uncertainty.');
      observation.measurement = measurement;
    }
    await mutate(next => { const i = next.observations.findIndex(o => o.id === observation.id); if (i < 0) next.observations.push(observation); else next.observations[i] = observation; }, resetEvidence);
  } catch (error) { message('evidence-error', error.message); }
};
$('review-form').onsubmit = async event => {
  event.preventDefault(); message('review-error');
  const review = {roomId: $('review-room').value, aspect: $('review-aspect').value, status: $('review-status').value, observationIds: [...$('review-evidence').querySelectorAll('input:checked')].map(el => el.value), note: $('review-note').value.trim()};
  if (review.status === 'supported' && !review.observationIds.some(id => session.observations.find(o => o.id === id)?.basis !== 'inference')) { message('review-error', 'Supported requires at least one selected observation based on sight, narration or measurement.'); return; }
  if (['unseen', 'not-applicable'].includes(review.status) && !review.note) { message('review-error', 'Explain why this aspect was not seen or is not applicable.'); return; }
  await mutate(next => { const i = next.reviews.findIndex(r => r.roomId === review.roomId && r.aspect === review.aspect); if (i < 0) next.reviews.push(review); else next.reviews[i] = review; }, () => { drafts.delete('review'); });
};
for (const [id, channel] of [['mark-visual', 'visual'], ['mark-audio', 'audio']]) $(id).onclick = async () => { message('range-error'); try { const interval = {...range(), channel}; await mutate(next => next.reviewedRanges.push(interval)); } catch (error) { message('range-error', error.message); } };
for (const part of ['start', 'end']) $(`capture-${part}`).onclick = () => { $(part).value = $('video').currentTime.toFixed(1); };
$('video-select').onchange = () => selectVideo($('video-select').value);
$('video').addEventListener('error', () => { if (currentVideo()) $('codec-error').hidden = false; });
$('video').addEventListener('loadedmetadata', async () => {
  const video = currentVideo(), duration = $('video').duration;
  if (pendingSeek?.videoId === video?.id) { $('video').currentTime = pendingSeek.start; pendingSeek = null; }
  if (video && Number.isFinite(duration) && duration > 0) { $('video-summary').textContent = time(duration); if (video.durationSeconds === null && !pending && !saving) await mutate(next => { next.videos.find(v => v.id === video.id).durationSeconds = duration; }); }
});
$('transcript-search').oninput = renderTranscript;
$('cancel-edit').onclick = resetEvidence;
$('retry-save').onclick = () => { if (pending) persist(pending.next, pending.onSuccess); };
$('cancel-save').onclick = () => { if (!pending || saving) return; pending.controls.forEach(([el, disabled]) => { el.disabled = disabled; }); pending = null; status(); };
$('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(pending?.next || session, null, 2)], {type: 'application/json'})), link = node('a'); link.href = url; link.download = 'house-evidence-session.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
window.addEventListener('beforeunload', event => { if (drafts.size || pending || saving) { event.preventDefault(); event.returnValue = ''; } });
(async () => {
  try {
    session = await getJson('/api/session');
    const rooms = session.model.rooms.map(r => [r.id, `${r.name}${r.level ? ` · ${r.level}` : ''}`]);
    for (const id of ['room', 'review-room']) options($(id), rooms);
    options($('related-room'), [['', 'None'], ...rooms]);
    for (const id of ['aspect', 'review-aspect']) options($(id), ASPECTS.map(a => [a, title(a)]));
    options($('video-select'), session.videos.map(v => [v.id, v.label]));
    const targets = [...session.model.assets.map(a => `asset:${a.name}`), ...session.model.cameras.map(c => `camera:${c}`), ...session.model.sourceFiles.map(f => `file:${f}`)];
    $('model-targets').replaceChildren(...[...new Set(targets)].map(value => { const o = node('option'); o.value = value; return o; }));
    const header = node('tr'); header.append(node('th', 'Room'), ...ASPECTS.map(a => node('th', title(a)))); $('coverage-head').append(header);
    $('video-select').disabled = !session.videos.length; $('export').disabled = false; $('empty').hidden = Boolean(session.videos.length);
    $('add-command').textContent = 'node tools/house-evidence/cli.mjs add-video --file "C:/path/to/walkthrough.mp4" --id walkthrough-01\n\nAdd --workspace "C:/private/review" if you started the server with a custom workspace.';
    for (const id of ['mark-visual', 'mark-audio', 'capture-start', 'capture-end', 'save-evidence']) $(id).disabled = !session.videos.length;
    if (session.videos.length) selectVideo(session.videos[0].id); else { renderEvidence(); renderTranscript(); }
    loadAssessment(); renderChecklist();
    await refreshReport(); status();
  } catch (error) { message('fatal', `Could not open the local evidence session: ${error.message}`); $('save-state').textContent = 'Session unavailable'; }
})();
