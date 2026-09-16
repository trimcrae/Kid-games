// How far the pet will walk off an edge of its own accord (see walkStep).
const STEP_OFF=1.2;
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
  // `step` is how far the body climbs on its own: the walking step height on
  // foot, but nothing at all in the air, where anything below the paws is
  // something to land on rather than to step over.
  blocked(x,z,y,step=.265) {
    for (const b of this.nearby(x,z)) {
      if (b.max[1]<=y+step || b.min[1]>=y+this.height) continue;
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
  // ----- jumping ----------------------------------------------------------
  // Walking uses `floor`, which only ever steps up or down a little. A jump
  // needs to know what is under the paws however far below: the top it lands
  // on — a bed, a couch, a table — or the floor it falls back to.
  // (-Infinity means nothing underneath at all.) The .10 margin is the one
  // `floor` already walks on, so anywhere the pet can stand it can also land.
  support(x,z,y,reach=.02) {
    let top=-Infinity;
    for (const b of this.nearby(x,z)) {
      if (b.max[1]>y+reach) continue;
      if (x>=b.min[0]-.10 && x<=b.max[0]+.10 && z>=b.min[2]-.10 && z<=b.max[2]+.10) top=Math.max(top,b.max[1]);
    }
    return top;
  }
  // The lowest surface over the pet's head — a ceiling, a shelf, the underside
  // of the stairs — so a jump bumps into it instead of going through it.
  headroom(x,z,y) {
    let low=Infinity;
    for (const b of this.nearby(x,z)) {
      if (b.min[1]<y+this.height) continue;
      const dx=x-Math.max(b.min[0],Math.min(x,b.max[0]));
      const dz=z-Math.max(b.min[2],Math.min(z,b.max[2]));
      if (dx*dx+dz*dz<this.radius*this.radius) low=Math.min(low,b.min[1]);
    }
    return low;
  }
  // Moving while off the ground: the height is the caller's to change (it has
  // the gravity), and only what the body would really hit at that height stops
  // it — so a jump sails over the arm of the couch and lands on the cushions.
  // `minFloor` is how far down the ground may be for the pet to go there at
  // all: nothing underneath is the edge of the built world (past the lawn),
  // and a long drop is a balcony, a stairwell or a seam between the exported
  // floor pieces. A jump stops at those exactly where walking always has,
  // rather than sailing out over nothing or through the floor.
  moveAir(p,dx,dz,minFloor=-Infinity) {
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));
    const put=(x,z)=>{const under=this.support(x,z,p.y);
      if(this.blocked(x,z,p.y,0)||!(under>=minFloor))return false;p.x=x;p.z=z;return true;};
    for(let i=0;i<steps;i++)
      if(!put(p.x+dx/steps,p.z+dz/steps)){put(p.x+dx/steps,p.z);put(p.x,p.z+dz/steps);}
    return p;
  }
  // A walking step that is allowed to walk off an edge. Returns true when the
  // pet has stepped into thin air (off the table or bed it climbed onto), so
  // the caller can let it fall instead of stopping it at the brink.
  walkStep(p,dx,dz) {
    const want=Math.hypot(dx,dz);if(want<1e-6)return false;
    const from={x:p.x,y:p.y,z:p.z};
    this.move(p,dx,dz);
    if (Math.hypot(p.x-from.x,p.z-from.z)>=want-.002) return false;
    // Something stopped the step. A wall stops the body in mid-air too; only a
    // missing floor lets the very same step through.
    const air={x:from.x,y:from.y,z:from.z};
    this.moveAir(air,dx,dz);
    if (Math.hypot(air.x-p.x,air.z-p.z)<.02) return false;
    // Only step off onto something a little way down — off the table it climbed
    // onto, down the porch. A longer drop than STEP_OFF (the stairwell, the
    // balcony, the edge of the world) still stops the pet where walking always
    // stopped it; going down there takes a deliberate jump.
    const land=this.support(air.x,air.z,air.y);
    if (!Number.isFinite(land) || land>air.y-.05 || land<air.y-STEP_OFF) return false;
    p.x=air.x;p.z=air.z;p.y=air.y;return true;
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

// The pet's body in that world: walking, jumping and falling, one frame at a
// time. It lives here rather than in walkthrough.js so the walking tests play
// exactly the physics the browser plays.
// `speed` against `gravity` clears about 89 cm at the walking frame rate: over
// every bed (55 cm), couch (50 cm) and table (up to 80 cm) in the house, and
// short of the kitchen worktops at 95 cm. The generous timing is what makes it
// feel fair to a six-year-old: a press just before landing hops again the
// instant the paws touch down (`buffer`), and a press just after running off an
// edge still counts (`coyote`).
export const JUMP={gravity:11,speed:4.6,coyote:.12,buffer:.18};
export class Body {
  constructor(world,options={}) {
    this.world=world;
    Object.assign(this,JUMP,options);
    this.coyoteTime=this.coyote;this.jumps=0;this.reset();
  }
  reset(p){this.vy=0;this.airborne=false;this.coyote=this.coyoteTime;this.buffered=0;this.ground=p?p.y:0;}
  // Space, or the jump paw: remembered for a moment (`buffer`, above).
  jump(){this.buffered=this.buffer;}
  // One frame. `dx`/`dz` is the step the controls asked for. Returns 'jump' on
  // take-off and 'land' on touchdown, so the caller can bounce the body.
  step(p,dx,dz,dt) {
    const w=this.world;let event=null;
    this.buffered=Math.max(0,this.buffered-dt);
    // Nothing to bang its head on? Then it may go up.
    if(this.buffered&&this.coyote>0&&w.headroom(p.x,p.z,p.y)>p.y+w.height+.05){
      this.buffered=0;this.coyote=0;this.vy=this.speed;this.airborne=true;this.jumps++;event='jump';
    }
    if(!this.airborne)this.ground=p.y;
    if(this.airborne){
      // In the air the pet still steers — a kid aiming at the bed expects to —
      // and only walls at its own height stop it. It may cross ground up to
      // one STEP_OFF below where it took off, which is every piece of
      // furniture in the house but not a storey.
      w.moveAir(p,dx,dz,this.ground-STEP_OFF);
      this.vy-=this.gravity*dt;
      let y=p.y+this.vy*dt;
      // A head into the ceiling or the underside of the stairs stops the rise.
      const head=w.headroom(p.x,p.z,p.y);
      if(this.vy>0&&y+w.height>head){y=Math.max(p.y,head-w.height);this.vy=0;}
      // Coming down, land on the highest thing under the paws: bed, couch,
      // table or floor. Over nothing at all, keep falling (see `lost`).
      const land=w.support(p.x,p.z,p.y);
      if(this.vy<=0&&Number.isFinite(land)&&y<=land){y=land;this.vy=0;this.airborne=false;event||='land';}
      p.y=y;
    }
    // Walking off the edge of whatever it stood on: fall from there.
    else if(w.walkStep(p,dx,dz)){this.airborne=true;this.vy=0;}
    this.coyote=this.airborne?Math.max(0,this.coyote-dt):this.coyoteTime;
    return event;
  }
  // Fallen out of the world (a gap in the export, a save from mid-air): the
  // caller puts the pet back on its feet rather than let it fall for ever.
  lost(p){return p.y<-6;}
}
