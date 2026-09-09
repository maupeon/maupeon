"""CC0 Poly Haven surface integration for the authored Celta landscapes.

Run Blender -b --python tools/celta/professional_environments.py -- congo
Use --roof-bark-only --source-dir PREVIOUS_STAGE --output-dir NEW_STAGE to
rebuild only those surfaces while preserving the previous round for review.
Original, byte-identical JPEG maps live in tools/celta/assets/environment.
The source meshes, navigation and mission layout remain authored for the game.
"""
import bpy, math, json, sys, os, hashlib, shutil, subprocess, importlib.util, struct, argparse
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'tools/celta/assets/environment'
WORK=ROOT/'.dream-loop/v2/professional/world'
STAGE=WORK/'stage';STAGE.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'tools/celta/blend'
BASE_WORLDS=ROOT/'public/celta/models/worlds.json'
STRUCTURAL_ONLY=False
RENDER_PREVIEW=True
FOUNDATION_BLEND=None
G=lambda p:Vector((p[0],-p[2],p[1]))
# Reflectance factors calibrate the physical maps, never retouch their pixels.
CONFIG={
 'EmbeddedStones':('red_dirt_mud_01',2,'soil',(.40,.53,.67),.65,1.0),
 'RootWood':('bark_brown_02',2,'root',(.46,.39,.29),.75,.97),
 'LeafLitter':('wood_planks_dirt',1,'litter',(.69,.55,.30),.25,1.0),
 'Laterite':('red_dirt_mud_01',2,'soil',(.286,.374,.495),.63,1.0),
 'WornLaterite':('red_dirt_mud_01',2,'soil',(.308,.4015,.517),.34,1.0),
 'BankMud':('red_dirt_mud_01',2,'soil',(.253,.341,.4675),.65,1.0),
 'Bark':('bark_brown_02',2,'bark',(.78,.72,.58),.85,.92),
 'BarkSculpt':('bark_brown_02',2,'bark',(.78,.72,.58),.85,.92),
 'RoofThatch':('thatch_roof_angled',2,'thatch',(.95,.82,.60),.72,1.0),
 'RoofThatchDark':('thatch_roof_angled',2,'thatch',(.91,.79,.60),.62,1.0),
 'Thatch':('thatch_roof_angled',2,'thatch',(.76,.76,.52),.63,1.0),
 'Timber':('wood_planks_dirt',1,'wood',(.85,.78,.68),.34,.94),
 'DarkTimber':('wood_planks_dirt',1,'wood',(.52,.48,.40),.34,.94),
 'WallBoards':('wood_planks_grey',1,'wood',(1.0,.87,.66),.40,.97),
 'Driftwood':('wood_planks_grey',1,'wood',(1.0,.95,.81),.40,.94),
}

def filehash(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def meshhash(ob):
 vals=np.empty(len(ob.data.vertices)*3,dtype=np.float32);ob.data.vertices.foreach_get('co',vals)
 return hashlib.sha256(vals.tobytes()).hexdigest()
def image(asset,kind,res):
 path=ASSETS/f'{asset}_{kind}_{res}k.jpg';im=bpy.data.images.load(str(path),check_existing=True)
 im.colorspace_settings.name='sRGB' if kind=='diff' else 'Non-Color';im.pack();return im

def surface(role,old):
 asset,res,kind,color,normal,rough=CONFIG[role];mat=bpy.data.materials.get('PH_'+role) or bpy.data.materials.new('PH_'+role);mat.use_nodes=True
 mat.node_tree.nodes.clear();shader=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
 mat['professionalAsset']=True;mat['surfaceRole']=kind;mat['originalRole']=role
 mat['source']='https://polyhaven.com/a/'+asset;mat['license']='CC0-1.0'
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 bs.inputs['Specular IOR Level'].default_value=.27 if kind=='soil' else .33
 tex=nodes.new('ShaderNodeTexImage');tex.image=image(asset,'diff',res)
 # This recognized glTF pattern preserves original image bytes and emits a
 # baseColorFactor. It keeps runtime consistent with the Blender source.
 mul=nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
 mul.inputs[2].default_value=(*color,1);links.new(tex.outputs['Color'],mul.inputs[1]);links.new(mul.outputs[0],bs.inputs['Base Color'])
 if role in ('BarkSculpt','BankMud','RoofThatchDark','EmbeddedStones','RootWood','LeafLitter'):
  vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Col'
  mult=nodes.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1
  links.new(mul.outputs[0],mult.inputs[1]);links.new(vc.outputs['Color'],mult.inputs[2]);links.new(mult.outputs[0],bs.inputs['Base Color'])
 tn=nodes.new('ShaderNodeTexImage');tn.image=image(asset,'nor_gl',res)
 nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal
 links.new(tn.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 tr=nodes.new('ShaderNodeTexImage');tr.image=image(asset,'rough',res)
 mult=nodes.new('ShaderNodeMath');mult.operation='MULTIPLY';mult.inputs[1].default_value=rough
 links.new(tr.outputs['Color'],mult.inputs[0]);links.new(mult.outputs[0],bs.inputs['Roughness'])
 return mat

def apply_uv(ob,role):
 # Detail topology is authored after the original UV scaling. Its physical
 # coordinates include subdivided and appended surfaces and must stay exact.
 if ob.get('professionalDetailUV'):return
 mesh=ob.data
 if not mesh.uv_layers:return
 layer=mesh.uv_layers.active
 if not mesh.uv_layers.get('AuthoredUV'):
  backup=mesh.uv_layers.new(name='AuthoredUV',do_init=True)
  mesh.uv_layers.active=layer
 else:
  backup=mesh.uv_layers['AuthoredUV'];vals=np.empty(len(backup.data)*2,dtype=np.float32)
  backup.data.foreach_get('uv',vals);layer.data.foreach_set('uv',vals)
 if ob.get('professionalBundleUV') or ob.get('professionalBoardsUV'):
  pass
 elif role in ('Bark','BarkSculpt'):
  for loop in layer.data:loop.uv*=.32
 elif role in ('Laterite','WornLaterite','BankMud'):
  # 1.5m source soil tile matches scan dimensions on horizontal land;
  # dominant-axis projection remains useful on the curved clay banks.
  for loop in layer.data:loop.uv*=1.333333333
 elif role=='RoofThatch':
  for loop in layer.data:loop.uv.x*=.90;loop.uv.y*=1.05
 elif role=='RoofThatchDark':
  for loop in layer.data:loop.uv*=.15
 elif role in ('Timber','DarkTimber','WallBoards','Driftwood'):
  # Keep fine longitudinal grain; avoid turning 10cm trim into miniature doors.
  for loop in layer.data:loop.uv.x*=.48;loop.uv.y*=.66
 mesh.uv_layers.active=layer;layer.active_render=True


def patch_export_factors(path):
    # Blender 5.2 legacy MixRGB factors are rendered correctly in the blend,
    # but its exporter omits them. Set the standard glTF factor explicitly.
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+size]);binary=raw[20+size:]
    for mat in doc.get('materials',[]):
        role=mat.get('extras',{}).get('originalRole')
        if role in CONFIG:mat['pbrMetallicRoughness']['baseColorFactor']=[*CONFIG[role][3],1]
    data=json.dumps(doc,separators=(',',':')).encode();data+=b' '*((-len(data))%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(data)+len(binary))+struct.pack('<I4s',len(data),b'JSON')+data+binary)

