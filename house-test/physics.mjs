// Capsule-like upright walking against spatially indexed model bounds.
// Coordinates match Three: Y up. Movement is split into small steps to prevent tunnelling.
export class WalkingWorld {
  constructor(boxes,{radius=.17,height=1.70}={}) {
    this.boxes = [];
    this.grid = new Map();
    this.radius = radius;
    this.height = height;
    this.addBoxes(boxes);
  }
  addBoxes(boxes) {
    for (const b of boxes) {
      const i=this.boxes.length;this.boxes.push(b);
      for (let x = Math.floor(b.min[0]/2); x <= Math.floor(b.max[0]/2); x++)
        for (let z = Math.floor(b.min[2]/2); z <= Math.floor(b.max[2]/2); z++) {
          const key = `${x},${z}`;
          if (!this.grid.has(key)) this.grid.set(key, []);
          this.grid.get(key).push(i);
        }
    }
  }
  nearby(x,z,r=this.radius) {
    const ids = new Set();
    for (let ix=Math.floor((x-r)/2); ix<=Math.floor((x+r)/2); ix++)
      for (let iz=Math.floor((z-r)/2); iz<=Math.floor((z+r)/2); iz++)
        for (const i of this.grid.get(`${ix},${iz}`)||[]) ids.add(i);
    return Array.from(ids, i=>this.boxes[i]);
  }
  floor(x,z,y) {
    let top = -Infinity, edge = -Infinity;
    for (const b of this.nearby(x,z)) {
      if (x>=b.min[0]-.10 && x<=b.max[0]+.10 && z>=b.min[2]-.10 && z<=b.max[2]+.10
          && b.max[1]<=y+.255 && b.max[1]>=y-.40) {
        edge=Math.max(edge,b.max[1]);
        if(x>=b.min[0]-.01 && x<=b.max[0]+.01 && z>=b.min[2]-.01 && z<=b.max[2]+.01)top=Math.max(top,b.max[1]);
      }
    }
    return Number.isFinite(top)?top:edge;
  }
  blocked(x,z,y) {
    for (const b of this.nearby(x,z)) {
      if (b.max[1]<=y+.265 || b.min[1]>=y+this.height) continue;
      const dx=x-Math.max(b.min[0],Math.min(x,b.max[0]));
      const dz=z-Math.max(b.min[2],Math.min(z,b.max[2]));
      if (dx*dx+dz*dz<this.radius*this.radius-.00001) return b.name;
    }
    return null;
  }
  tryMove(p,x,z) {
    const floor=this.floor(x,z,p.y);
    if (!Number.isFinite(floor) || this.blocked(x,z,floor)) return false;
    p.x=x;p.z=z;p.y=floor;return true;
  }
  move(p,dx,dz) {
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));
    for(let i=0;i<steps;i++) {
      if (!this.tryMove(p,p.x+dx/steps,p.z+dz/steps)) {
        this.tryMove(p,p.x+dx/steps,p.z);
        this.tryMove(p,p.x,p.z+dz/steps);
      }
    }
    return p;
  }
  safeSpot(x,y,z) {
    for(let r=0;r<=1.5;r+=.1) {
      const n=r===0?1:24;
      for(let i=0;i<n;i++) {
        const px=x+Math.cos(i/n*Math.PI*2)*r,pz=z+Math.sin(i/n*Math.PI*2)*r;
        const floor=this.floor(px,pz,y);
        if(Number.isFinite(floor) && !this.blocked(px,pz,floor)) return {x:px,y:floor,z:pz};
      }
    }
    return null;
  }
  // Swept sightline against the house bounds. Pull the orbit camera in before
  // walls, ceilings and furniture; it must never show through another room.
  // `skip(box)` lets the camera look past some boxes (low furniture seen from above).
  cameraFraction(from,to,skip=null) {
    let fraction=1;
    const a=[from.x,from.y,from.z],d=[to.x-from.x,to.y-from.y,to.z-from.z];
    for(const b of this.boxes){
      if(skip&&(b.cameraSoft??=!!skip(b)))continue;
      let near=0,far=fraction;
      for(let axis=0;axis<3;axis++){
        const lo=b.min[axis]-.055,hi=b.max[axis]+.055;
        if(Math.abs(d[axis])<1e-8){if(a[axis]<lo||a[axis]>hi){far=-1;break;}}
        else {let t1=(lo-a[axis])/d[axis],t2=(hi-a[axis])/d[axis];near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}
      }
      if(far>=near&&near>0)fraction=Math.min(fraction,Math.max(.04,near-.035));
    }
    return fraction;
  }
}
