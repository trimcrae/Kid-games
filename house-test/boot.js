// Loading watchdog for the house. A classic script, so it runs even when the
// 3D modules never do (a part that fails to download, a browser that cannot
// run them, an error while they start). walkthrough.js reports each loading
// step here; if a step goes quiet the card says so and offers "Try again" and
// "Back to the Craepets game", and if the house cannot start it says what went
// wrong. Loading is never cut off: a slow step that finishes still opens the
// house. Errors are kept for diagnosis (console and window.houseBoot.errors).
(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  var fast=params.get('bootwatch')==='fast'; // tests only
  // Opened from the Craepets game: its wording and way back, even if the modules never start.
  if(params.get('from')==='game')document.body.classList.add('from-game');
  var SLOW=fast?2000:25000;   // this long without progress: "still working", with ways out
  var STUCK=fast?6000:90000;  // this long without progress: say it has stopped
  var began=Date.now(),last=began,stage='the 3D house',state='loading',errors=[],lastText='';
  var $=function(id){return document.getElementById(id);};
  function show(t){var el=$('loading');if(el)el.textContent=t;}
  function text(t){lastText=t;show(t);}
  function detail(t){var el=$('boot-detail');if(el){el.textContent=t||'';el.hidden=!t;}}
  function mode(name){
    state=name;
    document.body.classList.toggle('house-slow',name==='slow');
    document.body.classList.toggle('house-failed',name==='failed'||name==='stalled');
    var retry=$('boot-retry');if(retry)retry.hidden=name!=='slow';
    var start=$('start');
    if(start&&(name==='failed'||name==='stalled')){start.disabled=false;start.textContent='Try again';}
  }
  function record(error){
    var message=error&&error.message?error.message:String(error);
    errors.push({stage:stage,message:message,afterMs:Date.now()-began});
    return message;
  }
  // Progress again after a quiet spell: back to the plain loading card.
  function progress(words){
    if(state==='ready'||state==='failed')return;
    last=Date.now();
    if(state==='slow'||state==='stalled'){
      mode('loading');detail('');
      var start=$('start');if(start){start.disabled=true;start.textContent='Opening the front door…';}
      show(lastText);
    }
    if(words!=null)text(words);
  }
  function fail(error,message){
    if(state==='ready'||state==='failed')return;
    var why=record(error);
    console.error('The house could not open ('+stage+'):',error);
    mode('failed');
    text(message||'The house could not open. Try again, or go back to the Craepets game.');
    detail('Stopped while loading '+stage+': '+why);
  }
  var boot=window.houseBoot={
    get stage(){return stage;},get state(){return state;},errors:errors,
    // A new loading step (optionally with the words to show).
    step:function(name,words){stage=name;progress(words);},
    // Still making progress (bytes arriving) without a new step.
    alive:function(words){progress(words);},
    ready:function(){state='ready';document.body.classList.remove('house-slow','house-failed');detail('');var r=$('boot-retry');if(r)r.hidden=true;},
    fail:fail
  };
  // Errors from the house's own scripts while it is opening (a part that will
  // not start). Errors from elsewhere (extensions, tools) are kept, not fatal.
  window.addEventListener('error',function(e){
    if(state==='ready'||state==='failed')return;
    var own=e.filename&&e.filename.indexOf(location.origin+location.pathname.replace(/[^/]*$/,''))===0;
    if(own)fail(e.error||new Error(e.message),'The house could not start. Try again, or go back to the Craepets game.');
    else if(e.message)record(new Error(e.message));
  });
  window.addEventListener('unhandledrejection',function(e){if(state!=='ready')record(e.reason);});
  // "Try again" reloads the page; the start button does the same once loading has failed.
  function retry(){location.reload();}
  document.addEventListener('click',function(e){
    var t=e.target;if(!t||!t.closest)return;
    if(t.closest('#boot-retry'))retry();
    else if(t.closest('#start')&&(state==='failed'||state==='stalled'))retry();
  });
  // A background tab loads slowly on purpose; only count time it is shown.
  document.addEventListener('visibilitychange',function(){if(!document.hidden)last=Date.now();});
  var timer=setInterval(function(){
    if(state==='ready'||state==='failed'){clearInterval(timer);return;}
    if(document.hidden)return;
    var idle=Date.now()-last;
    if(idle>STUCK&&state!=='stalled'){
      record(new Error('No progress for '+Math.round(idle/1000)+' s'));
      mode('stalled');
      show('The house has stopped loading. Try again, or go back to the Craepets game.');
      detail('No progress for '+Math.round(idle/1000)+' s while loading '+stage+'.');
    }else if(idle>SLOW&&state==='loading'){
      mode('slow');
      show((lastText||'Opening the front door…')+' Still working on it — this can take a while on a slow connection or an older computer.');
    }
  },1000);
  lastText=($('loading')||{}).textContent||'Opening the front door…';
})();
