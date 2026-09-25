// Content/integration checks; --media also checks the published art mapping.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../games/spooky-stories');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'classics.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'family-stories.js'), 'utf8'), context);
const engine = fs.readFileSync(path.join(root, 'storybook.js'), 'utf8');
const boundary = engine.indexOf('  // Painterly cover pictures rendered by the art pipeline');
assert.ok(boundary > 0);
vm.runInContext(engine.slice(0, boundary) + '\nwindow.catalog = { STORIES, VOCAB, QUIZZES };\n})();', context);
const { STORIES, VOCAB, QUIZZES } = context.window.catalog;
const originals = ['giggly-ghost', 'costume-party', 'candy-monster', 'wobbly-spell'];
originals.forEach(id => assert.ok(STORIES.some(s => s.id === id), 'Original retained: ' + id));
assert.equal(new Set(STORIES.map(s => s.id)).size, STORIES.length, 'Stable unique bookmark IDs');
assert.equal(STORIES.length, 29);

// Exercise the same literal-token contract the Python narration builder reads.
// Compare its result against the actual reader catalog, including the end page.
const audioInput = engine + '\n' + fs.readFileSync(path.join(root, 'classics.js'), 'utf8');
const parsed = new Map();
let current;
for (const m of audioInput.matchAll(/\b(id|text|ending|ask):\s*"((?:[^"\\]|\\.)*)"/g)) {
  const [, key, value] = m;
  if (key === 'id') {
    current = parsed.get(value) || { pages: [], questions: [] };
    parsed.set(value, current);
  } else if (current) {
    current[key === 'ask' ? 'questions' : 'pages'].push(value);
  }
}
for (const story of context.window.ELLIE_CLASSICS) {
  const rendered = STORIES.find(s => s.id === story.id);
  assert.ok(rendered.classic, 'Classic attribution appears on card');
  assert.ok(story.pages.length >= 9);
  assert.ok(rendered.pages.at(-1).end);
  assert.equal(rendered.pages.at(-1).text, story.ending);
  assert.equal(rendered.pages.length, story.pages.length + 1);
  assert.equal(JSON.stringify(parsed.get(story.id).pages), JSON.stringify(rendered.pages.map(p => p.text)));
  const quiz = QUIZZES.find(q => q.id === story.id).qs;
  assert.equal(quiz.length, 3);
  assert.equal(JSON.stringify(parsed.get(story.id).questions), JSON.stringify(quiz.map(q => q.ask)));
  quiz.forEach(q => {
    assert.equal(q.choices.length, 3);
    assert.equal(new Set(q.choices.map(c => c[1])).size, 3);
  });
  story.pages.forEach((page, i) => {
    assert.ok(page.scene.length > 30);
    assert.ok(page.text.trim().split(/\s+/).length <= 65, 'Read-aloud page fits a single spread');
    const words = page.text.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g);
    Object.keys(VOCAB[story.id][i]).forEach(word => assert.ok(words.includes(word), story.id + ': vocabulary is tappable: ' + word));
  });
}
if (process.argv.includes('--media')) {
  vm.runInContext(fs.readFileSync(path.join(root, 'art/openai/manifest.js'), 'utf8'), context);
  for (const story of context.window.ELLIE_CLASSICS) {
    const pictures = context.window.SPOOKY_PAINTED_ART[story.id];
    assert.equal(pictures.length, story.pages.length);
    pictures.forEach((picture, i) => {
      assert.equal(picture.src.split('?')[0], `art/openai/${story.id}-${i}.webp`);
      assert.ok(picture.alt.length > 20);
      const data = fs.readFileSync(path.join(root, picture.src.split('?')[0]));
      assert.equal(data.toString('ascii', 8, 12), 'WEBP');
      assert.ok(data.length > 10000);
    });
  }
}
if (process.argv.includes('--audio')) {
  vm.runInContext(fs.readFileSync(path.join(root, 'audio/manifest.js'), 'utf8'), context);
  function spokenText(raw) {
    let text = raw.replace(/[\u{1F300}-\u{1FAFF}✨⭐❤️]/gu, '')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, ', ').replace(/…/g, '...');
    text = text.replace(/\b[A-Z][A-Z']*[A-Z]\b/g, (word, offset, source) => {
      const before = source.slice(0, offset).replace(/[ "'\[(]+$/, '');
      const lower = word.toLowerCase();
      return !before || /[.!?]$/.test(before) ? lower[0].toUpperCase() + lower.slice(1) : lower;
    });
    return text.replace(/ , /g, ', ').replace(/\s+/g, ' ').trim();
  }
  let clips = 0;
  for (const story of context.window.ELLIE_CLASSICS) {
    const lines = story.pages.map((p, i) => [String(i), p.text])
      .concat([[String(story.pages.length), story.ending]])
      .concat(story.questions.map((q, i) => ['q' + i, q.ask]));
    for (const [suffix, text] of lines) {
      const name = story.id + '-' + suffix;
      const entry = context.window.SPOOKY_NARRATION[name];
      assert.ok(entry, 'Narration exists: ' + name);
      assert.equal(entry.text, crypto.createHash('sha1').update(spokenText(text)).digest('hex').slice(0, 12), 'Audio matches displayed text: ' + name);
      assert.ok(entry.voice.length > 0, 'Measured narration timings: ' + name);
      assert.ok(fs.statSync(path.join(root, 'audio', name + '.mp3')).size > 1000);
      clips++;
    }
  }
  assert.equal(clips, 41);
  console.log('PASS: all 41 narration clips match their page/end/question text and have measured timings.');
}
console.log('PASS: 29 books; 3 classics; 29 classic story pages; 9 classic quizzes; vocabulary and narration match the reader' + (process.argv.includes('--media') ? '; all 29 classic illustrations present.' : '.'));
