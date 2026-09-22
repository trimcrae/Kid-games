import { taperedCurve, mergeForms } from './forms.mjs';

function random(seed) { return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }

export function barkMaterial(THREE, colour='#65503d') {
  const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d'),rnd=random(41);
  g.fillStyle='#999';g.fillRect(0,0,256,512);
  for(let i=0;i<430;i++) {
    const x=rnd()*256,y=rnd()*512;g.strokeStyle=rnd()<.5?'rgba(30,25,20,.3)':'rgba(240,235,220,.28)';g.lineWidth=.5+rnd()*2;
    g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+4,y+12,x-3,y+28,x+(rnd()-.5)*8,y+35+rnd()*75);g.stroke();
  }
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({color:colour,map,bumpMap:bump,bumpScale:.07,roughness:.98});
}

export function foliageMaterial(THREE, needle=false) {
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),rnd=random(needle?17:33);
  g.strokeStyle='#77785c';g.lineWidth=needle?2:1.6;g.beginPath();g.moveTo(128,244);g.quadraticCurveTo(114,110,133,12);g.stroke();
  for(let i=0;i<(needle?42:18);i++)for(const side of [-1,1]) {
    const y=needle?22+i*5:22+i*12,span=(Math.sin(y/256*Math.PI)*.7+.3)*(needle?63:72);
    const x=128+side*(span*.5+10),cy=y-12;
    g.save();g.translate(x,cy);g.rotate(side*.65);
    const w=needle?3:11+rnd()*4,h=needle?30:24+rnd()*6;
    const grad=g.createLinearGradient(-w,0,w,0);grad.addColorStop(0,'#86925b');grad.addColorStop(.48,'#d1d7aa');grad.addColorStop(.55,'#a5b77a');grad.addColorStop(1,'#647c45');
    g.fillStyle=grad;g.beginPath();g.moveTo(0,-h);g.bezierCurveTo(w,-h*.4,w,h*.55,0,h);g.bezierCurveTo(-w,h*.5,-w,-h*.4,0,-h);g.fill();
    if(!needle){g.strokeStyle='rgba(225,234,177,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(0,-h*.8);g.lineTo(0,h*.8);g.stroke()}
    g.restore();
    g.strokeStyle='#9da66c';g.lineWidth=.8;g.beginPath();g.moveTo(128,y+8);g.lineTo(x,cy);g.stroke();
  }
  // Bleed leaf colour into transparent texels so mipmaps do not create
  // black fringes around distant foliage.
  const pixels=g.getImageData(0,0,256,256);
  for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3]===0){pixels.data[i]=145;pixels.data[i+1]=164;pixels.data[i+2]=105}
  g.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const mat=new THREE.MeshStandardMaterial({map,vertexColors:true,alphaTest:.42,alphaToCoverage:true,side:THREE.DoubleSide,roughness:.88});
  const time={value:0};mat.userData.wind=time;
  mat.onBeforeCompile=shader=>{
    shader.uniforms.treeWind=time;
    shader.vertexShader='uniform float treeWind;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float treePhase=0.;
      #ifdef USE_INSTANCING
        treePhase=instanceMatrix[3].x*.1+instanceMatrix[3].z*.08;
      #endif
      transformed.x+=sin(treeWind*1.2+position.y*.4+treePhase)*min(position.y*.012,.14);
      transformed.z+=sin(treeWind*.85+position.x*.5+treePhase)*min(position.y*.007,.08);`);
    // Thin leaves transmit some sky light on their underside.
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * .13;\n#include <opaque_fragment>');
  };
  return mat;
}

// Small textured branch sprays form a porous crown, with real gaps between
// leaves. All sprays merge into one instanced draw per tree species.
export function leafCloud(THREE, lobes, seed, colour='#668548', needle=false) {
  const rnd=random(seed),positions=[],normals=[],uv=[],colors=[],indices=[],base=new THREE.Color(colour);
  const q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),n=new THREE.Vector3(),tint=new THREE.Color();
  for(const l of lobes) {
    const [x,y,z,rx,ry,rz,count,size]=l;
    for(let i=0;i<count;i++) {
      const a=rnd()*Math.PI*2,v=rnd()*2-1,r=Math.cbrt(rnd()),s=Math.sqrt(1-v*v);
      const cx=x+Math.cos(a)*s*r*rx,cy=y+v*r*ry,cz=z+Math.sin(a)*s*r*rz;
      const w=size*(.7+rnd()*.6),h=w*(needle?1.5:1);
      e.set((rnd()-.5)*2.7,rnd()*Math.PI*2,rnd()*Math.PI);q.setFromEuler(e);
      // Soft crown normals avoid the cardboard lighting of isolated planes.
      n.set((cx-x)/Math.max(rx,1)*.25,.85+(cy-y)/Math.max(ry,1)*.1,(cz-z)/Math.max(rz,1)*.25).normalize();
      tint.copy(base).multiplyScalar(.76+rnd()*.42+Math.max(0,v)*.1);
      const k=positions.length/3;
      for(const [sx,sy,u,vv] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]) {
        p.set(sx*w*.5,sy*h*.5,0).applyQuaternion(q);positions.push(cx+p.x,cy+p.y,cz+p.z);normals.push(n.x,n.y,n.z);uv.push(u,vv);colors.push(tint.r,tint.g,tint.b);
      }
      indices.push(k,k+1,k+2,k,k+2,k+3);
    }
  }
  const geo=new THREE.BufferGeometry();for(const [name,array,size]of[['position',positions,3],['normal',normals,3],['uv',uv,2],['color',colors,3]])geo.setAttribute(name,new THREE.Float32BufferAttribute(array,size));geo.setIndex(indices);return geo;
}

export function broadleafTree(THREE, kind, leafMat, bark, distant=false) {
  const tall=kind==='kapok',H=tall?16:6,spread=tall?5.5:3.4,rnd=random(tall?91:12);
  const branches=[taperedCurve(THREE,[[0,0,0],[.12,H*.38,.08],[-.2,H*.7,0],[.2,H*.88,.1]],tall?.92:.36,tall?.24:.1,distant?5:14,distant?6:12)],lobes=[];
  for(let i=0;i<9;i++) {
    const a=i*2.399,r=spread*(i?.65+rnd()*.35:.15),x=Math.cos(a)*r,z=Math.sin(a)*r,y=H*(.88+rnd()*.13);
    branches.push(taperedCurve(THREE,[[0,H*.55,0],[x*.5,H*.8,z*.5],[x,y,z]],tall?.31:.13,.025,distant?3:10,distant?5:9));
    for(let j=0;j<(distant?0:3);j++) {
      const b=a+(j-1)*.9,tx=x+Math.cos(b)*(tall?1.5:.9),tz=z+Math.sin(b)*(tall?1.5:.9);
      branches.push(taperedCurve(THREE,[[x*.7,y-.5,z*.7],[x,y,z],[tx,y+.3,tz]],tall?.1:.045,.01,5,6));
    }
    lobes.push([x,y+.3,z,tall?2.5:1.7,tall?1.4:.6,tall?2.5:1.7,distant?28:(tall?95:100),(tall?2:1.05)*(distant?1.65:1)]);
  }
  for(let i=0;i<(tall?7:4);i++) {const a=i*2.4;branches.push(taperedCurve(THREE,[[0,tall?2.5:.7,0],[Math.cos(a)*.6,.25,Math.sin(a)*.6],[Math.cos(a)*(tall?2.2:.9),-.08,Math.sin(a)*(tall?2.2:.9)]],tall?.45:.13,.025,distant?3:6,distant?5:8))}
  return [{geo:mergeForms(THREE,branches),mat:bark},{geo:leafCloud(THREE,lobes,tall?83:19,tall?'#66884b':'#7c8d49'),mat:leafMat}];
}

export function pineTree(THREE, leafMat, bark, distant=false) {
  const wood=[taperedCurve(THREE,[[0,0,0],[.08,5,0],[0,10.5,.05]],.36,.025,distant?5:16,distant?6:10)],lobes=[];
  for(let level=0;level<10;level++)for(let j=0;j<6;j+=(distant?2:1)) {
    const a=j*Math.PI/3+level*.73,len=2.8*(1-level/11),y=2+level*.84,x=Math.cos(a)*len,z=Math.sin(a)*len;
    wood.push(taperedCurve(THREE,[[0,y,0],[x*.55,y-.25,z*.55],[x,y+.08,z]],.075*(1-level/12),.008,distant?3:6,distant?4:6));
    lobes.push([x*.68,y+.12,z*.68,len*.42,.26,len*.42,distant?7:13,(.65+len*.2)*(distant?1.7:1)]);
  }
  return [{geo:mergeForms(THREE,wood),mat:bark},{geo:leafCloud(THREE,lobes,38,'#5c8050',true),mat:leafMat}];
}
