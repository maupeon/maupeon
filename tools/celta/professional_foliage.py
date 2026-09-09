"""Adapt CC0 photographed/authored Poly Haven foliage for Celta's mobile GLB.

Pachira Aquatica, Anthurium Botany and Fern 02 by Rob Tuytel (scanning) / Rico Cilliers
(modeling): https://polyhaven.com/a/pachira_aquatica_01 and
https://polyhaven.com/a/anthurium_botany_01 . CC0-1.0, see assets provenance.
Compatibility names Palm* identify legacy placement slots, not plant taxonomy.
All surfaces and topology originate from these professional botanical assets.
"""
import bpy,math,json,os,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'tools/celta/assets/foliage-professional'
OUT=Path(os.environ.get('CELTA_FOLIAGE_OUTPUT',str(ROOT/'.dream-loop/v2/professional/foliage/stage')))
OUT.mkdir(parents=True,exist_ok=True)
# Accepted round13 placement envelopes in game metres.
PLACEMENT_BOUNDS={'BroadleafA': [[-0.7981, 0.015, -0.9308], [0.9049, 0.9627, 1.2384]],
 'BroadleafALow': [[-0.7983, 0.015, -0.9308], [0.9052, 0.9624, 1.2384]],
 'BroadleafB': [[-0.8576, 0.015, -0.7873], [0.7434, 0.9815, 0.7243]],
 'BroadleafBLow': [[-0.8574, 0.015, -0.7884], [0.7435, 0.9793, 0.7246]],
 'BroadleafC': [[-0.8511, 0.015, -1.056], [0.6544, 0.9629, 0.8842]],
 'BroadleafCLow': [[-0.8508, 0.015, -1.0562], [0.6544, 0.9618, 0.885]],
 'ShrubA': [[-0.4294, 0.015, -0.6689], [0.7412, 1.027, 0.4396]],
 'ShrubALow': [[-0.4297, 0.015, -0.6732], [0.7416, 1.0349, 0.4387]],
 'ShrubB': [[-0.433, 0.015, -0.342], [0.721, 1.1029, 0.5887]],
 'ShrubBLow': [[-0.433, 0.015, -0.342], [0.7219, 1.1027, 0.5887]],
 'ShrubC': [[-0.6276, 0.015, -0.8248], [0.828, 1.0615, 0.4995]],
 'ShrubCLow': [[-0.6107, 0.015, -0.823], [0.824, 1.0713, 0.519]]}

def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for block in list(bpy.data.materials):bpy.data.materials.remove(block)

def append(slug):
 source=SOURCE/slug/(slug+'_1k.blend')
 with bpy.data.libraries.load(str(source),link=False) as (a,b):b.objects=a.objects
 objects={o.name:o for o in b.objects if o}
 for ob in objects.values():bpy.context.collection.objects.link(ob)
 for im in bpy.data.images:
  if im.library:continue
  candidate=SOURCE/slug/'textures'/Path(im.filepath).name
  if candidate.exists():im.filepath=str(candidate);im.reload();im.pack()
 return objects

def image(slug,suffix):
 folder=SOURCE/slug/'textures';paths=list(folder.glob(slug+'_'+suffix+'_1k.*'));assert len(paths)==1,paths
 im=bpy.data.images.load(str(paths[0]),check_existing=True);im.pack()
 im.colorspace_settings.name='sRGB' if suffix.endswith('diff') else 'Non-Color'
 return im

def material(name,slug,prefix='',leaf=True):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=not leaf
 m.surface_render_method='DITHERED';n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF')
 b.inputs['Specular IOR Level'].default_value=.32 if leaf else .2
 for suffix,input in [('diff','Base Color'),('rough','Roughness')]:
  tex=n.new('ShaderNodeTexImage');tex.image=image(slug,prefix+suffix);l.new(tex.outputs['Color'],b.inputs[input])
 normal=n.new('ShaderNodeTexImage');normal.image=image(slug,prefix+'nor_gl');nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.7 if leaf else .8;l.new(normal.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],b.inputs['Normal'])
 if leaf:
  alpha=n.new('ShaderNodeTexImage');alpha.image=image(slug,prefix+'alpha');l.new(alpha.outputs['Color'],b.inputs['Alpha'])
 m['source']='https://polyhaven.com/a/'+slug;m['license']='CC0-1.0'
 if leaf and slug!='fern_02':
  m['backfaceAlbedoFactor']=.62;m['backfaceSpecularFactor']=.35;m['roughnessFloor']=.46;m['roughnessSpan']=.42;m['frontSpecularFactor']=.8
 return m

