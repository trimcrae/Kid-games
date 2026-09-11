// Your Craepet's idle life, driven by its real needs (same thresholds as the
// 2D game's mood()). Seeded, so every run makes the same choices.
import assert from 'node:assert/strict';
import {createPetBehaviour,moodOf} from '../house-test/pet-behaviour.mjs';

function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const needs=(o={})=>({hunger:72,happy:81,energy:64,clean:88,...o});
const behind={angle:Math.PI*.95,distance:2};
function play(b,seconds,input,each){const seen=[];for(let t=0;t<seconds;t+=1/30){const o=b.update(1/30,input);seen.push(o);each?.(o,t);}return seen;}
const states=s=>new Set(s.map(o=>o.state));

assert.equal(moodOf(needs({energy:14})),'tired');assert.equal(moodOf(needs({hunger:20})),'hungry');
assert.equal(moodOf(needs({clean:20})),'dirty');assert.equal(moodOf(needs({happy:30})),'bored');assert.equal(moodOf(needs()),'great');

// A contented pet has an idle life: it looks back at you first, then does
// several different things; nothing repeats every frame.
{
  const b=createPetBehaviour({random:seeded(1)});play(b,1,{moving:true,needs:needs()});
  let turned=null;const seen=play(b,45,{needs:needs(),camera:behind},(o,t)=>{if(o.turnTo!==null&&turned===null)turned={t,a:o.turnTo};});
  assert(turned&&turned.t<4.5,'did not look back at the camera soon after stopping');
  assert(Math.abs(turned.a)<Math.PI&&Math.abs(turned.a)>1,'turn to the camera is not a three-quarter turn');
  const acts=[...states(seen)].filter(s=>s!=='rest');
  assert(acts.length>=4,'idle actions: '+acts);
  assert(!states(seen).has('sleep'),'a rested pet fell asleep');
}
// Very tired: yawns, then lies down asleep with closed eyes and "z z";
// walking wakes it at once and it never sleeps on the move.
{
  const b=createPetBehaviour({random:seeded(2)});const low=needs({energy:14});
  const seen=play(b,12,{needs:low,camera:behind});
  const last=seen.at(-1);
  assert.equal(last.state,'sleep');assert.equal(last.expression,'sleep');assert.equal(last.pose.lie,1);assert.equal(last.emote,'zz');
  const walking=play(b,20,{moving:true,needs:low});
  assert(walking.every(o=>o.state==='walk'&&o.expression==='tired'),'slept or looked wide awake while walking tired');
  // Tired but not asleep yet: yawns come first.
  const y=createPetBehaviour({random:seeded(3)});const early=play(y,40,{needs:needs({energy:23})});
  assert(states(early).has('yawn'),'tired pet never yawned');assert(!states(early).has('sleep'),'energy 23 by day should not sleep');
  // …but late at night a tired pet does doze off.
  const n=createPetBehaviour({random:seeded(3)});assert(states(play(n,12,{needs:needs({energy:23}),night:true})).has('sleep'),'tired pet stayed up all night');
}
// Say hello: a happy hop with ^ ^ eyes and a heart — even from asleep — and
// it stays awake a while afterwards.
{
  const b=createPetBehaviour({random:seeded(4)});const low=needs({energy:14});
  play(b,12,{needs:low});assert.equal(b.state,'sleep');
  b.react('hello');const after=play(b,5,{needs:low});
  assert.equal(after[0].state,'greet');assert(after[0].hop>0,'no hop');assert.equal(after[0].expression,'happy');assert.equal(after[0].emote,'heart');
  assert(after.filter(o=>o.hop>0).length===1,'hopped more than once');
  assert(!states(after).has('sleep'),'fell straight back asleep');
}
// Needs show on the body: hungry looks at its tummy with a bowl bubble,
// grubby shakes off dust, bored sighs, and a great mood hops for joy.
for(const [n,action,emote] of [[{hunger:20},'hungry','food'],[{clean:18},'shake','dust'],[{happy:30},'sigh',null],[{},'hop','heart']]){
  const b=createPetBehaviour({random:seeded(5)});const seen=play(b,60,{needs:needs(n),camera:behind});
  const hit=seen.find(o=>o.state===action);
  assert(hit,`${JSON.stringify(n)} never showed ${action}: ${[...states(seen)]}`);
  if(emote)assert.equal(hit.emote,emote);
}
// Hungry and grubby at once: both cues show within the first 15 s of standing.
{
  const b=createPetBehaviour({random:seeded(8)});const seen=states(play(b,15,{needs:needs({hunger:18,clean:18}),camera:behind}));
  assert(seen.has('hungry')&&seen.has('shake'),'missing a cue: '+[...seen]);
}
// Reduced motion: no hops, shakes, stretches or sweeping looks.
{
  const b=createPetBehaviour({random:seeded(6)});b.react('hello');
  const seen=play(b,60,{needs:needs({clean:18}),camera:behind,reduced:true});
  assert(seen.every(o=>o.hop===0),'hopped under reduced motion');
  assert(seen.every(o=>!o.pose.shake&&!o.pose.stretch&&!o.pose.scratch),'shook or stretched under reduced motion');
  for(const st of ['lookaround','sniff']){const looks=new Set(seen.filter(o=>o.state===st).map(o=>o.look.join()));assert(looks.size<=2,st+' sweeps under reduced motion');}
}
// An egg never walks, wanders or sleeps; it wobbles now and then and when greeted.
{
  const b=createPetBehaviour({random:seeded(7),egg:true});
  const seen=play(b,30,{moving:false});
  assert(seen.every(o=>['egg','wobble'].includes(o.state)),'egg did something else');
  assert(seen.some(o=>o.hop>0),'egg never wobbled');
  const carried=play(b,5,{moving:true});assert(carried.every(o=>o.state!=='walk'),'egg walked');
  b.react('hello');assert(b.update(1/30,{}).hop>0,'egg ignored hello');
}
console.log('PASS pet behaviour: idle life, look-back, sleep/yawn when tired, wake on walk, hello hop, needs cues, reduced motion, eggs only wobble');
