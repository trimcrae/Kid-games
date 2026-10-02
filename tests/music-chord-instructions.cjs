#!/usr/bin/env node
"use strict";
// Actual complete production scripts with DOM, time and silent-audio adapters.
// Public rendered interval recipe and an independent chromatic ordering choose notes.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const GAME=fs.readFileSync(process.env.MUSIC_CHORD_SOURCE||path.join(__dirname,"../games/music-lab/music-lab.js"),"utf8");
const DATA=fs.readFileSync(path.join(__dirname,"../games/music-lab/songs.js"),"utf8");
const HTML_IDS=[...fs.readFileSync(path.join(__dirname,"../games/music-lab/index.html"),"utf8").matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
// Read only the static public catalog, never the runtime's current question/answer.
const catalogSource=GAME.slice(GAME.indexOf("  const CHORDS = ["),GAME.indexOf("  const CHORD_LEVELS = ["));
const catalog=new Function(catalogSource+"\nreturn CHORDS;")();
const people=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
function unrelated(){const out={};for(const prefix of ["craepets.","craepets.house."])for(const who of people)out[prefix+"v1."+who]="synthetic original bytes "+prefix+who+"\n😀";return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates.v2":"coordinates bytes","life-lab-v1":"life bytes","rockDetectiveQuiz":"rock history","rockDetectiveFound":"rock museum","world-trek.v1":"world history"});}
function fixture(level=2){return {songs:{"Hot Cross Buns":true,"Twinkle, Twinkle":{stars:3}},echoBest:9,nameStars:13,staffStars:14,tune:[{note:"C4",t:0},{note:"F#4",t:120}],labels:true,flats:false,tempo:"steady",metro:false,scale:0,echoLevel:1,nameLevel:1,staffLevel:1,chordLevel:level,echoBestBy:{1:9,4:5},nameStreakBest:8,staffSpeedBest:6,chordCount:7,chordStreakBest:5,retiredHistory:"preserved"};}
function boot(RANDOM,LEVEL=2){

class E {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attrs={};this.style={};this.className='';this._text='';this._html='';this.events={};this.disabled=false;this.tabIndex=-1;this.classList={add:(...xs)=>{this.className=[...new Set(this.className.split(/\s+/).filter(Boolean).concat(xs))].join(' ')},remove:(...xs)=>{this.className=this.className.split(/\s+/).filter(x=>!xs.includes(x)).join(' ')},contains:x=>this.className.split(/\s+/).includes(x),toggle:(x,on)=>{const active=on===undefined?!this.classList.contains(x):on;active?this.classList.add(x):this.classList.remove(x);return active;}};}
 set textContent(v){this._text=String(v);this._html='';this.children=[];} get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 set innerHTML(v){this._html=String(v);this._text=String(v).replace(/<[^>]*>/g,'');this.children=[];} get innerHTML(){return this._html;}
 appendChild(x){if(x.tagName==='FRAGMENT'){for(const n of [...x.children])this.appendChild(n);return x;}this.children.push(x);x.parentElement=this;return x;}
 insertBefore(x,ref){if(x.tagName==='FRAGMENT'){for(const n of [...x.children])this.insertBefore(n,ref);return x;}const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,x);x.parentElement=this;return x;}
 setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;} removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 emit(k,e={}){e.target??=this;e.preventDefault??=()=>{};for(const fn of this.events[k]??[])fn(e);}
 click(){if(!this.disabled)this.emit('click');}
 matches(s){if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('#'))return this.id===s.slice(1);return this.tagName===s.toUpperCase();}
 closest(s){for(let e=this;e;e=e.parentElement)if(e.matches(s))return e;return null;}
 querySelectorAll(s){const selectors=s.split(',').map(x=>x.trim());const out=[];function visit(e){for(const c of e.children){if(selectors.some(s=>c.matches(s)))out.push(c);visit(c);}}visit(this);return out;}
 focus(){} scrollIntoView(){}
}

