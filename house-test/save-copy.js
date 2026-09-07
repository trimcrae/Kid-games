// Retry missing/empty profiles on every visit. Never write original save keys.
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
  function validate(input,profile){
    var parsed=typeof input==='string'?JSON.parse(input):input;
    var profiles=parsed&&parsed.format==='craepets-family'?parsed.profiles:valid(parsed)?{[profile]:parsed}:null;
    if(parsed&&parsed.format==='craepets-family'&&parsed.version!==undefined&&parsed.version!==1)throw Error('This family backup version is not supported.');
    if(!profiles||typeof profiles!=='object'||Array.isArray(profiles))throw Error('Choose a Craepets family backup or an original saved-valley JSON file.');
    var entries=Object.entries(profiles);if(!entries.length)throw Error('This backup contains no saved pets.');
    entries.forEach(function(entry){if(ids.indexOf(entry[0])<0||!valid(entry[1]))throw Error('The backup has an invalid player or pet. Nothing was imported.');});
    return {profiles:profiles,who:parsed.who};
  }
  function restore(input,profile){
    var data=validate(input,profile),previous={},resets={},oldWho=localStorage.getItem('craepets.house.who');
    Object.keys(data.profiles).forEach(function(id){previous[id]=localStorage.getItem(prefix+id);resets[id]=localStorage.getItem('craepets.house.reset.'+id);});
    localStorage.setItem('craepets.house.before-import',JSON.stringify({date:new Date().toISOString(),profiles:previous,who:oldWho,resets:resets}));
    var who=ids.indexOf(data.who)>=0&&data.profiles[data.who]?data.who:Object.keys(data.profiles)[0];
    function put(key,value){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
    try{Object.entries(data.profiles).forEach(function(entry){localStorage.setItem(prefix+entry[0],JSON.stringify(entry[1]));localStorage.removeItem('craepets.house.reset.'+entry[0]);});localStorage.setItem('craepets.house.who',who);}
    catch(e){Object.entries(previous).forEach(function(entry){put(prefix+entry[0],entry[1]);put('craepets.house.reset.'+entry[0],resets[entry[0]]);});put('craepets.house.who',oldWho);throw e;}
    return Object.keys(data.profiles);
  }
  window.HouseSaves={ids:ids,scan:scan,copyMissing:copyMissing,bundle:bundle,validate:validate,restore:restore,valid:valid};
  try{copyMissing();}catch(e){console.warn('House saves are unavailable: '+e.message);}
})();
