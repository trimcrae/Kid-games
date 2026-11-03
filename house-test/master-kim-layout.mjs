// Photo-referenced interior, estimated metres. Three coordinates: Y up.
// The placement and plain outer shell belong to imaginary Craepet Street.
export const KIM={x:34,z:21,floor:-.82,width:16,depth:39.2};
export const kimRooms=[
  ["Master Kim's","Master Kim's entrance",42.55,-22.3,-.82,Math.PI],
  ["Master Kim's","Spectator lounge",44.5,-30.1,-.82,Math.PI],
  ["Master Kim's","Shoe & gear room",38.8,-25,-.82,Math.PI/2],
  ["Master Kim's","Taekwondo office",50.2,-28.8,-.82,Math.PI],
  ["Master Kim's","Master Kim's dojang",40.5,-39.5,-.82,Math.PI],
  ["Master Kim's","Left supply hallway",46.3,-55,-.82,Math.PI],
  ["Master Kim's","Left studio bathroom",46.3,-58.4,-.82,Math.PI],
  ["Master Kim's","Right supply hallway",34,-55,-.82,Math.PI],
  ["Master Kim's","Right studio bathroom",34,-58.4,-.82,Math.PI],
];
// Recover only old saves inside the former gear room or narrowed entry. Pet/family
// data and other saved locations are untouched; new outdoor saves stay put.
export const kimLayoutVersion=3;
export function restoreKimPosition(p){
  if(p&&!(p.kimLayout>=2)&&p.x>48&&p.x<52&&p.z>23&&p.z<27&&p.y>=KIM.floor-.15&&p.y<KIM.floor+2.7)
    return {...p,x:38.8,y:KIM.floor,z:25,yaw:Math.PI/2,kimLayout:kimLayoutVersion};
  if(p&&!(p.kimLayout>=3)&&p.z>21&&p.z<24&&p.x>41&&p.x<48&&p.y>=KIM.floor-.15&&p.y<KIM.floor+2.7&&(p.x<42||p.x>44.65))
    return {...p,x:42.55,y:KIM.floor,z:22.3,yaw:Math.PI,kimLayout:kimLayoutVersion};
  return p;
}
// Union of the actual room footprints, with the same 20 cm wall allowance.
// The former left-hand gear annex is now outside, including on the map.
const footprints=[[41,48,24,35],[41.8,44.9,21,24],[37,41,23,27],[48,52,27,32],[32,48,35,53],[45.35,47.25,53,56.8],[44.8,47.8,56.8,60.2],[33.05,34.95,53,56.8],[32.5,35.5,56.8,60.2]];
export const inKim=p=>footprints.some(([x0,x1,z0,z1])=>p.x>=x0-.2&&p.x<=x1+.2&&p.z>=z0-.2&&p.z<=z1+.2);
// Leave room for the new building and its connecting pavement in the jungle.
export const kimClearing=(x,z,r=0)=>x+r>30&&x-r<54&&z+r>18&&z-r<62;

