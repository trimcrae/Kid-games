import * as THREE from './vendor/three.module.min.js';
// Conservative roof/surface height grid. Geometry supplies roofs missing from
// walking colliders (notably the garage). Edges may be a little dry; interiors
// never receive falling particles. Built once, O(1) lookup per particle/frame.
export function createShelterMask(boxes=[],cell=.75){
  const heights=new Map(),key=(x,z)=>`${Math.floor(x/cell)},${Math.floor(z/cell)}`;
  function add(min,max){
    if(![...min,...max].every(Number.isFinite))return;
    for(let x=Math.floor(min[0]/cell);x<=Math.floor(max[0]/cell);x++)for(let z=Math.floor(min[2]/cell);z<=Math.floor(max[2]/cell);z++){
      const k=`${x},${z}`;heights.set(k,Math.max(heights.get(k)??-1,max[1]));
    }
  }
  for(const b of boxes)add(b.min,b.max);
  return {add,height:(x,z)=>heights.get(key(x,z))??-1,
    addRoof(array){
      // Exported triangle soup: xyz, normal xyz, three vertices per face.
      for(let i=0;i<array.length;i+=18){
        const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        for(let v=0;v<3;v++)for(let a=0;a<3;a++){const n=array[i+v*6+a];min[a]=Math.min(min[a],n);max[a]=Math.max(max[a],n);}
        add(min,max);
      }
    }};
}
export function createPrecipitation(scene,{mobile=false,reducedMotion=false}={}){
  const limit=reducedMotion?0:mobile?160:360,positions=new Float32Array(limit*3),drops=new Float32Array(limit*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const uniforms={snow:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`uniform float snow;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((snow>.5?45.:65.)/max(2.,-p.z),2.,snow>.5?5.:9.);}`,
    fragmentShader:`uniform float snow;void main(){vec2 p=gl_PointCoord-.5;if(snow>.5){if(length(p)>.48)discard;gl_FragColor=vec4(.94,.97,1.,.8);}else{if(abs(p.x)>.10)discard;gl_FragColor=vec4(.68,.8,.92,.5);}}`});
  const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=999;mesh.userData.role='precipitation';scene.add(mesh);
  let mask=createShelterMask(),kind=null,wind=[0,0],count=0,initialized=false;
  function spawn(i,camera,initial=false){drops[i]=camera.x+(Math.random()-.5)*24;drops[i+1]=camera.y+(initial?Math.random()*15-6:9);drops[i+2]=camera.z+(Math.random()-.5)*24;}
  return {setShelter(value){mask=value;},set(state){
    kind=state.precipitation;const a=(state.windDirection||0)*Math.PI/180,speed=Math.min(state.windSpeed||0,20)*.12;
    wind=[-Math.sin(a)*speed,Math.cos(a)*speed];uniforms.snow.value=kind==='snow'?1:0;
    count=kind?limit:0;mesh.visible=count>0;geometry.setDrawRange(0,count);
  },tick(camera,dt){
    if(!count)return;
    const snow=kind==='snow';dt=Math.min(.08,Math.max(0,dt));
    for(let n=0;n<count;n++){
      const i=n*3;
      if(!initialized||drops[i+1]<camera.y-6||Math.abs(drops[i]-camera.x)>13||Math.abs(drops[i+2]-camera.z)>13)spawn(i,camera,!initialized);
      drops[i]+=wind[0]*dt;drops[i+2]+=wind[1]*dt;drops[i+1]-=(snow?1:13)*dt;
      positions[i]=drops[i];positions[i+1]=drops[i+1]>mask.height(drops[i],drops[i+2])+.12?drops[i+1]:-1000;positions[i+2]=drops[i+2];
    }
    initialized=true;geometry.attributes.position.needsUpdate=true;
  },diagnostics(){let visible=0,sheltered=0;for(let i=0;i<count*3;i+=3)if(positions[i+1]>-999){visible++;if(positions[i+1]<=mask.height(positions[i],positions[i+2]))sheltered++;}
    return {kind,particles:count,visible,sheltered,limit};},dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
