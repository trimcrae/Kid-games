import * as THREE from '../../../assets/vendor/three/three.module.min.js';
import { SAVE_KEY, freshState, normalizeState, checkMixture, correctOrder } from './logic.mjs';

const $ = id => document.getElementById(id);
let state = freshState();
try { state = normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch {}
let storageWorks = true;
let currentPlace = 'story';
let hint = '';
let mixture = { dew:0, mint:0 };
let order = [];
let moveTarget = null;
const keys = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const places = {
  archive: { name:'Whisper Library', position:new THREE.Vector3(-10,0,-2), approach:new THREE.Vector3(-7,0,3) },
  roots: { name:'Star Tower', position:new THREE.Vector3(0,0,-10), approach:new THREE.Vector3(0,0,-6) },
  potion: { name:'Moonmint Glasshouse', position:new THREE.Vector3(10,0,-2), approach:new THREE.Vector3(7,0,3) },
  well: { name:'Moonwell', position:new THREE.Vector3(0,0,2), approach:new THREE.Vector3(0,0,5) }
};
const lesson = $('lesson');
let world;

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { storageWorks = false; }
  updateUI();
}
function updateUI() {
  const count = ['archive','roots','potion'].filter(k => state[k]).length;
  $('progress-fill').style.width = `${count / 3 * 100}%`;
  $('progress-text').textContent = state.complete ? 'The constellation is home' : `${count} of 3 discoveries`;
  $('next-task').textContent = state.complete ? 'The academy shines again. Explore the courtyard, revisit your discoveries, or begin a new adventure.' : !state.archive ? 'Visit the Whisper Library. What did the witnesses actually see?' : !state.roots ? 'Visit the Star Tower. Find a spell that can give the lantern light again.' : !state.potion ? 'Visit the Moonmint Glasshouse. Brew a gentle guide-light for the moths.' : 'Return to the Moonwell and use your discoveries to bring the moths home.';
  const notes = [];
  if (state.archive) notes.push('Evidence: eastward wingprints and moonmint lead to the glasshouse.');
  if (state.roots) notes.push('Reluminate: re- means again; lumin means light. The hidden moths are visible!');
  if (state.potion) notes.push('Guide-light: 4 stardew + 2 moonmint. Warm → stir → ring.');
  $('journal-notes').innerHTML = notes.map(n => `<li>${n}</li>`).join('');
  for (const p of ['archive','roots','potion']) $('state-' + p).textContent = state[p] ? 'Discovered ✓' : 'Explore →';
  $('world-status').textContent = state.complete ? 'Every small discovery can bring a little light.' : state.potion ? 'The guide-light is ready. The Moonwell is waiting.' : state.roots ? 'Silver wings stir inside the moonmint glasshouse.' : state.archive ? 'A trail of evidence. A spell still to discover.' : 'The stars have forgotten their way home.';
  $('save-note').textContent = storageWorks ? 'Progress stays on this device' : 'Saving unavailable in this browser';
  if (world) world.refresh();
}
function announce(text) { $('announcement').textContent = text; }
function feedback(text, success = false) {
  $('feedback').textContent = text;
  $('feedback').classList.toggle('success', success);
}
function shell(kicker, title, content, hintText = '') {
  $('lesson-kicker').textContent = kicker;
  $('lesson-title').textContent = title;
  $('lesson-content').innerHTML = content;
  feedback('');
  hint = hintText;
  $('hint-button').hidden = !hint;
  keys.clear(); moveTarget = null;
  if (!lesson.open) lesson.showModal();
  // A replacement page inside the same dialog needs an accessible reading start.
  $('lesson-title').tabIndex = -1;
  $('lesson-title').focus({ preventScroll:true });
}
function choices(items, onChoose) {
  const holder = document.createElement('div'); holder.className = 'choices';
  items.forEach((text,index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'choice'; button.textContent = text;
    button.addEventListener('click', () => onChoose(index, button, holder)); holder.append(button);
  });
  $('lesson-content').append(holder);
}
function nextButton(text, action) {
  const existing = $('lesson-content').querySelector('.next-button');
  if (existing) return existing;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'gold-button next-button'; button.textContent = text;
  button.addEventListener('click', action); $('lesson-content').append(button);
  return button;
}
function rightAnswer(button, holder, text, action, nextText) {
  button.classList.add('good');
  holder.querySelectorAll('button').forEach(b => b.disabled = true);
  feedback(text, true); nextButton(nextText, action).focus();
}
function wrong(button, text) { button.classList.add('bad'); feedback(text); }
function sparkle(place) {
  $('spell-flash').classList.remove('casting');
  void $('spell-flash').offsetWidth;
  $('spell-flash').classList.add('casting');
  if (world) world.cast(places[place].position);
}
function story() {
  currentPlace = 'story';
  shell('A LETTER FROM PROFESSOR WREN', 'The night the stars went missing', `<div class="story-quote">Dear apprentice,<br>Last night’s storm cracked our Moon Lantern. Its glow moths scattered, and now the protective constellation above the academy has gone dark.<br>They are shy creatures. A loud spell will only frighten them. We must find them, reveal them, and guide them gently home.<span class="signature">I trust your curiosity.<br>— Professor Wren, Keeper of Small Wonders</span></div><p>Wander through the courtyard or choose a place below it. Your journal will keep each discovery. There is no timer, and a mistaken idea is a chance to learn.</p>`);
  nextButton(state.started ? 'Return to the courtyard ✦' : 'Take your apprentice wand ✦', () => {
    state.started = true; save(); lesson.close();
    announce('Your adventure begins at the Whisper Library.');
  });
}
function archive() {
  currentPlace = 'archive';
  if (state.archive) {
    shell('WHISPER LIBRARY · DISCOVERY FOUND', 'Follow what the clues can prove', `<p>The moths went east to the <strong>Moonmint Glasshouse</strong>. The wingprints and fresh moonmint are two pieces of evidence that agree.</p><div class="story-quote">A guess may begin a mystery. Evidence is what helps us solve it.</div><p>Your next stop is the Star Tower. Its old dictionary may hold the spell that reveals the moths.</p>`);
    nextButton('Visit the Star Tower →', () => visit('roots')); return;
  }
  shell('01 / WHISPER LIBRARY · CLOSE READING', 'Where did the moths go?', `<p>Four notes flutter out of a book. Read them carefully. Which place is supported by the evidence?</p><div class="clue-sheet"><article><b>The groundskeeper</b><p>“After the storm, silver wingprints led <strong>east</strong> from the Moonwell.”</p></article><article><b>The gardener</b><p>“I found fresh <strong>moonmint</strong> caught on the lantern. It grows only in our glasshouse.”</p></article><article><b>The tower keeper</b><p>“I heard a rustle to the north. Perhaps it was moths, but I did not see them.”</p></article><article><b>The academy map</b><p>Library: west.<br>Star Tower: north.<br>Moonmint Glasshouse: east.</p></article></div>`, 'Which direction did the wingprints lead? Which place has moonmint? Look for a place that fits BOTH clues.');
  choices(['The Star Tower, because someone heard a rustle.', 'The Moonmint Glasshouse, where the wingprints and moonmint lead.', 'The Whisper Library, because moths might like books.'], (index, button, holder) => {
    if (index === 1) rightAnswer(button, holder, 'A strong inference! Two observed clues point to the same place. Let’s check the evidence behind your answer.', archiveEvidence, 'Explain your evidence →');
    else wrong(button, index === 0 ? 'The keeper heard something, but did not see moths. That is a possibility, not strong evidence. Try a place supported by two observations.' : 'That could be an interesting guess, but no note says the moths like books. Use the wingprints and the plant to choose.');
  });
}
function archiveEvidence() {
  shell('WHISPER LIBRARY · CHECK YOUR REASONING', 'Which clue is the strongest?', `<p>Your answer is the glasshouse. Now choose the evidence that actually supports it.</p><div class="story-quote">An observation is something a witness noticed. An inference is a conclusion we draw from observations.</div>`, 'Choose what was seen or found, rather than what someone imagined.');
  choices(['The keeper guessed the rustle might be moths.', 'Silver wingprints went east, and fresh moonmint was on the lantern.', 'Glasshouses look like beautiful places for moths.'], (index, button, holder) => {
    if (index !== 1) { wrong(button, 'That is a guess or an opinion. We need observations: what someone actually saw or found.'); return; }
    state.archive = true; state.started = true; save(); sparkle('archive');
    rightAnswer(button, holder, 'Discovery recorded! You used two observations to make a well-supported inference. A golden lantern lights the path to the tower.', () => { lesson.close(); }, 'See the path light up ✦');
  });
}
function roots() {
  currentPlace = 'roots';
  if (!state.archive) {
    shell('STAR TOWER · THE DICTIONARY IS WAITING', 'A spell needs a purpose', `<p>A silver owl taps a note: “First, find where the moths went. A good magician observes before casting.”</p><p>The Whisper Library has the witnesses’ notes.</p>`);
    nextButton('Follow the owl to the library →', () => visit('archive')); return;
  }
  if (state.roots) {
    shell('STAR TOWER · DISCOVERY FOUND', 'A little light, again', `<div class="root-cards"><div class="root-card"><strong>re-</strong><span>again</span></div><div class="root-card"><strong>lumin</strong><span>light</span></div><div class="root-card"><strong>-ate</strong><span>make or do</span></div></div><p><strong>Reluminate</strong> means “give light again.” Your spell has revealed silver moths in the glasshouse. Now they need a gentle guide-light.</p>`);
    nextButton('Visit the Moonmint Glasshouse →', () => visit('potion')); return;
  }
  shell('02 / STAR TOWER · WORD ROOTS', 'A spell hidden inside a word', `<p>The ancient spellbook opens. You need to <strong>give the broken lantern light again</strong>. Use these word parts to choose a spell.</p><div class="root-cards"><div class="root-card"><strong>re-</strong><span>again</span></div><div class="root-card"><strong>lumin</strong><span>light</span></div><div class="root-card"><strong>-ate</strong><span>make or do</span></div></div><p>Spells in this story are invented, but these are real word parts. You might know <em>illuminate</em>: to light something up.</p>`, 'You need both “again” and “light.” Find re- and lumin in the same word.');
  choices(['Transport — trans means across; port means carry.', 'Reluminate — re means again; lumin means light.', 'Dehydrate — de means remove; hydr means water.'], (index, button, holder) => {
    if (index === 1) rightAnswer(button, holder, 'Yes! The pieces point to the spell’s meaning. Before you cast it, put that meaning into your own words.', rootMeaning, 'Read the spell’s meaning →');
    else wrong(button, index === 0 ? 'Transport means carry across. That could move something, but our lantern needs light again. Look for re- and lumin.' : 'Dehydrate means remove water. The lantern is dark, not too wet. Look for the word parts meaning again and light.');
  });
}
function rootMeaning() {
  shell('STAR TOWER · CAST WITH UNDERSTANDING', 'What will “reluminate” do?', `<p>Your wand glows when you understand a spell. What do <strong>re- + lumin + -ate</strong> tell you?</p>`, 'Re- adds “again.” Lumin brings the idea of “light.”');
  choices(['Make something disappear.', 'Give something light again.', 'Carry something across the room.'], (index, button, holder) => {
    if (index !== 1) { wrong(button, 'Try putting the meanings together slowly: again + light + make or do.'); return; }
    state.roots = true; save(); sparkle('roots');
    rightAnswer(button, holder, 'Reluminate! The tower crystal wakes. Silver moths shimmer into view in the glasshouse. They were hidden in the shadows all along.', () => lesson.close(), 'See your spell in the world ✦');
  });
}
function potion() {
  currentPlace = 'potion';
  if (!state.roots) {
    shell('MOONMINT GLASSHOUSE · A QUIET RUSTLE', 'Something is hiding in the leaves', `<p>Moonmint grows beneath warm glass, but the moths are too dim to see. You need a spell to reveal them before you can brew their guide-light.</p><p>${state.archive ? 'The Star Tower has a dictionary of spell roots.' : 'Start with the witness notes in the Whisper Library.'}</p>`);
    nextButton(state.archive ? 'Visit the Star Tower →' : 'Visit the Whisper Library →', () => visit(state.archive ? 'roots' : 'archive')); return;
  }
  if (state.potion) {
    shell('MOONMINT GLASSHOUSE · DISCOVERY FOUND', 'A gentle guide-light', `<p>Your vial glows with a calm, honey-colored light. The moths gather around it.</p><div class="story-quote">Four drops of stardew, two of moonmint.<br>Warm, then stir, then ring.<br>A careful measure; a gentle glow.</div><p>The Moonwell is ready for your final spell.</p>`);
    nextButton('Return to the Moonwell →', () => visit('well')); return;
  }
  mixture = { dew:0, mint:0 };
  shell('03 / MOONMINT GLASSHOUSE · POTION RATIOS', 'Measure a little moonlight', `<p>The moths are safe, but too nervous to leave. A guide-light potion will help. The recipe says:</p><div class="story-quote">Use <strong>2 drops of stardew for every 1 drop of moonmint</strong>.<br>Make <strong>6 drops altogether</strong>.</div><div class="ingredients"><div class="ingredient"><span aria-hidden="true">✦</span><strong>Stardew</strong><div class="stepper"><button type="button" data-ingredient="dew" data-change="-1" aria-label="Remove one drop of stardew">−</button><output id="dew-count" aria-live="polite">0</output><button type="button" data-ingredient="dew" data-change="1" aria-label="Add one drop of stardew">+</button></div></div><div class="ingredient"><span aria-hidden="true">❧</span><strong>Moonmint</strong><div class="stepper"><button type="button" data-ingredient="mint" data-change="-1" aria-label="Remove one drop of moonmint">−</button><output id="mint-count" aria-live="polite">0</output><button type="button" data-ingredient="mint" data-change="1" aria-label="Add one drop of moonmint">+</button></div></div></div><p class="measure-total" id="measure-total">0 of 6 drops</p><button type="button" id="mix" class="gold-button">Check my mixture ✦</button>`, 'One recipe group is 2 stardew + 1 moonmint = 3 drops. Six drops needs two groups. Double BOTH ingredients.');
  $('lesson-content').querySelectorAll('[data-ingredient]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.ingredient;
    mixture[key] = Math.max(0, Math.min(8, mixture[key] + Number(button.dataset.change)));
    $(key + '-count').textContent = mixture[key];
    $('measure-total').textContent = `${mixture.dew + mixture.mint} of 6 drops`;
  }));
  $('mix').addEventListener('click', () => {
    const result = checkMixture(mixture.dew, mixture.mint); feedback(result.message, result.correct);
    if (result.correct) { $('mix').disabled = true; $('lesson-content').querySelectorAll('[data-ingredient]').forEach(b => b.disabled = true); nextButton('Read the brewing instructions →', brewing); }
  });
}
function brewing() {
  order = [];
  shell('MOONMINT GLASSHOUSE · READ THE SEQUENCE', 'The order makes the magic', `<p>You measured the ingredients. Now the recipe gives three instructions:</p><div class="story-quote">Warm the mixture <strong>before</strong> you stir it.<br>Ring the tiny bell <strong>only after</strong> stirring.</div><p>Tap the actions in the order you should do them.</p><div class="order-slots" aria-label="Chosen brewing sequence"><span id="order-0">1 · ?</span><span id="order-1">2 · ?</span><span id="order-2">3 · ?</span></div><div class="sequence-buttons"><button type="button" class="choice" data-action="ring">Ring the bell</button><button type="button" class="choice" data-action="stir">Stir gently</button><button type="button" class="choice" data-action="warm">Warm the vial</button></div><button type="button" class="text-button" id="clear-order">Clear the order</button><br><button type="button" class="gold-button" id="brew">Brew the guide-light ✦</button>`, '“Before” tells you warm comes earlier than stir. “Only after stirring” tells you ring comes later.');
  const names = { warm:'Warm', stir:'Stir', ring:'Ring' };
  $('lesson-content').querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    if (order.length >= 3) return;
    order.push(button.dataset.action); button.disabled = true;
    $('order-' + (order.length - 1)).textContent = `${order.length} · ${names[button.dataset.action]}`;
    announce(`Step ${order.length}: ${names[button.dataset.action]}`);
  }));
  $('clear-order').addEventListener('click', brewing);
  $('brew').addEventListener('click', () => {
    if (order.length < 3) { feedback('Choose all three actions first. Read “before” and “only after” carefully.'); return; }
    if (!correctOrder(order)) { feedback('The vial gives a harmless puff of mint! Warm must come before stir, and ring must come after stir. Clear your order and try again.'); return; }
    state.potion = true; save(); sparkle('potion'); $('brew').disabled = true; $('clear-order').disabled = true;
    feedback('Warm → stir → ring! A soft golden guide-light blooms. Your careful reading and measuring made a potion the moths trust.', true);
    nextButton('Carry your guide-light to the Moonwell →', () => visit('well'));
  });
}
function well() {
  currentPlace = 'well';
  if (state.complete) { ending(); return; }
  if (!state.potion) {
    shell('THE MOONWELL · A CONSTELLATION ASLEEP', 'Three discoveries, one small wonder', `<p>The broken Moon Lantern waits above the water. You will need to find the moths, understand a light spell, and brew a gentle guide-light before it can shine again.</p><p>${$('next-task').textContent}</p>`);
    nextButton('Follow your next clue →', () => visit(!state.archive ? 'archive' : !state.roots ? 'roots' : 'potion')); return;
  }
  shell('THE MOONWELL · ONE LAST INFERENCE', 'How should we bring them home?', `<p>The silver moths follow you to the Moonwell. Professor Wren’s letter said they are shy. Your potion gives a calm light, and you know how to give the lantern light again.</p><p>Which plan uses everything you discovered?</p>`, 'The moths are shy. Your spell restores light, and your potion guides gently. Use both together.');
  choices(['Shout the loudest spell you know to chase them into the lantern.', 'Offer the gentle guide-light, then cast Reluminate on the lantern.', 'Shake the moonmint leaves until the moths fly away.'], (index, button, holder) => {
    if (index !== 1) { wrong(button, 'Remember the letter: a loud or frightening action may scare them away. What will guide them gently and restore the lantern’s light?'); return; }
    rightAnswer(button, holder, 'You used the letter, the word roots, and your potion to make a thoughtful plan. Your wand is ready.', finish, 'Raise your wand: Reluminate! ✦');
  });
}
function finish() {
  state.complete = true; save(); sparkle('well'); lesson.close();
  announce('The moon moths return to the lantern. The academy constellation shines again!');
  $('interact').textContent = 'Read your ending ✦';
  // Leave the restored world in view. The reader chooses when to open the ending.
}
function ending() {
  shell('THE MISSING MOON MOTHS · ADVENTURE COMPLETE', 'You brought the stars home.', `<div class="completion-seal"><span aria-hidden="true">✧ ☾ ✧</span><p>Keeper of Small Wonders</p></div><div class="story-quote">One by one, the moths settle into the Moon Lantern. Silver lines stretch across the sky. The academy’s constellation glows again.<br>“Magic begins with noticing,” Professor Wren says. “You read carefully, thought kindly, and kept trying.”</div><p>You solved the mystery with:</p><div class="learned-list">✧ <strong>Evidence:</strong> two observations supported your inference.<br>✧ <strong>Word roots:</strong> re- + lumin helped you understand a spell.<br>✧ <strong>Ratios:</strong> 4 : 2 kept the same recipe as 2 : 1.<br>✧ <strong>Sequence:</strong> before and after put the steps in order.</div><p>Your discoveries are saved. You can keep exploring your restored academy.</p>`);
  nextButton('Enjoy the stars ✦', () => lesson.close());
}
function visit(place) {
  if (world) world.walkTo(places[place].approach, true);
  ({ archive, roots, potion, well })[place]();
}
$('hint-button').addEventListener('click', () => feedback(hint));
['close-lesson','leave-button'].forEach(id => $(id).addEventListener('click', () => lesson.close()));
lesson.addEventListener('close', () => { keys.clear(); $('world').focus({ preventScroll:true }); });
$('story-button').addEventListener('click', story);
$('journal-toggle').addEventListener('click', () => {
  const hidden = !$('journal').hidden; $('journal').hidden = hidden;
  $('journal-toggle').setAttribute('aria-expanded', String(!hidden));
  document.querySelector('.adventure-layout').style.gridTemplateColumns = hidden ? 'minmax(0,1fr)' : '';
  world?.resize();
});
document.querySelectorAll('[data-visit]').forEach(button => button.addEventListener('click', () => visit(button.dataset.visit)));
$('reset').addEventListener('click', () => {
  shell('A FRESH PAGE IN YOUR JOURNAL', 'Begin the mystery again?', '<p>This clears the discoveries for this demo on this device. Your other games are unaffected.</p>');
  nextButton('Start a new adventure', () => { state = freshState(); save(); world?.walkTo(new THREE.Vector3(0,0,9), true); story(); });
});
$('interact').addEventListener('click', () => {
  if (!state.started) story();
  else if (state.complete) ending();
  else if (world && world.nearest()) visit(world.nearest());
  else visit(!state.archive ? 'archive' : !state.roots ? 'roots' : !state.potion ? 'potion' : 'well');
});
const movementKeys = new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
document.addEventListener('keydown', event => {
  if (lesson.open || event.ctrlKey || event.altKey || event.metaKey || ['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)) return;
  const key = event.key.toLowerCase();
  if (movementKeys.has(key)) { keys.add(key); moveTarget = null; event.preventDefault(); }
  if (key === 'e' && world?.nearest()) { event.preventDefault(); visit(world.nearest()); }
});
document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => { keys.clear(); });
document.querySelectorAll('[data-walk]').forEach(button => {
  const key = { up:'arrowup', down:'arrowdown', left:'arrowleft', right:'arrowright' }[button.dataset.walk];
  button.addEventListener('pointerdown', event => { button.setPointerCapture(event.pointerId); keys.add(key); moveTarget = null; event.preventDefault(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type, () => keys.delete(key)));
});

// A small procedural world: original geometry, no external images or downloads.
function createWorld() {
  const host = $('world');
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x252641);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x252641, .014);
  const camera = new THREE.PerspectiveCamera(43,1,.1,150);
  camera.position.set(0,24,32); camera.lookAt(0,0,-1);
  scene.add(new THREE.HemisphereLight(0xddd5ff,0x3d3655,2.0));
  const moonlight = new THREE.DirectionalLight(0xd1dfff,2.3); moonlight.position.set(-12,24,8); moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(1024,1024); Object.assign(moonlight.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:65}); moonlight.shadow.bias = -.0008; scene.add(moonlight);
  const warmLight = new THREE.PointLight(0xffcb74,65,25,2); warmLight.position.set(0,6,3); scene.add(warmLight);
  const mats = {};
  function material(color, extra = {}) { const key = color + JSON.stringify(extra); return mats[key] ||= new THREE.MeshStandardMaterial({ color, roughness:.8, ...extra }); }
  const stone = material(0x756e9c), trim = material(0xb0a4c5), roof = material(0x504067), gold = material(0xd4b575,{metalness:.35,roughness:.4}), pathMat = material(0xaaa0b2), grass = material(0x607c7d), wood = material(0x54445d), glow = material(0xffd494,{emissive:0xffbe63,emissiveIntensity:1.2}), dark = material(0x35344c);
  function mesh(geometry, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(geometry,mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  const box = (w,h,d,mat,x,y,z,parent) => mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const cylinder = (rt,rb,h,mat,x,y,z,parent,n = 12) => mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z,parent);
  const orb = (r,mat,x,y,z,parent) => mesh(new THREE.IcosahedronGeometry(r,1),mat,x,y,z,parent);
  const ground = cylinder(22,23,1.2,material(0x49465e),0,-.8,0,scene,64);
  ground.receiveShadow = true;
  cylinder(21.5,21.5,.16,grass,0,-.13,0,scene,64);
  const walkPlane = new THREE.Mesh(new THREE.PlaneGeometry(44,44),new THREE.MeshBasicMaterial({ visible:false })); walkPlane.rotation.x = -Math.PI/2; walkPlane.position.y = .03; scene.add(walkPlane);
  const path = (x,z,w,d) => box(w,.12,d,pathMat,x,.04,z);
  path(0,5,4,21); path(0,-3,21,3.2); path(-8,0,3.4,8); path(8,0,3.4,8);
  for (let z=-13;z<15;z+=1.25) box(3.9,.016,.045,material(0x706c88),0,.112,z);
  for (let x=-12;x<13;x+=1.3) box(.045,.017,3.1,material(0x706c88),x,.115,-3);
  // Castle wall and a small entrance arch frame the courtyard.
  box(29,3,1,stone,0,1.4,-15); box(11,.45,1.5,trim,-8,3,-15); box(11,.45,1.5,trim,8,3,-15);
  for(let x=-14;x<=14;x+=2) box(.9,.65,1.2,trim,x,3.3,-15);
  function turret(x,z,height,radius=1.3,parent=scene) {
    cylinder(radius,radius,height,stone,x,height/2,z,parent);
    cylinder(radius+.17,radius+.17,.35,trim,x,height-.3,z,parent);
    cylinder(0,radius+ .5,3,roof,x,height+1.3,z,parent);
    orb(.16,gold,x,height+2.9,z,parent);
    box(.4,.9,.06,glow,x,height-1,z+radius+.01,parent);
  }
  turret(-15,-14,7); turret(15,-14,7); turret(-17,7,4,1); turret(17,7,4,1);
  function building(id) { const group = new THREE.Group(); group.userData.station = id; scene.add(group); return group; }
  function windowPanel(x,y,z,parent) { box(.9,1.4,.12,dark,x,y,z,parent); box(.65,1.1,.15,glow,x,y,z+.04,parent); box(.06,1.12,.18,trim,x,y,z+.13,parent); box(.68,.07,.18,trim,x,y,z+.13,parent); }
  const library = building('archive');
  box(7,4.8,5.8,stone,-10,2.3,-4,library); box(7.4,.4,6.2,trim,-10,.25,-4,library);
  const libRoof = cylinder(0,5.5,3.7,roof,-10,6.4,-4,library,4); libRoof.rotation.y = Math.PI/4;
  box(1.4,2.3,.2,wood,-10,1.25,-1.01,library); box(.16,2.4,.23,trim,-10.8,1.3,-.94,library); box(.16,2.4,.23,trim,-9.2,1.3,-.94,library); box(1.8,.24,.3,trim,-10,2.54,-.94,library);
  windowPanel(-12,2.8,-1.01,library); windowPanel(-8,2.8,-1.01,library);
  turret(-13.4,-4.5,5.7,.8,library);
  const book = box(1.5,.22,1,material(0xe4c892),-10,3.05,-.4,library); book.rotation.z = .12;
  const tower = building('roots');
  cylinder(2.5,2.8,8,stone,0,4,-11,tower,10); cylinder(2.9,2.9,.4,trim,0,6.8,-11,tower,10); cylinder(2.8,2.8,.4,trim,0,.3,-11,tower,10);
  cylinder(0,3.5,4.5,roof,0,10.2,-11,tower,10); orb(.24,gold,0,12.6,-11,tower);
  for (const x of [-1.1,1.1]) windowPanel(x,5.2,-8.6,tower);
  box(1.4,2.2,.25,wood,0,1.2,-8.25,tower);
  const towerCrystal = mesh(new THREE.OctahedronGeometry(.75),material(0xbca7ff,{emissive:0x8069d1,emissiveIntensity:.3}),0,7.7,-8.2,tower);
  const glasshouse = building('potion');
  box(7.5,.7,6.4,trim,10,.3,-4,glasshouse);
  const glassMat = material(0xa6d5c6,{transparent:true,opacity:.44,roughness:.15,metalness:.08});
  box(6.8,3.5,5.7,glassMat,10,2.25,-4,glasshouse);
  for (const x of [6.5,8.25,10,11.75,13.5]) { box(.14,4.1,.16,gold,x,2.2,-1,glasshouse); box(.14,4.1,.16,gold,x,2.2,-7,glasshouse); }
  for (const z of [-7,-5,-3,-1]) { box(.15,4.1,.15,gold,6.5,2.2,z,glasshouse); box(.15,4.1,.15,gold,13.5,2.2,z,glasshouse); }
  box(7.3,.14,6.2,gold,10,4.2,-4,glasshouse);
  const greenRoof = cylinder(0,5,2.8,glassMat,10,5.6,-4,glasshouse,4); greenRoof.rotation.y = Math.PI/4;
  for (const x of [7.7,9.2,10.8,12.3]) { cylinder(.45,.3,.8,material(0xa98582),x,1,-3,glasshouse); orb(.72,material(0x74b792),x,1.8,-3,glasshouse); }
  const cauldron = cylinder(.85,.6,1.1,material(0x3f4355,{metalness:.5}),10,1,-.2,glasshouse);
  const potionSurface = cylinder(.7,.7,.05,material(0x86d3c0,{emissive:0x56a77f,emissiveIntensity:.8}),10,1.57,-.2,glasshouse);
  cauldron.rotation.z = .015;
  // Moonwell: a floating prism held inside three fine rings.
  const wellGroup = building('well');
  cylinder(2.6,2.8,.4,trim,0,.2,2,wellGroup,24); cylinder(2.25,2.5,.65,stone,0,.64,2,wellGroup,24);
  cylinder(2.17,2.17,.08,material(0x88adcc,{emissive:0x244662,metalness:.6,roughness:.2}),0,1,2,wellGroup,32);
  cylinder(.55,.8,1.4,trim,0,1.45,2,wellGroup);
  const lantern = mesh(new THREE.OctahedronGeometry(.9),material(0xc2b1eb,{emissive:0x9981db,emissiveIntensity:.25,metalness:.25,roughness:.2}),0,3.3,2,wellGroup);
  const rings = [];
  for (let i=0;i<3;i++) { const ring = mesh(new THREE.TorusGeometry(1.38,.035,6,40),gold,0,3.3,2,wellGroup); ring.rotation.set(i*.85,.6+i*.8,i*.4); rings.push(ring); }
  // Small details reward wandering: lantern paths, mushrooms, flowering trees.
  const lamps = [];
  function lamp(x,z) {
    cylinder(.09,.16,2.1,wood,x,1,z); cylinder(.35,.25,.17,gold,x,2.08,z); const light = orb(.3,glow,x,2.45,z); cylinder(0,.45,.38,roof,x,2.86,z); lamps.push(light);
  }
  for(const [x,z] of [[-3,8],[3,8],[-5,-3],[5,-3],[-6,2],[6,2],[-3,-7],[3,-7],[-13,4],[13,4]]) lamp(x,z);
  function tree(x,z,s=1) {
    cylinder(.15*s,.3*s,2.8*s,wood,x,1.3*s,z);
    orb(1.55*s,material(0xaaa0c2),x,3*s,z); orb(1.1*s,material(0xc8aec7),x-.7*s,3.5*s,z+.15); orb(1.05*s,material(0x8c8db4),x+.8*s,3.4*s,z-.3);
  }
  [[-16,-5,1],[16,-6,1.1],[-11,7,.9],[11,8,.8],[-8,12,.9],[8,13,1],[-17,1,.65],[17,0,.65]].forEach(t => tree(...t));
  for(let i=0;i<30;i++) {
    const x = Math.sin(i*13.37)*17, z = Math.cos(i*8.21)*14;
    if (Math.abs(x)<4 || (z<1 && Math.abs(x)<14)) continue;
    cylinder(.06,.08,.35,trim,x,.2,z); const cap = orb(.22,material(i%2 ? 0xc3b3e0 : 0xd4a5bd),x,.42,z); cap.scale.y = .5;
  }
  for (const [x,z] of [[-5,6],[5,6],[-5,10],[5,10]]) { box(1.6,.4,1.6,trim,x,.16,z); orb(.8,material(0x719888),x,.75,z); orb(.25,material(0xe4bccb),x+.3,1.38,z); }
  // Apprentice avatar and a wand that travels with the reader.
  const player = new THREE.Group(); player.position.set(0,0,9); scene.add(player);
  cylinder(.3,.68,1.55,material(0x534378),0,1.02,0,player,10);
  orb(.38,material(0xe2c4aa),0,2.0,0,player);
  cylinder(.7,.7,.12,material(0x554179),0,2.25,0,player,12);
  cylinder(0,.45,1.0,material(0x69508e),0,2.74,0,player,10);
  cylinder(.47,.47,.13,gold,0,2.3,0,player,12);
  const wand = cylinder(.04,.055,1.1,wood,.56,1.4,.12,player,6); wand.rotation.z = -.7;
  const wandTip = orb(.11,glow,.89,1.81,.12,player);
  const targetRing = mesh(new THREE.RingGeometry(.22,.33,30),new THREE.MeshBasicMaterial({color:0xffe1a6,side:THREE.DoubleSide,transparent:true,opacity:.7}),0,.16,0); targetRing.rotation.x=-Math.PI/2; targetRing.visible=false;
  // Stable deterministic stars and floating moths, kept light enough for tablets.
  const starPositions = [];
  for(let i=0;i<140;i++) { const a=i*2.39996; const radius=30+(i%7)*2; starPositions.push(Math.cos(a)*radius,12+(i%19)*1.1,Math.sin(a)*radius-12); }
  const starsGeo = new THREE.BufferGeometry(); starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars = new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xf7e2c2,size:.11,transparent:true,opacity:.75,sizeAttenuation:true})); scene.add(stars);
  const moon = orb(2,material(0xf3e2ba,{emissive:0xf1d5a8,emissiveIntensity:.7}),-18,19,-29); moon.castShadow = false;
  const moths = [];
  for(let i=0;i<14;i++) {
    const moth = new THREE.Group(); scene.add(moth);
    const wingMat = material(0xe2d2ff,{emissive:0xc2ace8,emissiveIntensity:1.2,side:THREE.DoubleSide});
    const left = mesh(new THREE.SphereGeometry(.13,6,4),wingMat,-.13,0,0,moth); left.scale.set(1.2,.25,1.6);
    const right = mesh(new THREE.SphereGeometry(.13,6,4),wingMat,.13,0,0,moth); right.scale.copy(left.scale);
    moths.push({group:moth,left,right});
  }
  const constellationPoints = [[-8,13,-14],[-4,16,-14],[0,14,-14],[4,17,-14],[8,14,-14],[4,11,-14],[0,14,-14],[-4,11,-14],[-8,13,-14]];
  const constellation = new THREE.Group(); scene.add(constellation);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(constellationPoints.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:0xf8db93,transparent:true,opacity:.8})); constellation.add(line);
  constellationPoints.slice(0,-1).forEach(p=>orb(.14,glow,...p,constellation));
  const beams = [];
  for(let i=0;i<30;i++) { const m=orb(.065,glow,0,0,0); m.visible=false; beams.push(m); }
  let burst = null;
  const raycaster = new THREE.Raycaster();
  let pointerStart;
  host.addEventListener('pointerdown', event => { pointerStart = {x:event.clientX,y:event.clientY}; });
  host.addEventListener('pointerup', event => {
    if (!pointerStart || Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>9 || lesson.open) return;
    const rect=host.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const intersections=raycaster.intersectObjects([library,tower,glasshouse,wellGroup],true);
    if(intersections.length) { let object=intersections[0].object; while(object && !object.userData.station) object=object.parent; if(object?.userData.station) { visit(object.userData.station); return; } }
    const hits=raycaster.intersectObject(walkPlane); if(hits.length) { moveTarget=hits[0].point.clone(); moveTarget.x=THREE.MathUtils.clamp(moveTarget.x,-16,16); moveTarget.z=THREE.MathUtils.clamp(moveTarget.z,-7.5,14); targetRing.position.copy(moveTarget); targetRing.position.y=.16; targetRing.visible=true; }
    host.focus({preventScroll:true});
  });
  function resize() {
    const w=host.clientWidth,h=host.clientHeight;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
    // Preserve a useful horizontal view of all three stations on narrow screens.
    const scale=Math.max(1,1.3/camera.aspect);
    camera.position.set(player.position.x*.18,24*scale,32*scale+player.position.z*.08);
    camera.lookAt(player.position.x*.08,1,-1+player.position.z*.05);
    scene.fog.density=.014/scale;
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function nearest() { let result=null,distance=5.0; for(const [id,p] of Object.entries(places)) { const d=player.position.distanceTo(p.approach); if(d<distance) {distance=d;result=id;} } return result; }
  function refresh() {
    towerCrystal.material.emissiveIntensity=state.roots?1.3:.25;
    potionSurface.material.emissiveIntensity=state.potion?2:.5;
    lantern.material.emissiveIntensity=state.complete?2.2:state.roots?.65:.2;
    lantern.material.color.setHex(state.complete?0xffdda0:0xc2b1eb);
    constellation.visible=state.complete;
    lamps.forEach((lamp,i)=>lamp.scale.setScalar(state.archive?1:i%2?.65:.85));
    warmLight.intensity=state.complete?130:state.archive?85:55;
  }
  function canWalk(x,z) {
    if(x<-16 || x>16 || z<-7.5 || z>14) return false;
    if(z<-.6 && ((x>-13.8 && x<-6.2) || (x>6.2 && x<13.8))) return false;
    if(Math.hypot(x,z-2)<2.6) return false;
    return true;
  }
  let last=performance.now();
  let elapsed=0;
  const markerPoint=new THREE.Vector3();
  const markers=[...document.querySelectorAll('[data-marker]')];
  const direction=new THREE.Vector3();
  const viewTarget=new THREE.Vector3();
  let lastNearest='';
  function frame(now) {
    requestAnimationFrame(frame);
    const dt=Math.min((now-last)/1000,.05); last=now;
    if(document.hidden) return;
    elapsed+=dt;
    direction.set(0,0,0);
    if(!lesson.open) {
      if(keys.has('w')||keys.has('arrowup')) direction.z-=1;
      if(keys.has('s')||keys.has('arrowdown')) direction.z+=1;
      if(keys.has('a')||keys.has('arrowleft')) direction.x-=1;
      if(keys.has('d')||keys.has('arrowright')) direction.x+=1;
      if(moveTarget && !direction.lengthSq()) { direction.subVectors(moveTarget,player.position); direction.y=0; if(direction.length()<.22) {moveTarget=null;targetRing.visible=false;direction.set(0,0,0);} }
      if(direction.lengthSq()) {
        direction.normalize(); const nx=player.position.x+direction.x*5*dt,nz=player.position.z+direction.z*5*dt;
        const allowX=canWalk(nx,player.position.z),allowZ=canWalk(player.position.x,nz);
        if(allowX) player.position.x=nx; if(allowZ) player.position.z=nz;
        if(!allowX && !allowZ) {moveTarget=null;targetRing.visible=false;}
        player.rotation.y=Math.atan2(direction.x,direction.z); player.position.y=reduceMotion?0:Math.sin(elapsed*12)*.035;
      } else player.position.y=0;
    }
    const viewScale=Math.max(1,1.3/camera.aspect);
    viewTarget.set(player.position.x*.18,24*viewScale,32*viewScale+player.position.z*.08);
    camera.position.lerp(viewTarget,Math.min(1,dt*2.5)); camera.lookAt(player.position.x*.08,1, -1+player.position.z*.05);
    if(!reduceMotion) { lantern.rotation.y=elapsed*.35; lantern.position.y=3.3+Math.sin(elapsed*1.5)*.1; towerCrystal.rotation.y=elapsed*.4; rings.forEach((r,i)=>r.rotation.y+=dt*.1*(i+1)); wandTip.scale.setScalar(.9+Math.sin(elapsed*4)*.2); }
    moths.forEach((m,i)=>{
      m.group.visible=state.roots;
      const a=elapsed*(reduceMotion?0:.45)+i*2.39996;
      const center=state.complete?new THREE.Vector3(0,3.5,2):new THREE.Vector3(10,3,-1);
      m.group.position.set(center.x+Math.cos(a)*(1.2+i%3*.65),center.y+Math.sin(a*1.8)*.6+(i%4)*.35,center.z+Math.sin(a)*1.8);
      if(!reduceMotion) {m.left.rotation.z=Math.sin(elapsed*12+i)*.6;m.right.rotation.z=-m.left.rotation.z;}
    });
    if(burst) { const age=(now-burst.time)/1000; beams.forEach((b,i)=>{b.visible=age<1.4;b.position.copy(burst.point).add(new THREE.Vector3(Math.sin(i*2.4)*age*4,1.5+age*3+Math.cos(i)*age,Math.cos(i*2.4)*age*4)); b.scale.setScalar(Math.max(.05,1.3-age));});if(age>1.4)burst=null; }
    const heading=document.querySelector('.world-heading');
    const safeTop=heading.offsetTop+heading.offsetHeight+10;
    const placedLabels=[];
    markers.forEach(label=>{
      const p=places[label.dataset.marker].position;
      markerPoint.set(p.x,label.dataset.marker==='roots'?13.4:label.dataset.marker==='well'?4.7:8,p.z).project(camera);
      label.hidden=markerPoint.z>1;
      if(label.hidden) return;
      const width=label.offsetWidth,height=label.offsetHeight;
      const left=THREE.MathUtils.clamp((markerPoint.x*.5+.5)*host.clientWidth,width/2+8,host.clientWidth-width/2-8);
      let bottom=THREE.MathUtils.clamp((-markerPoint.y*.5+.5)*host.clientHeight,safeTop+height,host.clientHeight-100);
      // On phones the labels can share a row; stagger overlaps instead of hiding names.
      for(const previous of placedLabels) {
        if(left-width/2<previous.right+5 && left+width/2>previous.left-5 && bottom-height<previous.bottom+5 && bottom>previous.top-5) bottom=previous.bottom+height+6;
      }
      bottom=Math.min(bottom,host.clientHeight-90);
      label.style.left=`${left}px`;label.style.top=`${bottom}px`;
      placedLabels.push({left:left-width/2,right:left+width/2,top:bottom-height,bottom});
    });
    const near=nearest();
    const buttonText=!state.started?'Begin the mystery ✦':state.complete?'Read your ending ✦':near?`Explore ${places[near].name} ✦`:'Follow your next clue ✦';
    if(buttonText!==lastNearest) {$('interact').textContent=buttonText;lastNearest=buttonText;}
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  refresh();
  return {resize,refresh,nearest,cast(point){burst={point:point.clone(),time:performance.now()};},walkTo(position,instant=false){if(instant){player.position.copy(position);moveTarget=null;targetRing.visible=false;}else moveTarget=position.clone();}};
}
try { world = createWorld(); } catch (error) {
  console.warn('Spellbound courtyard unavailable; story controls remain usable.',error);
  $('render-fallback').hidden = false;
  $('walk-help').textContent = 'Choose a location below to explore the full story.';
}
updateUI();