def bank_craft(ob):
 if ob.get('professionalErodedBank'):return
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
 # Close shallow shell details into soil, then union their intersections.
 # Rebuilding the surface removes the planar course topology rather than
 # disguising it with another stack of ornamental slabs.
 solid=ob.modifiers.new('Soil volume into riverbank','SOLIDIFY');solid.thickness=.085;solid.offset=-1
 bpy.ops.object.modifier_apply(modifier=solid.name)
 rem=ob.modifiers.new('Continuous eroded soil union','REMESH');rem.mode='VOXEL';rem.voxel_size=.040;rem.use_smooth_shade=True;rem.use_remove_disconnected=False
 bpy.ops.object.modifier_apply(modifier=rem.name)
 print('BANK_VOXEL',len(ob.data.vertices),flush=True)
 sm=ob.modifiers.new('Rounded compacted clay','SMOOTH');sm.factor=.38;sm.iterations=2
 bpy.ops.object.modifier_apply(modifier=sm.name)
 im=image('red_dirt_mud_01','disp',1);im.colorspace_settings.name='Non-Color'
 w,h=im.size;pixels=np.asarray(im.pixels[:],dtype=np.float32).reshape(h,w,4)[:,:,0];mean=float(pixels.mean())
 count=len(ob.data.vertices);co=np.empty(count*3,dtype=np.float32);norm=np.empty(count*3,dtype=np.float32)
 ob.data.vertices.foreach_get('co',co);ob.data.vertices.foreach_get('normal',norm);co=co.reshape(-1,3);norm=norm.reshape(-1,3)
 points=np.column_stack((co[:,0],co[:,2],-co[:,1]));normals=np.column_stack((norm[:,0],norm[:,2],-norm[:,1]));axes=np.argmax(np.abs(normals),axis=1)
 uv0=np.choose(axes,(points[:,2],points[:,0],points[:,0]));uv1=np.choose(axes,(points[:,1],points[:,2],points[:,1]))
 u=((uv0/1.5%1)*w).astype(int)%w;v=((uv1/1.5%1)*h).astype(int)%h
 displaced=co+norm*((pixels[v,u]-mean)*.11)[:,None];ob.data.vertices.foreach_set('co',displaced.reshape(-1))
 print('BANK_SCANNED_RELIEF',count,'vertices',flush=True)
 ob.data.update()
 tris=sum(len(p.vertices)-2 for p in ob.data.polygons)
 if tris>48000:
  dec=ob.modifiers.new('Mobile soil topology','DECIMATE');dec.ratio=48000/tris;dec.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=dec.name)
 mesh=ob.data
 for uv in list(mesh.uv_layers):mesh.uv_layers.remove(uv)
 uv=mesh.uv_layers.new(name='UVMap')
 for p in mesh.polygons:
  p.use_smooth=True;normal=Vector((p.normal.x,p.normal.z,-p.normal.y));axis=max(range(3),key=lambda k:abs(normal[k]));axes=((2,1),(0,2),(0,1))[axis]
  for li in p.loop_indices:
   co=mesh.vertices[mesh.loops[li].vertex_index].co;point=(co.x,co.z,-co.y)
   uv.data[li].uv=(point[axes[0]]*.5,point[axes[1]]*.5)
 for c in list(mesh.color_attributes):mesh.color_attributes.remove(c)
 col=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
 for v,d in zip(mesh.vertices,col.data):
  shade=.86+.14*max(0,v.normal.z);d.color=(shade,shade,shade,1)
 ob['professionalErodedBank']=True


def components(mesh):
 parent=list(range(len(mesh.vertices)))
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 for edge in mesh.edges:
  a,b=(find(i) for i in edge.vertices)
  if a!=b:parent[b]=a
 groups={}
 for i in range(len(parent)):groups.setdefault(find(i),[]).append(i)
 return list(groups.values())

