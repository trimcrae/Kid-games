// One step of a house companion's wandering: family pets and activity hosts
// stroll near their room, turn off walls and make room for your pet. An egg
// has not hatched yet, so it never walks, wanders or gets shoved about: it
// waits where it was laid. Returns the floor distance to the player.
export function stepCompanion(r,dt,world,player,random=Math.random){
  r.timer-=dt;
  if(r.timer<=0){r.timer=2+random()*4;r.angle=random()*Math.PI*2;r.walking=!r.egg&&random()>.22;}
  if(r.egg)r.walking=false;
  if(r.walking){
    const before={...r.point};
    if(Math.hypot(r.point.x-r.anchor.x,r.point.z-r.anchor.z)>2)r.angle=Math.atan2(r.anchor.x-r.point.x,r.anchor.z-r.point.z);
    world.move(r.point,Math.sin(r.angle)*dt*.4,Math.cos(r.angle)*dt*.4);
    const dist=Math.hypot(r.point.x-before.x,r.point.z-before.z);r.distance+=dist;
    if(dist<dt*.06){r.angle+=1.6;r.timer=.5;}
  }
  const gap=Math.hypot(r.point.x-player.x,r.point.z-player.z);
  if(!r.egg&&Math.abs(r.point.y-player.y)<.5&&gap<.8){
    r.angle=Math.atan2(r.point.x-player.x,r.point.z-player.z);
    world.move(r.point,Math.sin(r.angle)*(.8-gap),Math.cos(r.angle)*(.8-gap));r.walking=true;
  }
  return gap;
}
