import * as THREE from './vendor/three.module.min.js';
import {routeSearch} from './route-search.mjs';
export {routeSearch};

// "Walk there" directions as paw prints on the floor along a real walkable
// route, instead of a compass arrow through the walls. The route is found by
// route-search.mjs in a worker thread (route-worker.mjs), so the first search
// isn't held up by the page's own work (a shader compile, a room probe); if a
// worker can't start, the same search runs here a few ms per frame.
export function createRouter(world,warm=null){
  let worker=null,sent=-1,next=1;const pending=new Map();
  function fallback(r){r.local=routeSearch(world,r.from,r.to);}
  try{
    worker=new Worker(new URL('./route-worker.mjs',import.meta.url),{type:'module'});
    worker.onmessage=e=>{const m=e.data,r=pending.get(m.id);if(!r)return;pending.delete(m.id);r.state=m.state;r.path=m.path;r.expanded=m.expanded;r.ms=m.ms;};
    worker.onerror=e=>{e.preventDefault?.();worker=null;for(const r of pending.values())fallback(r);pending.clear();};
  }catch{worker=null;}
  // Send the walls once (and again only if more were added since).
  function sync(){if(worker&&sent!==world.boxes.length){sent=world.boxes.length;worker.postMessage({type:'init',radius:world.radius,height:world.height,warm:sent===world.boxes.length&&warm?warm:null,boxes:world.boxes.map(b=>({name:b.name,min:b.min,max:b.max}))});warm=null;}}
  sync();
  return {
    request(from,to){
      const r={id:next++,from:{...from},to:{...to},state:'searching',path:null,expanded:0,local:null,
        run(ms=6){if(this.local){const s=this.local.run(ms);this.state=s;this.path=this.local.path;this.expanded=this.local.expanded;}return this.state;}};
      if(worker){sync();pending.set(r.id,r);worker.postMessage({type:'route',id:r.id,from:r.from,to:r.to});}else fallback(r);
      return r;
    },
  };
}// A short trail of alternating paw prints over the next few metres of the route.
export function createPawTrail(scene,{count=14,spacing=.42,ahead=5.4}={}){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const pad=(x,y,rx,ry,r=0)=>{g.beginPath();g.ellipse(x,y,rx,ry,r,0,Math.PI*2);g.fill();g.stroke();};
  g.fillStyle='#2f7f78';g.strokeStyle='#fff8ec';g.lineWidth=7;
  pad(64,82,30,26);pad(30,48,12,15,-.35);pad(52,30,12,16,-.1);pad(76,30,12,16,.1);pad(98,48,12,15,.35);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const geo=new THREE.PlaneGeometry(.16,.16);geo.rotateX(-Math.PI/2);
  const mesh=new THREE.InstancedMesh(geo,mat,count);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=1;mesh.name='paw trail';scene.add(mesh);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pos=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  let path=null,lengths=null,cursor=0;
  function pointAt(d){ // position + heading at arc length d
    let i=Math.max(0,cursor-1);while(i<lengths.length-2&&lengths[i+1]<d)i++;
    const a=path[i],b=path[i+1],seg=Math.max(1e-6,lengths[i+1]-lengths[i]),t=Math.min(1,Math.max(0,(d-lengths[i])/seg));
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(b.x-a.x,b.z-a.z)};
  }
  return {
    setPath(p){path=p&&p.length>1?p:null;cursor=0;lengths=null;mesh.count=0;
      if(path){lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z,path[i].y-path[i-1].y));}},
    // How far the player is from the route (to decide when to plan again).
    update(player){
      if(!path){mesh.count=0;return Infinity;}
      // Nearest point on the route, searching forward from last time.
      let best=Infinity,bestD=0,bestI=cursor;
      for(let i=Math.max(0,cursor-3);i<path.length-1;i++){
        const a=path[i],b=path[i+1],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-6;
        const t=Math.min(1,Math.max(0,((player.x-a.x)*dx+(player.z-a.z)*dz)/l2));
        const d=Math.hypot(a.x+dx*t-player.x,a.z+dz*t-player.z)+Math.abs(a.y+(b.y-a.y)*t-player.y)*2;
        if(d<best){best=d;bestI=i;bestD=lengths[i]+(lengths[i+1]-lengths[i])*t;}
        if(i>cursor+40)break;
      }
      cursor=bestI;
      const total=lengths.at(-1);let n=0;
      for(let d=bestD+.55,k=0;d<Math.min(total-.2,bestD+ahead)&&n<count;d+=spacing,k++){
        const p=pointAt(d),side=(k%2?1:-1)*.07;
        pos.set(p.x+Math.cos(p.angle)*side,p.y+.035,p.z-Math.sin(p.angle)*side);
        q.setFromAxisAngle(up,p.angle+Math.PI);s.setScalar(1);m4.compose(pos,q,s);mesh.setMatrixAt(n++,m4);
      }
      mesh.count=n;mesh.instanceMatrix.needsUpdate=true;
      return best;
    },
    get remaining(){return path?lengths.at(-1):0;},
    get count(){return mesh.count;},
    clear(){this.setPath(null);},
  };
}
