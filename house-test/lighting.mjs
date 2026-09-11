import * as THREE from './vendor/three.module.min.js';
import {createSky} from './sky.mjs';
import {FOLIAGE,EXTERIOR} from './materials.mjs';

// Slab intersections prevent a lamp on another floor or behind a partition
// from taking a nearby-light slot. The fills approximate indirect light and
// lamp pools, not a GI bake.
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

// Time of day follows the same clock as the HUD (engine.timeOfDay(): dawn,
// day, dusk, night). Every phase uses the same lights, so switching never
// recompiles a shader; only colours, intensities and the sun move.
// sun: [azimuth offset from the exported sun (rad), elevation (rad)].
export function phaseForHour(h){return h<6||h>=20?'night':h<8?'dawn':h>=18?'dusk':'day';}
export const PHASES={
  dawn:{sun:[-1.1,.28],sunColor:'#ffcf9e',sunI:2.4,hemiSky:'#f1e4dc',hemiGround:'#7c6857',hemi:.5,
    practical:2,emissive:1.2,shadeGlow:.3,leafFill:.02,windows:.15,pet:.9,sky:['#86a3d6','#f6d2b2','#6f7a62'],glow:1,exposure:1.08},
  day:{sun:[0,.72],sunColor:'#ffe6c4',sunI:4,hemiSky:'#eef2fb',hemiGround:'#8a7560',hemi:.78,
    practical:2.1,emissive:.7,windows:0,pet:.55,sky:['#6fa8dc','#d6e8ef','#8d9a78'],glow:.6,exposure:1.1},
  dusk:{sun:[1.25,.2],sunColor:'#ffa866',sunI:2,hemiSky:'#c7b2c4',hemiGround:'#5c4636',hemi:.34,
    practical:1.15,key:.95,keyCone:.9,warmth:.2,exteriorDim:.6,indoorFloor:.45,indoorSky:'#9296bc',indoorGround:'#5a4632',emissive:1.7,shadeGlow:.8,leafFill:.05,windows:.35,pet:.9,sky:['#6c83c4','#f6c08a','#5a5a4a'],glow:1.4,exposure:1.04},
  night:{sun:[2.6,.9],sunColor:'#a9bbff',sunI:.3,hemiSky:'#4a5a88',hemiGround:'#2a241c',hemi:.34,
    practical:1.05,key:1.05,keyCone:.75,warmth:.4,exteriorDim:.3,indoorFloor:.4,indoorSky:'#5e70b4',indoorGround:'#3a3024',emissive:2.3,shadeGlow:1.3,leafFill:.09,windows:1,pet:1.1,sky:['#1c2547','#3a4a78','#161a22'],glow:0,exposure:1.1},
};
const OVERCAST=new Set(['cloudy','rainy','snowy','windy']);
const OUTDOOR=/yard|porch|garden|street|driveway|outside/i;
const TIGHT=/bath|shower|hall|closet|laundry|landing|ensuite|office|garage/i;
// The spot "key" stands in for a room's ceiling light and now casts a soft
// shadow, so furniture reads as sitting under a lamp. Its map is static: it is
// rendered once when the room's key light changes (a few ms), and the per-pixel
// lookup is the only standing cost.
const KEY_SHADOW=true;

