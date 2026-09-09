"""Celta — three authored historical landscapes, Blender 5.2.

Run: /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/celta/environments.py
Meshes are authored in game metres (X right, Y up, Z depth), then converted to
Blender coordinates. All textures derive from the project's generated atlases.
No external models, opaque water, lights, or cameras enter the exported GLBs.
"""
import bpy, math, json, os, sys, random, subprocess, shutil
from pathlib import Path
from mathutils import Vector
import numpy as np
from functools import lru_cache
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/celta/models'
PREV = ROOT / '.dream-loop/v2/environment-previews'
BLEND = ROOT / 'tools/celta/blend'
IRELAND_ATLAS = PREV / 'ireland-surface-atlas.png'
BUILDING_ATLAS = PREV / 'building-surface-atlas.png'
SOIL_ATLAS = ROOT / 'public/celta/soil-pbr-v2.png'
THATCH_EDGE = ROOT / 'public/celta/thatch-edge-v2.png'
SOIL_HEIGHT = None; SOIL_MEAN = 0.
BANK_CONTACT_BVH = None
for p in (OUT, PREV, BLEND): p.mkdir(parents=True, exist_ok=True)
RNG = random.Random(416)
PI = math.pi
MESHES = {}; MATERIALS = {}; OBSTACLES = []; WALK_SURFACES = []; LANDMARKS = []; TREES = []; CURRENT_REGION=''

def clamp(a, lo=0., hi=1.): return max(lo, min(hi, a))
def smooth(a): a=clamp(a); return a*a*(3-2*a)
def mix(a,b,t): return a+(b-a)*t
def g(v): return (v[0], -v[2], v[1])
def dist(x,z,a,b): return math.hypot(x-a,z-b)
def noise(x,z): return .52*math.sin(x*.41+z*.13)+.27*math.sin(x*.94-z*.71)+.21*math.cos(x*1.73+z*1.2)

class Batch:
    def __init__(self,name): self.name=name; self.v=[]; self.f=[]; self.uv=[]; self.smooth=[];self.colors=[]
    def add(self,verts,faces,scale=1.,smooth=False,uvs=None,colors=None):
        if CURRENT_REGION=='congo' and self.name=='BoatPaint':scale*=1.45
        n=len(self.v); self.v.extend([g(v) for v in verts])
        self.colors.extend(colors or [(1,1,1,1)]*len(verts))
        for i,f in enumerate(faces):
            self.f.append(tuple(n+j for j in f)); self.smooth.append(smooth)
            if uvs is not None: self.uv.extend(uvs[i]); continue
            a,b,c=[Vector(verts[f[k]]) for k in range(3)]
            normal=(b-a).cross(c-a); ax=max(range(3),key=lambda k:abs(normal[k]))
            axes=((2,1),(0,2),(0,1))[ax]
            self.uv.extend([(verts[j][axes[0]]*scale,verts[j][axes[1]]*scale) for j in f])
    def object(self):
        mesh=bpy.data.meshes.new(self.name); mesh.from_pydata(self.v,[],self.f); mesh.update()
        if any(n.type=='TEX_IMAGE' for n in MATERIALS[self.name].node_tree.nodes):
            layer=mesh.uv_layers.new(name='UVMap')
            flat=np.asarray(self.uv,dtype=np.float32).reshape(-1)
            layer.data.foreach_set('uv',flat)
        for p,s in zip(mesh.polygons,self.smooth): p.use_smooth=s
        if self.name in ('BarkSculpt','BankMud','RoofThatchDark') and CURRENT_REGION=='congo':
            colors=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
            colors.data.foreach_set('color',np.asarray(self.colors,dtype=np.float32).reshape(-1))
        if self.name=='Sand' and CURRENT_REGION=='ireland':
            colors=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
            values=[]
            for v in self.v:
                x,z,y=v[0],-v[1],v[2];t=smooth((y-.8)/1.4);variation=.95+.05*noise(x,z)
                damp=1-smooth((ireland_shore(z)-x-1.2)/2.5)
                wet=mix(1,.55,damp)
                values.extend((mix(1,.38,t)*variation*wet,mix(1,.53,t)*variation*wet,mix(1,.20,t)*variation*wet,1.))
            colors.data.foreach_set('color',values)
        obj=bpy.data.objects.new(self.name,mesh); bpy.context.collection.objects.link(obj)
        obj.data.materials.append(MATERIALS[self.name]); return obj

def batch(mat):
    if mat not in MESHES: MESHES[mat]=Batch(mat)
    return MESHES[mat]

def atlas_crop(name,atlas,region,tint=(1,1,1),size=512):
    """Crop generated atlas inside Blender, tint pixels, and pack in the blend."""
    atlas=str(atlas)
    source=bpy.data.images.get(Path(atlas).name)
    if source is None:
        path=ROOT/'public/celta'/atlas
        if path.exists():source=bpy.data.images.load(str(path),check_existing=True)
        else:
            # Generated sources are also packed into the editable region blend.
            # A source-only checkout can recover the original atlas from there.
            with bpy.data.libraries.load(str(BLEND/f'{CURRENT_REGION}.blend')) as (available,loaded):
                loaded.images=[Path(atlas).name] if Path(atlas).name in available.images else []
            source=bpy.data.images.get(Path(atlas).name)
            if source is None:raise FileNotFoundError(path)
    source.pack()
    w,h=source.size; pix=np.asarray(source.pixels[:],dtype=np.float32).reshape(h,w,4)
    x0,y0,x1,y1=region
    # Coordinates are in image top-left space; Blender pixels start at bottom-left.
    part=pix[int((1-y1)*h):int((1-y0)*h),int(x0*w):int(x1*w)]
    sy=np.linspace(0,part.shape[0]-1,size).astype(int); sx=np.linspace(0,part.shape[1]-1,size).astype(int)
    arr=part[sy[:,None],sx].copy(); arr[:,:,:3]*=np.asarray(tint); arr[:,:,:3]=np.clip(arr[:,:,:3],0,1)
    if name=='Sand' and CURRENT_REGION!='ireland':
        # Retain generated fine grain, remove the broad source cloth shading;
        # a warm mineral reflectance prevents any fabric pattern at beach scale.
        gray=arr[:,:,:3].mean(2)
        local=sum(np.roll(np.roll(gray,dy,0),dx,1) for dx,dy in [(0,0),(2,0),(-2,0),(0,2),(0,-2)])/5
        detail=(gray-local)*.21
        arr[:,:,:3]=np.clip(np.asarray((.70,.655,.54))[None,None,:]+detail[:,:,None],0,1)
    elif name=='HullPaint':
        # Weathered generated wood grain shows through worn pale paint.
        gray=arr[:,:,:3].mean(2);patina=(gray-np.median(gray))*.48
        base=(.58,.55,.44)
        arr[:,:,:3]=np.clip(np.asarray(base)[None,None,:]+patina[:,:,None],0,1)
    img=bpy.data.images.new(name,width=size,height=size,alpha=False); img.pixels.foreach_set(arr.reshape(-1)); img.pack()
    gray=arr[:,:,:3].mean(2)
    if CURRENT_REGION=='ireland' and name in ('Sand','WetSand'):
        yy,xx=np.mgrid[0:size,0:size]
        gray=gray+.038*np.sin(yy*.19+1.7*np.sin(xx*.021))
    dx=np.roll(gray,-1,1)-np.roll(gray,1,1); dy=np.roll(gray,-1,0)-np.roll(gray,1,0)
    power=4.0 if CURRENT_REGION=='ireland' and name in ('Sand','WetSand') else (1.45/.75 if name=='RoofThatch' else 1.45)
    normal=np.stack((-dx*power,-dy*power,np.ones_like(gray)),2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    norm=np.ones((size,size,4),dtype=np.float32); norm[:,:,:3]=normal*.5+.5
    ni=bpy.data.images.new(name+'_normal',width=size,height=size,alpha=False); ni.colorspace_settings.name='Non-Color'; ni.pixels.foreach_set(norm.reshape(-1)); ni.pack()
    return img,ni

def material(name,texture=None,region=None,tint=(1,1,1),color=(.3,.3,.3),rough=.85,metal=0):
    mat=bpy.data.materials.new(name); mat.use_nodes=True; mat.diffuse_color=(*color,1)
    nodes=mat.node_tree.nodes; bs=nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
    bs.inputs['Base Color'].default_value=(*color,1)
    if texture:
        img,normal=atlas_crop(name,texture,region,tint)
        tex=nodes.new('ShaderNodeTexImage'); tex.image=img; mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        texn=nodes.new('ShaderNodeTexImage'); texn.image=normal
        n=nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value=.43
        mat.node_tree.links.new(texn.outputs['Color'],n.inputs['Color']); mat.node_tree.links.new(n.outputs['Normal'],bs.inputs['Normal'])
    MATERIALS[name]=mat

def congo_soil_material():
    """Matched generated PBR maps; physical tile is 2m in game XZ space."""
    global SOIL_HEIGHT,SOIL_MEAN
    source=bpy.data.images.get(SOIL_ATLAS.name)
    if source is None:
        if SOIL_ATLAS.exists():source=bpy.data.images.load(str(SOIL_ATLAS),check_existing=True)
        else:
            with bpy.data.libraries.load(str(BLEND/'congo.blend')) as (available,loaded):loaded.images=[SOIL_ATLAS.name]
            source=bpy.data.images.get(SOIL_ATLAS.name)
    source.colorspace_settings.name='Non-Color';source.pack();source.use_fake_user=True
    w,h=source.size;pixels=np.asarray(source.pixels[:],dtype=np.float32).reshape(h,w,4)
    parts={'Laterite':pixels[h//2:,:w//2], 'Laterite_normal':pixels[h//2:,w//2:], 'Laterite_height':pixels[:h//2,:w//2], 'Laterite_roughness':pixels[:h//2,w//2:]}
    raw=parts['Laterite_height'][:,:,:3].mean(2);lo,hi=np.percentile(raw,(1,99));SOIL_HEIGHT=np.clip((raw-lo)/(hi-lo),0,1);SOIL_MEAN=float(SOIL_HEIGHT.mean())
    maps={}
    for name,part in parts.items():
        sy=np.linspace(0,part.shape[0]-1,512).astype(int);sx=np.linspace(0,part.shape[1]-1,512).astype(int);arr=part[sy[:,None],sx].copy()
        # Byte-backed sRGB images preserve the encoded TL bytes directly.
        # Verified against exported JPEG bytes: decoding here would darken
        # them a second time. Normal/height/roughness are unchanged raw data.
        img=bpy.data.images.new(name,width=512,height=512,alpha=False,float_buffer=False)
        img.colorspace_settings.name='sRGB' if name=='Laterite' else 'Non-Color'
        img.pixels.foreach_set(arr.reshape(-1));img.pack();img.use_fake_user=True;maps[name]=img
    material('Laterite',rough=.9)
    mat=MATERIALS['Laterite'];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    for name in ('Laterite','Laterite_normal','Laterite_roughness'):
        tex=nodes.new('ShaderNodeTexImage');tex.image=maps[name]
        if name=='Laterite':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        elif name.endswith('_roughness'):links.new(tex.outputs['Color'],bs.inputs['Roughness'])
        else:
            normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.85;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])

def congo_thatch_fibre_material():
    """Original unmodified PNG with a true glTF MASK cutoff, not blending."""
    source=bpy.data.images.get(THATCH_EDGE.name)
    if source is None:
        if THATCH_EDGE.exists():source=bpy.data.images.load(str(THATCH_EDGE),check_existing=True)
        else:
            with bpy.data.libraries.load(str(BLEND/'congo.blend')) as (available,loaded):loaded.images=[THATCH_EDGE.name]
            source=bpy.data.images.get(THATCH_EDGE.name)
    source.alpha_mode='STRAIGHT';source.pack();source.use_fake_user=True
    material('RoofThatchFibre',rough=.98)
    mat=MATERIALS['RoofThatchFibre'];mat.surface_render_method='DITHERED';mat.use_backface_culling=False
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Specular IOR Level'].default_value=.20
    tex=nodes.new('ShaderNodeTexImage');tex.image=source;tex.extension='REPEAT'
    links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    # Blender's glTF exporter recognizes this node as alphaMode MASK and
    # alphaCutoff .72. The original colored fringe is below alpha .075.
    clip=nodes.new('ShaderNodeMath');clip.operation='GREATER_THAN';clip.inputs[1].default_value=.72
    links.new(tex.outputs['Alpha'],clip.inputs[0]);links.new(clip.outputs[0],bs.inputs['Alpha'])

def soil_displacement(x,z):
    if SOIL_HEIGHT is None:return 0.
    h,w=SOIL_HEIGHT.shape;u=(x*.5%1)*w-.5;v=(z*.5%1)*h-.5;ix=math.floor(u);iz=math.floor(v);tx=u-ix;tz=v-iz
    value=mix(mix(float(SOIL_HEIGHT[iz%h,ix%w]),float(SOIL_HEIGHT[iz%h,(ix+1)%w]),tx),mix(float(SOIL_HEIGHT[(iz+1)%h,ix%w]),float(SOIL_HEIGHT[(iz+1)%h,(ix+1)%w]),tx),tz)
    return (value-SOIL_MEAN)*.08

def make_materials(region):
    soil=(1.10,.79,.57) if region=='congo' else ((.61,.85,.66) if region=='amazonia' else (.9,1.18,.61))
    if region=='congo':congo_soil_material()
    else:material('Earth','materials.jpg',(2/3,0,1,.5),soil)
    material('Timber','surfaces.jpg',(0,0,.5,.5),(.91,.85,.71),rough=.91)
    material('DarkTimber','materials.jpg',(0,0,1/3,.5),(.71,.63,.48),rough=.94)
    material('Bark','surfaces.jpg',(.5,0,1,.5),(.73,.78,.63),rough=.96)
    material('Stone',IRELAND_ATLAS if region=='ireland' else 'materials.jpg',(0,.5,.5,1) if region=='ireland' else (2/3,.5,1,1),(.88,.93,.97) if region=='ireland' else (.93,.98,1.02),rough=.93)
    material('Thatch','surfaces.jpg',(.5,.5,1,1),(1.18,1.08,.66),rough=.95)
    if region=='congo':
        congo_thatch_fibre_material()
        material('RoofThatch',BUILDING_ATLAS,(0,0,.5,.5),(.66,.60,.495),rough=.99)
        material('RoofThatchDark',BUILDING_ATLAS,(.5,0,1,.5),(.70,.65,.53),rough=.99)
        mud=MATERIALS['Laterite'].copy();mud.name='BankMud';MATERIALS['BankMud']=mud
        worn=MATERIALS['Laterite'].copy();worn.name='WornLaterite';MATERIALS['WornLaterite']=worn
        for node in worn.node_tree.nodes:
            if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.40
        sculpt=MATERIALS['Bark'].copy();sculpt.name='BarkSculpt';MATERIALS['BarkSculpt']=sculpt
        for m in (sculpt,mud,MATERIALS['RoofThatchDark']):
            nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');original=bs.inputs['Base Color'].links[0].from_socket
            vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Col'
            mul=nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
            links.new(original,mul.inputs[1]);links.new(vc.outputs['Color'],mul.inputs[2]);links.new(mul.outputs['Color'],bs.inputs['Base Color'])
        material('WallBoards','materials.jpg',(0,0,1/3,.5),(1.0,.88,.68),rough=.94)
        material('BoatPaint',BUILDING_ATLAS,(0,.5,.5,1),(.91,.87,.77),rough=.84)
        material('HullPaint','surfaces.jpg',(0,0,.5,.5),(1,1,1),rough=.67,metal=.08)
    material('Sand',IRELAND_ATLAS if region=='ireland' else 'materials.jpg',(0,0,.5,.5) if region=='ireland' else (0,.5,1/3,1),(1,1,1),rough=.86 if region=='ireland' else .98)
    if region=='ireland':
        material('WetSand',IRELAND_ATLAS,(.5,0,1,.5),(.94,.96,.99),rough=.36)
        material('DuneTurf',IRELAND_ATLAS,(.5,.5,1,1),(.88,.96,.71),rough=.96)
        material('Driftwood',BUILDING_ATLAS,(.5,.5,1,1),(.95,.97,.94),rough=.94)
        material('GrassDry',color=(.32,.30,.16),rough=.97)
        m=MATERIALS['Sand'];nodes=m.node_tree.nodes;bs=nodes.get('Principled BSDF');tex=next(n for n in nodes if n.type=='TEX_IMAGE' and not n.image.name.endswith('_normal'))
        color=nodes.new('ShaderNodeVertexColor');color.layer_name='Col'
        mul=nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
        m.node_tree.links.new(tex.outputs['Color'],mul.inputs[1]);m.node_tree.links.new(color.outputs['Color'],mul.inputs[2]);m.node_tree.links.new(mul.outputs['Color'],bs.inputs['Base Color'])
    material('Iron',color=(.12,.15,.14),rough=.63,metal=.52)
    material('Limewash',color=(.53,.49,.34),rough=.96)
    material('LeafDeep',color=(.065,.13,.055),rough=.84)
    material('LeafMid',color=(.13,.22,.07),rough=.88)
    material('LeafLight',color=(.24,.28,.085),rough=.9)
    material('Grass',color=(.24,.28,.16) if region=='ireland' else (.11,.21,.075),rough=.95)
    material('Canvas','surfaces.jpg',(0,.5,.5,1),(.94,.85,.62),rough=.97)
    material('Brick',color=(.31,.16,.1),rough=.97)

def polygon(mat,verts,faces=None,scale=1.,smooth=False,uvs=None):
    batch(mat).add(verts,faces or [tuple(range(len(verts)))],scale,smooth,uvs)

def box(mat,c,size,rot=0,bevel=.025,scale=.65):
    """Eight-corner beveled plan prism, with actual beveled vertical arrises."""
    x,y,z=c; w,h,d=size; b=min(bevel,w*.12,d*.12)
    plan=[(-w/2+b,-d/2),(w/2-b,-d/2),(w/2,-d/2+b),(w/2,d/2-b),(w/2-b,d/2),(-w/2+b,d/2),(-w/2,d/2-b),(-w/2,-d/2+b)]
    cr,sr=math.cos(rot),math.sin(rot)
    v=[(x+a*cr+t*sr,y+dy,z-a*sr+t*cr) for dy in (-h/2,h/2) for a,t in plan]
    faces=[tuple(range(8)),tuple(range(15,7,-1))]+[(i+8,(i+1)%8+8,(i+1)%8,i) for i in range(8)]
    polygon(mat,v,faces,scale)

def beam(mat,a,b,r=.12,r2=None,sides=8,jitter=0):
    a,b=Vector(a),Vector(b); t=(b-a).normalized(); side=t.cross(Vector((0,1,0)))
    if side.length<.01: side=t.cross(Vector((1,0,0)))
    side.normalize(); up=t.cross(side).normalized(); r2=r if r2 is None else r2
    v=[]
    for p,rad in ((a,r),(b,r2)):
        for k in range(sides):
            angle=k*2*PI/sides; d=rad*(1+RNG.uniform(-jitter,jitter)); q=p+d*(side*math.cos(angle)+up*math.sin(angle)); v.append(tuple(q))
    fs=[tuple(range(sides-1,-1,-1)),tuple(range(sides,sides*2))]+[(k,(k+1)%sides,(k+1)%sides+sides,k+sides) for k in range(sides)]
    polygon(mat,v,fs,.8,smooth=True)

def rock(c,size,mat='Stone',layers=4,seed=0):
    """Fractured, tilted sedimentary block with independently eroded ledges."""
    rr=random.Random(seed); x,y,z=c; w,h,d=size; N=9; verts=[]
    for j in range(layers+1):
        t=j/layers; shrink=1-.28*t
        for k in range(N):
            a=k*2*PI/N; r=shrink*rr.uniform(.78,1.13)
            verts.append((x+math.cos(a)*w*.5*r+t*.18*h,y+h*t+rr.uniform(-.07,.07)*h,z+math.sin(a)*d*.5*r))
    fs=[]
    for j in range(layers):
        for k in range(N): fs.append(((j+1)*N+k,(j+1)*N+(k+1)%N,j*N+(k+1)%N,j*N+k))
    fs.append(tuple(layers*N+k for k in range(N-1,-1,-1)))
    polygon(mat,verts,fs,.7)

def segment_distance(x,z,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]; t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz or 1))
    return math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),t