export function makeKimModel(){
  const parts=[],boxes=[],signs=[],lights=[],doors=[];
  const add=(name,shape,size,p,color,finish='paint',rotation=[0,0,0],collide=false)=>{
    const position=[p[0]+KIM.x,p[1]+KIM.floor,p[2]+KIM.z];
    parts.push({name,shape,size,position,color,finish,rotation});
    if(collide)boxes.push({name:'Master Kim / '+name,min:position.map((v,i)=>v-size[i]/2),max:position.map((v,i)=>v+size[i]/2)});
  };
  const box=(name,p,size,color,finish='paint',collide=false,rotation)=>add(name,'box',size,p,color,finish,rotation,collide);
  const cyl=(name,p,r,h,color,rotation)=>add(name,'cylinder',[r,h,r],p,color,'metal',rotation);
  const sign=(kind,p,w,h,yaw=0)=>signs.push({kind,position:[p[0]+KIM.x,p[1]+KIM.floor,p[2]+KIM.z],size:[w,h],yaw});
  const wall=(name,x,z,w,d,h=2.7)=>box(name,[x,h/2,z],[w,h,d],'#c6cfd0','paint',true);
  const trim=(x,z,w,d,h=.12)=>box('dark skirting',[x,h/2,z],[w,h,d],'#67635a');
  const opening=(name,x,z,w,h,axis='z')=>{
    const a=axis==='z';
    box(name+' left jamb',[x-(a?w/2:0),h/2,z-(a?0:w/2)],[a?.075:.20,h,a?.20:.075],'#79868a');
    box(name+' right jamb',[x+(a?w/2:0),h/2,z+(a?0:w/2)],[a?.075:.20,h,a?.20:.075],'#79868a');
    box(name+' header',[x,h+.025,z],[a?w+.12:.20,.075,a?.20:w+.12],'#79868a');
  };
  // A level link to the existing sidewalk; no teleport or invisible portal.
  box('street connecting path',[-.6,-.12,-.75],[15,.24,2.5],'#d2c8b5','stone',true);
  box('lounge floor',[3.5,-.10,8.5],[7,.20,11],'#766f60','carpet',true);
  box('narrow vestibule floor',[4.65,-.10,1.5],[3.1,.20,3],'#414746','carpet',true);
  box('office floor',[-2,-.10,8.5],[4,.20,5],'#756f56','carpet',true);
  box('gear floor',[9,-.10,4],[4,.20,4],'#756f56','carpet',true);
  box('dojang floor',[8,-.10,23],[16,.20,18],'#acb7bb','stone',true);
  // Patchwork carpet follows the photos; tile directions alternate.
  const carpet=['#7a7161','#827d6f','#6e6a5f','#8c8371','#767466','#918777'];
  for(let x=0;x<7;x++)for(let z=3;z<14;z++)box('carpet tile',[x+.5,.006,z+.5],[.998,.012,.998],carpet[(x*7+z*3+x*z)%carpet.length],'carpet');
  for(const [xa,xb,za,zb] of [[-4,0,6,11],[7,11,2,6]])for(let x=xa;x<xb;x++)for(let z=za;z<zb;z++)box('side room carpet tile',[x+.5,.006,z+.5],[.998,.012,.998],['#b58b59','#878751','#777567','#99968a'][(x*3+z*7+40)%4],'carpet');
  box('entry mat',[5.45,.018,1.45],[1.1,.024,2.8],'#414746','carpet');
  // Authoring +X becomes visitor-right after the reflection below. The gear
  // doorway is just beyond the inner entry, on the right; office stays left.
  for(const [a,b] of [[3,3.1],[4.6,14]]){wall('gear side lounge partition',7,(a+b)/2,.18,b-a);trim(6.89,(a+b)/2,.035,b-a);}
  for(const [a,b] of [[3,7.5],[9,14]]){wall('office side lounge partition',0,(a+b)/2,.18,b-a);trim(.11,(a+b)/2,.035,b-a);}
  for(const [x,z] of [[7,3.85],[0,8.25]]){box('side doorway lintel',[x,2.48,z],[.18,.44,1.5],'#c6cfd0','paint',true);opening('side doorway',x,z,1.5,2.25,'x');}
  wall('gear outer wall',11,4,.18,4);wall('gear front wall',9,2,4,.18);wall('gear back wall',9,6,4,.18);
  wall('office outer wall',-4,8.5,.18,5);wall('office front wall',-2,6,4,.18);wall('office back wall',-2,11,4,.18);
  // The reference shows a narrow passage beside a small display/sign-in alcove.
  // Door clear width is 1.15 m; estimated vestibule width is 3.1 m total.
  wall('vestibule right wall',6.2,1.5,.18,3);wall('vestibule left wall',3.1,1.5,.18,3);
  wall('lounge front left return',1.55,3,3.1,.18);wall('lounge front right return',6.6,3,.8,.18);
  for(const z of [0,3]){
    box('entry glass wall',[3.9875,1.25,z],[1.775,2.5,.035],'#b6d5d9','glass',true);
    wall('entry end pier',6.1125,z,.175,.18);box('entry header',[4.65,2.6,z],[3.1,.20,.18],'#333d3e','paint',true);
    for(const x of [3.1,4.875,6.025])box('entry glazing mullion',[x,1.25,z],[.045,2.5,.08],'#29373b');
    box('entry glass rail',[3.9875,.83,z],[1.775,.045,.08],'#29373b');opening('glazed entry',5.45,z,1.15,2.5);
  }
  sign('welcome',[1.6,2.13,3.105],2.7,.47);
  sign('exterior',[4.65,2.56,-.11],2.95,.40,Math.PI);
  sign('exit',[5.45,2.48,3.09],.6,.24);
  // A long viewing window and its adjacent walk-through doorway.
  wall('observation sill',2.5,14,5,.18,.88);
  box('observation window',[2.5,1.55,14],[4.8,1.30,.025],'#c7e2e1','glass',true);
  box('observation upper wall',[3.5,2.47,14],[7,.46,.18],'#c6cfd0','paint',true);
  wall('observation left pier',.12,14,.24,.18);wall('observation middle pier',5.05,14,.20,.18);wall('dojang door right pier',6.91,14,.18,.18);
  opening('observation window frame',2.5,13.99,4.8,2.23);
  box('observation wood sill',[2.5,.88,13.96],[4.95,.07,.32],'#66503a','wood');
  opening('dojang doorway',5.98,14,1.66,2.25);
  sign('motto',[2.8,2.49,13.885],4.9,.36,Math.PI);
  // Bright, broad dojang with two operable far-side supply doors.
  wall('dojang left wall',0,23,.18,18,3.5);wall('dojang right wall',16,23,.18,18,3.5);
  for(const [a,b] of [[0,1.05],[2.35,13.35],[14.65,16]])wall('dojang back wall',(a+b)/2,32,b-a,.18,3.5);
  for(const x of [1.7,14])box('rear door lintel',[x,2.82,32],[1.3,1.36,.18],'#c6cfd0','paint',true);wall('dojang front return',11.5,14,9,.18,3.5);
  box('dojang lounge upper wall',[3.5,3.1,14],[7,.8,.18],'#c6cfd0','paint',true);
  for(const x of [.12,15.88])trim(x,23,.05,17.8,.15);trim(8,31.87,15.8,.05,.15);
  // Blue vinyl mats and gray circulation/cross lanes, laid as actual seams.
  for(const [za,zb] of [[15.3,25.6],[26.5,30.9]]){
    for(let x=1;x<14.7;x+=1.37)for(let z=za;z<zb-.01;z+=1.28){
      const d=Math.min(1.28,zb-z),i=Math.round(x*19+z*11);
      box('blue training mat',[x+.685,.033,z+d/2],[1.364,.046,d-.006],['#2d5486','#315b8d','#355d8c','#2e5586'][i%4],'mat');
    }
  }
  function tape(x,z,w,d,color){
    for(const dx of [-w/2,w/2])box('training square tape',[x+dx,.06,z],[.026,.008,d],color,'mat');
    for(const dz of [-d/2,d/2])box('training square tape',[x,.06,z+dz],[w,.008,.026],color,'mat');
    box('stance marker',[x,.066,z-.35],[.22,.005,.025],color,'mat');box('stance marker',[x,.066,z-.35],[.025,.005,.22],color,'mat');
  }
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)tape(3.1+col*4.2,17.4+row*3.1,3.2,2.3,row%2?'#e6d789':'#b96a69');
  for(let col=0;col<3;col++)tape(3.1+col*4.2,28.8,3.2,2.5,'#ddcf89');
  // Mirror wall and blue padded structural posts.
  box('mirror wall',[15.86,1.63,23.4],[.035,2.13,16.2],'#c2d3d7','mirror');
  for(const y of [.55,2.72])box('mirror aluminum rail',[15.81,y,23.4],[.05,.035,16.2],'#77868a','metal');
  for(let z=15.3;z<32;z+=2.7)box('mirror seam',[15.80,1.63,z],[.04,2.13,.012],'#909fa3','metal');
  for(const z of [16.3,22.8,29.3]){
    box('padded post',[15.15,1.02,z],[.53,2.04,.6],'#1c376e','mat',true);
    box('upper post',[15.15,2.77,z],[.25,1.46,.3],'#c6cfd0','paint',true);
    for(const dx of [-.25,.25])box('pad piping',[15.15+dx,1.02,z-.302],[.014,2.02,.014],'#52719d','mat');
  }
  sign('tenets',[15.80,3.02,23.3],14.4,.35,-Math.PI/2);
  sign('olympic',[.11,2.45,22.8],10.2,.43,Math.PI/2);
  sign('rings',[.12,3.02,22.8],2,.85,Math.PI/2);
  sign('logo',[8,2.15,31.88],1.45,1.45,Math.PI);
  sign('us',[4.6,2.15,31.88],1.2,1.75,Math.PI);
  sign('korea',[11.4,2.15,31.88],1.3,1.75,Math.PI);
  for(const x of [6.15,9.85])sign('tenetPoster',[x,2.15,31.88],.78,1.35,Math.PI);
  sign('promise',[8,1.15,31.88],3.1,.28,Math.PI);
  function hingedDoor(id,label,x,z,w=1.2){
    box(label+' leaf',[x,1.05,z],[w-.06,2.1,.055],'#adbabc','paint',true);
    parts.at(-1).door=id;boxes.at(-1).door=id;
    opening(label+' frame',x,z,w,2.14);
    // The final reflection puts this hinge on the visitor's left (world +X).
    doors.push({id,label,pivot:[x-w/2+KIM.x,KIM.floor,z+KIM.z],openAngle:Math.PI/2,width:w,at:[x+KIM.x,KIM.floor,z+KIM.z]});
    cyl(label+' handle',[x+w*.32,1.03,z-.055],.035,.09,'#b3b3a8',[Math.PI/2,0,0]);parts.at(-1).door=id;
  }
  for(const [i,x] of [1.7,14].entries()){
    const side=i?'Right':'Left';hingedDoor('kim-rear-'+i,side+' supply door',x,32);
    // User-described rear spaces; exact dimensions and unseen finishes estimated.
    box(side+' hallway floor',[x,-.10,33.9],[1.9,.20,3.8],'#858c89','stone',true);
    for(const dx of [-.95,.95])wall(side+' hallway wall',x+dx,33.9,.18,3.8);
    box(side+' bathroom floor',[x,-.10,37.5],[3,.20,3.4],'#c8cbc5','stone',true);
    for(const dx of [-1.5,1.5])wall(side+' bathroom side',x+dx,37.5,.18,3.4);
    wall(side+' bathroom back',x,39.2,3,.18);
    for(const dx of [-.99,.99])wall(side+' bathroom entry return',x+dx,35.8,1.02,.18);
    box(side+' bathroom lintel',[x,2.48,35.8],[.96,.44,.18],'#c6cfd0','paint',true);
    hingedDoor('kim-bath-'+i,side+' bathroom door',x,35.8,.96);
    sign('bathroom',[x,2.43,35.695],.85,.28,Math.PI);
    sign('supplies',[x+.83,1.9,34.0],1.2,.30,-Math.PI/2);
    for(const y of [.18,.75,1.32])box(side+' supply shelf',[x+.70,y,34],[.32,.06,1.9],'#7a6954','wood',true);
    for(let n=0;n<4;n++){
      box(side+' foam training block',[x+.70,.4,33.35+n*.40],[.27,.35,.31],n%2?'#aa4640':'#315381','mat');
      cyl(side+' rolled training mat',[x+.70,1.03,33.35+n*.40],.12,.45,'#375b87');
    }
    box(side+' sink pedestal',[x-.95,.38,37.3],[.38,.75,.38],'#e6e6dc','paint',true);
    box(side+' wash basin',[x-.95,.82,37.3],[.62,.14,.50],'#eeeee4','paint',true);
    box(side+' basin water',[x-.95,.898,37.3],[.40,.014,.30],'#879b9e','metal');
    cyl(side+' tap stem',[x-.95,.99,37.48],.025,.22,'#a4b4b4');
    box(side+' tap spout',[x-.95,1.08,37.40],[.045,.04,.19],'#a4b4b4','metal');
    box(side+' bathroom mirror',[x-1.39,1.62,37.3],[.035,.8,.65],'#9eafaf','metal');
    box(side+' toilet pedestal',[x+.85,.22,38.3],[.36,.43,.50],'#e5e4dc','paint',true);
    box(side+' toilet tank',[x+.85,.68,38.73],[.48,.68,.25],'#e5e4dc','paint',true);
    cyl(side+' toilet bowl',[x+.85,.44,38.25],.24,.16,'#f0efe8');
    cyl(side+' toilet opening',[x+.85,.525,38.25],.15,.012,'#6c8387');
    box(side+' towel rail',[x-1.37,1.05,38.4],[.05,.05,.56],'#9eafaf','metal');
    box(side+' clean towel',[x-1.33,.85,38.4],[.04,.40,.43],'#f0eddf','fabric');
  }
  // Benches, folding chairs and restrained award displays.
  function bench(x,z,w,along=false){
    const size=along?[.4,.085,w]:[w,.085,.4];
    box('spectator bench seat',[x,.46,z],size,'#584332','wood',true);
    for(const s of [-1,1])box('bench support',[x+(along?0:s*(w/2-.28)),.22,z+(along?s*(w/2-.28):0)],along?[.32,.42,.13]:[.13,.42,.32],'#584332','wood',true);
    box('bench stretcher',[x,.22,z],along?[.08,.12,w-.4]:[w-.4,.12,.08],'#483829','wood');
  }
  bench(2.5,12.7,4.5);bench(2.5,11.65,4.5);bench(6.63,11.7,3.0,true);
  function chair(x,z,angle=0){
    const p=(dx,y,dz)=>[x+Math.cos(angle)*dx+Math.sin(angle)*dz,y,z-Math.sin(angle)*dx+Math.cos(angle)*dz];
    box('chair cushion',p(0,.44,0),[.46,.065,.43],'#dfd7b9','fabric',true,[0,angle,0]);
    for(const side of [-1,1])for(const back of [-1,1])box('folding chair leg',p(side*.22,.25,back*.18),[.035,.5,.035],'#403024','wood',false,[back*.25,angle,0]);
    for(const side of [-1,1])box('chair back stile',p(side*.22,.66,.20),[.04,.49,.04],'#493529','wood',false,[0,angle,0]);
    box('chair curved back',p(0,.83,.20),[.48,.13,.045],'#493529','wood',false,[0,angle,0]);
  }
  for(const z of [5.3,6.7,9.7])chair(.6,z,Math.PI);
  for(const z of [6.7,9.7])chair(6.35,z,Math.PI);
  chair(2.15,8.7,Math.PI);chair(4.65,8.7,Math.PI);
  for(const z of [6.5,10.2,11.7])sign('award',[6.895,1.8,z],.73,.90,-Math.PI/2);
  for(const z of [5.6,10])sign('abstract',[.105,1.85,z],1.1,.78,Math.PI/2);
  sign('olympic',[.105,2.42,8.2],8.5,.35,Math.PI/2);
  sign('logo',[.10,1.68,11.8],1.25,1.25,Math.PI/2);
  // Belt progression beside the gear doorway, visible from the entrance.
  box('belt rack board',[6.86,1.24,5.3],[.09,1.6,.90],'#b19360','wood');
  const belts=['#eee7d1','#e4c53b','#42835c','#315fa0','#79569e','#b84443','#603e30','#25272a'];
  belts.forEach((c,i)=>box('belt on rack',[6.795,.56+i*.17,5.3],[.055,.13,.82],c,'fabric'));
  for(const z of [5,5.6])box('belt rack tie',[6.76,1.16,z],[.025,1.45,.018],'#2f2d28');
  // Shoe cubbies and an orderly rack of generic training shields.
  box('shoe shelf back',[10.83,.8,4],[.12,1.6,3.4],'#7d8585','paint',true);
  for(let y=.12;y<1.7;y+=.36)box('shoe shelf',[10.54,y,4],[.65,.05,3.4],'#b3b9b7','paint',true);
  for(const z of [2.3,3.15,4,4.85,5.7])box('shoe cubby divider',[10.54,.83,z],[.65,1.5,.045],'#929b9a');
  for(let i=0;i<4;i++)box('training shield',[8.3-i*.36,.66,5.68],[.29,1.15,.20],i%2?'#b95750':'#315381','mat',true);
  sign('best',[9,2.15,2.105],2.5,.48);sign('gear',[6.88,2.43,3.85],1.3,.23,-Math.PI/2);
  // Office only as far as visible: desk, shelf, trophies, no personal paperwork.
  box('office desk',[-2.5,.76,9.1],[2.3,.10,.85],'#674936','wood',true);
  for(const x of [-3.5,-1.5])box('desk pedestal',[x,.36,9.1],[.26,.72,.75],'#503b2d','wood',true);
  box('bookcase back',[-3.8,1,8],[.15,2,1.6],'#725539','wood',true);
  for(let y=.12;y<=2;y+=.46)box('bookcase shelf',[-3.55,y,8],[.55,.07,1.6],'#725539','wood',true);
  sign('office',[-.12,2.43,8.25],1.3,.23,-Math.PI/2);sign('best',[-2,1.9,10.895],2,.5,Math.PI);
  // Small glazed awards case and a separate sign-in desk, as in the entrance.
  box('display cabinet base',[3.75,.32,2.25],[1.12,.64,.60],'#888f88','paint',true);
  box('display case glass',[3.75,.94,2.25],[1.12,.60,.60],'#b7d7da','glass',true);
  for(const y of [.66,1.25])box('display case rim',[3.75,y,2.25],[1.16,.035,.64],'#7d898a','metal');
  for(let i=0;i<3;i++){const x=3.4+i*.35;box('award base',[x,.7,2.25],[.20,.06,.20],'#392e28','wood');cyl('trophy stem',[x,.84,2.25],.028,.23,'#bb9648');cyl('trophy cup',[x,.98,2.25],.09,.12,'#d4b262');}
  box('sign-in desk',[3.95,.78,.9],[1.40,.09,.65],'#5f4736','wood',true);
  for(const x of [3.35,4.55])box('sign-in desk leg',[x,.38,.9],[.09,.76,.55],'#4e3a2c','wood',true);
  cyl('tablet stand',[4.55,.96,.95],.025,.28,'#3c4146');
  box('sign-in iPad',[4.55,1.13,.95],[.38,.025,.29],'#202a30','metal',false,[-.55,0,0]);
  sign('signin',[4.55,1.151,.94],.34,.25);signs.at(-1).pitch=-Math.PI/2-.55;signs.at(-1).roll=Math.PI;
  for(const z of [.8,1.7,2.5])sign('award',[6.095,1.75,z],.48,.65,-Math.PI/2);
  // Suspended ceiling grid, strips, diffusers and simple three-blade fans.
  function ceiling(x0,x1,z0,z1,h,large){
    box('ceiling slab',[(x0+x1)/2,h+.06,(z0+z1)/2],[x1-x0,.12,z1-z0],'#bfc6c5','paint',true);
    for(let x=x0+.02;x<x1;x+=.61)box('ceiling grid', [x,h-.012,(z0+z1)/2],[.018,.024,z1-z0],'#a0aaa9');
    for(let z=z0+.02;z<z1;z+=1.22)box('ceiling grid',[(x0+x1)/2,h-.012,z],[x1-x0,.024,.018],'#a0aaa9');
    for(let x=x0+(large?2.8:1.7);x<x1;x+=large?5:3.4)for(let z=z0+1.7;z<z1;z+=large?3.65:3.3){
      box('light fixture housing',[x,h-.055,z],[large?.24:.66,.09,large?2.55:1.25],'#919e9f','metal');
      box('fluorescent light',[x,h-.105,z],[large?.15:.58,.015,large?2.45:1.15],'#f5f4dd','glow');
      lights.push({name:`Master Kim ceiling ${x} ${z}`,type:'area',power:large?90:60,size:1.2,angle:1.35,position:[x+KIM.x,h-.32+KIM.floor,z+KIM.z],direction:[0,-1,0],color:[.90,.95,1]});
    }
    for(let z=z0+2.7;z<z1;z+=6.5){
      box('vent diffuser',[(x0+x1)/2,h-.045,z],[.55,.07,.55],'#899493');
      for(let k=0;k<4;k++)box('vent slat',[(x0+x1)/2,h-.09,z-.19+k*.12],[.45,.025,.035],'#465452');
    }
  }
  ceiling(0,7,3,14,2.7,false);ceiling(3.1,6.2,0,3,2.7,false);ceiling(-4,0,6,11,2.7,false);ceiling(7,11,2,6,2.7,false);ceiling(0,16,14,32,3.5,true);
  for(const x of [1.7,14]){ceiling(x-.95,x+.95,32,35.8,2.7,false);ceiling(x-1.5,x+1.5,35.8,39.2,2.7,false);}
  for(const z of [18.5,25,30])for(const x of [5.3,10.7]){
    cyl('fan stem',[x,3.25,z],.025,.42,'#929f9f');cyl('fan hub',[x,3.03,z],.13,.12,'#bbc3c2');
    for(let k=0;k<3;k++){const a=k*Math.PI*2/3;box('fan blade',[x+Math.sin(a)*.43,3.04,z+Math.cos(a)*.43],[.16,.025,.78],'#b0babb','metal',false,[.06,a,0]);}
  }
  // Visitor guidance is physical signage; the school itself is freely walkable.
  sign('training',[7.6,.075,17.2],3.8,1.2,0);signs.at(-1).floor=true;
  sign('street',[.4,1.3,-1.4],2.7,.65,Math.PI);
  for(const x of [-.6,1.4])box('wayfinding post',[x,.6,-1.34],[.06,1.2,.06],'#536668','metal',true);
  // Facing into +Z, camera-right is -X. Reflect the plan so the observation
  // doorway and mirror wall appear on the right, as in the photographs.
  const reflect=x=>2*KIM.x+14-x;
  for(const p of parts){p.position[0]=reflect(p.position[0]);p.rotation[1]*=-1;p.rotation[2]*=-1;}
  for(const b of boxes){const left=reflect(b.max[0]);b.max[0]=reflect(b.min[0]);b.min[0]=left;}
  for(const s of signs){s.position[0]=reflect(s.position[0]);s.yaw*=-1;}
  for(const l of lights)l.position[0]=reflect(l.position[0]);
  for(const d of doors){d.pivot[0]=reflect(d.pivot[0]);d.at[0]=reflect(d.at[0]);}
  const path=parts.find(p=>p.name==='street connecting path');path.position[0]=37;path.size[0]=22;
  const pathBox=boxes.find(b=>b.name.endsWith('street connecting path'));pathBox.min[0]=26;pathBox.max[0]=48;
  return {parts,boxes,signs,lights,doors};
}
export const kimModel=makeKimModel();
export const kimBoxes=kimModel.boxes;
