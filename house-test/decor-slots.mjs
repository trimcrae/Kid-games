// Where the furniture and decorations you buy in "Furnish & decorate" live in
// the real house: a pet corner in the foyer, a spot by the tub chair, one by
// the sofa, the sill of the front window, and the foyer wall for pictures —
// instead of a labelled grid of miniatures. Every slot keeps clear of the
// walking lanes and of each activity station and arrival spot
// (tests/house-decor-slots.mjs). Plan coordinates (Blender x, y), floor 0;
// `turn` faces the piece into the room.
export const DECOR_SLOTS={
  // Soft things for your pet, in the foyer's quiet corner by the east wall.
  pet:[{at:[7.25,.8],turn:-Math.PI/2},{at:[7.25,1.45],turn:-Math.PI/2}],
  rug:[{at:[7.15,1.3],turn:-Math.PI/2}],
  // A plant by the front window, another at the sofa's end.
  plant:[{at:[3.8,1.1],turn:Math.PI},{at:[1.3,3.4],turn:Math.PI/2}],
  // A lamp beside the tub chair.
  lamp:[{at:[3.6,3.35],turn:-Math.PI/2}],
  // Shelves and little tables against the front wall under the window.
  shelf:[{at:[2.6,1.15],turn:Math.PI},{at:[2.05,1.2],turn:Math.PI}],
  // Pictures, posters and clocks hang on the foyer's east wall above the corner.
  wall:[{at:[7.42,.55],turn:-Math.PI/2,hang:1.25},{at:[7.42,1.2],turn:-Math.PI/2,hang:1.25},{at:[7.42,1.85],turn:-Math.PI/2,hang:1.25}],
  // Toys and anything else near the seating.
  other:[{at:[3.55,2.75],turn:-Math.PI/2},{at:[1.75,1.25],turn:Math.PI}],
};
export function decorKind(item){
  const id=((item.id||'')+' '+(item.name||'')).toLowerCase();
  if(item.hang||/poster|picture|clock|map|painting/.test(id))return 'wall';
  if(/rug|mat|carpet/.test(id))return 'rug';
  if(/plant|flower|tree|fern|bonsai/.test(id))return 'plant';
  if(/lamp|light|lantern|candle/.test(id))return 'lamp';
  if(/shelf|book|desk|table/.test(id))return 'shelf';
  if(/bed|sofa|couch|cushion|pillow/.test(id))return 'pet';
  return 'other';
}
// Give each placed item the next free slot of its kind (overflowing into
// "other"); items beyond the slots stay in the 2D home, not in a heap here.
export function placeDecor(items){
  const used={};const out=[];
  for(const item of items){
    let kind=decorKind(item);
    for(const k of [kind,'other']){
      const list=DECOR_SLOTS[k],i=used[k]||0;
      if(i<list.length){used[k]=i+1;out.push({item,kind:k,slot:list[i]});break;}
    }
  }
  return out;
}
