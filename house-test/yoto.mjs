// The kids' Yoto players: one little cream cube with two orange knobs in each
// of the four bedrooms, drawn here out of boxes and cylinders (no textures, no
// downloads). E next to one plays today's episode of Yoto Daily; E again
// pauses it, and starting one stops whichever was already going — four of them
// playing over each other would be a lot, in the house as in real life.
//
// The episode itself can't be looked up from the page: the podcast's RSS lives
// on another host and a static site may not read it (CORS). So a workflow does
// it once a day on a runner with real internet
// (.github/workflows/yoto-daily.yml) and commits the newest episode to
// yoto-daily.json; the browser only reads that little file, and only the first
// time somebody presses E. Everything in it is words and a URL — text for the
// speech bubble, a src for an <audio> — never anything that runs.
const FEED='./yoto-daily.json';
// The 5x5 face on the front: a smiley sitting there waiting, a note playing.
const SMILEY=['.....','.#.#.','.....','#...#','.###.'];
const NOTE  =['...##','...#.','...#.','.##..','.##..'];
// Where each one lives: the cube's spot (on a shelf, sill, desk or bedside
// cabinet in that room), which way its face points, and a seed for the floor
// spot you stand on to reach it (snapped with safeSpot, so it survives the
// house being exported again).
const PLAYERS=[
  // Jeannie's: on the bedside cabinet by the head of her bed, the end of the
  // top the houseplant isn't on.
  ['yoto-jeannie',"Jeannie's Yoto player",{x:15.30,y:-.315,z:-5.60},-Math.PI/2,{x:14.70,y:-1.05,z:-5.45}],
  // Ellie's: in the empty cubby of the little shelf unit at the end of her bed.
  ['yoto-ellie',"Ellie's Yoto player",{x:8.66,y:-.175,z:-8.60},0,{x:8.66,y:-1.04,z:-8.10}],
  // Cory's: on the clear end of his desk.
  ['yoto-cory',"Cory's Yoto player",{x:16.85,y:2.095,z:-5.90},0,{x:16.85,y:1.31,z:-5.10}],
  // Kieran's: on the nursery windowsill, clear of the curtain and of the crib.
  ['yoto-kieran',"Kieran's Yoto player",{x:12.90,y:2.075,z:-.46},Math.PI,{x:12.40,y:1.29,z:-1.00}],
];

export function yotoInteractions(ctx){
  const {THREE,scene,world,life,list,ticking,sounds,reducedMotion}=ctx;
  // One player at a time, one element between them all: switching rooms
  // switches the card rather than starting a second copy of the episode.
  const audio=new Audio();audio.preload='none';audio.volume=.85;
  let playing=null,episode=null,asked=null;
  // The file is fetched once, lazily, on the first press — and a missing or
  // unfinished one is not an error, just no card in the slot yet.
  function loadEpisode(){
    return asked??=Promise.resolve().then(()=>fetch(FEED+'?v='+Date.now(),{cache:'no-store'}))
      .then(r=>r.ok?r.json():null)
      .then(j=>episode=(j&&typeof j.title==='string'&&typeof j.audio==='string'&&/^https?:/.test(j.audio))?j:null)
      .catch(()=>episode=null);
  }
  // ----- one player, built out of boxes.
  const shellMat=new THREE.MeshStandardMaterial({color:'#f4eee1',roughness:.72,metalness:0});
  const screen=new THREE.MeshStandardMaterial({color:'#15181e',roughness:.5,metalness:.05});
  const knobMat=new THREE.MeshStandardMaterial({color:'#ef8a24',roughness:.45,metalness:.05});
  const S=.09,H=S/2;
  // Three boxes across each other read as one cube with its corners taken off.
  const shells=[[S,S-.012,S-.012],[S-.012,S,S-.012],[S-.012,S-.012,S]].map(d=>new THREE.BoxGeometry(...d));
  const panelGeo=new THREE.BoxGeometry(.058,.05,.004);
  const pixelGeo=new THREE.BoxGeometry(.0068,.0068,.0015);
  const knobGeo=new THREE.CylinderGeometry(.011,.012,.014,16);
  function build(pos,yaw){
    const g=new THREE.Group();g.position.set(pos.x,pos.y,pos.z);g.rotation.y=yaw;
    for(const geo of shells)g.add(new THREE.Mesh(geo,shellMat));
    const panel=new THREE.Mesh(panelGeo,screen);panel.position.set(0,.006,H-.001);g.add(panel);
    // Its own material, so this one's face can glow while the others sit dark.
    const lit=new THREE.MeshStandardMaterial({color:'#05080c',emissive:'#8ee7ff',emissiveIntensity:1.5,roughness:1,metalness:0});
    const pixels=[];
    for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      const px=new THREE.Mesh(pixelGeo,lit);
      px.position.set((c-2)*.0095,.006+(2-r)*.0095,H+.002);
      g.add(px);pixels.push(px);
    }
    for(const dx of [-.024,.024]){const k=new THREE.Mesh(knobGeo,knobMat);k.position.set(dx,H+.007,-.006);g.add(k);}
    scene.add(g);
    return {group:g,pixels,lit,face:null};
  }
  // Light the 25 squares to a pattern, only when it has actually changed.
  function draw(p,pattern){
    if(p.face===pattern)return;p.face=pattern;
    for(let r=0;r<5;r++)for(let c=0;c<5;c++)p.pixels[r*5+c].visible=pattern[r][c]==='#';
  }
  function stop(){
    if(!playing)return;
    try{audio.pause();}catch{}
    draw(playing,SMILEY);playing.lit.emissiveIntensity=1.5;playing=null;
  }
  audio.addEventListener('ended',()=>stop());
  audio.addEventListener('error',()=>{if(playing){life.say('That card will not play.',2400);stop();}});

  for(const [id,name,pos,yaw,seed] of PLAYERS){
    const p=build(pos,yaw);p.id=id;draw(p,SMILEY);
    const spot=world.safeSpot(seed.x,seed.y,seed.z)||seed;
    list.push({id,icon:'🎧',name,kind:'toggle',at:{x:spot.x,y:spot.y,z:spot.z},radius:1.1,face:{x:pos.x,z:pos.z},
      label:()=>playing===p?'Pause the Yoto':'Play Yoto Daily',
      start(){
        sounds?.click?.();
        if(playing===p){stop();life.say('Paused.',1200);return;}
        stop();playing=p;draw(p,NOTE);
        loadEpisode().then(()=>{
          if(playing!==p)return;                       // somebody pressed another one meanwhile
          if(!episode){life.say("Yoto Daily hasn't arrived yet",2800);stop();return;}
          // Only ever text and a src — the title goes in the speech bubble.
          if(audio.src!==episode.audio){audio.src=episode.audio;audio.load();}
          Promise.resolve(audio.play()).catch(()=>{if(playing===p){life.say("The Yoto won't start.",2400);stop();}});
          life.say(String(episode.title).slice(0,90),5000);
        });
      }});
    ticking.push(dt=>{
      if(playing!==p)return;
      // The note glows in time with itself while it plays.
      p.lit.emissiveIntensity=reducedMotion?1.8:1.5+Math.sin(performance.now()/260)*.6;
    });
  }
  // For QA: which one is playing, and what it thinks the episode is.
  try{window.houseYoto=()=>({playing:playing?.id??null,episode:episode?{title:episode.title,audio:episode.audio}:null,paused:audio.paused});}catch{}
}
