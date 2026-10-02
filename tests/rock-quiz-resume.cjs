#!/usr/bin/env node
"use strict";
// Actual whole production game/data scripts in a Node VM; DOM/audio are adapters.
// makeQuestion is observed only to choose an option, and its actual factory still runs.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const gameSource=fs.readFileSync(process.env.ROCK_QUIZ_SOURCE||path.join(__dirname,"../games/rock-detective/game.js"),"utf8");
const dataSource=fs.readFileSync(path.join(__dirname,"../games/rock-detective/rocks.js"),"utf8");
const htmlSource=fs.readFileSync(path.join(__dirname,"../games/rock-detective/index.html"),"utf8");

function bootRock(storage, randomSeed=117) {
  const ids=new Map(), all=[], effects={sfx:[],confetti:[]}, writes=[];
  let observedQuestion=null, stateSeed=randomSeed;
  function collect(root) { const out=[]; for(const child of root.children){out.push(child);out.push(...collect(child));} return out; }
  function matches(e,sel){
    if(sel[0]==="#")return e.id===sel.slice(1);
    const m=/^\.([\w-]+)(?:\[data-([\w-]+)="([^"]*)"\])?$/.exec(sel);if(!m)return false;
    const key=m[2]&&m[2].replace(/-([a-z])/g,(_,x)=>x.toUpperCase());
    return e.classList.contains(m[1])&&(!m[2]||String(e.dataset[key])===m[3]);
  }
  class El {
    constructor(tag) {
      this.tagName=tag.toUpperCase();this.children=[];this.parent=null;this.dataset={};this.attrs={};
      this.className="";this.textContent="";this._html="";this.hidden=false;this.disabled=false;this.style={};this.listeners={};
      const names=()=>new Set(this.className.split(/\s+/).filter(Boolean));
      this.classList={
        add:(...xs)=>{const s=names();xs.forEach(x=>s.add(x));this.className=[...s].join(" ");},
        remove:(...xs)=>{const s=names();xs.forEach(x=>s.delete(x));this.className=[...s].join(" ");},
        contains:x=>names().has(x),
        toggle:(x,on)=>{const s=names(),yes=on===undefined?!s.has(x):!!on;if(yes)s.add(x);else s.delete(x);this.className=[...s].join(" ");return yes;}
      };
    }
    appendChild(c){if(c.tagName==="FRAGMENT"){for(const el of [...c.children])this.appendChild(el);return c;}c.parent=this;this.children.push(c);return c;}
    setAttribute(k,v){this.attrs[k]=String(v);}
    addEventListener(k,f){(this.listeners[k] ||= []).push(f);}
    set innerHTML(v){this._html=v;this.children=[];if(v.includes('class="n"')){const n=new El("span");n.className="n";this.appendChild(n);}}
    get innerHTML(){return this._html;}
    querySelectorAll(sel){return collect(this).filter(e=>matches(e,sel));}
    querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
    closest(sel){let e=this;while(e){if(sel==="details"&&e.tagName==="DETAILS")return e;e=e.parent;}return null;}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);}
    focus(){document.activeElement=this;}
    click(){if(this.disabled)return;for(const f of this.listeners.click||[])f({target:this});if(this.onclick)this.onclick({target:this});}
  }
  const root=new El("root");
  for(const m of htmlSource.matchAll(/id="([^"]+)"/g)){if(ids.has(m[1]))continue;const e=new El("div");e.id=m[1];ids.set(m[1],e);root.appendChild(e);}
  for(const name of ["detective","lab","book","quiz"]){
    const tab=ids.get("tab-"+name);tab.tagName="BUTTON";tab.className="tab"+(name==="detective"?" active":"");tab.dataset.panel=name;
    ids.get(name).className="panel"+(name==="detective"?" active":"");
  }
  const document={
    activeElement:null,getElementById:id=>ids.get(id),
    createElement:tag=>new El(tag),createDocumentFragment:()=>new El("fragment"),createTextNode:text=>{const e=new El("text");e.textContent=text;return e;},
    querySelectorAll:sel=>{
      if(sel==="#clueGroups .clue")return ids.get("clueGroups").querySelectorAll(".clue");
      return collect(root).filter(e=>matches(e,sel));
    },
    querySelector:sel=>document.querySelectorAll(sel)[0]||null
  };
  const SFX=Object.fromEntries(["good","win","streak","nope"].map(k=>[k,a=>effects.sfx.push({name:k,arg:a})]));
  const Confetti={burst:o=>effects.confetti.push(o)};
  const window={SFX,Confetti,listeners:{},addEventListener(k,f){(this.listeners[k] ||= []).push(f);}};
  const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>{storage.set(k,v);writes.push(k);},removeItem:k=>{storage.delete(k);writes.push(k);}};
  const fakeMath=Object.assign(Object.create(Math),{random:()=>{stateSeed=(stateSeed*1664525+1013904223)>>>0;return stateSeed/4294967296;}});
  vm.runInNewContext(dataSource, {self:window}, {filename:"rocks.js",timeout:1000});
  const make=window.ROCK_DATA.makeQuestion;
  window.ROCK_DATA.makeQuestion=function(...args){observedQuestion=make.apply(this,args);return observedQuestion;};
  vm.runInNewContext(gameSource, {window,document,localStorage,Math:fakeMath,SFX,Confetti}, {filename:"game.js",timeout:1000});
  return {
    ids,window,effects,writes,storage,
    tab(name){ids.get("tab-"+name).click();},
    answer(correct=true){const index=observedQuestion.options.findIndex(o=>!!o.correct===correct);if(index<0)throw new Error("requested option missing");ids.get("quizOpts").children[index].click();},
    next(){ids.get("nextQuiz").click();},
    snapshot(){return {progress:ids.get("quizProgressText").textContent,score:ids.get("quizRoundScore").textContent,end:ids.get("roundScore").textContent,feedback:ids.get("quizFeedback").textContent,stored:JSON.parse(storage.get("rockDetectiveQuiz")||"null"),found:JSON.parse(storage.get("rockDetectiveFound")||"[]"),question:observedQuestion&&{prompt:observedQuestion.prompt,kind:observedQuestion.kind,answer:observedQuestion.answerText},writes:[...writes]};}
  };
}


