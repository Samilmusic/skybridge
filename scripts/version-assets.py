"""Version local browser assets so cached JavaScript cannot silently undo a release."""
from pathlib import Path
import hashlib,re,json
root=Path(__file__).resolve().parents[1]
pattern=re.compile(r'((?:src|href)=["\'])([^"\']+)(["\'])')
assets={p.name:hashlib.sha256(p.read_bytes()).hexdigest()[:12] for p in root.iterdir() if p.suffix in {'.js','.css'}}
for p in root.glob('*.html'):
 def version(m):
  value=m[2];path=value.split('?',1)[0]
  if path in assets:return m[1]+path+'?v='+assets[path]+m[3]
  return m[0]
 s=pattern.sub(version,p.read_text());p.write_text(s)
(root/'release.json').write_text(json.dumps({'assets':assets},sort_keys=True,indent=2)+'\n')
print('Versioned',len(assets),'local assets in every HTML entrypoint')
