// First arrival takes a snapshot of family valleys. Never write original keys.
// A marker prevents deliberately reset house slots from being re-imported.
(function(){
  try {
    if(localStorage.getItem('craepets.house.migrated'))return;
    ['jeannie','cory','ellie','kieran','shannon','tristan','guest'].forEach(function(id){
      var old=localStorage.getItem('craepets.v1.'+id), key='craepets.house.v1.'+id;
      if(old && !localStorage.getItem(key))localStorage.setItem(key,old);
    });
    ['who','voice'].forEach(function(k){var old=localStorage.getItem('craepets.'+k);if(old!==null&&!localStorage.getItem('craepets.house.'+k))localStorage.setItem('craepets.house.'+k,old);});
    localStorage.setItem('craepets.house.migrated','1');
  }catch(e){console.warn('House progress could not be copied or saved on this device.');}
})();
