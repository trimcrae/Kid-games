import * as THREE from './vendor/three.module.min.js';
import {creature,labelSprite,PET_SCALE} from './creatures.mjs?v=20261001-visuals';
import {BELTS,readStudio,saveStudio,dobokParts,uniformFor} from './taekwondo-uniform.mjs?v=20261103-studio-life';
import {inKim} from './master-kim-layout.mjs?v=20261103-studio-life';
export function studioInteractions(ctx){
  const {scene,world,player,life,tour,list,ticking,reducedMotion,bindButton,masterKim,debug}=ctx;
  const doors=masterKim.connectDoors(world,player,()=>life.refreshDirections());
  for(const d of doors){let warned=false;
    list.push({id:d.id,kind:'toggle',icon:'🚪',name:d.label,at:d.at,radius:1.8,label:()=>`${d.target>.5?'Close':'Open'} the ${d.label.toLowerCase()}`,start(){d.toggle();}});
    ticking.push(dt=>{d.update(dt,reducedMotion);if(d.blocked&&!warned){life.say('Step clear of the door so it can move.',3000);warned=true;}if(!d.blocked)warned=false;});
  }
  const dialog=document.createElement('dialog');dialog.id='kim-signin';dialog.setAttribute('aria-labelledby','kim-signin-title');
  dialog.innerHTML=`<button class="kim-close" aria-label="Close sign-in">×</button><p class="kim-kicker">MASTER KIM’S TAEKWONDO</p><h2 id="kim-signin-title">Welcome to practice!</h2><p id="kim-visitor"></p><p id="kim-attendance" role="status"></p><button id="kim-check-in">Sign in for practice</button><section aria-label="Taekwondo uniform"><h3>Your practice uniform</h3><p>A white dobok and a belt, ready for the mats.</p><button id="kim-wear"></button><div id="kim-belts" aria-label="Choose a belt colour"></div><p class="kim-note">Belt colours here are for dressing up. Practise with your instructor to earn real belts.</p></section><button id="kim-done">Ready to practise</button>`;
  document.body.append(dialog);let wasActive=false,lastFocus=null;
  const $=id=>dialog.querySelector('#'+id),today=()=>new Date().toLocaleDateString('en-CA');
  function refresh(){const pet=life.pet(),s=readStudio(life.profile()),canPractise=!!pet&&!pet.egg;$('kim-visitor').textContent=pet?`Hi, ${pet.name||'Craepet'}!`:'Choose your Craepet to join practice.';$('kim-attendance').textContent=pet?.egg?'Hatch your Craepet before choosing a practice uniform.':s.signedIn===today()?'You’re signed in for today.':'Sign in when you arrive.';$('kim-check-in').textContent=s.signedIn===today()?'Signed in today ✓':'Sign in for practice';$('kim-check-in').disabled=!canPractise;$('kim-wear').textContent=s.uniform?'Wear my usual clothes':'Put on my uniform';$('kim-wear').disabled=!canPractise;for(const b of $('kim-belts').children){b.setAttribute('aria-pressed',String(b.dataset.belt===s.belt));b.disabled=!canPractise;}}
  function change(patch){if(!life.pet()||life.pet().egg)return;try{saveStudio(life.profile(),patch);}catch{$('kim-attendance').textContent='This browser could not read or save the practice choice. Your saved choices were not changed. Please try again.';return;}life.refreshUniform();refresh();}
  function open(){if(dialog.open)return;lastFocus=document.activeElement;wasActive=tour.active;tour.suspend();refresh();dialog.showModal();$('kim-check-in').focus();}
  function close(){dialog.close();if(wasActive)tour.resume();lastFocus?.focus?.();}
  bindButton(dialog.querySelector('.kim-close'),close);bindButton($('kim-done'),close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('keydown',e=>e.stopPropagation());
  bindButton($('kim-check-in'),()=>change({signedIn:today(),uniform:true}));bindButton($('kim-wear'),()=>change({uniform:!readStudio(life.profile()).uniform}));
  for(const [name,color]of Object.entries(BELTS)){const b=document.createElement('button');b.type='button';b.dataset.belt=name;b.textContent=name[0].toUpperCase()+name.slice(1);b.style.setProperty('--belt',color);b.setAttribute('aria-label',name+' belt');bindButton(b,()=>change({belt:name,uniform:true}));$('kim-belts').append(b);}
  const tablet={x:43.45,y:-.82,z:21.95};
  list.push({id:'kim-signin',kind:'toggle',icon:'📱',name:'Sign in on the iPad',at:tablet,radius:1.65,start:open});
  list.push({id:'kim-uniform',kind:'toggle',icon:'🥋',name:'Choose a practice uniform',at:{x:38.8,y:-.82,z:25},radius:1.6,start:open});
  // A tap on the tablet/door itself works too. A swipe stays a camera gesture.
  const canvas=ctx.renderer.domElement,ray=new THREE.Raycaster();let down=null;
  canvas.addEventListener('pointerdown',e=>{
    // The walkthrough reserves this region for its floating walking pad.
    if(e.pointerType==='touch'&&e.clientX<innerWidth*.42&&e.clientY>innerHeight*.4){down=null;return;}
    down={x:e.clientX,y:e.clientY,id:e.pointerId,time:performance.now()};
  });
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('pointerup',e=>{if(!down||performance.now()-down.time>500||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8||!tour.active){down=null;return;}down=null;const r=canvas.getBoundingClientRect();ray.setFromCamera({x:(e.clientX-r.x)/r.width*2-1,y:1-(e.clientY-r.y)/r.height*2},tour.camera);
    const nearTablet=Math.hypot(player.x-tablet.x,player.z-tablet.z)<1.8;
    if(nearTablet&&ray.ray.intersectBox(new THREE.Box3(new THREE.Vector3(43.21,.16,21.72),new THREE.Vector3(43.68,.47,22.17)),new THREE.Vector3())){open();return;}
    const hit=ray.intersectObjects([...masterKim.doorMeshes.values()],false)[0];if(hit){const d=doors.find(d=>masterKim.doorMeshes.get(d.id)===hit.object);if(d&&Math.hypot(player.x-d.at.x,player.z-d.at.z)<1.8)d.toggle();}
  });
  const cast=new THREE.Group();cast.name='Master Kim instructors';scene.add(cast);const instructors=[];
  for(const [i,species,x,z,body,accent]of [[0,'snorbit',44.2,48.8,'#d6bc91','#fff1d8'],[1,'blorb',35.8,49.7,'#71ad9c','#e2efe0']]){
    const name=i?'Instructor Jun':'Instructor Hana',pet=creature({species,name}, {body,accent},dobokParts({jacket:'#b63f3d',belt:'black'}));pet.scale.setScalar(PET_SCALE);pet.position.set(x,-.76,z);pet.rotation.y=Math.PI;cast.add(pet);pet.userData.rig.setExpression('happy');
    const label=labelSprite(name);label.position.set(x,new THREE.Box3().setFromObject(pet).max.y+.18,z);label.scale.multiplyScalar(.7);cast.add(label);
    world.addBoxes([{name:'Master Kim / '+name,min:[x-.19,-.82,z-.19],max:[x+.19,-.16,z+.19]}]);
    let step=0;list.push({id:'kim-instructor-'+i,kind:'toggle',icon:'🥋',name:'Practise with '+name,at:{x,y:-.82,z},radius:1.5,start(){step=step%5+1;life.say(step===5?'5! Great counting. Bow to say thank you.':`${step}! One careful practice step.`,3500);pet.userData.rig.hop(.15);}});
    instructors.push({name,pet,label,at:{x,y:-.82,z},uniform:'red',belt:'black'});
  }
  let time=0;ticking.push(dt=>{time+=dt;cast.visible=inKim(player)||Math.hypot(player.x-40,player.z-49)<22;for(const i of instructors)if(cast.visible){i.pet.userData.animate(time,false,reducedMotion,0);const heading=Math.atan2(player.x-i.at.x,player.z-i.at.z);i.pet.userData.rig.look(Math.atan2(Math.sin(heading-i.pet.rotation.y),Math.cos(heading-i.pet.rotation.y))*.4,0);}});
  debug.studio=()=>({doors:doors.map(d=>({id:d.id,fraction:d.fraction,target:d.target,blocked:d.blocked})),signInOpen:dialog.open,profile:life.profile(),practice:readStudio(life.profile()),wearing:!!uniformFor(life.profile(),player,life.pet()),instructors:instructors.map(i=>({name:i.name,...i.at,uniform:i.uniform,belt:i.belt,visible:cast.visible}))});
}