def closest_path(x,z,pts):
    best=(1e6,None,0)
    for a,b in zip(pts,pts[1:]):
        d,t=segment_distance(x,z,a,b)
        if d<best[0]: best=(d,(a,b),t)
    return best

def spline(points,step=.32):
    result=[]
    for i in range(len(points)-1):
        p0=Vector(points[max(0,i-1)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(len(points)-1,i+2)])
        count=max(2,int((p2-p1).length/step))
        for k in range(count):
            t=k/count; p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            result.append(tuple(p))
    result.append(tuple(points[-1])); return result

CONGO_PIER=[(-5,-34),(0,-34),(7,-34)]
AMAZON_PATH=spline([(2,4),(1,-2),(-4,-5),(-10,-7),(-12,-9),(-13,-15),(-19,-20),(-16,-25),(-17,-32),(-7,-36),(3,-40)])
IRELAND_PATH=spline([(5,5),(2,-3),(0,-10),(-6,-18),(-12,-28),(-17,-32)])

def congo_original_bank(x,z):
    shore=2.4+2.1*math.sin((z+8)*.087)+.7*math.sin(z*.22)
    inland=min(shore-x,x+57+7*math.sin((z+30)*.041),z+87+9*math.sin((x+25)*.071),29-z+5*math.sin(x*.10))
    if inland<0: return max(-4.,.12+inland*.39)
    h=.14+1.7*smooth(inland/9)+.017*max(0,inland-9)+.09*noise(x,z)
    # Raised depot yard and lower, broad river landing apron.
    h=mix(h,2.05,smooth((10-dist(x,z,-19,-23))/4))
    h=mix(h,1.35,smooth((7-dist(x,z,-5,-34))/4))
    # Close ground has small eroded gullies, hand-cart ruts and irregular clay
    # relief. The station pads and timber-floor approaches stay unchanged.
    route=[(-3,3),(-7,-6),(-8,-10),(-12,-17),(-15,-22),(-5,-34)]
    d,_,_=closest_path(x,z,route)
    rut=-.085*math.exp(-((d-.70)/.28)**2)
    relief=.058*math.sin(x*2.03+z*.39)*math.cos(z*1.71)+.07*noise(x*.65,z*.65)
    erosion=-.16*math.exp(-(math.sin(z*.82+x*.32)/.33)**2)*smooth((4-inland)/3)
    strength=smooth((inland-.35)/1.1)
    for px,pz in [(-3,3),(-8,-10),(-15,-22),(1,-34)]:strength*=smooth((dist(x,z,px,pz)-.7)/1.7)
    strength*=1-smooth((7-dist(x,z,-19,-23))/2)
    strength*=1-smooth((5-dist(x,z,-5,-34))/2)
    h+=(rut+relief+erosion)*strength
    # An enlarged west cargo landing sits just above the bank; the mission's
    # original narrow outgoing walkway remains at exactly 1.35 metres.
    cargo=smooth(min(x+8.5,1.5-x,z+38.6,-35.1-z)/.8)
    h=mix(h,min(h,1.40),cargo)
    # Open water underneath the forward apron exposes its fascia and piles.
    # Ground-height queries are overridden by the continuous wooden deck.
    dock_cut=smooth(min(x+5.7,5.9-x,z+35.8,-31.9-z)/.65)
    h=mix(h,min(h,-.22),dock_cut)
    return h

def congo_navigation_base(x,z):
    """A cut-back, scalloped river edge; inland play heights remain exact.

    The old bank is retained separately to keep the established tree/canopy
    pivots. Near-water roots settle into the newly exposed river clay.
    """
    h=congo_original_bank(x,z)
    # Full erosion only near the east edge. The 1.5m transition begins east
    # of the spawn/path and ends near x=.1, opening the reflected-sun sightline.
    window=smooth((z+28)/3)*(1-smooth((z-10)/3))
    scallop=.10*math.sin(z*1.7)+.045*math.sin(z*4.1)
    edge=smooth((x+1.4+scallop)/1.5)
    cut=.90*window*edge
    # Small real rills break the exposed clay surface without steep path ruts.
    relief=(.045*math.sin(z*3.7+x*1.9)+.022*math.cos(z*7.1-x*4.0))*4*edge*(1-edge)*window
    h=h-cut+relief
    # Close walking ground carries real centimetre-scale geometry. The bank
    # footprint and all exact station pads are excluded from this displacement.
    patch=smooth((x+14)/1.3)*(1-smooth((x+2.1)/.5))*smooth((z+18)/1.3)*(1-smooth((z-6.7)/1.3))
    for px,pz in [(-3,3),(-8,-10),(-15,-22),(1,-34)]:patch*=smooth((dist(x,z,px,pz)-.9)/1.0)
    grain=.024*noise(x*3.7,z*3.7)+.014*math.sin(x*8.2+math.sin(z*2.4))*math.cos(z*7.3+math.sin(x*.8))
    d,_,_=closest_path(x,z,[(-3,3),(-7,-6),(-8,-10),(-12,-17)])
    ruts=-.043*math.exp(-((d-.83-.13*math.sin(z*.75))/.19)**2)
    return h+(grain+ruts)*patch

@lru_cache(maxsize=500000)
def congo_worn(x,z):
    d,_,_=closest_path(x,z,[(-3,6),(-3,3),(-5,-1),(-7,-6),(-8,-10),(-11,-15),(-13,-18)])
    width=1.86+.21*math.sin(z*.63)+.13*math.sin(z*1.49)
    return smooth((width-d)/.58)*smooth((x+14)/.7)*(1-smooth((x+2.2)/.9))*smooth((z+18)/.8)*(1-smooth((z-7)/1.0))

BANK_VISIBLE_BAYS=[(-9.8,-7.0,-1.96),(-6.5,-3.7,-1.83),(-3.2,-.35,-1.78),(.1,2.8,-1.62),(3.25,6.35,-1.48)]

@lru_cache(maxsize=600000)
def congo_base(x,z):
    h=congo_navigation_base(x,z)
    worn=congo_worn(x,z)
    if worn>.015:
        broad=sum(congo_navigation_base(x+dx,z+dz) for dx,dz in ((-.38,0),(.38,0),(0,-.38),(0,.38)))*.25
        h=mix(h,broad,worn*.95)
    # Broken clay shelves and recessed joints above the established waterline.
    # Their strength vanishes at the water surface, preserving its footprint.
    band=smooth((x+2.65)/.50)*(1-smooth((x-.40)/.8))*smooth((z+28)/3)*(1-smooth((z-9)/3))*smooth((h-.10)/.20)
    phase=.075*math.sin(z*1.23)+.035*math.sin(z*3.9)
    q=(h+phase)/.34;fraction=q-math.floor(q)
    terrace=(math.floor(q)+smooth((fraction-.38)/.30))*.34-phase
    joints=-.065*math.exp(-(math.sin(z*1.9+x*2.7)/.19)**2)
    h=mix(h,terrace+joints,band*.94)
    patch=smooth((x+14)/.7)*(1-smooth((x+2.6)/.6))*smooth((z+18)/.7)*(1-smooth((z-7.3)/.7))
    for px,pz in [(-3,3),(-8,-10),(-15,-22),(1,-34)]:patch*=smooth((dist(x,z,px,pz)-.30)/.55)
    h+=soil_displacement(x,z)*patch*(1-.72*worn)
    # Compacted soil retains 1–2cm compressed ridges rather than becoming a
    # featureless plane. Their short broken arcs stay inside the worn band.
    ridge=.012*math.sin(z*7.5+.9*math.sin(x*2.7))+.007*math.sin(x*11+z*3.4)
    h+=ridge*worn*patch
    # Connected sinuous channels cross the worn clay toward the bank. They
    # remain shallow enough to walk and fade completely at interaction pads.
    channel=min(closest_path(x,z,[(-11,4),(-8,2),(-6,1.6),(-3,0),(-1,-.5)])[0],
                closest_path(x,z,[(-12,-12),(-9,-10.8),(-7,-8.8),(-4,-8),(-1,-6.2)])[0])
    h-=.078*math.exp(-(channel/.18)**2)*patch
    # Cut actual space beneath five camera-facing lips, inland of the old
    # water-contour decorations. The authored BankMud caps cover these bays.
    for z0,z1,anchor in BANK_VISIBLE_BAYS:
        cut=smooth((z-z0)/.25)*(1-smooth((z-z1+.25)/.25))*smooth((x-anchor+.28)/.16)*(1-smooth((x-anchor-.64)/.20))
        h-=.25*cut
    for px,pz in [(-3,3),(-8,-10)]:
        flat=1-smooth((dist(x,z,px,pz)-.30)/.35)
        h=mix(h,congo_navigation_base(px,pz),flat)
    return h

def amazon_base(x,z):
    islands=[(2,3,11,10,1.0),(-18,-11,14,9,1.10),(-15,-29,12,10,1.12),(2,-43,11,9,1.02),(-37,-3,12,24,1.65),(26,-30,13,34,1.3),(-22,-65,29,12,1.7)]
    h=-2.0
    for cx,cz,rx,rz,high in islands:
        d=math.sqrt(((x-cx)/rx)**2+((z-cz)/rz)**2)
        q=high*(1-.16*d)+.065*noise(x,z) if d<.76 else mix(high*.88,-1.4,smooth((d-.76)/.33))
        h=max(h,q)
    d,_,_=closest_path(x,z,AMAZON_PATH)
    # Flush plank access where a boardwalk returns to a dry island.
    if h>.50 and d<3.2: h=mix(h,1.22,smooth((3.2-d)/1.4))
    if -23<x<-4 and -36<z<-25: h=mix(h,1.04,smooth(min(x+23,-4-x,z+36,-25-z)/1.5))
    return h

def ireland_shore(z):return 6.0+4.5*math.cos((z+9)*.095)+.22*math.sin(z*.66)+.12*math.sin(z*1.57)

def ireland_base(x,z):
    shore=ireland_shore(z)
    inland=shore-x
    if inland<0: return max(-5.,.05+inland*.35)
    beach=.055+.105*smooth(inland/1.7)+.025*inland+.014*math.sin(x*3.5+z*.32)*smooth(inland/2)
    dune=3.7*smooth((inland-11)/11)+.44*math.sin(z*.24+x*.15)*smooth((inland-11)/7)
    h=beach+dune
    h+=3.7*math.exp(-((x-1)/12)**2-((z+47)/7)**2)*smooth(inland/2)
    h=mix(h,3.9,smooth((9-dist(x,z,-18,-32))/4))
    d,p,t=closest_path(x,z,IRELAND_PATH)
    if d<3.2:
        stations=[.28,.32,.38,1.8,3.52,3.9]
        # Nearest original path segment provides a deliberately gentle climb.
        originals=[(5,5),(2,-3),(0,-10),(-6,-18),(-12,-28),(-17,-32)]
        best=(1e9,0,0)
        for i,(a,b) in enumerate(zip(originals,originals[1:])):
            dd,tt=segment_distance(x,z,a,b)
            if dd<best[0]: best=(dd,i,tt)
        target=mix(stations[best[1]],stations[best[1]+1],best[2])
        h=mix(h,target,smooth((3.2-d)/1.9))
    return h

HEIGHT_FUNCS={'congo':congo_base,'amazonia':amazon_base,'ireland':ireland_base}

def terrain(region):
    height=HEIGHT_FUNCS[region]; mats=['Laterite','Earth'][region!='congo']
    # An authored variable-height shoreline mesh, underwater margin cropped to
    # a contour. Adjacent cells share vertices inside each material batch.
    for mat in ([mats,'Sand','Stone','WetSand','DuneTurf'] if region=='ireland' else ([mats,'WornLaterite'] if region=='congo' else [mats,'Sand','Stone'])):
        verts=[];fs=[];idx={}
        def vert(x,z):
            k=(x,z)
            if k not in idx: idx[k]=len(verts); verts.append((x,height(x,z),z))
            return idx[k]
        for z in range(-100,35):
            for x in range(-65,56):
                y=height(x+.5,z+.5)
                if y < -1.15: continue
                use=mats
                if region=='ireland':
                    use='Stone' if z<-44 and x>-17 else ('DuneTurf' if y>1.72 else 'Sand')
                if use!=mat and not(region=='congo' and mat=='WornLaterite'): continue
                divisions=2 if region=='congo' and -29<=x<9 and -49<=z<12 else 1
                if region=='congo' and -2<=x<2 and -27<=z<11:divisions=4
                if region=='congo' and -14<=x<1 and -18<=z<8:divisions=8
                if region=='congo' and -14<=x<-2 and -18<=z<8:divisions=16
                if region=='congo' and divisions==16 and min(congo_worn(x+dx,z+dz) for dx,dz in ((0,0),(1,0),(0,1),(1,1)))>.80:divisions=8
                if region=='ireland' and -28<=x<18 and -55<=z<14:divisions=2
                if region=='ireland' and 0<=x<15 and -19<=z<11:divisions=4
                for iz in range(divisions):
                    for ix in range(divisions):
                        xx=x+ix/divisions;zz=z+iz/divisions;step=1/divisions
                        if region=='congo' and ('WornLaterite' if congo_worn(xx+step*.5,zz+step*.5)>.55 else 'Laterite')!=mat:continue
                        a,b,c,d=vert(xx,zz),vert(xx+step,zz),vert(xx+step,zz+step),vert(xx,zz+step)
                        fs.extend([(a,c,b),(a,d,c)])
        if verts:
            uvs=[[(verts[i][0]*.5,verts[i][2]*.5) for i in f] for f in fs] if region=='congo' else None
            polygon(mat,verts,fs,.5 if region=='congo' else (.43 if region!='ireland' else .9),True,uvs)

