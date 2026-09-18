import * as THREE from './vendor/three.module.min.js';

// A code-drawn sky: one draw call, no textures. It follows whichever camera
// renders it (the player camera or a room reflection probe), so it is always
// "at infinity" without a huge sphere, and it sits on layer 1 so room
// reflections show sky instead of a grey void. Over the colour gradient it
// draws real weather: drifting cumulus (value-noise fbm on a plane projected
// over the dome, lit on the sun side and shaded where they are thick, closing
// to an overcast blanket on grey days), a bright sun disc with its glow, and
// after dark a cratered moon with a halo and a twinkling star field. Colours,
// cloud cover and drift come from lighting.mjs with the time of day and the
// game's weather; the clock is the mesh's own onBeforeRender.
export function createSky(scene,{radius=48,reducedMotion=false}={}){
  const uniforms={
    skyTop:{value:new THREE.Color('#6fa8dc')},
    skyHorizon:{value:new THREE.Color('#d6e8ef')},
    skyGround:{value:new THREE.Color('#8d9a78')},
    sunDirection:{value:new THREE.Vector3(0,1,0)},
    sunColor:{value:new THREE.Color('#fff1d8')},
    sunGlow:{value:.6},
    cloudLit:{value:new THREE.Color('#ffffff')},
    cloudShade:{value:new THREE.Color('#a9b9c9')},
    cloudCover:{value:.3},
    cloudDrift:{value:1},
    stars:{value:0},
    moon:{value:0},
    time:{value:0},
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
      uniform vec3 skyTop,skyHorizon,skyGround,sunDirection,sunColor,cloudLit,cloudShade;
      uniform float sunGlow,cloudCover,cloudDrift,stars,moon,time;
      varying vec3 vDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
        for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
      void main(){
        vec3 d=normalize(vDirection);
        float up=max(d.y,0.0),down=max(-d.y,0.0);
        vec3 col=mix(skyHorizon,skyTop,pow(up,.55));
        col=mix(col,skyGround,smoothstep(0.0,.18,down));
        float s=max(dot(d,sunDirection),0.0),ang=acos(clamp(s,0.0,1.0));
        // Stars: one per cell of a grid laid over the dome, each with its own
        // brightness and twinkle; they fade out at the horizon.
        if(stars>0.001){
          vec3 p=d*70.0,i=floor(p);float h=hash3(i);
          vec3 c=i+.5+vec3(hash3(i+1.7),hash3(i+3.1),hash3(i+5.3))*.6-.3;
          float tw=.65+.35*sin(time*(1.2+h*2.5)+h*40.0);
          float st=step(.93,h)*smoothstep(.17,0.0,length(p-c))*tw*(.5+.7*hash3(i+9.0));
          col+=st*stars*smoothstep(0.0,.12,d.y)*vec3(1.0,.97,.9);
        }
        if(moon<.5){
          // The sun: a hot disc, its bloom and a wide warm glow.
          col+=sunColor*(pow(s,420.0)*2.2+pow(s,12.0)*.22*sunGlow)*step(0.0,d.y+.02);
          col+=vec3(1.0,.98,.92)*smoothstep(.022,.013,ang)*2.0*step(0.0,d.y);
        }else{
          // The moon: a pale disc with faint seas, and a soft halo.
          float disc=smoothstep(.036,.029,ang)*step(0.0,d.y);
          float seas=.78+.22*noise(d.xz*160.0+d.y*70.0);
          col=mix(col,vec3(.93,.95,1.0)*seas,disc);
          col+=vec3(.45,.5,.75)*pow(s,70.0)*.3;
        }
        // Clouds on a plane over the dome (flattening toward the horizon), drifting.
        if(d.y>-.02){
          vec2 pc=d.xz/(d.y+.15)*1.4+vec2(time*.0045,time*.0015)*cloudDrift;
          float n=fbm(pc),thr=1.0-cloudCover*.95;
          float dens=smoothstep(thr-.12,thr+.22,n)*smoothstep(-.02,.1,d.y);
          float thick=smoothstep(thr,thr+.45,n);
          vec3 cc=mix(cloudLit,cloudShade,thick*.85);
          cc+=cloudLit*pow(s,6.0)*.35*(1.0-thick);   // the sun catches the thin edges
          col=mix(col,cc,dens*.96);
        }
        gl_FragColor=vec4(col,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,32,16),material);
  // Drawn after the opaque house so depth testing skips every covered pixel.
  // Unnamed on purpose: house-life recolours named house meshes.
  mesh.userData.role='sky';mesh.frustumCulled=false;mesh.renderOrder=1000;
  mesh.layers.enable(1);
  mesh.onBeforeRender=(renderer,s,camera)=>{
    mesh.position.setFromMatrixPosition(camera.matrixWorld);mesh.updateMatrixWorld();
    if(!reducedMotion)uniforms.time.value=(performance.now()*.001)%100000;
  };
  scene.add(mesh);
  return {mesh,uniforms,
    set({top,horizon,ground,sun,sunColor,glow,cloudLit,cloudShade,cloudCover,cloudDrift,stars,moon}){
      if(top)uniforms.skyTop.value.set(top);
      if(horizon)uniforms.skyHorizon.value.set(horizon);
      if(ground)uniforms.skyGround.value.set(ground);
      if(sun)uniforms.sunDirection.value.copy(sun).normalize();
      if(sunColor)uniforms.sunColor.value.set(sunColor);
      if(glow!==undefined)uniforms.sunGlow.value=glow;
      if(cloudLit)uniforms.cloudLit.value.set(cloudLit);
      if(cloudShade)uniforms.cloudShade.value.set(cloudShade);
      if(cloudCover!==undefined)uniforms.cloudCover.value=cloudCover;
      if(cloudDrift!==undefined)uniforms.cloudDrift.value=cloudDrift;
      if(stars!==undefined)uniforms.stars.value=stars;
      if(moon!==undefined)uniforms.moon.value=moon;
    },
    dispose(){scene.remove(mesh);mesh.geometry.dispose();material.dispose();}};
}
