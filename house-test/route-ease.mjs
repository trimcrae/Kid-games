// Paw prints with elbow room. The route search accepts any line the pet can
// walk, so a route through a narrow opening (the sunroom's open slider, a
// door) can graze its jamb; a player steering onto those prints, never quite
// on the line, then wedges on the corner (the walking physics slides along
// walls one axis at a time and cannot slip round a corner it is pushing
// into). Wherever a stretch of the route passes within `margin` of the pet's
// side of something, a print is added there, pushed away from it, as long as
// the pet can still walk straight to it from the print before and on to the
// print after.
export function easeRoute(world,path,{margin=.15}={}){
  if(!path||path.length<2)return path;
  const r=world.radius,h=world.height;
  // Gap from the pet's side to the nearest box it would bump into, and the
  // direction away from that box.
  function gap(x,z,y){let best=Infinity,ax=0,az=0;
    for(const b of world.nearby(x,z,r+margin+.05)){
      if(b.max[1]<=y+.265||b.min[1]>=y+h)continue;
      const ex=x-Math.max(b.min[0],Math.min(x,b.max[0])),ez=z-Math.max(b.min[2],Math.min(z,b.max[2])),d=Math.hypot(ex,ez);
      if(d-r<best){best=d-r;ax=d>1e-6?ex/d:0;az=d>1e-6?ez/d:0;}}
    return {gap:best,ax,az};}
  const reaches=(a,b)=>{const p={...a};world.move(p,b.x-p.x,b.z-p.z);return Math.hypot(p.x-b.x,p.z-b.z)<.02&&Math.abs(p.y-b.y)<.06;};
  const out=[path[0]];
  for(let i=1;i<path.length;i++){
    const a=out[out.length-1],b=path[i],len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len>.05){
      let worst=null;
      for(let t=.1;t<.95;t+=.05){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=world.floor(x,z,Math.max(a.y,b.y));
        if(!Number.isFinite(y))continue;const g=gap(x,z,y);if(!worst||g.gap<worst.gap)worst={...g,x,z,y};}
      if(worst&&worst.gap<margin&&(worst.ax||worst.az)){
        const push=margin-worst.gap+.01,x=worst.x+worst.ax*push,z=worst.z+worst.az*push,y=world.floor(x,z,worst.y);
        const q={x,y,z};
        if(Number.isFinite(y)&&Math.abs(y-worst.y)<.06&&gap(x,z,y).gap>worst.gap&&reaches(a,q)&&reaches(q,b))out.push(q);
      }
    }
    out.push(b);
  }
  return out;
}