function skyEnvironment(pmrem,size){
  // A code-authored sky seeds reflections before the first room probe. It is
  // sized so its PMREM matches the room probes: swapping them then never
  // changes a shader define (which recompiled every house program, ~5 s).
  const width=size*4,height=size*2,pixels=new Uint8Array(width*height*4);
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

export function createHouseLighting(scene,renderer,{mobile=false,camera=null,petLight:withPetLight=true}={}){
  renderer.shadowMap.enabled=true;
  // Measured: PCF and PCFSoft cost the same here; keep the softer sun edge.
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Architecture and furniture are static. Do not redraw hundreds of house
  // groups for shadows every walking frame; the sun map refreshes only when
  // the time of day moves the sun.
  renderer.shadowMap.autoUpdate=false;
  const baseExposure=renderer.toneMappingExposure;
  const hemisphere=new THREE.HemisphereLight(0xeef2fb,0x8a7560,.46);
  const sun=new THREE.DirectionalLight(0xffe6c4,2.7);
  scene.add(hemisphere,sun,sun.target);
  sun.position.set(-14,35,40);sun.target.position.set(6,0,-3);
  sun.castShadow=true;sun.shadow.mapSize.setScalar(mobile?1024:2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:36,bottom:-36,near:.5,far:110});
  // The map spans the house and garden: centimetre-scale bias prevents grazing
  // surfaces from shadowing themselves into stripes across concrete and lawn.
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=mobile?.08:.04;sun.shadow.bias=mobile?-.001:-.0005;
  sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  let sunAxis=new THREE.Vector3(.27,-.58,-.77).normalize();

  const key=new THREE.SpotLight(0xffdec0,0,8,1.35,.85,2);
  // Phones skip it: the extra shadow lookup measured +16-22 % per frame there.
  // It starts off: the house loads and compiles without it, and
  // enableKeyShadow() switches it on once its shader variants are ready.
  const wantKeyShadow=KEY_SHADOW&&!mobile;key.castShadow=false;key.shadow.mapSize.setScalar(mobile?512:1024);
  key.shadow.camera.near=.06;
  // Ceiling cones are very wide; a narrower shadow frustum keeps texels useful
  // over the room itself (outside it the key simply lights without shadow).
  key.shadow.focus=.62;
  key.shadow.normalBias=mobile?.05:.025;key.shadow.bias=mobile?-.0006:-.0003;
  key.shadow.autoUpdate=false;scene.add(key,key.target);
  // One practical lamp pool beside the ceiling key, plus a soft "character"
  // light that keeps the pet readable in the evening and at night (a warm glow
  // over its head). Each extra light is paid on every pixel, so keep it at two.
  const fills=Array.from({length:1},()=>{
    const light=new THREE.PointLight(0xffdec0,0,7,2);scene.add(light);return light;
  });
  const petLight=new THREE.PointLight(0xffe2c2,0,2.8,2);if(withPetLight)scene.add(petLight);
  for(const light of [hemisphere,sun,key,...fills,petLight])light.layers.enable(1);
  const slots=[key,...fills].map(light=>({light,source:null,target:0}));
  const sky=createSky(scene);

  // 64-px probes: only small glossy things reflect now, and a capture on
  // entering a room costs ~10 ms less than at 128 px.
  const pmrem=new THREE.PMREMGenerator(renderer),probeSize=64;
  const base=skyEnvironment(pmrem,probeSize);
  // Only glossy materials sample a reflection map (see materials.mjs).
  scene.environment=null;
  const cubeTarget=new THREE.WebGLCubeRenderTarget(probeSize,{
    type:THREE.HalfFloatType,generateMipmaps:false});
  const cube=new THREE.CubeCamera(.08,65,cubeTarget);
  cube.layers.set(1);for(const face of cube.children)face.layers.set(1);
  const probes=new Map();
  let sources=[],occluders=[],loaded=false,lastSelection=-Infinity,lastProbe=-Infinity;
  let keyId='',pendingRoom=null,currentRoom='',selection=[],environment=base.texture;
  let glossy=[],emissive=[],windows=[],clock=null,lastClock=-Infinity,probeReady=true;
  // Start on the phase the HUD clock will report (same rule as engine.js), so
  // the clock arriving after load does not throw away the first probe.
  let phaseName=phaseForHour(new Date().getHours()),weather='sunny',room={outdoor:false,tight:false},mix={hemi:.46,practical:.62,key:1};
  const warm=new THREE.Color(),cool=new THREE.Color();

  function setEnvironment(texture){
    environment=texture;for(const m of glossy)m.envMap=texture;
  }
  function load(data){
    sources=(data.lights||[]).filter(light=>light.power>0&&light.position?.length===3);
    occluders=(data.colliders||[]).filter(box=>/wall|partition|ceiling|floor|slab|roof|foundation/i.test(box.name)
      &&!/trim|picture|shelf|shelving|mounted|tile|board|joist/i.test(box.name));
    if(data.sunlight){
      sunAxis=new THREE.Vector3(...data.sunlight.direction).normalize();
    }
    const seen=new Set();
    scene.traverse(o=>{
      const m=o.material;if(!o.isMesh||!m||seen.has(m))return;seen.add(m);
      if(m.userData.houseGlossy){m.envMap=environment;glossy.push(m);}
      if(m.userData.houseEmissive>0)emissive.push(m);
      if(m.userData.houseWindow){windows.push(m);m.emissive.set('#ffc978');m.userData.baseOpacity=m.opacity;}
    });
    loaded=true;applyPhase(true);
  }

  function sunDirection(phase){
    // Rotate the exported afternoon sun around the vertical axis and set its
    // height, so morning, afternoon and evening light enter different windows.
    const az=Math.atan2(sunAxis.x,sunAxis.z)+phase.sun[0],el=phase.sun[1];
    return new THREE.Vector3(Math.sin(az)*Math.cos(el),-Math.sin(el),Math.cos(az)*Math.cos(el));
  }
  function applyPhase(force=false){
    const phase=PHASES[phaseName]||PHASES.day,overcast=OVERCAST.has(weather)&&phaseName!=='night';
    const dir=sunDirection(phase);
    sun.color.set(phase.sunColor);sun.intensity=phase.sunI*(overcast?.45:1);
    sun.position.copy(sun.target.position).addScaledVector(dir,-54);
    hemisphere.color.set(phase.hemiSky);hemisphere.groundColor.set(phase.hemiGround);
    const [top,horizon,ground]=phase.sky;
    warm.set(top);cool.set(horizon);
    if(overcast){warm.lerp(new THREE.Color('#9aa6b4'),.6);cool.lerp(new THREE.Color('#d3d7da'),.5);}
    sky.set({top:'#'+warm.getHexString(),horizon:'#'+cool.getHexString(),ground,sun:dir.clone().negate(),sunColor:phase.sunColor,glow:overcast?0:phase.glow});
    if(scene.background?.isColor)scene.background.copy(cool);
    if(scene.fog)scene.fog.color.copy(cool);
    renderer.toneMappingExposure=baseExposure*phase.exposure;
    // Shades and diffusers are faintly emissive in the export; after dark they
    // must read as the light source, so they get a floor as well as a scale.
    FOLIAGE.fill.value=phase.leafFill??0;
    for(const slot of slots)tint(slot);
    if(key.castShadow)key.shadow.needsUpdate=true;
    for(const m of emissive)m.emissiveIntensity=Math.max(m.userData.houseEmissive*phase.emissive,phase.shadeGlow??0);
    applyRoom();
    sun.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
    if(!force){
      // Reflections hold the old light: capture the current room again.
      for(const probe of probes.values())probe.dispose();probes.clear();
      setEnvironment(base.texture);
      if(currentRoom)pendingRoom={name:currentRoom,position:{...lastPosition},since:-Infinity};
      currentRoom='';
    }
  }
  function applyRoom(){
    const phase=PHASES[phaseName]||PHASES.day,overcast=OVERCAST.has(weather)&&phaseName!=='night';
    // Outdoors the open sky is the fill; indoors a low hemisphere keeps
    // corners and ceilings darker than lit walls. Overcast days flatten out.
    // Indoors the fill stays low enough for the key and window light to model
    // forms; outdoors the open sky is the fill.
    let hemi=phase.hemi*(room.outdoor?1.9:room.tight?.92:1)*(overcast?1.2:1);
    // After dark a room is never lit by the moon alone: lamps bounce warm light
    // round it, so indoors the fill has a floor and warm-bounce colours and
    // doorways and jambs no longer crush to black (F1: median L* 2-5).
    const indoorNight=!room.outdoor&&phase.indoorFloor;
    if(indoorNight)hemi=Math.max(hemi,phase.indoorFloor);
    hemisphere.color.set(indoorNight?phase.indoorSky:phase.hemiSky);hemisphere.groundColor.set(indoorNight?phase.indoorGround:phase.hemiGround);
    mix.hemi=hemi;
    // Indoors after dark the garden, cladding and roofs seen through windows
    // keep moonlight levels instead of the room's fill, and leaves lose theirs.
    EXTERIOR.dim.value=!room.outdoor&&phase.exteriorDim?phase.exteriorDim:1;
    FOLIAGE.fill.value=room.outdoor?(phase.leafFill??0):0;
    mix.practical=phase.practical*(room.tight?1.3:1)*(room.outdoor?.6:1);
    // Seen from outside the panes glow (a lived-in house); from inside they
    // stay dark so the night sky shows through.
    for(const m of windows){
      // From inside at night a lamp-lit pane is a milky veil that made the
      // garden look like daytime (F1): no glow and a thinner pane indoors.
      m.emissiveIntensity=room.outdoor?phase.windows*2.2:0;
      // A 20 %-opaque pane can only add a fifth of its glow: from the garden
      // after dark the panes turn into warm lit squares instead.
      m.opacity=room.outdoor?(phase.windows>.5?.6:phase.windows>.2?.35:m.userData.baseOpacity):phase.windows>.2?m.userData.baseOpacity*.4:m.userData.baseOpacity;
    }
    petLight.userData.target=phase.pet*(room.outdoor&&phaseName==='day'?0:1);
    hemisphere.userData.target=hemi;
  }
  let lastPosition={x:0,y:0,z:0};

  // Lamps read warmer after dark (a candle-ish shift toward amber).
  const AMBER=new THREE.Color('#ffb46a');
  function tint(slot){
    if(!slot.source)return;slot.light.color.setRGB(...slot.source.color);
    const w=PHASES[phaseName]?.warmth??0;if(w)slot.light.color.lerp(AMBER,w);
  }
  function sourceIntensity(source){
    // The Blender scene stores radiant watts. This exposure-calibrated display
    // conversion is deliberately separate from the physical source metadata.
    return Math.min(20,source.power*(source.type==='area'?.12:.18));
  }
  function select(position,now){
    if(now-lastSelection<350)return;lastSelection=now;
    selection=choosePracticalLights(sources,position,occluders,fills.length+1);
    const main=selection.find(light=>light.type==='area'||light.type==='spot');
    const other=selection.filter(light=>light!==main);
    [main,...fills.map((_,i)=>other[i])].forEach((source,i)=>{
      const slot=slots[i],light=slot.light;
      if(source!==slot.source){
        slot.source=source;
        if(source){
          light.position.set(...source.position);tint(slot);
          light.distance=source.type==='area'?7:5.5;
          // A new lamp fades in instead of popping.
          light.intensity=0;
        }
      }
      slot.target=source?sourceIntensity(source):0;
    });
    if(main){
      key.target.position.copy(key.position).add(new THREE.Vector3(...main.direction));
      // After dark the ceiling cone narrows into a pool with darker corners.
      key.angle=Math.min(1.45,Math.max(.65,main.angle||1.35))*(PHASES[phaseName]?.keyCone??1);
    }
    if((main?.name||'')!==keyId){
      keyId=main?.name||'';
      if(key.castShadow){key.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}
    }
  }

  function setRoom(name,position){
    if(name===currentRoom){pendingRoom=null;return;}
    if(name===pendingRoom?.name)return;
    // Room names come from the nearest station, which can be an outdoor one
    // while the pet stands inside; a roof or ceiling overhead always wins.
    const eye=[position.x,position.y+1.2,position.z],covered=segmentBlocked(eye,[eye[0],eye[1]+7,eye[2]],occluders);
    room={outdoor:OUTDOOR.test(name)&&!covered,tight:TIGHT.test(name)};applyRoom();
    pendingRoom={name,position:{...position},since:performance.now()};
  }

  function captureRoom(now,force=false){
    // Until the probe shaders have compiled in the background, glossy things
    // keep the sky reflection; capturing earlier would compile them in-frame.
    if(!pendingRoom||!probeReady)return;
    if(!force&&(now-pendingRoom.since<300||now-lastProbe<1200))return;
    const target=pendingRoom;pendingRoom=null;currentRoom=target.name;
    if(probes.has(target.name)){setEnvironment(probes.get(target.name).texture);return;}
    // Only static exported house meshes and the sky occupy layer 1. Markers,
    // pets and UI labels therefore do not become frozen reflections.
    const previous=environment;
    setEnvironment(base.texture);
    cube.position.set(target.position.x,target.position.y+1.35,target.position.z);
    try{
      cube.update(renderer,scene);
      const probe=pmrem.fromCubemap(cubeTarget.texture);
      probes.set(target.name,probe);setEnvironment(probe.texture);
      // A bounded cache; the geometry stays resident just once on the GPU.
      if(probes.size>3){const oldest=probes.keys().next().value;probes.get(oldest).dispose();probes.delete(oldest);}
    }catch(error){setEnvironment(previous);throw error;}
    finally{lastProbe=now;}
  }

  function readClock(now){
    if(!clock||now-lastClock<2000)return;lastClock=now;
    let next;try{next=clock();}catch{return;}
    const p=typeof next==='string'?next:next?.time,w=typeof next==='object'?next?.weather:weather;
    const phaseChanged=p&&PHASES[p]&&p!==phaseName,weatherChanged=w&&w!==weather;
    if(phaseChanged||weatherChanged){
      if(phaseChanged)phaseName=p;if(w)weather=w;
      // Weather only dims the sun and greys the sky; reflections can stay.
      applyPhase(!phaseChanged);
    }
  }
  let lastTick=performance.now();
  function ease(now){
    const dt=Math.min(.25,Math.max(0,(now-lastTick)/1000));lastTick=now;
    const k=1-Math.exp(-dt*5);
    for(const [i,slot] of slots.entries()){
      // After dark the ceiling light dims and the lamp pools carry the room.
      const want=slot.target*mix.practical*(i===0?(PHASES[phaseName]?.key??1):.85);
      slot.light.intensity+=(want-slot.light.intensity)*k;
    }
    hemisphere.intensity+=((hemisphere.userData.target??hemisphere.intensity)-hemisphere.intensity)*k;
    petLight.intensity+=((petLight.userData.target??0)-petLight.intensity)*k;
  }
  function placePetLight(position){
    const p=new THREE.Vector3(position.x,position.y+1.3,position.z);
    if(camera)p.lerp(camera.position,.3).setY(Math.max(p.y,position.y+1.15));
    petLight.position.copy(p);
  }

  return {load,setRoom,
    tick(position,now,allowCapture=true){
      lastPosition={x:position.x,y:position.y,z:position.z};
      if(loaded){readClock(now);select(position,now);if(allowCapture)captureRoom(now);}
      placePetLight(position);ease(now);
    },
    // Start compiling the reflection-probe variant of every house shader (it
    // renders to a linear half-float target, so three builds separate
    // programs) in parallel with the screen variants; the first probe used to
    // compile them synchronously for ~1.5-2 s during loading.
    warm(){
      pmrem.compileCubemapShader?.();
      if(!renderer.compileAsync)return Promise.resolve();
      probeReady=false;
      renderer.setRenderTarget(cubeTarget,0);
      let pending;
      try{pending=renderer.compileAsync(scene,cube.children[0]);}
      finally{renderer.setRenderTarget(null);}
      return pending.catch(()=>{}).then(()=>{probeReady=true;});
    },
    // Compile the key-shadow variants (screen and probe) in the background with
    // a light-only stand-in scene, then switch the shadow on: no load cost and
    // no in-frame compile. The first key map render is a single frame.
    // busy(): true while the player is walking; the switch then waits for a
    // pause, the welcome card or the Rooms menu so play never stutters.
    enableKeyShadow(busy=()=>false){
      if(!wantKeyShadow||key.castShadow)return Promise.resolve(false);
      // three compiles with the lights of both scenes it is given, so the
      // stand-in holds light copies plus proxies of every lit mesh (sharing
      // geometry and material), never the live objects.
      const stand=new THREE.Scene();stand.fog=scene.fog;stand.environment=scene.environment;
      for(const light of [hemisphere,sun,key,...fills,withPetLight?petLight:null]){
        if(!light)continue;const copy=light.clone();if(light===key)copy.castShadow=true;stand.add(copy);
      }
      scene.traverseVisible(o=>{
        if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh)return;
        const m=o.material;if(!m||Array.isArray(m)||!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial))return;
        const proxy=new THREE.Mesh(o.geometry,m);proxy.receiveShadow=o.receiveShadow;proxy.castShadow=o.castShadow;proxy.layers.mask=o.layers.mask;stand.add(proxy);
      });
      const flip=()=>{key.castShadow=true;key.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;return true;};
      const done=()=>new Promise(resolve=>{const wait=()=>busy()?setTimeout(wait,500):resolve(flip());wait();});
      if(!renderer.compileAsync)return Promise.resolve(done());
      const screen=renderer.compileAsync(stand,camera||cube.children[0]);
      renderer.setRenderTarget(cubeTarget,0);
      let probe;try{probe=renderer.compileAsync(stand,cube.children[0]);}finally{renderer.setRenderTarget(null);}
      return Promise.all([screen,probe]).catch(()=>{}).then(done);
    },
    // Called once while the house is still loading: captures the first room
    // so play never starts on a stall.
    prime(position){
      if(!loaded)return;
      select(position,Infinity);captureRoom(performance.now(),true);
      for(const [i,slot] of slots.entries())slot.light.intensity=slot.target*mix.practical*(i===0?(PHASES[phaseName]?.key??1):.85);
      hemisphere.intensity=hemisphere.userData.target??hemisphere.intensity;
      petLight.intensity=petLight.userData.target??0;
    },
    // clock() returns engine.timeOfDay() or {time,weather}; polled every 2 s.
    setClock(fn){clock=fn;lastClock=-Infinity;readClock(performance.now());},
    setPhase(name,w){if(PHASES[name])phaseName=name;if(w)weather=w;if(loaded)applyPhase();},
    diagnostics(){return {practicalLights:selection.map(light=>light.name),shadowedLight:keyId,
      reflectionRoom:currentRoom,reflectionProbes:probes.size,shadowMapSize:sun.shadow.mapSize.x,
      timeOfDay:phaseName,weather,glossyMaterials:glossy.length,keyShadow:key.castShadow,
      lightLevels:{sun:+sun.intensity.toFixed(2),hemisphere:+hemisphere.intensity.toFixed(2),pet:+petLight.intensity.toFixed(2),
        practical:slots.map(s=>+s.light.intensity.toFixed(2))}};},
    dispose(){for(const probe of probes.values())probe.dispose();base.dispose();cubeTarget.dispose();pmrem.dispose();sky.dispose();},
  };
}
