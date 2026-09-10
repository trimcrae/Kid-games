import * as THREE from './vendor/three.module.min.js';

// Slab intersections prevent a lamp on another floor or behind a partition
// from taking a nearby-light slot. The shadowed ceiling light provides pixel
// occlusion; the remaining fills approximate indirect light, not a GI bake.
export function segmentBlocked(a,b,boxes){
  return boxes.some(box=>{
    let near=.025,far=.96;
    for(let i=0;i<3;i++){
      const d=b[i]-a[i];
      if(Math.abs(d)<1e-7){if(a[i]<box.min[i]||a[i]>box.max[i])return false;}
      else{
        const p=(box.min[i]-a[i])/d,q=(box.max[i]-a[i])/d;
        near=Math.max(near,Math.min(p,q));far=Math.min(far,Math.max(p,q));
        if(near>far)return false;
      }
    }
    return true;
  });
}

export function choosePracticalLights(lights,position,occluders,limit=4){
  const eye=[position.x,position.y+1.15,position.z];
  return lights.map(light=>({light,distance:Math.hypot(...light.position.map((v,i)=>v-eye[i]))}))
    .filter(({light,distance})=>distance<7&&Math.abs(light.position[1]-eye[1])<2.1
      &&!segmentBlocked(eye,light.position,occluders))
    .sort((a,b)=>a.distance-b.distance).slice(0,limit).map(item=>item.light);
}

function skyEnvironment(renderer,pmrem){
  // A tiny code-authored overcast sky seeds reflections before the first room
  // probe. The actual model is captured for room reflections afterward.
  const width=128,height=64,pixels=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const elevation=Math.cos((y+.5)/height*Math.PI),up=Math.max(elevation,0);
    const col=elevation>=0?[.62-up*.22,.69-up*.20,.76-up*.15]:[.23,.25,.19];
    const index=(y*width+x)*4;
    for(let c=0;c<3;c++)pixels[index+c]=Math.round(col[c]*255);
    pixels[index+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,width,height);
  texture.colorSpace=THREE.LinearSRGBColorSpace;
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
  const target=pmrem.fromEquirectangular(texture);texture.dispose();return target;
}

