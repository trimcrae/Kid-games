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
// about 1.25 m — is "soft" for the sightline only: from above, a life-sim
// camera looks over (or through) a chair back at the pet instead of diving
// into the pet's back. The camera itself still keeps its near-plane
// clearance from every surface, and walls, floors, ceilings, glass and tall
// furniture always stop it.
const FLOORS=[-3.15,-1.05,-.16,-.1,0,1.26];
const floorBelow=y=>FLOORS.reduce((best,f)=>f<=y+.08&&f>best?f:best,-Infinity);
export const SOFT_TOP=1.25,SOFT_CLEAR=.85;
const softCollection=/furniture|fixtures|appliances|vehicles and storage/i;
const hardMaterial=/glass|plaster|siding|panels|tile|grout|floor|carpet|mirror|joists|roof|block|concrete/i;
export function softGroup(group){
  const [collection='',...rest]=(group.name||'').split(' / ');
  return softCollection.test(collection)&&!hardMaterial.test(rest.at(-1)||'');
}
const hardBox=/floor|slab|foundation|ceiling|roof|wall|stair|tread|riser|landing|step|deck|porch|ground|lawn|terrain|path|drive|sill|threshold|jamb|door|window|partition|grade|curb|joist|beam|header|soffit/i;
export function softBox(box){
  const floor=floorBelow(box.min[1]);
  return !hardBox.test(box.name||'')&&box.max[1]-box.min[1]<SOFT_TOP&&box.max[1]-floor<SOFT_TOP&&box.max[1]-floor>.05;
}
export function createCameraGuard(binary,groups,{cell=.5}={}){
  const f=new Float32Array(binary);
  let count=0;for(const g of groups)count+=g.count/3;
  const first=new Uint32Array(count),soft=new Uint8Array(count);
  let n=0;for(const g of groups){const o=g.offset/4,maybe=softGroup(g);for(let v=0;v<g.count;v+=3){
    const at=o+v*6;
    if(maybe){const lowY=Math.min(f[at+1],f[at+7],f[at+13]),topY=Math.max(f[at+1],f[at+7],f[at+13]),floor=floorBelow(lowY);
      soft[n]=topY-floor<SOFT_TOP&&topY-floor>.05?1:0;}
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
  const found=[];
  function gather(ax,ay,az,bx,by,bz,pad){
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
  return {
    triangles:count,
    // Furthest fraction of from->to at which the camera sees `from` unobstructed
    // and stays at least `clearance` from every surface.
    fraction(from,to,clearance){
      const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,len=Math.hypot(dx,dy,dz);
      if(len<1e-6)return 0;
      const list=gather(from.x,from.y,from.z,to.x,to.y,to.z,clearance);
      let hit=1,hard=1;
      for(const t of list){const s=crossing(t,from.x,from.y,from.z,dx,dy,dz);if(s<hit)hit=s;if(!soft[t]&&s<hard)hard=s;}
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
      // Look past low furniture only while the camera still ends up well above
      // the pet (so above that furniture), after the near-plane back-off too;
      // otherwise everything blocks.
      if(hard>hit&&dy*(hard-clearance/len)>=SOFT_CLEAR){const s=settle(hard);if(dy*s>=SOFT_CLEAR||s<=hit)return s;}
      return settle(hit);
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
// low enough to see across the room to its walls; tight spots crane up.
// Shared with the tests.
export const CAMERA_RIG={target:.5,boom:2.1,height:1.1};
// One guarded placement along a single boom direction.
export function boomCamera(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  const target={x:player.x,y:player.y+rig.target,z:player.z};
  const desired={x:player.x+Math.sin(yaw)*rig.boom*Math.cos(pitch),y:player.y+rig.height-Math.sin(pitch)*rig.boom,z:player.z+Math.cos(yaw)*rig.boom*Math.cos(pitch)};
  // The colliders also cover the neighbourhood's plain boxes; the guard then
  // checks what is left of the sightline against the drawn surfaces.
  // Low furniture boxes may be looked past when the camera stays well above
  // the pet; if the result would be low after all, everything blocks.
  let fraction=world?world.cameraFraction(target,desired,softBox):1;
  if(world&&(desired.y-target.y)*fraction<SOFT_CLEAR)fraction=world.cameraFraction(target,desired);
  if(guard){
    const limit={x:target.x+(desired.x-target.x)*fraction,y:target.y+(desired.y-target.y)*fraction,z:target.z+(desired.z-target.z)*fraction};
    fraction*=guard.fraction(target,limit,clearance);
  }
  const position={x:target.x+(desired.x-target.x)*fraction,y:target.y+(desired.y-target.y)*fraction,z:target.z+(desired.z-target.z)*fraction};
  return {target,position,fraction,distance:Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z),pitch};
}
// In a tight room the camera swings up towards the ceiling before it slides
// in along the boom, so it looks down on the pet instead of into its back.
// Every candidate is a full guarded placement. The swing ("crane") is the
// smallest that gives the boom a comfortable length; a closer boom (the lens
// eases wider as it shortens) is preferred to a steep one, and the swing never
// takes the view past about 60° down: a narrow hall or a corner is seen from
// above and behind, never as a plan view that is hard to steer by.
// A settled placement (an arrival, the tests) searches the swing in these
// steps; the follow rig climbs or lowers it a finer step at a time.
export const CRANE_STEP=.15,CLIMB_STEP=.1;
// Total boom pitch floor: about 61° down at the full boom (25° is the default).
export const PITCH_FLOOR=-.95;
// A boom this long needs no crane.
export const CRANE_GOOD=1.35;
// Crane penalty when nothing reaches CRANE_GOOD: each 0.1 rad of swing must
// buy this much more boom (m) to be worth it.
const CRANE_COST=.03;
// The look-down angle of a boom pitch (camera to target), in radians.
export function lookDown(pitch,rig=CAMERA_RIG){return Math.atan2(rig.height-rig.target-Math.sin(pitch)*rig.boom,Math.cos(pitch)*rig.boom);}
const craneFloor=pitch=>Math.min(0,PITCH_FLOOR-pitch);
const craneCandidates=pitch=>{const floor=craneFloor(pitch),out=[];for(let e=0;e>floor+1e-6;e-=CRANE_STEP)out.push(+e.toFixed(3));if(!out.length||out.at(-1)>floor+1e-6)out.push(floor);return out;};
const utility=(extra,view)=>Math.min(view.distance,CRANE_GOOD)+extra*CRANE_COST*10;
// The crane a settled placement (arrival, tests) uses.
export function craneExtra(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  let best=null;
  for(const extra of craneCandidates(pitch)){
    const view=boomCamera(player,yaw,pitch+extra,world,guard,clearance,rig);
    if(view.distance>=CRANE_GOOD)return {extra,view};
    if(!best||utility(extra,view)>utility(best.extra,best.view)+.02)best={extra,view};
  }
  return best;
}
export function orbitCamera(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  return craneExtra(player,yaw,pitch,world,guard,clearance,rig).view;
}
// The walkthrough's follow camera, frame by frame. The guard's answer is where
// the camera may go this frame: the boom pulls in at once but eases back out,
// and the crane swings smoothly (eased, and never faster than CRANE_RATE) to a
// swing chosen with hysteresis, so turning in a tight room reads as one
// continuous move instead of snapping between levels. Anything shown lies on a
// guarded boom no further out than the guard allowed.
export const CRANE_RATE=1.1;   // rad/s: the fastest the crane swings
const CRANE_EASE=3.2,BOOM_EASE=3.5,PULL_EASE=6,RESCAN=4,JAM=.3,LEAD=.5;
export function createFollowRig({reducedMotion=false,rig=CAMERA_RIG}={}){
  let state=null;
  // Where the crane should head, a step at a time from where it is heading
  // now: a swing with a good boom stays until one step lower fits with room
  // to spare; otherwise it moves to a neighbour with a good boom, or climbs
  // towards the better trade of boom length against swing. Two or three
  // placements a search instead of the whole ladder.
  function choose(focus,yaw,pitch,world,guard,clearance,cur,known){
    const floor=craneFloor(pitch);cur=Math.max(floor,Math.min(0,cur));
    const at=e=>known.get(e)??(known.set(e,boomCamera(focus,yaw,pitch+e,world,guard,clearance,rig)),known.get(e));
    const v=at(cur),lower=Math.min(0,cur+CLIMB_STEP),higher=Math.max(floor,cur-CLIMB_STEP);
    // Room again at the default height (turned back from a wall): head home,
    // even across a stretch where the swing in between is cramped.
    if(cur<0&&at(0).distance>=CRANE_GOOD+.25)return lower;
    if(v.distance>=CRANE_GOOD)return lower!==cur&&at(lower).distance>=CRANE_GOOD+.25?lower:cur;
    const vl=lower!==cur?at(lower):null;
    if(vl&&vl.distance>=CRANE_GOOD)return lower;
    const vh=higher!==cur?at(higher):null;
    if(vh&&vh.distance>=CRANE_GOOD)return higher;
    let best=cur,score=utility(cur,v)+.02;
    if(vh&&utility(higher,vh)>score){best=higher;score=utility(higher,vh);}
    if(vl&&utility(lower,vl)>score){best=lower;score=utility(lower,vl);}
    // A shallow slope can hide a better view at the top of the swing: head
    // for it a step at a time.
    if(best===cur&&higher!==cur&&floor<higher){const vf=at(floor);if(utility(floor,vf)>score+.03)best=higher;}
    return best;
  }
  return {
    // Frames where the crane had to leave its easing to get out of the pet.
    escapes:0,
    reset(){state=null;},
    get crane(){return state?.extra??0;},
    place(focus,yaw,pitch,dt,world,guard,clearance){
      const known=new Map();
      const floor=craneFloor(pitch);
      if(!state){const c=craneExtra(focus,yaw,pitch,world,guard,clearance,rig);known.set(c.extra,c.view);state={want:c.extra,extra:c.extra,distance:c.view.distance,age:0,yaw,spin:0,ahead:null};}
      else{
        // How fast the view is panning, smoothed over a few frames.
        const turn=Math.atan2(Math.sin(yaw-state.yaw),Math.cos(yaw-state.yaw));state.yaw=yaw;
        state.spin+=((dt>0&&Math.abs(turn)<.3?turn/dt:0)-state.spin)*(1-Math.exp(-dt*8));
        // Panning towards a wall: look a moment ahead along the pan, so the
        // crane starts rising before the wall arrives rather than after.
        state.ahead=Math.abs(state.spin)>.3?yaw+Math.max(-.6,Math.min(.6,state.spin*LEAD)):null;
        // Searched every few frames (every frame while the boom is short); in
        // between only the current swing is placed, which keeps tight rooms
        // as cheap as open ones.
        if(state.age++>=RESCAN){state.want=choose(focus,yaw,pitch,world,guard,clearance,state.want,known);state.age=0;}
        // (Every few frames while panning.)
        if(state.ahead!==null&&!(state.aheadWait-->0)){
          state.aheadWait=RESCAN-1;
          const here=(known.get(state.want)??boomCamera(focus,yaw,pitch+state.want,world,guard,clearance,rig)).distance;
          const ahead=boomCamera(focus,state.ahead,pitch+state.want,world,guard,clearance,rig).distance;
          state.aheadDistance=ahead<here-.3?ahead:Infinity;
          if(ahead<.9*CRANE_GOOD&&ahead<here-.3){
            const c=craneExtra(focus,state.ahead,pitch,world,guard,clearance,rig);
            state.want=Math.min(state.want,c.extra);state.aheadDistance=c.view.distance;
          }
        }
        if(state.ahead===null)state.aheadDistance=Infinity;
      }
      state.want=Math.max(floor,Math.min(0,state.want));
      // Swing towards the chosen crane: eased, and rate-limited.
      if(reducedMotion)state.extra=state.want;
      else{
        const step=(state.want-state.extra)*(1-Math.exp(-dt*CRANE_EASE)),limit=CRANE_RATE*dt;
        state.extra+=Math.max(-limit,Math.min(limit,step));
        if(Math.abs(state.extra-state.want)<.004)state.extra=state.want;
      }
      state.extra=Math.max(floor,Math.min(0,state.extra));
      let view=known.get(state.extra)??boomCamera(focus,yaw,pitch+state.extra,world,guard,clearance,rig);
      // Jammed into the pet (a flick of the mouse can land the boom on a bed
      // or a wall at once): nothing useful shows from there, so the crane
      // goes straight to the nearest swing that clears the pet, if any.
      // (Coarse steps first, then the smallest swing that does it; a spot
      // where nothing clears waits a few frames before searching again.)
      let escaped=false;
      if(view.distance<JAM&&state.extra>floor&&!(state.jamWait>0&&state.jamWait--)){
        const place=e=>boomCamera(focus,yaw,pitch+e,world,guard,clearance,rig);
        let hi=state.extra,found=null;
        for(let e=Math.max(floor,state.extra-CRANE_STEP);;e=Math.max(floor,e-CRANE_STEP)){
          const v=place(e);if(v.distance>=JAM+.1){found={e,v};break;}
          hi=e;if(e<=floor)break;
        }
        if(found){
          for(let e=hi-.025;e>found.e+1e-6;e-=.025){const v=place(e);if(v.distance>=JAM+.1){found={e,v};break;}}
          state.extra=found.e;state.want=Math.min(state.want,found.e);view=found.v;escaped=true;
        }else state.jamWait=4;
      }
      if(escaped)this.escapes++;
      if(view.distance<.9*CRANE_GOOD)state.age=Math.max(state.age,RESCAN-1);
      if(reducedMotion)state.distance=view.distance;
      // Panning towards a wall, the boom glides in ahead of it instead of
      // snapping in when the wall arrives.
      const goal=reducedMotion?view.distance:Math.min(view.distance,Math.max(state.aheadDistance??Infinity,JAM+.1));
      const eased=state.distance+(goal-state.distance)*(1-Math.exp(-dt*(goal<state.distance?PULL_EASE:BOOM_EASE)));
      state.distance=Math.min(view.distance,eased);
      if(state.distance>=view.distance-1e-4||view.distance<1e-4)return {...view,escaped};
      const t=view.target,p=view.position,rise=(p.y-t.y)/view.distance;
      const along=d=>({x:t.x+(p.x-t.x)*d/view.distance,y:t.y+(p.y-t.y)*d/view.distance,z:t.z+(p.z-t.z)*d/view.distance});
      // The full boom may look over a chair back or a banister from well above
      // it. Easing out from below, the camera skips the stretch where it would
      // be inside it or look through it from its own height.
      let softAt=Infinity,over=0;
      if(rise*state.distance<SOFT_CLEAR){
        const first=guard?guard.firstHit(t,p):1;
        if(first<1-1e-3){softAt=first*view.distance-clearance;over=rise>0?Math.min(view.distance,SOFT_CLEAR/rise+.01):view.distance;}
      }
      const clearOfSoft=d=>d<=softAt||d>=over;
      if(!clearOfSoft(state.distance))state.distance=over;
      // (Nor inside a walking box it is looking past, such as a stair rail's.)
      const inBox=q=>world&&world.nearby(q.x,q.z,.05).some(b=>q.x>b.min[0]&&q.x<b.max[0]&&q.y>b.min[1]&&q.y<b.max[1]&&q.z>b.min[2]&&q.z<b.max[2]);
      const fits=d=>{const q=along(d);return clearOfSoft(d)&&!inBox(q)&&(!guard||guard.clearanceAt(q)>=clearance-.015);};
      // A point inside the guarded boom can still pass close to a jamb edge.
      // Move along the boom (in or out, whichever is nearer) only as far as
      // the near plane needs, rather than jumping to the full length.
      if(!fits(state.distance)){
        for(let k=.08;k<view.distance;k+=.08){
          const out=state.distance+k,inward=state.distance-k;
          if(out<view.distance&&fits(out)){state.distance=out;return {target:t,position:along(out),distance:out,escaped};}
          if(inward>=JAM+.1&&fits(inward)){state.distance=inward;return {target:t,position:along(inward),distance:inward,escaped};}
          if(out>=view.distance&&inward<JAM+.1)break;
        }
        state.distance=view.distance;return {...view,escaped};
      }
      return {target:t,position:along(state.distance),distance:state.distance,escaped};
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