E.prototype.querySelector=function(s){return this.querySelectorAll(s)[0]||null;};
const root=new E('body'),ids={};for(const id of HTML_IDS){const e=new E();e.id=id;ids[id]=e;root.appendChild(e);}
for(const mode of ['free','songs','echo','names','staff','chords']){const e=new E('button');e.className='mode-btn';e.dataset.mode=mode;ids.modes.appendChild(e);}
const listeners={};
const document={hidden:false,getElementById:id=>ids[id],createElement:t=>new E(t),createDocumentFragment:()=>new E('fragment'),querySelectorAll:s=>root.querySelectorAll(s),addEventListener:(k,fn)=>(listeners[k]??=[]).push(fn)};
let now=0,nextTimer=1;const timers=new Map();const setTimeout=(fn,ms)=>{const id=nextTimer++;timers.set(id,{fn,at:now+ms});return id;},clearTimeout=id=>timers.delete(id);
const advance=ms=>{const end=now+ms;let steps=0;while(true){let first=null;for(const [id,t]of timers)if(t.at<=end&&(!first||t.at<first[1].at))first=[id,t];if(!first)break;if(++steps>1000)throw Error('timerloop');now=first[1].at;timers.delete(first[0]);first[1].fn();}now=end;};
const storage=new Map(Object.entries(unrelated()));storage.set('music-lab.v1',JSON.stringify(fixture(LEVEL)));const writes=[];
const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{writes.push(k);storage.set(k,String(v));}};
const window={matchMedia:()=>({matches:false})};const MathProxy=Object.create(Math);MathProxy.random=()=>RANDOM;
new Function('window','document','localStorage','setTimeout','clearTimeout','Math','performance',DATA+'\n'+GAME)(window,document,localStorage,setTimeout,clearTimeout,MathProxy,{now:()=>now});
return {ids,storage,timers,writes,advance,mode:name=>ids.modes.emit('click',{target:ids.modes.children.find(x=>x.dataset.mode===name)}),note:note=>ids.piano.children.find(x=>x.dataset.note===note).emit('click',{detail:0}),snapshot:()=>({title:ids['prompt-title'].textContent,prompt:ids['prompt-text'].textContent,chord:ids['big-note'].textContent,hint:ids['hint-line'].textContent,held:ids.piano.children.filter(x=>x.classList.contains('held')).map(x=>x.dataset.note),bad:ids.piano.children.filter(x=>x.classList.contains('bad')).map(x=>x.dataset.note),score:ids.scorebar.textContent,save:JSON.parse(storage.get('music-lab.v1'))})};
}
const pitch=note=>{const m=/^([A-G])(#?)(\d)$/.exec(note);assert.ok(m,note);return Number(m[3])*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+Number(Boolean(m[2]));};
function recipe(b){
 const text=b.snapshot().prompt,name=b.snapshot().chord,root=/Start on ([A-G])\b/.exec(text);
 assert.ok(root,"public root is stated");
 const kind=name.endsWith("major")?"Major":name.endsWith("minor")?"Minor":null;assert.ok(kind);
 const steps=new RegExp(kind+":\\s*(\\d+) steps, then (\\d+)").exec(text);assert.ok(steps,"instruction supplies major/minor adjacent-key steps");
 const keys=b.ids.piano.children.map(e=>e.dataset.note).sort((a,c)=>pitch(a)-pitch(c));
 for(let i=1;i<keys.length;i++)assert.equal(pitch(keys[i])-pitch(keys[i-1]),1,"adjacent physical piano keys are semitones");
 const start=keys.findIndex(n=>n.replace(/\d$/,"")===root[1]);assert.ok(start>=0);
 const middle=start+Number(steps[1]),last=middle+Number(steps[2]);assert.ok(last<keys.length,"recipe stays on keyboard");
 return [keys[start],keys[middle],keys[last]];
}
function preserve(b,level=2,count=7){
 assert.deepEqual(b.snapshot().save,{...fixture(level),chordCount:count},"historical music fields stay exact");
 for(const [key,value]of Object.entries(unrelated()))assert.equal(b.storage.get(key),value,key);
 assert.ok(b.writes.every(k=>k==="music-lab.v1"),"only own save key is written");
}
let checked=0;
for(let i=0;i<catalog.length;i++){
 const c=catalog[i],b=boot((i+.5)/catalog.length);b.mode("chords");assert.equal(b.snapshot().chord,c.name);
 const notes=recipe(b);assert.deepEqual(notes,c.notes,"public recipe implies native catalog notes for "+c.name);
 const expected=c.name.endsWith("major")?[4,3]:[3,4];assert.deepEqual([pitch(notes[1])-pitch(notes[0]),pitch(notes[2])-pitch(notes[1])],expected,"independent major/minor semitone oracle");
 const wrong=b.ids.piano.children.map(e=>e.dataset.note).find(n=>!notes.includes(n));b.note(wrong);assert.ok(b.snapshot().bad.includes(wrong));assert.equal(b.snapshot().held.length,0);preserve(b);
 b.note(notes[0]);b.note(notes[0]);assert.equal(b.snapshot().held.length,1);preserve(b);
 b.note(notes[1]);assert.equal(b.snapshot().held.length,2);preserve(b);
 b.note(notes[2]);assert.equal(b.snapshot().held.length,3);preserve(b,2,8);
 b.note(notes[2]);preserve(b,2,8);checked++;
 console.log("PASS Music chord recipe: "+c.name+" follows rendered steps, rejects wrong notes, scores once and preserves exact bytes.");
}
const dIndex=catalog.findIndex(c=>c.name==="D major"),d=boot((dIndex+.5)/catalog.length);d.mode("chords");
const implied=recipe(d);d.note(implied[0]);d.note("F4");assert.ok(d.snapshot().bad.includes("F4"));preserve(d);
d.note(implied[1]);d.note(implied[2]);preserve(d,2,8);
console.log("PASS Music chord recipe: D-major white-key conflict keeps legitimate wrong/correct feedback and one credit.");
// Existing challenge contracts: native Level 1 reveals notes; Level 3 conceals the name.
const easy=catalog.filter(c=>!c.hard),l1=boot(.05,1);l1.mode("chords");assert.equal(l1.snapshot().chord,easy[0].name);
for(const note of easy[0].notes)l1.note(note);preserve(l1,1,8);
const l3=boot((dIndex+.5)/catalog.length,3);l3.mode("chords");assert.equal(l3.snapshot().chord,"👂 ? ? ?");assert.equal(l3.snapshot().prompt,"Listen to the chord, then find its three notes.");
for(const note of catalog[dIndex].notes)l3.note(note);preserve(l3,3,8);
console.log("PASS Music chord recipe: existing Level1/Level3 challenge progression preserved.");
console.log("Music chord instruction properties: "+checked+" native catalog chords + D-major/level contracts passed.");