def obstacle(x,z,r): OBSTACLES.append({'x':round(x,3),'z':round(z,3),'r':round(r,3)})
def landmark(name,x,z,y=None): LANDMARKS.append({'name':name,'position':[x,round(y if y is not None else HEIGHT_FN(x,z),3),z]})
def rect_surface(x0,x1,z0,z1,y): WALK_SURFACES.append({'type':'rect','bounds':[x0,x1,z0,z1],'height':y})

def planked_rect(x0,x1,z0,z1,y,mat='Timber',width=.28):
    z=z0
    while z<z1:
        dz=min(width,z1-z)-.018
        box(mat,((x0+x1)/2,y-.06,z+dz/2),(x1-x0,.12,dz),bevel=.016)
        z+=width
    rect_surface(x0,x1,z0,z1,y)

def boardwalk(points,y=1.25,width=3.25,rails=True):
    # Each cross-plank follows a smoothly turning, physically supported path.
    pts=spline(points) if len(points)<50 else points
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        dx,dz=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dz)
        if length<.02: continue
        angle=math.atan2(dx,dz)
        box('Timber',((a[0]+b[0])/2,y-.08,(a[1]+b[1])/2),(width,.16,length+.008),angle,bevel=.012)
        if i%9==0:
            side=(math.cos(angle),-math.sin(angle))
            for sign in (-1,1):
                x=a[0]+sign*side[0]*(width/2-.12);z=a[1]+sign*side[1]*(width/2-.12)
                beam('DarkTimber',(x,-.7,z),(x,y+(.9 if rails and i%18==0 else .1),z),.09,.08)
                if rails and i%18==0 and i+18<len(pts):
                    q=pts[i+18]; nxt=(q[0]+sign*side[0]*(width/2-.12),y+.85,q[1]+sign*side[1]*(width/2-.12))
                    beam('DarkTimber',(x,y+.85,z),nxt,.045)
            # Paired stringers are visible under the planks at creek crossings.
        if i%3==0 and i+3<len(pts):
            q=pts[i+3]; side=(math.cos(angle),-math.sin(angle))
            for sign in (-1,1):beam('DarkTimber',(a[0]+sign*side[0]*1.05,y-.25,a[1]+sign*side[1]*1.05),(q[0]+sign*side[0]*1.05,y-.25,q[1]+sign*side[1]*1.05),.09)
    WALK_SURFACES.append({'type':'path','points':points,'width':width,'height':y})

def pitched_roof(x,z,w,d,eave,ridge,mat='DarkTimber',overhang=.5):
    # Real sheet roof with gently worn, undulating eaves; ridgeline along Z.
    for side in (-1,1):
        verts=[];fs=[];nx=10;nz=max(8,int(d*4))
        for j in range(nz+1):
            zz=z-d/2-overhang+(d+2*overhang)*j/nz
            for i in range(nx+1):
                t=i/nx;xx=x+side*(w/2+overhang)*t
                yy=mix(ridge,eave,t)+.035*math.sin(j*2.1+i*.6)*t
                verts.append((xx,yy,zz))
        for j in range(nz):
            for i in range(nx):a=j*(nx+1)+i;fs.append((a+nx+1,a+nx+2,a+1,a) if side==1 else (a+nx+2,a+nx+1,a,a+1))
        polygon(mat,verts,fs,1.1)
        # Worn exposed edge strips and structure under eave.
        beam('Timber',(x+side*(w/2+.35),eave-.03,z-d/2-.5),(x+side*(w/2+.35),eave-.03,z+d/2+.5),.085)
    beam('Timber',(x,ridge+.025,z-d/2-.6),(x,ridge+.025,z+d/2+.6),.09)

def thatch_plane(x0,x1,z0,z1,y0,y1,swap=False,seed=417):
    """Overlapping bent sheaves with curled, irregular tips and fiber eaves.

    Every bundle is a real 3D surface. Individual courses cast small shadows
    over the preceding course, while the low roof deck closes any tiny gaps.
    """
    rr=random.Random(seed);span=abs(x1-x0);pitch=math.hypot(span,y1-y0)
    low_awning=abs(y1-y0)/max(span,.01)<.25
    rows=5 if pitch>4.7 else max(2,int(pitch/.86));cols=max(2,int((z1-z0)/.23));cross=5
    def point(x,y,z):return (z,y,x) if swap else (x,y,z)
    # Shared course vertices avoid intersecting caps. The small varied curl
    # makes an interrupted straw shadow instead of a continuous dark slat.
    # Advance the old local stream so the already accepted fine eaves stay exact.
    for _ in range(cols*((rows-1)+1+rows*(3+cross))):rr.random()
    nz=max(12,int((z1-z0)/.08));nj=5
    for row in range(rows):
        v=[];faces=[];uvs=[];surface_uvs=[]
        for j in range(nj+1):
            q=j/nj
            for k in range(nz+1):
                zz=mix(z0,z1,k/nz)
                wave=.012*math.sin(zz*1.25+row*.9)+.004*math.sin(zz*4.3+seed)
                t0=row/rows+(wave if row else 0)
                ends=.0032*math.sin(zz*17.3+row*2.7)+.0018*math.sin(zz*37.1-row)
                if low_awning:ends+=.010*math.sin(zz*5.3+row*2.5)
                t1=(row+1)/rows+((wave+ends) if row<rows-1 else 0)+.065/rows
                t=mix(t0,t1,q)
                xx=mix(x0,x1,t)
                # Upper course rests just above the following course at the
                # overlap. The 3–5 cm curl leaves short shadows between the
                # bundles; slope-aligned fine ridges continue across courses.
                curl=.039+.011*math.sin(zz*9.1+row)+.007*math.sin(zz*22.7-row*.4)
                if low_awning:
                    # At least half each shallow overlap lies almost flush;
                    # raised groups are about 30–55 cm wide, never a long bar.
                    raised=smooth((math.sin(zz*5.3+row*2.5)+.25*math.cos(zz*11.7-row)-.1)/.45)
                    curl=.004+.050*raised
                course=.10+(curl*q**2 if row<rows-1 else .045*math.sin(q*PI))
                ridges=.018*math.sin(zz*31+.18*math.sin(t*5))+.010*math.cos(zz*57+t*3)
                yy=mix(y0,y1,t)+course+ridges+.010*math.sin(zz*2.3+t*7)
                v.append(point(xx,yy,zz))
                # The source has roughly 60 fibres across its tile. At the
                # former 0.5m repeat each fibre was subpixel at the start view.
                # Preserve the original atlas and map it at readable scale;
                # continuous V keeps fibre direction aligned down the slope.
                surface_uvs.append(((zz-z0)/4.5,t*pitch/3.3))
        for j in range(nj):
            for k in range(nz):
                a=j*(nz+1)+k;f=(a,a+nz+1,a+nz+2,a+1)
                n=(Vector(v[f[1]])-Vector(v[f[0]])).cross(Vector(v[f[2]])-Vector(v[f[0]]))
                if n.y<0:f=tuple(reversed(f))
                faces.append(f)
                uvs.append([surface_uvs[vtx] for vtx in f])
        polygon('RoofThatch',v,faces,smooth=True,uvs=uvs)
        tip=v[-(nz+1):];depth=.024 if row<rows-1 else .060
        under=[(p[0],p[1]-depth*(.80+.20*math.sin(k*1.73+row) if row<rows-1 else 1),p[2]) for k,p in enumerate(tip)]
        caps=[]
        for k in range(nz):
            f=(k,k+1,k+nz+2,k+nz+1)
            n=(Vector((tip+under)[f[1]])-Vector((tip+under)[f[0]])).cross(Vector((tip+under)[f[2]])-Vector((tip+under)[f[0]]))
            expected=Vector(point(1 if x1>x0 else -1,0,0))
            if n.dot(expected)<0:f=tuple(reversed(f))
            caps.append(f)
        shade=.90 if row<rows-1 else 1.
        batch('RoofThatchDark').add(tip+under,caps,2,False,colors=[(shade,shade,shade,1)]*((nz+1)*2))
    # Thin hanging ends avoid the straight, machine-cut silhouette of a slab.
    for i in range(int((z1-z0)/.07)):
        zz=z0+i*.07+rr.uniform(-.015,.015);end=rr.uniform(.05,.20);thick=rr.uniform(.012,.028)
        a=point(x1,y1+.01,zz-thick);b=point(x1,y1+.01,zz+thick)
        c=point(x1+(1 if x1>x0 else -1)*end,y1-rr.uniform(.07,.19),zz+thick*.25)
        polygon('RoofThatch',[a,b,c],scale=2,smooth=True)
    # Closed, bent tufts replace coplanar ribbons. Both the low side eave and
    # the two gable edges project beyond the structural roof, including the
    # front edge actually facing the arrival camera.
    edge_rng=random.Random(seed+7100);tuft_rng=random.Random(seed+8103)
    def tuft(centers,side,width,course=False):
        # The fine alpha strands carry the silhouette. Keep only a third of
        # the old thick tufts, shortened and recessed as secondary 3D volume.
        if tuft_rng.random()>0 and not course:return
        anchor=centers[0]
        centers=[anchor]+[(mix(anchor[0],p[0],.58),mix(anchor[1],p[1],.52),mix(anchor[2],p[2],.58)) for p in centers[1:]]
        width*=.43
        vv=[];N=5
        for j,(xx,yy,zz) in enumerate(centers):
            taper=(1,.76,.32)[j]
            for k in range(N):
                a=k*2*PI/N
                vv.append(point(xx+side[0]*math.cos(a)*width*taper,
                                yy+math.sin(a)*.042*taper,
                                zz+side[1]*math.cos(a)*width*taper))
        ff=[(j*N+k,(j+1)*N+k,(j+1)*N+(k+1)%N,j*N+(k+1)%N) for j in range(2) for k in range(N)]
        ff += [tuple(range(N-1,-1,-1)),tuple(2*N+k for k in range(N))]
        signed=sum(Vector(vv[f[0]]).dot(Vector(vv[f[k]]).cross(Vector(vv[f[k+1]]))) for f in ff for k in range(1,len(f)-1))
        if signed<0:ff=[tuple(reversed(f)) for f in ff]
        # Bright upper straw and dark lower cross-sections have separate faces,
        # so their normals never cancel as two reversed coplanar ribbons do.
        polygon('RoofThatch',vv,[f for i,f in enumerate(ff) if i<10 and i%N in (0,1)],scale=2,smooth=True)
        polygon('RoofThatchDark',vv,[f for i,f in enumerate(ff) if not(i<10 and i%N in (0,1))],scale=2,smooth=True)
        # Individual broken ends project past the blunt bundle cut. This keeps
        # the eave fibrous, instead of a repeated row of sharpened leaf tips.
        dx=centers[2][0]-centers[1][0];dz=centers[2][2]-centers[1][2];length=math.hypot(dx,dz) or 1
        for fibre in (-1,1):
            xx,yy,zz=centers[2];xx+=side[0]*width*fibre*.30;zz+=side[1]*width*fibre*.30
            reach=edge_rng.uniform(.06,.19);w=.008
            points=[point(xx-side[0]*w,yy+.015,zz-side[1]*w),point(xx+side[0]*w,yy+.015,zz+side[1]*w),
                    point(xx+dx/length*reach,yy-edge_rng.uniform(.035,.10),zz+dz/length*reach)]
            polygon('RoofThatchDark',points,[(0,1,2),(2,1,0)],scale=2,smooth=False)
    sign=1 if x1>x0 else -1
    for i in range(int((z1-z0)/.145)):
        zz=z0+(i+.5)*.145+edge_rng.uniform(-.03,.03)
        width=edge_rng.uniform(.050,.085);end=edge_rng.uniform(.25,.48);hang=edge_rng.uniform(.23,.43)
        tuft([(x1-sign*.23,y1+(y0-y1)*.23/span+.008,zz),
              (x1+sign*end*.35,y1-.09,zz+.022),
              (x1+sign*end,y1-hang,zz+edge_rng.uniform(-.055,.055))],(0,1),width)
    for edge,direction in ((z0,-1),(z1,1)):
        for i in range(max(2,int(pitch/.145))):
            t=(i+.5)/int(pitch/.145);xx=mix(x0,x1,t);yy=mix(y0,y1,t)
            end=edge_rng.uniform(.22,.44);hang=edge_rng.uniform(.24,.44)
            tuft([(xx,yy+.025,edge-direction*.14),
                  (xx+sign*.045,yy-.07,edge+direction*end*.40),
                  (xx+sign*edge_rng.uniform(.03,.14),yy-hang,edge+direction*end)],(1,0),edge_rng.uniform(.047,.080))
    # Curved narrow strips carry the unmodified original alpha fringe, at a
    # 2m physical repeat. The ragged edge comes from actual fine straw strands,
    # while the existing roof and sparse buried tufts supply its thickness.
    def fibre_strip(length,edge,outward):
        cols=max(3,math.ceil(length/.16));vv=[];ff=[];coords=[]
        for j,t in enumerate((0,.22,.52,.78,1.)):
            for i in range(cols+1):
                s=i/cols*length;x,y,z=edge(s/length)
                fall=.28+.017*math.sin(s*.83+seed*.1)
                bend=.19*t-.07*t*t
                vv.append(point(x+outward[0]*bend,y+.10-fall*t+.009*math.sin(s*4.1+seed)*t,z+outward[1]*bend))
                coords.append((s/ .72,1-t))
        for j in range(4):
            for i in range(cols):
                a=j*(cols+1)+i;f=(a,a+cols+1,a+cols+2,a+1)
                normal=(Vector(vv[f[1]])-Vector(vv[f[0]])).cross(Vector(vv[f[2]])-Vector(vv[f[0]]))
                expected=Vector(point(outward[0],0,outward[1]))
                ff.append(tuple(reversed(f)) if normal.dot(expected)<0 else f)
        polygon('RoofThatchFibre',vv,ff,smooth=True,uvs=[[coords[k] for k in f] for f in ff])
        # Narrow independent curved reeds provide the long projecting ends.
        # A short alpha fringe supplies density behind them, not large pointed
        # sheets. Uneven lengths and paired offsets avoid a comb silhouette.
        fibres=random.Random(seed+int(length*713))
        for k in range(int(length/.032)):
            s=(k+fibres.uniform(.1,.9))*.032
            if fibres.random()<.15:continue
            x,y,z=edge(s/length);width=fibres.uniform(.006,.016)
            hang=fibres.uniform(.22,.43);bend=fibres.uniform(.035,.13);sway=fibres.uniform(-.05,.05)
            tangent=(-outward[1],outward[0]);v=[]
            for t in (0,.43,1):
                px=x+outward[0]*bend*t+tangent[0]*sway*t*t;py=y+.025-hang*t;pz=z+outward[1]*bend*t+tangent[1]*sway*t*t
                w=width*(1-.80*t)
                for sign in (-1,1):v.append(point(px+tangent[0]*w*sign,py,pz+tangent[1]*w*sign))
            polygon('RoofThatchDark' if k%4 else 'RoofThatch',v,[(0,2,3,1),(2,4,5,3)],scale=2,smooth=False)
    fibre_strip(z1-z0,lambda t:(x1-sign*.065,y1,mix(z0,z1,t)),(sign,0))
    for edge,direction in ((z0,-1),(z1,1)):
        fibre_strip(pitch,lambda t:(mix(x0,x1,t),mix(y0,y1,t),edge-direction*.055),(0,direction))
    if low_awning:
        # Reuse the existing closed straw tuft geometry only at selected
        # interior course ends. All accepted outer eave geometry is generated
        # before this independent stream and remains exactly unchanged.
        bundles=random.Random(seed+12911)
        for row in range(rows-1):
            for i in range(int((z1-z0)/.68)):
                zz=z0+.28+i*.68+bundles.uniform(-.17,.17)
                if bundles.random()<.32:continue
                wave=.012*math.sin(zz*1.25+row*.9)+.004*math.sin(zz*4.3+seed)
                ends=.0032*math.sin(zz*17.3+row*2.7)+.0018*math.sin(zz*37.1-row)+.010*math.sin(zz*5.3+row*2.5)
                t=(row+1)/rows+wave+ends+.065/rows
                xx=mix(x0,x1,t);yy=mix(y0,y1,t)+.125
                reach=bundles.uniform(.20,.42)
                tuft([(xx-sign*.12,yy,zz),(xx+sign*.09,yy-.006,zz+.016),
                      (xx+sign*reach,yy-.045,zz+bundles.uniform(-.03,.03))],(0,1),bundles.uniform(.20,.31),course=True)

