// Keep Ellie's three new read-aloud books, picture concepts, and wiring intact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const context = {window:{}};
for(const file of ['family-stories.js','volume-two.js','ellie-stories.js']) vm.runInNewContext(read('games/spooky-stories/'+file),context);
const books = context.window.ELLIE_STORIES;
assert.equal(books.length,3);
assert.equal(context.window.FAMILY_STORIES[0].id,'ellie-ribbon-parade','New books are easy to find at the front');
assert.equal(new Set(books.map(b=>b.id)).size,3);
for(const story of books) {
  assert.equal(story.pages.length,6,'Six short illustrated pages');
  assert.equal(story.questions.length,2,'Two comprehension questions');
  assert.match(story.ending,/^The End\./);
  assert.equal(new Set(story.pages.map(p=>p.img)).size,6,'Page-specific illustration');
  for(const page of story.pages) {
    assert.ok(page.text.split(/\s+/).length<=50,'Short pages for a young listener');
    assert.ok(page.wonder.length>20,'Something to notice or try');
    assert.ok(page.alt.length>50,'Useful picture description');
    const svg = read('games/spooky-stories/'+page.img);
    assert.match(svg,/viewBox="0 0 960 720"/);
    assert.match(svg,/<title[^>]*>.+<\/title>/);
    assert.match(svg,/<desc[^>]*>.+<\/desc>/);
    assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|url)\s*=\s*["']https?:/i,'Self-contained safe vector art');
  }
  for(const q of story.questions) {
    assert.equal(q.choices.length,3);
    assert.ok(q.choices.every(c=>c.length===2&&c[1].length>2));
  }
}
const ribbons = n=>read('games/spooky-stories/art/ellie/ellie-ribbon-parade-'+n+'.svg');
assert.deepEqual([...ribbons(1).matchAll(/data-ribbon="(red|blue)"/g)].map(m=>m[1]),['red','blue','red','blue']);
assert.deepEqual([...ribbons(2).matchAll(/data-ribbon="(red|blue)"/g)].map(m=>m[1]),['red','blue','blue','blue']);
assert.equal((ribbons(4).match(/data-ribbon=/g)||[]).length,6,'Six ribbons in Teddy’s crown');
const shapes=read('games/spooky-stories/art/ellie/ellie-shape-castle-3.svg');
assert.deepEqual([...shapes.matchAll(/data-shape="(\w+)"/g)].map(m=>m[1]),['square','triangle','circle']);
assert.equal((read('games/spooky-stories/art/ellie/ellie-sleepy-sunflower-3.svg').match(/data-height-mark=/g)||[]).length,3);
const index=read('games/spooky-stories/index.html');
assert.ok(index.indexOf('ellie-stories.js')>index.indexOf('volume-two.js'));
assert.ok(index.indexOf('ellie-stories.js')<index.indexOf('src="storybook.js'));
assert.match(read('games/spooky-stories/audio/build_audio.py'),/"ellie-stories.js"/);
assert.match(read('.github/workflows/build-audio.yml'),/games\/spooky-stories\/ellie-stories.js/);
console.log('PASS: Three Ellie books, 18 original illustrations, six quizzes, educational picture counts and narration wiring.');
