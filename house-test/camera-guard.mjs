// Keeps the orbit camera on the room side of every drawn surface.
// The walking colliders are coarse boxes that do not meet at every wall,
// ceiling and trim junction, so a camera tested only against them slipped
// through those seams: into the attic above a bathroom ceiling, behind a
// kitchen wall, or outside the upstairs hall. This guard tests the camera's
// sightline against the rendered triangles themselves (glass included, so it
// never backs out through a window) and keeps the camera far enough from any
// surface that the near clipping plane cannot cut a hole in it.
// Leaves are soft: the camera may brush through a canopy (as in any garden
// game) rather than collapsing into the pet under every tree. Walls, glass,
// trunks and everything else still stop it.
export function guardGroups(groups){return groups.filter(g=>g.finish?.surface!=='foliage');}
// Low furniture — chairs, tables, beds, sofas, counters, bath fixtures, below
// about 1.25 m — is "soft" for the sightline only: a camera above it looks
// over it at the pet instead of diving into the pet's back. It may look past
// a piece only from above that piece (SOFT_MARGIN over its top) and only
// while the pet's head stays in sight over it (HEAD_RISE above the aim
// point); otherwise the piece stops it like a wall. The camera itself still
// keeps its near-plane clearance from every surface, and walls, floors,
// ceilings, glass and tall furniture always stop it.
const FLOORS=[-3.15,-1.05,-.16,-.1,0,1.26];
const floorBelow=y=>FLOORS.reduce((best,f)=>f<=y+.08&&f>best?f:best,-Infinity);
export const SOFT_TOP=1.25,SOFT_MARGIN=.1,HEAD_RISE=.2;
const softCollection=/furniture|fixtures|appliances|vehicles and storage/i;
const hardMaterial=/glass|plaster|siding|panels|tile|grout|floor|carpet|mirror|joists|roof|block|concrete/i;
export function softGroup(group){
  const [collection='',...rest]=(group.name||'').split(' / ');
  return softCollection.test(collection)&&!hardMaterial.test(rest.at(-1)||'');
}
const hardBox=/floor|slab|foundation|ceiling|roof|wall|stair|tread|riser|landing|step|deck|porch|ground|lawn|terrain|path|drive|sill|threshold|jamb|door|window|partition|grade|curb|joist|beam|header|soffit/i;
// (A cabinet door, an oven handle or a worktop under a window is furniture
// all the same; the drawn walls, doors and glass around it still stop the
// camera through the guard.)
const furnitureBox=/cabinet|cupboard|oven|dryer|worktop|drawer|handle/i;
export function softBox(box){
  const floor=floorBelow(box.min[1]),name=box.name||'';
  return (!hardBox.test(name)||furnitureBox.test(name))&&box.max[1]-box.min[1]<SOFT_TOP&&box.max[1]-floor<SOFT_TOP&&box.max[1]-floor>.05;
}
export function createCameraGuard(binary,groups,{cell=.5}={}){
  const f=new Float32Array(binary);
  let count=0;for(const g of groups)count+=g.count/3;
  // (top: the highest corner of each low-furniture triangle, which the camera
  // must be above to look past it.)
  const first=new Uint32Array(count),soft=new Uint8Array(count),top=new Float32Array(count);
  let n=0;for(const g of groups){const o=g.offset/4,maybe=softGroup(g);for(let v=0;v<g.count;v+=3){
    const at=o+v*6;
    if(maybe){const lowY=Math.min(f[at+1],f[at+7],f[at+13]),topY=Math.max(f[at+1],f[at+7],f[at+13]),floor=floorBelow(lowY);
      soft[n]=topY-floor<SOFT_TOP&&topY-floor>.05?1:0;top[n]=topY;}
    first[n++]=at;}}
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let t=0;t<count;t++)for(let k=0;k<3;k++){const o=first[t]+k*6;for(let a=0;a<3;a++){const v=f[o+a];if(v<lo[a])lo[a]=v;if(v>hi[a])hi[a]=v;}}
  const dim=lo.map((v,a)=>Math.floor((hi[a]-v)/cell)+1);
  const index=(x,y,z)=>(x*dim[1]+y)*dim[2]+z;
  const clampCell=(v,a)=>Math.min(dim[a]-1,Math.max(0,Math.floor((v-lo[a])/cell)));
  const box=new Float32Array(6);
  function bounds(t){const o=first[t];for(let a=0;a<3;a++){const p=f[o+a],q=f[o+6+a],r=f[o+12+a];box[a]=Math.min(p,q,r);box[a+3]=Math.max(p,q,r);}}
  function cells(t,visit){bounds(t);
    const x0=clampCell(box[0],0),x1=clampCell(box[3],0),y0=clampCell(box[1],1),y1=clampCell(box[4],1),z0=clampCell(box[2],2),z1=clampCell(box[5],2);
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)visit(index(x,y,z));}
  // Compressed cell lists: count, prefix-sum, fill.
  const start=new Uint32Array(dim[0]*dim[1]*dim[2]+1);
  for(let t=0;t<count;t++)cells(t,c=>start[c+1]++);
  for(let c=1;c<start.length;c++)start[c]+=start[c-1];
  const items=new Uint32Array(start.at(-1)),fill=start.slice(0,-1);
  for(let t=0;t<count;t++)cells(t,c=>{items[fill[c]++]=t;});
  const stamp=new Uint32Array(count);let query=0;
  // (The head check gathers into its own list, so a placement's list survives it.)
  const shared=[],headList=[];
  function gather(ax,ay,az,bx,by,bz,pad,found=shared){
    query++;found.length=0;
    const x0=clampCell(Math.min(ax,bx)-pad,0),x1=clampCell(Math.max(ax,bx)+pad,0),y0=clampCell(Math.min(ay,by)-pad,1),y1=clampCell(Math.max(ay,by)+pad,1),z0=clampCell(Math.min(az,bz)-pad,2),z1=clampCell(Math.max(az,bz)+pad,2);
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){const c=index(x,y,z);
      for(let i=start[c];i<start[c+1];i++){const t=items[i];if(stamp[t]!==query){stamp[t]=query;found.push(t);}}}
    return found;
  }
  // First crossing of segment a->a+d with triangle t, as a fraction, or Infinity.
  function crossing(t,ax,ay,az,dx,dy,dz){
    const o=first[t],px=f[o],py=f[o+1],pz=f[o+2];
    const e1x=f[o+6]-px,e1y=f[o+7]-py,e1z=f[o+8]-pz,e2x=f[o+12]-px,e2y=f[o+13]-py,e2z=f[o+14]-pz;
    const hx=dy*e2z-dz*e2y,hy=dz*e2x-dx*e2z,hz=dx*e2y-dy*e2x,det=e1x*hx+e1y*hy+e1z*hz;
    if(det>-1e-12&&det<1e-12)return Infinity;
    const inv=1/det,sx=ax-px,sy=ay-py,sz=az-pz,u=(sx*hx+sy*hy+sz*hz)*inv;if(u<0||u>1)return Infinity;
    const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)return Infinity;
    const s=(e2x*qx+e2y*qy+e2z*qz)*inv;return s>=0?s:Infinity;
  }
  // Exact distance from a point to triangle t (closest-point regions).
  function distance(t,x,y,z){
    const o=first[t],ax=f[o],ay=f[o+1],az=f[o+2];
    const abx=f[o+6]-ax,aby=f[o+7]-ay,abz=f[o+8]-az,acx=f[o+12]-ax,acy=f[o+13]-ay,acz=f[o+14]-az;
    const apx=x-ax,apy=y-ay,apz=z-az,d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
    let u=0,v=0;
    if(d1<=0&&d2<=0){}
    else{
      const bpx=apx-abx,bpy=apy-aby,bpz=apz-abz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
      if(d3>=0&&d4<=d3)u=1;
      else{
        const vc=d1*d4-d3*d2;
        if(vc<=0&&d1>=0&&d3<=0)u=d1/(d1-d3);
        else{
          const cpx=apx-acx,cpy=apy-acy,cpz=apz-acz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
          if(d6>=0&&d5<=d6)v=1;
          else{
            const vb=d5*d2-d1*d6;
            if(vb<=0&&d2>=0&&d6<=0)v=d2/(d2-d6);
            else{
              const va=d3*d6-d5*d4;
              if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));u=1-w;v=w;}
              else{const den=1/(va+vb+vc);u=vb*den;v=vc*den;}
            }
          }
        }
      }
    }
    const qx=ax+abx*u+acx*v-x,qy=ay+aby*u+acy*v-y,qz=az+abz*u+acz*v-z;return Math.sqrt(qx*qx+qy*qy+qz*qz);
  }
  function nearest(list,x,y,z,limit){
    let best=Infinity;
    for(const t of list){bounds(t);
      if(x<box[0]-limit||x>box[3]+limit||y<box[1]-limit||y>box[4]+limit||z<box[2]-limit||z>box[5]+limit)continue;
      const d=distance(t,x,y,z);if(d<best)best=d;}
    return best;
  }
  // Low-furniture crossings of the last sightline tested: fraction, top.
  const low=[];
  function crossings(from,dx,dy,dz,list){
    let hit=1,hard=1;low.length=0;
    for(const t of list){const s=crossing(t,from.x,from.y,from.z,dx,dy,dz);if(s<hit)hit=s;if(!soft[t]){if(s<hard)hard=s;}else if(s<1)low.push(s,top[t]);}
    return {hit,hard};
  }
  const headSeen=(from,x,y,z)=>{const hx=from.x-x,hy=from.y+HEAD_RISE-y,hz=from.z-z;
    for(const t of gather(x,y,z,from.x,from.y+HEAD_RISE,from.z,.01,headList))if(crossing(t,x,y,z,hx,hy,hz)<1-1e-6)return false;return true;};
  // The first low piece in the way of a camera at fraction s of from->from+d
  // (one it is not above, crossed before s), as a fraction; `hit` when the
  // pet's head would be hidden; Infinity when it may look past them all.
  function lowInTheWay(from,dx,dy,dz,s,hit){
    const y=from.y+dy*s;let bad=Infinity;
    for(let i=0;i<low.length;i+=2)if(low[i]<s&&low[i+1]+SOFT_MARGIN>y&&low[i]<bad)bad=low[i];
    if(bad===Infinity&&low.some((v,i)=>!(i&1)&&v<s)&&!headSeen(from,from.x+dx*s,y,from.z+dz*s))bad=hit;
    return bad;
  }
  return {
    triangles:count,
    // Furthest fraction of from->to at which the camera sees `from` unobstructed
    // and stays at least `clearance` from every surface.
    fraction(from,to,clearance){
      const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,len=Math.hypot(dx,dy,dz);
      if(len<1e-6)return 0;
      const list=gather(from.x,from.y,from.z,to.x,to.y,to.z,clearance);
      const {hit,hard}=crossings(from,dx,dy,dz,list);
      // Back towards the player until the near plane has room everywhere.
      const settle=h=>{
        let s=Math.max(0,Math.min(1,h-clearance/len));
        for(let i=0;i<60&&s>0;i++){
          const d=nearest(list,from.x+dx*s,from.y+dy*s,from.z+dz*s,clearance);
          if(d>=clearance)break;
          s=Math.max(0,s-(clearance-d+.01)/len);
        }
        return s;
      };
      // Low furniture before the first wall: look past each piece the camera
      // ends up above (after the near-plane back-off too) with the pet's head
      // in sight; otherwise stop in front of the first piece in the way.
      if(hard>hit){let s=settle(hard);
        for(let i=0;i<8&&s>hit;i++){const bad=lowInTheWay(from,dx,dy,dz,s,hit);if(bad===Infinity)return s;s=Math.min(s-1e-4,settle(bad));}}
      return settle(hit);
    },
    // Whether a camera at `to` may look past the low furniture between it and
    // `from` (it is above every piece and sees the pet's head over them).
    softClear(from,to){
      const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
      const {hit}=crossings(from,dx,dy,dz,gather(from.x,from.y,from.z,to.x,to.y,to.z,.01));
      return lowInTheWay(from,dx,dy,dz,1,hit)===Infinity;
    },
    // For tests and diagnostics.
    // hardOnly: ignore low furniture (walls, floors, ceilings, glass and tall
    // furniture still count).
    blocked(from,to,hardOnly=false){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;const list=gather(from.x,from.y,from.z,to.x,to.y,to.z,.01);
      for(const t of list)if(!(hardOnly&&soft[t])&&crossing(t,from.x,from.y,from.z,dx,dy,dz)<1-1e-6)return true;return false;},
    // First crossing of from->to with any drawn surface, low furniture
    // included, as a fraction (1 when clear).
    firstHit(from,to){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;let hit=1;
      for(const t of gather(from.x,from.y,from.z,to.x,to.y,to.z,.01)){const s=crossing(t,from.x,from.y,from.z,dx,dy,dz);if(s<hit)hit=s;}return hit;},
    softTriangles:()=>soft.reduce((a,b)=>a+b,0),
    clearanceAt(p,limit=.5){return nearest(gather(p.x,p.y,p.z,p.x,p.y,p.z,limit),p.x,p.y,p.z,limit);}
  };
}
// Distance from the eye to the far corner of the near plane: anything closer
// than this can be clipped away at the edge of the view.
export function nearPlaneReach(camera){
  const t=Math.tan(camera.fov*Math.PI/360);
  return camera.near*Math.sqrt(1+t*t*(1+camera.aspect*camera.aspect));
}
// Third-person follow camera: a game framing, a little above and behind the
// pet so the room and floor around it
// read, rather than a wide lens at head height: about 25° down by default,
// low enough to see across the room to its walls. Shared with the tests.
export const CAMERA_RIG={target:.5,boom:2.1,height:1.1};
// Low furniture boxes (walking colliders) the sightline from a to b crosses
// before `fraction`: the camera may only look past one from above it, so it
// stops in front of the first one it would be below.
const lowBoxCache=new WeakMap();
function lowBoxes(world,a,b,fraction){
  const d=[b.x-a.x,b.y-a.y,b.z-a.z],o=[a.x,a.y,a.z],hits=[];
  for(const box of world.nearby((a.x+b.x)/2,(a.z+b.z)/2,Math.hypot(d[0],d[2])/2+.1)){
    let isLow=lowBoxCache.get(box);if(isLow===undefined)lowBoxCache.set(box,isLow=softBox(box));if(!isLow)continue;
    // (The same padded slab test as the walking world's own sightline.)
    let near=0,far=fraction;
    for(let k=0;k<3;k++){const lo=box.min[k]-.055,hi=box.max[k]+.055;
      if(Math.abs(d[k])<1e-8){if(o[k]<lo||o[k]>hi){far=-1;break;}}
      else{const t1=(lo-o[k])/d[k],t2=(hi-o[k])/d[k];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}}
    if(far>=near&&near>0)hits.push(near,box.max[1]);
  }
  for(let changed=true;changed;){changed=false;const y=a.y+d[1]*fraction;
    for(let i=0;i<hits.length;i+=2)if(hits[i]<fraction&&hits[i+1]+SOFT_MARGIN>y){const f=Math.max(.04,hits[i]-.035);if(f<fraction){fraction=f;changed=true;}}}
  return fraction;
}
// One guarded placement along the boom.
export function boomCamera(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  const target={x:player.x,y:player.y+rig.target,z:player.z};
  const desired={x:player.x+Math.sin(yaw)*rig.boom*Math.cos(pitch),y:player.y+rig.height-Math.sin(pitch)*rig.boom,z:player.z+Math.cos(yaw)*rig.boom*Math.cos(pitch)};
  // The colliders also cover the neighbourhood's plain boxes; the guard then
  // checks what is left of the sightline against the drawn surfaces.
  // Low furniture boxes may be looked past from above them.
  let fraction=1;
  if(world){fraction=world.cameraFraction(target,desired,softBox);fraction=lowBoxes(world,target,desired,fraction);}
  if(guard){
    const at=f=>({x:target.x+(desired.x-target.x)*f,y:target.y+(desired.y-target.y)*f,z:target.z+(desired.z-target.z)*f});
    fraction*=guard.fraction(target,at(fraction),clearance);
    // (Pulled in by a wall, the camera may now be below a low box it was
    // above: then it stops in front of that box too, with the same clearance.)
    if(world){const f=lowBoxes(world,target,desired,fraction);if(f<fraction)fraction=f*guard.fraction(target,at(f),clearance);}
  }
  const position={x:target.x+(desired.x-target.x)*fraction,y:target.y+(desired.y-target.y)*fraction,z:target.z+(desired.z-target.z)*fraction};
  return {target,position,fraction,distance:Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z),pitch};
}
// The look-down angle of a boom pitch (camera to target), in radians.
export function lookDown(pitch,rig=CAMERA_RIG){return Math.atan2(rig.height-rig.target-Math.sin(pitch)*rig.boom,Math.cos(pitch)*rig.boom);}
// A settled placement (an arrival, the tests): the guarded boom itself.
export function orbitCamera(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  return boomCamera(player,yaw,pitch,world,guard,clearance,rig);
}
// The walkthrough's follow camera, frame by frame. The camera always stays on
// the player's own sightline to the pet (their heading and tilt), so it turns
// exactly with the arrow keys and never climbs over the pet to look down on
// it: a wall, a jamb or a cupboard behind the pet only shortens the boom (in
// a tight spot the lens widens and the view tips up past the pet instead; see
// render() in walkthrough.js). The guard's answer is where the camera may go
// this frame: the boom pulls in at once (never showing the back of a wall)
// but eases back out, and turning towards a wall it glides in ahead of the
// wall rather than snapping in when the wall arrives. Anything shown lies on a
// guarded boom no further out than the guard allowed.
// (Until September 2026 a tight spot swung the boom up towards the ceiling,
// to about 60° down; the family found it forced the view over the pet.)
const BOOM_EASE=3.5,PULL_EASE=6,RESCAN=4,JAM=.3,LEAD=.5;
export function createFollowRig({reducedMotion=false,rig=CAMERA_RIG}={}){
  let state=null;
  return {
    reset(){state=null;},
    place(focus,yaw,pitch,dt,world,guard,clearance){
      const view=boomCamera(focus,yaw,pitch,world,guard,clearance,rig);
      if(!state)state={distance:view.distance,yaw,spin:0,ahead:Infinity,wait:0};
      else{
        // How fast the view is panning, smoothed over a few frames.
        const turn=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));state.yaw=yaw;
        state.spin+=((dt>0&&Math.abs(turn)<.3?turn/dt:0)-state.spin)*(1-Math.exp(-dt*8));
        // Panning towards a wall: look a moment ahead along the pan (every few
        // frames), so the boom starts gliding in before the wall arrives.
        if(Math.abs(state.spin)>.3){
          if(!(state.wait-->0)){state.wait=RESCAN-1;
            const ahead=boomCamera(focus,yaw+Math.max(-.6,Math.min(.6,state.spin*LEAD)),pitch,world,guard,clearance,rig).distance;
            state.ahead=ahead<view.distance-.3?ahead:Infinity;}
        }else{state.ahead=Infinity;state.wait=0;}
      }
      if(reducedMotion)state.distance=view.distance;
      const goal=reducedMotion?view.distance:Math.min(view.distance,Math.max(state.ahead,JAM+.1));
      const eased=state.distance+(goal-state.distance)*(1-Math.exp(-dt*(goal<state.distance?PULL_EASE:BOOM_EASE)));
      state.distance=Math.min(view.distance,eased);
      if(state.distance>=view.distance-1e-4||view.distance<1e-4)return view;
      const t=view.target,p=view.position;
      const along=d=>({x:t.x+(p.x-t.x)*d/view.distance,y:t.y+(p.y-t.y)*d/view.distance,z:t.z+(p.z-t.z)*d/view.distance});
      // Easing out, the camera never stops inside low furniture the full boom
      // looks past, nor looks through it from below its top, nor sits inside a
      // walking box it is looking past (such as a stair rail's).
      const inBox=q=>world&&world.nearby(q.x,q.z,.05).some(b=>q.x>b.min[0]&&q.x<b.max[0]&&q.y>b.min[1]&&q.y<b.max[1]&&q.z>b.min[2]&&q.z<b.max[2]);
      const fits=d=>{const q=along(d);return !inBox(q)&&(!guard||guard.clearanceAt(q)>=clearance-.015&&guard.softClear(t,q));};
      // A point inside the guarded boom can still pass close to a jamb edge.
      // Move along the boom (in or out, whichever is nearer) only as far as
      // it needs, rather than jumping to the full length.
      if(!fits(state.distance)){
        for(let k=.08;k<view.distance;k+=.08){
          const out=state.distance+k,inward=state.distance-k;
          if(out<view.distance&&fits(out)){state.distance=out;return {target:t,position:along(out),distance:out,pitch};}
          if(inward>=JAM+.1&&fits(inward)){state.distance=inward;return {target:t,position:along(inward),distance:inward,pitch};}
          if(out>=view.distance&&inward<JAM+.1)break;
        }
        state.distance=view.distance;return view;
      }
      return {target:t,position:along(state.distance),distance:state.distance,pitch};
    },
  };
}
// Arrive looking along the room's authored direction unless the camera would
// be jammed against a wall or the pet there; then turn to the nearest heading
// (within a quarter turn either way) that gives the camera room.
export function arrivalHeading(player,authored,pitch,world,guard,clearance){
  let best=authored,bestDistance=-1;
  for(let i=0;i<=24;i++){
    const heading=authored+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/24;
    const distance=orbitCamera(player,heading,pitch,world,guard,clearance).distance;
    if(distance>bestDistance+.15){bestDistance=distance;best=heading;}
    if(distance>1.45)break;
  }
  return Math.atan2(Math.sin(best),Math.cos(best));
}