def depot():
    x,z=-22,-22; floor=2.1; w,d=9,11
    planked_rect(x-w/2,x+w/2,z-d/2,z+d/2,floor)
    # Tall raised administrative timber building, east colonnade and broad open entry.
    for xx in (x-w/2,x+w/2):
        for zz in np.linspace(z-d/2,z+d/2,5):
            beam('DarkTimber',(xx,HEIGHT_FN(xx,zz)-.2,zz),(xx,floor+3.15,zz),.145);obstacle(xx,zz,.25)
    for zz in (z-d/2,z+d/2):
        for xx in np.arange(x-w/2+.16,x+w/2,.36):
            # High window slit appears as actual opening in the plank wall.
            if abs(xx-x)<1.2:
                box('WallBoards',(xx,floor+.48,zz),(.34,.96,.15));box('WallBoards',(xx,floor+2.75,zz),(.34,.7,.15))
            else:box('WallBoards',(xx,floor+1.6,zz),(.34,3.2,.15))
        for yy in (.18,1.1,2.5):beam('DarkTimber',(x-w/2,floor+yy,zz),(x+w/2,floor+yy,zz),.075)
    # West solid wall; east entry opening 3m wide opposite mission ledger pad.
    for zz in np.arange(z-d/2+.18,z+d/2,.37):
        box('WallBoards',(x-w/2,floor+1.6,zz),(.15,3.2,.35))
        if abs(zz-z)>1.8: box('WallBoards',(x+w/2,floor+1.6,zz),(.15,3.2,.35))
    pitched_roof(x,z,w,d,floor+3.12,floor+5.6)
    for side in (-1,1):
        thatch_plane(x,x+side*(w/2+.65),z-d/2-.63,z+d/2+.63,floor+5.68,floor+3.03,seed=416+side)
        for zz in np.arange(z-d/2,z+d/2,.72):
            if abs(zz-z)>1.8:
                box('DarkTimber',(x+side*(w/2+.10),floor+1.57,zz),(.09,3.14,.055))
                for yy in (.40,2.68):beam('Iron',(x+side*(w/2+.16),floor+yy,zz),(x+side*(w/2+.18),floor+yy,zz),.017,sides=6)
        for zz in np.arange(z-d/2,z+d/2,2.2):
            beam('DarkTimber',(x,floor+5.53,zz),(x+side*(w/2+.45),floor+3.03,zz),.08,sides=6)
    # Closed boarded gables with structural corner posts and cross bracing.
    for zz in (z-d/2,z+d/2):
        for xx in np.arange(x-w/2+.16,x+w/2,.33):
            hh=max(.02,2.48*(1-abs(xx-x)/(w/2)))
            box('WallBoards',(xx,floor+3.12+hh*.5,zz),(.315,hh,.16),bevel=.01)
        beam('DarkTimber',(x-w/2,floor+3.12,zz),(x,floor+5.60,zz),.10,sides=6)
        beam('DarkTimber',(x,floor+5.60,zz),(x+w/2,floor+3.12,zz),.10,sides=6)
        for sign in (-1,1):
            beam('DarkTimber',(x+sign*(w/2-.2),floor+.24,zz+.1),(x+sign*1.5,floor+2.7,zz+.1),.055,sides=4)
    # Bound bundles over the ridge and short wooden retaining pins.
    for zz in np.arange(z-d/2-.63,z+d/2+.63,.26):
        beam('RoofThatch',(x-.2,floor+5.63,zz),(x+.2,floor+5.63,zz),.17,.16,sides=7)
    for zz in np.arange(z-d/2,z+d/2,1.5):beam('DarkTimber',(x-.2,floor+5.76,zz),(x+.2,floor+5.76,zz+.15),.027,sides=5)
    planked_rect(x+w/2,x+w/2+3,z-d/2,z+d/2,floor)
    for zz in (z-5,z+5):beam('DarkTimber',(x+w/2+2.8,floor,zz),(x+w/2+2.8,floor+2.65,zz),.12);obstacle(x+w/2+2.8,zz,.22)
    polygon('DarkTimber',[(x+w/2,floor+3.0,z-d/2-.3),(x+w/2+3.3,floor+2.55,z-d/2-.3),(x+w/2+3.3,floor+2.55,z+d/2+.3),(x+w/2,floor+3.0,z+d/2+.3)],scale=.6)
    thatch_plane(x+w/2,x+w/2+3.4,z-d/2-.42,z+d/2+.42,floor+3.08,floor+2.56,seed=75)
    # Blocking segments follow walls instead of forbidding the navigable interior.
    for zz in np.arange(z-d/2,z+d/2,.75):
        obstacle(x-w/2,zz,.45)
        if abs(zz-z)>1.8:obstacle(x+w/2,zz,.45)
    for xx in np.arange(x-w/2,x+w/2,.7):
        for zz in (z-d/2,z+d/2):obstacle(xx,zz,.43)
    # Desk and cabinet stay out of the entry and ledger mission pad.
    box('DarkTimber',(x-1,floor+.82,z+2.7),(3.6,.16,1.3));
    for dx in (-1.5,1.5):
        for dz in (-.45,.45):box('Timber',(x-1+dx,floor+.38,z+2.7+dz),(.1,.75,.1))
    box('Canvas',(x-1.3,floor+.96,z+2.7),(.7,.1,.48));obstacle(x-1,z+2.7,1.8)
    landmark('Raised administrative depot',x,z,floor)

def crate(x,y,z,w=1,angle=0):
    box('Timber',(x,y+w*.5,z),(w,w,w),angle,bevel=.045)
    def point(xx,yy,zz):return (x+xx*math.cos(angle)+zz*math.sin(angle),y+yy,z-xx*math.sin(angle)+zz*math.cos(angle))
    for zz in (-w*.51,w*.51):
        for xx in (-w*.42,w*.42):box('DarkTimber',point(xx,w*.5,zz),(.095,w,.065),angle)
        beam('DarkTimber',point(-w*.45,.1,zz),point(w*.45,w-.1,zz),.047,sides=4)
    if angle:
        for yy in (.20,.44,.68,.90):
            for zz in (-w*.512,w*.512):beam('DarkTimber',point(-w*.46,yy*w,zz),point(w*.46,yy*w,zz),.012,sides=4)

def steamer():
    # Custom riverboat hull, transverse frames, raised bridge and tall stack.
    cx,cz=9.8,-29; length=16;width=4.9
    stations=[(-.5,.07),(-.44,.64),(-.3,.93),(.25,1),(.42,.86),(.5,.07)]
    # Monotone Hermite sections preserve the six accepted hull landmarks
    # while rounding the long boards through 41 true transverse stations.
    dense=[]
    for i,((za,wa),(zb,wb)) in enumerate(zip(stations,stations[1:])):
        left=stations[max(0,i-1)];right=stations[min(len(stations)-1,i+2)]
        ma=(wb-left[1])/(zb-left[0]);mb=(right[1]-wa)/(right[0]-za)
        if i and (wa-left[1])*(wb-wa)<=0:ma=0
        if i<len(stations)-2 and (wb-wa)*(right[1]-wb)<=0:mb=0
        for j in range(8):
            t=j/8;h00=2*t**3-3*t*t+1;h10=t**3-2*t*t+t;h01=-2*t**3+3*t*t;h11=t**3-t*t
            dense.append((mix(za,zb,t),clamp(h00*wa+h10*(zb-za)*ma+h01*wb+h11*(zb-za)*mb,min(wa,wb),max(wa,wb))))
    dense.append(stations[-1])
    section=[(-.60,-.45),(-.77,-.34),(-.91,-.10),(-.985,.16),(-1,.25),(-.997,.40),(-.98,.62),(-.96,.74),(.96,.74),(.98,.62),(.997,.40),(1,.25),(.985,.16),(.91,-.10),(.77,-.34),(.60,-.45)]
    verts=[]
    for dz,spread in dense:
        for lateral,y in section:
            verts.append((cx+lateral*width*.5*spread,y,cz+dz*length))
    fs=[];painted=[]
    N=len(section)
    for i in range(len(dense)-1):
        for j in range(N):
            face=(i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j)
            (painted if 4<=j<=6 or 8<=j<=10 else fs).append(face)
    fs.extend([tuple(range(N-1,-1,-1)),tuple((len(dense)-1)*N+j for j in range(N))]);polygon('Iron',verts,fs,.4,True)
    polygon('HullPaint',verts,painted,.7,True)
    # Curved, doubled gunwales and a lower rubbing strake follow the hull's
    # transverse sections instead of forming a plain capsule outline.
    for sign in (-1,1):
        for (za,wa),(zb,wb) in zip(stations,stations[1:]):
            for yy,rr,mat in ((.79,.065,'Timber'),(.65,.035,'DarkTimber'),(.27,.055,'Timber')):
                beam(mat,(cx+sign*width*.5*wa,yy,cz+za*length),(cx+sign*width*.5*wb,yy,cz+zb*length),rr,sides=7)
    planked_rect(cx-2,cx+2,cz-5.7,cz+6.7,.83)
    box('DarkTimber',(cx,1.72,cz+.5),(2.50,1.70,6.95),bevel=.12)
    # Actual recessed side windows between weathered painted wall boards.
    for side in (-1,1):
        xx=cx+side*1.55
        for yy,hh in ((1.16,.65),(2.46,.44)):
            box('BoatPaint',(xx,yy,cz+.5),(.15,hh,7.1),bevel=.04)
        for zz in np.arange(cz-3.025,cz+4.05,1.2):box('BoatPaint',(xx,1.95,zz),(.15,.92,.259),bevel=.024)
        for zz in np.arange(cz-2.3,cz+3.8,1.2):
            # Dark glazing/recess behind raised wooden jambs and sills.
            box('Iron',(xx-side*.17,1.95,zz),(.035,.62,.67),bevel=.035)
            outside=[(1.54,zz-.38),(2.36,zz-.38),(2.36,zz+.38),(1.54,zz+.38)]
            inside=[(1.64,zz-.32),(2.26,zz-.32),(2.26,zz+.32),(1.64,zz+.32)]
            rv=[(xx+side*.07,y,zp) for y,zp in outside]+[(xx-side*.15,y,zp) for y,zp in inside]
            rf=[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)]
            polygon('Timber',rv,[tuple(reversed(f)) for f in rf] if side<0 else rf,scale=.85)
            for dz in (-.38,.38):box('Timber',(xx+side*.052,1.95,zz+dz),(.08,.83,.048),bevel=.012)
            for yy in (1.56,2.34):box('Timber',(xx+side*.052,yy,zz),(.09,.049,.82),bevel=.012)
            box('BoatPaint',(xx+side*.06,1.51,zz),(.18,.08,.88),bevel=.012)
        for yy in (1.02,1.25,1.47,2.43,2.61):beam('Timber',(xx+side*.09,yy,cz-3.03),(xx+side*.09,yy,cz+4.02),.016,sides=4)
        for zz in (cz-3.04,cz+4.04):box('Timber',(xx,1.76,zz),(.15,1.93,.15),bevel=.025)
    for zz in (cz-3.08,cz+4.08):
        if zz<cz:box('BoatPaint',(cx,1.76,zz),(3.04,1.85,.14),bevel=.06)
        else:
            for yy,hh in ((1.1375,.605),(2.4825,.405)):box('BoatPaint',(cx,yy,zz),(3.04,hh,.14),bevel=.025)
            for xx in (cx-1.45,cx-.60,cx+.60,cx+1.45):box('BoatPaint',(xx,1.88,zz),(.0844,.90,.14),bevel=.014)
            for sign in (-1,1):
                xx=cx+sign*1.02;box('Iron',(xx,1.89,zz-.24),(.51,.54,.035),bevel=.02)
                outer=[(xx-.39,1.49),(xx+.39,1.49),(xx+.39,2.31),(xx-.39,2.31)]
                inner=[(xx-.255,1.625),(xx+.255,1.625),(xx+.255,2.165),(xx-.255,2.165)]
                rv=[(xp,yp,zz+.085) for xp,yp in outer]+[(xp,yp,zz-.22) for xp,yp in inner]
                polygon('Timber',rv,[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)],scale=.85)
        box('DarkTimber',(cx,1.65,zz+.08),(1.02,1.6,.08),bevel=.045)
        for xx in (cx-.57,cx+.57):box('Timber',(xx,1.70,zz+.11),(.09,1.83,.10))
        box('Timber',(cx,2.62,zz+.11),(1.23,.1,.12))
    planked_rect(cx-2.1,cx+2.1,cz-3.8,cz+4.4,2.75)
    # Wheelhouse walls are assembled around real window openings. Deep glass
    # and chamfered reveals replace dark rectangles pasted onto a solid cube.
    box('BoatPaint',(cx,3.52,cz-3.25),(2.7,1.5,.12),bevel=.045)
    zz=cz-.95
    for yy,hh in ((3.035,.53),(4.135,.27)):box('BoatPaint',(cx,yy,zz),(2.7,hh,.12),bevel=.025)
    for xx in (cx-1.28,cx,cx+1.28):box('BoatPaint',(xx,3.65,zz),(.079,.73,.12),bevel=.012)
    for sign in (-1,1):
        xx=cx+sign*.65;box('Iron',(xx,3.67,zz-.24),(.78,.44,.035),bevel=.02)
        outer=[(xx-.53,3.31),(xx+.53,3.31),(xx+.53,4.03),(xx-.53,4.03)]
        inner=[(xx-.39,3.45),(xx+.39,3.45),(xx+.39,3.89),(xx-.39,3.89)]
        rv=[(xp,yp,zz+.075) for xp,yp in outer]+[(xp,yp,zz-.22) for xp,yp in inner]
        polygon('Timber',rv,[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)],scale=.85)
    for side in (-1,1):
        xx=cx+side*1.35
        for yy,hh in ((3.035,.53),(4.135,.27)):box('BoatPaint',(xx,yy,cz-2.1),(.13,hh,2.3),bevel=.022)
        for zz in (cz-3.18,cz-2.1,cz-1.04):box('BoatPaint',(xx,3.63,zz),(.13,.75,.105),bevel=.016)
    for xx in (cx-1.37,cx+1.37):
        side=-1 if xx<cx else 1
        for zz in (cz-2.65,cz-1.5):
            box('Iron',(xx-side*.20,3.67,zz),(.035,.6,.82),bevel=.025)
            outside=[(3.32,zz-.47),(4.02,zz-.47),(4.02,zz+.47),(3.32,zz+.47)]
            inside=[(3.37,zz-.41),(3.97,zz-.41),(3.97,zz+.41),(3.37,zz+.41)]
            rv=[(xx+side*.06,y,zp) for y,zp in outside]+[(xx-side*.18,y,zp) for y,zp in inside]
            rf=[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)]
            polygon('Timber',rv,[tuple(reversed(f)) for f in rf] if side<0 else rf,scale=.8)
        for zz in (cz-3.18,cz-2.1,cz-1.04):box('Timber',(xx,3.53,zz),(.09,1.57,.09))
        for yy in (2.91,3.29,4.03):box('Timber',(xx,yy,cz-2.1),(.09,.062,2.38))
    box('DarkTimber',(cx,4.38,cz-2.1),(3.4,.19,2.9))
    beam('Iron',(cx,2.8,cz+1),(cx,6.0,cz+1),.43,.35,sides=16)
    beam('Brick',(cx,5.2,cz+1),(cx,5.55,cz+1),.445,.435,sides=16)
    beam('Iron',(cx,5.99,cz+1),(cx,6.12,cz+1),.46,.46,sides=16)
    for zz in np.arange(cz-5.5,cz+6.5,1.6):
        for sign in (-1,1):beam('Iron',(cx+sign*2,.8,zz),(cx+sign*2,1.72,zz),.035,sides=6)
    for sign in (-1,1):
        for yy in (1.25,1.7):beam('Iron',(cx+sign*2,yy,cz-5.5),(cx+sign*2,yy,cz+6.3),.025,sides=6)
        beam('Timber',(cx+sign*2,1.74,cz-5.5),(cx+sign*2,1.74,cz+6.3),.048,sides=7)
    for zz in (cz-5,cz+5):
        beam('Timber',(cx,.83,zz),(cx,5.8,zz),.085,.04)
        beam('Iron',(cx,5.7,zz),(cx+1.9,.9,zz+2),.015,sides=4)
    landmark('River steamer',cx,cz,.8)

