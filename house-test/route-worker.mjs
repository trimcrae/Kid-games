// Worker thread for the paw-print route search (see wayfinding.mjs).
import {WalkingWorld} from './physics.mjs';
import {routeSearch} from './route-search.mjs';
let world=null;
onmessage=e=>{
  const m=e.data;
  if(m.type==='init'){
    world=new WalkingWorld(m.boxes,{radius:m.radius,height:m.height});
    // Warm up once in the background (a long cross-floor search), so the
    // player's first request runs on already-compiled code.
    if(m.warm){const s=routeSearch(world,m.warm[0],m.warm[1]);while(s.state==='searching')s.run(1000);}
    return;
  }
  if(m.type==='route'){
    if(!world){postMessage({id:m.id,state:'failed',path:null,expanded:0});return;}
    const t=performance.now(),s=routeSearch(world,m.from,m.to);while(s.state==='searching')s.run(1000);
    postMessage({id:m.id,state:s.state,path:s.path,expanded:s.expanded,ms:Math.round(performance.now()-t)});
  }
};