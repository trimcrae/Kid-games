#!/usr/bin/env node
"use strict";
// Whole unmodified production game/data execute in Node with DOM/time/audio adapters.
// Answers come from the rendered public title and static public geography catalog.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const GAME=fs.readFileSync(process.env.WORLD_TREK_SOURCE||path.join(__dirname,"../games/world-trek/game.js"),"utf8");
const DATA=fs.readFileSync(path.join(__dirname,"../games/world-trek/data.js"),"utf8");
const HTML_IDS=[...fs.readFileSync(path.join(__dirname,"../games/world-trek/index.html"),"utf8").matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const people=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
function unrelated(){
 const out={};for(const prefix of ["craepets.","craepets.house."])for(const who of people)out[prefix+"v1."+who]="synthetic original bytes "+prefix+who+"\n😀";
 return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates.v2":"coordinates bytes","life-lab-v1":"life bytes","rockDetectiveQuiz":"rock history","rockDetectiveFound":"rock museum"});
}
function bootWorld(DIFF="easy",RANDOM_SEED=2){

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
const root=new E('body'), ids={};for(const id of HTML_IDS){const e=new E();e.id=id;ids[id]=e;root.appendChild(e);}
ids.world.appendChild(ids['world-labels']);root.children=root.children.filter(x=>x!==ids['world-labels']);
for(const mode of ['continents','oceans','flags','states','capitals','bigger','atlas','passport']){const e=new E('button');e.className='mode-btn';e.dataset.mode=mode;ids.modes.appendChild(e);}
for(const diff of ['easy','normal','expert']){const e=new E('button');e.className='diff-btn';e.dataset.diff=diff;ids.diffs.appendChild(e);}
const document={getElementById:id=>ids[id]??null,createElement:t=>new E(t),createDocumentFragment:()=>new E('fragment'),querySelectorAll:s=>root.querySelectorAll(s)};
let now=0,nextTimer=1;const timers=new Map();const setTimeout=(fn,ms)=>{const id=nextTimer++;timers.set(id,{fn,at:now+ms});return id;};const clearTimeout=id=>timers.delete(id);
const advance=ms=>{const end=now+ms;let steps=0;while(true){let first=null;for(const [id,t]of timers)if(t.at<=end&&(!first||t.at<first[1].at))first=[id,t];if(!first)break;if(++steps>1000)throw Error('timerloop');now=first[1].at;timers.delete(first[0]);first[1].fn();}now=end;};
const storage=new Map(Object.entries(unrelated()));storage.set('world-trek.v1',JSON.stringify({stars:7,bestStreak:5,seenPlaces:{N:true},seenStates:{WA:true},seenCountries:{GB:true},diff:DIFF,expertWins:3,zoom:false}));
const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
const effects=[];const SFX={good:()=>effects.push('good'),nope:()=>effects.push('nope')};const window={matchMedia:()=>({matches:false}),SFX};
let seed=RANDOM_SEED;const MathProxy=Object.create(Math);MathProxy.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const catalog=new Function('window','document','localStorage','setTimeout','clearTimeout','Math','SFX',DATA+'\n'+GAME+'\nreturn {PLACES,STATES};')(window,document,localStorage,setTimeout,clearTimeout,MathProxy,SFX);
return {ids,timers,storage,effects,advance,catalog,now:()=>now,chooseMode:mode=>{const b=ids.modes.children.find(x=>x.dataset.mode===mode);ids.modes.emit('click',{target:b});},correct:()=>{const title=ids['prompt-title'].textContent;let key,cell,box;if(title.startsWith('Tap ')){key=Object.keys(catalog.PLACES).find(k=>title.startsWith('Tap '+catalog.PLACES[k].name+' '));box=ids.world;cell=box.children.find(x=>x.dataset.k===key);}else{key=Object.keys(catalog.STATES).find(k=>title==='Find '+catalog.STATES[k][0]+'!'||title===catalog.STATES[k][1]+' is the capital of…?');box=ids.states;cell=box.children.find(x=>x.dataset.s===key);}if(!cell)throw Error('cannot answer '+title);box.emit('click',{target:cell});return key;},wrong:()=>{const title=ids['prompt-title'].textContent;if(title.startsWith('Tap ')){const key=Object.keys(catalog.PLACES).find(k=>!title.startsWith('Tap '+catalog.PLACES[k].name+' '));ids.world.emit('click',{target:ids.world.children.find(x=>x.dataset.k===key)});}else{const key=Object.keys(catalog.STATES).find(k=>title!=='Find '+catalog.STATES[k][0]+'!'&&title!==catalog.STATES[k][1]+' is the capital of…?');ids.states.emit('click',{target:ids.states.children.find(x=>x.dataset.s===key)});}},hint:()=>ids['prompt-actions'].children.find(x=>x.textContent.includes('Show me')).click(),chooseDiff:diff=>ids.diffs.emit('click',{target:ids.diffs.children.find(x=>x.dataset.diff===diff)}),skipButton:()=>ids['prompt-actions'].children.find(x=>x.textContent.includes('Skip')),skip:()=>{const b=ids['prompt-actions'].children.find(x=>x.textContent.includes('Skip'));if(!b)throw Error('missingSkip');b.click();},snapshot:()=>({title:ids['prompt-title'].textContent,score:ids.scorebar.textContent,text:ids['prompt-text'].textContent,save:JSON.parse(storage.get('world-trek.v1')),effects:[...effects]})};
}
const modes=["continents","oceans","states","capitals"],diffs=["easy","normal","expert"];
const delay=mode=>mode==="states"||mode==="capitals"?2600:2400;
const score=(b,right,asked)=>assert.ok(b.snapshot().score.includes(right+" / "+asked),b.snapshot().score);
function preserve(b){
 for(const [key,value]of Object.entries(unrelated()))assert.equal(b.storage.get(key),value,key);
 const s=b.snapshot().save;assert.equal(s.bestStreak,5);assert.equal(s.zoom,false);assert.deepEqual(s.seenCountries,{GB:true});assert.equal(s.seenPlaces.N,true);assert.equal(s.seenStates.WA,true);
}
let count=0;
function family(name,run){for(const mode of modes)for(const diff of diffs){const b=bootWorld(diff,31+count*97);b.chooseMode(mode);run(b,mode,diff);preserve(b);count++;}console.log("PASS World feedback Skip: "+name+" (4 modes × 3 tiers)");}
family("accepted feedback refuses repeated native/synthetic Skip and advances exactly once",(b,mode,diff)=>{
 b.correct();score(b,1,1);assert.equal(b.snapshot().save.stars,8);assert.equal(b.snapshot().save.expertWins,3+Number(diff==="expert"));
 b.advance(500);const before=b.snapshot();
 for(let i=0;i<5;i++)b.skip();assert.deepEqual(b.snapshot(),before,"native feedback Skip is inert");
 // Explicitly synthetic adversarial handler delivery bypasses native disabled controls.
 for(let i=0;i<5;i++)b.skipButton().emit("click");assert.deepEqual(b.snapshot(),before,"callback guard is inert");
 assert.equal(b.skipButton().disabled,true);b.advance(delay(mode)-501);score(b,1,1);
 b.advance(1);score(b,1,2);assert.equal(b.skipButton().disabled,false);
 const next=b.snapshot();b.advance(delay(mode)+1);assert.deepEqual(b.snapshot(),next,"no duplicate advance");
 b.correct();score(b,2,2);assert.equal(b.snapshot().save.stars,9);
});
family("unanswered Skip consumes only its requested question",(b,mode)=>{
 b.skip();score(b,0,2);assert.equal(b.skipButton().disabled,false);const next=b.snapshot();b.advance(delay(mode)+10);assert.deepEqual(b.snapshot(),next);assert.equal(b.snapshot().save.stars,7);
 b.correct();score(b,1,2);assert.equal(b.snapshot().save.stars,8);
});
family("wrong answer keeps Skip available and its highlight cannot skip a replacement",(b,mode)=>{
 b.wrong();score(b,0,1);assert.equal(b.skipButton().disabled,false);assert.equal(b.snapshot().save.stars,7);
 b.skip();score(b,0,2);const next=b.snapshot();b.advance(delay(mode)+10);assert.deepEqual(b.snapshot(),next);
 b.correct();score(b,1,2);assert.equal(b.snapshot().save.stars,8);
});
family("hinted pending Skip resets help; hinted accepted feedback preserves existing rewards",(b,mode,diff)=>{
 b.hint();b.skip();score(b,0,2);b.correct();score(b,1,2);assert.equal(b.snapshot().save.stars,8);
 b.advance(delay(mode));b.hint();b.correct();score(b,2,3);assert.equal(b.snapshot().save.stars,8);assert.equal(b.snapshot().save.expertWins,3+2*Number(diff==="expert"));
 const before=b.snapshot();b.skip();assert.deepEqual(b.snapshot(),before);b.advance(delay(mode));score(b,2,4);assert.equal(b.skipButton().disabled,false);
});
family("leaving accepted feedback preserves the new mode",(b,mode)=>{
 b.correct();b.advance(500);b.chooseMode("atlas");const before=b.snapshot();b.advance(delay(mode)+10);assert.deepEqual(b.snapshot(),before);assert.equal(b.snapshot().title,"The Atlas 📖");assert.equal(b.timers.size,0);
 b.chooseMode(mode);score(b,0,1);assert.equal(b.skipButton().disabled,false);
});
family("changing tier during feedback starts one usable fresh question",(b,mode,diff)=>{
 b.correct();b.advance(500);const nextDiff=diff==="expert"?"easy":"expert";b.chooseDiff(nextDiff);score(b,0,1);assert.equal(b.skipButton().disabled,false);const before=b.snapshot();b.advance(delay(mode)+10);assert.deepEqual(b.snapshot(),before);assert.equal(b.snapshot().save.diff,nextDiff);b.skip();score(b,0,2);
});
console.log("World feedback Skip: "+count+" production clock/state cases passed.");
