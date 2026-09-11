import * as THREE from './vendor/three.module.min.js';

// Walking heights come from the collision boxes, but a floor's finish — oak
// boards, tile, a rug — sits up to ~2 cm above its box. A pet placed at the
// walking height has its feet and contact shadow buried in the boards. This
// finds the visible floor under a point once per 25 cm patch (a short ray
// against floor-like house meshes only) and remembers it, so pets stand on
// the surface you see and their shadows show on oak and tile.
const FLOORISH=/floor|lawn|tile|carpet|rug|tread|stair|deck|patio|path|terrace|paving|ground|slab|step/i;
export function createGround(scene,{maxRaysPerFrame=2}={}){
  let meshes=null,rays=0;const cache=new Map();
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),origin=new THREE.Vector3();
  function candidates(){
    if(!meshes){meshes=[];scene.traverse(m=>{if(m.isMesh&&!m.isSkinnedMesh&&m.layers.isEnabled(1)&&FLOORISH.test(m.name||'')&&!m.material?.transparent)meshes.push(m);});}
    return meshes;
  }
  return {
    // Call once per frame: bounds the number of new rays (the rest wait a frame).
    frame(){rays=0;},
    offset(p,fallback=0){
      const key=Math.round(p.x*4)+','+Math.round(p.z*4)+','+Math.round(p.y*20);
      const known=cache.get(key);if(known!==undefined)return known;
      if(rays>=maxRaysPerFrame)return fallback;rays++;
      origin.set(p.x,p.y+.08,p.z);ray.set(origin,down);ray.far=.14;
      const hit=ray.intersectObjects(candidates(),false)[0];
      const off=hit?THREE.MathUtils.clamp(hit.point.y-p.y,0,.05):0;
      if(cache.size>6000)cache.clear();cache.set(key,off);return off;
    },
  };
}
