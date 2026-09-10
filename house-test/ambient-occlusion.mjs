// Optional export sidecar. Reject stale/mismatched AO before it reaches GPU
// attributes; old manifests do not make a request or need a fallback buffer.
async function sha256(bytes){
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
}

export async function loadHouseOcclusion(data,binary,fetcher=globalThis.fetch){
  const d=data.ambientOcclusion;if(!d)return null;
  if(d.url!=='house.ao.gz'||d.encoding!=='uint8'
    ||!Number.isInteger(d.vertexCount)||d.vertexCount<1
    ||!Number.isFinite(d.strength)||d.strength<0||d.strength>.5
    ||!/^[a-f0-9]{64}$/.test(d.sha256)||d.meshSha256!==data.meshSha256){
    throw Error('Invalid ambient occlusion descriptor');
  }
  let count=0;
  for(const group of data.groups){
    if(!Number.isInteger(group.count)||group.count<0||group.offset!==count*24)
      throw Error('Ambient occlusion group coverage does not match mesh');
    count+=group.count;
  }
  if(count!==d.vertexCount||binary.byteLength!==count*24)
    throw Error('Ambient occlusion vertex count does not match mesh');
  if(await sha256(binary)!==d.meshSha256)
    throw Error('Ambient occlusion belongs to a different mesh');
  const response=await fetcher('./'+d.url);
  if(!response.ok||!response.body)throw Error('Ambient occlusion sidecar unavailable');
  const bytes=new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(bytes.length!==count)throw Error('Ambient occlusion byte count does not match mesh');
  if(await sha256(bytes)!==d.sha256)throw Error('Ambient occlusion checksum mismatch');
  return {bytes,strength:d.strength};
}
