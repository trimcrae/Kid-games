// House edition: retry missing/empty profiles on every visit. Never write
// original save keys. (In game mode nothing is copied at all; see below.)
(function(){
  'use strict';
  var ids=['jeannie','cory','ellie','kieran','shannon','tristan','guest'],prefix='craepets.house.v1.';
  function parse(raw){try{return JSON.parse(raw);}catch(e){return null;}}
  function valid(s){return s&&s.v===1&&s.pet&&typeof s.pet.name==='string'&&typeof s.pet.species==='string'&&typeof s.pet.colour==='string';}
  function read(key){return parse(localStorage.getItem(key));}
  function scan(){return ids.map(function(id){return {id:id,original:read('craepets.v1.'+id),house:read(prefix+id)};});}
  function copyMissing(){
    var copied=[];
    scan().forEach(function(p){if(valid(p.original)&&!valid(p.house)&&!localStorage.getItem('craepets.house.reset.'+p.id)){localStorage.setItem(prefix+p.id,JSON.stringify(p.original));copied.push(p.id);}});
    var who=localStorage.getItem('craepets.house.who'),oldWho=localStorage.getItem('craepets.who');
    if(!who||!valid(read(prefix+who))){var fallback=ids.find(function(id){return valid(read(prefix+id));});if(valid(read(prefix+oldWho)))fallback=oldWho;if(fallback)localStorage.setItem('craepets.house.who',fallback);}
    if(localStorage.getItem('craepets.house.voice')===null&&localStorage.getItem('craepets.voice')!==null)localStorage.setItem('craepets.house.voice',localStorage.getItem('craepets.voice'));
    return copied;
  }
  function bundle(source){var profiles={};ids.forEach(function(id){var s=read((source==='house'?prefix:'craepets.v1.')+id);if(valid(s))profiles[id]=s;});return {format:'craepets-family',version:1,profiles:profiles,who:localStorage.getItem(source==='house'?'craepets.house.who':'craepets.who'),exportedAt:new Date().toISOString()};}
  var prepare=null,recoveryKey='craepets.house.import-recovery.v1',blocked=false;
  function setPreparer(fn){prepare=fn;}
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
    if(!j.pending){blocked=false;return;}
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
    blocked=false;
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
    saveJournal(j);blocked=true;
    try{
      Object.keys(incoming).forEach(function(key){
        if(incoming[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,incoming[key]);
        if(localStorage.getItem(key)!==incoming[key])throw Error('A saved pet could not be verified.');
      });
      j.pending=0;saveJournal(j);blocked=false;
    }catch(e){
      try{recover();}catch(recoveryError){throw recoveryError;}
      throw Error('The family could not be saved here. Your earlier pets and settings were restored.');
    }
    return Object.keys(data.profiles);
  }
  window.HouseSaves={ids:ids,scan:scan,copyMissing:function(){if(blocked)throw Error('Saving is paused until your earlier pets are recovered.');return copyMissing();},bundle:bundle,validate:validate,restore:restore,valid:valid,setPreparer:setPreparer,recover:recover,isBlocked:function(){return blocked;}};
  // Opened from the Craepets game, the house plays on the game's own saves
  // (save-mode.js): nothing is copied, and the house edition is left alone.
  var gameMode=!!(window.CraepetsSaveMode&&window.CraepetsSaveMode.id==='game');
  window.HouseSaves.gameMode=gameMode;
  if(!gameMode){try{recover();copyMissing();}catch(e){console.warn('House saves are unavailable: '+e.message);}}
})();
