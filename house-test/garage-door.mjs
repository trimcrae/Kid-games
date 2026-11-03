import * as THREE from './vendor/three.module.min.js';
import {createDoorMotion,transformBounds} from './moving-doors.mjs?v=20261103-studio-life';
// The existing house export contains exactly five raised white panels in this
// dedicated material group. Split metadata only; keep the original mesh, AO,
// UV bytes and all other house groups unchanged.
export function prepareGarageDoor(data){
  if(data.groups.some(g=>g.prop?.startsWith('garage-door-')))return;
  const name='37 | Garage exposed roof and door tracks / Warm white enamel',group=data.groups.find(g=>g.name===name);
  const panels=data.colliders.filter(b=>/^Raised white garage door panel(?:\.\d+)?$/.test(b.name)).sort((a,b)=>b.min[2]-a.min[2]);
  if(!group||group.count!==180||panels.length!==5)throw Error('Garage door export no longer matches its five panels');
  const split=panels.map((b,i)=>{const key='garage-door-'+i;data.props[key]={min:[...b.min],max:[...b.max]};b.prop=key;return {...group,prop:key,dynamicDoor:true,name:group.name+' / panel '+(i+1),offset:group.offset+i*36*24,count:36};});
  data.groups.splice(data.groups.indexOf(group),1,...split);
}
export function garagePanelMatrix(source,i,fraction){
  const center=source.min.map((v,k)=>(v+source.max[k])/2),radius=.25,straight=2.26,curve=radius*Math.PI/2;
  const s=(i+.5)*.48+fraction*2.65;let y,z,a;
  if(s<=straight){y=-.16+s;z=1.77;a=-Math.PI/2;}
  else if(s<straight+curve){const theta=(s-straight)/radius;y=2.10+radius*Math.sin(theta);z=1.77-radius*(1-Math.cos(theta));a=-Math.PI/2-theta;}
  else{y=2.35;z=1.52-(s-straight-curve);a=-Math.PI;}
  return new THREE.Matrix4().makeTranslation(center[0],y,z).multiply(new THREE.Matrix4().makeRotationX(a)).multiply(new THREE.Matrix4().makeScale(1,1,.48/(source.max[2]-source.min[2]))).multiply(new THREE.Matrix4().makeTranslation(-center[0],-center[1],-center[2]));
}
// Cars temporarily remove their parked colliders while driving. Use their
// live footprint for the door interlock in either state.
export function carDoorObstacles(data,cars){return Object.entries(cars||{}).map(([id,c])=>{
  const b=data.props[id],w=(b.max[0]-b.min[0])/2,l=(b.max[2]-b.min[2])/2,co=Math.abs(Math.cos(c.heading)),si=Math.abs(Math.sin(c.heading)),x=co*w+si*l,z=si*w+co*l;
  return {min:[c.x-x,c.y-.05,c.z-z],max:[c.x+x,c.y+b.max[1]-b.min[1]+.1,c.z+z]};
});}
export function garageDoorInteraction(ctx){
  const {world,player,propMeshes,list,ticking,life,reducedMotion,data,debug}=ctx;
  const originals=world.boxes.filter(b=>b.prop?.startsWith('garage-door-')).sort((a,b)=>a.prop.localeCompare(b.prop));
  if(originals.length!==5)throw Error('Garage panels missing');
  const source=originals.map(b=>({name:b.name,min:[...b.min],max:[...b.max]}));
  const motion=createDoorMotion({world,originals,player,initial:1,onSettled:()=>life.refreshDirections(),
    obstacles:()=>carDoorObstacles(data,debug.cars),
    sample:f=>source.map((b,i)=>transformBounds(b,garagePanelMatrix(b,i,f))),
    apply:f=>source.forEach((b,i)=>{for(const m of propMeshes['garage-door-'+i]||[]){m.matrixAutoUpdate=false;m.matrix.copy(garagePanelMatrix(b,i,f));m.matrixWorldNeedsUpdate=true;}})});
  let warned=false;ticking.push(dt=>{motion.update(dt,reducedMotion);if(motion.blocked&&!warned){life.say('The doorway is occupied. Step clear to let the door move.',4000);warned=true;}if(!motion.blocked)warned=false;});
  // Operable from either side and from the side jamb while a car passes.
  list.push({id:'garage-door',kind:'toggle',icon:'🚪',name:'Garage door',at:{x:-3.49,y:-.16,z:1.77},radius:1.5,
    distance:p=>Math.hypot(Math.max(0,Math.abs(p.x+3.49)-2.9),p.z-1.77),label:()=>motion.target>.5?'Close the garage door':'Open the garage door',start(){motion.toggle();}});
  return motion;
}
