// Small organic forms shared by the procedural wildlife and vegetation.
// These stay in the existing instancing pipeline; no downloaded models.
export function taperedCurve(THREE, points, base, tip, segments = 12, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const pos = geo.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, centre = curve.getPointAt(t), r = base + (tip - base) * t;
    for (let j = 0; j <= sides; j++) {
      const k = i * (sides + 1) + j;
      pos.setXYZ(k, centre.x + (pos.getX(k) - centre.x) * r,
        centre.y + (pos.getY(k) - centre.y) * r, centre.z + (pos.getZ(k) - centre.z) * r);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// A pointed, arched blade along +z. The centre ridge catches the light;
// useful for feathers, palm leaflets, fins and butterfly wings.
export function blade(THREE, length, width, arch = 0, sweep = 0, rows = 8) {
  const vertices = [], uv = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, w = width * Math.pow(Math.sin(Math.PI * t), 0.7) * 0.5;
    for (let j = 0; j < 3; j++) {
      const side = j - 1;
      vertices.push(side * w + sweep * t * t, Math.sin(t * Math.PI) * arch + (j === 1 ? w * 0.1 : 0), length * t);
      uv.push(j / 2, t);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j, b = a + 3;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}

export function mergeForms(THREE, geos) {
  const arrays = { position: [], normal: [], uv: [] };
  for (const original of geos) {
    const geo = original.index ? original.toNonIndexed() : original;
    for (const name of Object.keys(arrays)) arrays[name].push(...geo.attributes[name].array);
    if (geo !== original) geo.dispose();
    original.dispose();
  }
  const merged = new THREE.BufferGeometry();
  for (const [name, data] of Object.entries(arrays)) merged.setAttribute(name, new THREE.Float32BufferAttribute(data, name === 'uv' ? 2 : 3));
  return merged;
}
