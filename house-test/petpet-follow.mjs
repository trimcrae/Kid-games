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
  const trail=[];             // {t,y}: where the Craepet has been, newest last
  const hops=[];              // {at,strength}: the Craepet's squashes, to echo
  let y=null;
  function reset(){trail.length=0;hops.length=0;y=null;}
  // The Craepet's rig hopped (take-off, touchdown, hello, a note on the
  // piano): the petpet does the same a beat later, a touch less.
  function hop(time,strength){hops.push({at:time+BEAT,strength:strength*.9});}
  // The height the petpet stands at now, given the Craepet's this frame.
  // Also returns any echoed hop that has fallen due.
  function update(time,dt,leaderY,{reduced=false}={}){
    let echo=0;
    if(reduced){reset();return {y:leaderY,hop:0};}
    while(hops.length&&hops[0].at<=time)echo=Math.max(echo,hops.shift().strength);
    const last=trail[trail.length-1];
    if(last&&(Math.abs(leaderY-last.y)>SNAP||time<last.t))reset();
    trail.push({t:time,y:leaderY});
    while(trail.length>2&&trail[1].t<=time-BEAT)trail.shift();
    if(flies){
      // Drift after the pet: a flier never lands with a bump.
      y=y===null?leaderY:y+(leaderY-y)*(1-Math.exp(-dt*FLY_RATE));
      return {y,hop:0};
    }
    // A walker is exactly where the pet was a beat ago.
    const at=time-BEAT;
    if(trail.length<2||trail[0].t>=at)y=trail[0].y;
    else{
      let i=0;while(i<trail.length-2&&trail[i+1].t<=at)i++;
      const a=trail[i],b=trail[i+1],k=b.t===a.t?1:Math.min(1,Math.max(0,(at-a.t)/(b.t-a.t)));
      y=a.y+(b.y-a.y)*k;
    }
    return {y,hop:echo};
  }
  return {reset,hop,update};
}
