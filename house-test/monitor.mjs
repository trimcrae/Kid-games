import * as THREE from './vendor/three.module.min.js';

// The living-room computer is playing Craepets: its screen shows the very
// view you are looking at, one frame behind — so the screen is on the screen,
// and that screen's screen, and so on into the glow. The picture is the
// finished frame the post pass already copies into a texture (post-aa.mjs),
// so it costs one small quad and no second render of the house. Letterboxed
// to the monitor's own shape, dimmed a shade so the recursion doesn't build
// up ever brighter through the highlight grade. Without the post pass
// (?aa=off) the screen simply sleeps.
const VERTEX=/* glsl */`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const FRAGMENT=/* glsl */`
  uniform sampler2D frame;uniform float canvasAspect;uniform float screenAspect;uniform float on;
  varying vec2 vUv;
  void main(){
    vec2 p=vUv-0.5;
    // Fit the whole frame inside the screen (bars on the short sides).
    if(canvasAspect>screenAspect)p.y*=canvasAspect/screenAspect;else p.x*=screenAspect/canvasAspect;
    vec2 q=p+0.5;
    vec3 c=vec3(0.015,0.017,0.022);
    if(on>0.5&&all(greaterThanEqual(q,vec2(0.0)))&&all(lessThanEqual(q,vec2(1.0)))){
      // A shade darker than the real screen, with the faint blue of a panel.
      c=texture2D(frame,q).rgb*vec3(0.80,0.82,0.86)+vec3(0.01,0.012,0.02);
      // Soft corners and a hint of glass falloff toward the edges.
      float v=smoothstep(0.0,0.06,q.x)*smoothstep(0.0,0.06,1.0-q.x)*smoothstep(0.0,0.09,q.y)*smoothstep(0.0,0.09,1.0-q.y);
      c*=0.7+0.3*v;
    }
    gl_FragColor=vec4(c,1.0);
  }`;
// facing: the unit direction the screen faces (+x here); w, h its size.
export function createMonitor(scene,renderer,{x,y,z,w,h,facing=[1,0,0]}={}){
  const material=new THREE.ShaderMaterial({
    uniforms:{frame:{value:null},canvasAspect:{value:1.5},screenAspect:{value:w/h},on:{value:0}},
    vertexShader:VERTEX,fragmentShader:FRAGMENT,toneMapped:false,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
  mesh.name='Living computer screen picture';
  mesh.position.set(x,y,z);
  mesh.lookAt(x+facing[0],y+facing[1],z+facing[2]);
  scene.add(mesh);
  const size=new THREE.Vector2();
  let on=true;
  return {
    mesh,
    // A television is switched on and off (the computer is always on).
    setOn(v){on=!!v;},get on(){return on;},
    // Once a frame, before the next render: pick up the post pass's frame
    // texture (it is made on the first render) and the canvas shape.
    tick(){
      const pass=renderer.housePostPass||renderer.render.postPass,tex=pass?.material?.uniforms?.frame?.value||null;
      if(tex!==material.uniforms.frame.value)material.uniforms.frame.value=tex;
      material.uniforms.on.value=tex&&on?1:0;
      renderer.getDrawingBufferSize(size);material.uniforms.canvasAspect.value=size.x/Math.max(1,size.y);
    },
  };
}
