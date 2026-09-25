// Verify every book's actual reader data against the audio builder's source contract.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../games/spooky-stories');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const context = { window: {} };
vm.createContext(context);
for (const name of ['classics.js', 'family-stories.js', 'volume-two.js', 'family-art.js', 'audio/manifest.js']) vm.runInContext(read(name), context);
const engine = read('storybook.js');
const boundary = engine.indexOf('  // Painterly cover pictures rendered by the art pipeline');
vm.runInContext(engine.slice(0, boundary) + '\nwindow.catalog = { STORIES, QUIZZES, VOCAB };\n})();', context);
const { STORIES, QUIZZES, VOCAB } = context.window.catalog;
const parsed = new Map();
let current;
for (const match of [engine, read('classics.js'), read('family-stories.js'), read('volume-two.js')].join('\n').matchAll(/\b(id|text|ending|ask):\s*"((?:[^"\\]|\\.)*)"/g)) {
  const key = match[1], value = JSON.parse('"' + match[2] + '"');
  if (key === 'id') {
    current = parsed.get(value) || { pages: [], questions: [] };
    parsed.set(value, current);
  } else if (current) current[key === 'ask' ? 'questions' : 'pages'].push(value);
}
function spoken(raw) {
  let text = raw.replace(/[\u{1F300}-\u{1FAFF}✨⭐❤️]/gu, '').replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'").replace(/—/g, ', ').replace(/…/g, '...');
  text = text.replace(/\b[A-Z][A-Z']*[A-Z]\b/g, (word, offset, source) => {
    const before = source.slice(0, offset).replace(/[ "'\[(]+$/, '');
    const lower = word.toLowerCase();
    return !before || /[.!?]$/.test(before) ? lower[0].toUpperCase() + lower.slice(1) : lower;
  });
  return text.replace(/ , /g, ', ').replace(/\s+/g, ' ').trim();
}
let clips = 0;
const missing = [];
for (const story of STORIES) {
  const quiz = QUIZZES.find(q => q.id === story.id);
  assert.ok(quiz && quiz.qs.length, 'Comprehension questions: ' + story.id);
  assert.ok(story.pages.at(-1).end, 'Completion page: ' + story.id);
  assert.deepEqual(parsed.get(story.id).pages, Array.from(story.pages, p => p.text), 'Exact page narration source: ' + story.id);
  assert.deepEqual(parsed.get(story.id).questions, Array.from(quiz.qs, q => q.ask), 'Exact question narration source: ' + story.id);
  for (const [suffix, raw] of story.pages.map((p,i) => [i,p.text]).concat(quiz.qs.map((q,i) => ['q'+i,q.ask]))) {
    const name = story.id + '-' + suffix;
    const entry = context.window.SPOOKY_NARRATION[name];
    const hash = crypto.createHash('sha1').update(spoken(raw)).digest('hex').slice(0,12);
    if (!entry || entry.text !== hash || !fs.existsSync(path.join(root, 'audio', name+'.mp3'))) missing.push(name);
    else { assert.ok(entry.voice.length > 0); assert.ok(fs.statSync(path.join(root,'audio',name+'.mp3')).size > 1000); }
    clips++;
  }
}
for (const story of context.window.FAMILY_STORIES) {
  const rendered = STORIES.find(s => s.id === story.id);
  story.pages.forEach((p,i) => {
    assert.ok(p.alt.length > 30, story.id + ': meaningful picture description');
    assert.ok(p.text.split(/\s+/).length <= 65, story.id + ': page fits a spread');
    Object.keys(VOCAB[story.id][i]).forEach(w => assert.ok(p.text.toLowerCase().includes(w), story.id + ': vocabulary word ' + w));
    if (p.img && !process.argv.includes('--pending-art')) assert.ok(fs.statSync(path.join(root,p.img)).size > 1000);
    else if (!p.img) assert.match(rendered.pages[i].art(), /<svg/);
  });
}
assert.equal(STORIES.length, 39);
assert.equal(new Set(STORIES.map(s=>s.id)).size, 39);
assert.equal(context.window.STORYBOOK_VOLUME_TWO.length, 10, 'Ten new stories');
assert.equal(new Set(context.window.STORYBOOK_VOLUME_TWO.map(s=>s.artStyle)).size, 10, 'Ten different art styles');
for (const story of context.window.STORYBOOK_VOLUME_TWO) {
  assert.ok(story.pages.length > 5, 'Expanded story: '+story.id);
  assert.equal(new Set(story.pages.map(p=>p.img)).size, story.pages.length, 'A unique generated illustration per page');
  if (!process.argv.includes('--pending-art')) for (const [i,p] of story.pages.entries()) {
    const file=path.join(root,p.img), receipt=JSON.parse(fs.readFileSync(path.join(root,'art/volume-two/receipts',story.id+'-'+i+'.json'),'utf8'));
    assert.equal(receipt.generator,'Codex built-in OpenAI image tool');
    assert.equal(receipt.style,story.artStyle);
    assert.equal(receipt.sourceHash,crypto.createHash('sha256').update(JSON.stringify({text:p.text,alt:p.alt,style:story.artStyle})).digest('hex'),'Art corresponds to this page: '+p.img);
    assert.equal(receipt.reviewed,true,'Art reviewed: '+p.img);
    assert.equal(receipt.sha256,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  }
}
if (!process.argv.includes('--pending-audio')) assert.deepEqual(missing, [], 'Every recording must match the exact displayed text');
console.log(`PASS: ${STORIES.length} books; ${clips} page/end/question audio contracts; ${missing.length} recordings pending.`);
