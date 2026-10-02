#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(ROOT,"house-test/engine.js"),"utf8"),saveCopy=fs.readFileSync(path.join(ROOT,"house-test/save-copy.js"),"utf8");
const ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"],prefix="craepets.house.v1.";
let checks=0;const clone=x=>JSON.parse(JSON.stringify(x));
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
function boot(initial={},options={}){
 const values=new Map(Object.entries(initial)),writes=[],warnings=[];let fault=options.fault||null,readHook=null,writeHook=null;
 const storage={
  getItem(key){if(readHook)readHook(key);if(fault&&fault(key,"get"))throw Error("Read unavailable");return values.get(key)??null;},
  setItem(key,value){if(fault&&fault(key,"set"))throw Error("Write unavailable");if(writeHook&&writeHook(key,String(value)))return;values.set(key,String(value));writes.push(["set",key,String(value)]);},
  removeItem(key){if(fault&&fault(key,"remove"))throw Error("Remove unavailable");values.delete(key);writes.push(["remove",key]);}
 };
 const context={window:{CraepetsSaveMode:{id:options.mode||"house",prefix:options.mode==="game"?"craepets.":"craepets.house."}},localStorage:storage,console:{warn:x=>warnings.push(x)},Date};
 for(const file of ["lines.js","pets.js","data.js"])vm.runInNewContext(fs.readFileSync(path.join(ROOT,"games/craepets",file),"utf8"),context);
 vm.runInNewContext(saveCopy,context);
 vm.runInNewContext(section("  var D = window.CPData,","  /* ---------- little DOM helpers")+
  "var SLOTS="+source.match(/var SLOTS = (\d+);/)[1]+",EGG_NEED="+source.match(/var EGG_NEED = (\d+),/)[1]+";\n"+
  section("  function blankSave(","  var quietSave")+section("  var STYLE =","  function ownsStyle")+
  section("  function saveRecord(","  function resetSheet()")+
  "window.SeedTest={blank:blankSave,prepare:importCandidate};",context);
 return {values,writes,warnings,context,api:context.window.HouseSaves,prepare:context.window.SeedTest.prepare,register(fn){context.window.HouseSaves.setPreparer(fn||context.window.SeedTest.prepare);},fault(fn){fault=fn;},readHook(fn){readHook=fn;},writeHook(fn){writeHook=fn;}};
}
function saved(t,id){
 const D=t.context.window.CPData,s=clone(t.context.window.SeedTest.blank(D.profile(id)));
 s.pet={name:"Original "+id,species:"blorb",colour:"meadow",born:Date.now(),hunger:80,happy:85,energy:95,clean:90,xp:123,wear:{}};
 s.coins=789;s.bag.apple=9;s.bank={balance:500,day:s.day,earned:35};s.stall={name:"Pet's shop",goods:[{id:"apple",n:2,price:8}],sales:[{id:"apple",from:"ellie",price:8,day:s.day}]};
 s.diary=[{d:s.day,t:Date.now(),e:"🏡",s:"I furnished my home",me:true}];s.mail=[{from:"ellie",id:"apple",note:"Welcome",day:s.day,t:Date.now()}];
 const h=D.HOUSES[2],wall=D.WALLS.find(x=>x.cost>0),floor=D.FLOORS.find(x=>x.cost>0),view=D.VIEWS.find(x=>x.cost>0);
 s.house={home:h.id,homes:["nest",D.HOUSES[1].id,h.id],rooms:{[h.id]:{wall:wall.id,floor:floor.id,view:view.id,name:"My paid room"}},walls:[wall.id],floors:[floor.id],views:[view.id],owned:D.FURNITURE.slice(0,3).map(x=>x.id),placed:D.FURNITURE.slice(0,2).map(x=>x.id)};
 return s;
}
function fixture(options={}){
 const t=boot({},options);for(const id of ids){t.values.set("craepets.v1."+id,JSON.stringify(saved(t,id)));t.values.set("craepets.house.position."+id,"position:"+id);}
 t.values.set("craepets.who","cory");t.values.set("craepets.voice","1");t.values.set("post-office.v1","unrelated mail");t.values.set("craepets.house.before-import","earlier safety copy");
 t.values.set("craepets.house.import-recovery.v1",' { "version": 1, "records": [], "pending": 0 } ');
 return t;
}
function originalSnapshot(t){return Object.fromEntries([...t.values].filter(([k])=>!k.startsWith(prefix)&&k!=="craepets.house.who"&&k!=="craepets.house.voice").sort());}
function originalsUnchanged(t,before){assert.deepEqual(originalSnapshot(t),before);}
function check(name,fn){fn();checks++;console.log("PASS "+name);}
const invalid=[
 ["stats string",s=>s.stats="broken"],["fractional legacy house",s=>s.house={level:1.5}],["review null",s=>s.review=[null]],["bag string count",s=>s.bag.apple="9"],
 ["subject stats",s=>s.stats.bySubject="broken"],["room array",s=>s.house.rooms.nest=[]],["species",s=>s.pet.species="missing"],["colour",s=>s.pet.colour="missing"],
 ["blank pet name",s=>s.pet.name=" "],["null needs",s=>s.pet.energy=null],["diary record",s=>s.diary=[{s:{}}]],["mail record",s=>s.mail=[{from:"ellie",id:"apple",note:{}}]],
 ["quest record",s=>s.quests=[{}]],["negative coins",s=>s.coins=-1],["bank array",s=>s.bank=[]],["seen row",s=>s.seen.a="broken"],["pet array",s=>s.pet=[]],["version",s=>s.v=2],
 ["answer index",s=>s.review=[{q:{q:"Q",choices:[{t:"2"}],answer:8}}]]
];
for(const id of ids)for(const[name,mutate]of invalid)check(id+" does not seed "+name,()=>{
 const t=fixture(),s=JSON.parse(t.values.get("craepets.v1."+id));mutate(s);t.values.set("craepets.v1."+id,JSON.stringify(s));const before=originalSnapshot(t);t.register();
 assert.equal(t.values.has(prefix+id),false);assert.equal(ids.filter(x=>t.values.has(prefix+x)).length,6);originalsUnchanged(t,before);
 assert.equal(t.values.get("craepets.house.who")==id,false,"selection cannot point to a rejected copy");
});
for(const id of ids)for(const raw of ["","null","[]","0","  ","{ valuable partial bytes",JSON.stringify({v:2,pet:{name:"Future",species:"blorb",colour:"meadow"}}),JSON.stringify({v:1,pet:{name:"Damaged",species:"blorb",colour:"meadow"},stats:"broken"})])check(id+" preserves present raw "+JSON.stringify(raw),()=>{
 const t=fixture(),before=originalSnapshot(t);t.values.set(prefix+id,raw);t.register();assert.equal(t.values.get(prefix+id),raw);originalsUnchanged(t,before);
});
for(const id of ids)for(const raw of ["1","","0"])check(id+" respects reset marker "+JSON.stringify(raw),()=>{
 const t=fixture();t.values.set("craepets.house.reset."+id,raw);const before=originalSnapshot(t);t.register();assert.equal(t.values.has(prefix+id),false);assert.equal(t.values.get("craepets.house.reset."+id),raw);originalsUnchanged(t,before);
});
for(const id of ids)for(const [key,operation]of [[prefix+id,"set"],[prefix+id,"get"],["craepets.v1."+id,"get"],["craepets.house.reset."+id,"get"]])check(id+" isolates "+operation+" failure at "+key,()=>{
 const t=fixture(),before=originalSnapshot(t);t.fault((k,op)=>k===key&&op===operation);t.register();assert.equal(t.values.has(prefix+id),false);originalsUnchanged(t,before);
 assert.equal(ids.filter(x=>t.values.has(prefix+x)).length,6,"other eligible profiles can seed independently");
});
check("waits for preparation; then seeds all seven without losing earned progress",()=>{
 const t=fixture(),before=originalSnapshot(t);assert.equal(t.writes.length,0);assert.throws(()=>t.api.copyMissing(),/still opening/);assert.equal(t.writes.length,0);
 const expected=Object.fromEntries(ids.map(id=>[id,JSON.parse(t.values.get("craepets.v1."+id))]));t.register();
 for(const id of ids){const s=JSON.parse(t.values.get(prefix+id));assert.equal(s.pet.name,"Original "+id);assert.equal(s.coins,789);assert.equal(s.bag.apple,9);assert.equal(s.tier,t.context.window.CPData.profile(id).tier);for(const key of["house","bank","stall","diary","mail"])assert.deepEqual(s[key],expected[id][key],id+" "+key+" progress");}
 originalsUnchanged(t,before);assert.equal(t.values.get("craepets.house.who"),"cory");assert.equal(t.values.get("craepets.house.voice"),"1");
 const after=Object.fromEntries(t.values),writes=t.writes.length;assert.equal(t.api.copyMissing().length,0);assert.deepEqual(Object.fromEntries(t.values),after);assert.equal(t.writes.length,writes);
});
for(const id of ids)check(id+" normalizes legacy original only in new house slot",()=>{
 const t=fixture();t.values.set("craepets.v1."+id,JSON.stringify({v:1,pet:{name:"Legacy",species:"blorb",colour:"meadow"}}));const before=originalSnapshot(t);t.register();const s=JSON.parse(t.values.get(prefix+id));assert.equal(s.pet.name,"Legacy");assert.equal(s.tier,t.context.window.CPData.profile(id).tier);assert.ok(Number.isFinite(s.pet.hunger));assert.equal(s.stats.correct,0);originalsUnchanged(t,before);
});
for(const id of ids)for(const target of ["slot","reset"])check(id+" rechecks newer "+target+" after preparation",()=>{
 const t=fixture(),raw="keep concurrent "+id,before=originalSnapshot(t);t.register((s,who)=>{const candidate=t.prepare(s,who);if(who===id)t.values.set(target==="slot"?prefix+id:"craepets.house.reset."+id,raw);return candidate;});
 assert.equal(t.values.get(target==="slot"?prefix+id:"craepets.house.reset."+id),raw);if(target==="reset")assert.equal(t.values.has(prefix+id),false);
 const protectedBefore={...before};if(target==="reset")protectedBefore["craepets.house.reset."+id]=raw;originalsUnchanged(t,Object.fromEntries(Object.entries(protectedBefore).sort()));
});
check("shared game mode never seeds even on explicit request",()=>{
 const t=fixture({mode:"game"}),before=Object.fromEntries(t.values);t.register();assert.equal(t.api.copyMissing().length,0);assert.deepEqual(Object.fromEntries(t.values),before);assert.equal(t.writes.length,0);
});
check("export-only page does not seed or change selection/preferences",()=>{
 const t=fixture(),before=Object.fromEntries(t.values);const b=t.api.bundle("original");assert.equal(Object.keys(b.profiles).length,7);assert.deepEqual(Object.fromEntries(t.values),before);assert.equal(t.writes.length,0);
});
check("existing selection and voice are preserved",()=>{
 const t=fixture();t.values.set(prefix+"ellie",JSON.stringify(saved(t,"ellie")));t.values.set("craepets.house.who","ellie");t.values.set("craepets.house.voice","");const before=originalSnapshot(t),raw=t.values.get(prefix+"ellie");t.register();assert.equal(t.values.get(prefix+"ellie"),raw);assert.equal(t.values.get("craepets.house.who"),"ellie");assert.equal(t.values.get("craepets.house.voice"),"");originalsUnchanged(t,before);
});
check("unknown original selection cannot redirect outside real profiles",()=>{
 const t=fixture();t.values.set("craepets.who","__proto__");const before=originalSnapshot(t);t.register();assert.equal(t.values.get("craepets.house.who"),"jeannie");originalsUnchanged(t,before);
});
for(const key of["craepets.house.who","craepets.house.voice"])check("metadata write failure preserves valid new copies: "+key,()=>{
 const t=fixture(),before=originalSnapshot(t);t.fault((k,op)=>k===key&&op==="set");t.register();assert.equal(ids.filter(id=>t.values.has(prefix+id)).length,7);originalsUnchanged(t,before);assert.equal(t.warnings.some(x=>x.includes("could not")),true);
});
check("unacknowledged copy is not reported successful",()=>{
 const t=fixture();t.register();for(const id of ids)t.values.delete(prefix+id);t.writeHook(k=>k===prefix+"cory");assert.equal(t.api.copyMissing().includes("cory"),false);assert.equal(t.values.has(prefix+"cory"),false);
});
check("completed pending recovery suppresses automatic recopy",()=>{
 const original=JSON.stringify({v:1,pet:{name:"Source",species:"blorb",colour:"meadow"}}),raw="{ recovered damaged bytes",journal={version:1,records:[{date:"now",values:{[prefix+"cory"]:raw}}],pending:1};
 const t=boot({[prefix+"cory"]:"partial","craepets.v1.cory":original,"craepets.house.import-recovery.v1":JSON.stringify(journal)});t.register();assert.equal(t.values.get(prefix+"cory"),raw);assert.equal(t.values.get("craepets.v1.cory"),original);assert.equal(JSON.parse(t.values.get("craepets.house.import-recovery.v1")).pending,0);
});
console.log("PASS house auto-seeding: "+checks+" production checks across seven profiles; deep source admission, every present raw target, reset/game/recovery controls, delayed registration and storage failures.");
