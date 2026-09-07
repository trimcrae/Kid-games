const $=id=>document.getElementById(id);
export function setupSaves({api,engine,tour,refresh,startNew}){
  const saves=$('activity-frame').contentWindow.HouseSaves;let pending=null;
  function preview(data){
    pending=data;const valid=saves.validate(data,engine.who());$('save-preview').replaceChildren();
    for(const [id,s] of Object.entries(valid.profiles)){const p=document.createElement('p');p.textContent=id+' — '+s.pet.name+' · '+s.coins+' coins · '+(s.house?.owned?.length||0)+' furnishings';$('save-preview').append(p);}
    $('apply-saves').hidden=false;$('save-message').textContent='This brings over the complete saves shown above. A backup of your current house progress is kept on this device.';
  }
  function open(){
    api.leave();tour.suspend();$('activity-panel').hidden=true;$('family-panel').hidden=true;$('welcome').hidden=true;$('save-panel').hidden=false;
    pending=null;$('apply-saves').hidden=true;$('save-preview').replaceChildren();
    const original=saves.bundle('original');const n=Object.keys(original.profiles).length;
    $('load-original-saves').disabled=!n;$('save-message').textContent=n?`${n} original saved pets found in this browser.`:'No original Craepets are saved in this browser. Use the transfer page in your usual browser to download the whole family, then choose that file here.';
    $('single-save-profile').value=engine.who();$('close-saves').focus();
  }
  for(const p of api.profiles()){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;$('single-save-profile').append(option);}
  $('load-original-saves').addEventListener('click',()=>{try{preview(saves.bundle('original'));}catch(e){$('save-message').textContent=e.message;}});
  $('save-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error('Choose a Craepets JSON backup smaller than 5 MB.');const parsed=saves.validate(await file.text(),$('single-save-profile').value);preview({format:'craepets-family',profiles:parsed.profiles,who:parsed.who||$('single-save-profile').value});}catch(e){pending=null;$('apply-saves').hidden=true;$('save-message').textContent=e.message;}});
  $('apply-saves').addEventListener('click',()=>{try{api.leave();const ids=saves.restore(pending,engine.who());api.refreshSaves();refresh();pending=null;$('apply-saves').hidden=true;$('save-message').textContent=`Loaded ${ids.length} complete saved pets. You’re ready to walk home.`;$('close-saves').textContent='Play with my saved pet';}catch(e){$('save-message').textContent=e.message;}});
  $('close-saves').addEventListener('click',()=>{$('save-panel').hidden=true;if(engine.state().pet)tour.resume();else $('welcome').hidden=false;});
  $('new-pet-instead').addEventListener('click',()=>{$('save-panel').hidden=true;startNew();});
  $('load-saves').addEventListener('click',open);$('welcome-saves').addEventListener('click',open);
  return {open};
}