def roof_bundles():
 import random
 top=bpy.data.objects['RoofThatch'];dark=bpy.data.objects['RoofThatchDark']
 if top.get('professionalSheavesV3'):return
 data={}
 for ob in (top,dark):
  mesh=ob.data;groups=components(mesh);retained=set()
  original_planes=[(-22,-27.15,-28.13,-15.87,7.78,5.13,False),(-22,-16.85,-28.13,-15.87,7.78,5.13,False),(-17.5,-14.1,-27.92,-16.08,5.18,4.66,False),(-7.5,-1.5,-18.7,-11.3,4.57,3.85,True)]
  for group in groups:
   if len(group)>100:continue
   mid=sum((mesh.vertices[i].co for i in group),Vector())/len(group);gx,gy,gz=mid.x,mid.z,-mid.y;matches=[]
   for x0,x1,z0,z1,y0,y1,swap in original_planes:
    along=gz if swap else gx;across=gx if swap else gz;t=(along-x0)/(x1-x0);error=abs(gy-(y0+(y1-y0)*t))
    if -.15<t<1.15 and z0-.35<across<z1+.35 and error<.45:matches.append((error,t,across-z0,z1-across))
   nearest=min(matches) if matches else None
   # The alpha eave is a separate untouched mesh. Retain only actual edge,
   # ridge and gable tufts here; old interior course ornaments would hover
   # above the new sheaves and recreate the former broad black patches.
   if not nearest or nearest[1]<.025 or min(nearest[2:])<.14:retained.update(group)
  uv=mesh.uv_layers.get('AuthoredUV') or mesh.uv_layers.active
  colors=mesh.color_attributes.get('Col');remap={};v=[];f=[];uvs=[];col=[]
  for face in mesh.polygons:
   if any(i not in retained for i in face.vertices):continue
   target=[];coords=[]
   for index,li in zip(face.vertices,face.loop_indices):
    if index not in remap:
     remap[index]=len(v);v.append(tuple(mesh.vertices[index].co));col.append(tuple(colors.data[index].color) if colors else (1,1,1,1))
    target.append(remap[index]);u,w=uv.data[li].uv
    coords.append((u*.90,w*1.05) if ob==top else (u*.15,w*.15))
   f.append(tuple(target));uvs.append(coords)
  data[ob.name]={'v':v,'f':f,'uv':uvs,'col':col,'retainedVertices':len(v),'removedCourseVertices':len(mesh.vertices)-len(v)}
 def add(role,verts,faces,coords,shade=1):
  d=data[role];n=len(d['v']);d['v'].extend([tuple(G(p)) for p in verts]);d['col'].extend([(shade,shade,shade,1)]*len(verts))
  for face in faces:d['f'].append(tuple(n+i for i in face));d['uv'].append([coords[i] for i in face])
 # Exact authored planes: both main slopes, veranda, and near projecting roof.
 planes=[(-22,-27.15,-28.13,-15.87,7.78,5.13,False,415),(-22,-16.85,-28.13,-15.87,7.78,5.13,False,417),(-17.5,-14.1,-27.92,-16.08,5.18,4.66,False,75),(-7.5,-1.5,-18.7,-11.3,4.57,3.85,True,609)]
 count=0;fibres=0
 for x0,x1,z0,z1,y0,y1,swap,seed in planes:
  rr=random.Random(seed+90271);pitch=math.hypot(x1-x0,y1-y0)
  def point(t,z,rise=0):
   x=x0+(x1-x0)*t;y=y0+(y1-y0)*t+rise
   return (z,y,x) if swap else (x,y,z)
  # Low continuous bedding; the visible relief consists only of longitudinal
  # reed groups. No wide raised end face or transverse cap survives.
  verts=[point(t,z,.006) for t,z in ((0,z0),(1,z0),(1,z1),(0,z1))]
  coords=[((z-z0)/1.8,t*pitch/1.35) for t,z in ((0,z0),(1,z0),(1,z1),(0,z1))]
  face=(0,1,2,3)
  if (Vector(verts[1])-Vector(verts[0])).cross(Vector(verts[2])-Vector(verts[0])).y<0:face=tuple(reversed(face))
  add('RoofThatch',verts,[face],coords)
  z=z0
  while z<z1-.01:
   width=min(z1-z,rr.uniform(.35,.62));end=z+width;distance=-rr.uniform(0,.85)
   while distance<pitch-.01:
    length=rr.uniform(.85,1.55);a=max(0,distance);b=min(pitch,distance+length+.12)
    if b<=0:distance+=length;continue
    phase=rr.uniform(0,math.tau);strand_count=max(6,round(width/.052));count+=1;bundle_height=rr.uniform(.045,.062)
    for strand in range(strand_count):
     u=(strand+.5)/strand_count;center=z+u*width
     radius=min(width/strand_count*.48,rr.uniform(.020,.030))
     start=max(0,a+rr.uniform(-.12,.09));finish=min(pitch+.045,b+rr.uniform(-.09,.13))
     if finish-start<.10:continue
     verts=[];coords=[];faces=[];height=rr.uniform(.008,.016);curvature=rr.uniform(.004,.013)
     for j in range(4):
      q=j/3;along=start+(finish-start)*q;t=along/pitch
      middle=center+.010*math.sin(q*math.pi+phase)+.005*math.sin(q*7+strand)
      # Independent narrow, drooping ends remain below their arched middles.
      # Shared gentle bundle volume is made from individual reeds, never a
      # broad plate. Feathered starts/ends overlap at only a fraction of the
      # bundle height and retain their independently staggered terminations.
      bundle_arch=.62+.38*math.sin(u*math.pi)
      overlap_profile=.28+.72*math.sin(q*math.pi)**.65
      rise=.006+bundle_height*bundle_arch*overlap_profile+height*math.sin(q*math.pi)**.45+curvature*math.sin(q*math.pi)
      taper=.55+.45*math.sin(q*math.pi)**.35
      for side in (-1,0,1):
       zz=middle+side*radius*taper
       p=point(t,zz,rise+(radius*.55 if side==0 else 0))
       if t>1:p=(p[0],p[1]-(t-1)*.12,p[2])
       verts.append(p);coords.append(((zz-z0)/1.8,t*pitch/1.35))
     for j in range(3):
      for k in range(2):
       n=j*3+k;face=(n,n+3,n+4,n+1)
       if (Vector(verts[face[1]])-Vector(verts[face[0]])).cross(Vector(verts[face[2]])-Vector(verts[face[0]])).y<0:face=tuple(reversed(face))
       faces.append(face)
     # A small minority uses the existing darker scanned reed material, with
     # identical strand construction rather than a painted horizontal seam.
     role='RoofThatchDark' if (strand+count)%11==0 else 'RoofThatch'
     add(role,verts,faces,coords,.98);fibres+=1
    distance+=length
   z=end

 for ob in (top,dark):
  d=data[ob.name];old=ob.data;mesh=bpy.data.meshes.new(ob.name+' individual reed sheaves');mesh.from_pydata(d['v'],[],d['f']);mesh.update()
  uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.asarray([p for face in d['uv'] for p in face],dtype=np.float32).reshape(-1))
  if ob==dark:
   color=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT');color.data.foreach_set('color',np.asarray(d['col'],dtype=np.float32).reshape(-1))
  for face in mesh.polygons:face.use_smooth=True
  for mat in old.materials:mesh.materials.append(mat)
  ob.data=mesh;ob['professionalSheavesV3']=True;ob['professionalBundleUV']=True
  print('SHEAVES',ob.name,'retained',d['retainedVertices'],'removed courses',d['removedCourseVertices'],'new total',len(mesh.vertices),flush=True)
 print('INDIVIDUAL_REED_BUNDLES',count,'LONGITUDINAL_FIBRES',fibres,flush=True)