def sculpted_hero_base(x,y,z,radius,lean):
    """Voxel-union crooked volumetric roots, then sculpt bark and cavity AO.

    The roots are oval wood volumes following curved centerlines. No surface
    spans the angular gaps, and no triangular curtain connects crest to floor.
    """
    vv=[];ff=[]
    def rings(points,widths,heights,angles):
        start=len(vv);N=16
        for j,(p,w,h,a) in enumerate(zip(points,widths,heights,angles)):
            for k in range(N):
                q=k*2*PI/N;u=math.cos(q)*w;v=math.sin(q)*h
                vv.append((p[0]-math.sin(a)*u,p[1]+v,p[2]+math.cos(a)*u))
        for j in range(len(points)-1):
            for k in range(N):b=start+j*N+k;c=start+j*N+(k+1)%N;ff.append((b,b+N,c+N,c))
        ff.extend([tuple(start+k for k in range(N-1,-1,-1)),tuple(start+(len(points)-1)*N+k for k in range(N))])
    # Closed core with an uneven foot: the union rounds each root's junction,
    # while preserving a genuinely narrow central bole in the lower valleys.
    N=48;start=len(vv);levels=np.linspace(-.28,6.3,22)
    for h in levels:
        r=radius*(.47+.18*smooth(h/3.5))*(1-.025*smooth((h-4.8)/1.4))
        for k in range(N):
            a=k*2*PI/N;rr=r*(1+.055*math.cos(a*11+h*.33))
            vv.append((x+lean*max(0,h)/19+rr*math.cos(a),y+h,z+.12*math.sin(h*.7)+rr*math.sin(a)))
    for j in range(len(levels)-1):
        for k in range(N):a=start+j*N+k;b=start+j*N+(k+1)%N;ff.append((a+N,b+N,b,a))
    ff.extend([tuple(start+k for k in range(N)),tuple(start+(len(levels)-1)*N+k for k in range(N-1,-1,-1))])
    angles=(.10,.71,1.38,2.02,2.63,3.62,5.12)
    lengths=(4.05,4.60,4.40,4.90,4.20,3.72,3.52)
    for k,(a,L) in enumerate(zip(angles,lengths)):
        pts=[];ww=[];hh=[];aa=[]
        for j in range(29):
            t=j/28;rad=.27+L*t;ang=a+.10*math.sin(t*PI)*math.sin(k*1.8)
            cx=x+math.cos(ang)*rad;cz=z+math.sin(ang)*rad
            # The front five roots stay tall outside the narrow bole, so their
            # separate crests remain visible above the distant understory.
            # Grounded oval volumes retain open valleys, never a radial skirt.
            # A buttress rises narrowly against the bole, then descends all
            # the way to its buried unequal tip. No horizontal plateau remains.
            peak=5.10+.62*math.sin(k*2.1)
            crest=peak*(1-t)**(1.47+.15*math.cos(k*1.3))
            crest+=.10*math.sin(t*PI)*math.sin(t*5+k*2)
            if k>4:crest*=.80
            rel=crest*.48-.05
            pts.append((cx,HEIGHT_FN(cx,cz)+rel,cz));aa.append(ang)
            ww.append((.39+.07*math.sin(k*2.3))*(1-t)**.54+.035)
            hh.append(crest*.52+.032)
        rings(pts,ww,hh,aa)
    mesh=bpy.data.meshes.new('Hero root union input');mesh.from_pydata([g(v) for v in vv],[],ff);mesh.update()
    ob=bpy.data.objects.new('Hero root sculpt work',mesh);bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    rem=ob.modifiers.new('Organic voxel union','REMESH');rem.mode='VOXEL';rem.voxel_size=.10;rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=ob.modifiers.new('Soften rooted junctions','SMOOTH');sm.factor=.45;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    tri=sum(len(p.vertices)-2 for p in ob.data.polygons)
    if tri>19000:
        dec=ob.modifiers.new('Mobile sculpt topology','DECIMATE');dec.ratio=19000/tri;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
    # Short intersecting fissures and raised irregular bark plates interrupt
    # the old uninterrupted longitudinal grooves in physical geometry.
    for v in ob.data.vertices:
        px,pz,py=v.co.x,-v.co.y,v.co.z;h=py-y;a=math.atan2(pz-z,px-x)
        joint=math.exp(-(math.sin(h*5.3+a*3.1+.4*math.sin(a*7))/.18)**2)
        plate=.053*math.sin(a*19+h*.63)+.027*math.sin(a*31-h*1.7)-.062*joint
        fade=smooth((h+.15)/.5)*(1-smooth((h-4.9)/1.2))
        v.co+=v.normal*plate*fade
    ob.data.update()
    points=[(v.co.x,v.co.z,-v.co.y) for v in ob.data.vertices];faces=[tuple(p.vertices) for p in ob.data.polygons]
    bvh=BVHTree.FromPolygons(points,faces);colors=[]
    for v,p in zip(ob.data.vertices,points):
        n=Vector((v.normal.x,v.normal.z,-v.normal.y)).normalized();side=n.cross(Vector((0,1,0)))
        if side.length<.05:side=n.cross(Vector((1,0,0)))
        side.normalize();up=n.cross(side).normalized();occlusion=0
        for k in range(8):
            a=k*2*PI/8;direction=(n*.50+side*math.cos(a)*.866+up*math.sin(a)*.866).normalized()
            hit=bvh.ray_cast(Vector(p)+n*.027,direction,1.15)
            if hit[0] is not None:occlusion+=1-hit[3]/1.15
        joint=math.exp(-(math.sin((p[1]-y)*5.3+math.atan2(p[2]-z,p[0]-x)*3.1)/.18)**2)
        c=clamp(1-occlusion*.078-joint*.16,.38,1);colors.append((c,c,c,1))
    batch('BarkSculpt').add(points,faces,1.45,True,colors=colors)
    # Raised transverse bark scales are large enough to interrupt the trunk
    # at the real 50 m starting view. Each broken plate has a dark lifted rim.
    rr=random.Random(171019)
    plate_count=0
    for k in range(58):
        a=rr.uniform(.23,2.94);h=rr.uniform(2.55,6.08);radial=Vector((math.cos(a),0,math.sin(a)))
        hit=bvh.ray_cast(Vector((x,y+h,z))+radial*7,-radial,8)
        if hit[0] is None:continue
        center=hit[0]+radial*.008;side=Vector((-math.sin(a),0,math.cos(a)));up=Vector((0,1,0))
        width=rr.uniform(.18,.34);halfheight=rr.uniform(.07,.16);rise=rr.uniform(.027,.059)
        ring=[]
        for q in range(8):
            b=q*2*PI/8
            ring.append(center+side*(math.cos(b)*width*rr.uniform(.85,1.15))+up*(math.sin(b)*halfheight*rr.uniform(.8,1.2)))
        verts=[tuple(p) for p in ring]+[tuple(center+radial*rise)]+[tuple(p-radial*.045) for p in ring]
        fs=[(q,(q+1)%8,8) for q in range(8)]+[(q,9+q,9+(q+1)%8,(q+1)%8) for q in range(8)]
        cc=[(.87,.87,.87,1)]*8+[(1,1,1,1)]+[(.58,.58,.58,1)]*8
        batch('BarkSculpt').add(verts,fs,1.45,False,colors=cc)
        plate_count+=1
    print('ROOT_SCULPT',len(points),'vertices',sum(len(f)-2 for f in faces),'triangles;',plate_count,'transverse plates',flush=True)
    bpy.data.objects.remove(ob,do_unlink=True)

def tree(x,z,height=14,radius=.75,canopy=True,buttresses=True):
    y=congo_original_bank(x,z) if CURRENT_REGION=='congo' else HEIGHT_FN(x,z)
    start=(x,y-.15,z); lean=RNG.uniform(-.9,.9)
    hero=CURRENT_REGION=='congo' and x==-10 and z==-45
    # Tapered trunk with a crooked organic centerline and radial buttress roots.
    ringcenters=[(x,y,z),(x+.13,y+1.2,z-.1),(x+lean*.2,y+height*.38,z+.24),(x+lean*.65,y+height*.7,z-.2),(x+lean,y+height,z+.35)]
    radii=[radius,radius*.85,radius*.61,radius*.40,.1]
    if CURRENT_REGION=='congo':
        levels=(0,.22,.48,.85,1.3,1.8,2.4,3.1,4.0,5.2,6.5,height*.7,height)
        ringcenters=[(x+lean*t/height,y+t,z+.12*math.sin(t*.7)) for t in levels]
        # The central bole no longer fills the buttress valleys with a bell.
        # A narrower organic core is surrounded by seven independent ridges.
        radii=[radius*k for k in (.73,.73,.75,.78,.81,.83,.84,.82,.75,.65,.58,.40,.10)]
        if hero:radii=[radius*k for k in (.47,.48,.52,.58,.65,.72,.78,.82,.75,.65,.58,.40,.10)]
    verts=[];N=48 if CURRENT_REGION=='congo' else 13
    for i,(p,r) in enumerate(zip(ringcenters,radii)):
        for k in range(N):
            a=k*2*PI/N
            fluting=(.055*math.cos(a*7+.2)+.035*math.sin(a*17+math.sin(p[1]*.7))+.016*math.cos(a*31-p[1]*2.2)) if CURRENT_REGION=='congo' else .12*math.sin(k*2.6+i)
            if hero:fluting=(.13*math.cos(a*11+.3*math.sin((p[1]-y)*.6))+.05*math.cos(a*23-(p[1]-y)*.9))*(1-.65*smooth((p[1]-y-8)/6))
            rr=r*(1+fluting);verts.append((p[0]+rr*math.cos(a),p[1],p[2]+rr*math.sin(a)))
    faces=[]
    for i in range(len(ringcenters)-1):
        for k in range(N):faces.append(((i+1)*N+k,(i+1)*N+(k+1)%N,i*N+(k+1)%N,i*N+k))
    if hero:
        faces=[f for f in faces if min(f)>=9*N]
        sculpted_hero_base(x,y,z,radius,lean)
    polygon('Bark',verts,faces,1.4,True)
    for k in range(7 if buttresses and CURRENT_REGION=='congo' else (6 if buttresses else 0)):
        a=k*PI/3+.2;out=radius*RNG.uniform(2.7,4.5);dx,dz=math.cos(a),math.sin(a)
        if hero:
            # Preserve the pre-existing canopy random stream after removing
            # the old fin and tip beam geometry (14 beam radius draws).
            for _ in range(14):RNG.uniform(0,0)
            continue
        if CURRENT_REGION=='congo':
            a=k*2*PI/7+.2+.055*math.sin(k*2.7);out*=1.15;dx,dz=math.cos(a),math.sin(a)
            vv=[];ff=[];steps=12;cross=9
            for j in range(steps+1):
                t=j/steps;length=radius*.48+out*t;curve=.29*math.sin(t*PI)*math.sin(k*2.7)
                cx=x+dx*length-dz*curve;cz=z+dz*length+dx*curve
                rootheight=radius*3.1*(1-t)**1.8*(1+.055*math.sin(t*17+k))+.018
                width=radius*(.46*(1-t)**.9+.075)
                for q in range(cross):
                    u=q/(cross-1)*2-1;xx=cx-dz*u*width;zz=cz+dx*u*width
                    crest=(1-abs(u)**.52)
                    bark=(.031*math.sin(t*29+k*1.7+u*8)+.018*math.cos(t*47-u*13))*math.sin(PI*(u+1)/2)*math.sin(t*PI)
                    hh=HEIGHT_FN(xx,zz)+rootheight*crest+bark
                    vv.append((xx,hh,zz))
            for j in range(steps):
                for q in range(cross-1):b=j*cross+q;ff.append((b,b+cross,b+cross+1,b+1))
            polygon('Bark',vv,ff,1.45,True)
            # Surface roots taper and sink into the bank rather than ending in
            # sharp triangular tips; bark ridges connect trunk and root crown.
            tip=(x+dx*(radius*.58+out),HEIGHT_FN(x+dx*out,z+dz*out)+.03,z+dz*(radius*.58+out))
            beam('Bark',(tip[0]-dx*.7,tip[1]+.16,tip[2]-dz*.7),(tip[0]+dx*.55,HEIGHT_FN(tip[0]+dx*.55,tip[2]+dz*.55)+.012,tip[2]+dz*.55),radius*.14,.018,sides=7)
            continue
        vv=[(x-dz*.22,y,z+dx*.22),(x+dz*.22,y,z-dx*.22),(x+dx*radius*.5,y+radius*3,z+dz*radius*.5),(x+dx*out,HEIGHT_FN(x+dx*out,z+dz*out)+.02,z+dz*out)]
        polygon('Bark',vv,[(0,1,2),(0,2,3),(1,3,2)],1.3,True)
    for k in range(6):
        a=k*2*PI/6+RNG.uniform(-.3,.3);r=height*.29; yy=y+height*RNG.uniform(.7,.91)
        p=(x+math.cos(a)*r,yy+1.2,z+math.sin(a)*r)
        beam('Bark',(x+lean*.5,yy-.9,z),p,radius*.32,.08,sides=9,jitter=.1)
        if canopy:
            for j in range(112):
                aa=RNG.uniform(0,2*PI);rr=RNG.uniform(.1,height*.19);cc=(p[0]+math.cos(aa)*rr,p[1]+RNG.uniform(-.4,1),p[2]+math.sin(aa)*rr)
                leaf_cluster(cc,aa,RNG.uniform(.5,1.0))
    obstacle(x,z,5.25 if hero else radius*1.35)
    TREES.append({'x':x,'y':round(y,3),'z':z,'height':height,'trunkRadius':radius,'canopyRadius':round(height*.30,2)})

def leaf_cluster(c,a,length=1):
    # Three individually modeled folded lanceolate leaves per branch spray.
    for k in range(3):
        angle=a+(k-1)*.7;dx,dz=math.cos(angle),math.sin(angle);x,y,z=c;L=length;w=L*.23
        v=[(x,y,z),(x+dx*L*.5-dz*w,y+.035,z+dz*L*.5+dx*w),(x+dx*L,y-.16,z+dz*L),(x+dx*L*.5+dz*w,y+.03,z+dz*L*.5-dx*w),(x+dx*L*.5,y+.12,z+dz*L*.5)]
        polygon(('LeafDeep','LeafMid','LeafLight')[RNG.randrange(3)],v,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],smooth=True)

def maloca():
    x,z=-23,-10;rx,rz=7.4,5.4;floor=1.25;eave=3.05;top=7.1
    # Elliptical long-house canopy with a short ridgeline, thatch tier edges,
    # open eastern doorway, horizontal woven wall bands, and solid roof posts.
    N=60;tiers=12;v=[]
    for j in range(tiers+1):
        t=j/tiers;rad=1-t*.985;yy=eave+(top-eave)*math.sin(t*PI/2)**.8
        for k in range(N):
            a=k*2*PI/N;tip=.035*math.sin(k*6.3+j*2.7)
            v.append((x+math.cos(a)*(rx*rad+.28*t),yy+tip,z+math.sin(a)*(rz*rad+1.1*t)))
    fs=[]
    for j in range(tiers):
        for k in range(N):fs.append(((j+1)*N+k,(j+1)*N+(k+1)%N,j*N+(k+1)%N,j*N+k))
    polygon('Thatch',v,fs,.86,True)
    for j in range(1,11):
        t=j/12;rad=1-t*.985;yy=eave+(top-eave)*math.sin(t*PI/2)**.8
        for k in range(N):
            a=k*2*PI/N;an=(k+1)*2*PI/N
            beam('Thatch',(x+math.cos(a)*(rx*rad+.28*t),yy+.015,z+math.sin(a)*(rz*rad+1.1*t)),(x+math.cos(an)*(rx*rad+.28*t),yy+.015,z+math.sin(an)*(rz*rad+1.1*t)),.07,sides=5)
    # The floor is a mesh cut to the real elliptical footprint.
    polygon('Timber',[(x,floor,z)]+[(x+math.cos(k*2*PI/N)*(rx-.6),floor,z+math.sin(k*2*PI/N)*(rz-.6)) for k in range(N)],[(0,1+(k+1)%N,1+k) for k in range(N)],.7)
    WALK_SURFACES.append({'type':'ellipse','center':[x,z],'radii':[rx-.6,rz-.6],'height':floor})
    for k in range(16):
        a=k*2*PI/16;xx=x+math.cos(a)*(rx-.7);zz=z+math.sin(a)*(rz-.7)
        if abs(math.sin(a))<.4 and math.cos(a)>0:continue
        beam('DarkTimber',(xx,.1,zz),(xx,eave+.15,zz),.11,.09);obstacle(xx,zz,.18)
    for k in range(48):
        a=k*2*PI/48;b=(k+1)*2*PI/48
        if abs(math.sin(a))<.42 and math.cos(a)>0:continue
        for yy in (1.5,1.8,2.1,2.4):
            beam('Thatch',(x+math.cos(a)*(rx-.75),yy,z+math.sin(a)*(rz-.75)),(x+math.cos(b)*(rx-.75),yy,z+math.sin(b)*(rz-.75)),.09,sides=5)
        if k%2==0:obstacle(x+math.cos(a)*(rx-.75),z+math.sin(a)*(rz-.75),.5)
    boardwalk([(-17,-10),(-12,-10)],1.25,3.1,False)
    landmark('Open communal maloca',x,z,floor)

