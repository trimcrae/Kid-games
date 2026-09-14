// Walls of glass the pet must not walk through. The exported walking
// colliders give the sunroom's glazed walls only their floor and head rails,
// both below the pet's step height, so a pet (and the paw-print route) could
// walk straight through the closed sliders instead of the open one; the
// follow camera, which never looks through glass, then collapsed onto the pet
// as it crossed the pane. Every drawn pane with walkable floor a step or less
// below it on both sides, standing taller than a pet, gets a thin walking box
// here; windows above a sill or a roof are left alone.
export function glazingBoxes(binary,groups,world,{step=.2,minHeight=.6,thick=.06}={}){
  const f=new Float32Array(binary),panes=[];
  for(const g of groups){
    const material=(g.name||'').split(' / ').at(-1)||'';
    if(!/window glass|door glass|glazing/i.test(material))continue;
    const o=g.offset/4;
    for(let v=0;v<g.count;v+=3){
      const a=o+v*6,b=a+6,c=a+12;
      // Upright faces only.
      const ux=f[b]-f[a],uy=f[b+1]-f[a+1],uz=f[b+2]-f[a+2],wx=f[c]-f[a],wy=f[c+1]-f[a+1],wz=f[c+2]-f[a+2];
      const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,nl=Math.hypot(nx,ny,nz);
      if(nl<1e-9||Math.abs(ny)/nl>.2)continue;
      const lo=[0,1,2].map(k=>Math.min(f[a+k],f[b+k],f[c+k])),hi=[0,1,2].map(k=>Math.max(f[a+k],f[b+k],f[c+k]));
      // A pane's face, not the thin edge of a window.
      if(hi[1]-lo[1]<minHeight||Math.hypot(hi[0]-lo[0],hi[2]-lo[2])<.25)continue;
      const mx=(lo[0]+hi[0])/2,mz=(lo[2]+hi[2])/2,sx=nx/nl*.25,sz=nz/nl*.25;
      const low=[[mx+sx,mz+sz],[mx-sx,mz-sz]].every(([x,z])=>{const fl=world.floor(x,z,lo[1]+.05);return Number.isFinite(fl)&&fl<=lo[1]+.05&&lo[1]-fl<=step;});
      if(low)panes.push({min:lo,max:hi});
    }
  }
  // A pane's two faces and its edges merge into one box.
  const merged=[];
  for(const p of panes){
    const m=merged.find(q=>[0,1,2].every(k=>p.min[k]<=q.max[k]+.02&&p.max[k]>=q.min[k]-.02));
    if(m)for(let k=0;k<3;k++){m.min[k]=Math.min(m.min[k],p.min[k]);m.max[k]=Math.max(m.max[k],p.max[k]);}
    else merged.push({min:[...p.min],max:[...p.max]});
  }
  return merged.map((m,i)=>{
    for(const k of [0,2])if(m.max[k]-m.min[k]<thick){const mid=(m.min[k]+m.max[k])/2;m.min[k]=mid-thick/2;m.max[k]=mid+thick/2;}
    return {name:`Floor-length glazing ${i}`,min:m.min,max:m.max};
  });
}
