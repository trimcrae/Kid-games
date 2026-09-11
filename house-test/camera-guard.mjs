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
      // Look past low furniture only while the camera still ends up well above
      // the pet (so above that furniture); otherwise everything blocks.
      if(hard>hit&&dy*(hard-clearance/len)>=SOFT_CLEAR)hit=hard;
      let s=Math.max(0,Math.min(1,hit-clearance/len));
      // Back towards the player until the near plane has room everywhere.
      for(let i=0;i<60&&s>0;i++){
        const d=nearest(list,from.x+dx*s,from.y+dy*s,from.z+dz*s,clearance);
        if(d>=clearance)break;
        s=Math.max(0,s-(clearance-d+.01)/len);
      }
      return s;
    },
    // For tests and diagnostics.
    // hardOnly: ignore low furniture (walls, floors, ceilings, glass and tall
    // furniture still count).
    blocked(from,to,hardOnly=false){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;const list=gather(from.x,from.y,from.z,to.x,to.y,to.z,.01);
      for(const t of list)if(!(hardOnly&&soft[t])&&crossing(t,from.x,from.y,from.z,dx,dy,dz)<1-1e-6)return true;return false;},
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
// Every candidate is a full guarded placement; the swing is capped so small
// rooms never turn into a plan view.
export const CRANE_STEPS=[0,-.15,-.3,-.45];
// Backed into a corner, a look down from above still shows the pet, where a
// camera squeezed against the wall behind it would show only fur or wall.
export const CORNER_STEPS=[-.65,-.85,-1.25];
export function craneExtra(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  let best=null;
  for(const extra of CRANE_STEPS){
    const view=boomCamera(player,yaw,Math.max(-1.45,pitch+extra),world,guard,clearance,rig);
    if(!best||view.distance>best.view.distance+.1)best={extra,view};
    if(view.distance>=1.5)return best;
  }
  if(best.view.distance<.9)for(const extra of CORNER_STEPS){
    const view=boomCamera(player,yaw,Math.max(-1.45,pitch+extra),world,guard,clearance,rig);
    if(view.distance>best.view.distance+.1)best={extra,view};
    if(view.distance>=1.2)break;
  }
  return best;
}
export function orbitCamera(player,yaw,pitch,world,guard,clearance,rig=CAMERA_RIG){
  return craneExtra(player,yaw,pitch,world,guard,clearance,rig).view;
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