def leaf_components(mesh):
 adjacency=[[]for v in mesh.vertices]
 for edge in mesh.edges:
  a,b=edge.vertices;adjacency[a].append(b);adjacency[b].append(a)
 seen=set();result=[]
 for first in range(len(adjacency)):
  if first in seen:continue
  component=[];stack=[first];seen.add(first)
  while stack:
   i=stack.pop();component.append(i)
   for neighbor in adjacency[i]:
    if neighbor not in seen:seen.add(neighbor);stack.append(neighbor)
  result.append(component)
 return result

def articulate_scan_leaves(ob,category,variation):
 """Fold each authored leaf independently using its UV midrib coordinates.

 Original image pixels and UVs stay intact. Curvature changes vertex positions
 and physically recomputed normals; no painted highlights or dark strokes.
 """
 import numpy as np
 mesh=ob.data;mesh.update()
 uv=np.zeros((len(mesh.vertices),2));hits=np.zeros(len(mesh.vertices))
 for loop in mesh.loops:
  uv[loop.vertex_index]+=mesh.uv_layers.active.data[loop.index].uv;hits[loop.vertex_index]+=1
 uv/=np.maximum(hits[:,None],1)
 changes=0
 for part,ids in enumerate(leaf_components(mesh)):
  if len(ids)<20:continue
  points=np.array([tuple(mesh.vertices[i].co)for i in ids]);tex=uv[ids]
  center=tex.mean(0);eigen,vectors=np.linalg.eigh(np.cov((tex-center).T));long_axis=vectors[:,-1];cross_axis=np.array([-long_axis[1],long_axis[0]])
  along=(tex-center)@long_axis;cross=(tex-center)@cross_axis
  if along.max()-along.min()<.03:continue
  t=(along-along.min())/(along.max()-along.min())
  base=points[t<.08].mean(0);tip=points[t>.92].mean(0)
  if np.linalg.norm(base)>np.linalg.norm(tip):long_axis=-long_axis;cross_axis=-cross_axis;along=-along;cross=-cross;t=1-t;base,tip=tip,base
  length=np.linalg.norm(tip-base)
  if length<.055:continue
  # Nine measured stations track the actual curved centerline in the scan's UV
  # silhouette. Nearest-station normals include the original sculpted curvature.
  stations=[]
  for q in np.linspace(0,1,13):
   near=np.argsort(np.abs(t-q))[:max(3,len(ids)//16)]
   left=near[np.argmin(cross[near])];right=near[np.argmax(cross[near])]
   width=points[right]-points[left];width_len=np.linalg.norm(width)
   if width_len<.0001:continue
   mid=(points[left]+points[right])*.5;mid_uv=(cross[left]+cross[right])*.5
   reference_normal=np.array([tuple(mesh.vertices[ids[int(i)]].normal)for i in near]).mean(0)
   stations.append((q,mid,width/width_len,width_len,mid_uv,max(abs(cross[right]-cross[left])*.5,.0001),reference_normal))
  if len(stations)<4:continue
  seed=part*17+variation*31
  hand=1 if seed%2 else -1
  broad=category=='Broadleaf'
  fold_angle=(.72+.12*math.sin(seed*1.73)) if broad else (.34+.16*math.sin(seed*1.73))
  twist=(.12+.09*math.sin(seed*.93))*hand
  droop=(.025+.028*(.5+.5*math.cos(seed*1.1))) if broad else (.016+.025*(.5+.5*math.cos(seed*1.1)))
  for vertex,ti,lati,p in zip(ids,t,cross,points):
   q=float(ti);k=next((k for k in range(len(stations)-1)if stations[k][0]<=q<=stations[k+1][0]),len(stations)-2)
   a,b=stations[k],stations[k+1];f=max(0,min(1,(q-a[0])/max(b[0]-a[0],1e-9)))
   mid=a[1]*(1-f)+b[1]*f;across=a[2]*(1-f)+b[2]*f;across/=max(np.linalg.norm(across),.0001)
   width=a[3]*(1-f)+b[3]*f;miduv=a[4]*(1-f)+b[4]*f;uvhalf=a[5]*(1-f)+b[5]*f
   ta=stations[min(len(stations)-1,k+1)][1]-stations[max(0,k-1)][1]
   tb=stations[min(len(stations)-1,k+2)][1]-stations[k][1]
   tangent=ta*(1-f)+tb*f;norm=np.linalg.norm(tangent)
   if norm<.0001:continue
   tangent/=norm;normal=np.cross(tangent,across);normal/=max(np.linalg.norm(normal),.0001)
   # The original mesh winding defines the leaf top, independent of its pose.
   source_normal=a[6]*(1-f)+b[6]*f
   if np.dot(normal,source_normal)<0:normal=-normal
   lateral=(float(lati)-miduv)/uvhalf
   envelope=math.sin(math.pi*max(0,min(1,q)))**.7
   edge=max(0,(hand*lateral-.12)/.88)
   angle=fold_angle*min(1.2,edge)*envelope
   # A one-sided hinge folds the edge toward the top, while the opposite edge
   # remains broad and calm. This forms a readable turned band, not a full curl.
   side_distance=hand*max(0,hand*float(np.dot(p-mid,across)))
   delta=across*(side_distance*(math.cos(angle)-1))+normal*(abs(side_distance)*math.sin(angle))
   delta+=normal*(float(np.dot(p-mid,across))*twist*math.sin(q*math.pi))
   delta+=np.array([0,0,-length*droop*(q*q)])
   mesh.vertices[vertex].co=Vector(p+delta)
  changes+=1
 mesh.update();ob['articulatedLeaves']=changes;return changes

def preserve_placement_envelopes(roots):
 bounds=PLACEMENT_BOUNDS
 for root in roots:
  if not root.name.startswith(('Broadleaf','Shrub')):continue
  minimum,maximum=bounds[root.name]
  desired_low=(minimum[0],-maximum[2],minimum[1]);desired_high=(maximum[0],-minimum[2],maximum[1])
  vertices=[v for child in root.children for v in child.data.vertices]
  low=[min(v.co[a]for v in vertices)for a in range(3)];high=[max(v.co[a]for v in vertices)for a in range(3)]
  for v in vertices:
   for a in range(3):v.co[a]=desired_low[a]+(v.co[a]-low[a])/max(high[a]-low[a],1e-9)*(desired_high[a]-desired_low[a])
  for child in root.children:child.data.update()


def clone(source,parent,name,mat,scale,rotation,origin,lod=False,target=None):
 ob=source.copy();ob.data=source.data.copy();bpy.context.collection.objects.link(ob);ob.name=name
 bpy.context.view_layer.objects.active=ob;ob.select_set(True)
 # One authored subdivision pass rounds the original broad-leaf midribs. The
 # original photographic displacement remains at its original physical scale.
 for mod in ob.modifiers:
  if mod.type=='SUBSURF':mod.levels=1;mod.render_levels=1
 for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 matrix=ob.matrix_world.copy();rot=Matrix.Rotation(rotation,4,'Z')
 for v in ob.data.vertices:
  p=matrix@v.co-origin;v.co=rot@Vector((p.x*scale[0],p.y*scale[1],p.z*scale[2]))
 ob.matrix_world=Matrix.Identity(4);ob.parent=parent
 ob.data.materials.clear();ob.data.materials.append(mat)
 if parent.name.startswith(('Broadleaf','Shrub')) and 'professional_leaves' in name:
  articulate_scan_leaves(ob,'Broadleaf' if parent.name.startswith('Broadleaf') else 'Shrub',ord(parent.name.replace('Low','')[-1])-65)
 if target:
  count=sum(len(f.vertices)-2 for f in ob.data.polygons)
  if count>target:
   mod=ob.modifiers.new('Mobile silhouette preservation' if lod else 'Real time topology','DECIMATE');mod.ratio=target/count;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 for face in ob.data.polygons:face.use_smooth=True
 # Color attributes are required by Celta's merged scatter batches. They do not
 # repaint or tint the professional scan; every vertex retains white modulation.
 col=ob.data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
 for color in col.data:color.color=(1,1,1,1)
 if ob.data.uv_layers:ob.data.uv_layers.active.name='UVMap'
 ob.select_set(False);return ob

def metadata(roots):
 result={}
 for root in roots:
  points=[Vector((v.co.x,v.co.z,-v.co.y)) for ob in root.children for v in ob.data.vertices]
  result[root.name]={'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children),'meshes':len(root.children),'bounds':[[round(min(p[a] for p in points),4)for a in range(3)],[round(max(p[a] for p in points),4)for a in range(3)]],'radius':round(max(math.hypot(p.x,p.z)for p in points),4),'botanicalSource':('Original Celta long palm' if root.name.startswith('LongPalm') else 'Fern 02' if root.name.startswith('Palm') else 'Anthurium Botany 01' if root.name.startswith('Broadleaf') else 'Pachira Aquatica 01')}
 return result

def point_camera(camera,target):camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()

def render_import():
 clear();bpy.ops.import_scene.gltf(filepath=str(OUT/'foliage.glb'))
 roots=[o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name in ['PalmA','PalmB','PalmC','BroadleafA','BroadleafB','BroadleafC','ShrubA','ShrubB','ShrubC','CanopySpray','LongPalmA']]
 for ob in bpy.context.scene.objects:
  if ob.name.endswith('Low') or (ob.parent and ob.parent.name.endswith('Low')):ob.hide_render=True
 for root in roots:
  root.location=(0,0,0)
  for ob in [root]+list(root.children_recursive):ob.hide_render=True
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.render.threads_mode='FIXED';scene.render.threads=4
 scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.31,.37,.43,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008));ground=bpy.context.object
 gm=bpy.data.materials.new('Preview ground');gm.use_nodes=True;gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.055,.065,.045,1);gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;ground.data.materials.append(gm)
 for name,loc,power,size,color in [('Soft sun',(-3,-4,6),900,3,(1,.85,.62)),('Sky fill',(3,1,4),550,5,(.62,.75,1))]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc;point_camera(ob,(0,0,.5))
 camera=bpy.data.objects.new('Verification camera',bpy.data.cameras.new('Camera'));scene.collection.objects.link(camera);scene.camera=camera;camera.data.lens=58
 for name in os.environ.get('CELTA_FOLIAGE_RENDER_NAMES','PalmA,BroadleafA,ShrubA').split(','):
  root=bpy.data.objects[name]
  for ob in [root]+list(root.children_recursive):ob.hide_render=False
  camera.location=(3,-4.3,2.6);point_camera(camera,(0,0,.5));camera.data.lens=62
  scene.render.filepath=str(OUT/(name+'-export-full.png'));bpy.ops.render.render(write_still=True)
  camera.location=(1.6,-2.2,1.45);point_camera(camera,(0,0,.6));camera.data.lens=90
  scene.render.filepath=str(OUT/(name+'-export-detail.png'));bpy.ops.render.render(write_still=True)
  for ob in [root]+list(root.children_recursive):ob.hide_render=True

