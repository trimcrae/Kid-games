// Keeps the orbit camera on the room side of every drawn surface.
// The walking colliders are coarse boxes that do not meet at every wall,
// ceiling and trim junction, so a camera tested only against them slipped
// through those seams: into the attic above a bathroom ceiling, behind a
// kitchen wall, or outside the upstairs hall. This guard tests the camera's
// sightline against the rendered triangles themselves (glass included, so it
// never backs out through a window) and keeps the camera far enough from any
// surface that the near clipping plane cannot cut a hole in it.
export function createCameraGuard(binary,groups,{cell=.5}={}){
  const f=new Float32Array(binary);
  let count=0;for(const g of groups)count+=g.count/3;
  const first=new Uint32Array(count);
  let n=0;for(const g of groups){const o=g.offset/4;for(let v=0;v<g.count;v+=3)first[n++]=o+v*6;}
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
      let hit=1;for(const t of list){const s=crossing(t,from.x,from.y,from.z,dx,dy,dz);if(s<hit)hit=s;}
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
    blocked(from,to){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;const list=gather(from.x,from.y,from.z,to.x,to.y,to.z,.01);
      for(const t of list)if(crossing(t,from.x,from.y,from.z,dx,dy,dz)<1-1e-6)return true;return false;},
    clearanceAt(p,limit=.5){return nearest(gather(p.x,p.y,p.z,p.x,p.y,p.z,limit),p.x,p.y,p.z,limit);}
  };
}
// Distance from the eye to the far corner of the near plane: anything closer
// than this can be clipped away at the edge of the view.
export function nearPlaneReach(camera){
  const t=Math.tan(camera.fov*Math.PI/360);
  return camera.near*Math.sqrt(1+t*t*(1+camera.aspect*camera.aspect));
}
// Third-person orbit used by the walkthrough, shared with the tests.
export function orbitCamera(player,yaw,pitch,world,guard,clearance){
  const target={x:player.x,y:player.y+.65,z:player.z};
  const desired={x:player.x+Math.sin(yaw)*1.9*Math.cos(pitch),y:player.y+1.15-Math.sin(pitch)*1.9,z:player.z+Math.cos(yaw)*1.9*Math.cos(pitch)};
  // The colliders also cover the neighbourhood's plain boxes; the guard then
  // checks what is left of the sightline against the drawn surfaces.
  let fraction=world?world.cameraFraction(target,desired):1;
  if(guard){
    const limit={x:target.x+(desired.x-target.x)*fraction,y:target.y+(desired.y-target.y)*fraction,z:target.z+(desired.z-target.z)*fraction};
    fraction*=guard.fraction(target,limit,clearance);
  }
  return {target,position:{x:target.x+(desired.x-target.x)*fraction,y:target.y+(desired.y-target.y)*fraction,z:target.z+(desired.z-target.z)*fraction},fraction};
}
