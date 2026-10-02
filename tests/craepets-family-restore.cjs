#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(ROOT,"house-test/engine.js"),"utf8");
const saveCopy=fs.readFileSync(path.join(ROOT,"house-test/save-copy.js"),"utf8");
const prefix="craepets.house.v1.",recovery="craepets.house.import-recovery.v1";
let checks=0;const clone=x=>JSON.parse(JSON.stringify(x));
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function boot(initial={},options={}){
  const values=new Map(Object.entries(initial)),writes=[];let fault=options.fault,readFault=null,limit=Infinity;
  const storage={
    getItem:key=>{if(readFault&&readFault(key,values.get(key)??null))throw Error('Storage read unavailable');return values.get(key)??null;},
    setItem(key,value){value=String(value);if(fault&&fault(key,value,"set"))throw Error("Storage unavailable");
      const size=[...values].reduce((n,[k,v])=>n+2*(k.length+v.length),0)-2*(key.length+(values.get(key)||"").length)*(values.has(key)?1:0)+2*(key.length+value.length);
      if(size>limit)throw Error("Quota exceeded");values.set(key,value);writes.push(["set",key,value]);},
    removeItem(key){if(fault&&fault(key,null,"remove"))throw Error("Storage unavailable");values.delete(key);writes.push(["remove",key]);}
  };
  const context={window:{CraepetsSaveMode:{id:options.mode||"game",prefix:"craepets.house."}},localStorage:storage,console:{warn(){}},Date};
  for(const file of ["lines.js","pets.js","data.js"])vm.runInNewContext(fs.readFileSync(path.join(ROOT,"games/craepets",file),"utf8"),context);
  vm.runInNewContext(saveCopy,context);
  vm.runInNewContext(section("  var D = window.CPData,","  /* ---------- little DOM helpers")+
    "var SLOTS="+source.match(/var SLOTS = (\d+);/)[1]+",EGG_NEED="+source.match(/var EGG_NEED = (\d+),/)[1]+";\n"+
    section("  function blankSave(","  var quietSave")+section("  var STYLE =","  function ownsStyle")+
    section("  function saveRecord(","  function resetSheet()")+
    "window.HouseSaves.setPreparer(importCandidate);window.Test={blank:blankSave,load:load};",context);
  return {api:context.window.HouseSaves,values,writes,context,storage,limit(n){limit=n;},fault(fn){fault=fn;},
    readFault(fn){readFault=fn;},size(){return [...values].reduce((n,[k,v])=>n+2*(k.length+v.length),0);}};
}
function saved(test,id,name=id){
  const s=clone(test.context.window.Test.blank(test.context.window.CPData.profile(id)));
  s.pet={name,species:"blorb",colour:"meadow",born:Date.now(),hunger:80,happy:85,energy:95,clean:90,xp:123,wear:{}};
  return s;
}
function fixture(){
  const t=boot(),ids=Array.from(t.api.ids);
  for(const id of ids){t.values.set(prefix+id,JSON.stringify(saved(t,id,"Old "+id)));t.values.set("craepets.v1."+id,"original:"+id);t.values.set("craepets.house.reset."+id,"reset:"+id);t.values.set("craepets.house.position."+id,"position:"+id);}
  for(const [k,v]of Object.entries({"craepets.house.who":"cory","craepets.who":"ellie","craepets.voice":"1","craepets.house.voice":"0","craepets.house.before-import":"old safety copy","post-office.v1":"mail"}))t.values.set(k,v);
  return t;
}
function family(t){const profiles={};for(const id of t.api.ids){profiles[id]=saved(t,id,"New "+id);profiles[id].coins=321;}return {format:"craepets-family",version:1,profiles,who:"ellie"};}
function unchanged(t,before){assert.deepEqual([...t.values].filter(([k])=>k!==recovery).sort(),[...before].sort());}
function check(name,fn){fn();checks++;console.log("PASS "+name);}
const invalid=[
  ["stats string",s=>s.stats="broken"],["fractional house",s=>s.house={level:1.5}],
  ["review null",s=>s.review=[null]],["bag count string",s=>s.bag.apple="9"],
  ["subject stats string",s=>s.stats.bySubject="broken"],["room array",s=>s.house.rooms.nest=[]],
  ["pet unknown species",s=>s.pet.species="missing"],["pet unknown colour",s=>s.pet.colour="missing"],
  ["blank name",s=>s.pet.name=" "],["invalid needs",s=>s.pet.energy=null],["bad diary",s=>s.diary=[{s:{}}]],
  ["mail markup shape",s=>s.mail=[{from:"ellie",id:"apple",note:{}}]],["invalid quest",s=>s.quests=[{}]],
  ["bad coins",s=>s.coins=-1],["bad bank",s=>s.bank=[]],["seen string",s=>s.seen.a="broken"],
  ["pet array",s=>s.pet=[]],["bad version",s=>s.v=2],["review answer",s=>s.review=[{q:{q:"Q",choices:[{t:"2"}],answer:8}}]]
];
for(const id of ["jeannie","cory","ellie","kieran","shannon","tristan","guest"])for(const[name,mutate]of invalid)check(id+" rejects "+name,()=>{
  const t=fixture(),f=family(t),before=[...t.values];mutate(f.profiles[id]);const raw=JSON.stringify(f);
  assert.throws(()=>t.api.restore(f));unchanged(t,before);assert.equal(JSON.stringify(f),raw);assert.equal(t.writes.length,0);
});
for(const [name,input]of [["invalid JSON","{"],["empty family",{format:"craepets-family",profiles:{}}],["unknown ID",{format:"craepets-family",profiles:{dad:{v:1,pet:{name:"Dad",species:"blorb",colour:"meadow"}}}}],["array profiles",{format:"craepets-family",profiles:[]}],["unsupported family version",{format:"craepets-family",version:2,profiles:{}}]])check(name,()=>{const t=fixture(),before=[...t.values];assert.throws(()=>t.api.restore(input,"cory"));unchanged(t,before);});
check("prepare is detached; all seven profiles retain tier, progress and namespaces",()=>{
 const t=fixture(),f=family(t),before=[...t.values],raw=JSON.stringify(f);
 for(const id of t.api.ids){const s=f.profiles[id];s.bag.apple=9;s.bank={balance:500,day:s.day,earned:35};s.stall={name:"Shop",goods:[{id:"apple",n:2,price:8}],sales:[]};s.diary=[{s:"A day",e:"🏠"}];s.mail=[{from:"ellie",id:"apple",note:"Hello"}];}
 const incoming=JSON.stringify(f);const preview=t.api.validate(f);assert.equal(JSON.stringify(f),incoming);assert.equal(t.writes.length,0);
 assert.equal(t.api.restore(f).length,7);assert.equal(JSON.stringify(f),incoming);
 for(const id of t.api.ids){const actual=JSON.parse(t.values.get(prefix+id));assert.equal(actual.pet.name,"New "+id);assert.equal(actual.coins,321);assert.equal(actual.bag.apple,9);assert.deepEqual(actual.bank,f.profiles[id].bank);assert.equal(actual.tier,t.context.window.CPData.profile(id).tier);assert.equal(t.values.has("craepets.house.reset."+id),false);}
 const protectedKeys=before.filter(([k])=>!k.startsWith(prefix)&&!k.startsWith("craepets.house.reset.")&&k!=="craepets.house.who");for(const[k,v]of protectedKeys)assert.equal(t.values.get(k),v);
 const j=JSON.parse(t.values.get(recovery));assert.equal(j.pending,0);assert.equal(j.records.length,1);for(const[k,v]of Object.entries(j.records[0].values))assert.equal(new Map(before).get(k)??null,v);
});
for(const id of ["jeannie","cory","ellie","kieran","shannon","tristan","guest"])check(id+" legacy single-pet normalization",()=>{const t=fixture(),before=[...t.values];t.api.restore({v:1,pet:{name:"Legacy",species:"blorb",colour:"meadow"}},id);const s=JSON.parse(t.values.get(prefix+id));assert.equal(s.pet.name,"Legacy");assert.equal(s.stats.correct,0);assert.ok(Number.isFinite(s.pet.hunger));for(const[k,v]of before)if(k!==prefix+id&&k!=="craepets.house.reset."+id&&k!=="craepets.house.who")assert.equal(t.values.get(k),v);});
for(const id of ["jeannie","cory","ellie","kieran","shannon","tristan","guest"])check(id+" failed target write restores all original bytes",()=>{const t=fixture(),before=[...t.values];let once=true;t.fault(key=>{if(once&&key===prefix+id){once=false;return true;}return false;});assert.throws(()=>t.api.restore(family(t)),/earlier pets and settings were restored/);unchanged(t,before);assert.equal(JSON.parse(t.values.get(recovery)).pending,0);assert.equal(t.api.isBlocked(),false);});
for(const key of [recovery,"craepets.house.reset.cory","craepets.house.who"])check("failure at "+key,()=>{const t=fixture(),before=[...t.values];let once=true;t.fault(k=>{if(once&&k===key){once=false;return true;}return false;});assert.throws(()=>t.api.restore(family(t)));unchanged(t,before);});
check("size quota rollback frees changed pets before restoring larger old bytes",()=>{
 const t=fixture();const a=JSON.parse(t.values.get(prefix+"jeannie"));a.extra="x".repeat(4000);t.values.set(prefix+"jeannie",JSON.stringify(a));const f=family(t);
 f.profiles.cory.extra="y".repeat(2500);f.profiles.ellie.extra="z".repeat(6000);
 const before=[...t.values],values={};for(const id of t.api.ids){values[prefix+id]=t.values.get(prefix+id);values["craepets.house.reset."+id]=t.values.get("craepets.house.reset."+id);}values["craepets.house.who"]="cory";
 const pending=JSON.stringify({version:1,records:[{date:new Date().toISOString(),values}],pending:1});
 t.limit(t.size()+2*(recovery.length+pending.length)+100);
 assert.throws(()=>t.api.restore(f),/earlier pets and settings were restored/);unchanged(t,before);assert.equal(t.api.isBlocked(),false);
});
check("persistent rollback failure preserves journal, blocks writes and recovers on next boot",()=>{
 const t=fixture(),before=[...t.values];let reached=false;
 t.fault((key,value,op)=>{if(key===prefix+"ellie"&&op==="set")reached=true;return reached&&(key===prefix+"ellie"||key===prefix+"jeannie")&&op==="set";});
 assert.throws(()=>t.api.restore(family(t)),/safety copy/);assert.equal(t.api.isBlocked(),true);const j=JSON.parse(t.values.get(recovery));assert.ok(j.pending);assert.equal(j.records[0].values[prefix+"ellie"],new Map(before).get(prefix+"ellie"));
 const recovered=boot(Object.fromEntries(t.values),{mode:"house"});assert.equal(recovered.api.isBlocked(),false);
 for(const[k,v]of before)assert.equal(recovered.values.get(k),v);
 assert.equal(JSON.parse(recovered.values.get(recovery)).pending,0);
});
check("full/malformed/foreign-key journals safely refuse imports",()=>{
 for(const bad of ["{",JSON.stringify({version:1,records:[],pending:1}),JSON.stringify({version:1,records:[{date:"now",values:{"craepets.v1.cory":"attack"}}],pending:1}),JSON.stringify({version:1,records:[{date:"now",values:{[prefix+"cory"]:42}}],pending:0})]){
  const t=fixture();t.values.set(recovery,bad);const before=[...t.values];assert.throws(()=>t.api.restore(family(t)));assert.deepEqual([...t.values],before);
 }
 const t=fixture();for(let i=0;i<8;i++){t.api.restore(family(t));const s=JSON.parse(t.values.get(prefix+"cory"));s.coins=i;t.values.set(prefix+"cory",JSON.stringify(s));}
 const before=[...t.values];assert.throws(()=>t.api.restore(family(t)),/Eight/);assert.deepEqual([...t.values],before);
});
check("pending recovery failure blocks boot auto-copy",()=>{const j={version:1,records:[{date:"now",values:{[prefix+"cory"]:"original bytes"}}],pending:1};const t=boot({[recovery]:JSON.stringify(j),[prefix+"cory"]:"changed","craepets.v1.cory":JSON.stringify({v:1,pet:{name:"Source",species:"blorb",colour:"meadow"}})},{mode:"house",fault:(key,value,op)=>key===prefix+"cory"&&op==="set"});assert.equal(t.api.isBlocked(),true);assert.throws(()=>t.api.copyMissing(),/paused/);assert.equal(t.values.get("craepets.v1.cory").includes("Source"),true);});
check("pending journal acknowledgment failure refuses import without stale writes",()=>{
 const t=fixture(),before=[...t.values];let once=true;t.readFault((key,value)=>{if(once&&key===recovery&&value&&JSON.parse(value).pending){once=false;return true;}return false;});
 assert.throws(()=>t.api.restore(family(t)),/No pets were imported/);unchanged(t,before);assert.equal(t.api.isBlocked(),false);assert.equal(JSON.parse(t.values.get(recovery)).pending,0);
});
check("completed journal acknowledgment failure reports uncertainty and pauses stale engine",()=>{
 const t=fixture(),f=family(t);let sawPending=false,once=true;t.readFault((key,value)=>{if(key!==recovery||!value)return false;const j=JSON.parse(value);if(j.pending)sawPending=true;else if(sawPending&&once){once=false;return true;}return false;});
 assert.throws(()=>t.api.restore(f),/status could not be confirmed/);assert.equal(t.api.isBlocked(),true);for(const id of t.api.ids)assert.equal(JSON.parse(t.values.get(prefix+id)).pet.name,"New "+id);
 const next=boot(Object.fromEntries(t.values),{mode:"house"});assert.equal(next.api.isBlocked(),false);for(const id of next.api.ids)assert.equal(JSON.parse(next.values.get(prefix+id)).pet.name,"New "+id);
});
check("pending boot preserves exact damaged previous bytes instead of automatic recopy",()=>{
 const old="{ valuable damaged house bytes",j={version:1,records:[{date:"now",values:{[prefix+"cory"]:old}}],pending:1};
 const t=boot({[recovery]:JSON.stringify(j),[prefix+"cory"]:"partial","craepets.v1.cory":JSON.stringify({v:1,pet:{name:"Original",species:"blorb",colour:"meadow"}})},{mode:"house"});
 assert.equal(t.values.get(prefix+"cory"),old);assert.equal(JSON.parse(t.values.get(recovery)).pending,0);assert.equal(t.api.isBlocked(),false);
});
console.log("PASS family restore: "+checks+" production checks; seven profile namespaces, malformed state, exact-byte recovery, real size quota and interrupted recovery.");