def warehouse():
    x0,x1,z0,z1=-22,-5,-34,-27;floor=1.25;eave=4.15;ridge=6
    planked_rect(x0,x1,z0,z1,floor)
    # Long warehouse with veranda and full depth central aisle. Two opposing
    # 3m openings expose real shelves and document tables beneath the roof.
    for xx in np.arange(x0,x1+.1,3.4):
        for zz in (z0,z1):
            beam('DarkTimber',(xx,-.3,zz),(xx,eave,zz),.13,.10);obstacle(xx,zz,.2)
    for xx in np.arange(x0+.17,x1,.35):
        if not (-18.3<xx<-15.0 or -10.5<xx<-7.0):
            for zz in (z0,z1):box('Timber',(xx,floor+1.4,zz),(.33,2.8,.14))
        else:
            for zz in (z0,z1):box('DarkTimber',(xx,eave-.13,zz),(.33,.26,.15))
    for zz in np.arange(z0+.17,z1,.35):
        box('Timber',(x0,floor+1.4,zz),(.14,2.8,.33))
        box('Timber',(x1,floor+1.4,zz),(.14,2.8,.33))
    # Ridge oriented along the long X axis; authored roof panels directly.
    verts=[(x0-.7,eave,z0-.6),(x1+.7,eave,z0-.6),(x1+.7,ridge,(z0+z1)/2),(x0-.7,ridge,(z0+z1)/2),(x0-.7,eave,z1+.7),(x1+.7,eave,z1+.7)]
    polygon('DarkTimber',verts,[(0,1,2,3),(3,2,5,4)],.73)
    for xx in np.arange(x0-.5,x1+.5,.75):
        beam('Timber',(xx,eave+.025,z0-.6),(xx,ridge+.025,(z0+z1)/2),.037,sides=5)
        beam('Timber',(xx,ridge+.025,(z0+z1)/2),(xx,eave+.025,z1+.7),.037,sides=5)
    planked_rect(x0,x1,z1,z1+2.5,floor)
    for zz in np.arange(z0,z1,.75):
        obstacle(x0,zz,.4);obstacle(x1,zz,.4)
    for xx in np.arange(x0,x1,.75):
        if not(-18.5<xx<-14.8 or -10.7<xx<-6.8):
            obstacle(xx,z0,.4);obstacle(xx,z1,.4)
    for xx in (-20.3,-12.6):
        for yy in (1.55,2.25,2.95):
            box('DarkTimber',(xx,yy,-32.9),(2.2,.12,.8))
            for k in range(3):box('Canvas',(xx-.6+k*.55,yy+.2,-32.9),(.4,.3,.46))
        obstacle(xx,-32.9,1.1)
    for xx,zz in ((-20,-28.5),(-6.3,-32.2)):
        crate(xx,floor,zz,.85);crate(xx,floor+.85,zz,.65);obstacle(xx,zz,.65)
    landmark('Company warehouse and archive',-13.5,-30.5,floor)

def canoe(x,z,length=6,width=1):
    verts=[];N=16
    for j in range(N+1):
        t=j/N;zz=z+(t-.5)*length;w=width*.5*math.sin(t*PI)**.65
        for xx,yy in ((-w,.4),(-w*.55,.03),(w*.55,.03),(w,.4)):
            verts.append((x+xx,yy+.18*abs(2*t-1)**3,zz))
    fs=[]
    for j in range(N):
        for k in range(3):fs.append((j*4+k,j*4+k+1,(j+1)*4+k+1,(j+1)*4+k))
    polygon('DarkTimber',verts,fs,1.,True)
    for zz in (-1,1):box('Timber',(x,.37,z+zz),(width*.85,.08,.25))

def grass_field(region,count):
    if region=='ireland':
        # Dense fan-shaped marram tussocks, many arcing tapered blades, varied
        # green/straw colors. The prevailing Atlantic wind bends every clump.
        for i in range(1500):
            x=RNG.uniform(-30,5) if i<1200 else RNG.uniform(-40,12)
            z=RNG.uniform(-46,9) if i<1200 else RNG.uniform(-65,17)
            y=HEIGHT_FN(x,z)
            if y<.75 or closest_path(x,z,IRELAND_PATH)[0]<1.6:continue
            count=RNG.randint(11,17);spread=RNG.uniform(.13,.31)
            for blade in range(count):
                angle=blade*2.399+RNG.uniform(-.3,.3);dx,dz=math.cos(angle),math.sin(angle)
                xx=x+dx*RNG.uniform(0,spread);zz=z+dz*RNG.uniform(0,spread)
                h=RNG.uniform(.31,.86);w=RNG.uniform(.012,.028);lean=RNG.uniform(.17,.43)
                v=[]
                for t in (0,.38,.76):
                    cx=xx+(dx*spread+.17)*t*t+lean*t*t;cz=zz+(dz*spread-.08)*t*t
                    cy=y+h*(1.27*t-.43*t*t*t);ww=w*(1-t*.85)
                    v.extend([(cx-dz*ww,cy,cz+dx*ww),(cx+dz*ww,cy,cz-dx*ww)])
                v.append((xx+dx*spread+.17+lean,y+h*.78,zz+dz*spread-.08))
                polygon('GrassDry' if blade%4==0 else 'Grass',v,[(0,1,3,2),(2,3,5,4),(4,5,6)],smooth=True)
        return
    for _ in range(count):
        x=RNG.uniform(-38,16);z=RNG.uniform(-65,17);y=HEIGHT_FN(x,z)
        if y<.45:continue
        if region=='ireland':
            if y<1.0 or closest_path(x,z,IRELAND_PATH)[0]<1.55:continue
            h=RNG.uniform(.18,.65);c='Grass'
        else:
            if region=='amazonia' and closest_path(x,z,AMAZON_PATH)[0]<2:continue
            h=RNG.uniform(.25,.85);c='Grass'
        # Wind-leaning curved tapered blades, not crossed billboard rectangles.
        for j in range(RNG.randint(4,7)):
            angle=RNG.uniform(0,2*PI);w=RNG.uniform(.018,.044);dx,dz=math.cos(angle),math.sin(angle);xx=x+RNG.uniform(-.14,.14);zz=z+RNG.uniform(-.14,.14)
            v=[(xx-dx*w,y,zz-dz*w),(xx+dx*w,y,zz+dz*w),(xx+dx*w*.5+.15,y+h*.6,zz+dz*w*.5),(xx-dx*w*.5+.15,y+h*.6,zz-dz*w*.5),(xx+.25,y+h,zz-.035)]
            polygon(c,v,[(0,1,2,3),(3,2,4)],smooth=True)

def cottage():
    x,z=-20,-32;w,d=9,6.5;floor=3.95;eave=6.6;ridge=8.65
    planked_rect(x-w/2,x+w/2,z-d/2,z+d/2,floor,mat='Stone',width=.6)
    # Mortared coursed stone walls with true door/window gaps facing east.
    for row in range(7):
        yy=floor+.19+row*.38
        for side in (-1,1):
            xx=x+side*w/2;zz=z-d/2
            while zz<z+d/2:
                length=RNG.uniform(.6,1.05);center=zz+length*.5
                door=side==1 and abs(center-z)<1.1 and yy<floor+2.25
                if not door:rock((xx,yy-.19,center),(.58,.34,length*.96),'Stone',1,RNG.randrange(100000))
                zz+=length
        for side in (-1,1):
            zz=z+side*d/2;xx=x-w/2
            while xx<x+w/2:
                length=RNG.uniform(.65,1.);center=xx+length*.5
                window=abs(center-x)<.9 and floor+.9<yy<floor+2.0
                if not window:rock((center,yy-.19,zz),(length*.98,.34,.57),'Stone',1,RNG.randrange(100000))
                xx+=length
    # Stone gables continue all the way up to the slate roof.
    for zz in (z-d/2,z+d/2):
        polygon('Stone',[(x-w/2,eave,zz),(x+w/2,eave,zz),(x,ridge,zz)],scale=.85)
        for dy in (1.0,2.1):box('Limewash',(x,floor+dy,zz), (2.15,.14,.69))
        for xx in (x-.95,x+.95):box('Limewash',(xx,floor+1.5,zz),(.12,1.2,.65))
        box('DarkTimber',(x,floor+1.52,zz),(.07,1.05,.57));box('DarkTimber',(x,floor+1.52,zz),(1.8,.07,.57))
    for zz in (z-1.15,z+1.15):box('Limewash',(x+w/2,floor+1.1,zz),(.75,2.2,.14))
    box('Limewash',(x+w/2,floor+2.25,z),(.76,.25,2.55))
    pitched_roof(x,z,w,d,eave,ridge,'Stone',.42)
    # Uneven thin overlapping slate courses establish scale at close range.
    for side in (-1,1):
        for j in range(12):
            t=(j+.5)/12;xx=x+side*(w/2+.4)*t;yy=mix(ridge,eave,t)+.022
            beam('Stone',(xx,yy,z-d/2-.42),(xx,yy,z+d/2+.42),.031,sides=4)
    for row in range(8):
        yy=7.55+row*.3
        for dx,dz in ((-.32,-.25),(.32,-.25),(-.32,.25),(.32,.25)):
            rock((x-2+dx,yy,z+1+dz),(.62,.29,.49),'Stone',1,row*51+int(dx*10)+5)
    box('Stone',(x-2,10.0,z+1),(1.42,.18,1.27))
    for zz in np.arange(z-d/2,z+d/2,.7):
        obstacle(x-w/2,zz,.45)
        if abs(zz-z)>1.15:obstacle(x+w/2,zz,.45)
    for xx in np.arange(x-w/2,x+w/2,.7):
        for zz in (z-d/2,z+d/2):obstacle(xx,zz,.45)
    landmark('Atlantic stone cottage',x,z,floor)

def dry_wall(points,height=.95):
    pts=spline(points,step=.68)
    for i,(x,z) in enumerate(pts):
        # Explicit erosion breaks and varied course offsets.
        if i%29 in (26,27,28):continue
        base=HEIGHT_FN(x,z)
        courses=2 if i%13==0 else 3
        for row in range(courses):
            xx=x+RNG.uniform(-.09,.09);zz=z+RNG.uniform(-.08,.08)
            rock((xx,base+row*.30,zz),(.8-row*.09,.29,.67),'Stone',1,i*19+row)
        rock((x,base+courses*.30,z),(.6,.2,.57),'Stone',1,520+i)
        obstacle(x,z,.45)

def authored_details(region):
    if region=='congo':
        depot();boardwalk(CONGO_PIER,1.35,3.3,False);planked_rect(5.7,8.7,-37,-25,1.35)
        # Broad western cargo apron: its silhouette and crate stacks read as a
        # real harbor landing beyond the witness, while the mission pad stays
        # open on the original 1.35m dispatch walkway in front of this apron.
        planked_rect(-8,1.2,-38,-35.3,1.55)
        # Forward, unobstructed landing puts fascia and piles in the visible
        # river edge; its entire dispatch lane remains at 1.35m.
        planked_rect(-5.4,5.8,-35.6,-32.2,1.35)
        box('DarkTimber',(.2,1.18,-32.23),(11.35,.30,.22),bevel=.035)
        for xx in (-5.2,-2.2,.8,3.8,5.6):
            beam('DarkTimber',(xx,-.9,-32.28),(xx,1.46,-32.28),.18,.14,sides=9);obstacle(xx,-32.28,.25)
        for xx in (-4.9,-1.9,1.1):beam('DarkTimber',(xx,-.10,-32.27),(xx+2.6,1.05,-32.27),.078,sides=7)
        # Broad planked ramp from 1.55m cargo floor to 1.35m dispatch deck.
        for i in range(6):
            za=-35.3+i*.2;zb=za+.185;ya=mix(1.55,1.35,i/6);yb=mix(1.55,1.35,(i+.925)/6)
            v=[(-5,ya,za),(-1,ya,za),(-1,yb,zb),(-5,yb,zb),(-5,ya-.13,za),(-1,ya-.13,za),(-1,yb-.13,zb),(-5,yb-.13,zb)]
            polygon('Timber',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],.75)
            rect_surface(-5,-1,za,zb,ya)
        for zz in (-37.9,-35.4):
            beam('DarkTimber',(-8,1.30,zz),(1.2,1.30,zz),.15,sides=7)
            for xx in (-7.7,-4.7,-1.7,1.0):
                beam('DarkTimber',(xx,-.8,zz),(xx,1.68,zz),.16,.13,sides=8);obstacle(xx,zz,.23)
        for i,(xx,zz,w) in enumerate([(-6.8,-36.0,1.20),(-5.2,-36.8,1.16),(-3.7,-36.0,1.12),(-2.15,-36.85,1.18),(-.6,-36.75,.98)]):
            angle=(-.08,.12,.045,-.11,.065)[i]
            crate(xx,1.55,zz,w,angle);obstacle(xx,zz,w*.72)
            if i in (0,1,3):crate(xx+.10,1.55+w,zz-.06,w*.77,angle-.14)
        landmark('Expanded cargo landing and uneven crate stacks',-3.5,-36.6,1.55)
        # Timber cargo weighing station, seen from the ledger pad without
        # placing its upright or loads on the interaction coordinate.
        sx,sz=-12.7,-24.4; sy=HEIGHT_FN(sx,sz)
        box('DarkTimber',(sx,sy+.07,sz),(2,.14,1.3))
        beam('Iron',(sx,sy+.14,sz),(sx,sy+2.25,sz),.075)
        beam('Iron',(sx-1.05,sy+2.16,sz),(sx+1.05,sy+2.28,sz),.055)
        for sign in (-1,1):
            for dz in (-.22,.22):beam('Iron',(sx+sign*.92,sy+2.2,sz),(sx+sign*.92,sy+1.25,sz+dz),.012,sides=4)
            box('Iron',(sx+sign*.92,sy+1.24,sz),(.64,.06,.6))
            rock((sx+sign*.92,sy+1.28,sz),(.48,.35,.43),'DarkTimber',2,40+sign)
        obstacle(sx,sz,.7);landmark('Cargo weighing station',sx,sz,sy)
        for zz in (-36,-32,-28,-25):
            beam('DarkTimber',(7.2,-1,zz),(7.2,1.5,zz),.18);obstacle(7.2,zz,.23)
        steamer()
        for x,z in [(-11,-30),(-12.4,-30),(-11,-31.4),(-25,-12),(-24.8,-13.4)]:
            crate(x,HEIGHT_FN(x,z),z);obstacle(x,z,.7)
        for k in range(7):beam('Bark',(-13.8,HEIGHT_FN(-14,-28)+.2+k*.06,-27.8+k*.32),(-19,HEIGHT_FN(-19,-28)+.2+k*.06,-27.8+k*.32),.16,.12,jitter=.09)
        # A lean-to creates a distinct low settlement silhouette away from depot.
        for xx in (-18,-12):
            for zz in (-2,-7):beam('DarkTimber',(xx,HEIGHT_FN(xx,zz),zz),(xx,4.3 if zz==-7 else 3.8,zz),.13);obstacle(xx,zz,.23)
        polygon('Canvas',[(-18.6,3.8,-1.5),(-11.4,3.8,-1.5),(-11.4,4.5,-7.5),(-18.6,4.5,-7.5)],scale=.5)
        thatch_plane(-7.5,-1.5,-18.7,-11.3,4.57,3.85,swap=True,seed=609)
        for x,z,h,r in [(-19,6,18,1.1),(.8,8,17,1),(-29,-5,22,1.15),(-32,-22,21,1.0),(-26,-39,19,.9),(-10,-45,19,1.65),(-37,15,20,1.2),(-39,-60,22,1.2),(-13,18,17,.8)]:tree(x,z,h,r)
        grass_field(region,1000)
        landmark('Timber landing',2,-34,1.35)
    elif region=='amazonia':
        boardwalk(AMAZON_PATH,1.25,3.3,True);maloca();warehouse()
        boardwalk([(-16,-25),(-9,-25),(-9,-27)],1.25,3.2,False)
        boardwalk([(-17,-32),(-9,-32),(-7,-36)],1.25,3.2,False)
        canoe(7,-5,7,1.2);canoe(-8,-18,6,1.0)
        # Photo subject: original modeled rubber tree, cut marks root can enrich.
        tree(-13.9,-8.6,15,.62,buttresses=False)
        # Shallow diagonal bark incisions and ceramic latex cups face the path.
        ry=HEIGHT_FN(-13.9,-8.6)
        for k in range(3):
            yy=ry+1.0+k*.23
            beam('DarkTimber',(-13.31,yy,-8.85),(-13.28,yy+.17,-8.4),.018,sides=4)
        beam('Canvas',(-13.25,ry+.72,-8.65),(-13.25,ry+.91,-8.65),.13,.17,sides=12)
        beam('DarkTimber',(-13.25,ry+.90,-8.65),(-13.25,ry+.92,-8.65),.17,.17,sides=12)
        landmark('Rubber tapping incision and collecting cup',-13.25,-8.65,ry+.92)
        for x,z,h,r in [(-3,9,24,1.0),(-7,5,22,.8),(-29,-1,24,1.15),(-32,-17,26,1.1),(-26,-24,23,.85),(-28,-37,25,1.0),(8,-44,24,1.2),(4,-50,25,1.2),(-8,-48,21,.8),(27,-22,26,1.1),(21,-4,23,1.0),(-36,-48,26,1.2)]:tree(x,z,h,r)
        grass_field(region,1600)
        landmark('Rubber grove photograph',-12,-9,1.25)
    else:
        cottage()
        dry_wall([(-10,-21),(-8,-26),(-8,-33),(-11,-39)])
        dry_wall([(-21,-20),(-26,-23),(-29,-32),(-28,-41)],1)
        dry_wall([(-14,-37),(-19,-41),(-26,-44)],.85)
        # Continuous fractured Atlantic headlands with exposed bedding planes.
        for k in range(18):
            x=-15+k*1.65;z=-46+2.2*math.sin(k*.37);base=max(-.3,HEIGHT_FN(x,z)-1.2)
            size=(RNG.uniform(3.5,5.8),RNG.uniform(2,4.1),RNG.uniform(4,7));rock((x,base,z),size,'Stone',5,800+k);obstacle(x,z,max(size[0],size[2])*.47)
        for k in range(24):
            x=RNG.uniform(1,12);z=RNG.uniform(-33,-18);base=HEIGHT_FN(x,z)
            if base>-.3:
                size=(RNG.uniform(.3,1.5),RNG.uniform(.18,.55),RNG.uniform(.3,1.2));rock((x,base-.07,z),size,'Stone',2,200+k)
                if size[1]>.3:obstacle(x,z,max(size[0],size[2])*.4)
        # Partly embedded pebbles and rough, branched driftwood replace the
        # former parallel rods. Small pieces never obstruct mission routes.
        for k in range(230):
            z=RNG.uniform(-37,9);x=ireland_shore(z)-RNG.uniform(1.2,9.8);base=HEIGHT_FN(x,z)
            if closest_path(x,z,IRELAND_PATH)[0]<1.3 or base<.05:continue
            w=RNG.uniform(.07,.30);rock((x,base-.035,z),(w,RNG.uniform(.045,.10),w*RNG.uniform(.65,1.25)),'Stone',1,5400+k)
        for k,(x,z,angle,L) in enumerate([(4.8,-14.5,.41,3.4),(6.2,-22.3,-.65,2.6),(-1.8,-5.0,1.0,1.8)]):
            base=HEIGHT_FN(x,z);dx,dz=math.sin(angle),math.cos(angle);previous=None
            for j in range(7):
                t=j/6-.5;point=(x+dx*L*t+.10*math.sin(j),base+.13+.07*math.sin(j*.9),z+dz*L*t)
                if previous:beam('Driftwood',previous,point,.12*(1-j*.06),.12*(1-(j+1)*.06),sides=9,jitter=.17)
                previous=point
            for j,sign in ((2,-1),(4,1)):
                a=(x+dx*L*(j/6-.5),base+.15,z+dz*L*(j/6-.5));b=(a[0]+dz*sign*.62,base+.25,a[2]-dx*sign*.62)
                beam('Driftwood',a,b,.085,.026,sides=8,jitter=.1)
        grass_field(region,4200)
        landmark('Crescent strand',0,-10,.38);landmark('Dune path',-6,-18,1.8);landmark('Stratified Atlantic headland',4,-46)

