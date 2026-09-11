// What happens in the house straight after a care activity: fed, your pet
// trots to its feeding mat in the kitchen and munches (or a bowl appears if
// the mat is far away); bathed, it shakes itself dry in a sparkle; rested,
// it stretches and yawns; played with, it chases a ball. A few seconds only,
// and any step you take ends it at once. Reduced motion keeps the moment but
// not the trotting, rolling or hopping. Pure logic: it returns directions
// for the pet and where any prop should be; house-life draws them.
import {needValue} from './pet-behaviour.mjs';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Which moment, from the pet's needs before and after the activity.
export function aftermathFor(before,after){
  if(!before||!after||before.egg||after.egg)return null;
  const up=k=>needValue(after,k)-needValue(before,k);
  if(up('hunger')>=1)return 'feed';
  if(up('clean')>=1)return 'bath';
  if(up('energy')>=1)return 'rest';
  if(up('happy')>=2)return 'play';
  return null;
}
export function createAftermath(){
  let kind=null,t=0,phase='',target=null,prop=null,face=null,reduced=false,startAt=null;
  function start(k,{pet,heading,mat=null,world,reduced:rm=false}){
    kind=k;t=0;reduced=rm;prop=null;target=null;face=null;startAt={...pet};
    const ahead=(d)=>({x:pet.x+Math.sin(heading)*d,y:pet.y,z:pet.z+Math.cos(heading)*d});
    if(k==='feed'){
      // Trot to the feeding mat if it's in the same room and the way is clear.
      let reach=false;
      if(mat&&Math.abs(mat.y-pet.y)<.4&&Math.hypot(mat.x-pet.x,mat.z-pet.z)<5&&world){
        const probe={...pet};world.move(probe,mat.x-pet.x,mat.z-pet.z);reach=Math.hypot(probe.x-mat.x,probe.z-mat.z)<.25;
      }
      if(reach&&!rm){phase='go';target={x:mat.x,y:mat.y,z:mat.z};}
      else{phase='munch';prop={kind:'bowl',...ahead(.34)};face=heading;}
    }else if(k==='play'){
      phase='throw';const end={...pet};
      if(world&&!rm){world.move(end,Math.sin(heading)*1.3,Math.cos(heading)*1.3);}
      prop={kind:'ball',...ahead(.3),from:ahead(.3),to:rm?ahead(.4):end};
    }else phase=k;
  }
  // input: {moving (player steering), pet:{x,y,z}, heading, dt}
  function update(dt,{moving=false,pet,heading}={}){
    if(!kind)return null;
    // Any step you take (or a jump to another room) ends it.
    if(moving||(startAt&&phase!=='go'&&phase!=='chase'&&Math.hypot(pet.x-startAt.x,pet.z-startAt.z)>.6)){stop();return null;}
    t+=dt;const o={kind,phase,move:null,face:null,expression:'idle',pose:{},emote:null,hop:0,walking:false,prop};
    if(phase==='go'){
      const dx=target.x-pet.x,dz=target.z-pet.z,d=Math.hypot(dx,dz);
      if(d<.12||t>4){phase='munch';t=0;face=heading;}
      else{const step=Math.min(d,1.15*dt);o.move={dx:dx/d*step,dz:dz/d*step};o.face=Math.atan2(dx,dz);o.walking=true;o.speed=1.15;o.expression='happy';startAt={...pet};return o;}
    }
    if(phase==='munch'){
      // Head down in the bowl, mouth going, a little bowl bubble.
      o.pose={sniff:1};o.expression=Math.floor(t/.22)%2?'yawn':'idle';o.emote='food';o.face=face;
      if(t>2.4){phase='happy';t=0;}
      return o;
    }
    if(phase==='bath'){o.pose=reduced?{}:{shake:1};o.expression='squint';o.emote='sparkle';if(t>1.4){phase='happy';t=0;}return o;}
    if(phase==='rest'){
      o.pose={stretch:reduced?0:Math.sin(Math.PI*Math.min(1,t/1.6))};o.expression=t>1.2?'yawn':'squint';
      if(t>2.6){phase='happy';t=0;}return o;
    }
    if(phase==='throw'){
      const k=Math.min(1,t/.7);prop.x=prop.from.x+(prop.to.x-prop.from.x)*k;prop.z=prop.from.z+(prop.to.z-prop.from.z)*k;
      o.face=Math.atan2(prop.x-pet.x,prop.z-pet.z);o.look=[0,-.1];
      if(t>(reduced?1.2:.35)){phase=reduced?'happy':'chase';t=0;}
      return o;
    }
    if(phase==='chase'){
      const dx=prop.x-pet.x,dz=prop.z-pet.z,d=Math.hypot(dx,dz);
      if(d<.3||t>2.5){phase='happy';t=0;prop.caught=true;}
      else{const step=Math.min(d,1.6*dt);o.move={dx:dx/d*step,dz:dz/d*step};o.face=Math.atan2(dx,dz);o.walking=true;o.speed=1.6;o.expression='happy';startAt={...pet};return o;}
    }
    if(phase==='happy'){
      if(t===dt||t<=dt+1e-6)o.hop=reduced?0:1;
      o.expression='happy';o.emote='heart';
      if(t>1.3){const done=o;stop();done.done=true;return done;}
      return o;
    }
    return o;
  }
  function stop(){kind=null;phase='';prop=null;target=null;}
  return {start,update,stop,get active(){return !!kind;},get kind(){return kind;},get phase(){return phase;}};
}
