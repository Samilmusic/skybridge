from pathlib import Path
from html.parser import HTMLParser
import re,subprocess,urllib.parse
r=Path(__file__).resolve().parents[1];errors=[]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.scripts=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id'in d:self.ids.append(d['id'])
  if t in ['a','script','link','img']:
   v=d.get('src') or d.get('href')
   if v:self.links.append(v)
for p in r.glob('*.html'):
 parser=Page();s=p.read_text();parser.feed(s)
 if len(set(parser.ids))!=len(parser.ids):errors.append(p.name+': duplicate IDs')
 for v in parser.links:
  u=urllib.parse.urlsplit(v)
  if u.scheme or u.netloc or not u.path:continue
  target=r/urllib.parse.unquote(u.path)
  if not target.exists():errors.append(p.name+': missing '+u.path)
 if p.name not in ['admin.html','reset-password.html'] and '<link rel="canonical"' not in s:errors.append(p.name+': no canonical')
 if 'mailto:?' in s:errors.append(p.name+': mail draft without recipient')
for p in r.glob('*.js'):
 result=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if result.returncode:errors.append(result.stderr)
# Regressions that affected the original customer journey.
assert 'passport,residence' in (r/'visa-portal.js').read_text()
assert 'submit_visa_request' in (r/'visa-portal.js').read_text()
assert 'ui.loading)return' in (r/'visa-portal.js').read_text()
assert 'window.supabase.createClient' not in (r/'app.js').read_text()
assert 'Estimated total:' not in (r/'fun.js').read_text()
assert 'This report does not contain' not in (r/'fun.js').read_text()
assert 'mailto:' not in (r/'fun.js').read_text()
assert 'sb-menu-toggle' in (r/'index.html').read_text()
assert 'sb-mobile-menu' in (r/'index.html').read_text()
if errors:raise SystemExit('\n'.join(errors))
print('PASS: public links, unique IDs, JavaScript syntax, metadata and customer journey regression checks')