def congo_bank_and_veranda_craft():
    """Bounded final craft geometry, outside every mission and route pad."""
    rr=random.Random(22190)
    # Find the actual new waterline instead of placing a straight decorative
    # strip across it. Clay ribs rise from and return to the eroded terrain.
    def edge_x(z):
        a,b=-3.,6.
        for _ in range(18):
            m=(a+b)*.5
            if HEIGHT_FN(m,z)>.055:a=m
            else:b=m
        return (a+b)*.5
    for i in range(32):
        z=-24+i*1.05+rr.uniform(-.3,.3);x=edge_x(z)-rr.uniform(.12,.65)
        length=rr.uniform(.45,1.0);width=rr.uniform(.11,.27);rise=rr.uniform(.045,.13)
        vv=[];ff=[]
        for j in range(4):
            t=j/3;zz=z+(t-.5)*length;xx=x+.10*math.sin(t*PI+i)
            for k in range(5):
                u=(k-2)/2;px=xx+u*width
                py=HEIGHT_FN(px,zz)+rise*math.sin(t*PI)*(1-abs(u)**.6)+.007
                vv.append((px,py,zz))
        for j in range(3):
            for k in range(4):a=j*5+k;ff.append((a,a+5,a+6,a+1))
        polygon('BankMud',vv,ff,scale=1.8,smooth=True)
    for i in range(14):
        z=rr.uniform(-23,9);x=edge_x(z)-rr.uniform(.20,.68);length=rr.uniform(.7,1.55)
        angle=rr.uniform(-.85,.85);dx,dz=math.sin(angle),math.cos(angle);previous=None
        for j in range(4):
            t=j/3;xx=x+dx*(t-.5)*length+.045*math.sin(j*1.9+i);zz=z+dz*(t-.5)*length
            p=(xx,HEIGHT_FN(xx,zz)+.055+.025*math.sin(t*PI),zz)
            if previous:beam('DarkTimber',previous,p,.065*(1-t*.52),.065*(1-t*.68),sides=6,jitter=.10)
            previous=p
        a=(x,HEIGHT_FN(x,z)+.06,z);b=(x+.30,HEIGHT_FN(x+.30,z-.23)+.012,z-.23)
        beam('DarkTimber',a,b,.047,.009,sides=5,jitter=.1)
        xx=x-.20;zz=z+.18
        rock((xx,HEIGHT_FN(xx,zz)-.025,zz),(.24,.10,.18),'BankMud',1,13000+i)
    # A visible doubled outer beam, upper knee braces and projecting slatted
    # shutters give the sunlit veranda real depth. The 3.6m entry remains open.
    x,z=-22.,-22.;floor=2.1;front=x+7.3
    box('DarkTimber',(front,floor+2.48,z),(.23,.25,11.1),bevel=.022)
    box('Timber',(front+.10,floor+2.59,z),(.12,.075,11.2),bevel=.018)
    for zz,sgn in ((z-5,1),(z+5,-1)):
        beam('DarkTimber',(front,floor+1.55,zz),(front,floor+2.45,zz+sgn*.95),.095,sides=6)
        beam('DarkTimber',(front,floor+1.77,zz),(front-1.15,floor+2.70,zz),.080,sides=6)
    # Shutters stand proud of the front gable; framing and deep sills catch
    # sunlight while the inner opening stays shaded behind them.
    for side in (-1,1):
        xx=x+side*1.37;zz=z+5.69
        for k in range(5):
            box('WallBoards',(xx+side*k*.13,floor+1.74,zz+(k*.055)),(.12,1.20,.10),rot=side*.38,bevel=.012)
        box('DarkTimber',(x+side*.63,floor+1.08,z+5.60),(1.29,.13,.42),bevel=.028)
        beam('DarkTimber',(x+side*1.28,floor+1.1,z+5.62),(x+side*1.28,floor+2.46,z+5.62),.07,sides=6)

def congo_embedded_roots_and_panels():
    # Curved, partly buried root veins grow out of the bank. Their irregular
    # crests are only centimetres high and taper back into the walking surface.
    paths=[ [(-10.8,1.8),(-9.5,2.1),(-8.4,1.4),(-7.0,.3)],
            [(-6.8,-3.6),(-5.6,-4.3),(-5.0,-5.7),(-3.7,-6.2)],
            [(-11.9,-13.7),(-10.6,-13.1),(-9.6,-14.0),(-8.4,-14.4)],
            [(-6.1,7.2),(-5.4,6.5),(-4.2,6.1),(-3.0,5.5)] ]
    for k,path in enumerate(paths):
        pts=spline(path,.13);vv=[];ff=[]
        for i,(x,z) in enumerate(pts):
            t=i/(len(pts)-1);a=pts[max(0,i-1)];b=pts[min(len(pts)-1,i+1)];dx,dz=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dz);dx/=L;dz/=L
            strength=math.sin(t*PI)**.7
            for px,pz in [(-3,3),(-8,-10),(-15,-22),(1,-34)]:strength*=smooth((dist(x,z,px,pz)-1.1)/.7)
            width=(.16-.07*t)*strength
            for q in range(7):
                u=(q-3)/3;xx=x-dz*u*width;zz=z+dx*u*width
                rise=.072*strength*(1-abs(u)**.65)*(1+.17*math.sin(t*27+k))-.008
                vv.append((xx,HEIGHT_FN(xx,zz)+rise,zz))
        for i in range(len(pts)-1):
            for q in range(6):a=i*7+q;ff.append((a,a+7,a+8,a+1))
        polygon('Bark',vv,ff,scale=1.65,smooth=True)
    # Thin carved bevels around twelve inset cabin panels add actual grazing
    # highlights and recess shadows without moving the accepted cabin shell.
    for side in (-1,1):
        x=9.8+side*1.625
        for k in range(6):
            z=-31.50+k*1.1
            outer=[(1.00,z-.49),(1.45,z-.49),(1.45,z+.49),(1.00,z+.49)]
            inner=[(1.045,z-.44),(1.405,z-.44),(1.405,z+.44),(1.045,z+.44)]
            vv=[(x+side*.055,y,zz) for y,zz in outer]+[(x+side*.018,y,zz) for y,zz in inner]
            ff=[(j,(j+1)%4,(j+1)%4+4,j+4) for j in range(4)]
            if side<0:ff=[tuple(reversed(f)) for f in ff]
            polygon('BoatPaint',vv,ff,scale=.8)

def congo_sculpted_mud_shelves():
    # Five camera-facing bank caps occupy the actual visible upper clay face,
    # independent of distant water contours. congo_base cuts the earth beneath
    # each projecting cap; the upper walking edge stays flush with the path.
    for k,(z0,z1,anchor) in enumerate(BANK_VISIBLE_BAYS):
        vv=[];colors=[];faces=[];sections=29;profile_size=9
        for j in range(sections):
            t=j/(sections-1);z=z0+(z1-z0)*t
            end=smooth(t/.14)*(1-smooth((t-.86)/.14))
            wav=.055*math.sin(z*5.3+k)+.035*math.sin(z*11.7)+.018*math.sin(z*22.3+k)
            top=HEIGHT_FN(anchor-.40,z)+.005
            # Rounded crumbly shoulders roll into the shaded inset. Irregular
            # shallow runoff grooves interrupt the former broad planar top.
            edge=anchor+.33*end+wav*end;depth=(.26+.055*math.sin(z*3.2))*end
            groove=(.030*math.exp(-(math.sin(z*4.4+k)/.23)**2)+.012*math.sin(z*13.3))*end
            profile=[(anchor-.45,HEIGHT_FN(anchor-.45,z)+.005,1),
                     (mix(anchor-.45,edge,.34),top+.010*end-groove*.35,.96),
                     (edge-.16*end,top+.016*end-groove,.92),
                     (edge-.065*end,top-.012*end-groove*.75,.86),
                     (edge,top-.075*end-groove*.5,.76),
                     (edge-.045*end,top-depth*.63,.62),
                     (edge-.14*end,top-depth*.84,.43),
                     (anchor-.12,top-depth-.055*end,.36),
                     (anchor-.24,HEIGHT_FN(anchor-.24,z)-.09,.65)]
            for px,py,c in profile:vv.append((px,py,z));colors.append((c,c,c,1))
        for j in range(sections-1):
            for q in range(profile_size-1):a=j*profile_size+q;faces.append((a,a+profile_size,a+profile_size+1,a+1))
        faces.extend([tuple(range(profile_size)),tuple((sections-1)*profile_size+q for q in range(profile_size-1,-1,-1))])
        batch('BankMud').add(vv,faces,.5,True,colors=colors)
    # Short eroded clay lips follow three height contours. Their projecting
    # top edge and recessed lower wall create real dark undercuts rather than
    # a continuous sloping plane. Ends are chipped and irregularly staggered.
    rr=random.Random(90271)
    for level in (.34,.68,1.02):
        for k in range(12):
            z0=-17+k*2.15+rr.uniform(-.28,.28);L=rr.uniform(.95,1.8)
            vv=[];colors=[];faces=[]
            for j in range(7):
                z=z0+L*j/6;target=level+.027*math.sin(z*2.1);a,b=-3.,2.5
                for _ in range(19):
                    x=(a+b)*.5
                    if HEIGHT_FN(x,z)>target:a=x
                    else:b=x
                edge=(a+b)*.5;projection=.10+.035*math.sin(j*2.3+k)
                # The lip starts in the bank and curls over the shaded inset.
                profile=[(edge-.27,HEIGHT_FN(edge-.27,z)+.005,1),
                         (edge+projection*.25,target+.012,.94),
                         (edge+projection*.80,target-.005,.88),
                         (edge+projection,target-.037,.75),
                         (edge+projection*.52,target-.090,.59),
                         (edge-.11,target-.18,.44),
                         (edge-.16,HEIGHT_FN(edge-.16,z)-.22,.72)]
                for px,py,c in profile:vv.append((px,py,z));colors.append((c,c,c,1))
            for j in range(6):
                for q in range(6):a=j*7+q;faces.append((a,a+7,a+8,a+1))
            faces.extend([tuple(range(7)),tuple(range(48,41,-1))])
            batch('BankMud').add(vv,faces,.5,True,colors=colors)

def congo_rendered_floor(x,z):
    """Exact triangle interpolation for the optional fine contact grid."""
    ix,iz=math.floor(x),math.floor(z);n=2
    if -2<=ix<2 and -27<=iz<11:n=4
    if -14<=ix<1 and -18<=iz<8:n=8
    if -14<=ix<-2 and -18<=iz<8:n=16
    if n==16 and min(congo_worn(ix+dx,iz+dz) for dx,dz in ((0,0),(1,0),(0,1),(1,1)))>.80:n=8
    step=1/n;xx=math.floor(x*n)/n;zz=math.floor(z*n)/n;tx=(x-xx)/step;tz=(z-zz)/step
    a=HEIGHT_FN(xx,zz);b=HEIGHT_FN(xx+step,zz);c=HEIGHT_FN(xx+step,zz+step);d=HEIGHT_FN(xx,zz+step)
    y=a+(b-a)*tx+(c-b)*tz if tx>=tz else a+(c-d)*tx+(d-a)*tz
    if BANK_CONTACT_BVH is not None:
        hit=BANK_CONTACT_BVH.ray_cast(Vector((x,y+.5,z)),Vector((0,-1,0)),.8)
        if hit[0] is not None:y=max(y,hit[0].y)
    for s in WALK_SURFACES:
        if s['type']=='rect':a,b,c,d=s['bounds'];inside=a<=x<=b and c<=z<=d
        elif s['type']=='ellipse':cx,cz=s['center'];rx,rz=s['radii'];inside=((x-cx)/rx)**2+((z-cz)/rz)**2<=1
        else:inside=closest_path(x,z,s['points'])[0]<=s['width']/2
        if inside:y=max(y,s['height'])
    return y

def congo_woven_wall_depth():
    # Alternating over/under laths form real facade relief on the solid wall
    # bays. Doors, high window slits, porch posts and mission pads stay clear.
    for panel,(cx,cz,sidewall) in enumerate([(-25.1,-16.34,False),(-18.8,-16.34,False),(-17.34,-25.4,True),(-17.34,-18.6,True)]):
        width=1.70;rows=12;cols=8;height=2.2
        def p(u,y,depth):return (cx+depth,2.40+y,cz+u) if sidewall else (cx+u,2.40+y,cz+depth)
        for row in range(rows):
            y=(row+.5)*height/rows;vv=[];ff=[]
            for i in range(cols*2+1):
                t=i/2;u=(t/cols-.5)*width;depth=.075+.075*math.cos(PI*(t+row))+.018*math.sin(t*.7+panel)
                for off in (-.063,.063):vv.append(p(u,y+off,depth))
            for i in range(cols*2):a=i*2;ff.append((a,a+2,a+3,a+1))
            if sidewall:ff=[tuple(reversed(f)) for f in ff]
            polygon('WallBoards',vv,ff,scale=1.35,smooth=True)
        for col in range(cols):
            u=((col+.5)/cols-.5)*width;vv=[];ff=[]
            for i in range(rows*2+1):
                t=i/2;y=t/rows*height;depth=.075-.075*math.cos(PI*(t+col))+.018*math.sin(t*.7+panel)
                for off in (-.027,.027):vv.append(p(u+off,y,depth))
            for i in range(rows*2):a=i*2;ff.append((a,a+2,a+3,a+1))
            if not sidewall:ff=[tuple(reversed(f)) for f in ff]
            polygon('Timber',vv,ff,scale=1.5,smooth=True)
        # Rounded frames sit in front of the interlaced panel. Recesses are
        # physical spaces behind those frames, not a painted bevel.
        for u in (-width*.54,width*.54):
            beam('DarkTimber',p(u,-.07,.20),p(u,height+.07,.20),.066,.055,sides=9,jitter=.12)
        for yy in (-.045,height+.035):
            beam('DarkTimber',p(-width*.58,yy,.20),p(width*.58,yy,.20),.072,.061,sides=9,jitter=.11)
    # Hand-hewn post sleeves have bent centerlines, softened shoulders and
    # individually scalloped bark arrises. These cover existing structural
    # posts only; the entry and all walk/collision volumes are unchanged.
    for i,(x,z,bottom,top,rad) in enumerate([(-14.7,-17,2.1,4.75,.175),(-14.7,-27,2.1,4.75,.17),
                                           (-17.5,-16.5,2.1,5.25,.18),(-26.5,-16.5,2.1,5.25,.18)]):
        vv=[];ff=[];N=12;levels=7
        for j in range(levels):
            t=j/(levels-1);xx=x+.026*math.sin(t*PI+i);zz=z+.024*math.sin(t*PI*1.3+i*.5)
            radius=rad*(.91+.07*math.sin(t*PI)+.055*math.sin(t*19+i))
            for k in range(N):
                a=k*2*PI/N;r=radius*(1+.055*math.sin(k*2.5+t*13+i))
                vv.append((xx+math.cos(a)*r,mix(bottom,top,t),zz+math.sin(a)*r))
        for j in range(levels-1):
            for k in range(N):a=j*N+k;b=j*N+(k+1)%N;ff.append((a+N,b+N,b,a))
        ff.extend([tuple(range(N)),tuple((levels-1)*N+k for k in range(N-1,-1,-1))])
        polygon('DarkTimber',vv,ff,scale=.95,smooth=True)
        # Projecting tenon ends and tapered wood pegs make the upper junctions
        # read as fitted timber rather than intersecting uniform cylinders.
        beam('Timber',(x-.27,top-.18,z),(x+.28,top-.18,z),.095,.075,sides=8,jitter=.06)
        beam('DarkTimber',(x+.05,top-.44,z-.23),(x+.05,top-.44,z+.23),.027,.036,sides=7)

