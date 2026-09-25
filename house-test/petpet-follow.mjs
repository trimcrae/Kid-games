// How a petpet keeps up with its Craepet in the house. It rides along at the
// pet's heel (a child of the avatar, so it turns and walks with it), but its
// HEIGHT is its own: a walker copies the pet's path up and down a beat late,
// so when the pet jumps onto the bed the petpet jumps after it, lands after
// it, and squashes on its own take-off and touchdown rather than moving as
// one welded lump. A flier (moth, wisp, starling) drifts up and settles
// down instead, always a little behind. Pure logic (no Three), tested.
export const BEAT=.14;        // seconds a walker lags behind its Craepet
export const FLY_RATE=7;      // a flier closes the height gap at this rate
export const SNAP=.6;         // a bigger jump in height in one frame is a teleport
export function createPetpetFollow({flies=false}={}){
  const trail=[];             // where the Craepet has been, newest last
  const hops=[];              // {at,strength}: the Craepet's squashes, to echo
  let y=null,flyX=null,flyZ=null;
  function reset(){trail.length=0;hops.length=0;y=flyX=flyZ=null;}
  // The Craepet's rig hopped (take-off, touchdown, hello, a note on the
  // piano): the petpet does the same a beat later, a touch less.
  function hop(time,strength){hops.push({at:time+BEAT,strength:strength*.9});}
  // The height the petpet stands at now, given the Craepet's this frame.
  // Also returns any echoed hop that has fallen due.
  function update(time,dt,leaderY,{reduced=false,leader=null}={}){
    let echo=0;
    if(reduced){reset();return {y:leaderY,hop:0,offsetX:.4,offsetZ:-.3};}
    while(hops.length&&hops[0].at<=time)echo=Math.max(echo,hops.shift().strength);
    const last=trail[trail.length-1];
    if(last&&(Math.abs(leaderY-last.y)>SNAP||time<last.t||
      (leader&&last.x!==undefined&&Math.hypot(leader.x-last.x,leader.z-last.z)>1.5)))reset();
    trail.push({t:time,y:leaderY,x:leader?.x,z:leader?.z,heading:leader?.heading,scale:leader?.scale??1});
    while(trail.length>2&&trail[1].t<=time-BEAT)trail.shift();
    const at=time-BEAT;
    let sample;
    if(trail.length<2||trail[0].t>=at)sample=trail[0];
    else{
      let i=0;while(i<trail.length-2&&trail[i+1].t<=at)i++;
      const a=trail[i],b=trail[i+1],k=b.t===a.t?1:Math.min(1,Math.max(0,(at-a.t)/(b.t-a.t)));
      sample={y:a.y+(b.y-a.y)*k,x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,scale:a.scale+(b.scale-a.scale)*k,
        heading:a.heading+Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))*k};
    }
    let offsets={};
    if(leader){
      const h=sample.heading,c=Math.cos(h),s=Math.sin(h);
      let x=sample.x+(c*.4-s*.3)*sample.scale,z=sample.z+(-s*.4-c*.3)*sample.scale;
      if(flies){const a=1-Math.exp(-dt*FLY_RATE);flyX=flyX===null?x:flyX+(x-flyX)*a;flyZ=flyZ===null?z:flyZ+(z-flyZ)*a;x=flyX;z=flyZ;}
      const dx=x-leader.x,dz=z-leader.z,C=Math.cos(leader.heading),S=Math.sin(leader.heading);
      let localX=(dx*C-dz*S)/(leader.scale??1),localZ=(dx*S+dz*C)/(leader.scale??1);
      // Stay close enough to the owner's heel when a quick turn or blocked
      // route makes the delayed point fall on the other side of furniture.
      const radius=Math.hypot(localX,localZ),max=.85;
      if(radius>max){localX*=max/radius;localZ*=max/radius;}
      offsets={offsetX:localX,offsetZ:localZ};
    }
    if(flies){
      // Drift after the pet: a flier never lands with a bump.
      y=y===null?leaderY:y+(leaderY-y)*(1-Math.exp(-dt*FLY_RATE));
      return {y,hop:0,...offsets};
    }
    // A walker puts all three coordinates where the owner was a beat ago.
    y=sample.y;
    return {y,hop:echo,...offsets};
  }
  return {reset,hop,update};
}
