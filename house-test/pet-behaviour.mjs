// Your Craepet's own little life while you aren't steering it: it breathes,
// blinks, glances back at you, sniffs, sits and stretches; its needs show on
// its body the way they do in the 2D game (the same thresholds as the game's
// mood()): a tired pet yawns and falls asleep, a hungry one looks at its
// tummy, a grubby one shakes itself off, a bored one sighs; a happy one hops.
// Pure logic with an injectable random source, so it is tested without a
// browser. It never changes the save: it only reads the needs.
export const TIRED=25,SLEEPY=20,HUNGRY=35,DIRTY=35,BORED=40;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// A need the save doesn't have a number for (an older or hand-made save)
// counts as content, never as exhausted: it must not put a pet to sleep or
// show an empty meter.
export const NEED_DEFAULT=80;
export function needValue(pet,k){const v=pet?.[k];return typeof v==='number'&&Number.isFinite(v)?v:NEED_DEFAULT;}
export function needsOf(pet){if(!pet||pet.egg)return null;return {hunger:needValue(pet,'hunger'),happy:needValue(pet,'happy'),energy:needValue(pet,'energy'),clean:needValue(pet,'clean')};}
export function moodOf(n){
  if(!n)return 'good';
  if(n.energy<TIRED)return 'tired';
  if(n.hunger<HUNGRY)return 'hungry';
  if(n.clean<DIRTY)return 'dirty';
  if(n.happy<BORED)return 'bored';
  if(n.hunger>70&&n.happy>70&&n.clean>60)return 'great';
  return 'good';
}
// name: [seconds, pose, expression, emote]
const ACTIONS={
  rest:[2.2,{},'idle',null],
  lookcamera:[3.2,{},'idle',null],
  lookaround:[3,{},'idle',null],
  lookfriend:[2.6,{},'idle',null],
  sniff:[2.2,{sniff:1},'idle',null],
  sit:[5,{sit:1},'idle',null],
  stretch:[1.7,{stretch:1},'squint',null],
  scratch:[1.5,{scratch:1},'squint',null],
  yawn:[1.9,{},'yawn',null],
  hungry:[2.8,{sit:.5},'sad','food'],
  shake:[1.2,{shake:1},'squint','dust'],
  sigh:[3,{sit:.7},'sad',null],
  hop:[.7,{},'happy','heart'],
  greet:[1.8,{},'happy','heart'],
  wobble:[.8,{},'idle',null],
};
export function createPetBehaviour({random=Math.random,egg=false}={}){
  let state=egg?'egg':'rest',t=0,dur=1.2,idle=0,wasMoving=false,turned=false,happyFor=0,hopNow=0,sweep=random()*6,lookSide=1;
  let pending=null,lastAction='',cueIn=0,cueTurn=0;
  function begin(name,time){state=name;t=0;dur=time??ACTIONS[name][0]*(.85+random()*.3);turned=false;lookSide=random()<.5?-1:1;if(name==='hop'||name==='greet')hopNow=1;}
  // Every low need gets its own body-language cue, taking turns, so a pet that
  // is both hungry and grubby shows both within a few seconds of standing.
  function cues(n){const c=[];if(!n)return c;if(n.energy<TIRED)c.push('yawn');if(n.hunger<HUNGRY)c.push('hungry');if(n.clean<DIRTY)c.push('shake');if(n.happy<BORED)c.push('sigh');return c;}
  function choose({mood,camera,friend,night,needs}){
    const need=cues(needs);
    if(need.length&&cueIn<=0){cueIn=6;return lastAction=need[cueTurn++%need.length];}
    // The first thing after you stop: look back at you.
    if(idle<3&&camera&&state==='rest'&&!pending)return 'lookcamera';
    const w={lookcamera:camera?2.5:0,lookaround:3,lookfriend:friend?2:0,sniff:2,sit:1.5,stretch:1.2,scratch:1};
    if(mood==='tired'){w.yawn=5;w.sit=3;w.stretch=0;w.scratch=.5;}
    if(mood==='hungry'){w.hungry=5;w.sniff=3;}
    if(mood==='dirty'){w.shake=4;w.scratch=2.5;}
    if(mood==='bored'){w.sigh=4;w.sit=2.5;w.lookaround=1;}
    if(mood==='great')w.hop=1.6;
    if(night)w.yawn=(w.yawn||0)+1.5;
    // Never the same thing twice running.
    if(lastAction in w)w[lastAction]=0;
    let total=0;for(const k in w)total+=w[k];let r=random()*total;
    for(const k in w){r-=w[k];if(r<=0)return lastAction=k;}
    return lastAction='lookaround';
  }
  function react(kind){
    if(kind!=='hello')return;
    if(egg){begin('wobble');hopNow=1;return;}
    pending='greet';happyFor=2.6;idle=0;
  }
  // input: {moving, needs, camera:{angle,distance}|null (angle relative to the
  // pet's facing, 0 = in front), friend:{angle}|null, night, reduced}
  function update(dt,input={}){
    const {moving=false,needs=null,camera=null,friend=null,night=false,reduced=false}=input;
    t+=dt;happyFor=Math.max(0,happyFor-dt);cueIn-=dt;
    const mood=egg?'good':moodOf(needs);
    let out={state,expression:'idle',pose:{},look:[0,0],emote:null,hop:0,turnTo:null,mood};
    if(egg){
      if(state==='egg'&&t>dur){begin('wobble');hopNow=.6;}
      if(state==='wobble'&&t>dur){state='egg';t=0;dur=5+random()*5;}
      out.state=state;out.hop=reduced?0:hopNow;hopNow=0;return out;
    }
    if(pending){begin(pending);pending=null;}
    if(moving){
      if(state!=='greet'||t>dur)state='walk';idle=0;wasMoving=true;
      out.state=state;out.expression=happyFor>0?'happy':mood==='tired'?'tired':'idle';
      if(friend&&Math.abs(friend.angle)<1)out.look=[friend.angle*.6,0];
      out.hop=reduced?0:hopNow;hopNow=0;if(state==='greet')out.emote='heart';
      return out;
    }
    if(wasMoving){wasMoving=false;begin('rest',.8+random()*.8);}
    idle+=dt;
    // Sleep: a very tired pet dozes off after standing a while (always below
    // SLEEPY energy, like the 2D game; late at night a tired one does too),
    // and stays asleep until you walk or say hello.
    const sleepy=needs&&(needs.energy<SLEEPY||(night&&needs.energy<TIRED));
    if(state!=='sleep'&&state!=='greet'&&sleepy&&idle>7)begin('sleep',Infinity);
    if(state==='sleep'){
      out.state='sleep';out.expression='sleep';out.pose={lie:1};out.emote='zz';
      if(!sleepy)begin('rest');
      return out;
    }
    if(t>=dur){
      if(state==='rest')begin(choose({mood,camera,friend,night,needs}));
      else begin('rest',(mood==='tired'?2.2:1)+random()*2);
    }
    const [,pose,expression,emote]=ACTIONS[state]||ACTIONS.rest;
    out.state=state;out.pose=reduced&&(state==='stretch'||state==='shake'||state==='scratch')?{}:{...pose};
    out.expression=happyFor>0?'happy':state==='rest'&&mood==='tired'?'tired':state==='rest'&&(mood==='bored'||mood==='hungry')?'sad':expression;
    out.emote=emote;
    const k=clamp(t/dur,0,1);
    if(state==='lookcamera'&&camera){
      if(Math.abs(camera.angle)<1.2||turned)out.look=[clamp(camera.angle,-1.1,1.1),.18];
      else if(!turned){out.turnTo=camera.angle-Math.sign(camera.angle)*.75;turned=true;}
    }
    if(state==='lookaround')out.look=reduced?[.7*lookSide,.05]:[Math.sin((t+sweep)*1.3)*.85,Math.sin(t*.7)*.08];
    if(state==='lookfriend'&&friend)out.look=[clamp(friend.angle,-1.1,1.1),0];
    if(state==='sniff')out.look=reduced?[0,0]:[Math.sin(t*1.8)*.35,0];
    if(state==='sit'&&camera&&Math.abs(camera.angle)<1.1)out.look=[camera.angle*.8,.12];
    if(state==='stretch')out.pose={stretch:reduced?0:Math.sin(Math.PI*k)};
    if(state==='yawn')out.look=[0,.25*Math.sin(Math.PI*k)];
    if(state==='hungry')out.look=[0,-.35];
    out.hop=reduced?0:hopNow;hopNow=0;
    return out;
  }
  return {update,react,get state(){return state;}};
}
// Relative angle (0 = straight ahead) from a pet at p facing `heading` to q.
export function angleTo(p,heading,q){return wrap(Math.atan2(q.x-p.x,q.z-p.z)-heading);}
