// Every bed in the house. Stand beside one (or hop up onto it) and E: the
// pet climbs on, curls up and falls asleep — the lights go down, a "z z"
// drifts up, and its energy bar fills while it sleeps, a little each second,
// until it is rested (then it wakes on its own) or you wake it: E, or a step
// in any direction. The view watches from across the bed while it sleeps. The beds are read out of the export's collision boxes
// (every mattress comes out as 'White mattress', 'Bunk mattress', 'Clean crib
// mattress' or 'Bassinet mattress'), so a bed moved in build.py moves here
// too, and a new one is a bed the moment it is exported.
const MATTRESS=/^(White mattress|Bunk mattress|Clean crib mattress|Bassinet mattress)/;
// Energy back per second asleep (the game's short nap is +18 in one go).
export const REST_PER_SECOND=6;
// The shortest sleep, so an already-rested pet still gets its nap.
const MIN_SLEEP=4;

// What each mattress box is: where to lie, how high, what to call it and
// whether it is stacked over another (a bunk). Pure data, so a test can check
// every bed without a browser.
export function findBeds(colliders,world){
  const boxes=(colliders||[]).filter(b=>MATTRESS.test(b.name));
  const beds=boxes.map((b,i)=>{
    const x=(b.min[0]+b.max[0])/2,z=(b.min[2]+b.max[2])/2;
    // The top of what you lie on: the made cover on the bunks sits on the
    // mattress as its own box.
    const s=world.support(x,z,b.max[1]+.2,0),top=Number.isFinite(s)?s:b.max[1];
    return {id:'bed-'+i,box:b,x,z,top,along:(b.max[0]-b.min[0])>=(b.max[2]-b.min[2]),
      what:/crib/i.test(b.name)?'the crib':/bassinet/i.test(b.name)?'the bassinet':/bunk/i.test(b.name)?'the bunk':'the bed',below:null,above:null};
  });
  // Bunks: the mattresses share a footprint, one over the other.
  for(const a of beds)for(const b of beds){
    if(a===b||a.top<=b.top||a.top-b.top>1.6)continue;         // (not a bed on the floor above)
    const overlap=a.box.min[0]<b.box.max[0]&&a.box.max[0]>b.box.min[0]&&a.box.min[2]<b.box.max[2]&&a.box.max[2]>b.box.min[2];
    if(overlap){a.below=b;b.above=a;}
  }
  for(const b of beds)if(b.above||b.below)b.what=b.above?'the bottom bunk':'the top bunk';
  return beds;
}
// How far (x,z) is outside a bed's footprint: 0 on it.
export function besideBed(bed,p){const b=bed.box;return Math.hypot(Math.max(0,b.min[0]-p.x,p.x-b.max[0]),Math.max(0,b.min[2]-p.z,p.z-b.max[2]));}
// In reach: a bed from about knee height below you up to what you could
// climb onto (a bed from the floor, the top bunk from the bottom one).
export function bedReach(bed,p){const dy=bed.top-p.y;return dy>-.35&&dy<1.5;}

