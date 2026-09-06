"""Call the official hosted TRELLIS.2 demo; no model runs on this computer.

The input is sent to the selected hosted service. Its documented policy is
temporary session storage. Keep the client alive through GLB extraction.
"""
import argparse
import json
from pathlib import Path
import shutil
import time
from gradio_client import Client, handle_file

p=argparse.ArgumentParser()
p.add_argument('--image',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--resolution',default='1024',choices=['512','1024','1536'])
args=p.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
state={'service':'microsoft/TRELLIS.2','resolution':args.resolution,'seed':7629}
def save(stage,**details):
    state.update(stage=stage,updated=time.time(),**details)
    (args.output/'job.json').write_text(json.dumps(state,indent=2)+'\n')
    print(stage,details,flush=True)
def run(client,api,*values):
    save('submitting '+api)
    job=client.submit(*values,api_name=api)
    while not job.done():
        status=job.status()
        save('waiting '+api,status=str(status))
        time.sleep(20)
    result=job.result()
    save('completed '+api)
    return result

try:
    save('connecting')
    client=Client('microsoft/TRELLIS.2',download_files=str(args.output/'downloads'))
    run(client,'/start_session')
    prepared=run(client,'/preprocess_image',handle_file(str(args.image.resolve())))
    save('prepared reference',prepared=str(prepared))
    result=run(client,'/image_to_3d',handle_file(prepared),7629,args.resolution,
               7.5,.7,12,5.0,7.5,.5,12,3.0,1.0,0.0,12,3.0)
    (args.output/'preview.html').write_text(result,encoding='utf-8')
    result=run(client,'/extract_glb',300000,2048)
    paths=result if isinstance(result,(list,tuple)) else [result]
    glb=next(Path(p) for p in paths if str(p).endswith('.glb'))
    shutil.copy2(glb,args.output/'person.glb')
    save('complete',glb=str(args.output/'person.glb'),bytes=(args.output/'person.glb').stat().st_size)
except Exception as exc:
    save('failed',error=type(exc).__name__+': '+str(exc))
    raise
