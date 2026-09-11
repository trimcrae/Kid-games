// Worker thread for the paw-print route search (see wayfinding.mjs).
import {WalkingWorld} from './physics.mjs';
import {routeSearch} from './route-search.mjs';
let world=null,warm=null;
// Warm up in the background (a long cross-floor search) so a later request
// runs on already-compiled code — but in small slices, so a player's real
// request never waits behind it: a request simply cancels the warm-up.
function warmStep(){
  if(!warm)return;
  warm.run(20);
  if(warm.state==='searching')setTimeout(warmStep,0);else warm=null;
}
onmessage=e=>{
  const m=e.data;
  if(m.type==='init'){
    world=new WalkingWorld(m.boxes,{radius:m.radius,height:m.height});
    warm=m.warm?routeSearch(world,m.warm[0],m.warm[1]):null;
    if(warm)setTimeout(warmStep,0);
    return;
  }
  if(m.type==='route'){
    warm=null;
    if(!world){postMessage({id:m.id,state:'failed',path:null,expanded:0});return;}
    const t=performance.now(),s=routeSearch(world,m.from,m.to);while(s.state==='searching')s.run(1000);
    postMessage({id:m.id,state:s.state,path:s.path,expanded:s.expanded,ms:Math.round(performance.now()-t)});
  }
};
