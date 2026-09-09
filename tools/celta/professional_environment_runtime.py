"""Compress staged Blender surfaces and resample final floor contacts.
Run with system Python from repository root after professional_environments.py.
"""
import ast,json,pathlib,subprocess,shutil,sys,argparse
ROOT=pathlib.Path(__file__).resolve().parents[2]
STAGE=ROOT/'.dream-loop/v2/professional/world/stage'
BASE_WORLDS=ROOT/'public/celta/models/worlds.json'
CLI=[shutil.which('npx'),'--yes','@gltf-transform/cli@4.2.1']

def run(region):
 src=STAGE/f'{region}-validation.glb';small=STAGE/f'{region}-small.glb';rough=STAGE/f'{region}-rough-small.glb';webp=STAGE/f'{region}-webp.glb';pruned=STAGE/f'{region}-pruned.glb';out=STAGE/f'{region}.glb'
 for args in [
  ['resize',str(src),str(small),'--pattern','*_nor_gl_*','--width','1024','--height','1024'],
  ['resize',str(small),str(rough),'--pattern','*_rough_*','--width','1024','--height','1024'],
  ['webp',str(rough),str(webp),'--quality','86','--effort','60'],
  ['prune',str(webp),str(pruned),'--keep-attributes','false'],
  ['meshopt',str(pruned),str(out),'--level','high','--quantize-position','16','--quantize-normal','10','--quantize-texcoord','14','--quantization-volume','scene']]:
  subprocess.run(CLI+args,check=True,cwd=ROOT)
 worlds=json.loads((STAGE/'worlds.json' if (STAGE/'worlds.json').exists() else BASE_WORLDS).read_text())
 original=json.loads(BASE_WORLDS.read_text())[region]
 r=json.loads((STAGE/f'{region}-materials.json').read_text());w=worlds[region]=original
 w['mesh'].update(triangles=r['triangles'],drawCalls=r['materialBatches'],bytes=out.stat().st_size,professionalMaterials=r['professionalMaterials'],uncompressedBytes=r['uncompressedBytes'])
 w['mesh']['compression']['extensions']=['EXT_meshopt_compression','KHR_mesh_quantization','EXT_texture_webp'];w['mesh']['textureCompression']={'format':'WebP','quality':86,'effort':60,'normalAndRoughnessMaximum':1024,'diffuseMaximum':2048,'sourceMaps':'Original Poly Haven CC0 JPGs packed in editable blend'}
 (STAGE/'worlds.json').write_text(json.dumps(worlds,separators=(',',':')))
 if region=='congo':
  module=ast.parse((ROOT/'tools/celta/environments.py').read_text());source=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='QUANTIZED_GRID_SCRIPT' for t in n.targets))
  source=source.replace("const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');","const root=process.cwd();")
  source=source.replace("path.join(root,'public/celta/models/worlds.json')",json.dumps(str(STAGE/'worlds.json')))
  source=source.replace("path.join(root,'public/celta/models/congo.glb')",json.dumps(str(STAGE/'congo.glb')))
  source=source.replace("['Laterite','WornLaterite','BankMud','Timber']","['PH_Laterite','PH_WornLaterite','PH_BankMud','PH_Timber','PH_EmbeddedStones','PH_RootWood','PH_LeafLitter']").replace("==='Timber'","==='PH_Timber'")
  source=source.replace('Final meshopt-quantized Laterite, WornLaterite, BankMud and Timber floor triangles','Final meshopt-quantized PH_Laterite, PH_WornLaterite, PH_BankMud, PH_Timber, PH_EmbeddedStones, PH_RootWood and PH_LeafLitter contact triangles')
  source=source.replace("path.join(root,'.dream-loop/v2/environment-previews/congo-quantized-grid-report.json')",json.dumps(str(STAGE/'congo-contact-report.json')))
  (STAGE/'quantized-grid.mjs').write_text(source)
  subprocess.run([shutil.which('node'),'--no-warnings',str(STAGE/'quantized-grid.mjs')],check=True,cwd=ROOT)
 print('RUNTIME',region,out.stat().st_size,flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('regions',nargs='*',default=['congo']);parser.add_argument('--output-dir',type=pathlib.Path,default=STAGE);parser.add_argument('--base-worlds',type=pathlib.Path,default=BASE_WORLDS)
 args=parser.parse_args();STAGE=args.output_dir.resolve();BASE_WORLDS=args.base_worlds.resolve();STAGE.mkdir(parents=True,exist_ok=True)
 for region in args.regions or ['congo']:run(region)
