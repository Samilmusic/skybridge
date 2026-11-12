from pathlib import Path
import shutil
root=Path(__file__).parent
import subprocess
subprocess.run(['python',str(root/'scripts/version-assets.py')],check=True)
out=root/'dist';out.mkdir(exist_ok=True)
for p in out.iterdir():
 if p.is_file():p.unlink()
 elif p.is_dir():shutil.rmtree(p)
for p in root.iterdir():
 if p.is_file() and (p.suffix in {'.html','.js','.css','.xml','.txt'} or p.name in {'.htaccess','release.json'}) and p.name not in {'config.example.js'}:shutil.copy2(p,out/p.name)
shutil.copytree(root/'assets',out/'assets',dirs_exist_ok=True)
print('Built',len(list(out.rglob('*'))),'public files')
