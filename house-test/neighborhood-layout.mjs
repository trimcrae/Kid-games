// A little imaginary street beyond the real front yard. Y is height here.
export const lots=['jeannie','cory','ellie','kieran','shannon','tristan','guest'].map((id,i)=>({
  id,name:id[0].toUpperCase()+id.slice(1),x:-10+i*6,z:26.5,
  room:`${id[0].toUpperCase()+id.slice(1)}'s Craepet house`
}));
export const neighborhoodRooms=[['Craepet street','Craepet street',8,-21,-.82,Math.PI],...lots.map(p=>['Craepet street',p.room,p.x,-25.6,-.82,Math.PI])];
const box=(name,x,y,z,w,h,d)=>({name,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});
export const neighborhoodBoxes=[box('Neighborhood ground',8,-.94,24,47,.24,17)];
for(const p of lots){
  neighborhoodBoxes.push(
    box(p.id+' left wall',p.x-2.3,.43,p.z,.16,2.5,5),
    box(p.id+' right wall',p.x+2.3,.43,p.z,.16,2.5,5),
    box(p.id+' back wall',p.x,.43,p.z+2.5,4.76,2.5,.16),
    box(p.id+' front left',p.x-1.48,.43,p.z-2.5,1.8,2.5,.16),
    box(p.id+' front right',p.x+1.48,.43,p.z-2.5,1.8,2.5,.16),
    box(p.id+' doorway top',p.x,1.46,p.z-2.5,1.16,.44,.16),
    box(p.id+' ceiling',p.x,1.8,p.z,4.76,.16,5.16)
  );
}
