import * as THREE from './vendor/three.module.min.js';

// The game's art direction ("sunny-afternoon storybook-real"): the exported
// house keeps its real layout and materials, but the browser paints it with a
// slightly warmer, richer family-home palette and calmer finishes than the
// neutral architectural study it was modelled as. Colours are sRGB albedo
// targets; finishes override roughness/clearcoat so floors and trim stop
// throwing showroom highlights. Rules match the exported material name (the
// part after " / ") and optionally the collection it sits in; first match wins.
// `scale` multiplies the exported colour by target/reference instead of
// replacing it, so board-to-board tone variation survives.
const CEILING=/ceiling/i;
export const PALETTE_RULES=[
  // Ceilings: matte, a touch warmer than trim; lighting keeps them below walls.
  {name:/Warm white enamel|plaster/i,collection:CEILING,color:'#f3eee4',roughness:.92,clearcoat:0},
  // Walls.
  {name:/^Pale sage plaster$/,color:'#cbd5b3',roughness:.85,clearcoat:0},
  {name:/^Warm dining plaster$/,color:'#efdca8',roughness:.85,clearcoat:0},
  {name:/^Upstairs warm grey plaster$/,color:'#dccfb9',roughness:.85,clearcoat:0},
  {name:/^Nursery dusty blue plaster$/,color:'#95abc8',roughness:.85,clearcoat:0},
  {name:/^Ensuite cream plaster$/,color:'#efe4c8',roughness:.85,clearcoat:0},
  // Trim, doors and cabinets: warm white, satin rather than lacquered.
  {name:/^Warm white enamel$/,color:'#f2ece0',roughness:.48,clearcoat:0},
  {name:/^Kitchen cream pantry enamel$/,color:'#ece3cf',roughness:.5,clearcoat:0},
  // Floors: one readable plank scale, no mirror sheen.
  {name:/^Oak floor board tone/,scale:['#9c7853','#a88560'],roughness:.56,clearcoat:.06,clearcoatRoughness:.5},
  {name:/^Basement tan laminate planks$/,roughness:.58,clearcoat:.05,clearcoatRoughness:.5},
  {name:/^Clean warm beige carpet$/,color:'#cdb998'},
  {name:/^Cory light grey plush carpet$/,color:'#bdb3a6'},
  // Kitchen and bathroom tile: the motif sits within ~15 L* of its field.
  {name:/^Muted grey tile pattern$/,color:'#c7bba6',roughness:.55},
  {name:/^Ivory ceramic$/,collection:/Kitchen floor/,color:'#efe8da',roughness:.4,clearcoat:.25},
  {name:/^Ivory ceramic$/,color:'#f4f0e6',roughness:.2,clearcoat:.6},
  {name:/^Warm grey grout$/,color:'#bcb2a2'},
  {name:/^Pale speckled stone countertop$/,color:'#ece6da',roughness:.32,clearcoat:.25},
  {name:/^Bathroom sea green glazed tile$/,color:'#73b39b',roughness:.22,clearcoat:.6},
  // Woods: warmer, satin.
  {name:/^Dark walnut$/,color:'#6e4a30',roughness:.48,clearcoat:.15},
  {name:/^Honey oak grain$/,color:'#b0834f',roughness:.5,clearcoat:.12},
  {name:/^Climbing frame varnished pine$/,roughness:.48,clearcoat:.15},
  // Soft furnishings: warm linen instead of grey.
  {name:/^Light grey woven curtains$/,color:'#dcd2c0'},
  {name:/^Clean ivory cotton bedding$/,color:'#f0e7d6'},
  {name:/^Primary grey cotton headboard$/,color:'#9f968a'},
  {name:/^Living sofa taupe upholstery$/,color:'#9b8e7c'},
  {name:/^Oatmeal sofa upholstery$/,color:'#c9bda6'},
  // Garden: lighter, yellower lawn and layered greens.
  {name:/^Yard soft green lawn$/,color:'#86ad55'},
  {name:/^Deciduous tree leaves$/,color:'#6e9f48'},
  {name:/^Garden foliage 3$/,color:'#679a48'},
  {name:/^Spruce needles$/,color:'#3f6b45'},
  {name:/^Garden dark mulch$/,color:'#6b563d'},
  {name:/^Path warm grey pavers$/,color:'#a79d8e'},
];

const scratch=new THREE.Color();
export function styleGroup(group,finish){
  const [collection='',...rest]=(group.name||'').split(' / ');
  const name=rest.at(-1)||collection;
  const rule=PALETTE_RULES.find(r=>r.name.test(name)&&(!r.collection||r.collection.test(collection)));
  const color=new THREE.Color(...group.color);
  if(!rule)return {color,finish,rule:null};
  if(rule.color)color.set(rule.color);
  else if(rule.scale){
    const [from,to]=rule.scale.map(hex=>new THREE.Color(hex));
    color.multiply(scratch.setRGB(to.r/from.r,to.g/from.g,to.b/from.b));
  }
  const styled={...finish};
  for(const key of ['roughness','clearcoat','clearcoatRoughness','sheen'])if(rule[key]!==undefined)styled[key]=rule[key];
  return {color,finish:styled,rule};
}
