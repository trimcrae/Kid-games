// Real GPU time per walking frame (EXT_disjoint_timer_query_webgl2), so the
// resolution controller can see headroom that a 30 fps cap hides. Only the
// player camera's frames are timed; probe and PMREM renders are not. Returns
// null where the extension is unavailable (most phones and Safari), and the
// caller falls back to counting frames.
export function createGpuTimer(renderer,camera){
  const gl=renderer.getContext();
  const ext=gl.getExtension?.('EXT_disjoint_timer_query_webgl2');
  if(!ext)return null;
  const pending=[],samples=[],raw=renderer.render.bind(renderer);
  let running=false;
  const timer={paused:false,
    poll(){
      while(pending.length){
        const q=pending[0];
        if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))break;
        pending.shift();
        if(!gl.getParameter(ext.GPU_DISJOINT_EXT))samples.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);
        gl.deleteQuery(q);
      }
      if(samples.length>24)samples.splice(0,samples.length-24);
    },
    // Median of recent frames, or null until enough were measured.
    median(min=6){
      if(samples.length<min)return null;
      const s=[...samples].sort((a,b)=>a-b);return s[s.length>>1];
    },
    reset(){samples.length=0;},
  };
  renderer.render=(scene,view)=>{
    if(view!==camera||running||timer.paused||pending.length>6)return raw(scene,view);
    const q=gl.createQuery();running=true;gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
    try{raw(scene,view);}
    finally{gl.endQuery(ext.TIME_ELAPSED_EXT);running=false;pending.push(q);}
  };
  renderer.render.gpuTimer=timer;
  return timer;
}
