// The monkey bars over the wooden climbing gym in the sunroom. Stand anywhere
// under the frame and E: the pet jumps, catches a rung with both paws and
// hangs there by its arms, swinging further and further the way a kid works
// along the bars — until E, or a step in any direction, and it lets go and
// drops to the floor. Everything here is read out of the export's collision
// boxes (the rungs come out as 'Overhead monkey bar'), so the bars can move
// in build.py without this module knowing where they went.
export function hangBarInteractions({world,data,player,life,body,tour,reducedMotion,list,ticking,sounds}){
  const rods=(data.colliders||[]).filter(b=>/^Overhead monkey bar/.test(b.name));
  if(!rods.length)return;                                    // no gym in this export
  const bars=rods.map(b=>(b.min[0]+b.max[0])/2).sort((a,b)=>a-b);
  const barY=rods.reduce((s,b)=>s+(b.min[1]+b.max[1])/2,0)/rods.length;
  const zMin=Math.min(...rods.map(b=>b.min[2])),zMax=Math.max(...rods.map(b=>b.max[2])),zMid=(zMin+zMax)/2;
  const gap=bars.length>1?(bars[bars.length-1]-bars[0])/(bars.length-1):.26;
  // Where you stand to reach them: under the far end of the frame, clear of
  // the swing seat that hangs in the middle of it (safeSpot walks outwards
  // until it finds floor the pet fits on).
  const home=world.safeSpot(bars[bars.length-1]-.4,0,zMid);
  if(!home)return;
  // A pet is ~0.53 m tall: its paws on the rung, its body the rest of the way
  // below it. The swing is timed for a much longer rope than that, or it would
  // twitch back and forth instead of sweeping.
  const REACH=.58,ROPE=1.2,RATE=Math.sqrt(9.8/ROPE),AMP=.5,CLIMB=.5;
  // In reach from any side of the frame — the rungs' own footprint, not a
  // circle round one spot (see `beside` on the cars).
  const x0=bars[0]-gap/2,x1=bars[bars.length-1]+gap/2;
  const distance=p=>Math.hypot(Math.max(0,x0-p.x,p.x-x1),Math.max(0,zMin-p.z,p.z-zMax));
  let bar=bars[0],from=home,heading=Math.PI,t=0,amp=0,phase=0,lastKick=1,said=false,release=null;
  ticking.push(dt=>{
    if(!release)return;
    // Landing, a Rooms jump or another interaction cancels the old throw.
    if(!body.airborne||Math.hypot(player.x-release.x,player.z-release.z)>1.5){release=null;return;}
    // Until the paws clear the rung, lateral movement would collide with its
    // box. Keep the throw for the lower part of the fall.
    if(player.y+world.height>barY-.04)return;
    const step=Math.min(dt,release.left);
    world.moveAir(player,release.vx*step,release.vz*step);
    release.left-=step;
    if(release.left<=0)release=null;
  });
  list.push({id:'monkey-bars',icon:'🐒',name:'Swing on the bars',kind:'ride',at:home,radius:1.0,distance,
    start(){
      // The rung right overhead, and the way it was walking — a kid on the
      // bars faces along them, swinging forwards and back.
      bar=bars.reduce((a,b)=>Math.abs(b-player.x)<Math.abs(a-player.x)?b:a);
      heading=player.z>zMid?Math.PI:0;
      from={x:player.x,y:player.y,z:player.z};t=0;amp=0;phase=0;lastKick=1;release=null;
      // A view from outside the frame, over the ladder up its end and under
      // the sunroom's ceiling beams — the ordinary boom, aimed at a pet up in
      // the air, backs into the rungs a hand's breadth behind it.
      tour?.setCameraRig?.({target:.35,boom:2.7,height:.9});
      life.hop(.9);sounds.boing();
      if(!said){said=true;life.say('Monkey bars!',1800);}
    },
    tick(dt){
      t+=dt;
      // The jump up and the catch (half a second), then it builds a swing.
      const climb=Math.min(1,t/CLIMB),k=climb*climb*(3-2*climb);
      if(climb>=1&&!reducedMotion){amp+=(AMP-amp)*(1-Math.exp(-dt*.9));phase+=RATE*dt;}
      const a=Math.sin(phase)*amp;
      // The paws stay on the rung; the body hangs off it and swings about it.
      const hang={x:bar,y:barY-Math.cos(a)*REACH,z:zMid+Math.sin(a)*REACH};
      player.x=from.x+(hang.x-from.x)*k;player.y=from.y+(hang.y-from.y)*k;player.z=from.z+(hang.z-from.z)*k;
      life.face(heading);
      // `stretch` puts both arms up over the head — the hanging shape.
      life.ride({dx:0,dy:0,dz:0,tilt:-a*k,pose:{stretch:1},expression:amp>.25?'happy':undefined});
      // A boing at each end of the swing, where a kid kicks for the next rung.
      const kick=Math.cos(phase);if(amp>.15&&Math.sign(kick)!==Math.sign(lastKick))sounds.boing();lastKick=kick;
      // Watched from the open side of the frame, where the swinging shows.
      return {yaw:Math.PI/2};
    },
    stop(){
      // Lets go over whatever it has swung out to — clear of the frame's legs
      // and the swing seat — and falls the rest of the way on its own.
      const spot=world.safeSpot(player.x,home.y,player.z)||home;
      const dx=spot.x-player.x,dz=spot.z-player.z;
      // Carry the pendulum's horizontal velocity into the fall. If the floor
      // directly below is obstructed, steer that short release toward a safe
      // landing over several frames instead of jumping sideways at once.
      release={x:player.x,z:player.z,vx:Math.abs(dx)>.01?dx/.35:0,vz:Math.abs(dz)>.01?dz/.35:Math.cos(phase)*amp*RATE*REACH,left:.35};
      body.airborne=true;body.vy=0;tour?.setCameraRig?.(null);
      life.ride(null);life.hop(.5);
    }});
}
