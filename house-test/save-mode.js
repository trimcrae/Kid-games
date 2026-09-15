// Which saves the house's activity engine plays on (see make-activity-clone.cjs).
// Opened from the Craepets game (index.html?from=game) the house plays on the
// game's own valley: the same player, pet, coins and things (craepets.who,
// craepets.v1.<who>, craepets.voice), and never copies saves anywhere.
// Opened on its own it keeps the separate house edition (craepets.house.*),
// exactly as before.
(function(){
  'use strict';
  var game=false;
  try{game=new URLSearchParams(window.parent.location.search).get('from')==='game';}catch(e){game=false;}
  window.CraepetsSaveMode=game?{id:'game',prefix:'craepets.'}:{id:'house',prefix:'craepets.house.'};
})();
