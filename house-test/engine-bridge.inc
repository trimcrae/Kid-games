  // The host owns travel. This API owns activity lifecycle, so a hidden game
  // never keeps catching stars, running battle clocks, or narrating questions.
  var houseStation = null;
  window.HouseActivity = {
    ready: function(){return !!S;},
    enter: function(station) {
      this.leave(); houseStation=station;
      if(station.owner && station.owner!==who){startVisit(station.owner);return;}
      view=station.view || 'nest';
      if(view==='bag' && S.pet)S.bagNew={};
      lastPlace=view; render();
      if(S.pet && !S.pet.egg) {
        if(station.action)doAction(station.action);
        if(!station.action && ['farm','well','pool','market','arena','stall','quests','games'].indexOf(view)!==-1)maybeEvent();
      }
    },
    leave: function() {
      hush(); stopCatch(); stopMatch(); sess=null; battle=null;
      clearTimeout(battleTimer); closeSheet(); save(); houseStation=null;
    },
    profiles: function(){return D.PROFILES;},
    select: function(id){if(D.PROFILES.some(function(p){return p.id===id;}))switchTo(id);},
    refreshSaves: function(){hush();stopCatch();stopMatch();sess=null;battle=null;clearTimeout(battleTimer);closeSheet();who=localStorage.getItem(WHO_KEY)||who;S=load(who);view='nest';render();},
    cuddle: function(){if(!S.pet)return;if(S.pet.egg){tapEgg();return;}S.pet.happy=clamp(S.pet.happy+1,0,100);var line=moodSay();say(line.text,2600,line.tok);sfx('pop');save();},
    family: function(){return D.PROFILES.map(function(p){var s=p.id===who?S:readSlot(p.id);return {id:p.id,name:p.name,pet:s&&s.pet};});},
    neighborhood: function(){return D.PROFILES.map(function(p){var s=p.id===who?S:load(p.id);return withSave(s,function(){return {id:p.id,pet:S.pet,home:S.pet?homeName():null,house:S.pet?houseInfo():null,items:S.pet?placedItems():[],style:S.pet?{wall:wallNow(),floor:floorNow()}:null};});});},
    palette: function(id){var c=P.colour(id),pattern=null;if(typeof c.pal.B==='function'){pattern=[];for(var y=0;y<22;y++){var row=[];for(var x=0;x<16;x++)row.push(c.pal.B(x,y,16,22));pattern.push(row);}}return {body:typeof c.pal.B==='function'?c.pal.B(8,10,16,22):c.pal.B,accent:typeof c.pal.A==='function'?c.pal.A(8,10,16,22):c.pal.A,pattern:pattern};},
    placed: function(){return S.pet?placedItems():[];},
    style: function(){return S.pet?{room:room(),wall:wallNow(),floor:floorNow(),name:homeName()}:null;},
    snapshot: function(){return JSON.parse(JSON.stringify({who:who,pet:S.pet,coins:S.coins,house:S.house}));}
  };
  document.addEventListener('click',function(ev){
    var route=ev.target.closest('[data-go],[data-goto],[data-do]');
    if(!route || !parent.houseBridge)return;
    var action=route.dataset.do;
    if(action && houseStation && houseStation.action===action)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    parent.houseBridge.route(route.dataset.go||route.dataset.goto,action);
  },true);
  document.addEventListener('keydown',function(ev){
    if(ev.code==='Escape' && !document.querySelector('#sheet-back') && parent.houseBridge){ev.preventDefault();parent.houseBridge.close();}
  });
