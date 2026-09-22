// Smooth anatomical contours and deterministic, reusable coat materials.
// Everything is generated locally; no network assets or image models.
export function contour(THREE, sections, rings=36, sides=28) {
  // Sections are [z, half-width, top, bottom, centreY]. Catmull-Rom gives a
  // continuous silhouette from rump through flank, ribs and shoulder.
  const curves = [1,2,3,4].map(k=>new THREE.CatmullRomCurve3(sections.map(p=>new THREE.Vector3(p[0],p[k],0))));
  const positions=[],uv=[],indices=[];
  for(let i=0;i<=rings;i++) {
    const t=i/rings, samples=curves.map(c=>c.getPoint(t)), z=samples[0].x;
    for(let j=0;j<=sides;j++) {
      const a=j/sides*Math.PI*2, s=Math.sin(a), c=Math.cos(a);
      positions.push(Math.max(.0001,samples[0].y)*s,samples[3].y+c*Math.max(.0001,c>0?samples[1].y:samples[2].y),z);
      uv.push(t,j/sides);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++) {
    const a=i*(sides+1)+j,b=a+sides+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  // Weld normals across the UV seam without losing the UVs.
  const n=geo.attributes.normal;
  for(let i=0;i<=rings;i++){const a=i*(sides+1),b=a+sides;const v=new THREE.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z)}
  return geo;
}

export function coat(THREE,S,id) {
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  let seed=Array.from(id).reduce((s,c)=>s*31+c.charCodeAt(0),7)>>>0;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const kind=S.pattern?.[0], dark=S.pattern?.[1]||'#27211b';
  g.fillStyle=S.colour;g.fillRect(0,0,512,512);
  for(let i=0;i<110;i++){
    const x=rnd()*512,y=rnd()*512,r=12+rnd()*42,shade=g.createRadialGradient(x,y,0,x,y,r);
    shade.addColorStop(0,rnd()<.5?'rgba(255,247,222,.055)':'rgba(38,30,22,.06)');shade.addColorStop(1,'transparent');g.fillStyle=shade;g.fillRect(x-r,y-r,r*2,r*2);
  }
  if(kind==='stripes') {
    g.fillStyle=dark;
    for(let i=-1;i<23;i++) {
      const x=i*24,w=7+rnd()*8,phase=rnd()*6;
      g.beginPath();g.moveTo(x,0);
      for(let y=0;y<=512;y+=8)g.lineTo(x+Math.sin(y*.019+phase)*12+Math.sin(y*.043)*3,y);
      for(let y=512;y>=0;y-=8)g.lineTo(x+w+Math.sin(y*.019+phase)*12+Math.sin(y*.043)*3+Math.sin(y*.015)*2,y);
      g.closePath();g.fill();
    }
  } else if(kind==='patches') {
    g.fillStyle=dark;
    for(let y=-1;y<9;y++)for(let x=-1;x<11;x++) {
      const cx=x*55+(y%2)*27,cy=y*68;g.beginPath();
      for(let k=0;k<6;k++){const a=k*Math.PI/3,r=22+rnd()*6;const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r*1.25;k?g.lineTo(px,py):g.moveTo(px,py)}g.closePath();g.fill();
    }
  } else if(kind==='rosettes'||kind==='spots') {
    for(let y=-1;y<10;y++)for(let x=-1;x<15;x++) {
      const cx=x*38+(y%2)*19+rnd()*12,cy=y*57+rnd()*14,r=6+rnd()*8;
      if(kind==='rosettes') {
        g.fillStyle=id==='snowleopard'?'#b8b4ad':'#ba843b';g.beginPath();g.ellipse(cx,cy,r,r*.85,rnd(),0,Math.PI*2);g.fill();
        g.strokeStyle=dark;g.lineWidth=3+rnd()*2;
        for(let k=0;k<3;k++){g.beginPath();g.ellipse(cx,cy,r,r*.85,0,k*2.1,k*2.1+1+rnd()*.6);g.stroke()}
      }else {g.fillStyle=dark;g.beginPath();g.ellipse(cx,cy,r*.65,r*.9,rnd()*3,0,Math.PI*2);g.fill()}
    }
  }
  // Natural countershading is part of the coat, without intersecting belly spheres.
  if(S.belly) {
    const shade=g.createLinearGradient(0,150,0,360);shade.addColorStop(0,'transparent');shade.addColorStop(.25,S.belly);shade.addColorStop(.75,S.belly);shade.addColorStop(1,'transparent');
    g.globalAlpha=.78;g.fillStyle=shade;g.fillRect(0,0,512,512);g.globalAlpha=1;
  }
  // Fine, low-contrast hairs/wrinkles stay small enough to avoid a striped hide.
  for(let i=0;i<20000;i++) {
    const x=rnd()*512,y=rnd()*512;g.strokeStyle=rnd()<.5?'rgba(255,255,255,.07)':'rgba(24,18,12,.08)';g.lineWidth=.45+rnd()*.4;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+1+rnd()*3,y+(rnd()-.5)*1.5);g.stroke();
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;
  const b=document.createElement('canvas');b.width=b.height=256;const bg=b.getContext('2d');bg.fillStyle='#888';bg.fillRect(0,0,256,256);
  for(let i=0;i<9000;i++){bg.strokeStyle=rnd()<.5?'#939393':'#7d7d7d';bg.lineWidth=.5;const x=rnd()*256,y=rnd()*256;bg.beginPath();bg.moveTo(x,y);bg.lineTo(x+1+rnd()*3,y+.7);bg.stroke()}
  if(S.trunk)for(let i=0;i<100;i++){bg.strokeStyle='rgba(40,40,40,.16)';bg.beginPath();const x=rnd()*256,y=rnd()*256;bg.moveTo(x,y);bg.bezierCurveTo(x+4,y-3,x+10,y+3,x+17,y);bg.stroke()}
  const bump=new THREE.CanvasTexture(b);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({map:tex,bumpMap:bump,bumpScale:S.trunk?.06:.018,roughness:S.trunk?.93:.86,metalness:0});
}
