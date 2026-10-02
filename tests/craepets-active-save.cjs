#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(ROOT,"house-test/engine.js"),"utf8"),saveCopy=fs.readFileSync(path.join(ROOT,"house-test/save-copy.js"),"utf8"),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
let checks=0;const clone=x=>JSON.parse(JSON.stringify(x));
function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
function node(tag="div"){return {tagName:tag.toUpperCase(),className:"",textContent:"",dataset:{},children:[],listeners:{},attributes:{},style:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.listeners[k]=f;},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},querySelector(sel){return this.children.find(x=>sel===".saved-data-warning"&&x.className.includes("saved-data-warning"))||null;},remove(){},focus(){},click(){}};}
function boot(prefix="craepets.house.",initial={},options={}){
 const values=new Map(Object.entries(initial)),writes=[],reads=[],game=node(),tag=node(),document={hidden:false,visibilityState:"visible",body:node("body"),createElement:node,querySelector:s=>s==="#game"?game:s==="#tagline"?tag:null,querySelectorAll:()=>[],addEventListener(){}};
 let fault=null,familyBlocked=false;
 const storage={getItem(k){reads.push(k);if(fault&&fault(k,"get"))throw Error("Read unavailable");return values.get(k)??null;},setItem(k,v){if(fault&&fault(k,"set"))throw Error("Write unavailable");values.set(k,String(v));writes.push(["set",k,String(v)]);},removeItem(k){if(fault&&fault(k,"remove"))throw Error("Remove unavailable");values.delete(k);writes.push(["remove",k]);}};
 const house={isBlocked:()=>familyBlocked},context={window:{CraepetsSaveMode:{prefix,id:prefix==="craepets."?"game":"house"},HouseSaves:house,addEventListener(){}},HouseSaves:house,localStorage:storage,document,Date,console,clearTimeout(){},setTimeout(){},setInterval(){},requestAnimationFrame(){}};
 for(const file of["lines.js","pets.js","data.js"])vm.runInNewContext(fs.readFileSync(path.join(ROOT,"games/craepets",file),"utf8"),context);
 if(options.realSaves){vm.runInNewContext(saveCopy,context);context.HouseSaves=context.window.HouseSaves;}
 const stubs='var who="cory",S=null,sess=null,battle=null,visit=null,battleTimer=null,houseStation=null,view="nest",moodLine={},reviewGap=0,lastPlace="nest",pendingBuy=null,pendingSale=null,spinning=false,wheelAngle=0,pickName="",DESK=null,anim={},renders=0;'+
 'function hush(){}function stopCatch(){}function stopMatch(){}function closeSheet(){}function passTime(){}function rollDay(){}function render(){renders++;}function sfx(){}function postWaiting(){}function toast(){}function onClick(){}function onKey(){}function loop(){}function styleAllowed(s,k,id){return STYLE[k].some(function(x){return x.id===id;});}'+
 'function homeName(){return "Home";}function houseInfo(){return {};}function placedItems(){return [];}function wallNow(){return {};}function floorNow(){return {};}' ;
 const code=section("  var D = window.CPData,","  /* ---------- little DOM helpers")+'function $(s){return document.querySelector(s);}\n'+
 'var SLOTS='+source.match(/var SLOTS = (\d+);/)[1]+',EGG_NEED='+source.match(/var EGG_NEED = (\d+),/)[1]+';\n'+stubs+
 section("  function blankSave(","  var quietSave")+section("  var STYLE =","  function ownsStyle")+
 section("  var quietSave","  /* Somebody ELSE")+section("  function readSlot(","  /* NEW: walking")+
 section("  function saveRecord(","  function resetSheet()")+section("  function resetValley(","  function dayLabel(")+
 section("  function withSave(","  function visitHtml(")+section("  function switchTo(","  /* \"You have post!")+section("  function init()","  /* The clay creatures")+
 section("  window.HouseActivity = {","  document.addEventListener('click'")+
 'window.ActiveTest={register:function(){'+section("  if (window.HouseSaves) {\n    var skipAutoSeed","  if (document.readyState")+'},blank:blankSave,load:load,save:save,write:writeSlot,init:init,switch:switchTo,visit:startVisit,sync:syncFromElsewhere,import:importValley,reset:resetValley,pause:pauseSavedData,activate:function(id,s){who=id;S=s;sess={question:"live"};},flags:function(){return {who:who,state:S,session:sess,paused:loadPaused,problem:loadProblem,renders:renders};}};';
 vm.runInNewContext(code,context);
 return {values,writes,reads,game,context,api:context.window.ActiveTest,activity:context.window.HouseActivity,prefix,fault(fn){fault=fn;},familyBlocked(on){familyBlocked=on;}};
}
function saved(t,id){
 const s=clone(t.api.blank(t.context.window.CPData.profile(id)));
 s.pet={name:"Saved "+id,species:"blorb",colour:"meadow",born:Date.now(),hunger:80,happy:85,energy:95,clean:90,xp:123,wear:Object.fromEntries(t.context.window.CPPets.SLOTS.map(k=>[k,null]))};
 s.coins=789;s.bag.apple=9;s.bank={balance:500,day:s.day,earned:35};s.diary=[{d:s.day,t:Date.now(),e:"🏡",s:"Bought a home",me:true}];
 const D=t.context.window.CPData,h=D.HOUSES[2];s.house={home:h.id,homes:["nest",D.HOUSES[1].id,h.id],rooms:{[h.id]:{wall:h.style.wall,floor:h.style.floor,view:h.style.view,name:"Paid room"}},walls:[],floors:[],views:[],owned:D.FURNITURE.slice(0,3).map(x=>x.id),placed:D.FURNITURE.slice(0,2).map(x=>x.id)};
 return s;
}
function fixture(prefix,id,options={}){
 const t=boot(prefix,{},options);
 for(const p of["craepets.house.","craepets."])for(const who of ids)t.values.set(p+"v1."+who,JSON.stringify(saved(t,who),null,2));
 for(const[k,v]of Object.entries({[prefix+"who"]:id,"craepets.house.import-recovery.v1":"prior exact journal","craepets.house.before-import":"prior backup","post-office.v1":"unrelated mail","craepets.house.voice":"","craepets.voice":"1"}))t.values.set(k,v);
 for(const who of ids){t.values.set("craepets.house.position."+who,"position "+who);t.values.set("craepets.house.reset."+who,"reset "+who);}
 return t;
}
const snapshot=t=>Object.fromEntries([...t.values].sort());
function check(name,fn){fn();checks++;console.log("PASS "+name);}
const malformed=[
 ["partial JSON",()=>'{ valuable saved data <img src=x onerror=alert(1)>\n😀'],
 ["empty string",()=>""],["whitespace",()=>" \n "],["JSON null",()=>"null"],["array",()=>"[]"],["number",()=>"12"],["boolean",()=>"true"],["old version",s=>JSON.stringify({...s,v:2})],
 ["bad pet",s=>JSON.stringify({...s,pet:"broken"})],["stats string",s=>JSON.stringify({...s,stats:"broken"})],["fractional house",s=>JSON.stringify({...s,house:{level:1.5}})],
 ["bad review",s=>JSON.stringify({...s,review:[null]})],["blank broken stats",s=>JSON.stringify({...s,pet:null,stats:"broken"})],["blank broken house",s=>JSON.stringify({...s,pet:null,house:{level:1.5}})]
];
for(const prefix of["craepets.house.","craepets."])for(const id of ids){
 for(const[name,rawOf]of malformed)check(prefix+id+" refuses "+name+" without replacing bytes",()=>{
  const t=fixture(prefix,id),raw=rawOf(saved(t,id));t.values.set(prefix+"v1."+id,raw);const before=snapshot(t);
  assert.throws(()=>t.api.load(id));assert.deepEqual(snapshot(t),before);assert.equal(t.writes.length,0);
  t.api.activate(id,saved(t,id));t.api.save();assert.equal(t.api.flags().paused,true);
  t.api.import(JSON.stringify(saved(t,id)));t.api.reset();t.api.write(ids.find(x=>x!==id),saved(t,id));t.api.save();
  assert.deepEqual(snapshot(t),before);assert.equal(t.writes.length,0);assert.equal(t.activity.loadProblem().profile,id);
 });
 check(prefix+id+" read failure is not absence",()=>{
  const t=fixture(prefix,id),before=snapshot(t);t.fault((k,op)=>k===prefix+"v1."+id&&op==="get");assert.throws(()=>t.api.load(id),/Read unavailable/);t.api.activate(id,saved(t,id));t.api.save();assert.equal(t.api.flags().paused,true);assert.deepEqual(snapshot(t),before);
 });
 for(const kind of["current blank","legacy pet null","legacy missing pet"])check(prefix+id+" admits "+kind+" without temporary pet or writes",()=>{
  const t=fixture(prefix,id),s=kind==="current blank"?clone(t.api.blank(t.context.window.CPData.profile(id))):kind==="legacy pet null"?{v:1,pet:null,coins:120}:{v:1,coins:120};
  t.values.set(prefix+"v1."+id,JSON.stringify(s));const before=snapshot(t),loaded=t.api.load(id);assert.equal(loaded.pet,null);assert.equal(loaded.coins,s.coins);assert.deepEqual(snapshot(t),before);assert.equal(t.writes.length,0);assert.equal(JSON.stringify(loaded).includes("Unadopted valley"),false);
 });
 check(prefix+id+" admits genuinely absent new valley",()=>{
  const t=fixture(prefix,id);t.values.delete(prefix+"v1."+id);const before=snapshot(t),s=t.api.load(id);assert.equal(s.pet,null);assert.equal(s.tier,t.context.window.CPData.profile(id).tier);assert.deepEqual(snapshot(t),before);t.api.activate(id,s);t.api.save();assert.equal(JSON.parse(t.values.get(prefix+"v1."+id)).pet,null);
 });
 check(prefix+id+" retains valid earned progress and legacy defaults",()=>{
  const t=fixture(prefix,id),original=JSON.parse(t.values.get(prefix+"v1."+id)),before=snapshot(t),s=t.api.load(id);for(const key of["pet","coins","bag","bank","diary","house"])assert.deepEqual(clone(s[key]),original[key]);assert.deepEqual(snapshot(t),before);
  t.values.set(prefix+"v1."+id,JSON.stringify({v:1,pet:{name:"Legacy",species:"blorb",colour:"meadow"}}));const legacy=t.api.load(id);assert.equal(legacy.pet.name,"Legacy");assert.equal(legacy.tier,t.context.window.CPData.profile(id).tier);assert.ok(Number.isFinite(legacy.pet.energy));
 });
 check(prefix+id+" rejects sibling switch before changing healthy player/session",()=>{
  const healthy=ids.find(x=>x!==id),t=fixture(prefix,healthy),raw="{ damaged sibling";
  t.values.set(prefix+"v1."+id,raw);t.api.activate(healthy,saved(t,healthy));const state=t.api.flags(),before=snapshot(t);t.api.switch(id);assert.equal(t.api.flags().who,healthy);assert.equal(t.api.flags().state,state.state);assert.equal(t.api.flags().session,state.session);assert.equal(t.api.flags().paused,false);assert.deepEqual(snapshot(t),before);t.api.save();assert.equal(t.values.get(prefix+"v1."+id),raw);
 });
 check(prefix+id+" rejects damaged family visit without changing active lesson",()=>{
  const healthy=ids.find(x=>x!==id),t=fixture(prefix,healthy);t.values.set(prefix+"v1."+id,"{ bad visit");t.api.activate(healthy,saved(t,healthy));const state=t.api.flags(),before=snapshot(t);t.api.visit(id);assert.equal(t.api.flags().who,healthy);assert.equal(t.api.flags().state,state.state);assert.equal(t.api.flags().session,state.session);assert.equal(t.api.flags().paused,false);assert.deepEqual(snapshot(t),before);
 });
 check(prefix+id+" public owner activity rejects before leaving current lesson",()=>{
  const healthy=ids.find(x=>x!==id),t=fixture(prefix,healthy);t.values.set(prefix+"v1."+id,"{ bad owner");t.api.activate(healthy,saved(t,healthy));const state=t.api.flags(),before=snapshot(t);t.activity.enter({owner:id,view:"visit"});assert.equal(t.api.flags().who,healthy);assert.equal(t.api.flags().state,state.state);assert.equal(t.api.flags().session,state.session);assert.deepEqual(snapshot(t),before);
 });
 check(prefix+id+" active storage event pauses stale persistence",()=>{
  const t=fixture(prefix,id);t.api.activate(id,saved(t,id));const raw="{ external damaged update";t.values.set(prefix+"v1."+id,raw);const before=snapshot(t);t.api.sync({key:prefix+"v1."+id,newValue:raw});assert.equal(t.api.flags().paused,true);t.api.save();assert.deepEqual(snapshot(t),before);
 });
 check(prefix+id+" damaged refresh pauses before state/player mutation",()=>{
  const healthy=ids.find(x=>x!==id),t=fixture(prefix,healthy);t.api.activate(healthy,saved(t,healthy));const old=t.api.flags().state;t.values.set(prefix+"who",id);t.values.set(prefix+"v1."+id,"{ damaged refresh");const before=snapshot(t);t.activity.refreshSaves();assert.equal(t.api.flags().who,healthy);assert.equal(t.api.flags().state,old);assert.equal(t.api.flags().paused,true);assert.equal(t.activity.loadProblem().profile,id);t.api.save();assert.deepEqual(snapshot(t),before);
 });
 check(prefix+id+" failed active startup is write-free",()=>{
  const t=fixture(prefix,id);t.values.set(prefix+"v1."+id,"{ bad startup");const before=snapshot(t);t.api.init();assert.equal(t.api.flags().state,null);assert.equal(t.api.flags().paused,true);assert.deepEqual(snapshot(t),before);assert.equal(t.writes.length,0);
 });
}
for(const prefix of["craepets.house.","craepets."]){
 check(prefix+" native-ID fence refuses unknown keys before reading",()=>{const t=fixture(prefix,"cory"),before=t.reads.length;assert.throws(()=>t.api.load("__proto__"));assert.equal(t.reads.length,before);});
 for(const failure of["WHO read unavailable","invalid WHO"])check(prefix+failure+" pauses startup without writes",()=>{
  const t=fixture(prefix,"cory");if(failure==="invalid WHO")t.values.set(prefix+"who","__proto__");else t.fault((k,op)=>k===prefix+"who"&&op==="get");const before=snapshot(t);t.api.init();assert.equal(t.api.flags().paused,true);assert.equal(t.api.flags().state,null);assert.deepEqual(snapshot(t),before);
 });
 check(prefix+" unavailable sibling stays out of neighborhood without blocking healthy current",()=>{
  const t=fixture(prefix,"cory");t.api.activate("cory",saved(t,"cory"));t.values.set(prefix+"v1.guest","{ damaged");const before=snapshot(t),rows=t.activity.neighborhood();assert.equal(rows.find(x=>x.id==="guest").unavailable,true);assert.equal(t.api.flags().paused,false);assert.deepEqual(snapshot(t),before);
 });
 check(prefix+" prior family pending guard remains effective",()=>{const t=fixture(prefix,"cory");t.api.activate("cory",saved(t,"cory"));t.familyBlocked(true);const before=snapshot(t);t.api.save();t.api.switch("ellie");t.api.import(JSON.stringify(saved(t,"cory")));assert.deepEqual(snapshot(t),before);});
}
for(const prefix of["craepets.house.","craepets."])for(const id of ids)check(prefix+id+" actual registration refuses damaged active with all healthy siblings",()=>{
 const t=fixture(prefix,id,{realSaves:true});t.values.set(prefix+"v1."+id,"{ broken active registration");t.values.set("craepets.who",ids.find(x=>x!==id));if(prefix==="craepets.")t.values.set(prefix+"who",id);
 const before=snapshot(t);t.api.register();assert.equal(t.api.flags().paused,true);assert.equal(t.activity.loadProblem().profile,id);assert.deepEqual(snapshot(t),before);
 const candidate=saved(t,id),validated=t.context.window.HouseSaves.validate({format:"craepets-family",version:1,profiles:{[id]:candidate}},id);assert.equal(validated.profiles[id].pet.name,candidate.pet.name);assert.deepEqual(snapshot(t),before);
 t.api.init();t.api.save();assert.deepEqual(snapshot(t),before);
});
for(const failure of["WHO read unavailable","active read unavailable"])check("actual house registration distinguishes "+failure+" and suppresses its one auto cycle",()=>{
 const t=fixture("craepets.house.","cory",{realSaves:true}),before=snapshot(t);t.fault((k,op)=>op==="get"&&k===(failure==="WHO read unavailable"?"craepets.house.who":"craepets.house.v1.cory"));t.api.register();assert.equal(t.api.flags().paused,true);assert.deepEqual(snapshot(t),before);
});
console.log("PASS active saved-data loader: "+checks+" production checks across seven house/shared profiles; malformed/read-failure preservation, blank/legacy/earned states, startup, switching, refresh and external-update refusal.");
