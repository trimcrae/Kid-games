// Shared house controls respond on touch release, without treating a drag,
// cancelled gesture or second finger as a new button press.
export function createButtonBinder(doc=globalThis.document,now=()=>performance.now()){
  let swallowClicksUntil=0;
  const presses=new Map(),clear=()=>presses.clear();
  const forget=e=>presses.delete(e.pointerId);
  doc.addEventListener('pointermove',e=>{
    const p=presses.get(e.pointerId);
    if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>10)forget(e);
  },true);
  doc.addEventListener('pointercancel',forget,true);
  doc.addEventListener('lostpointercapture',forget,true);
  doc.addEventListener('pointerup',forget);
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});
  doc.defaultView?.addEventListener('blur',clear);
  // A touch action may dismiss its panel before the browser generates the
  // compatibility click. That click can land on another control underneath.
  doc.addEventListener('click',e=>{
    if(e.isTrusted&&now()<swallowClicksUntil){e.stopPropagation();e.preventDefault();}
  },true);
  return function bindButton(node,action){
    node.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'&&!node.disabled&&e.isPrimary){
        presses.set(e.pointerId,{node,x:e.clientX,y:e.clientY});
      }
    });
    node.addEventListener('pointerup',e=>{
      if(e.pointerType!=='touch')return;
      const p=presses.get(e.pointerId);forget(e);
      // Suppress any compatibility click even when the gesture was rejected.
      swallowClicksUntil=now()+450;e.preventDefault();
      if(!p||p.node!==node||node.disabled||Math.hypot(e.clientX-p.x,e.clientY-p.y)>10)return;
      const r=node.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
      action();
    });
    node.addEventListener('click',e=>{
      // Slow rendering can delay a compatibility click beyond the time guard.
      if(node.disabled||e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)return;
      if(now()>=swallowClicksUntil)action();
    });
  };
}