def set_alpha_mask(path):
 # Blender 5.2 DITHERED exports BLEND; web foliage requires depth-writing MASK.
 # Only glTF material metadata changes; image bytes and geometric data remain intact.
 data=path.read_bytes();length,kind=struct.unpack_from('<II',data,12);doc=json.loads(data[20:20+length]);binary=data[20+length:]
 for material in doc['materials']:
  if 'rachis' not in material['name']:material['alphaMode']='MASK';material['alphaCutoff']=.52 if material['name']=='Foliage_palm' else .5;material['doubleSided']=True
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)

def original_long_palms():
 # Preserve just the two long-frond silhouettes requested for the shoreline.
 path=SOURCE.parent/'foliage-original-palms.blend'
 with bpy.data.libraries.load(str(path),link=False) as (available,loaded):
  names=list(available.objects);loaded.objects=names.copy()
 mapping=dict(zip(names,loaded.objects));roots=[]
 for name,ob in mapping.items():
  if ob is None:continue
  bpy.context.collection.objects.link(ob);ob.hide_set(False);ob.hide_viewport=False;ob.hide_render=False
  ob.name='Long'+name
  if name in ['PalmA','PalmALow']:
   ob['source']='Original Celta Blender foliage and original generated palm texture';ob['license']='Project original asset';roots.append(ob)
 return roots

