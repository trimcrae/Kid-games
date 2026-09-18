"""Encode reviewed built-in image outputs as WebP without cropping or repainting.

Usage: python tools/pack-adventure-art.py /path/to/reviewed-batch.json
The batch is a list of source, storyId, nodeId, prompt, references, and review.
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'games/adventure/art/generated'
inventory = json.loads((OUT / 'inventory.json').read_text(encoding='utf-8'))
jobs = {(j['storyId'], j['nodeId']): j for j in inventory}
batch = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
if shutil.disk_usage(OUT).free < 10 * 1024**3 + 50 * 1024**2:
    raise SystemExit('Insufficient free space above the 10 GiB reserve.')
(OUT / 'receipts').mkdir(exist_ok=True)
for item in batch:
    job = jobs[(item['storyId'], item['nodeId'])]
    if not item.get('review'):
        raise ValueError('A visual review is required.')
    target = OUT / job['file']
    if target.exists():
        raise FileExistsError(target)
    source = Path(item['source'])
    with Image.open(source) as original:
        original.load()
        if original.width < 1000 or original.height < 700:
            raise ValueError(f'Image too small: {source.name}')
        original.convert('RGB').save(target, 'WEBP', quality=90, method=6)
        dimensions = [original.width, original.height]
    with Image.open(target) as encoded:
        encoded.load()
        assert list(encoded.size) == dimensions
    receipt = {
        'storyId': job['storyId'], 'nodeId': job['nodeId'], 'style': job['style'],
        'sourceHash': job['sourceHash'], 'generator': 'Codex built-in OpenAI image tool',
        'originalFile': source.name, 'originalSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'file': job['file'], 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'dimensions': dimensions, 'encoding': 'WebP quality 90; no crop or resize',
        'prompt': item['prompt'], 'references': item['references'],
        'reviewed': True, 'review': item['review']
    }
    (OUT / 'receipts' / (target.stem + '.json')).write_text(
        json.dumps(receipt, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{target.name}: {target.stat().st_size:,} bytes')
