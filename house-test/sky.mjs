import * as THREE from './vendor/three.module.min.js';

// A code-drawn gradient sky: one draw call, no textures. It follows whichever
// camera renders it (the player camera or a room reflection probe), so it is
// always "at infinity" without a huge sphere, and it sits on layer 1 so room
// reflections show sky instead of a grey void. Colours come from lighting.mjs.
export function createSky(scene,{radius=48}={}){
  const uniforms={
    skyTop:{value:new THREE.Color('#6fa8dc')},
    skyHorizon:{value:new THREE.Color('#d6e8ef')},
    skyGround:{value:new THREE.Color('#8d9a78')},
    sunDirection:{value:new THREE.Vector3(0,1,0)},
    sunColor:{value:new THREE.Color('#fff1d8')},
    sunGlow:{value:.6},
  };
  const material=new THREE.ShaderMaterial({
    uniforms,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,
    vertexShader:/* glsl */`
      varying vec3 vDirection;
      void main(){
        vDirection=position;
        vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        gl_Position=p.xyww; // on the far plane: never hides the house
      }`,
    fragmentShader:/* glsl */`
      uniform vec3 skyTop,skyHorizon,skyGround,sunDirection,sunColor;uniform float sunGlow;
      varying vec3 vDirection;
      void main(){
        vec3 d=normalize(vDirection);
        float up=max(d.y,0.0),down=max(-d.y,0.0);
        vec3 col=mix(skyHorizon,skyTop,pow(up,.55));
        col=mix(col,skyGround,smoothstep(0.0,.18,down));
        float s=max(dot(d,sunDirection),0.0);
        col+=sunColor*(pow(s,420.0)*2.2+pow(s,12.0)*.22*sunGlow)*step(0.0,d.y+.02);
        gl_FragColor=vec4(col,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,32,16),material);
  // Drawn after the opaque house so depth testing skips every covered pixel.
  // Unnamed on purpose: house-life recolours named house meshes.
  mesh.userData.role='sky';mesh.frustumCulled=false;mesh.renderOrder=1000;
  mesh.layers.enable(1);
  mesh.onBeforeRender=(renderer,s,camera)=>{mesh.position.setFromMatrixPosition(camera.matrixWorld);mesh.updateMatrixWorld();};
  scene.add(mesh);
  return {mesh,uniforms,
    set({top,horizon,ground,sun,sunColor,glow}){
      if(top)uniforms.skyTop.value.set(top);
      if(horizon)uniforms.skyHorizon.value.set(horizon);
      if(ground)uniforms.skyGround.value.set(ground);
      if(sun)uniforms.sunDirection.value.copy(sun).normalize();
      if(sunColor)uniforms.sunColor.value.set(sunColor);
      if(glow!==undefined)uniforms.sunGlow.value=glow;
    },
    dispose(){scene.remove(mesh);mesh.geometry.dispose();material.dispose();}};
}
