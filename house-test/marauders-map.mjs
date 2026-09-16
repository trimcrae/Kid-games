// The Marauder's Map: a parchment plan of the house, drawn in ink from the
// very walls the pets walk into (the collision boxes), with everyone in the
// house — your pet, the family's pets and the cats — as little sets of paw
// prints that pad along as they move, each under a name banner. One floor at
// a time (the one you're on, to begin with); the rest of the household is
// listed underneath with where they've got to. Opens with the oath, closes
// with "Mischief managed". Static ink (floors, walls, furniture, room names)
// is drawn once per floor and kept; only the prints are redrawn while it's
// open, a dozen times a second.
import {rooms as houseRooms} from './rooms.mjs';
const $=id=>document.getElementById(id);
const INK='#3d2510',INK_SOFT='rgba(61,37,16,.45)',INK_FAINT='rgba(61,37,16,.16)',FLOOR='rgba(120,78,28,.10)';
const SCRIPT='"Brush Script MT","Segoe Script","Snell Roundhand","Bradley Hand","Apple Chancery","URW Chancery L",cursive';
// The house's floors, by the level the walking boxes put them at. Outside is
// the lawn level; the porch and the back step are within its reach.
export const FLOORS=[['Main floor',0],['Upstairs',1.26],['Downstairs',-1.05],['Basement',-3.15],['Outside',-.82]];
// Which floor someone is on. Indoors, the highest floor whose footprint
// (its floor boxes, porches and paths not counted) they are standing on or a
// little above — so a pet asleep up on a downstairs bed is downstairs, not
// out on the lawn just below it. Nowhere indoors under them is outside;
// somewhere in between (the stairs) goes by the nearest room.
const OUTDOORS=/porch|deck|patio|step|lawn|path|drive|apron|walk strip|paver|mulch|yard|street|ground|grass|garden/i;
export function createFloorFinder(world){
  const footprints=FLOORS.filter(f=>f[0]!=='Outside').map(([name,L])=>[name,L,world.boxes.filter(b=>classify(b,L)==='floor'&&!OUTDOORS.test(b.name||''))]);
  return function floorOf(p){
    let best=null;
    for(const [name,L,boxes] of footprints){
      if(p.y<L-.15||p.y>L+1.4||(best&&L<=best[1]))continue;
      if(boxes.some(b=>p.x>=b.min[0]-.25&&p.x<=b.max[0]+.25&&p.z>=b.min[2]-.25&&p.z<=b.max[2]+.25))best=[name,L];
    }
    if(best)return best[0];
    let room=null,bd=Infinity;
    for(const r of houseRooms){const dy=p.y-r[4],d=Math.hypot(p.x-r[2],p.z+r[3])+(dy<0?-dy*12:dy*4);if(d<bd){bd=d;room=r;}}
    const f=room?room[0]:'Main floor';return f==='Craepet street'?'Outside':f;
  };
}
// What each box is, seen from a floor at height L: a floor to walk on, a wall
// to draw in ink, or a piece of furniture to sketch faintly. (Outside, the
// house's own walls rise from below the lawn, so the whole house outlines.)
export function classify(b,L){
  const w=b.max[0]-b.min[0],d=b.max[2]-b.min[2],h=b.max[1]-b.min[1],area=w*d;
  if(b.max[1]>=L-.30&&b.max[1]<=L+.06&&area>.35&&h<.6)return 'floor';
  if(b.min[1]<=L+.6&&b.max[1]>=L+1.5&&Math.min(w,d)<.45&&Math.max(w,d)>.25)return 'wall';
  if(b.max[1]>L+.12&&b.max[1]<L+1.35&&b.min[1]<L+.9&&area>.04&&area<12)return 'furniture';
  return null;
}
export function createMaraudersMap({world,rooms,everyone,bindButton,reducedMotion=false,onOpen=()=>{},onClose=()=>{}}){
  const panel=$('map'),canvas=$('map-canvas'),tabs=$('map-floors'),elsewhere=$('map-elsewhere'),card=panel.querySelector('.parchment');
  const ctx=canvas.getContext('2d'),floorOf=createFloorFinder(world);
  let floor=null,layers=new Map(),trails=new Map(),open=false,raf=0,lastDraw=0,lastEveryone=[];
  // Plan coordinates: x as in Blender, y = -z (north up on the page).
  const px=(x,f)=>f.ox+(x-f.minX)*f.scale,py=(y,f)=>f.oy+(f.maxY-y)*f.scale;
  // Fit a floor's footprint (its floor boxes; walls too, so a stairwell
  // doesn't fall off the page) into the canvas.
  function frame(name){
    const L=FLOORS.find(f=>f[0]===name)[1],boxes=[],outside=name==='Outside';
    // The page shows the house (or, outside, the house and its yards): the
    // street beyond the front lawn and stray boxes far off don't stretch it.
    const lim=outside?{x0:-12,x1:24,y0:-9,y1:28}:{x0:-4,x1:19,y0:-3,y1:12};
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const b of world.boxes){
      const kind=classify(b,L);if(!kind)continue;
      if(b.max[0]<lim.x0||b.min[0]>lim.x1||-b.min[2]<lim.y0||-b.max[2]>lim.y1)continue;
      boxes.push([kind,b]);
      if(kind==='floor'&&(outside||!OUTDOORS.test(b.name||''))){
        minX=Math.min(minX,Math.max(lim.x0,b.min[0]));maxX=Math.max(maxX,Math.min(lim.x1,b.max[0]));
        minY=Math.min(minY,Math.max(lim.y0,-b.max[2]));maxY=Math.max(maxY,Math.min(lim.y1,-b.min[2]));
      }
    }
    if(!Number.isFinite(minX)){minX=lim.x0;maxX=lim.x1;minY=lim.y0;maxY=lim.y1;}
    minX-=.6;maxX+=.6;minY-=.6;maxY+=.6;
    const W=canvas.width,H=canvas.height,pad=Math.min(W,H)*.06;
    const scale=Math.min((W-2*pad)/(maxX-minX),(H-2*pad)/(maxY-minY));
    return {name,L,boxes,minX,maxX,minY,maxY,scale,ox:(W-(maxX-minX)*scale)/2,oy:(H-(maxY-minY)*scale)/2};
  }
  // A hand's unsteadiness: the same tiny wobble for the same wall every time.
  const wob=(i,k)=>Math.sin(i*12.9898+k*78.233)*.9;
  function drawStatic(f){
    const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;const g=layer.getContext('2d');
    g.lineJoin='round';g.lineCap='round';
    for(const [kind,b] of f.boxes){
      if(kind!=='floor')continue;
      g.fillStyle=FLOOR;g.fillRect(px(b.min[0],f),py(-b.min[2],f),(b.max[0]-b.min[0])*f.scale,(b.max[2]-b.min[2])*f.scale);
    }
    let i=0;
    for(const [kind,b] of f.boxes){
      if(kind!=='furniture')continue;i++;
      g.strokeStyle=INK_FAINT;g.lineWidth=1;
      g.strokeRect(px(b.min[0],f)+wob(i,1),py(-b.min[2],f)+wob(i,2),(b.max[0]-b.min[0])*f.scale,(b.max[2]-b.min[2])*f.scale);
    }
    for(const [kind,b] of f.boxes){
      if(kind!=='wall')continue;i++;
      const x=px(b.min[0],f),y=py(-b.min[2],f),w=Math.max(2,(b.max[0]-b.min[0])*f.scale),h=Math.max(2,(b.max[2]-b.min[2])*f.scale);
      g.fillStyle=INK;g.globalAlpha=.82;g.fillRect(x,y,w,h);g.globalAlpha=1;
      g.strokeStyle=INK;g.lineWidth=1.2;g.strokeRect(x+wob(i,3)*.6,y+wob(i,4)*.6,w,h);
    }
    // Room names in a copperplate hand, at each room's own spot.
    g.fillStyle=INK;g.textAlign='center';g.textBaseline='middle';
    const size=Math.max(11,Math.min(18,f.scale*.55));g.font=`italic ${size}px ${SCRIPT}`;
    for(const r of rooms){
      if(r[0]!==f.name||/Craepet/.test(r[1]))continue;
      const x=px(r[2],f),y=py(r[3],f);
      g.globalAlpha=.85;g.fillText(r[1],x,y);g.globalAlpha=1;
    }
    // A compass rose in a corner, because a map has one.
    const cx=canvas.width-Math.min(canvas.width,canvas.height)*.09,cy=Math.min(canvas.width,canvas.height)*.11,R=Math.min(canvas.width,canvas.height)*.05;
    g.strokeStyle=INK;g.lineWidth=1.2;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.stroke();
    g.beginPath();g.moveTo(cx,cy-R*1.3);g.lineTo(cx+R*.28,cy);g.lineTo(cx,cy+R*.9);g.lineTo(cx-R*.28,cy);g.closePath();g.fillStyle=INK;g.fill();
    g.font=`bold ${Math.round(R*.7)}px Georgia,serif`;g.fillText('N',cx,cy-R*1.75);
    return layer;
  }
  // A paw print: a pad and three toes, pointing along `angle`.
  function paw(g,x,y,angle,size,alpha){
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.fillStyle=INK;
    g.beginPath();g.ellipse(0,size*.15,size*.42,size*.36,0,0,Math.PI*2);g.fill();
    for(const [tx,ty,r] of [[-.42,-.45,.2],[0,-.62,.21],[.42,-.45,.2]]){g.beginPath();g.ellipse(tx*size,ty*size,r*size,r*size*1.15,0,0,Math.PI*2);g.fill();}
    g.restore();
  }
  function banner(g,x,y,text,star){
    g.font=`${star?'bold ':''}13px ${SCRIPT}`;const w=g.measureText(text).width+18,h=20;
    g.fillStyle='rgba(248,234,200,.92)';g.strokeStyle=INK;g.lineWidth=1.2;
    g.beginPath();g.roundRect(x-w/2,y-h-14,w,h,3);g.fill();g.stroke();
    // The ribbon's little tails.
    g.beginPath();g.moveTo(x-w/2,y-h-14);g.lineTo(x-w/2-5,y-h-4);g.lineTo(x-w/2,y-14);g.moveTo(x+w/2,y-h-14);g.lineTo(x+w/2+5,y-h-4);g.lineTo(x+w/2,y-14);g.stroke();
    g.fillStyle=INK;g.textAlign='center';g.textBaseline='middle';g.fillText(text,x,y-h/2-14);
  }
  // Prints are laid where each of them has actually walked: a new pair every
  // 30 cm, the older ones fading, so the map shows where they came from.
  function drawPeople(f,list){
    const g=ctx;g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(layers.get(f.name),0,0);
    const here=list.filter(p=>floorOf(p)===f.name);
    for(const p of here){
      let t=trails.get(p.id);if(!t){t={steps:[],side:1,last:null};trails.set(p.id,t);}
      if(!t.last||Math.hypot(p.x-t.last.x,p.z-t.last.z)>.3||Math.abs(p.y-t.last.y)>.5){
        if(t.last&&Math.hypot(p.x-t.last.x,p.z-t.last.z)>4)t.steps=[];   // a jump: no trail across the house
        t.side=-t.side;t.steps.push({x:p.x,z:p.z,heading:p.heading,side:t.side});if(t.steps.length>7)t.steps.shift();t.last={x:p.x,y:p.y,z:p.z};
      }
      const size=Math.max(4,Math.min(9,f.scale*(p.kind==='cat'?.16:.2)));
      t.steps.forEach((s,i)=>{
        const a=(i+1)/t.steps.length*.75,ang=s.heading+Math.PI,ox=Math.cos(s.heading)*s.side*.11,oz=-Math.sin(s.heading)*s.side*.11;
        paw(g,px(s.x+ox,f),py(-(s.z+oz),f),ang,size,a*(p.sleeping?.4:1));
      });
      // Standing still: both paws together at the spot.
      const x=px(p.x,f),y=py(-p.z,f),ang=p.heading+Math.PI;
      for(const side of [-1,1])paw(g,x+Math.cos(-ang)*side*size*.7,y+Math.sin(-ang)*side*size*.7,ang,size,.95);
      banner(g,x,y-size,p.kind==='you'?`★ ${p.name} (you)`:p.sleeping?`${p.name} zZ`:p.name,p.kind==='you');
    }
  }
  function tick(now){
    if(!open)return;raf=requestAnimationFrame(tick);
    if(now-lastDraw<(reducedMotion?400:80))return;lastDraw=now;
    lastEveryone=everyone();
    const f=layers.frame;if(f)drawPeople(f,lastEveryone);
    // Everyone not on this floor, and where they are.
    const away=lastEveryone.filter(p=>floorOf(p)!==f.name);
    const text=away.length?away.map(p=>`${p.kind==='you'?'You are':p.name+' is'} ${p.sleeping?'asleep ':''}${floorOf(p)==='Outside'?'outside':'on the '+floorOf(p).toLowerCase()}`).join(' · '):'Everyone is on this floor.';
    if(elsewhere.textContent!==text)elsewhere.textContent=text;
  }
  function fit(){
    const r=card.getBoundingClientRect(),size=Math.min(r.width-40,innerHeight*.56);
    const w=Math.max(280,Math.round(size)),h=Math.max(220,Math.round(size*.78)),dpr=Math.min(2,devicePixelRatio||1);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    if(canvas.width!==w*dpr||canvas.height!==h*dpr){canvas.width=w*dpr;canvas.height=h*dpr;layers.clear();}
  }
  function show(name){
    floor=name;fit();
    if(!layers.has(name)){const f=frame(name);layers.set(name,drawStatic(f));layers.frame=f;}
    else layers.frame=frame(name);
    for(const t of tabs.children)t.setAttribute('aria-current',String(t.dataset.floor===name));
    lastDraw=0;
  }
  for(const [name] of FLOORS){const b=document.createElement('button');b.textContent=name;b.dataset.floor=name;bindButton(b,()=>show(name));tabs.append(b);}
  function openMap(){
    if(open)return;open=true;onOpen();panel.hidden=false;
    const you=everyone().find(p=>p.kind==='you');show(you?floorOf(you):'Main floor');
    panel.classList.remove('managed');requestAnimationFrame(()=>panel.classList.add('sworn'));
    trails.clear();tick(performance.now());$('map-done').focus();
  }
  function closeMap(){
    if(!open)return;open=false;cancelAnimationFrame(raf);
    panel.classList.remove('sworn');panel.classList.add('managed');
    setTimeout(()=>{if(!open)panel.hidden=true;},reducedMotion?0:420);onClose();
  }
  bindButton($('close-map'),closeMap);bindButton($('map-done'),closeMap);
  window.addEventListener('resize',()=>{if(open)show(floor);});
  return {open:openMap,close:closeMap,toggle(){open?closeMap():openMap();},get isOpen(){return open;},get floor(){return floor;},
    // For QA: what the map last drew.
    get shown(){return lastEveryone.map(p=>({id:p.id,name:p.name,kind:p.kind,floor:floorOf(p)}));}};
}
