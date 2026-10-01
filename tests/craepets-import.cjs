#!/usr/bin/env node
"use strict";

// Actual save/import functions, actual pet/content tables, in-memory storage.
// No browser or asset downloads are needed for these transaction checks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "games/craepets/craepets.js"), "utf8");
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, "save/import source markers must exist");
  return source.slice(first, last);
}
const helpers = section("  function blankSave(", "  var quietSave") +
  section("  var STYLE =", "  function ownsStyle") +
  section("  function saveRecord(", "  function resetSheet()");
const slots = source.match(/var SLOTS = (\d+);/)[1];
const eggNeed = source.match(/var EGG_NEED = (\d+),/)[1];
const SLOT = "craepets.v1.cory", OTHER = "craepets.v1.ellie";
function boot() {
  const values = new Map(), messages = [], effects = [];
  let failWrite = false;
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrite && key === SLOT) throw new Error("Storage full");
      values.set(key, String(value));
    },
  };
  const context = { window: {}, localStorage: storage, console, messages, effects };
  for (const file of ["lines.js", "pets.js", "data.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "games/craepets", file), "utf8"), context, { filename: file });
  }
  vm.runInNewContext(`
    "use strict";
    var D=window.CPData, P=window.CPPets, SLOTS=${slots}, EGG_NEED=${eggNeed};
    var who="cory", S=null, sess={active:true}, battle={active:true}, visit={active:true}, view="farm";
    function slot(id){return "craepets.v1."+id;}
    function toast(message){messages.push(message);}
    function stopCatch(){effects.push("catch");} function stopMatch(){effects.push("match");}
    function closeSheet(){effects.push("close");} function passTime(){effects.push("time");}
    function render(){effects.push("render");} function diary(){effects.push("diary");}
    function save(){localStorage.setItem(slot(who),JSON.stringify(S));}
    function sfx(){effects.push("sound");}
    ${helpers}
    window.ImportTest={
      blank: function(){return blankSave(D.profile(who));},
      load: function(){return load(who);},
      prepare: function(s){return importCandidate(s,who);},
      ask: function(subject,tier,rung){return D.ask(subject,tier,null,rung);},
      import: importValley,
      setState: function(s){S=s;},
      state: function(){return S;},
      playing: function(){return {sess:sess,battle:battle,visit:visit,view:view};}
    };
  `, context);
  const api = context.window.ImportTest;
  const initial = JSON.parse(JSON.stringify(api.blank()));
  initial.pet = { name: "Comet", species: "blorb", colour: "meadow", born: Date.now(), hunger: 80, happy: 85, energy: 95, clean: 90, xp: 123, wear: {} };
  initial.coins = 456;
  values.set(SLOT, JSON.stringify(initial));
  values.set(OTHER, '{"pet":{"name":"Blossom"},"coins":99}');
  api.setState(initial);
  return { api, values, messages, effects, initial, fail: () => { failWrite = true; } };
}
const clone = (value) => JSON.parse(JSON.stringify(value));
const reviewQuestion = () => ({key:"review",tier:"mid",subject:"math",misses:1,q:{q:"One plus one?",subject:"math",tier:"mid",choices:[{t:"2"},{t:"3"}],answer:0}});
const invalid = [
  ["invalid JSON", () => "{"],
  ["root array", () => "[]"],
  ["new version", (s) => { s.v = 2; }],
  ["missing pet", (s) => { delete s.pet; }],
  ["pet array", (s) => { s.pet = []; }],
  ["blank name", (s) => { s.pet.name = " "; }],
  ["numeric name", (s) => { s.pet.name = 42; }],
  ["unknown species", (s) => { s.pet.species = "missing"; }],
  ["unknown colour", (s) => { s.pet.colour = "missing"; }],
  ["stats string", (s) => { s.stats = "broken"; }],
  ["stats array", (s) => { s.stats = []; }],
  ["subject stats string", (s) => { s.stats.bySubject = "broken"; }],
  ["quest string", (s) => { s.quests = "broken"; }],
  ["quest object", (s) => { s.quests = [{}]; }],
  ["trophy record", (s) => { s.trophies = {}; }],
  ["bag string", (s) => { s.bag = "broken"; }],
  ["bag count string", (s) => { s.bag.apple = "9"; }],
  ["today string", (s) => { s.today = "broken"; }],
  ["negative coins", (s) => { s.coins = -5; }],
  ["nonfinite coins", () => '{"v":1,"pet":{"name":"A","species":"blorb","colour":"meadow"},"coins":1e309}'],
  ["unknown learning tier", (s) => { s.tier = "missing"; }],
  ["house array", (s) => { s.house = []; }],
  ["fractional old house level", (s) => { s.house.level = 1.5; }],
  ["room array", (s) => { s.house.rooms.nest = []; }],
  ["stall name number", (s) => { s.stall.name = 17; }],
  ["null sale", (s) => { s.stall.sales = [null]; }],
  ["review null", (s) => { s.review = [null]; }],
  ["review missing question", (s) => { s.review = [{key:"a",tier:"mid"}]; }],
  ["seen row string", (s) => { s.seen.a = "broken"; }],
  ["wear array", (s) => { s.pet.wear = []; }],
  ["need string", (s) => { s.pet.hunger = "80"; }],
  ["null need", (s) => { s.pet.energy = null; }],
  ["egg array", (s) => { s.pet.egg = []; }],
  ["zero hatch target", (s) => { s.pet.egg = {need:0,got:0,taps:0}; }],
  ["steps string", (s) => { s.steps = "broken"; }],
  ["petpet names array", (s) => { s.petpetNames = []; }],
  ["sale missing item", (s) => { s.stall.sales = [{}]; }],
  ["wish missing item", (s) => { s.wish = {kind:"food",at:Date.now(),day:s.day}; }],
  ["wish timing string", (s) => { s.wish = {kind:"food",id:"apple",at:"broken",day:s.day}; }],
  ["harvest record", (s) => { s.harvest.farm = [{}]; }],
  ["review numeric big text", (s) => { const r=reviewQuestion();r.q.big={text:17};s.review=[r]; }],
  ["review big array", (s) => { const r=reviewQuestion();r.q.big=[];s.review=[r]; }],
  ["review narration string", (s) => { const r=reviewQuestion();r.q.say="broken";s.review=[r]; }],
  ["review lesson narration string", (s) => { const r=reviewQuestion();r.q.sayTeach="broken";s.review=[r]; }],
  ["review answer narration record", (s) => { const r=reviewQuestion();r.q.sayA={};s.review=[r]; }],
  ["review choice text number", (s) => { const r=reviewQuestion();r.q.choices[0].t=17;s.review=[r]; }],
  ["review choice emoji record", (s) => { const r=reviewQuestion();r.q.choices[0].emoji={};s.review=[r]; }],
  ["review question record", (s) => { const r=reviewQuestion();r.q.q={};s.review=[r]; }],
  ["review subject array", (s) => { const r=reviewQuestion();r.q.subject=[];s.review=[r]; }],
];
for (const [name, mutate] of invalid) {
  const test = boot(), before = [...test.values], playing = test.api.playing();
  const candidate = clone(test.initial), raw = mutate(candidate);
  test.api.import(typeof raw === "string" ? raw : JSON.stringify(candidate));
  assert.deepEqual([...test.values], before, name + ": every saved slot must remain byte-identical");
  assert.equal(test.api.state(), test.initial, name + ": the active pet must stay in memory");
  assert.deepEqual(test.api.playing(), playing, name + ": active play must stay intact");
  assert.deepEqual(test.effects, [], name + ": rejected files must not stop or repaint play");
  assert.ok(test.messages.at(-1).includes("current pet is safe"), name + ": explain why the import failed");
}
{
  const test = boot(), before = [...test.values], candidate = clone(test.initial);
  candidate.pet.name = "Transfer";
  test.fail();
  test.api.import(JSON.stringify(candidate));
  assert.deepEqual([...test.values], before, "full storage must preserve all existing saves");
  assert.equal(test.api.state(), test.initial);
  assert.deepEqual(test.effects, []);
  assert.ok(test.messages.at(-1).startsWith("Could not save"));
}
{
  const test = boot(), other = test.values.get(OTHER);
  const candidate = clone(test.initial);
  candidate.pet.name = "Transferred"; candidate.coins = 789;
  candidate.bag.apple = 9; candidate.stats.bySubject.math = 4;
  candidate.steps = {farm3:true}; candidate.visited = {ellie:true};
  candidate.parties = {"hol:spooky:2026":true}; candidate.favFound = {apple:true};
  candidate.petpetNames = {duckling:"Quack"};
  candidate.house.rooms.nest = {wall:"unknown",floor:"unknown",view:"unknown",name:"My nest"};
  test.api.import(JSON.stringify(candidate));
  assert.equal(test.api.state().pet.name, "Transferred");
  assert.equal(test.api.state().coins, 789);
  assert.equal(test.api.state().bag.apple, 9);
  assert.equal(test.api.state().stats.bySubject.math, 4);
  assert.equal(test.values.get(OTHER), other, "successful import must never touch a sibling's pet");
  const stored = JSON.parse(test.values.get(SLOT));
  assert.deepEqual(clone(test.api.load()), stored, "normalized stored state must survive a fresh load");
  assert.equal(test.api.playing().sess, null);
  assert.ok(test.effects.includes("render"));
}
{
  const test = boot();
  test.api.import(JSON.stringify({v:1,pet:{name:"Old pet",species:"blorb",colour:"meadow"}}));
  const saved = JSON.parse(test.values.get(SLOT));
  assert.equal(saved.pet.name, "Old pet");
  for (const key of ["born","hunger","happy","energy","clean","xp"]) assert.ok(Number.isFinite(saved.pet[key]), "legacy pet needs finite " + key);
  assert.deepEqual(saved.quests, []);
  assert.equal(saved.stats.correct, 0);
  assert.deepEqual(clone(test.api.load()), saved, "old backups must remain playable after reload");
}
{
  const test = boot(), candidate = clone(test.initial);
  candidate.pet.egg = {};
  candidate.house.level = 1; delete candidate.house.homes;
  test.api.import(JSON.stringify(candidate));
  assert.deepEqual(clone(test.api.state().pet.egg), {need:Number(eggNeed),got:0,taps:0});
  assert.ok(test.api.state().house.homes.length > 1, "integer legacy house levels must still migrate");
}
{
  const test = boot();
  // Every supported tier/subject/rung must keep genuine generated review
  // questions importable, including nullable speech and big-picture fields.
  for (const tier of ["tot","early","mid","big","grown"]) {
    for (const subject of ["math","word","wonder"]) {
      for (let rung=1;rung<=5;rung++) {
        const candidate=clone(test.initial);
        const q=clone(test.api.ask(subject,tier,rung));
        candidate.review=[{key:"review",tier,subject,misses:1,q}];
        assert.equal(test.api.prepare(candidate).review.length,1,"real "+tier+"/"+subject+"/"+rung+" review question");
      }
    }
  }
}
console.log("PASS Craepets import transactions: " + invalid.length + " invalid backups, storage failure, full and legacy transfers, reload and legacy eggs/houses");