const people=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
function unrelated(){
  const out={};
  for(const prefix of ["craepets.","craepets.house."])for(const who of people)out[prefix+"v1."+who]="synthetic original bytes "+prefix+who+"\n😀";
  return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates-v1":"coordinates bytes","life-lab-v1":"life bytes"});
}
function fixture(tier="rockhound",round=null){
  const protectedBytes=unrelated(),storage=new Map(Object.entries(protectedBytes));
  storage.set("rockDetectiveFound",JSON.stringify(["Quartz"]));
  storage.set("rockDetectiveQuiz",JSON.stringify({best:17,bests:{rockhound:17,explorer:17,geologist:17,retired:8},tier,tab:"quiz",clues:["look-speckled"],labSolved:4,labBest:2,round}));
  return {storage,protectedBytes};
}
const state=b=>b.snapshot().stored,round=b=>state(b).round;
function preserve(f,b){
  for(const [key,value] of Object.entries(f.protectedBytes))assert.equal(f.storage.get(key),value,key);
  const s=state(b);assert.equal(s.best,17);assert.equal(s.bests.rockhound,17);assert.equal(s.bests.explorer,17);assert.equal(s.bests.geologist,17);assert.equal(s.bests.retired,8);
  assert.equal(s.labSolved,4);assert.equal(s.labBest,2);assert.deepEqual(s.clues,["look-speckled"]);
  assert.ok(b.snapshot().found.includes("Quartz"));
  assert.ok(b.writes.every(key=>["rockDetectiveQuiz","rockDetectiveFound"].includes(key)));
}
function saved(tier,n,score,answered,practice=false){return {tier,qNum:n,roundScore:score,answered,practice};}
function sameSnapshot(b,run){const before=JSON.stringify({snapshot:b.snapshot(),effects:b.effects});run();assert.equal(JSON.stringify({snapshot:b.snapshot(),effects:b.effects}),before);}
let count=0;
function test(name,run){run();count++;console.log("PASS Rock quiz: "+name);}
test("ordinary round awards ten once; duplicate/stale answer and hidden Next are inert",()=>{
  const f=fixture(),b=bootRock(f.storage);
  sameSnapshot(b,()=>b.next());
  const old=b.ids.get("quizOpts").children.slice();
  b.answer();sameSnapshot(b,()=>b.answer());b.next();
  sameSnapshot(b,()=>old.forEach(button=>{button.disabled=false;for(const handler of button.listeners.click)handler({target:button});}));
  assert.equal(round(b).qNum,2);assert.equal(round(b).roundScore,1);assert.equal(round(b).answered,false);
  for(let n=2;n<=10;n++){b.answer();b.next();}
  assert.equal(b.snapshot().end,"10 / 10");assert.equal(round(b),null);sameSnapshot(b,()=>b.next());preserve(f,b);
});
test("known pending first/middle/final resume same ordinal and keep exact score on all tiers",()=>{
  for(const tier of ["explorer","rockhound","geologist"])for(const n of [1,4,10]){
    const f=fixture(tier,saved(tier,n,n-1,false)),b=bootRock(f.storage);
    assert.equal(round(b).qNum,n);assert.equal(round(b).roundScore,n-1);assert.equal(round(b).answered,false);assert.equal(round(b).practice,false);
    const c=bootRock(f.storage);assert.equal(round(c).qNum,n);c.answer();assert.equal(round(c).roundScore,n);preserve(f,c);
  }
});
test("new right/wrong answers persist phase and reload consumes each first/middle slot once",()=>{
  for(const tier of ["explorer","rockhound","geologist"])for(const n of [1,4])for(const right of [true,false]){
    const f=fixture(tier,saved(tier,n,n-1,false)),b=bootRock(f.storage);b.answer(right);
    assert.equal(round(b).answered,true);assert.equal(round(b).roundScore,n-1+Number(right));
    const c=bootRock(f.storage);assert.equal(round(c).qNum,n+1);assert.equal(round(c).roundScore,n-1+Number(right));assert.equal(round(c).answered,false);
    const d=bootRock(f.storage);assert.equal(round(d).qNum,n+1);preserve(f,d);
  }
});
test("final right/wrong reload finalizes once and tabs preserve the completed screen",()=>{
  for(const tier of ["explorer","rockhound","geologist"])for(const right of [true,false]){
    const f=fixture(tier,saved(tier,10,9,false)),b=bootRock(f.storage);b.answer(right);
    const c=bootRock(f.storage);assert.equal(c.snapshot().end,(9+Number(right))+" / 10");assert.equal(round(c),null);
    c.tab("book");c.tab("quiz");assert.equal(c.snapshot().end,(9+Number(right))+" / 10");assert.equal(c.ids.get("quizEnd").hidden,false);
    sameSnapshot(c,()=>c.next());preserve(f,c);
  }
});
test("legacy absent/nonboolean phase becomes sticky practice before display on every tier",()=>{
  for(const tier of ["explorer","rockhound","geologist"])for(const phase of [undefined,null,"true",1]){
    const r={tier,qNum:4,roundScore:3};if(phase!==undefined)r.answered=phase;
    const f=fixture(tier,r),b=bootRock(f.storage);assert.equal(round(b).qNum,4);assert.equal(round(b).roundScore,3);assert.equal(round(b).answered,false);assert.equal(round(b).practice,true);
    assert.equal(b.ids.get("quizPractice").hidden,false);
    const c=bootRock(f.storage);assert.equal(round(c).practice,true);assert.equal(round(c).roundScore,3);preserve(f,c);
  }
});
test("legacy right/wrong practice cannot add credit; next slot scores and correct identification is collected",()=>{
  for(const right of [true,false]){
    const f=fixture("rockhound",{tier:"rockhound",qNum:1,roundScore:1}),b=bootRock(f.storage);
    const expected=b.snapshot().question.answer;b.answer(right);assert.equal(round(b).roundScore,1);assert.equal(round(b).answered,true);assert.equal(round(b).practice,true);
    if(right)assert.ok(b.snapshot().found.includes(expected));
    const c=bootRock(f.storage);assert.equal(round(c).qNum,2);assert.equal(round(c).practice,false);assert.equal(c.ids.get("quizPractice").hidden,true);
    c.answer();assert.equal(round(c).roundScore,2);preserve(f,c);
  }
});
test("legacy final practice preserves earned score through repeated reload and completion",()=>{
  for(const right of [true,false]){
    const f=fixture("rockhound",{tier:"rockhound",qNum:10,roundScore:10}),b=bootRock(f.storage),c=bootRock(f.storage);
    assert.equal(round(c).practice,true);c.answer(right);assert.equal(round(c).roundScore,10);
    const d=bootRock(f.storage);assert.equal(d.snapshot().end,"10 / 10");assert.equal(round(d),null);preserve(f,d);
  }
});
test("tab navigation retains pending phase; tier/Again create a normal new round",()=>{
  const f=fixture("rockhound",{tier:"rockhound",qNum:4,roundScore:3}),b=bootRock(f.storage);
  b.tab("book");b.tab("quiz");assert.equal(round(b).qNum,4);assert.equal(round(b).practice,true);
  b.ids.get("tiers").children.find(button=>button.dataset.tier==="explorer").click();
  assert.equal(round(b).tier,"explorer");assert.equal(round(b).qNum,1);assert.equal(round(b).roundScore,0);assert.equal(round(b).practice,false);
  b.ids.get("againQuiz").click();assert.equal(round(b).qNum,1);assert.equal(round(b).answered,false);assert.equal(round(b).practice,false);preserve(f,b);
});
console.log("Rock quiz resume: "+count+" state families passed.");
