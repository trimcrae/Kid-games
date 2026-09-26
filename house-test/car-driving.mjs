// A small, deterministic arcade vehicle step. The caller owns the world fit
// test, so the same handling works for both garage cars and can be exercised
// without a renderer.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function driveCar(car,{throttle=0,steer=0},dt,fit){
  throttle=clamp(Number(throttle)||0,-1,1);
  steer=clamp(Number(steer)||0,-1,1);
  let hit=false,moved=false;
  // Keep collision samples close together even on a slow or dropped frame.
  // Do not simulate seconds of motion when the page resumes from a pause.
  let remaining=clamp(dt,0,.12);
  while(remaining>1e-8){
    const t=Math.min(remaining,1/90);
    remaining-=t;
    car.steering??=0;
    car.steering+=(steer-car.steering)*(1-Math.exp(-t*12));
    const speed=car.speed;
    if(throttle===0){
      const drop=(2.1+Math.abs(speed)*.55)*t;
      car.speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-drop);
    }else if(speed*throttle<-.01){
      // The opposite pedal is a brake first. It cannot jump from forward to
      // reverse during the same collision step.
      const next=speed-Math.sign(speed)*9*t;
      car.speed=next*speed>0?next:0;
    }else{
      const top=throttle>0?5.2:2.8;
      const target=throttle*top;
      const acceleration=throttle>0?6.2:4.3;
      const rate=Math.abs(target)>Math.abs(speed)?acceleration:5.5;
      const change=clamp(target-speed,-rate*t,rate*t);
      car.speed=speed+change;
    }
    if(Math.abs(car.speed)<.015)car.speed=0;
    if(!car.speed){
      // Finish settling after the pedal is released or a collision stops the
      // car on a grade. Otherwise the last bit of smoothing leaves it hovering.
      const ground=fit(car.x,car.z,car.heading).ground;
      if(ground!==null&&ground!==undefined)car.y+=(ground-car.y)*(1-Math.exp(-t*7));
      continue;
    }

    // Forward follows local -Z. Steering reverses naturally when backing up.
    const turn=car.steering*Math.sign(car.speed)*Math.min(1.7,.32+Math.abs(car.speed)*.42)*t;
    const desiredHeading=wrap(car.heading+turn);
    const before=fit(car.x,car.z,car.heading);
    const heading=fit(car.x,car.z,desiredHeading).n<=before.n+1e-7?desiredHeading:car.heading;
    const distance=car.speed*t,dx=-Math.sin(heading)*distance,dz=-Math.cos(heading)*distance;
    const accept=(x,z)=>{const next=fit(x,z,heading);return next.n<=before.n+1e-7?next:null;};
    let nx=car.x+dx,nz=car.z+dz,next=accept(nx,nz),sliding=false;
    if(!next){
      // Project the attempted motion along an axis of the obstacle. This
      // preserves steering direction and avoids the old sideways lunges from
      // trying unrelated travel headings. Prefer the longer valid projection.
      const xFit=Math.abs(dx)>1e-8?accept(car.x+dx,car.z):null;
      const zFit=Math.abs(dz)>1e-8?accept(car.x,car.z+dz):null;
      if(xFit&&(!zFit||Math.abs(dx)>=Math.abs(dz))){nx=car.x+dx;nz=car.z;next=xFit;}
      else if(zFit){nx=car.x;nz=car.z+dz;next=zFit;}
      sliding=!!next;
      hit=true;
    }
    car.heading=heading;
    if(next){
      car.x=nx;car.z=nz;moved=true;
      if(next.ground!==null&&next.ground!==undefined)
        car.y+=(next.ground-car.y)*(1-Math.exp(-t*7));
      if(sliding)car.speed*=Math.exp(-t*2.8);
    }else car.speed=0;
  }
  return {hit,moved};
}