def main():
 clear();pachira=append('pachira_aquatica_01');anthurium=append('anthurium_botany_01');fern=append('fern_02')
 mats=[material('Foliage_broadleaf_anthurium','anthurium_botany_01'),material('Foliage_broadleaf_pachira','pachira_aquatica_01','leaves_'),material('Foliage_rachis_pachira','pachira_aquatica_01','bark_',False),material('Foliage_fern_scan','fern_02')]
 roots=[]
 for low in [False,True]:
  for i,code in enumerate('ABC'):
   name='Broadleaf'+code+('Low' if low else '');root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
   src=anthurium['anthurium_botany_01_'+code.lower()];scale=[1.9,2.05,2.65][i];origin=src.location.copy()
   clone(src,root,name+'_professional_leaves',mats[0],(scale,scale,scale),[.0,.8,-.5][i],origin,low,700 if low else 3400)
  for i,code in enumerate('ABC'):
   name='Palm'+code+('Low' if low else '');root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
   src=fern['fern_02_'+['b','c','a'][i]];origin=src.location.copy();scale=[(3.05,3.05,2.2),(3.3,3.3,2.8),(4.5,4.5,3.25)][i]
   clone(src,root,name+'_professional_fronds',mats[3],scale,[0,.6,-.4][i],origin,low,([450,450,240][i] if low else 3000))
  for i,code in enumerate('ABC'):
   name='Shrub'+code+('Low' if low else '');root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
   # Variant a has a nursery-braided trunk; exclude it from jungle vegetation.
   letter=['c','b','d'][i];src=pachira['pachira_aquatica_01_leaves_'+letter];origin=pachira['pachira_aquatica_01_bark_'+letter].location.copy()
   scale=[(1.2,1.2,.88),(1.8,1.8,1.48),(1.4,1.4,.55)][i]
   clone(src,root,name+'_professional_leaves',mats[1],scale,[0,.6,-.3][i],origin,low,1198 if low else 4800)
   clone(pachira['pachira_aquatica_01_bark_'+letter],root,name+'_professional_stems',mats[2],scale,[0,.6,-.3][i],origin,low,120 if low else 450)
  name='CanopySpray'+('Low' if low else '');root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
  src=pachira['pachira_aquatica_01_leaves_b'];origin=pachira['pachira_aquatica_01_bark_b'].location.copy()
  clone(src,root,name+'_professional_leaf_spray',mats[1],(2.5,2.5,1.5),0,origin,low,250 if low else 950)
 for ob in list(pachira.values())+list(anthurium.values())+list(fern.values()):bpy.data.objects.remove(ob,do_unlink=True)
 # Each model is an individual ground-centred plant, with no library preview
 # layout offset and no parent transform. Ground stems are rooted at y=0.015.
 for root in roots:
  floor=min(v.co.z for o in root.children for v in o.data.vertices)
  for ob in root.children:
   for v in ob.data.vertices:v.co.z-=floor-.015
  root['source']='https://polyhaven.com/a/'+('fern_02' if root.name.startswith('Palm') else 'anthurium_botany_01' if root.name.startswith('Broadleaf') else 'pachira_aquatica_01');root['license']='CC0-1.0'
 preserve_placement_envelopes(roots)
 legacy=original_long_palms();roots+=legacy
 for root in legacy:
  for child in root.children:
   for legacy_material in child.data.materials:
    if legacy_material not in mats:mats.append(legacy_material)
 bpy.ops.object.select_all(action='DESELECT')
 for root in roots:
  root.select_set(True)
  for child in root.children:child.select_set(True)
 bpy.context.view_layer.objects.active=roots[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/'foliage.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_materials='EXPORT',export_image_format='JPEG',export_jpeg_quality=90,export_cameras=False,export_lights=False,export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False,export_extras=True)
 set_alpha_mask(OUT/'foliage.glb')
 variants=metadata(roots);detail=sum(x['triangles']for n,x in variants.items()if not n.endswith('Low'));mobile=sum(x['triangles']for n,x in variants.items()if n.endswith('Low'))
 output={'source':'tools/celta/professional_foliage.py','blend':'tools/celta/blend/foliage.blend','file':'/celta/models/foliage.glb','bytes':(OUT/'foliage.glb').stat().st_size,'coordinateSystem':'Three.js Y-up; metres; every named root at local ground origin','triangles':detail+mobile,'detailTriangles':detail,'mobileTriangles':mobile,'mobileTriangleReduction':round(1-mobile/detail,4),'variants':variants,'materials':[m.name for m in mats],'alphaMode':'MASK','alphaCutoff':.5,'doubleSided':True,'originalLongPalms':['LongPalmA','LongPalmALow'],'compatibilityNames':'Palm* are legacy pinnate placement slots now occupied by professional Fern 02; Broadleaf* are Anthurium; Shrub* and CanopySpray* are Pachira. LongPalmA/Low preserves the original Celta long-frond asset for two composed shoreline plants. These names are placement contracts, not botanical claims.','provenance':'tools/celta/assets/foliage-professional/provenance.json','credits':'Pachira Aquatica 01, Anthurium Botany 01 and Fern 02: Rob Tuytel (scanning), Rico Cilliers (modeling), Poly Haven, CC0-1.0.'}
 for n,v in variants.items():
  if n.endswith('Low'):v['lodOf']=n[:-3];v['triangleReduction']=round(1-v['triangles']/variants[n[:-3]]['triangles'],4)
 for n,v in variants.items():
  if n.endswith('Low'):assert v['triangleReduction']>=.60,(n,v['triangleReduction'])
 assert detail+mobile<=72099
 assert mobile<=17333
 (OUT/'foliage.json').write_text(json.dumps(output,indent=2))
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'foliage.blend'),compress=True)
 print('FOLIAGE_READY '+json.dumps(output),flush=True)
 if os.environ.get('CELTA_FOLIAGE_RENDER')=='1':render_import()
if __name__=='__main__':main()
