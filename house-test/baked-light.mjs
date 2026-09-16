// Optional baked bounce light (models/house/browser_lightmap.py): a lightmap UV
// per exported vertex plus a day and a night lightmap page. Everything is
// checked before it reaches the GPU — descriptor, mesh hash, vertex count,
// file hashes, image size — and the load is bounded: one failure stops the
// other downloads, decoded images are released, and a caller's abort (the
// house is ready and won't wait) or the time limit ends it. A missing, stale
// or broken bake only means the house opens with its usual light.
async function sha256(bytes){
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
}
const HEX=/^[a-f0-9]{64}$/,FILE=/^house\.[a-z0-9.-]+\.(?:gz|png)$/;
// The lightmap UV of a vertex that has no bake.
export const UNBAKED=65535;

export function checkBakedLight(d,data){
  if(!d||d.version!==1||d.encoding!=='gamma2.2'||d.meshSha256!==data.meshSha256)throw Error('Invalid baked light descriptor');
  const uv=d.uv;
  if(!uv||!FILE.test(uv.url)||uv.encoding!=='uint16-pair'||!Number.isInteger(uv.vertexCount)||uv.vertexCount<1||!HEX.test(uv.sha256))
    throw Error('Invalid baked light UV descriptor');
  const pages=Object.fromEntries((d.pages||[]).map(p=>[p.id,p]));
  for(const id of ['day','night']){
    const p=pages[id];
    if(!p||!FILE.test(p.url)||!HEX.test(p.sha256)||!Number.isInteger(p.width)||!Number.isInteger(p.height)
      ||p.width<16||p.height<16||p.width>8192||p.height>8192||!(p.scale>0&&p.scale<1e4))
      throw Error('Invalid baked light page: '+id);
  }
  if(pages.day.width!==pages.night.width||pages.day.height!==pages.night.height)throw Error('Baked light pages differ in size');
  let count=0;
  for(const group of data.groups){
    if(!Number.isInteger(group.count)||group.count<0||group.offset!==count*24)throw Error('Baked light group coverage does not match mesh');
    count+=group.count;
  }
  if(count!==uv.vertexCount)throw Error('Baked light vertex count does not match mesh');
  return {uv,pages,count};
}

// Browser image decode: straight bytes (no colour management), rows flipped
// for GL so v=0 is the bottom of the lightmap, as the bake writes it.
async function decodeImage(bytes){
  return createImageBitmap(new Blob([bytes],{type:'image/png'}),{imageOrientation:'flipY',colorSpaceConversion:'none',premultiplyAlpha:'none'});
}

// binary: the raw mesh bytes, or a promise of them — the lightmaps can start
// downloading alongside the mesh. signal: the caller's abort.
export async function loadBakedLight(data,binary,{fetcher=globalThis.fetch,decode=decodeImage,timeoutMs=20000,signal=null}={}){
  const d=data.bakedLight;if(!d)return null;
  const {uv,pages,count}=checkBakedLight(d,data);
  const abort=new AbortController();
  const stop=()=>abort.abort();
  const timer=setTimeout(stop,timeoutMs);
  if(signal){if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});}
  const images=[];
  try{
    // Files are keyed by their hashes (never a cached copy of another bake).
    const get=async(url,sha)=>{
      const response=await fetcher('./'+url+'?v='+sha.slice(0,16),{signal:abort.signal});
      if(!response.ok||!response.body)throw Error('Baked light file unavailable: '+url);
      return response;
    };
    const work=(async()=>{
      const [coords]=await Promise.all([
        (async()=>{
          const response=await get(uv.url,uv.sha256);
          const raw=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          if(raw.byteLength!==count*4)throw Error('Baked light UV size does not match mesh');
          if(await sha256(raw)!==uv.sha256)throw Error('Baked light UV checksum mismatch');
          return new Uint16Array(raw);
        })(),
        (async()=>{
          const mesh=await binary;
          if(mesh.byteLength!==count*24)throw Error('Baked light vertex count does not match mesh');
          if(await sha256(mesh)!==d.meshSha256)throw Error('Baked light belongs to a different mesh');
        })(),
        ...['day','night'].map(async id=>{
          const p=pages[id],bytes=await (await get(p.url,p.sha256)).arrayBuffer();
          if(await sha256(bytes)!==p.sha256)throw Error('Baked light page checksum mismatch: '+id);
          const image=await decode(bytes);
          // (A decode that finishes after the load was stopped is released here.)
          if(abort.signal.aborted){image.close?.();throw Error('Baked light stopped');}
          images.push(image);
          if(image.width!==p.width||image.height!==p.height)throw Error('Baked light page size mismatch: '+id);
          pages[id]={...p,image};
        }),
      ]);
      let baked=0;for(let i=0;i<coords.length;i+=2)if(coords[i]!==UNBAKED||coords[i+1]!==UNBAKED)baked++;
      if(!baked)throw Error('Baked light covers no vertices');
      return {uv:coords,bakedVertices:baked,pages:{day:{image:pages.day.image,scale:pages.day.scale},night:{image:pages.night.image,scale:pages.night.scale}}};
    })();
    const out=await Promise.race([work,new Promise((_,reject)=>abort.signal.addEventListener('abort',()=>reject(Error(signal?.aborted?'Baked light not needed any more':'Baked light timed out')),{once:true}))]);
    images.length=0;   // handed over: the caller owns them now
    return out;
  }catch(error){
    stop();            // one failure ends the other downloads
    throw error;
  }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',stop);
    // Anything decoded but not handed over is released at once.
    for(const image of images)image.close?.();
  }
}