export function bedInteractions({world,data,player,life,body,tour,reducedMotion,list,sounds}){
  const beds=findBeds(data.colliders,world);
  if(!beds.length)return;
  const veil=document.getElementById('sleep');
  for(const bed of beds){
    let from=null,slept=0,nextTick=1,gained=0,rested=false;
    // Watched from across the bed, from whichever long side has the room's
    // floor beside it (a bed in a corner has a wall down one side and, past
    // the other, nothing at all).
    const b=bed.box,halfW=(b.max[0]-b.min[0])/2,halfL=(b.max[2]-b.min[2])/2;
    const sides=bed.along?[[0,-1],[0,1]]:[[-1,0],[1,0]];
    // Counted outwards from the edge of the mattress up to a wall: floor to
    // stand on scores, a beanbag in the way is skipped, a wall ends the count
    // (the floor of the next room, beyond it, is not this side's).
    const wallAt=(px,pz)=>data.colliders.some(c=>c.max[1]>bed.top+1.2&&c.min[1]<bed.top+.5&&px>c.min[0]-.2&&px<c.max[0]+.2&&pz>c.min[2]-.2&&pz<c.max[2]+.2);
    const floorBeside=([sx,sz])=>{let n=0;for(let out=.25;out<=1.75;out+=.25){const px=bed.x+sx*(halfW+out),pz=bed.z+sz*(halfL+out);if(wallAt(px,pz))break;const f=world.floor(px,pz,bed.top-.6);if(Number.isFinite(f)&&!world.blocked(px,pz,f))n++;}return n;};
    const open=sides.map(s=>[s,floorBeside(s)]).sort((p,q)=>q[1]-p[1])[0][0];
    const viewYaw=Math.atan2(open[0],open[1]);
    // The view: from across the bed, a little above it. Over a railed bed
    // (the crib) the camera rides higher and looks down over the rail; under
    // a bunk it keeps low and flat.
    const near=data.colliders.filter(c=>c!==b&&c.min[0]<b.max[0]+.3&&c.max[0]>b.min[0]-.3&&c.min[2]<b.max[2]+.3&&c.max[2]>b.min[2]-.3);
    // Railed: a low rail along a long side (a headboard is at the end, and a
    // wall the bed stands against goes up to the ceiling).
    const tall=c=>c.max[1]>bed.top+.3&&c.max[1]<bed.top+1&&c.min[1]<bed.top;
    const alongSide=(c,[sx,sz])=>{const a=sx?0:2,edge=(sx||sz)>0?b.max[a]:b.min[a],o=a?0:2;
      return ((sx||sz)>0?c.min[a]<edge+.3&&c.max[a]>edge-.05:c.max[a]>edge-.3&&c.min[a]<edge+.05)&&c.min[o]<b.max[o]-.2&&c.max[o]>b.min[o]+.2;};
    const railed=near.some(c=>tall(c)&&sides.some(s=>alongSide(c,s)));
    const canopied=near.some(c=>c.min[1]>bed.top+.2&&c.min[1]<bed.top+1.2&&c.min[0]<bed.x&&c.max[0]>bed.x&&c.min[2]<bed.z&&c.max[2]>bed.z);
    const rig=canopied?{target:.15,boom:2.4,height:.3}:railed?{target:.5,boom:1.0,height:1.15}:{target:.25,boom:2.6,height:1.25};
    list.push({id:bed.id,icon:'😴',name:`Sleep in ${bed.what}`,kind:'ride',radius:.9,
      // Reach is by the bed's own footprint, not a circle round one spot (see
      // `beside` on the cars); the floor test is folded into `distance` as
      // well, since the top bunk is a floor and a half up from the carpet.
      get at(){return {x:bed.x,y:player.y,z:bed.z};},
      distance(p){
        if(!bedReach(bed,p))return Infinity;
        let d=besideBed(bed,p);
        // Standing on the bottom bunk, the top one is what E means.
        if(bed.above&&bed.above.top-p.y<=1.2&&bedReach(bed.above,p))d+=.05;
        return d;
      },
      off:'Wake up',
      start(){
        from={x:player.x,y:player.y,z:player.z};slept=0;nextTick=1;gained=0;rested=false;
        // Onto the middle of the mattress, lying along it.
        player.x=bed.x;player.y=bed.top;player.z=bed.z;
        life.face(bed.along?Math.PI/2:0);
        life.ride({dx:0,dy:0,dz:0,pose:{lie:1},expression:'sleep',emote:'zz',sleeping:true});
        tour?.setCameraRig?.(rig);
        if(veil)veil.classList.add('on');
        sounds?.click?.();
        life.say('Zzz… 💤',2200);
      },
      tick(dt){
        slept+=dt;
        // Rest comes a little at a time, so the energy bar can be watched filling.
        while(slept>=nextTick){
          nextTick+=1;
          const energy=life.rest?.(REST_PER_SECOND);
          if(typeof energy==='number'){gained=Math.min(100,gained+REST_PER_SECOND);if(energy>=100)rested=true;}
        }
        // Rested through: it wakes by itself (after at least a short nap).
        if(rested&&slept>=MIN_SLEEP)return {done:true};
        return {yaw:viewYaw};
      },
      stop(){
        if(veil)veil.classList.remove('on');
        tour?.setCameraRig?.(null);
        life.ride(null);
        life.rest?.(0,true);
        // Back where you got on (beside the bed, or on it if you had jumped
        // up) — unless something else already moved the pet (a Rooms jump).
        const stillHere=Math.hypot(player.x-bed.x,player.z-bed.z)<.05&&Math.abs(player.y-bed.top)<.05;
        const spot=stillHere?(from&&world.safeSpot(from.x,from.y,from.z))||from:null;
        if(spot){player.x=spot.x;player.y=spot.y;player.z=spot.z;}
        body?.reset?.(player);
        life.hop(.5);
        life.say(rested?'All rested! ⚡':gained>0?`That was a lovely nap. +${Math.round(gained)} ⚡`:'Mmm, cosy.',2600);
      }});
  }
  try{window.houseBeds=()=>beds.map(b=>({id:b.id,what:b.what,x:+b.x.toFixed(2),top:+b.top.toFixed(2),z:+b.z.toFixed(2),above:!!b.above,below:!!b.below}));}catch{}
}
