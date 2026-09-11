import * as THREE from './vendor/three.module.min.js';

// One cheap full-screen pass after the player camera's frame: FXAA (edge
// anti-aliasing from 9 texture reads, early-out on flat pixels) and a gentle
// highlight shoulder so lamp-lit walls and sunny patches reach a brighter
// white than AgX alone gives. It works on the finished, tone-mapped canvas:
// the frame is copied to a texture (one blit) and drawn back through the pass,
// so every scene shader keeps rendering straight to the screen.
// mode: 'fxaa' (default) | 'grade' (grade only, e.g. with MSAA) | 'off'.
const VERTEX=/* glsl */`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const FRAGMENT=/* glsl */`
  uniform sampler2D frame;uniform vec2 texel;uniform float shoulder;uniform bool edges;
  varying vec2 vUv;
  float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
  vec3 grade(vec3 c){
    // Lift only the upper range: whites open up, darks stay where they are.
    return clamp(c+(1.0-c)*c*c*shoulder,0.0,1.0);
  }
  void main(){
    vec3 m=texture2D(frame,vUv).rgb;
    if(!edges){gl_FragColor=vec4(grade(m),1.0);return;}
    vec3 nw=texture2D(frame,vUv+vec2(-1.,-1.)*texel).rgb,ne=texture2D(frame,vUv+vec2(1.,-1.)*texel).rgb;
    vec3 sw=texture2D(frame,vUv+vec2(-1.,1.)*texel).rgb,se=texture2D(frame,vUv+vec2(1.,1.)*texel).rgb;
    float lM=luma(m),lNW=luma(nw),lNE=luma(ne),lSW=luma(sw),lSE=luma(se);
    float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))),lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
    if(lMax-lMin<max(.0312,lMax*.125)){gl_FragColor=vec4(grade(m),1.0);return;}
    vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
    float reduce=max((lNW+lNE+lSW+lSE)*(.25/8.),1./128.);
    float rcp=1./(min(abs(dir.x),abs(dir.y))+reduce);
    dir=clamp(dir*rcp,vec2(-8.),vec2(8.))*texel;
    vec3 a=.5*(texture2D(frame,vUv+dir*(1./3.-.5)).rgb+texture2D(frame,vUv+dir*(2./3.-.5)).rgb);
    vec3 b=a*.5+.25*(texture2D(frame,vUv-dir*.5).rgb+texture2D(frame,vUv+dir*.5).rgb);
    float lB=luma(b);
    gl_FragColor=vec4(grade((lB<lMin||lB>lMax)?a:b),1.0);
  }`;

export function installPostPass(renderer,camera,{mode='fxaa',shoulder=.55}={}){
  if(mode==='off')return null;
  const size=new THREE.Vector2();
  let texture=null;
  const material=new THREE.ShaderMaterial({
    uniforms:{frame:{value:null},texel:{value:new THREE.Vector2()},shoulder:{value:shoulder},edges:{value:mode==='fxaa'}},
    vertexShader:VERTEX,fragmentShader:FRAGMENT,depthTest:false,depthWrite:false,toneMapped:false,
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;
  const post=new THREE.Scene();post.add(quad);
  const view=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const raw=renderer.render.bind(renderer);
  const pass={mode,material,enabled:true,
    set shoulder(v){material.uniforms.shoulder.value=v;},get shoulder(){return material.uniforms.shoulder.value;},
    set edges(v){material.uniforms.edges.value=v;},get edges(){return material.uniforms.edges.value;}};
  renderer.render=(scene,cam)=>{
    raw(scene,cam);
    if(cam!==camera||!pass.enabled||renderer.getRenderTarget()!==null)return;
    renderer.getDrawingBufferSize(size);
    if(!texture||texture.image.width!==size.x||texture.image.height!==size.y){
      texture?.dispose();
      texture=new THREE.FramebufferTexture(size.x,size.y);
      texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      material.uniforms.frame.value=texture;material.uniforms.texel.value.set(1/size.x,1/size.y);
    }
    renderer.copyFramebufferToTexture(texture);
    // Keep the scene's draw statistics (the pass adds one call).
    const autoClear=renderer.autoClear,autoReset=renderer.info.autoReset;
    renderer.autoClear=false;renderer.info.autoReset=false;
    raw(post,view);
    renderer.autoClear=autoClear;renderer.info.autoReset=autoReset;
  };
  renderer.render.postPass=pass;
  return pass;
}