def congo_steamer_visible_trim():
    # Projecting narrow casings surround the front-facing dark reveals. Their
    # 13–14cm visible jamb width is legible in the actual 52-degree start view.
    for cx,zz,width,low,high in [(8.78,-24.92,.78,1.49,2.31),(10.82,-24.92,.78,1.49,2.31),
                               (9.15,-29.95,1.06,3.31,4.03),(10.45,-29.95,1.06,3.31,4.03)]:
        front=zz+.105
        for xx in (cx-width/2,cx+width/2):
            beam('Timber',(xx,low-.028,front),(xx,high+.028,front),.022,.019,sides=7,jitter=.025)
        for yy in (low,high):
            beam('Timber',(cx-width/2-.028,yy,front),(cx+width/2+.028,yy,front),.024,.021,sides=7,jitter=.025)
        box('BoatPaint',(cx,low-.052,front+.012),(width+.15,.072,.135),bevel=.022)
    # Narrow caulking joints articulate the large sunlit front planks without
    # painting a fake lighting pattern onto the cabin's ivory surface.
    for zz,left,right,low,high in [(-24.843,8.30,11.30,.86,1.425),(-29.883,8.46,11.14,2.79,3.285)]:
        for i,xx in enumerate(np.arange(left+.19,right-.1,.27)):
            beam('DarkTimber',(xx,low+.012*math.sin(i*2.1),zz),(xx+.008*math.sin(i),high,zz),.012,.010,sides=4)

def surface_height(x,z,ground_fn=None):
    y=(ground_fn or HEIGHT_FN)(x,z); on=False
    for s in WALK_SURFACES:
        hit=False
        if s['type']=='rect':a,b,c,d=s['bounds'];hit=a<=x<=b and c<=z<=d
        elif s['type']=='ellipse':cx,cz=s['center'];rx,rz=s['radii'];hit=((x-cx)/rx)**2+((z-cz)/rz)**2<=1
        else:hit=closest_path(x,z,s['points'])[0]<=s['width']/2
        if hit:y=max(y,s['height']);on=True
    return y,on

def nav_data(region):
    spawn={'congo':[-3,3],'amazonia':[2,4],'ireland':[5,5]}[region]
    height=[];walk=[];nav_fn=congo_navigation_base if region=='congo' else HEIGHT_FN
    for z in range(-48,11):
        for x in range(-24,13):
            y,on=surface_height(x,z,nav_fn);height.append(round(y,4))
            blocked=any(dist(x,z,c['x'],c['z'])<c['r']+.22 for c in OBSTACLES)
            gradient=max(abs(nav_fn(x+.5,z)-nav_fn(x-.5,z)),abs(nav_fn(x,z+.5)-nav_fn(x,z-.5)))
            ok=(on or (y>.12 and gradient<.65)) and not blocked
            # Prevent walking off elevated boards into the flooded creek.
            walk.append(1 if ok else 0)
    targets={'congo':[[-8,-10],[-15,-22],[1,-34]],'amazonia':[[-12,-9],[-16,-25],[3,-40],[-9,-27],[-17,-32],[-7,-36]],'ireland':[[0,-10],[-6,-18],[-12,-28]]}[region]
    def idx(p):return (p[1]+48)*37+p[0]+24
    queue=[tuple(spawn)];seen=set(queue)
    for x,z in queue:
        for dx,dz in ((1,0),(-1,0),(0,1),(0,-1)):
            p=(x+dx,z+dz)
            if -24<=p[0]<=12 and -48<=p[1]<=10 and p not in seen and walk[idx(p)]:seen.add(p);queue.append(p)
    issues=[p for p in targets if tuple(p) not in seen]
    if issues:raise RuntimeError(f'{region}: disconnected mission pads {issues}')
    grid={'origin':[-24,-48],'step':1,'width':37,'height':59}
    return {'spawn':spawn,'bounds':[-24,12,-48,10],'heightGrid':{**grid,'values':height},'walkableGrid':{**grid,'values':walk},'colliders':OBSTACLES.copy(),'landmarks':LANDMARKS.copy(),'heroTrees':TREES.copy(),'walkSurfaces':WALK_SURFACES.copy(),'missionPads':[{'position':[x,round(surface_height(x,z)[0],3),z],'reachable':True} for x,z in targets],'reachableCellCount':len(seen),'coordinateSystem':'Three.js Y-up, metres; grid values iterate Z then X'}

def preview_setup(region):
    # All preview-only objects are excluded from GLB export.
    world=bpy.data.worlds.new(region+'_preview_world');bpy.context.scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.48,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
    sun_data=bpy.data.lights.new('Preview sun','SUN');sun_data.energy=2.5;sun_data.angle=.15
    sun=bpy.data.objects.new('Preview sun',sun_data);bpy.context.collection.objects.link(sun);sun.rotation_euler=(.5,-.45,-.6)
    area_data=bpy.data.lights.new('Preview fill','AREA');area_data.energy=1700;area_data.shape='DISK';area_data.size=35
    area=bpy.data.objects.new('Preview fill',area_data);bpy.context.collection.objects.link(area);area.location=g((-15,28,1));area.rotation_euler=(Vector(g((-10,0,-20)))-area.location).to_track_quat('-Z','Y').to_euler()
    watermat=bpy.data.materials.new('PREVIEW ONLY WATER');watermat.diffuse_color=((.12,.20,.16,1) if region=='congo' else ((.065,.18,.16,1) if region=='amazonia' else (.14,.24,.29,1)));watermat.use_nodes=True
    bs=watermat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=watermat.diffuse_color;bs.inputs['Roughness'].default_value=.21;bs.inputs['Metallic'].default_value=.2
    mesh=bpy.data.meshes.new('Preview water');mesh.from_pydata([g((-150,0,-160)),g((160,0,-160)),g((160,0,100)),g((-150,0,100))],[],[(0,3,2,1)]);water=bpy.data.objects.new('PREVIEW ONLY WATER',mesh);bpy.context.collection.objects.link(water);water.data.materials.append(watermat)
    cam_data=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',cam_data);bpy.context.collection.objects.link(cam);bpy.context.scene.camera=cam
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    return cam

def aim(cam,pos,target,lens=42):cam.location=g(pos);cam.rotation_euler=(Vector(g(target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens

def build(region):
    global MESHES,MATERIALS,OBSTACLES,WALK_SURFACES,LANDMARKS,TREES,HEIGHT_FN,CURRENT_REGION,BANK_CONTACT_BVH
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MESHES={};MATERIALS={};OBSTACLES=[];WALK_SURFACES=[];LANDMARKS=[];TREES=[];HEIGHT_FN=HEIGHT_FUNCS[region];CURRENT_REGION=region
    RNG.seed({'congo':416,'amazonia':901,'ireland':305}[region])
    make_materials(region);terrain(region);authored_details(region)
    if region=='congo':congo_bank_and_veranda_craft();congo_embedded_roots_and_panels();congo_woven_wall_depth();congo_steamer_visible_trim();congo_sculpted_mud_shelves()
    BANK_CONTACT_BVH=None
    if region=='congo':
        bank=MESHES['BankMud'];BANK_CONTACT_BVH=BVHTree.FromPolygons([(p[0],p[2],-p[1]) for p in bank.v],bank.f)
    data=nav_data(region)
    if region=='congo':
        data['detailHeightGrid']={'origin':[-14,-18],'step':.0625,'width':241,'height':417,'values':[round(congo_rendered_floor(-14+i*.0625,-18+j*.0625),5) for j in range(417) for i in range(241)]}
    objects=[b.object() for b in MESHES.values() if b.v]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{region}.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_materials='EXPORT',export_image_format='JPEG',export_jpeg_quality=80,export_cameras=False,export_lights=False,export_vertex_color='NAME' if region in ('ireland','congo') else 'MATERIAL',export_vertex_color_name='Col',export_all_vertex_colors=False)
    tri=sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in objects)
    mins=[min(v[i] for b in MESHES.values() for v in b.v) for i in range(3)];maxs=[max(v[i] for b in MESHES.values() for v in b.v) for i in range(3)]
    data['mesh']={'triangles':tri,'drawCalls':len(objects),'materials':[o.name for o in objects],'file':f'/celta/models/{region}.glb','bytes':(OUT/f'{region}.glb').stat().st_size,'gameBounds':[[mins[0],mins[2],-maxs[1]],[maxs[0],maxs[2],-mins[1]]]}
    print(f'CELTA_REGION {region}: {tri} triangles, {len(objects)} material batches, {data["reachableCellCount"]} connected nav cells',flush=True)
    cam=preview_setup(region)
    aim(cam,(39,31,30),(-8,2,-20),44)
    bpy.context.scene.render.filepath=str(PREV/f'{region}-overview.png')
    if not os.environ.get('CELTA_SKIP_PREVIEWS'):bpy.ops.render.render(write_still=True)
    pos={'congo':(9,5.2,9),'amazonia':(11,5.8,12),'ireland':(16,5.6,11)}[region]
    target={'congo':(-13,3,-19),'amazonia':(-12,3.0,-19),'ireland':(-11,3.3,-25)}[region]
    aim(cam,pos,target,30);bpy.context.scene.render.filepath=str(PREV/f'{region}-approach.png')
    if not os.environ.get('CELTA_SKIP_PREVIEWS'):bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND/f'{region}.blend'),compress=True)
    return data

# Emitted beside previews so the Blender authoring source is self-contained.
QUANTIZED_GRID_SCRIPT = r"""import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const cache=path.join(os.homedir(),'.npm/_npx');
const deps=fs.readdirSync(cache).map(n=>path.join(cache,n,'node_modules')).find(p=>fs.existsSync(path.join(p,'@gltf-transform/core/dist/index.js')));
if(!deps)throw new Error('glTF Transform cache missing; run the pinned meshopt export first');
const {NodeIO}=await import(pathToFileURL(path.join(deps,'@gltf-transform/core/dist/index.js')));
const {ALL_EXTENSIONS}=await import(pathToFileURL(path.join(deps,'@gltf-transform/extensions/dist/index.js')));
const {MeshoptDecoder}=await import(pathToFileURL(path.join(root,'node_modules/meshoptimizer/meshopt_decoder.module.js')));
const jsonPath=path.join(root,'public/celta/models/worlds.json');const worlds=JSON.parse(fs.readFileSync(jsonPath));
const grid=worlds.congo.detailHeightGrid,old=[...grid.values],bins=new Map();
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(path.join(root,'public/celta/models/congo.glb'));
const minx=grid.origin[0],minz=grid.origin[1],maxx=minx+(grid.width-1)*grid.step,maxz=minz+(grid.height-1)*grid.step;
let triangleCount=0;
for(const node of doc.getRoot().listNodes()){
  const mesh=node.getMesh();if(!mesh)continue;
  const m=node.getWorldMatrix();
  for(const p of mesh.listPrimitives()){
    if(!['Laterite','WornLaterite','BankMud','Timber'].includes(p.getMaterial()?.getName()))continue;
    const pos=p.getAttribute('POSITION'),indices=p.getIndices(),points=[];
    for(let i=0;i<pos.getCount();i++){
      const [x,y,z]=pos.getElement(i,[]);
      points.push([m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]);
    }
    for(let i=0;i<(indices?.getCount()??points.length);i+=3){
      const a=points[indices?indices.getScalar(i):i],b=points[indices?indices.getScalar(i+1):i+1],c=points[indices?indices.getScalar(i+2):i+2];
      const xmin=Math.min(a[0],b[0],c[0]),xmax=Math.max(a[0],b[0],c[0]),zmin=Math.min(a[2],b[2],c[2]),zmax=Math.max(a[2],b[2],c[2]);
      if(xmax<minx||xmin>maxx||zmax<minz||zmin>maxz)continue;
      const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-11)continue;
      const tri={a,b,c,den,timber:p.getMaterial()?.getName()==='Timber'};triangleCount++;
      for(let z=Math.floor(zmin*2);z<=Math.floor(zmax*2);z++)for(let x=Math.floor(xmin*2);x<=Math.floor(xmax*2);x++){
        const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(tri);
      }
    }
  }
}
let hits=0,maxChange=0;
for(let j=0;j<grid.height;j++)for(let i=0;i<grid.width;i++){
  const x=minx+i*grid.step,z=minz+j*grid.step,index=j*grid.width+i,prior=old[index];let y=-Infinity;
  for(const t of bins.get(Math.floor(x*2)+','+Math.floor(z*2))??[]){
    const {a,b,c,den}=t,u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;
    if(u< -1e-7||v< -1e-7||u+v>1+1e-7)continue;
    const py=u*a[1]+v*b[1]+(1-u-v)*c[1];if(t.timber&&(py>prior+.45||py<prior-.45))continue;y=Math.max(y,py);
  }
  if(Number.isFinite(y)){grid.values[index]=Math.round(y*100000)/100000;maxChange=Math.max(maxChange,Math.abs(y-prior));hits++;}
}
fs.writeFileSync(jsonPath,JSON.stringify(worlds));
const report={samples:grid.values.length,hits,triangleCount,maximumCorrectionMetres:maxChange,source:'Final meshopt-quantized Laterite, WornLaterite, BankMud and Timber floor triangles'};
fs.writeFileSync(path.join(root,'.dream-loop/v2/environment-previews/congo-quantized-grid-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
"""

def compress_runtime(worlds):
    """Preserve Blender sources; quantize runtime positions to <3mm error.

    Decoder: THREE.GLTFLoader.setMeshoptDecoder(MeshoptDecoder). The pinned CLI
    lives in npm's tool cache and does not change project dependencies.
    """
    npx=shutil.which('npx')
    if not npx:raise RuntimeError('npx is required for final meshopt runtime compression')
    congo_changed=False
    for region,data in worlds.items():
        target=OUT/f'{region}.glb'
        if data['mesh'].get('compression') and data['mesh']['bytes']==target.stat().st_size:continue
        temp=PREV/f'{region}.runtime.glb';data['mesh']['uncompressedBytes']=target.stat().st_size
        subprocess.run([npx,'--yes','@gltf-transform/cli@4.2.1','meshopt',str(target),str(temp),'--level','high','--quantize-position','16','--quantize-normal','10','--quantize-texcoord','14','--quantization-volume','scene'],check=True)
        os.replace(temp,target);data['mesh']['bytes']=target.stat().st_size
        if region=='congo':congo_changed=True
        data['mesh']['compression']={'extensions':['EXT_meshopt_compression','KHR_mesh_quantization'],'positionBits':16,'normalBits':10,'uvBits':14,'maximumPositionErrorMetres':.003,'tool':'@gltf-transform/cli@4.2.1'}
        print(f'CELTA_COMPRESSED {region}: {data["mesh"]["uncompressedBytes"]} -> {data["mesh"]["bytes"]} bytes',flush=True)
    (OUT/'worlds.json').write_text(json.dumps(worlds,separators=(',',':')))
    # Steep authored mud shelves amplify sub-mm horizontal quantization into
    # height error. Sample the final decoded runtime triangles for exact feet.
    if congo_changed:
        (PREV/'congo-quantized-grid.mjs').write_text(QUANTIZED_GRID_SCRIPT)
        subprocess.run([shutil.which('node'),'--no-warnings',str(PREV/'congo-quantized-grid.mjs')],check=True)
        updated=json.loads((OUT/'worlds.json').read_text());worlds.clear();worlds.update(updated)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    selected=[] if args==['--compress-only'] else (args or ['congo','amazonia','ireland'])
    worlds={}
    existing=OUT/'worlds.json'
    if existing.exists():worlds=json.loads(existing.read_text())
    for region in selected:
        worlds[region]=build(region)
        existing.write_text(json.dumps(worlds,separators=(',',':')))
    compress_runtime(worlds)
    (PREV/'build-summary.md').write_text('Original Blender environments built by tools/celta/environments.py.\n\n'+ '\n'.join(f'- {name}: {v["mesh"]["triangles"]:,} triangles; {v["mesh"]["drawCalls"]} material batches; {v["reachableCellCount"]} connected walkable cells; {v["mesh"]["bytes"]/1000000:.2f} MB compressed.' for name,v in worlds.items())+'\n\nPreview water, lights and cameras exist only in source blends and PNG inspection renders. GLBs contain only textured environment meshes. Packed textures derive from generated project atlases. Navigation grids include raised timber walkways and building floors. All mission pads are checked for 4-neighbor connected reachability from spawn.\n')
