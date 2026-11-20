// Catch a misplaced *visible* dressing mesh even when walking collisions still pass.
// Sample the uppermost horizontal rendered triangle in a narrow band around each floor.
import assert from 'node:assert/strict';

const probes = [
  ['foyer aisle', 5.63, 2.13, 0, /Oak floor board tone/],
  ['dining table floor', 5.47, 6.329, 0, /Oak floor board tone/],
  ['tile at the sink', 1.16, 6.14, 0, /Kitchen floor (warm ivory|soft grey scroll|muted grey petals)/],
  ['upper landing', 13.1, 3.98, 1.26, /Honey oak grain/],
  ['upper bed aisle', 13.02, 6.7, 1.26, /Clean warm beige carpet/],
  ['upper end room', 17.18, 3.15, 1.26, /light grey plush carpet/],
  ['family seating area', 12.52, 2.35, -1.05, /Clean warm beige carpet/],
  ['shared lower hall', 11.5, 5.63, -1.05, /Clean warm beige carpet/],
  ['lower vanity aisle', 11.30, 7.55, -1.05, /Lower bathroom dark brown planks|Lower bathroom plank seams/],
  ['lower bedroom aisle', 13.90, 6.30, -1.05, /Dark walnut/],
  ['lower side bedroom', 9.12, 5.98, -1.05, /Dark walnut/],
  ['small basement play mat', 4.48, 2.96, -3.15, /Dressing play mat blue cotton/],
];

export function checkRoomFinishes(data, mesh) {
  const samples = probes.map(([label,x,depth,h,finish]) =>
    ({label,x,z:-depth,h,finish,top:-Infinity,name:null}));
  for (const g of data.groups) {
    const points = new Float32Array(mesh.buffer,mesh.byteOffset + g.offset,g.count*6);
    for (let i=0;i<points.length;i+=18) {
      const ax=points[i], ay=points[i+1], az=points[i+2], bx=points[i+6], bz=points[i+8],
            cx=points[i+12], cz=points[i+14];
      if (Math.abs(ay-points[i+7])>.0002 || Math.abs(ay-points[i+13])>.0002) continue;
      const dx=bx-ax, dz=bz-az, ex=cx-ax, ez=cz-az, det=dx*ez-dz*ex;
      if (Math.abs(det)<1e-9) continue;
      for (const p of samples) {
        if (ay<=p.top || ay<p.h-.075 || ay>p.h+.16) continue;
        const vx=p.x-ax, vz=p.z-az, u=(vx*ez-vz*ex)/det, v=(dx*vz-dz*vx)/det;
        if (u>=-1e-6 && v>=-1e-6 && u+v<=1+1e-6) {p.top=ay;p.name=g.name;}
      }
    }
  }
  for (const p of samples) assert.match(p.name || '',p.finish,
    p.label+' should show its room finish, not '+(p.name || 'empty space'));
  const groups=data.groups.map(g=>g.name);
  for (const m of ['Playhouse blue shutter','Mailbox muted red flag','Family bathroom muted lavender plaster',
    'Sunroom slider light aluminium','Lower bathroom dark brown planks'])
    assert(groups.some(g=>g.endsWith(' / '+m)), 'Missing exported finish: '+m);
  const accent=data.groups.filter(g=>g.name.endsWith(' / Nursery muted slate plaster'));
  const windowWall=data.groups.find(g=>g.name.endsWith(' / Nursery dusty blue plaster'));
  assert.equal(accent.length,1,'Crib-wall finish must be localized');
  const wall=accent[0], verts=new Float32Array(mesh.buffer,mesh.byteOffset+wall.offset,wall.count*6);
  assert.ok(windowWall && wall.count>=6 && wall.color.every((v,i)=>v<windowWall.color[i]),
    'Keep a lighter window wall and a darker crib-side face');
  for(let i=0;i<verts.length;i+=6) assert.ok(Math.abs(verts[i]-11.05)<.006 && verts[i+3]>.99,
    'Nursery accent spilled outside the inward face behind the crib');
  console.log('PASS '+samples.length+' room-floor probes, 5 localized architectural finishes and one inward nursery accent face');
}
