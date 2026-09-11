// Route search for the paw-print directions (wayfinding.mjs): A* on a 20 cm
// grid over the same collision world and walking rules as the pet, so a
// route only goes where the pet can really walk. No DOM or Three.js here, so
// it runs the same in the page and in route-worker.mjs.
const STEP=.2;
const DIRS=[[STEP,0],[-STEP,0],[0,STEP],[0,-STEP],[STEP,STEP],[-STEP,STEP],[STEP,-STEP],[-STEP,-STEP]];
class Heap{
  constructor(){this.a=[];}
  get size(){return this.a.length;}
  push(n){const a=this.a;a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p;}a[i]=n;}
  pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;for(;;){let c=2*i+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}
// Walks p toward (x,z) in the same small sub-steps and with the same floor and
// clearance rules as WalkingWorld.move (physics.mjs), returning where it lands
// or null if anything stops it on the way. It gathers the nearby boxes once
// per step instead of once per sub-step, which makes a route search several
// times faster than calling world.move for every grid edge.
function walkable(world,p,x,z){
  const dx=x-p.x,dz=z-p.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055)),r=world.radius,h=world.height,pad=r+.12;
  const ids=new Set();
  for(let ix=Math.floor((Math.min(p.x,x)-pad)/2);ix<=Math.floor((Math.max(p.x,x)+pad)/2);ix++)
    for(let iz=Math.floor((Math.min(p.z,z)-pad)/2);iz<=Math.floor((Math.max(p.z,z)+pad)/2);iz++)
      for(const i of world.grid.get(`${ix},${iz}`)||[])ids.add(i);
  const list=Array.from(ids,i=>world.boxes[i]);
  let y=p.y,cx=p.x,cz=p.z;
  for(let s=1;s<=steps;s++){
    const nx=p.x+dx*s/steps,nz=p.z+dz*s/steps;let top=-Infinity,edge=-Infinity;
    for(const b of list){
      if(nx>=b.min[0]-.10&&nx<=b.max[0]+.10&&nz>=b.min[2]-.10&&nz<=b.max[2]+.10&&b.max[1]<=y+.255&&b.max[1]>=y-.40){
        edge=Math.max(edge,b.max[1]);
        if(nx>=b.min[0]-.01&&nx<=b.max[0]+.01&&nz>=b.min[2]-.01&&nz<=b.max[2]+.01)top=Math.max(top,b.max[1]);}
    }
    const fl=Number.isFinite(top)?top:edge;if(!Number.isFinite(fl))return null;
    for(const b of list){
      if(b.max[1]<=fl+.265||b.min[1]>=fl+h)continue;
      const ex=nx-Math.max(b.min[0],Math.min(nx,b.max[0])),ez=nz-Math.max(b.min[2],Math.min(nz,b.max[2]));
      if(ex*ex+ez*ez<r*r-.00001)return null;
    }
    y=fl;cx=nx;cz=nz;
  }
  return {x:cx,y,z:cz};
}
export function routeSearch(world,from,to,{maxNodes=90000}={}){
  const key=(x,y,z)=>Math.round((x-from.x)/STEP)+','+Math.round(y*10)+','+Math.round((z-from.z)/STEP);
  // Weighted A*: a slightly longer route found in a fraction of the time is
  // fine for directions, and the straightening below tidies it anyway.
  const h=n=>(Math.hypot(n.x-to.x,n.z-to.z)+Math.abs(n.y-to.y)*1.5)*2;
  const open=new Heap(),seen=new Map();
  const start={x:from.x,y:from.y,z:from.z,g:0,f:0,parent:null};start.f=h(start);open.push(start);seen.set(key(start.x,start.y,start.z),0);
  let expanded=0,state='searching',path=null;
  function done(n){
    const raw=[];for(let m=n;m;m=m.parent)raw.push({x:m.x,y:m.y,z:m.z});raw.reverse();raw.push({x:to.x,y:to.y,z:to.z});
    // Soften the grid's zig-zags: each point takes the average of its level
    // neighbours (a few centimetres of corner cutting is fine for footprints).
    path=raw.map((p,i)=>{let sx=0,sz=0,n=0;for(let k=Math.max(0,i-2);k<=Math.min(raw.length-1,i+2);k++){if(Math.abs(raw[k].y-p.y)<.05){sx+=raw[k].x;sz+=raw[k].z;n++;}}return i===0||i===raw.length-1?p:{x:sx/n,y:p.y,z:sz/n};});
    state='found';
  }
  return {
    get state(){return state;},get path(){return path;},get expanded(){return expanded;},
    // Search for up to `ms` milliseconds; call again next frame if still searching.
    run(ms=6){
      const until=performance.now()+ms;
      while(state==='searching'&&open.size){
        if(performance.now()>until)return state;
        const n=open.pop();if(n.g>(seen.get(key(n.x,n.y,n.z))??Infinity)+1e-9)continue;
        if(Math.abs(n.y-to.y)<.3&&Math.hypot(n.x-to.x,n.z-to.z)<.75&&walkable(world,n,to.x,to.z)){done(n);return state;}
        if(++expanded>maxNodes)break;
        for(const [dx,dz] of DIRS){
          const q=walkable(world,n,n.x+dx,n.z+dz);if(!q)continue;
          const g=n.g+Math.hypot(dx,dz)+Math.abs(q.y-n.y),k=key(q.x,q.y,q.z);
          if(g>=(seen.get(k)??Infinity))continue;seen.set(k,g);
          const m={x:q.x,y:q.y,z:q.z,g,f:0,parent:n};m.f=g+h(m);open.push(m);
        }
      }
      if(state==='searching')state='failed';
      return state;
    },
  };
}
