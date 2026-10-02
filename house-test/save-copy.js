// House edition: seed only absent profiles after deep preparation. Never write
// original save keys. (In game mode nothing is copied at all; see below.)
(function(){
  'use strict';
  var ids=['jeannie','cory','ellie','kieran','shannon','tristan','guest'],prefix='craepets.house.v1.';
  function parse(raw){try{return JSON.parse(raw);}catch(e){return null;}}
  function valid(s){return s&&s.v===1&&s.pet&&typeof s.pet.name==='string'&&typeof s.pet.species==='string'&&typeof s.pet.colour==='string';}
  function read(key){return parse(localStorage.getItem(key));}
  function scan(){return ids.map(function(id){return {id:id,original:read('craepets.v1.'+id),house:read(prefix+id)};});}
  function copyMissing(){
    if(gameMode)return [];
    if(!prepare)throw Error('The house is still opening. Saved pets have not been copied yet.');
    var copied=[];
    ids.forEach(function(id){
      try{
        // Presence protects every existing house byte, even an empty, damaged
        // or older save. Only an absent slot can be seeded automatically.
        if(localStorage.getItem(prefix+id)!==null||localStorage.getItem('craepets.house.reset.'+id)!==null)return;
        var raw=localStorage.getItem('craepets.v1.'+id);
        if(raw===null)return;
        var candidate=prepare(JSON.parse(raw),id),text=JSON.stringify(candidate);
        // Recheck after preparation; a newer target/reset must never be
        // replaced by the snapshot that was just prepared.
        if(localStorage.getItem(prefix+id)!==null||localStorage.getItem('craepets.house.reset.'+id)!==null)return;
        localStorage.setItem(prefix+id,text);
        if(localStorage.getItem(prefix+id)===text)copied.push(id);
      }catch(e){console.warn('An original saved pet could not be copied safely: '+id+'.');}
    });
    function usable(id){
      if(ids.indexOf(id)<0)return false;
      try{var raw=localStorage.getItem(prefix+id);if(raw===null)return false;prepare(JSON.parse(raw),id);return true;}catch(e){return false;}
    }
    try{
      var who=localStorage.getItem('craepets.house.who'),oldWho=localStorage.getItem('craepets.who');
      if(!usable(who)){
        var fallback=ids.find(usable);
        if(usable(oldWho))fallback=oldWho;
        if(fallback)localStorage.setItem('craepets.house.who',fallback);
      }
    }catch(e){console.warn('House player selection could not be saved.');}
    try{
      var voice=localStorage.getItem('craepets.voice');
      if(localStorage.getItem('craepets.house.voice')===null&&voice!==null)localStorage.setItem('craepets.house.voice',voice);
    }catch(e){console.warn('House voice preference could not be copied.');}
    return copied;
  }
  function bundle(source){var profiles={};ids.forEach(function(id){var s=read((source==='house'?prefix:'craepets.v1.')+id);if(valid(s))profiles[id]=s;});return {format:'craepets-family',version:1,profiles:profiles,who:localStorage.getItem(source==='house'?'craepets.house.who':'craepets.who'),exportedAt:new Date().toISOString()};}
  var prepare=null,autoSeed=false,recoveryKey='craepets.house.import-recovery.v1',blocked=false;
  function setPreparer(fn,skipAutoSeed){
    prepare=fn;
    // Registering the existing pure engine preparer is the first point when
    // content tables and legacy defaults are ready. Export-only pages do not
    // seed any progress or preferences.
    if(autoSeed){autoSeed=false;if(skipAutoSeed)return;try{copyMissing();}catch(e){console.warn('House saves are unavailable: '+e.message);}}
  }
  function record(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  function recoveryAllowed(key){
    return key==='craepets.house.who'||ids.some(function(id){return key===prefix+id||key==='craepets.house.reset.'+id;});
  }
  function journal(){
    var raw=localStorage.getItem(recoveryKey);
    if(raw===null)return {version:1,records:[],pending:0};
    var j=parse(raw);
    if(!record(j)||j.version!==1||!Array.isArray(j.records)||j.records.length>8||
       !Number.isSafeInteger(j.pending)||j.pending<0||j.pending>j.records.length)throw Error('The saved-pet safety copies need attention. Nothing was imported.');
    j.records.forEach(function(r){
      if(!record(r)||typeof r.date!=='string'||!record(r.values)||!Object.keys(r.values).length)throw Error('The saved-pet safety copies need attention. Nothing was imported.');
      Object.keys(r.values).forEach(function(key){if(!recoveryAllowed(key)||(r.values[key]!==null&&typeof r.values[key]!=='string'))throw Error('The saved-pet safety copies need attention. Nothing was imported.');});
    });
    return j;
  }
  function saveJournal(j){
    var text=JSON.stringify(j);localStorage.setItem(recoveryKey,text);
    if(localStorage.getItem(recoveryKey)!==text)throw Error('The saved-pet safety copy could not be verified.');
  }
  function recover(){
    var j;
    try{j=journal();}catch(e){blocked=true;throw e;}
    if(!j.pending){blocked=false;return false;}
    blocked=true;
    var previous=j.records[j.pending-1].values,keys=Object.keys(previous),failed=false;
    // Free the changed entries first. The verified journal holds every original
    // byte, so quota cannot make restoring a large earlier pet depend on order.
    keys.forEach(function(key){
      try{if(localStorage.getItem(key)!==previous[key])localStorage.removeItem(key);}catch(e){failed=true;}
    });
    keys.forEach(function(key){
      try{if(localStorage.getItem(key)!==previous[key]){if(previous[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[key]);}}catch(e){failed=true;}
    });
    keys.forEach(function(key){try{if(localStorage.getItem(key)!==previous[key])failed=true;}catch(e){failed=true;}});
    if(failed)throw Error('Your earlier pets are kept in a safety copy on this device. Saving is paused: free some browser space, then reload to recover them.');
    j.pending=0;
    try{saveJournal(j);}catch(e){throw Error('Your earlier pets are restored, but saving is paused until the safety copy can be checked. Please reload.');}
    blocked=false;return true;
  }
  function validate(input,profile){
    var parsed=typeof input==='string'?JSON.parse(input):input;
    var profiles=parsed&&parsed.format==='craepets-family'?parsed.profiles:valid(parsed)?{[profile]:parsed}:null;
    if(parsed&&parsed.format==='craepets-family'&&parsed.version!==undefined&&parsed.version!==1)throw Error('This family backup version is not supported.');
    if(!profiles||typeof profiles!=='object'||Array.isArray(profiles))throw Error('Choose a Craepets family backup or an original saved-valley JSON file.');
    var entries=Object.entries(profiles);if(!entries.length)throw Error('This backup contains no saved pets.');
    entries.forEach(function(entry){if(ids.indexOf(entry[0])<0||!valid(entry[1]))throw Error('The backup has an invalid player or pet. Nothing was imported.');});
    if(!prepare)throw Error('The house is still opening. Please wait before importing saved pets.');
    var prepared={};
    entries.forEach(function(entry){
      // The existing pure valley preparer fills legacy fields in place. Keep
      // preview/restore callers and their original backup objects untouched.
      prepared[entry[0]]=prepare(JSON.parse(JSON.stringify(entry[1])),entry[0]);
    });
    return {profiles:prepared,who:parsed.who};
  }
  function restore(input,profile){
    var data=validate(input,profile),incoming={},previous={};
    Object.keys(data.profiles).forEach(function(id){
      incoming[prefix+id]=JSON.stringify(data.profiles[id]);
      incoming['craepets.house.reset.'+id]=null;
    });
    incoming['craepets.house.who']=ids.indexOf(data.who)>=0&&Object.prototype.hasOwnProperty.call(data.profiles,data.who)?data.who:Object.keys(data.profiles)[0];
    recover();
    Object.keys(incoming).forEach(function(key){previous[key]=localStorage.getItem(key);});
    var j=journal(),index=j.records.findIndex(function(r){return JSON.stringify(r.values)===JSON.stringify(previous);});
    if(index<0){
      if(j.records.length===8)throw Error('Eight saved-pet safety copies are already kept on this device. Nothing was imported.');
      j.records.push({date:new Date().toISOString(),values:previous});index=j.records.length-1;
    }
    j.pending=index+1;
    // No live key changes until the complete exact-byte rollback record is
    // durable and readable. A safety-copy failure refuses the import.
    blocked=true;
    try{saveJournal(j);}catch(e){
      try{recover();}catch(recoveryError){throw recoveryError;}
      throw Error('The safety copy could not be saved and checked. No pets were imported.');
    }
    try{
      Object.keys(incoming).forEach(function(key){
        if(incoming[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,incoming[key]);
        if(localStorage.getItem(key)!==incoming[key])throw Error('A saved pet could not be verified.');
      });
      j.pending=0;saveJournal(j);blocked=false;
    }catch(e){
      var restored;
      try{restored=recover();}catch(recoveryError){throw recoveryError;}
      if(!restored){
        // The completed transaction's final acknowledgment may have failed
        // after its marker was cleared. Do not claim a rollback we did not do
        // or let the stale active valley overwrite these coherent new saves.
        blocked=true;
        throw Error('The import status could not be confirmed. Safety copies remain on this device. Please reload before continuing.');
      }
      throw Error('The family could not be saved here. Your earlier pets and settings were restored.');
    }
    return Object.keys(data.profiles);
  }
  window.HouseSaves={ids:ids,scan:scan,copyMissing:function(){if(blocked)throw Error('Saving is paused until your earlier pets are recovered.');return copyMissing();},bundle:bundle,validate:validate,restore:restore,valid:valid,setPreparer:setPreparer,recover:recover,isBlocked:function(){return blocked;}};
  // Opened from the Craepets game, the house plays on the game's own saves
  // (save-mode.js): nothing is copied, and the house edition is left alone.
  var gameMode=!!(window.CraepetsSaveMode&&window.CraepetsSaveMode.id==='game');
  window.HouseSaves.gameMode=gameMode;
  if(!gameMode){try{autoSeed=!recover();}catch(e){console.warn('House saves are unavailable: '+e.message);}}
})();