def board_craft(ob,geometry=True):
 role=ob.get('originalRole',ob.name)
 if ob.get('professionalBoardsV1'):return
 mesh=ob.data;groups=components(mesh);original=np.array([tuple(v.co) for v in mesh.vertices]);coords=original.copy();uv=mesh.uv_layers.active
 if role=='WallBoards':
  for group in groups:
   block=original[group];lo=block.min(0);hi=block.max(0);extent=hi-lo;center=(lo+hi)*.5;normal=int(np.argmin(extent))
   # Reduce extrusion in each actual board or woven lath, preserving its plane.
   coords[group,normal]=center[normal]+(coords[group,normal]-center[normal])*.65
   long=int(np.argmax(extent));width=[i for i in range(3) if i not in (normal,long)]
   if long==2 and width and .28<extent[width[0]]<.39:
    axis=width[0];coords[group,axis]=center[axis]+(coords[group,axis]-center[axis])*(1+.008/extent[axis])
  mesh.vertices.foreach_set('co',coords.reshape(-1));mesh.update()
 if role=='BoatPaint':
  for group in groups:
   block=original[group];lo=block.min(0);hi=block.max(0);extent=hi-lo;center=(lo+hi)*.5;normal=int(np.argmin(extent))
   coords[group,normal]=center[normal]+(coords[group,normal]-center[normal])*.67
  mesh.vertices.foreach_set('co',coords.reshape(-1));mesh.update()
  # Higher texel density confines paint wear to small chips and fine grain.
  for loop in uv.data:loop.uv*=2.15
  ob['professionalBoardsV1']=True;return
 # A physical plank uses one continuous photographed plank rather than a
 # repeated grid of additional painted seams inside each modeled board.
 choices=[(.021,.18),(.218,.385),(.42,.58),(.61,.778),(.813,.985)] if role=='WallBoards' else [(.012,.09),(.12,.19),(.235,.30),(.347,.405),(.445,.50),(.545,.61),(.66,.72),(.77,.82),(.88,.97)]
 lookup={}
 for group in groups:
  block=coords[group];lo=block.min(0);hi=block.max(0);extent=hi-lo;center=(lo+hi)*.5;long=int(np.argmax(extent));normal=int(np.argmin(extent));across=next((i for i in range(3) if i not in (long,normal)),(long+1)%3)
  seed=int(abs(center[0]*193+center[1]*71+center[2]*307));u0,u1=choices[seed%len(choices)]
  for i in group:
   v=coords[i];u=u0+(u1-u0)*(v[across]-lo[across])/max(extent[across],.001);w=v[long]/1.6+(seed%17)*.13
   lookup[i]=(u,w)
 for face in mesh.polygons:
  for li in face.loop_indices:uv.data[li].uv=lookup[mesh.loops[li].vertex_index]
 backup=mesh.uv_layers.get('AuthoredUV')
 if backup:mesh.uv_layers.remove(backup)
 ob['professionalBoardsV1']=True;ob['professionalBoardsUV']=True


def add_geometry(ob,verts,faces,uvs,colors=None):
 old=ob.data;n=len(old.vertices);v=[tuple(p.co) for p in old.vertices]+[tuple(G(p)) for p in verts]
 f=[tuple(p.vertices) for p in old.polygons]+[tuple(n+i for i in face) for face in faces]
 mesh=bpy.data.meshes.new(ob.name+' detailed surface');mesh.from_pydata(v,[],f);mesh.update()
 role=ob.get('originalRole',ob.name)
 for source in old.uv_layers:
  out=mesh.uv_layers.new(name=source.name);a=np.empty(len(source.data)*2,dtype=np.float32);source.data.foreach_get('uv',a)
  extra=np.asarray([uvs[i] for face in faces for i in face],dtype=np.float32)
  if source.name=='AuthoredUV':
   if role=='BankMud':extra/=1.333333333
   elif role=='BarkSculpt':extra/=.32
  out.data.foreach_set('uv',np.concatenate((a,extra.reshape(-1))))
 if not old.uv_layers:
  layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',np.asarray([uvs[i] for face in faces for i in face],dtype=np.float32).reshape(-1))
 mesh.uv_layers.active=mesh.uv_layers['UVMap'];mesh.uv_layers['UVMap'].active_render=True
 oldcol=old.color_attributes.get('Col');col=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
 initial=[tuple(d.color) for d in oldcol.data] if oldcol else [(1,1,1,1)]*n
 col.data.foreach_set('color',np.asarray(initial+(colors or [(1,1,1,1)]*len(verts)),dtype=np.float32).reshape(-1))
 for p in mesh.polygons:p.use_smooth=True
 for mat in old.materials:mesh.materials.append(mat)
 ob.data=mesh;ob['professionalDetailUV']=True