export function createHouseLighting(scene,renderer,{mobile=false}={}){
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Architecture and furniture are static. Do not redraw hundreds of house
  // groups for shadows every walking frame. Pets already have contact blobs.
  renderer.shadowMap.autoUpdate=false;
  const hemisphere=new THREE.HemisphereLight(0xe7efff,0x9c896e,.72);
  const sun=new THREE.DirectionalLight(0xfff1db,2.2);
  scene.add(hemisphere,sun,sun.target);
  sun.position.set(-14,35,40);sun.target.position.set(6,0,-3);
  sun.castShadow=true;sun.shadow.mapSize.setScalar(mobile?1024:2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:36,bottom:-36,near:.5,far:110});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.018;sun.shadow.bias=-.00015;
  sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;

  const key=new THREE.SpotLight(0xffdec0,0,8,1.35,.85,2);
  key.castShadow=true;key.shadow.mapSize.setScalar(mobile?512:1024);
  key.shadow.camera.near=.06;key.shadow.normalBias=.008;key.shadow.bias=-.00015;
  key.shadow.autoUpdate=false;scene.add(key,key.target);
  const fills=Array.from({length:mobile?2:3},()=>{
    const light=new THREE.PointLight(0xffdec0,0,7,2);scene.add(light);return light;
  });
  for(const light of [hemisphere,sun,key,...fills])light.layers.enable(1);

  const pmrem=new THREE.PMREMGenerator(renderer),base=skyEnvironment(renderer,pmrem);
  scene.environment=base.texture;scene.environmentIntensity=.65;
  const cubeTarget=new THREE.WebGLCubeRenderTarget(mobile?64:128,{
    type:THREE.HalfFloatType,generateMipmaps:false});
  const cube=new THREE.CubeCamera(.08,65,cubeTarget);
  cube.layers.set(1);for(const face of cube.children)face.layers.set(1);
  const probes=new Map();
  let sources=[],occluders=[],loaded=false,lastSelection=-Infinity,lastProbe=-Infinity;
  let keyId='',pendingRoom=null,currentRoom='',selection=[];

  function load(data){
    sources=(data.lights||[]).filter(light=>light.power>0&&light.position?.length===3);
    occluders=(data.colliders||[]).filter(box=>/wall|partition|ceiling|floor|slab|roof|foundation/i.test(box.name)
      &&!/trim|picture|shelf|shelving|mounted|tile|board|joist/i.test(box.name));
    if(data.sunlight){
      sun.color.setRGB(...data.sunlight.color);
      sun.intensity=data.sunlight.intensity;
      const direction=new THREE.Vector3(...data.sunlight.direction).normalize();
      sun.position.copy(sun.target.position).addScaledVector(direction,-54);
    }
    loaded=true;sun.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
  }

  function apply(light,source){
    if(!source){light.intensity=0;return;}
    light.position.set(...source.position);light.color.setRGB(...source.color);
    // The Blender scene stores radiant watts. This exposure-calibrated display
    // conversion is deliberately separate from the physical source metadata.
    light.intensity=Math.min(20,source.power*(source.type==='area'?.12:.18));
    light.distance=source.type==='area'?7:5.5;
  }

  function select(position,now){
    if(now-lastSelection<350)return;lastSelection=now;
    selection=choosePracticalLights(sources,position,occluders,fills.length+1);
    const main=selection.find(light=>light.type==='area'||light.type==='spot');
    apply(key,main);
    if(main){
      key.target.position.copy(key.position).add(new THREE.Vector3(...main.direction));
      key.angle=Math.min(1.45,Math.max(.65,main.angle||1.35));
    }
    if((main?.name||'')!==keyId){
      keyId=main?.name||'';key.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
    }
    const other=selection.filter(light=>light!==main);
    fills.forEach((light,index)=>apply(light,other[index]));
  }

  function setRoom(name,position){
    if(name===currentRoom||name===pendingRoom?.name)return;
    pendingRoom={name,position:{...position},since:performance.now()};
  }

  function captureRoom(now){
    if(!pendingRoom||now-pendingRoom.since<300||now-lastProbe<1200)return;
    const room=pendingRoom;pendingRoom=null;currentRoom=room.name;
    if(probes.has(room.name)){scene.environment=probes.get(room.name).texture;return;}
    // Only static exported house meshes occupy layer 1. Markers, pets and UI
    // labels therefore do not become frozen reflections in mirrors/appliances.
    const previous=scene.environment,previousIntensity=scene.environmentIntensity;
    scene.environment=base.texture;scene.environmentIntensity=.65;
    cube.position.set(room.position.x,room.position.y+1.35,room.position.z);
    try{
      cube.update(renderer,scene);
      const probe=pmrem.fromCubemap(cubeTarget.texture);
      probes.set(room.name,probe);scene.environment=probe.texture;
      // A bounded cache; the geometry stays resident just once on the GPU.
      if(probes.size>3){const oldest=probes.keys().next().value;probes.get(oldest).dispose();probes.delete(oldest);}
    }catch(error){scene.environment=previous;throw error;}
    finally{scene.environmentIntensity=previousIntensity;lastProbe=now;}
  }

  return {load,setRoom,tick(position,now){if(loaded){select(position,now);captureRoom(now);}},
    diagnostics(){return {practicalLights:selection.map(light=>light.name),shadowedLight:keyId,
      reflectionRoom:currentRoom,reflectionProbes:probes.size,shadowMapSize:sun.shadow.mapSize.x};},
    dispose(){for(const probe of probes.values())probe.dispose();base.dispose();cubeTarget.dispose();pmrem.dispose();},
  };
}
