#!/usr/bin/env node
"use strict";
// Actual production prediction controls/core with isolated DOM/reward adapters.
// The companion browser suite loads the whole production page.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../games/game-of-life/game.js"), "utf8");
function section(start, end) {
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,"production markers must exist");return source.slice(a,b);
}
const core=section("/* @rule-core-start */","/* @rule-core-end */");
const prediction=section("  const PSIZE = 6;","  /* ---------- save / load");
const award=section("  function award(key)","  /* ================= 🔮");
function node() {return {style:{},dataset:{},attrs:{},children:[],listeners:{},className:"",textContent:"",
 setAttribute(k,v){this.attrs[k]=v;},appendChild(c){this.children.push(c);},
 addEventListener(k,f){this.listeners[k]=f;},click(){this.listeners.click();}};}
function fixture(streak=0,best=streak,earned=false,random=0){
 const els=Object.fromEntries(["pboard","predResult","predStreak","predBest","newPuzzleBtn","checkBtn","resetPredBtn","showBtn"].map(k=>[k,node()]));
 const effects={wins:0,parties:0,saves:0};
 const context=vm.createContext({document:{createElement:node},$:k=>els[k],
 state:{predStreak:streak,predBest:best,badges:earned?{seer:true}:{}},
 BADGES:[{key:"seer",emoji:"🔮",name:"Fortune Teller"}],
 window:{SFX:true},SFX:{win(){effects.wins++;},pop(){},nope(){}},
 party(){effects.parties++;},scheduleSave(){effects.saves++;},toast(){},refreshBadges(){},
 Math:Object.assign(Object.create(Math),{random:()=>random})});
 vm.runInContext(core+award+prediction+
 'globalThis.api={start:newPuzzle,board:()=>Array.from(predBoard),answer:()=>Array.from(predAnswer),guess:()=>Array.from(predGuess),state:()=>JSON.parse(JSON.stringify(state)),flags:()=>({earned:predEarned,revealed:predRevealed}),step:(a,wrap)=>Array.from(stepBoard(a,6,6,P_BIRTH,P_SURV,wrap))};newPuzzle();refreshPredStats();',context);
 return {els,effects,api:context.api,click:k=>els[k].click(),toggle:i=>els.pboard.children[i].click(),
 solve(){const expected=oracle(this.api.board()),guess=this.api.guess();expected.forEach((v,i)=>{if(guess[i]!==v)this.toggle(i);});}};
}
// Independent finite-grid tally. Tests solve from the original board, not predAnswer.
function oracle(cells,wrap=false){return cells.map((alive,i)=>{
 const x=i%6,y=Math.floor(i/6);let n=0;
 for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){
 if(xx===x&&yy===y)continue;if(!wrap&&(xx<0||xx>=6||yy<0||yy>=6))continue;
 n+=cells[((yy+6)%6)*6+((xx+6)%6)];}
 return n===3||(alive&&n===2)?1:0;
});}
function plain(x){return JSON.parse(JSON.stringify(x));}
let cases=0;function test(name,fn){fn();cases++;console.log("PASS "+name);}
const grids=[
 {name:"block",input:[14,15,20,21],output:[14,15,20,21]},
 {name:"edge-reaching blinker",input:[7,8,9],output:[2,8,14]},
 {name:"finite separated corners",input:[0,5,30],output:[]},
 {name:"corner L",input:[0,1,6],output:[0,1,6,7]}
];
for(const g of grids)test("independent rule fixture: "+g.name,()=>{
 const f=fixture(),board=Array(36).fill(0);g.input.forEach(i=>board[i]=1);
 const expected=Array(36).fill(0);g.output.forEach(i=>expected[i]=1);
 assert.deepEqual(oracle(board),expected);assert.deepEqual(plain(f.api.step(board,false)),expected);
});
test("wrapped corners distinguish finite prediction boundary",()=>{
 const f=fixture(),board=Array(36).fill(0);[0,5,30].forEach(i=>board[i]=1);
 assert.deepEqual(oracle(board,true).flatMap((v,i)=>v?[i]:[]),[0,5,30,35]);
 assert.deepEqual(plain(f.api.step(board,true)),oracle(board,true));assert.notDeepEqual(oracle(board),oracle(board,true));
});
for(const start of[0,2,7]){
 test("one credit despite repeated checks, start "+start,()=>{
 const f=fixture(start);f.solve();f.click("checkBtn");const once=plain(f.api.state()),effects={...f.effects};
 for(let n=0;n<5;n++)f.click("checkBtn");
 assert.equal(once.predStreak,start+1);assert.equal(once.predBest,start+1);assert.deepEqual(plain(f.api.state()),once);
 assert.equal(f.effects.wins,effects.wins);assert.equal(f.effects.parties,effects.parties);
 assert.match(f.els.predResult.textContent,/already earned credit/);
 });
 test("earned wrong/edit/reset remain practice, start "+start,()=>{
 const f=fixture(start);f.solve();f.click("checkBtn");const earned=plain(f.api.state()),effects={...f.effects};
 f.toggle(0);f.click("checkBtn");assert.match(f.els.predResult.textContent,/red square/);assert.deepEqual(plain(f.api.state()),earned);
 f.toggle(0);f.click("checkBtn");f.click("resetPredBtn");f.click("checkBtn");f.solve();f.click("checkBtn");
 assert.deepEqual(plain(f.api.state()),earned);assert.equal(f.effects.wins,effects.wins);assert.equal(f.effects.parties,effects.parties);
 });
 test("wrong-before-credit correction stays learnable, start "+start,()=>{
 const f=fixture(start);f.solve();f.toggle(0);f.click("checkBtn");
 assert.equal(f.api.state().predStreak,0);assert.equal(f.api.state().predBest,start);
 assert.equal(f.els.pboard.children[0].className.includes("wrong"),true);assert.match(f.els.predResult.textContent,/neighbour count/);
 f.toggle(0);f.click("checkBtn");assert.equal(f.api.state().predStreak,1);f.click("checkBtn");assert.equal(f.api.state().predStreak,1);
 });
 for(const action of["double edit","reset"])test("Show stays ineligible after "+action+", start "+start,()=>{
 const f=fixture(start);f.click("showBtn");
 if(action==="double edit"){f.toggle(0);f.toggle(0);}else{f.click("resetPredBtn");f.solve();}
 f.click("checkBtn");f.click("checkBtn");assert.equal(f.api.state().predStreak,0);assert.equal(f.api.state().predBest,start);
 assert.equal(f.effects.wins,0);assert.equal(f.effects.parties,0);assert.equal(f.api.flags().revealed,true);
 f.click("newPuzzleBtn");f.solve();f.click("checkBtn");assert.equal(f.api.state().predStreak,1);assert.equal(f.api.flags().revealed,false);
 });
 test("Show explicitly resets streak after earned credit, start "+start,()=>{
 const f=fixture(start);f.solve();f.click("checkBtn");const best=f.api.state().predBest,effects={...f.effects};
 f.click("showBtn");f.toggle(0);f.toggle(0);f.click("resetPredBtn");f.solve();f.click("checkBtn");
 assert.equal(f.api.state().predStreak,0);assert.equal(f.api.state().predBest,best);
 assert.equal(f.effects.wins,effects.wins);assert.equal(f.effects.parties,effects.parties);assert.equal(f.api.flags().earned,true);
 });
}
test("three new puzzle rounds legitimately earn Fortune Teller once",()=>{
 const f=fixture();for(let i=1;i<=3;i++){
 if(i>1)f.click("newPuzzleBtn");f.solve();f.click("checkBtn");f.click("checkBtn");
 assert.equal(f.api.state().predStreak,i);assert.equal(!!f.api.state().badges.seer,i===3);
 }assert.equal(f.effects.wins,4);assert.equal(f.effects.parties,4); // three answers + one actual badge award
});
test("pre-existing best and badge retained without another badge reward",()=>{
 const f=fixture(2,19,true);f.solve();f.click("checkBtn");f.click("checkBtn");
 assert.equal(f.api.state().predBest,19);assert.equal(f.api.state().badges.seer,true);assert.equal(f.effects.wins,1);assert.equal(f.effects.parties,1);
});
test("uncredited reset retains eligibility",()=>{
 const f=fixture();f.solve();f.click("resetPredBtn");f.solve();f.click("checkBtn");
 assert.equal(f.api.state().predStreak,1);assert.equal(f.api.flags().earned,true);
});
test("native labels expose original board and current guesses",()=>{
 const f=fixture();assert.equal(f.els.pboard.children.length,36);for(let i=0;i<36;i++){
 assert.match(f.els.pboard.children[i].attrs["aria-label"],new RegExp("^Row "+(Math.floor(i/6)+1)+" column "+(i%6+1)+", (alive|empty) now, you predict (alive|empty)$"));
 assert.equal(f.els.pboard.children[i].attrs["aria-pressed"],String(!!f.api.guess()[i]));
 }
});
console.log("Life prediction credit: "+cases+" production cases passed.");