def detail_object(role,verts,faces,uvs,colors):
 mesh=bpy.data.meshes.new(role);mesh.from_pydata([],[],[]);ob=bpy.data.objects.new(role,mesh);bpy.context.collection.objects.link(ob)
 ob['originalRole']=role;ob['professionalAsset']=True;ob['surfaceRole']=CONFIG[role][2]
 add_geometry(ob,verts,faces,uvs,colors);ob.data.materials.append(surface(role,None));return ob

def foreground_detail():
 import random
 from mathutils.bvhtree import BVHTree
 from mathutils import geometry
 if bpy.data.objects['WornLaterite'].get('professionalGroundReliefV2'):return []
 # Real shallow crests on a denser walking surface, plus quiet smooth patches.
 rr=random.Random(483105)
 paths=[((-9.2,5.4),(-6.6,4.3)),((-6.8,7.1),(-4.3,5.9)),((-5.6,4.2),(-3.8,4.6)),((-2.8,2.0),(-4.1,.7)),((-8.4,-.2),(-5.6,-1.7)),((-6.5,-2.9),(-8.1,-4.0)),((-4.7,-5.2),(-6.9,-6.4)),((-10.5,-7.7),(-8.6,-8.8)),((-8.9,-11.9),(-6.4,-10.5))]
 def pad_mask(x,z):
  fade=1
  for px,pz in [(-3,3),(-8,-10),(-15,-22),(1,-34)]:
   d=math.hypot(x-px,z-pz);a=max(0,min(1,(d-.68)/.7));fade*=a*a*(3-2*a)
  return fade
 hmap=image('red_dirt_mud_01','disp',1);w,h=hmap.size;data=np.asarray(hmap.pixels[:],dtype=np.float32).reshape(h,w,4)[:,:,0];mean=float(data.mean())
 for name in ('WornLaterite','Laterite'):
  ob=bpy.data.objects[name]
  if name=='WornLaterite':
   bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
   sub=ob.modifiers.new('Walking soil relief resolution','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;sub.render_levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
  mesh=ob.data;coords=np.array([tuple(v.co) for v in mesh.vertices],dtype=np.float32)
  for i,(x,bz,y) in enumerate(coords):
   z=-float(bz)
   if not(-12.5<x<-2.35 and -14.5<z<7.5):continue
   mask=pad_mask(x,z)*min(1,(x+12.5)/.6,(-2.35-x)/.6,(z+14.5)/.6,(7.5-z)/.6)
   # Preserve broad gaps between clusters rather than covering every pixel.
   cluster=.35+.65*max(0,math.sin(x*1.11+z*.73)*math.cos(z*.67-x*.43))
   scan=(float(data[int((z/1.5%1)*h)%h,int((x/1.5%1)*w)%w])-mean)*.135
   crests=0
   for k,(a,b) in enumerate(paths):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length)))
    px=a[0]+dx*t+math.sin(t*math.pi)*.19*math.sin(k*2);pz=a[1]+dz*t+.13*math.sin(t*math.pi*2+k)
    dist=math.hypot(x-px,z-pz);crests+=.060*math.exp(-(dist/.09)**2)*math.sin(t*math.pi)**.6
   coords[i,2]+=(scan*cluster+crests)*mask
  mesh.vertices.foreach_set('co',coords.reshape(-1));mesh.update();ob['professionalGroundReliefV2']=True;ob['professionalDetailUV']=True
 # Sample the actual sculpted triangles; all placed details have ground contact.
 points=[];faces=[]
 for name in ('Laterite','WornLaterite','BankMud'):
  ob=bpy.data.objects[name];n=len(points);points.extend([(v.co.x,v.co.z,-v.co.y) for v in ob.data.vertices]);faces.extend([tuple(n+i for i in p.vertices) for p in ob.data.polygons])
 floor=BVHTree.FromPolygons(points,faces)
 def height(x,z):
  hit=floor.ray_cast(Vector((x,5,z)),Vector((0,-1,0)),9)
  return hit[0].y if hit[0] is not None else .2
 # Small irregular stones, more than half buried in coherent groups.
 import bmesh
 bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1);bm.verts.ensure_lookup_table();base=[tuple(v.co) for v in bm.verts];index={v:i for i,v in enumerate(bm.verts)};polys=[tuple(index[v] for v in f.verts) for f in bm.faces];bm.free()
 sv=[];sf=[];su=[];sc=[];lv=[];lf=[];lu=[];lc=[]
 clusters=[(-6.7,6.3),(-4.8,5.7),(-2.65,4.3),(-7.6,2.1),(-5.6,.2),(-2.8,-.6),(-8.3,-3.1),(-5.1,-5.3),(-9.4,-7.5),(-6.7,-9.3)]
 for k,(cx,cz) in enumerate(clusters):
  for j in range(20):
   x=cx+rr.uniform(-.65,.65);z=cz+rr.uniform(-.9,.9)
   if pad_mask(x,z)<.7:continue
   radius=rr.uniform(.035,.105)*min(1,math.hypot(x+2.2,z-7.2)/5);angle=rr.random()*math.tau;elong=rr.uniform(.72,1.4);n=len(sv);ground=height(x,z);shade=rr.uniform(.60,1)
   for bx,by,bz in base:
    noise=1+rr.uniform(-.15,.15);px=x+(bx*math.cos(angle)+bz*math.sin(angle))*radius*elong*noise;pz=z+(bz*math.cos(angle)-bx*math.sin(angle))*radius*noise
    py=ground-radius*.25+by*radius*.66*noise;sv.append((px,py,pz));su.append((px*.7,pz*.7));sc.append((shade,shade*.97,shade*.90,1))
   sf.extend([tuple(n+i for i in f) for f in polys])
  # Sparse bent, pointed leaf pieces are visible shapes, not another noise map.
  for j in range(5):
   x=cx+rr.uniform(-.75,.75);z=cz+rr.uniform(-.9,.9)
   if pad_mask(x,z)<.7:continue
   length=rr.uniform(.10,.24);width=length*rr.uniform(.27,.40);angle=rr.random()*math.tau;n=len(lv);shade=rr.uniform(.55,1)
   for t in (0,.25,.55,.8,1):
    for side in (-1,0,1):
     across=side*width*math.sin(t*math.pi);along=(t-.5)*length;px=x+along*math.cos(angle)-across*math.sin(angle);pz=z+along*math.sin(angle)+across*math.cos(angle)
     py=height(px,pz)+.003+(.012*math.sin(t*math.pi) if side==0 else .022*t*t*abs(side));lv.append((px,py,pz));lu.append((.15+side*.07,t));lc.append((shade,shade*.78,shade*.48,1))
   for q in range(4):
    for a in range(2):i=n+q*3+a;lf.append((i,i+1,i+4,i+3))
 # The roots branch from leaf clusters and disappear beneath alternating ridges.
 rv=[];rf=[];ru=[];rc=[]
 root_paths=[(-8.8,5.5,-4.8,4.6),(-6.8,7.1,-3.8,5.1),(-2.75,1.9,-4.9,.35),(-8.7,.6,-5.4,-1.2),(-5.7,-4.6,-8.2,-6.3),(-10.5,-8.5,-7.7,-9.7)]
 def root_path(a,b,radius,seed,branch=False):
  steps=max(9,int(math.hypot(b[0]-a[0],b[1]-a[1])/.11));n=len(rv);points=[]
  for j in range(steps+1):
   t=j/steps;x=a[0]+(b[0]-a[0])*t+.13*math.sin(t*math.pi*2+seed)*math.sin(t*math.pi);z=a[1]+(b[1]-a[1])*t+.13*math.sin(t*math.pi+seed)
   y=height(x,z)-.018+.032*math.sin(t*math.pi*5+seed);points.append((x,y,z));taper=(1-t)**.72;mask=pad_mask(x,z)
   dx,dz=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dz);side=(-dz/L,0,dx/L)
   for q in range(7):
    ang=q*math.tau/7;r=radius*taper*mask;px=x+side[0]*math.cos(ang)*r;py=y+math.sin(ang)*r*.65;pz=z+side[2]*math.cos(ang)*r
    rv.append((px,py,pz));ru.append((q/7*.18,t*L*.5));rc.append((.87,.87,.87,1))
  for j in range(steps):
   for q in range(7):i=n+j*7+q;k=n+j*7+(q+1)%7;rf.append((i,i+7,k+7,k))
  if not branch:
   for off,turn in ((.3,-1),(.52,1),(.73,-1)):
    p=points[int(steps*off)];angle=math.atan2(b[1]-a[1],b[0]-a[0])+turn*rr.uniform(.55,.9);length=rr.uniform(.55,1.05)
    root_path((p[0],p[2]),(p[0]+math.cos(angle)*length,p[2]+math.sin(angle)*length),radius*.46,seed+off*3,True)
 for k,(ax,az,bx,bz) in enumerate(root_paths):root_path((ax,az),(bx,bz),.068,k*.87)
 added=[detail_object('EmbeddedStones',sv,sf,su,sc),detail_object('LeafLitter',lv,lf,lu,lc),detail_object('RootWood',rv,rf,ru,rc)]
 # Offset lower clay shoulders, curved and partly submerged into the existing cut.
 bv=[];bf=[];bu=[];bc=[]
 for k,(z,level) in enumerate(((6.45,.45),(4.7,.77),(2.8,.35),(-1.2,.65),(-5.3,.4))):
  lo,hi=-3,1.8
  for _ in range(20):
   mid=(lo+hi)/2
   if height(mid,z)>level:lo=mid
   else:hi=mid
  x=(lo+hi)/2-.025;n=len(bv)
  for bx,by,bz in base:
   ripple=1+.16*math.sin(bx*7.1+bz*5.7+k)+.08*math.cos(by*8-bz*13)
   px=x+bx*.34*ripple;py=level-.095+by*.19*ripple;pz=z+bz*.56*ripple
   bv.append((px,py,pz));bu.append((px/1.5,pz/1.5));shade=.80+.16*max(0,by);bc.append((shade,shade,shade,1))
  bf.extend([tuple(n+i for i in f) for f in polys])
 # Small clods interrupt the lips; variation follows the existing bank, not rows.
 for k in range(52):
  z=rr.uniform(-10,7);x=rr.uniform(-2.0,-.75);y=height(x,z);n=len(bv);r=rr.uniform(.045,.13)
  for bx,by,bz in base:
   px=x+bx*r;py=y-r*.35+by*r*.75;pz=z+bz*r*rr.uniform(.7,1.3);bv.append((px,py,pz));bu.append((px/1.5,pz/1.5));bc.append((.85,.85,.85,1))
  bf.extend([tuple(n+i for i in f) for f in polys])
 add_geometry(bpy.data.objects['BankMud'],bv,bf,bu,bc)
 print('FOREGROUND_DETAIL',len(sv)//len(base),'stones;',len(lv)//15,'leaf pieces;',len(root_paths),'branching root networks;',len(bv)//len(base),'bank clods',flush=True)
 return [o.data.materials[0].name for o in added]

def trunk_plates():
 import random
 from mathutils.bvhtree import BVHTree
 ob=bpy.data.objects['BarkSculpt']
 if ob.get('professionalTrunkPlatesV3'):return
 pts=[];faces=[]
 for name in ('BarkSculpt','Bark'):
  obj=bpy.data.objects[name];n=len(pts);pts.extend([(v.co.x,v.co.z,-v.co.y) for v in obj.data.vertices]);faces.extend([tuple(n+i for i in p.vertices) for p in obj.data.polygons])
 tree=BVHTree.FromPolygons(pts,faces);rr=random.Random(72815);v=[];f=[];uv=[];col=[];count=0
 def on_bark(angle,y,offset):
  radial=Vector((math.cos(angle),0,math.sin(angle)))
  hit=tree.ray_cast(Vector((-10,y,-45))+radial*6,-radial,7)
  return hit[0]+radial*offset if hit[0] is not None else None
 for column in range(8):
  angle=.46+column*.235+rr.uniform(-.035,.035);y=2.8+rr.uniform(0,.70)
  while y<11.6:
   width=rr.uniform(.15,.30);height=rr.uniform(.35,.70);tilt=rr.uniform(-.10,.10);rise=rr.uniform(.016,.029)
   center=on_bark(angle,y,0)
   if center is None:y+=1;continue
   trunk_radius=max(.25,math.hypot(center.x+10,center.z+45))
   # Two elongated, nearly planar facets share a longitudinal crease.
   # Chipped perimeter corners penetrate the old bark rather than hovering.
   shape=[(-.46,-.46),(.28,-.51),(.51,-.12),(.30,.49),(-.31,.43),(-.51,.11),(0,-.46),(.035,.44)]
   offsets=[-.008,.001,.006,-.005,.002,-.007,rise,rise*.72]
   verts=[]
   for (u,w),offset in zip(shape,offsets):
    a=angle+(u*width+tilt*w*height)/trunk_radius;yy=y+w*height
    p=on_bark(a,yy,offset)
    if p is None:break
    verts.append(tuple(p))
   if len(verts)==8:
    n=len(v);v.extend(verts);uv.extend([(p[0]*.45,p[1]*.45) for p in verts]);col.extend([(1,1,1,1)]*8)
    for face in ((6,1,2,3,7),(0,6,7,4,5)):
     a,b,c=[Vector(verts[i]) for i in face[:3]];radial=Vector((math.cos(angle),0,math.sin(angle)))
     if (b-a).cross(c-a).dot(radial)<0:face=tuple(reversed(face))
     f.append(tuple(n+i for i in face))
    # A short oblique fracture below a broken edge; no dark rim around a dome.
    for index in (0,6,1):
     p=Vector(verts[index])-Vector((math.cos(angle),0,math.sin(angle)))*.018
     v.append(tuple(p));uv.append((p.x*.45,p.y*.45));col.append((.78,.78,.78,1))
    f.extend([(n,n+6,n+9,n+8),(n+6,n+1,n+10,n+9)]);count+=1
   y+=rr.uniform(.75,1.55)
 first_polygon=len(ob.data.polygons);add_geometry(ob,v,f,uv,col)
 for polygon in list(ob.data.polygons)[first_polygon:]:polygon.use_smooth=False
 ob['professionalTrunkPlatesV3']=True;print('ANGULAR_BARK_PLATES',count,flush=True)


def reset_structural_surfaces():
 # Preserve every other mesh from the closed preceding pass. Only these three
 # surfaces return to their original authored foundation before reconstruction.
 roles=('RoofThatch','RoofThatchDark','BarkSculpt')
 with bpy.data.libraries.load(str(FOUNDATION_BLEND),link=False) as (src,dst):dst.objects=list(roles)
 for role,imported in zip(roles,dst.objects):
  assert imported is not None,role
  ob=bpy.data.objects[role];ob.data=imported.data.copy()
  for key in ('professionalSheavesV1','professionalSheavesV2','professionalSheavesV3','professionalBundleUV','professionalDetailUV','professionalTrunkPlatesV2','professionalTrunkPlatesV3'):
   if key in ob:del ob[key]
  bpy.data.objects.remove(imported,do_unlink=True)


def render_setup(region):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.render.resolution_x=1536;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.use_border=False;scene.render.use_crop_to_border=False
 scene.view_settings.view_transform='AgX'
 cam=scene.camera
 if not cam:
  cd=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',cd);scene.collection.objects.link(cam);scene.camera=cam
 if region=='congo':pos=(-2.2,3.95955,7.2);target=(-3,3.00955,1.2)
 elif region=='amazonia':pos=(9,5.2,12);target=(-13,3,-19)
 else:pos=(16,5.6,11);target=(-11,3.3,-25)
 cam.location=G(pos);cam.rotation_euler=(G(target)-cam.location).to_track_quat('-Z','Y').to_euler()
 cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=32;cam.data.lens=32/(2*math.tan(math.radians(26)))
 # Same original source preview lamps, adjusted to the game's actual sun direction.
 for ob in scene.objects:
  if ob.type=='LIGHT' and ob.data.type=='SUN':
   ob.location=G((18,19,-55));ob.rotation_euler=(G((-6,0,-15))-ob.location).to_track_quat('-Z','Y').to_euler();ob.data.energy=4.0;ob.data.color=(1,.89,.71);ob.data.angle=.025
 return scene

def run(region):
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE/f'{region}.blend'))
 before={ob.name:meshhash(ob) for ob in bpy.data.objects if ob.type=='MESH' and not ob.name.startswith('PREVIEW')}
 if region=='congo':
  if STRUCTURAL_ONLY:reset_structural_surfaces()
  roof_bundles()
  for name in ('WallBoards','Timber','DarkTimber','BoatPaint'):
   ob=bpy.data.objects.get(name)
   if ob and not STRUCTURAL_ONLY:board_craft(ob)
 objects=[ob for ob in bpy.data.objects if ob.type=='MESH' and not ob.name.startswith('PREVIEW')]
 used=[]
 for ob in objects:
  role=ob.get('originalRole',ob.name)
  if role.startswith('PH_'):role=role[3:]
  if role not in CONFIG:continue
  if STRUCTURAL_ONLY and role not in ('RoofThatch','RoofThatchDark','BarkSculpt'):
   used.append(ob.data.materials[0].name);continue
  if role=='BankMud':bank_craft(ob)
  apply_uv(ob,role)
  ob['originalRole']=role;ob['professionalAsset']=True;ob['surfaceRole']=CONFIG[role][2]
  new=surface(role,ob.data.materials[0]);ob.data.materials.clear();ob.data.materials.append(new);used.append(new.name)
 if region=='congo':
  if not STRUCTURAL_ONLY:used.extend(foreground_detail())
  trunk_plates()
  objects=[ob for ob in bpy.data.objects if ob.type=='MESH' and not ob.name.startswith('PREVIEW')]
 # Preserve the pale cabin's source paint, but remove overlarge procedural relief.
 for role in ('BoatPaint','HullPaint'):
  ob=bpy.data.objects.get(role)
  if ob:
   for mat in ob.data.materials:
    for n in mat.node_tree.nodes:
     if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.10
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 uncompressed=STAGE/f'{region}-validation.glb'
 bpy.ops.export_scene.gltf(filepath=str(uncompressed),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_cameras=False,export_lights=False,export_extras=True,export_vertex_color='NAME' if region in ('ireland','congo') else 'MATERIAL',export_vertex_color_name='Col',export_all_vertex_colors=False)
 patch_export_factors(uncompressed)
 # Write editable source before replacing its selected meshes with exported ones.
 scene=render_setup(region);bpy.ops.wm.save_as_mainfile(filepath=str(STAGE/f'{region}.blend'),compress=True)
 triangles=sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects)
 after={ob.name:meshhash(ob) for ob in objects}
 result={'region':region,'triangles':triangles,'materialBatches':len(objects),'professionalMaterials':used,'vertexGeometryChanged':[k for k,v in before.items() if after.get(k)!=v],'sourceUnchangedMeshes':[k for k,v in before.items() if after.get(k)==v],'uncompressedBytes':uncompressed.stat().st_size}
 (STAGE/f'{region}-materials.json').write_text(json.dumps(result,indent=2))
 if not RENDER_PREVIEW:
  print('PROFESSIONAL_WORLD',json.dumps(result),flush=True);return
 # Inspect the actual exported material encoding, not only Blender's node graph.
 for ob in list(scene.objects):
  if ob.type=='MESH' and not ob.name.startswith('PREVIEW'):bpy.data.objects.remove(ob,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=str(uncompressed))
 scene=render_setup(region)
 scene.render.filepath=str(STAGE/f'{region}-camera.png');bpy.ops.render.render(write_still=True)
 if region=='congo':
  scene.render.use_border=True;scene.render.use_crop_to_border=True;scene.render.border_min_x=0;scene.render.border_max_x=.42;scene.render.border_min_y=.55;scene.render.border_max_y=.88
  scene.cycles.samples=64;scene.render.filepath=str(STAGE/'congo-roof-close.png');bpy.ops.render.render(write_still=True)
  scene.render.border_min_x=.45;scene.render.border_max_x=.525;scene.render.border_min_y=.61;scene.render.border_max_y=.88
  scene.render.filepath=str(STAGE/'congo-bark-close.png');bpy.ops.render.render(write_still=True)
 print('PROFESSIONAL_WORLD',json.dumps(result),flush=True)

if __name__=='__main__':
 argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 parser=argparse.ArgumentParser();parser.add_argument('regions',nargs='*',default=['congo']);parser.add_argument('--output-dir',type=Path,default=STAGE);parser.add_argument('--source-dir',type=Path,default=SOURCE);parser.add_argument('--roof-bark-only',action='store_true');parser.add_argument('--foundation-blend',type=Path);parser.add_argument('--no-render',action='store_true')
 args=parser.parse_args(argv);STAGE=args.output_dir.resolve();SOURCE=args.source_dir.resolve();STRUCTURAL_ONLY=args.roof_bark_only;RENDER_PREVIEW=not args.no_render;FOUNDATION_BLEND=args.foundation_blend.resolve() if args.foundation_blend else None;STAGE.mkdir(parents=True,exist_ok=True)
 if STRUCTURAL_ONLY and (STAGE==SOURCE or STAGE==(WORK/'stage').resolve()):parser.error('--roof-bark-only requires a separate --output-dir; closed sources cannot be overwritten')
 if STRUCTURAL_ONLY and (args.regions or ['congo'])!=['congo']:parser.error('--roof-bark-only applies to Congo only')
 if STRUCTURAL_ONLY and (not FOUNDATION_BLEND or not FOUNDATION_BLEND.is_file()):parser.error('--roof-bark-only requires an explicit --foundation-blend with original authored roof and bark meshes')
 for region in args.regions or ['congo']:run(region)
