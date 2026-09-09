"""Original Celta characters, authored in Blender. Run Blender -b -P this file.
Units are metres, Blender +Y forward, +Z up (glTF -Z forward, +Y up).
All four characters incorporate credited Blender Studio anatomy and ambientCG PBR surfaces.
Roger also uses CC0 MakeHuman Short02 hair; other meshes/maps are original project assets. See assets/characters/ATTRIBUTION.md.
"""
import bpy, math, random, json, os, struct, re, tempfile, sys
from mathutils import Vector
import numpy as np
from math import sin, cos, pi, exp
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from professional_characters import replace_roger_anatomy, apply_professional_surfaces, pack_professional_materials
from professional_npcs import replace_npc_anatomy, apply_npc_professional_surfaces, pack_npc_professional_materials
OUT=os.environ.get('CELTA_CHARACTER_OUTPUT',os.path.join(ROOT,'public/celta/models'))
PREVIEW=os.path.join(ROOT,'.dream-loop/v2/characters')
SOURCE_BLEND=os.path.join(ROOT,'tools/celta/blend/characters.blend')
BLEND=os.environ.get('CELTA_CHARACTER_BLEND',SOURCE_BLEND)
os.makedirs(OUT,exist_ok=True)
random.seed(13)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
# Atlas is an original generated project texture, not an external model or material.
atlas=bpy.data.images.load(os.path.join(ROOT,'public/celta/materials.jpg'))
w,h=atlas.size
px=np.asarray(atlas.pixels[:],dtype=np.float32).reshape(h,w,4)
canvas=px[int(h*.04):int(h*.46),int(w*.025):int(w*.305),:3]
# The image coordinate origin is bottom left; canvas is the lower left atlas swatch.
ys=np.linspace(0,canvas.shape[0]-1,256).astype(int); xs=np.linspace(0,canvas.shape[1]-1,256).astype(int)
canvas=canvas[ys][:,xs]
canvas_lum=np.mean(canvas,axis=2)
canvas_detail=np.clip(canvas_lum/(np.mean(canvas_lum)+1e-6),.55,1.35)
MATS={}
atlas_path=os.path.join(PREVIEW,'face-albedo-atlas.png')
if os.path.exists(atlas_path):
    face_atlas=bpy.data.images.load(atlas_path);fw,fh=face_atlas.size
    face_pixels=np.asarray(face_atlas.pixels[:],dtype=np.float32).reshape(fh,fw,4)
    face_space=face_atlas.colorspace_settings.name
else:
    # The packed .blend is self-contained: recover the original generated tiles
    # when the ignored working-preview directory is absent in a fresh checkout.
    names=[k+'_original_face_albedo' for k in ['roger','congo','amazonia','ireland']]
    with bpy.data.libraries.load(SOURCE_BLEND,link=False) as (source,dest):dest.images=names
    tiles=[]
    for name in names:
        im=bpy.data.images.get(name);tw,th=im.size
        tiles.append(np.asarray(im.pixels[:],dtype=np.float32).reshape(th,tw,4))
    face_pixels=np.concatenate([np.concatenate([tiles[2],tiles[3]],axis=1),np.concatenate([tiles[0],tiles[1]],axis=1)],axis=0)
    fh,fw=face_pixels.shape[:2];face_space='sRGB'
FACE_MATS={}

def face_uv(co,kind='roger'):
    x,y,z=co
    u=max(.012,min(.988,.5+x*7.15))
    v=float(np.interp(z,[1.585,1.595,1.640,1.668,1.729,1.795,1.823],[.006,.030,.239,.445,{'roger':.725,'congo':.713,'amazonia':.754,'ireland':.746}[kind],.99,1]))
    return (u,v)

def face_material(kind):
    tiles={'roger':(0,1),'congo':(1,1),'amazonia':(0,0),'ireland':(1,0)}
    tx,ty=tiles[kind];tile=face_pixels[ty*(fh//2):(ty+1)*(fh//2),tx*(fw//2):(tx+1)*(fw//2)]
    im=bpy.data.images.new(kind+'_original_face_albedo',width=fw//2,height=fh//2)
    im.colorspace_settings.name=face_space;im.pixels.foreach_set(tile.ravel());im.pack()
    m=bpy.data.materials.new(kind+'_photoreal_skin');m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.76;bs.inputs['Specular IOR Level'].default_value=.22
    bs.inputs['Subsurface Weight'].default_value=.035
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='EXTEND';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    lum=np.mean(tile[:,:,:3],axis=2);blur=sum(np.roll(np.roll(lum,a,0),b,1) for a in [-3,0,3] for b in [-3,0,3])/9
    gy,gx=np.gradient(lum-blur);normal=np.ones_like(tile);normal[:,:,0]=.5-gx*1.8;normal[:,:,1]=.5-gy*1.8;normal[:,:,2]=1
    nmim=bpy.data.images.new(kind+'_skin_micro_normal',width=fw//2,height=fh//2);nmim.colorspace_settings.name='Non-Color';nmim.pixels.foreach_set(normal.ravel());nmim.pack()
    nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=nmim;nt.extension='EXTEND';nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.32
    m.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    # Skin swatch below the outer cheek, avoiding brows/lips and sclera.
    swatch=np.median(tile[int(tile.shape[0]*.40):int(tile.shape[0]*.53),int(tile.shape[1]*.14):int(tile.shape[1]*.24),:3].reshape(-1,3),axis=0)
    FACE_MATS[kind]=m
    return m,tuple(float(c) for c in swatch)


def mat(name,color,kind='cloth',rough=.82):
    if name in MATS:return MATS[name]
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value=rough
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Specular IOR Level'].default_value=.28
    if kind!='solid':
        size=256 if kind=='cloth' else 128
        rng=np.random.default_rng(abs(sum(ord(c) for c in name)))
        yy,xx=np.meshgrid(np.arange(size),np.arange(size),indexing='ij')
        if kind=='cloth': detail=.55+.45*canvas_detail
        elif kind=='skin': detail=1+rng.normal(0,.028,(size,size))+.07*np.sin(xx/37)*np.sin(yy/21)
        elif kind=='hair': detail=.88+.15*np.sin(xx*.41+np.sin(yy*.05))+.035*rng.normal(size=(size,size))
        else: detail=.9+.12*rng.random((size,size))+.035*np.sin(xx/8+yy/15)
        rgba=np.ones((size,size,4),np.float32);rgba[:,:,:3]=np.clip(detail[:,:,None]*np.array(color)[None,None,:],0,1)
        image=bpy.data.images.new(name+'_albedo',width=size,height=size)
        image.pixels.foreach_set(rgba.ravel());image.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        if kind=='cloth':
            gy,gx=np.gradient(canvas_detail);normal=np.ones((256,256,4),np.float32)
            normal[:,:,0]=.5-gx*.35;normal[:,:,1]=.5-gy*.35;normal[:,:,2]=1
            imn=bpy.data.images.new(name+'_woven_normal',width=256,height=256);imn.colorspace_settings.name='Non-Color';imn.pixels.foreach_set(normal.ravel());imn.pack()
            nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=imn
            nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.80
            m.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    if kind=='skin':bs.inputs['Subsurface Weight'].default_value=.045
    MATS[name]=m;return m

def mesh(name,verts,faces,material,parent=None,sub=0,uvcoords=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    if material:me.materials.append(material)
    if parent:ob.parent=parent
    for p in me.polygons:p.use_smooth=True
    # Cylindrical UVs (fine cloth repeat is in the texture itself).
    uv=me.uv_layers.new(name='SurfaceUV')
    for p in me.polygons:
        for li in p.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=uvcoords[me.loops[li].vertex_index] if uvcoords else (co.x*5,co.z*5)
        if uvcoords:
            us=[uv.data[li].uv.x for li in p.loop_indices]
            if max(us)-min(us)>.8:
                for li in p.loop_indices:
                    if uv.data[li].uv.x<.2:uv.data[li].uv.x+=1
    if sub:
        mod=ob.modifiers.new('Tailored surface subdivision','SUBSURF');mod.levels=sub
        bpy.context.view_layer.objects.active=ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def smooth_profile(z,profiles,col):
    zs=[p[0] for p in profiles];vs=[p[col] for p in profiles]
    if z<=zs[0]:return vs[0]
    if z>=zs[-1]:return vs[-1]
    i=int(np.searchsorted(zs,z))-1;dz=zs[i+1]-zs[i];t=(z-zs[i])/dz
    a=max(0,i-1);b=min(len(zs)-1,i+2)
    m0=(vs[i+1]-vs[a])/(zs[i+1]-zs[a]);m1=(vs[b]-vs[i])/(zs[b]-zs[i])
    return (2*t**3-3*t**2+1)*vs[i]+(t**3-2*t*t+t)*dz*m0+(-2*t**3+3*t*t)*vs[i+1]+(t**3-t*t)*dz*m1

def loft(name,rings,material,parent=None,n=32,sub=1,fold=0,shape=1,cap_bottom=True):
    # ring: z, cx, cy, half-width, half-depth
    if any(word in name.lower() for word in ['torso','sleeve','trouser leg','wrap skirt']):
        dense=[]
        for a,b in zip(rings,rings[1:]):
            count=max(1,int(math.ceil((b[0]-a[0])/.035)))
            for j in range(count):dense.append(tuple(a[k]+(b[k]-a[k])*j/count for k in range(5)))
        dense.append(rings[-1]);rings=dense
    verts=[]
    for j,(z,cx,cy,rx,ry) in enumerate(rings):
        for i in range(n):
            a=2*pi*i/n;c=cos(a);s=sin(a)
            bump=fold*(sin(5*a+z*17)+.55*sin(9*a-z*27)+.3*cos(13*a+z*31))
            verts.append((cx+rx*math.copysign(abs(c)**shape,c)*(1+bump),cy+ry*math.copysign(abs(s)**shape,s)*(1+bump),z))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    if cap_bottom:faces.append(tuple(range(n-1,-1,-1)))
    faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
    ob=mesh(name,verts,faces,material,parent,sub,[(i/n,z*5) for z,cx,cy,rx,ry in rings for i in range(n)])
    # UV true loft arc by index, stable with subdivision interpolation.
    return ob

def ellipsoid(name,loc,scale,material,parent=None,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    for p in ob.data.polygons:p.use_smooth=True
    if parent:ob.parent=parent
    return ob

def curve(name,pts,radius,material,parent=None,res=2):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=8
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
    for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    cu.bevel_depth=radius;cu.bevel_resolution=res
    ob=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(ob);cu.materials.append(material)
    if parent:ob.parent=parent
    bpy.context.view_layer.objects.active=ob;ob.select_set(True)
    bpy.ops.object.convert(target='MESH');ob.select_set(False)
    return ob

def panel(name,points,material,parent=None,thickness=.003,bevel=.003):
    ob=mesh(name,points,[tuple(range(len(points)))],material,parent)
    sol=ob.modifiers.new('Real cloth thickness','SOLIDIFY');sol.thickness=thickness
    bev=ob.modifiers.new('Soft bound edge','BEVEL');bev.width=bevel;bev.segments=2
    bpy.context.view_layer.objects.active=ob
    bpy.ops.object.modifier_apply(modifier=sol.name);bpy.ops.object.modifier_apply(modifier=bev.name)
    return ob

def ribbon(name,pts,width,material,parent):
    conforming=name=='Satchel rear diagonal strap'
    if conforming:
        dense=[]
        for a,b in zip(pts,pts[1:]):
            count=max(1,math.ceil((Vector(b)-Vector(a)).length/.012))
            dense.extend(tuple(Vector(a).lerp(Vector(b),i/count)) for i in range(count))
        pts=dense+[pts[-1]]
    verts=[];columns=5 if conforming else 2
    for i,p in enumerate(pts):
        tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])
        side=Vector((tangent.z,0,-tangent.x)).normalized()*width/2
        if side.x<0:side=-side
        verts.extend(tuple(Vector(p)+side*(j/(columns-1)*2-1)) for j in range(columns))
    return mesh(name,verts,[(i*columns+j,i*columns+j+1,(i+1)*columns+j+1,(i+1)*columns+j) for i in range(len(pts)-1) for j in range(columns-1)],material,parent)

def empty(name,loc=(0,0,0),parent=None):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.location=loc
    if parent:ob.parent=parent
    return ob

def box(name,loc,scale,material,parent=None,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    b=o.modifiers.new('Worked edges','BEVEL');b.width=bevel;b.segments=3
    bpy.ops.object.modifier_apply(modifier=b.name)
    for p in o.data.polygons:p.use_smooth=True
    if parent:o.parent=parent
    return o

# Keep individual anatomically authored mesh surfaces in the .blend source.
# Export duplicates are merged by anatomical pivot for a small draw-call count.
CHARACTERS=[]

def build_character(key,kind,height):
    root=empty(key); body=empty('Body',parent=root)
    skincols={'roger':(.65,.47,.361),'congo':(.19,.105,.061),'amazonia':(.47,.255,.142),'ireland':(.57,.365,.27)}
    face_mat,skin_color=face_material(kind)
    skin=mat(key+'_skin',skin_color,'skin',.77)
    haircol={'roger':(.135,.085,.048),'congo':(.021,.018,.014),'amazonia':(.025,.019,.014),'ireland':(.17,.12,.078)}[kind]
    hair=mat(key+'_hair',tuple(c*(1.28 if kind=='roger' else .58) for c in haircol),'hair',.79 if kind=='roger' else .89)
    hair_light=mat(key+'_sunlit_hair',tuple(c*1.85 for c in haircol),'hair',.68) if kind=='roger' else hair
    if kind=='roger':hair_light.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.30
    lips=mat(key+'_lips',tuple(c*.76 for c in skincols[kind]),'skin',.65)
    eyes=mat('Warm ivory eyes',(.59,.55,.43),'solid',.36)
    iris=mat('Roger grey eyes' if kind=='roger' else 'Dark brown eyes',(.11,.13,.13) if kind=='roger' else (.048,.032,.021),'solid',.4)
    boot=mat('Oiled brown leather',(.068,.043,.025),'leather',.64)
    sole=mat('Worn boot soles',(.022,.020,.016),'leather',.88)
    stitch=mat('Weathered stitching',(.24,.188,.112),'cloth')
    brass=mat('Aged brass',(.31,.219,.088),'solid',.48);brass.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.55
    if kind=='roger':coat=mat('Khaki drill cotton',(.370,.286,.194));pants=mat('Tobacco wool trousers',(.187,.148,.103));shirt=mat('Warm linen collar',(.65,.613,.53))
    elif kind=='congo':coat=mat('Indigo washed cotton',(.10,.175,.182));pants=mat('Faded umber trousers',(.205,.146,.085));shirt=mat('Ecru cotton',(.55,.484,.356))
    elif kind=='amazonia':coat=mat('Unbleached woven blouse',(.56,.484,.343));pants=mat('Madderrust woven wrap',(.285,.105,.054));shirt=mat('Woven ochre belt',(.39,.245,.09))
    else:coat=mat('Slate Donegal wool',(.085,.112,.119));pants=mat('Charcoal wool trousers',(.075,.077,.069));shirt=mat('Heather moss wool scarf',(.22,.239,.161))
    scale=height/1.835;root.scale=(scale,scale,scale)
    # The torso is a lean ribcage / waist / pelvis profile, independently clothed.
    broad=1.1 if kind=='ireland' else (.94 if kind=='amazonia' else 1)
    jacket_rings=[(.845,0,-.008,.181*broad,.111),(.86,0,-.008,.187*broad,.114),(.93,0,-.005,.177*broad,.113),(1.04,0,0,.160*broad,.104),(1.13,0,0,.151*broad,.100),(1.24,0,-.005,.176*broad,.113),(1.36,0,-.008,.201*broad,.119),(1.435,0,-.005,.215*broad,.107),(1.468,0,0,.192*broad,.092),(1.495,0,0,.073,.057)]
    if kind=='roger':
        # The trousers' outer hip reaches x=0.208 m. Give the actual garment
        # enough ease over that volume, including the moving rear thigh.
        # A narrow waist transitions into a tailored, gently flared skirt.
        jacket_rings=[(.845,0,-.008,.210,.136),(.86,0,-.008,.213,.138),(.93,0,-.005,.209,.136),(1.00,0,-.002,.200,.131),(1.04,0,0,.179,.119),(1.09,0,0,.165,.108)]+[r for r in jacket_rings if r[0]>=1.13]
    if kind=='congo':
        jacket_rings=[(.97,0,0,.160,.101),(1.0,0,0,.166,.105),(1.12,0,0,.151,.101),(1.28,0,-.008,.180,.117),(1.42,0,-.007,.20,.104),(1.46,0,0,.187,.09),(1.492,0,0,.073,.056)]
    if kind=='amazonia':
        jacket_rings=[(1.03,0,0,.150,.105),(1.055,0,0,.155,.107),(1.13,0,-.004,.14,.10),(1.28,0,0,.17,.12),(1.40,0,0,.179,.107),(1.465,0,0,.174,.091),(1.493,0,0,.068,.055)]
    loft('Contoured tailored torso',jacket_rings,coat,body,40,2 if kind=='roger' else 1,.018,.82,cap_bottom=kind!='roger')
    loft('Anatomical neck',[(1.455,0,0,.060,.050),(1.51,0,0,.057,.052),(1.57,0,.001,.048,.045),(1.605,0,.006,.050,.047)],skin,body,32,1)
    # Head sculpture: continuous asymmetric jaw, cheeks, temples and integrated nose bridge.
    profiles=[(1.585,.026,.032,.026),(1.595,.043,.041,.019),(1.612,.058,.050,.005),(1.633,.065,.057,-.005),(1.657,.066,.065,-.009),(1.682,.078,.071,-.009),(1.708,.075,.069,-.009),(1.733,.071,.071,-.007),(1.758,.074,.075,-.009),(1.781,.070,.070,-.012),(1.802,.055,.057,-.012),(1.818,.033,.036,-.012),(1.823,.006,.007,-.012)]
    width=1.06 if kind in ('congo','ireland') else (.94 if kind=='amazonia' else 1)
    zs=np.linspace(1.585,1.823,94);vert=[];n=96
    for z in zs:
        rx=smooth_profile(z,profiles,1)*width
        ry=smooth_profile(z,profiles,2)
        cy=smooth_profile(z,profiles,3)
        for j in range(n):
            a=j*2*pi/n;x=rx*cos(a);y=cy+ry*sin(a)
            if sin(a)>0:
                frontal=sin(a)**8
                nose=({'roger':.040,'congo':.026,'amazonia':.027,'ireland':.043}[kind])*exp(-((x/({'congo':.022,'amazonia':.016}.get(kind,.016)))**2)-((z-1.678)/.020)**2)+({'congo':.009,'amazonia':.012}.get(kind,.018))*exp(-(x/.010)**2-((z-1.711)/.038)**2)
                sockets=-.013*(exp(-((x-.030)/.016)**2-((z-1.729)/.012)**2)+exp(-((x+.030)/.016)**2-((z-1.729)/.012)**2))
                brow=.010*(exp(-((x-.030)/.019)**2)+exp(-((x+.030)/.019)**2))*exp(-((z-1.744)/.009)**2)
                cheeks=(.009 if kind in ('congo','amazonia') else .005)*exp(-((abs(x)-.046)/.025)**2-((z-1.69)/.025)**2)
                muzzle=.003*exp(-(x/.029)**2-((z-1.639)/.019)**2)
                muzzle+=.0042*exp(-(x/.026)**4-((z-1.648)/.0028)**2)+.0045*exp(-(x/.024)**4-((z-1.640)/.0035)**2)
                muzzle-=.0038*exp(-(x/.024)**6-((z-1.644)/.0016)**2)
                cheeks-=.005*exp(-((abs(x)-.048)/.013)**2-((z-1.650)/.024)**2)
                nose+=.006*(exp(-((x-.015)/.007)**2)+exp(-((x+.015)/.007)**2))*exp(-((z-1.670)/.006)**2)
                y+=(nose+sockets+brow+cheeks+muzzle)*frontal
            vert.append((x,y,z))
    faces=[]
    for r in range(len(zs)-1):
        for j in range(n):a=r*n+j;b=r*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces += [tuple(range(n-1,-1,-1)),tuple((len(zs)-1)*n+i for i in range(n))]
    head=mesh('Sculpted adult face and cranium',vert,faces,skin,body,0,[face_uv(co,kind) for co in vert])
    head.data.materials.append(face_mat)
    for poly in head.data.polygons:
        center=sum((head.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
        if center.y>-.001 and center.z<1.803:poly.material_index=1
    # Small almond openings held by modeled upper and lower eyelids.
    for s in [-1,1]:
        ex=s*.0288*width; ey=.0555
        # The sculpted orbital surface carries the aligned original facial albedo.
        # Cupped ear topology with helix rim, tragus and recessed concha.
        er=[];ef=[]
        for k in range(5):
            radial=(k+1)/5
            for j in range(24):
                a=j*2*pi/24
                er.append((s*(.071*width+.014*radial*cos(a)+.008*radial),-.001+.010*radial*sin(a)-.004*(1-radial),1.703+.022*radial*sin(a)))
        for k in range(4):
            for j in range(24):a=k*24+j;b=k*24+(j+1)%24;ef.append((a,b,b+24,a+24))
        ef.append(tuple(range(23,-1,-1)));mesh('Sculpted ear',er,ef,skin,body,1)
        curve('Outer ear helix',[(s*.078*width,.005,1.719),(s*.088*width,.010,1.718),(s*.093*width,.007,1.705),(s*.086*width,.008,1.686),(s*.080*width,.005,1.690)],.0024,skin,body,1)
    # Scalp with receding hairline and combed volume, no spherical wig.
    hv=[];hf=[];nr=15;nc=48
    for r in range(nr):
        t=r/(nr-1)
        for j in range(nc):
            a=2*pi*j/nc;front=max(0,sin(a));back=max(0,-sin(a))
            bottom=1.713+.065*front-.060*back+.019*exp(-((a-1.10)/.30)**2)+.0035*sin(a*13)
            if kind=='roger':bottom+=(.013*sin(a*3.1+.6)+.010*sin(a*5.7+1.1)+.006*sin(a*9.3-.4))*back
            if kind=='amazonia':bottom=1.710+.060*front-.045*back
            if kind=='congo':bottom=1.710+.057*front-.050*back
            hmax=1.837 if kind=='roger' else 1.826
            z=bottom+(hmax-bottom)*sin(t*pi/2)
            rx=smooth_profile(min(z,1.823),profiles,1)*width
            ry=smooth_profile(min(z,1.823),profiles,2)
            cy=smooth_profile(min(z,1.823),profiles,3)
            cap=1
            if z>1.810:
                dome=math.sqrt(max(0,(hmax-z)/(hmax-1.810)))
                rx=.047*dome;ry=.050*dome
            # Broad overlapping locks with a directional crown whorl; narrow
            # sculpted valleys read in the backlit game camera without a wig rim.
            if kind=='roger':
                swept=a+1.0*t+.15*sin(a*2-t*3)
                lock=(.5+.5*cos(11*swept))**3
                ripple=.0015+.0045*lock*sin(pi*(.12+.77*t))+.0007*cos(23*swept)+.0022*sin(a*5+t*8)*sin(pi*t)
                taper=1-.12*back*(1-t)**3
                rx*=taper;ry*=taper
            else:ripple=.0007*(1+sin(j*1.77+t*11)+.4*sin(j*2.73-t*15))
            shell=.002 if kind=='congo' else .004
            hv.append(((rx+shell+ripple)*cos(a)*cap-.004*t,(ry+shell+ripple)*sin(a)*cap+cy,z+.003+.001*sin(a*3+t*2)*sin(t*pi)))
    for r in range(nr-1):
        for j in range(nc):a=r*nc+j;b=r*nc+(j+1)%nc;hf.append((a,b,b+nc,a+nc))
    hf.append(tuple((nr-1)*nc+i for i in range(nc)))
    mesh('Contoured swept hair',hv,hf,hair,body,1)
    if kind=='roger':
        # Broad, tapered locks are overlapping sculpted patches. Their width
        # remains visible at a 450 px whole-character presentation, while the
        # finer strands remain a secondary highlight rather than a wig grid.
        def scalp_sample(a,t):
            q=(a%(2*pi))/(2*pi)*nc;j=int(q);f=q-j
            rr=t*(nr-1);r=min(nr-2,int(rr));g=rr-r
            return (Vector(hv[r*nc+j])*(1-f)+Vector(hv[r*nc+(j+1)%nc])*f)*(1-g)+(Vector(hv[(r+1)*nc+j])*(1-f)+Vector(hv[(r+1)*nc+(j+1)%nc])*f)*g
        for k,a0 in enumerate([3.17,3.43,3.86,4.04,4.49,4.77,5.21,5.44,5.87,6.14,.20,.69,1.03,1.49,1.80,2.20,2.48,2.92]):
            vv=[];ff=[];t0=[.004,.092,.025,.13,.045,.009][k%6];t1=[.96,.76,.90,.82,.98][k%5]
            for row in range(13):
                u=row/12;t=t0+(t1-t0)*u
                a=a0+(1.08+.27*sin(k*1.9))*t+.21*sin(t*3.8+k*.9)*sin(pi*t)
                angular_width=[.082,.155,.112,.198,.096,.143][k%6]*(.16+.84*sin(pi*u)**.65)
                for column in range(7):
                    across=column/3-1;point=scalp_sample(a+across*angular_width,t)
                    normal=Vector((point.x,point.y+.012,.015+max(0,point.z-1.78)*.9)).normalized()
                    relief=(.0045+.0010*(k%4))*max(0,1-across*across)**1.25*sin(pi*u)**.65
                    point+=normal*relief
                    vv.append(tuple(point))
            for row in range(12):
                for column in range(6):i=row*7+column;ff.append((i,i+1,i+8,i+7))
            mesh('Overlapping tapered hair lock '+str(k),vv,ff,hair_light if k%5==1 else hair,body,1,[(column/6,row/12) for row in range(13) for column in range(7)])
    # Raised swept locks lie on the scalp surface rather than floating above it.
    for k in range(0 if kind=='roger' else (0 if kind=='congo' else 11)):
        j0=int(k*nc/(13 if kind=='roger' else 11))
        pts=[]
        for r in [1,3,5,7,9,11]:
            jj=(j0+int(r*.6))%nc
            q=Vector(hv[r*nc+jj]);q+=Vector((q.x,q.y+.012,.02)).normalized()*.001
            pts.append(tuple(q))
        curve('Sculpted swept hair lock',pts,.0012 if kind=='roger' else .0014,hair_light if kind=='roger' and k%3==0 else hair,body,1)
    if kind=='amazonia':
        # Long gathered hair follows the neck; a plait has an irregular tapered contour.
        loft('Gathered long hair',[(1.29,0,-.069,.023,.021),(1.38,0,-.083,.029,.025),(1.47,0,-.093,.038,.033),(1.57,0,-.075,.061,.036),(1.68,0,-.050,.074,.042),(1.76,0,-.031,.064,.052)],hair,body,32,1,.035)
        for i in range(8):
            z=1.285+i*.018;ellipsoid('Interwoven braid',(sin(i*pi)*.011,-.087,z),(.021,.018,.014),hair,body,14,8)
        ribbon('Hair tie',[(-.023,-.107,1.34),(0,-.117,1.342),(.023,-.107,1.34)],.013,pants,body)
    # Jacket opening and separate notched collar/lapels.
    if kind=='roger':
        panel('Shirt front',[(-.055,.097,1.492),(.055,.097,1.492),(.044,.139,1.39),(.028,.140,1.39),(0,.14,1.365),(-.044,.139,1.39)],shirt,body)
        for s in [-1,1]:
            panel('Notched travel lapel',[(s*.053,.065,1.51),(s*.118,.110,1.455),(s*.102,.123,1.412),(s*.144,.129,1.398),(s*.035,.132,1.34),(s*.062,.109,1.435)],coat,body,.004)
        for z in [1.08,1.20,1.32]:ellipsoid('Jacket horn button',(.011,.112,z),(.009,.005,.009),boot,body,16,8)
        for s in [-1,1]:
            for z,ww in [(1.27,.054),(.985,.063)]:
                xx=s*(.117 if z>1.1 else .119)
                panel('Applied pocket',[(xx-ww,.117,z+.046),(xx+ww,.117,z+.046),(xx+ww*.90,.122,z-.048),(xx-ww*.90,.122,z-.048)],coat,body,.004)
                panel('Shaped pocket flap',[(xx-ww,.126,z+.055),(xx+ww,.126,z+.055),(xx+ww*.85,.131,z+.020),(xx,.136,z+.007),(xx-ww*.85,.131,z+.020)],coat,body,.003)
                ellipsoid('Pocket button',(xx,.139,z+.02),(.004,.0025,.004),boot,body,12,6)
        loft('Stand linen collar',[(1.491,0,.002,.061,.055),(1.502,0,.002,.065,.057),(1.554,0,.002,.058,.052)],shirt,body,32,1)
        for s in [-1,1]:
            panel('Folded shirt collar tip',[(s*.006,.110,1.525),(s*.058,.078,1.537),(s*.071,.121,1.444),(s*.024,.144,1.461)],shirt,body,.002)
        # Garment construction is carried by the tailored cloth surface.
        # Subpixel overlay seam tubes caused dotted shadows in the play camera;
        # keep them out of both geometry and the cavity bake.
        loft('Raised travel jacket back collar',[(1.459,0,-.007,.073,.064),(1.468,0,-.008,.077,.066),(1.504,0,-.008,.069,.062),(1.517,0,-.005,.064,.058)],coat,body,32,1)
        panel('Back belt',[(-.15,-.11,1.108),(.15,-.11,1.108),(.15,-.116,1.073),(-.15,-.116,1.073)],coat,body,.006)
        # Narrow felled centre seam and a slightly opened vent give the long
        # coat a garment construction, with thickness at the rear hem.
        panel('Overlapping rear walking vent',[(-.004,-.126,1.01),(.028,-.124,1.01),(.022,-.132,.854),(-.004,-.134,.857)],coat,body,.004,.002)
    elif kind=='congo':
        # Open-neck work shirt, rolled sleeves, asymmetrical repairs.
        # Keep the inner layer at the neckline and behind the closed shirt.
        # Its previous lower corners projected through the chest as a pale patch.
        panel('Open neck undershirt',[(-.053,.060,1.496),(.053,.060,1.496),(.033,.056,1.451),(-.033,.056,1.451)],shirt,body)
        for s in [-1,1]:panel('Relaxed shirt collar',[(s*.051,.068,1.506),(s*.111,.095,1.446),(s*.054,.126,1.400),(s*.014,.108,1.471)],coat,body,.003)
        curve('Shirt placket',[(0,.109,1.30),(0,.105,1.16),(0,.109,1.00)],.0015,coat,body,1)
        panel('Chest patch pocket',[(-.145,.114,1.34),(-.055,.127,1.34),(-.056,.127,1.251),(-.133,.117,1.253)],coat,body)
        for z in [1.07,1.18,1.29]:ellipsoid('Wood shirt button',(.002,.115,z),(.004,.0025,.004),boot,body,12,6)
    elif kind=='amazonia':
        # Wrap skirt with diagonal overlap, separate sash and blouse gathers.
        loft('Full length woven wrap skirt',[(.23,0,0,.186,.13),(.24,0,0,.190,.134),(.43,0,-.004,.186,.129),(.62,0,-.007,.183,.123),(.85,0,-.006,.177,.119),(1.05,0,0,.151,.109),(1.074,0,0,.151,.11)],pants,body,48,1,.031,.80)
        panel('Diagonal wrap overlap',[(-.13,.112,1.047),(.13,.118,1.016),(.154,.130,.60),(.125,.137,.251),(-.073,.139,.251)],pants,body,.004)
        loft('Woven waist sash',[(1.038,0,0,.153,.112),(1.052,0,0,.154,.114),(1.083,0,0,.15,.11)],shirt,body,40,0)
        for z in [.28,.32,.36]:
            curve('Woven hem band',[(-.13,.101,z),(-.07,.138,z),(0,.143,z),(.08,.131,z),(.15,.091,z)],.005,shirt,body,1)
        curve('Blouse gathered neckline',[(-.063,.050,1.491),(-.04,.079,1.475),(0,.086,1.467),(.04,.079,1.475),(.063,.05,1.491)],.006,shirt,body,1)
    else:
        # Long wool reefer with lapels and brass buttons, cap/scarf produce distinct silhouette.
        for s in [-1,1]:
            panel('Wool reefer lapel',[(s*.05,.068,1.514),(s*.134,.115,1.446),(s*.107,.13,1.407),(s*.165,.126,1.364),(s*.041,.133,1.195)],coat,body,.007)
            for z in [.96,1.085,1.21]:ellipsoid('Coat brass button',(s*.063,.126,z),(.006,.004,.006),brass,body,16,8)
            panel('Slanted welt pocket',[(s*.10,.132,1.029),(s*.17,.100,1.065),(s*.175,.100,1.044),(s*.105,.133,1.011)],pants,body,.004)
        loft('Wrapped wool scarf',[(1.45,0,.004,.07,.063),(1.477,0,.007,.083,.067),(1.52,0,0,.07,.061),(1.55,0,0,.058,.054)],shirt,body,32,1,.026)
        panel('Hanging scarf end',[(-.031,.137,1.474),(.031,.141,1.46),(.04,.137,1.244),(-.025,.141,1.231)],shirt,body,.012)
        loft('Flat cap crown',[(1.784,0,.005,.083,.087),(1.799,0,.008,.091,.096),(1.82,0,.006,.080,.088),(1.846,0,-.009,.052,.059),(1.853,0,-.013,.012,.016)],coat,body,40,1,.012)
        ellipsoid('Flat cap curved peak',(0,.079,1.787),(.077,.055,.006),coat,body,28,10)
    # Legs and arms are authored at anatomical joint pivots, for runtime rotation.
    for s,side in [(1,'Right'),(-1,'Left')]:
        hipx=s*.098
        leg=empty(side+'Leg',(hipx,0,.957),root)
        # Mesh temporarily world space; pivot parenting coordinates corrected below.
        thighx=s*.105
        if kind!='amazonia':
            trouser_rings=[(.30,s*.112,.002,.060,.067),(.34,s*.112,0,.072,.072),(.405,s*.11,-.008,.077,.078),(.49,s*.109,.013,.069,.075),(.552,s*.108,.021,.067,.073),(.608,s*.11,.013,.075,.079),(.74,s*.106,-.001,.090,.087),(.88,s*.103,-.009,.103,.095),(.975,s*.101,-.006,.107,.093),(1.017,s*.095,-.003,.087,.08)]
            if kind=='roger':
                # The jacket is never removed: concealed hip faces are omitted.
                # Retain 65 mm of overlap above the 0.845 m jacket hem so the
                # moving thigh remains covered at every point in the stride.
                trouser_rings=[r for r in trouser_rings if r[0]<.90]+[(.910,s*.103,-.009,.100,.092)]
            loft(side+' anatomically shaped trouser leg',trouser_rings,pants,leg,32,1,.027,.87)
            for z in [.365,.41,.535,.59]:
                pts=[(s*.112-.046,.053,z+.012),(s*.112,.083,z), (s*.112+.047,.05,z-.012)]
                curve('Tension crease in trouser',pts,.0007,pants,leg,1)
        else:
            loft('Lower leg under wrap',[(.08,s*.10,0,.032,.037),(.16,s*.10,0,.035,.040),(.29,s*.10,0,.047,.050)],skin,leg,24,1)
        if kind in ('roger','ireland'):
            # Lasted footwear and shaft are separate shaped profiles, never a sphere.
            loft('Leather boot shaft',[(.075,s*.112,.010,.057,.075),(.12,s*.112,-.003,.054,.056),(.20,s*.112,-.006,.049,.052),(.29,s*.112,-.007,.058,.061),(.335,s*.112,-.004,.064,.066),(.35,s*.112,-.004,.064,.066)],boot,leg,28,1,.012,.9)
            loft('Lasted boot upper',[(.032,s*.112,.055,.056,.127),(.047,s*.112,.055,.064,.133),(.067,s*.112,.054,.064,.132),(.093,s*.112,.041,.058,.115),(.125,s*.112,.005,.048,.067)],boot,leg,32,1,0,.82)
            loft('Layered leather outsole',[(.007,s*.112,.055,.063,.138),(.022,s*.112,.055,.066,.14),(.032,s*.112,.055,.064,.137)],sole,leg,32,1,0,.85)
            box('Stacked boot heel',(s*.112,-.026,.023),(.102,.084,.04),sole,leg,.009)
            for z in [.147,.177,.212]:curve('Leather ankle flex',[(s*.112-.035,.031,z),(s*.112,.048,z-.007),(s*.112+.035,.031,z)],.0017,stitch,leg,1)
            curve('Boot welt stitching',[(s*.112-.05,.101,.049),(s*.112-.037,.166,.049),(s*.112,.188,.049),(s*.112+.037,.166,.049),(s*.112+.05,.101,.049)],.0013,stitch,leg,1)
        else:
            # Sandals fitted around clearly modeled toes; skin leg above.
            if kind=='congo':
                loft('Visible calf and ankle',[(.075,s*.11,-.004,.031,.036),(.14,s*.11,-.004,.034,.038),(.22,s*.11,-.01,.043,.050),(.335,s*.11,-.01,.057,.058)],skin,leg,24,1)
            loft('Anatomical foot',[(.021,s*.11,.044,.037,.099),(.039,s*.11,.046,.044,.102),(.059,s*.11,.016,.039,.073),(.11,s*.11,-.004,.030,.037)],skin,leg,28,1,0,.82)
            loft('Leather sandal sole',[(.006,s*.11,.045,.044,.108),(.02,s*.11,.045,.046,.111)],boot,leg,28,1)
            ribbon('Crossed sandal strap',[(s*.11-.04,.09,.041),(s*.11,.066,.071),(s*.11+.04,.04,.040)],.019,boot,leg)
            ribbon('Ankle sandal strap',[(s*.11-.033,-.016,.095),(s*.11,.031,.1),(s*.11+.033,-.016,.095)],.015,boot,leg)
        # Correct vertices, object and subobject transforms from authored world to joint local space.
        for o in list(leg.children):o.location-=leg.location
        armx=s*.204*broad
        arm=empty(side+'Arm',(armx,-.003,1.452),root)
        sx=s*.235*broad
        if kind=='congo':end=1.20
        elif kind=='amazonia':end=1.255
        else:end=.991
        rr=[(end,s*.272,.015,.043,.046),(end+.014,s*.272,.015,.047,.048),(1.085,s*.265,.009,.050,.052),(1.17,s*.262,.002,.052,.056),(1.255,s*.253,-.01,.059,.062),(1.365,s*.238*broad,-.004,.067,.069),(1.435,s*.222*broad,0,.067,.068),(1.47,s*.210*broad,0,.047,.05)]
        if kind=='roger':
            rr=[(end,s*.272,.019,.038,.042),(end+.014,s*.272,.018,.042,.046),(1.074,s*.270,.014,.044,.048),(1.156,s*.263,.012,.045,.052),(1.214,s*.257,-.007,.051,.060),(1.29,s*.248,-.012,.056,.061),(1.365,s*.238,-.004,.062,.066),(1.435,s*.222,0,.065,.067),(1.47,s*.210,0,.047,.05)]
        rr=[r for r in rr if r[0]>=end];rr=sorted(set(rr),key=lambda r:r[0])
        loft('Fitted '+side+' sleeve',rr,coat,arm,40 if kind=='roger' else 28,2 if kind=='roger' else 1,.008 if kind=='roger' else .021)
        if kind in ('congo','amazonia'):
            loft('Rolled sleeve cuff',[(end,s*.272,.013,.047,.05),(end+.01,s*.272,.013,.052,.054),(end+.035,s*.268,.01,.052,.054)],shirt,arm,28,1,.025)
            loft('Forearm anatomy',[(.955,s*.277,.042,.027,.029),(1.022,s*.276,.03,.032,.035),(1.106,s*.272,.014,.039,.043),(1.194,s*.265,.010,.043,.047),(end+.02,s*.262,.01,.042,.045)],skin,arm,28,1)
        else:
            if kind=='roger':
                loft('Jacket cuff binding',[(.984,s*.272,.015,.038,.042),(.988,s*.272,.015,.042,.046),(.996,s*.272,.015,.043,.047),(1.004,s*.271,.015,.042,.046),(1.008,s*.270,.015,.040,.044)],coat,arm,40,2)
            else:
                loft('Jacket cuff binding',[(.981,s*.272,.015,.041,.045),(.997,s*.272,.015,.046,.049),(1.013,s*.270,.015,.046,.049)],coat,arm,28,1)
            loft('Linen sleeve at wrist',[(.971,s*.273,.026,.028,.031),(.987,s*.273,.025,.032,.034)],shirt,arm,24,1)
        # Tapered wrist, broad knuckles and an oblique finger-root line. Each
        # digit has distinct phalange lengths and a relaxed inward curl.
        palm_rings=[(.891,s*.277,.051,.024,.016),(.908,s*.278,.043,.031,.020),(.931,s*.279,.036,.032,.024),(.955,s*.276,.032,.027,.024),(.983,s*.274,.028,.023,.024),(.999,s*.274,.025,.024,.026)]
        if kind=='roger':palm_rings=[(.909,s*.278,.036,.022,.014),(.920,s*.278,.031,.029,.017),(.937,s*.278,.027,.030,.021),(.959,s*.276,.027,.025,.021),(.983,s*.274,.028,.023,.024),(.999,s*.274,.025,.024,.026)]
        loft('Hand with metacarpal silhouette',palm_rings,skin,arm,24,1)
        for f in range(4):
            fx=s*(.255+f*.014);length=[.057,.065,.059,.044][f]
            rootz=.910-[.001,0,.003,.009][f];tip=rootz-length
            curl=[.012,.016,.021,.026][f];radius=[.0074,.0077,.0070,.0057][f]
            spread=s*(f-1.3)*.0016
            if kind=='roger':
                fx=s*(.251+f*.017);rootz=.927-[.005,0,.004,.014][f]
                length=[.061,.071,.067,.052][f];tip=rootz-length
                curl=[.007,.012,.020,.029][f];spread=s*(f-1.2)*.003
                radius=[.0076,.0080,.0075,.0063][f]
                loft('Finger '+str(f),[(tip,fx+spread,.053+curl,radius*.52,radius*.58),(tip+.004,fx+spread,.049+curl,radius*.80,radius*.84),(tip+length*.31,fx+spread*.7,.040+curl*.65,radius,radius),(tip+length*.56,fx+spread*.35,.027+curl*.35,radius*1.10,radius*1.12),(rootz-.010,fx,.029,radius,radius),(rootz+.005,fx,.031,radius*.96,radius)],skin,arm,14,1)
                ellipsoid('Dorsal finger knuckle '+str(f),(fx,.014,rootz-.011),(.0079,.0045,.010),skin,arm,16,8)
            else:
                loft('Finger '+str(f),[(tip,fx+spread,.061+curl,radius*.42,radius*.50),(tip+.004,fx+spread,.063+curl,radius*.72,radius*.77),(tip+length*.30,fx+spread*.65,.056+curl*.85,radius*.88,radius*.88),(tip+length*.52,fx+spread*.4,.046+curl*.50,radius*1.03,radius*1.05),(rootz-.010,fx,.040,radius,radius*1.04),(rootz+.004,fx,.036,radius*.96,radius)],skin,arm,12,1)
        thumbx=s*.248
        loft('Opposable thumb sculpt',[(.890,s*.246,.081,.0048,.0054),(.895,s*.242,.078,.0076,.0081),(.911,s*.235,.064,.0090,.0096),(.931,s*.240,.044,.0107,.010),( .949,s*.251,.032,.013,.014)],skin,arm,16,1)
        for o in list(arm.children):o.location-=arm.location
    if kind=='roger':
        # The satchel is on the posterior left hip, with front and back strap surfaces.
        leather=mat('Satchel chestnut leather',(.235,.126,.058),'leather',.67)
        leather.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.32
        # A soft gusseted bag, with bowed sides and compressed lower corners.
        # The curved flap is a continuous surface draped over the opening.
        bag=loft('Soft gusseted leather satchel',[(.865,.226,-.070,.052,.021),(.878,.225,-.070,.080,.039),(.901,.223,-.072,.104,.054),(.938,.222,-.072,.113,.061),(.981,.220,-.070,.112,.064),(1.032,.218,-.068,.103,.057),(1.073,.217,-.066,.094,.050),(1.096,.216,-.064,.080,.037),(1.105,.216,-.063,.068,.029)],leather,body,40,1,.017,.90)
        for vertex in bag.data.vertices:
            x,y,z=vertex.co;side=(x-.22)/.11
            vertex.co.y+=.006*sin(side*3.7+z*24)*exp(-((z-.971)/.10)**2)
            vertex.co.x+=.004*sin(z*43+side)*exp(-((abs(side)-.85)/.25)**2)-.011*exp(-((side-.90)/.23)**2-((z-.984)/.067)**2)
            vertex.co.y+=.010*exp(-((x-.291)/.023)**2-((z-.945)/.058)**2)
            vertex.co.z-=.011*side*exp(-((z-1.02)/.11)**4)
            rear=max(0,min(1,(-y-.07)/.035))
            vertex.co.y-=rear*.013*exp(-((z-.913)/.041)**2)*exp(-((x-.217)/.068)**2)
            vertex.co.y+=rear*(.010*exp(-((z-(.937+.025*side))/.018)**2)-.008*exp(-((z-(.913+.025*side))/.025)**2))
            vertex.co.x-=.008*side*exp(-((z-(1.004-.014*side))/.029)**2)
        def flap_point(u,v):
            curl=max(0,min(1,(v-.76)/.24));curl=curl*curl*(3-2*curl)
            return (.220+.102*u*(1-.08*sin(pi*v)-.075*v),
                    -.111-.028*sin(min(1,v/.28)*pi/2)-.003*sin(pi*v)+.010*u*u-.008*curl+.006*sin(u*4.1+v*2)*sin(pi*v),
                    1.119-.145*v+.022*u*u*v*v+.007*u*v-.005*sin(pi*(u+1)/2)*v*v)
        fv=[flap_point(i/8-1,j/12) for j in range(13) for i in range(17)]
        ff=[(j*17+i,j*17+i+1,(j+1)*17+i+1,(j+1)*17+i) for j in range(12) for i in range(16)]
        flap=mesh('Raised draped satchel flap',fv,ff,leather,body,1)
        sol=flap.modifiers.new('Supple leather flap thickness','SOLIDIFY');sol.thickness=.004
        bpy.context.view_layer.objects.active=flap;bpy.ops.object.modifier_apply(modifier=sol.name)
        ribbon('Satchel rear diagonal strap',[(-.164,-.056,1.473),(-.102,-.127,1.382),(0,-.128,1.231),(.110,-.122,1.127),(.146,-.095,1.083)],.036,leather,body)
        ribbon('Satchel front diagonal strap',[(-.164,.047,1.479),(-.125,.116,1.402),(-.041,.14,1.275),(.065,.124,1.136),(.20,.096,1.016),(.239,.0,.97)],.036,leather,body)
        ribbon('Shoulder bridge strap',[(-.164,-.07,1.468),(-.167,-.012,1.503),(-.164,.052,1.473)],.036,leather,body)
        for k,x in enumerate([.166,.28]):
            buckle_z=.979-k*.008;buckle_y=-.160
            strap=ribbon('Satchel hanging buckled strap',[(x,-.165,1.014),(x-.002,-.165,buckle_z+.009),(x,-.166,buckle_z-.013),(x+.004,-.160,.930-k*.008),(x+.008,-.171,.903-k*.011)],.018,boot,body)
            sol=strap.modifiers.new('Real strap leather thickness','SOLIDIFY');sol.thickness=.003
            bpy.context.view_layer.objects.active=strap;bpy.ops.object.modifier_apply(modifier=sol.name)
            buckle=[(x-.010,buckle_y-.006,buckle_z-.011),(x+.010,buckle_y-.006,buckle_z-.011),(x+.012,buckle_y-.006,buckle_z+.009),(x-.010,buckle_y-.006,buckle_z+.011),(x-.010,buckle_y-.006,buckle_z-.011)]
            curve('Satchel brass buckle frame',buckle,.0023,brass,body,1)
            curve('Satchel buckle tongue',[(x,buckle_y-.009,buckle_z+.010),(x,buckle_y-.010,buckle_z-.006)],.0015,brass,body,1)
        seam=[flap_point(u,v) for u,v in [(-.94,.18),(-.94,.48),(-.94,.76),(-.86,.96),(-.45,.98),(0,.98),(.45,.98),(.86,.96),(.94,.76),(.94,.48),(.94,.18)]]
        wear=mat('Satchel abraded edge leather',(.320,.198,.105),'leather',.87)
        curve('Satchel rolled abraded flap edge',[(x,y-.002,z) for x,y,z in seam],.0038,wear,body,1)
        # The rolled lip has a real underside, opening a narrow visible shadow
        # against the bag's convex body rather than a painted flap outline.
        from mathutils.bvhtree import BVHTree
        bag_contact=BVHTree.FromPolygons([v.co for v in bag.data.vertices],[tuple(p.vertices) for p in bag.data.polygons])
        underside=[]
        for u in np.linspace(-.985,.985,41):
            x,y,z=flap_point(float(u),.988)
            corner=exp(-((abs(u)-.88)/.13)**2)
            lower_z=z-.013-corner*.003
            hit,normal,index,distance=bag_contact.ray_cast(Vector((x,-.4,lower_z)),Vector((0,1,0)),.6)
            contact_y=hit.y-.001 if hit is not None else y+.005
            underside.extend([(x,y+.001,z-.0015),(x,contact_y,lower_z)])
        mesh('Satchel curled flap underside',underside,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(40)],boot,body,1)

        curve('Satchel inset hand stitched seam',[(x*.995+.001,y-.003,z+.005) for x,y,z in seam],.0009,stitch,body,1)
        for side in [-1,1]:
            curve('Satchel worked gusset seam',[(.22+side*.095,-.085,1.083),(.22+side*.107,-.093,1.018),(.22+side*.108,-.096,.948),(.22+side*.095,-.091,.890)],.002,leather,body,1)
    if kind=='roger':
        box('Folded field camera leather body',(.267,.061,1.023),(.133,.063,.107),boot,body,.009)
        box('Camera folding front plate',(.267,.099,1.023),(.120,.012,.094),leather,body,.005)
        lens=ellipsoid('Camera brass lens mount',(.267,.109,1.023),(.024,.007,.024),brass,body,24,10)
        glass=mat('Camera dark optical glass',(.022,.04,.041),'solid',.16)
        ellipsoid('Field camera glass',(.267,.116,1.023),(.018,.004,.018),glass,body,24,10)
        ribbon('Camera carrying strap',[(.211,.049,1.051),(.215,.051,1.093),(.306,.045,1.089),(.322,.043,1.052)],.012,boot,body)
    if kind=='roger':replace_roger_anatomy(root,body,skin,face_mat,mesh,face_uv)
    else:replace_npc_anatomy(root,body,skin,face_mat,mesh,face_uv,kind)
    # Short cervical column, narrower shoulder/arm spread and a mild contrapposto.
    # Transform authored mesh coordinates, preserving correct local joint pivots.
    bpy.context.view_layer.update()
    original={o:[root.matrix_world.inverted()@o.matrix_world@v.co for v in o.data.vertices] for o in root.children_recursive if o.type=='MESH'}
    for o in root.children:
        if 'Arm' in o.name:o.location.x*=.86
    bpy.context.view_layer.update()
    def coat_fold(x,z):
        # Sculpt broad stress folds first, then narrower creases. The left
        # shoulder bears the satchel, so the two halves deliberately differ.
        def ridge(distance,width):
            return exp(-(distance/width)**2)-.36*exp(-(distance/(width*2.3))**2)
        gathering=exp(-((z-1.25)/.185)**4)
        shoulder=(.026*ridge(x-(-.137+.18*(1.40-z)),.022)+.021*ridge(x-(.142-.09*(1.40-z)),.026))*gathering
        scapula=.006*exp(-((x+.087)/.049)**2-((z-1.346)/.075)**2)+.004*exp(-((x-.10)/.055)**2-((z-1.333)/.08)**2)
        shoulder+=.018*ridge(z-(1.382+x*.29),.019)*exp(-((x+.026)/.175)**4)
        waist=(.022*ridge(z-(1.157+x*.31),.020)*exp(-((x+.080)/.125)**4)+.021*ridge(z-(1.050-x*.27),.024)*exp(-((x-.060)/.125)**4)+.015*ridge(z-(.938+x*.17),.025)*exp(-((x+.035)/.15)**4))*exp(-(x/.175)**8)
        hem=.004*sin(x*72+.4)*exp(-((z-.88)/.05)**2)
        original_fold=shoulder+scapula+waist+hem
        # Diagonal drape gathered under the loaded shoulder and above the belt.
        diagonal=.018*ridge(x-(-.127+.27*(1.36-z)+.014*sin(z*14)),.030)*exp(-((z-1.258)/.12)**4)
        diagonal+=.015*ridge(x-(.116-.10*(1.35-z)-.019*sin(z*11)),.035)*exp(-((z-1.255)/.125)**4)
        # Separate shoulder tensions never meet across the centre back.
        diagonal+=.014*ridge(z-(1.342+.28*(x+.093)),.009)*exp(-((x+.093)/.046)**4)
        diagonal+=.011*ridge(z-(1.323-.35*(x-.122)),.008)*exp(-((x-.122)/.042)**4)
        diagonal+=.033*ridge(z-(1.153-.48*x+.018*sin(x*17)),.019)*exp(-((x+.025)/.152)**4)
        diagonal+=.021*ridge(z-(1.100+.38*x),.016)*exp(-((x-.05)/.125)**4)
        transition=max(0,min(1,(z-1.04)/.045));transition=transition*transition*(3-2*transition)
        # Short cloth creases follow local loading across the shoulder blades
        # and above the waist. They are part of the continuous garment mesh;
        # broad panels and the old low-contrast cotton remain untouched.
        secondary=0.
        for x0,z0,slope,length,width,depth,bend in [
            (-.118,1.400,.26,.047,.0085,.012,.18),
            (-.121,1.368,.44,.038,.007,.009,-.18),
            (.119,1.377,-.31,.044,.0085,.013,.18),
            (.123,1.352,-.14,.036,.007,.009,.16),
            (-.074,1.173,-.42,.075,.0075,.010,-.16),
            (.062,1.112,.33,.090,.007,.009,.15),
            (.092,1.089,.23,.063,.006,.007,-.12),
        ]:
            along=(x-x0)/length
            line=z0+slope*(x-x0)+bend*(x-x0)**2/length
            secondary+=depth*ridge(z-line,width)*exp(-(along**4))
        return 1.12*(original_fold*(1-transition)+(diagonal+scapula+hem)*transition)+secondary
    for o,coords in original.items():
        inv=o.matrix_world.inverted()@root.matrix_world
        armparent=o.parent and 'Arm' in o.parent.name
        for v,co in zip(o.data.vertices,coords):
            z=co.z
            if 'tailored torso' in o.name:
                co.y+=math.copysign(1,co.y)*(.004*sin(z*56+co.x*36)*exp(-((z-1.04)/.14)**2)+.0018*sin(z*86-co.x*51)*exp(-((abs(co.x)-.13)/.05)**2))
            if kind=='roger' and co.y<0 and ('tailored torso' in o.name or any(word in o.name.lower() for word in ['back jacket yoke','tailored back seam','rear centre seam','back belt','rear walking vent','rear diagonal strap'])):
                co.y-=coat_fold(co.x,z)*min(1,abs(co.y)/.075)
            if kind=='roger' and co.y<0 and z<1.04 and any(word in o.name.lower() for word in ['tailored torso','back seam','rear centre seam','rear walking vent']):
                rear=min(1,abs(co.y)/.08)
                drape=(.026*exp(-((co.x-(-.123+.29*(z-.9)))/.028)**2)+.021*exp(-((co.x-(.026-.20*(z-.9)))/.038)**2))*exp(-((z-.934)/.11)**4)
                co.y-=drape*rear
                co.z+=(.009*sin(co.x*22+.4)+.007*sin(co.x*43-1.1))*exp(-((z-.858)/.043)**2)*rear
            if kind=='roger' and z<1.13 and 'tailored torso' not in o.name and any(word in o.name.lower() for word in ['applied pocket','pocket flap','pocket button','back seam','rear centre seam','back belt','rear walking vent','rear diagonal strap','front diagonal strap']):
                ease=float(np.interp(z,[.845,.93,1.0,1.04,1.09,1.13],[.024,.023,.020,.015,.006,0]))
                co.y+=math.copysign(ease,co.y)
            if 'sleeve' in o.name.lower():
                cx=math.copysign(.251,co.x);theta=math.atan2(co.y-.009,co.x-cx)
                if kind=='roger':
                    axis=float(np.interp(z,[.991,1.074,1.156,1.214,1.29,1.365,1.435,1.47],[.272,.270,.263,.257,.248,.238,.222,.210]))
                    cy=float(np.interp(z,[.991,1.074,1.156,1.214,1.29,1.365,1.435,1.47],[.019,.014,.012,-.007,-.012,-.004,0,0]))
                    cx=math.copysign(axis,co.x);theta=math.atan2(co.y-cy,co.x-cx)
                dr=.0055*sin(z*95+theta*1.8+.7*sin(z*35-theta*3)+co.x*9)*exp(-((z-1.17)/.078)**2)+.003*sin(z*78-theta*2)*exp(-((z-1.405)/.055)**2)
                if kind=='roger':
                    # Sleeve folds form at the flexed elbow; the long forearm
                    # and shoulder panels remain quiet, with an asymmetric drape.
                    dr*=.35
                    def crease(distance,width):return exp(-(distance/width)**2)-.32*exp(-(distance/(width*2.4))**2)
                    rear=.24+.76*max(0,-sin(theta))
                    direction=.040*cos(theta+.35*math.copysign(1,co.x))
                    dr+=rear*(.012*crease(z-(1.205+direction),.018)+.008*crease(z-(1.159-direction*.65),.011)+.006*crease(z-(1.248+direction*.4),.012))
                    dr+=.007*crease(z-(1.391+.028*cos(theta)),.022)*max(0,-sin(theta))
                    dr+=.003*cos(theta*2+.7)*exp(-((z-1.32)/.17)**4)
                    # Bent elbow pinches: narrow, unequal crests on the rear
                    # and lateral cloth; leave the forearm tube untextured.
                    rear_local=max(0,-sin(theta))**1.15
                    bend=.029*cos(theta+.24*math.copysign(1,co.x))+.007*cos(theta*2)
                    dr+=rear_local*(.016*crease(z-(1.199+bend),.009)+.014*crease(z-(1.157-bend*.55),.008)+.009*crease(z-(1.246+bend*.4),.008))
                    dr+=.010*crease(z-(1.407+.025*cos(theta)),.0085)*max(0,-sin(theta))**1.7
                    # A felled sleeve seam is pressed into the actual cloth,
                    # avoiding the tiny overlay tubes that caused black dashes.
                    seam_theta=-pi/2+math.copysign(.45,co.x)+.07*sin((z-1.10)*6)
                    seam_angle=(theta-seam_theta+pi)%(2*pi)-pi
                    seam_span=max(0,min(1,(z-1.008)/.025))*max(0,min(1,(1.423-z)/.035))
                    dr+=seam_span*(.0027*exp(-(seam_angle/.085)**2)-.0015*exp(-((seam_angle+.105)/.06)**2))
                co.x+=cos(theta)*dr;co.y+=sin(theta)*dr
            if kind=='roger' and 'Jacket cuff binding' in o.name:
                cx=math.copysign(.272,co.x);theta=math.atan2(co.y-.015,co.x-cx)
                dr=-.0019*exp(-((z-.993)/.0028)**2)+.0014*exp(-((z-1.001)/.003)**2)
                co.x+=cos(theta)*dr;co.y+=sin(theta)*dr
            if 'trouser leg' in o.name:
                cx=math.copysign(.109,co.x);theta=math.atan2(co.y,co.x-cx)
                dr=.0035*sin(z*68+theta*3.2+1.6*sin(theta*2+z*21)+co.x*11)*exp(-((z-.55)/.095)**2)+.0035*sin(z*90-theta*2.5)*exp(-((z-.36)/.045)**2)
                if kind=='roger':
                    def crease(distance,width):return exp(-(distance/width)**2)-.40*exp(-(distance/(width*2.2))**2)
                    side=math.copysign(1,co.x)
                    taper=max(0,min(1,(z-.70)/.14));taper=taper*taper*(3-2*taper)
                    co.x-=cos(theta)*.018*taper;co.y-=sin(theta)*.011*taper
                    rear=.30+.70*max(0,-sin(theta))
                    dr+=rear*(.017*crease(z-(.844+.045*cos(theta+side*.5)),.023)+.013*crease(z-(.749-.036*cos(theta*1.5)),.021))
                    dr+=.023*crease(z-(.568+.042*cos(theta+side*.7)+.013*side),.026)*(.22+.78*max(0,-sin(theta)))
                    dr+=.018*crease(z-(.480-.035*cos(theta+.6*side)),.029)*(.35+.65*exp(-((sin(theta)-.2)/.7)**2))
                    dr+=.012*crease(z-(.364+.019*sin(theta*2)),.019)
                    dr+=.0045*cos(theta*3+sin(z*9))*exp(-((z-.72)/.24)**4)
                co.x+=cos(theta)*dr;co.y+=sin(theta)*dr
            if 'boot shaft' in o.name:
                co.y+=.004*sin(z*164+co.x*69)*exp(-((z-.17)/.095)**2)
                if kind=='roger':
                    theta=math.atan2(co.y+.004,co.x-math.copysign(.112,co.x))
                    dr=.0048*sin(z*117+theta*.75+.7*sin(theta*3))*exp(-((z-.20)/.068)**2)
                    co.x+=cos(theta)*dr;co.y+=sin(theta)*dr
            if any(word in o.name.lower() for word in ['lapel','shirt front','collar tip','scarf end']):
                co.y-=.010 if co.y>.115 else .002
                co.y+=.0015*sin(co.x*43+z*34)
            if kind=='roger' and 'metacarpal' in o.name:
                dorsal=max(0,min(1,(.043-co.y)/.020))
                bumps=sum(exp(-((abs(co.x)-(.255+f*.014))/.008)**2-((z-(.911-.003*f))/.011)**2) for f in range(4))
                co.y-=.0045*bumps*dorsal
            if z>1.585:co.z-=.065
            elif z>1.49:co.z=1.49+(z-1.49)*(.03/.095)
            if armparent:
                co.x*=.86
                # Resting elbows flex slightly forward, forearms taper naturally.
                co.y+=.010*exp(-((z-1.20)/.10)**2)
            v.co=inv@co
    bpy.context.view_layer.update()
    if kind=='roger':
        from mathutils.bvhtree import BVHTree
        torso=next(ob for ob in root.children_recursive if 'tailored torso' in ob.name)
        matrix=root.matrix_world.inverted()@torso.matrix_world
        surface=BVHTree.FromPolygons([matrix@v.co for v in torso.data.vertices],[tuple(p.vertices) for p in torso.data.polygons])
        strap=next(ob for ob in root.children_recursive if ob.name=='Satchel rear diagonal strap')
        matrix=root.matrix_world.inverted()@strap.matrix_world;inv=matrix.inverted()
        for vertex in strap.data.vertices:
            co=matrix@vertex.co
            hit,normal,index,distance=surface.ray_cast(Vector((co.x,-.45,co.z)),Vector((0,1,0)),.8)
            if hit is not None:co.y=hit.y-.007;vertex.co=inv@co
    authored_points=[root.matrix_world.inverted()@o.matrix_world@v.co for o in root.children_recursive if o.type=='MESH' for v in o.data.vertices]
    minz=min(p.z for p in authored_points);maxz=max(p.z for p in authored_points)
    exact_scale=height/(maxz-minz)
    # Keep Roger's established leg/foot bind scale when sculpting the hair crown;
    # the deliberate torso extension is applied later to the rest mesh and rig.
    if key=='Roger':exact_scale=1.0327357053756714*(height/1.83)
    root.scale=(exact_scale,)*3;root.location.z=-minz*exact_scale
    if key=='Roger':
        # Preserve the accepted crown height while varying the lower hair locks.
        hairs=[ob for ob in root.children_recursive if ob.type=='MESH' and 'hair' in ob.name.lower()]
        hair_top=max((root.matrix_world.inverted()@ob.matrix_world@v.co).z for ob in hairs for v in ob.data.vertices)
        target=(1.924741115188226-root.location.z)/root.scale.z-.09
        for ob in hairs:
            matrix=root.matrix_world.inverted()@ob.matrix_world;inv=matrix.inverted()
            for vertex in ob.data.vertices:
                co=matrix@vertex.co;t=max(0,min(1,(co.z-1.69)/(hair_top-1.69)));co.z+=(target-hair_top)*t*t*(3-2*t);vertex.co=inv@co
    root['asset']='Blender-authored Roger with credited Blender Studio anatomy and ambientCG PBR; maps packed' if kind=='roger' else 'Original Blender-authored human; all textures packed'
    root['forward']='Blender +Y => glTF -Z'
    root['pivot_animation']='Native weighted biped: Idle / Walk clips, no horizontal root motion'
    CHARACTERS.append((key,root))
    return root

RIGS={}
def upper_body_rest_point(co,key):
    point=Vector(co)
    if key=='Roger':
        # Add stature through the thorax only. Hip, thigh and foot coordinates
        # are unchanged; the face is translated rigidly, never stretched.
        point.z+=.09*max(0,min(1,(point.z-1.04)/.45))
    return point

def rig_character(key,root):
    """Bind the authored surfaces to a small biped; bake foot IK into native clips.

    Bone rest positions are in the existing character-local metre coordinates.
    The authored upper-body stature adjustment is shared by mesh and bind pose.
    """
    bpy.context.view_layer.update()
    groups={o.name.split('.')[0]:o for o in root.children if o.type=='EMPTY'}
    data=bpy.data.armatures.new(key+'BipedSkeleton')
    rig=bpy.data.objects.new(key+'Rig',data);bpy.context.collection.objects.link(rig);rig.parent=root
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=data.edit_bones.new(name);b.head=upper_body_rest_point(head,key);b.tail=upper_body_rest_point(tail,key)
        b.align_roll(Vector((0,1,0)))
        if parent:b.parent=data.edit_bones[parent]
        return b
    bone('Hips',(0,0,.957),(0,0,1.09))
    bone('Spine',(0,0,1.09),(0,0,1.27),'Hips')
    bone('Chest',(0,0,1.27),(0,0,1.452),'Spine')
    bone('Neck',(0,0,1.452),(0,0,1.527),'Chest')
    bone('Head',(0,0,1.527),(0,-.01,1.754),'Neck')
    for s,side in [(-1,'Left'),(1,'Right')]:
        shoulder=groups[side+'Arm'].location.copy()
        bone(side+'Arm',shoulder,(s*.225,.010,1.19),'Chest')
        bone(side+'ForeArm',(s*.225,.010,1.19),(s*.237,.029,.978),side+'Arm')
        bone(side+'Hand',(s*.237,.029,.978),(s*.239,.068,.861),side+'ForeArm')
        hip=groups[side+'Leg'].location.copy()
        bone(side+'Leg',hip,(hip.x,0,.55),'Hips')
        bone(side+'Shin',(hip.x,0,.55),(hip.x,0,.11),side+'Leg')
        bone(side+'Foot',(hip.x,0,.11),(hip.x,.16,.11),side+'Shin')
    bpy.ops.object.mode_set(mode='OBJECT')
    def chain_weights(z,knots):
        if z<=knots[0][0]:return {knots[0][1]:1.}
        if z>=knots[-1][0]:return {knots[-1][1]:1.}
        for (za,ba),(zb,bb) in zip(knots,knots[1:]):
            if za<=z<=zb:
                t=(z-za)/(zb-za);t=t*t*(3-2*t)
                return {ba:1-t,bb:t}
    inv=root.matrix_world.inverted()
    for role,group in groups.items():
        group.name='Part_'+role
        for ob in group.children:
            if ob.type!='MESH':continue
            names={b.name:ob.vertex_groups.new(name=b.name) for b in data.bones}
            matrix=inv@ob.matrix_world;local=matrix.inverted();lower=ob.name.lower()
            for vertex in ob.data.vertices:
                co=matrix@vertex.co;z=co.z
                if role.endswith('Arm'):
                    side=role[:-3]
                    weights=chain_weights(z,[(.94,side+'Hand'),(1.025,side+'ForeArm'),(1.14,side+'ForeArm'),(1.25,side+'Arm')])
                elif role.endswith('Leg'):
                    side=role[:-3]
                    weights=chain_weights(z,[(.09,side+'Foot'),(.22,side+'Shin'),(.48,side+'Shin'),(.625,side+'Leg'),(.89,side+'Leg'),(1.005,'Hips')])
                elif ob.name.startswith('Studio anatomical'):weights=chain_weights(z,[(1.46,'Neck'),(1.53,'Head')])
                elif any(word in lower for word in ['face','cranium','hair','ear helix','sculpted ear']):weights={'Head':1.}
                elif ('satchel' in lower and 'diagonal strap' not in lower) or 'camera' in lower:weights={'Hips':1.}
                else:weights=chain_weights(z,[(1.04,'Hips'),(1.22,'Spine'),(1.405,'Chest'),(1.486,'Neck'),(1.53,'Head')])
                if key=='Roger' and role=='Body' and z<1.015 and any(word in lower for word in ['tailored torso','applied pocket','pocket flap','pocket button','back seam','walking vent','rear centre seam']):
                    # The skirt of the travel coat follows the advancing thigh
                    # softly, preserving the central vent and avoiding a rigid
                    # hem slicing through the leg at the long-stride contacts.
                    follow=min(.85,max(0,(1.035-z)/.16))*min(1,abs(co.x)/.055)
                    weights={name:value*(1-follow) for name,value in weights.items()}
                    leg=('Left' if co.x<0 else 'Right')+'Leg';weights[leg]=weights.get(leg,0)+follow
                for name,weight in weights.items():
                    if weight>1e-5:names[name].add([vertex.index],weight,'REPLACE')
                if key=='Roger':vertex.co=local@upper_body_rest_point(co,key)
            mod=ob.modifiers.new('Weighted anatomical biped','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    for pb in rig.pose.bones:pb.rotation_mode='XYZ'
    bpy.context.scene.render.fps=30
    rig.animation_data_create()
    def reset_pose():
        for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
    def legs_pose(phase,walk,pelvis):
        # Two-bone sagittal IK, solved at the exact authored hip/knee/ankle.
        # A planted foot traverses backwards during stance in an in-place clip.
        for offset,side in [(0,'Left'),(.5,'Right')]:
            u=(phase+offset)%1
            step=.30/root.scale.x;clearance=.0015/root.scale.x
            if walk:
                if u<.5:y=step-4*step*u;lift=clearance
                else:
                    v=(u-.5)*2;y=-step+2*step*(v*v*(3-2*v));lift=clearance+(.095/root.scale.x)*sin(pi*v)**1.3
            else:y=.004 if side=='Left' else -.004;lift=clearance
            l1=.407;l2=.44;down=.957+pelvis-(.11+lift)
            distance=min(l1+l2-.00001,math.sqrt(y*y+down*down))
            alpha=math.acos(max(-1,min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance))))
            hip=math.atan2(y,down)+alpha
            knee=-math.acos(max(-1,min(1,(distance*distance-l1*l1-l2*l2)/(2*l1*l2))))
            rig.pose.bones[side+'Leg'].rotation_euler.x=hip
            rig.pose.bones[side+'Shin'].rotation_euler.x=knee
            rig.pose.bones[side+'Foot'].rotation_euler.x=-(hip+knee)
    for clip,length in [('Idle',120)]+([('Walk',30)] if key=='Roger' else []):
        reset_pose();rig.animation_data.action=None
        for frame in range(length+1):
            phase=frame/length;a=2*pi*phase;b=sin(a)
            reset_pose()
            walk=clip=='Walk';pelvis=(-.060+.044*sin(a)**2) if walk else -.0015
            hips=rig.pose.bones['Hips'];hips.location=hips.bone.matrix_local.to_3x3().inverted()@Vector((0,0,pelvis))
            legs_pose(phase,walk,pelvis)
            # Pelvis stays stable over the stance leg; thorax and arms counter
            # rotate with the gait, breathing and gaze remain understated.
            rig.pose.bones['Spine'].rotation_euler=(.015 if walk else .010+.004*b,0,.025*cos(a) if walk else .007*b)
            rig.pose.bones['Chest'].rotation_euler=(.006*b,0,-.045*cos(a) if walk else -.009*b)
            rig.pose.bones['Chest'].scale=(1+.0015*b,1+.0015*b,1+.004*b)
            rig.pose.bones['Neck'].rotation_euler.x=-.010
            rig.pose.bones['Head'].rotation_euler=(.008*sin(a+.5),.017*sin(a),-.012*sin(a))
            for sign,side in [(1,'Left'),(-1,'Right')]:
                rig.pose.bones[side+'Arm'].rotation_euler=(sign*-.25*cos(a)-.04 if walk else -.045+.012*sin(a+sign*.5),sign*-.018,0)
                rig.pose.bones[side+'ForeArm'].rotation_euler.x=.17+(.055*max(0,sign*cos(a)) if walk else .010*sin(a+sign))
                rig.pose.bones[side+'Hand'].rotation_euler.x=-.035
            for pb in rig.pose.bones:
                pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
                if pb.name=='Hips':pb.keyframe_insert('location',frame=frame,group=pb.name)
                if pb.name=='Chest':pb.keyframe_insert('scale',frame=frame,group=pb.name)
        action=rig.animation_data.action;action.name=key+'_'+clip
        slot=rig.animation_data.action_slot
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for point in fc.keyframe_points:point.interpolation='LINEAR'
        track=rig.animation_data.nla_tracks.new();track.name=clip
        strip=track.strips.new(clip,0,action);strip.action_slot=slot;strip.name=clip
        track.mute=True
        rig.animation_data.action=None
    reset_pose();data.pose_position='REST';rig.show_in_front=True
    rig['clips']='Idle: 4.0 seconds; Walk: 1.0 seconds / 1.20 metres per cycle' if key=='Roger' else 'Idle: 4.0 seconds'
    rig['root_motion']='In-place: no horizontal root movement'
    RIGS[key]=rig
    return rig

def apply_roger_surface_atlas(root):
    """Use the original matched albedo/normal capture at a physical panel scale."""
    path=os.path.join(ROOT,'public/celta/hero-fabric-leather-v2.png')
    names=['Roger travel cotton albedo','Roger travel cotton normal','Roger worn satchel albedo','Roger worn satchel normal']
    images={}
    if os.path.exists(path):
        capture=bpy.data.images.load(path,check_existing=False);capture.name='Original hero fabric and leather atlas'
        capture.colorspace_settings.name='Non-Color';capture.pack()
        w,h=capture.size;pixels=np.asarray(capture.pixels[:],dtype=np.float32).reshape(h,w,4);tw=w//2;th=h//2
        for name,(tx,ty) in zip(names,[(0,1),(1,1),(0,0),(1,0)]):
            tile=pixels[ty*th:(ty+1)*th,tx*tw:(tx+1)*tw].copy()
            image=bpy.data.images.new(name,width=tw,height=th)
            image.colorspace_settings.name='Non-Color' if name.endswith('normal') else 'sRGB'
            image.pixels.foreach_set(tile.ravel());image.file_format='PNG';image.pack();image.use_fake_user=True;images[name]=image
    else:
        with bpy.data.libraries.load(SOURCE_BLEND,link=False) as (src,dst):dst.images=names
        images=dict(zip(names,dst.images))
        assert all(images.values()),'Missing original hero surface atlas or packed material maps'
    cotton=MATS['Khaki drill cotton'];leather=MATS['Satchel chestnut leather']
    for material,kind in [(cotton,'cotton'),(leather,'leather')]:
        bs=material.node_tree.nodes.get('Principled BSDF')
        base_name='Roger travel cotton' if kind=='cotton' else 'Roger worn satchel'
        for socket in ['Base Color','Normal']:
            for link in list(bs.inputs[socket].links):material.node_tree.links.remove(link)
        albedo=material.node_tree.nodes.new('ShaderNodeTexImage');albedo.image=images[base_name+' albedo'];albedo.label='Original matched surface albedo'
        normal=material.node_tree.nodes.new('ShaderNodeTexImage');normal.image=images[base_name+' normal'];normal.label='Original matched tangent normal'
        normal_map=material.node_tree.nodes.new('ShaderNodeNormalMap');normal_map.inputs['Strength'].default_value=.55 if kind=='cotton' else .60
        material.node_tree.links.new(albedo.outputs['Color'],bs.inputs['Base Color'])
        material.node_tree.links.new(normal.outputs['Color'],normal_map.inputs['Color']);material.node_tree.links.new(normal_map.outputs['Normal'],bs.inputs['Normal'])
        bs.inputs['Base Color'].default_value=(1,1,1,1)
    for ob in root.children_recursive:
        if ob.type!='MESH':continue
        me=ob.data;uv=me.uv_layers.active
        if not any(m in (cotton,leather) for m in me.materials):continue
        world=ob.matrix_world
        for poly in me.polygons:
            material=me.materials[poly.material_index]
            if material not in (cotton,leather):continue
            tile_scale=.60 if material==cotton else .35
            normal=world.to_3x3()@poly.normal
            for index in poly.loop_indices:
                point=world@me.vertices[me.loops[index].vertex_index].co
                if material==cotton:
                    u=.5+point.x/tile_scale
                    if 'sleeve' in ob.name.lower():u=uv.data[index].uv.x*.36/tile_scale+.12
                    v=(point.z-.91)/tile_scale
                else:
                    u=.5+(point.x-.225)/tile_scale
                    if 'gusseted' in ob.name.lower() and abs(normal.x)>abs(normal.y):u=.5+(point.y+.070)/tile_scale
                    v=.10+(point.z-.87)/tile_scale
                uv.data[index].uv=(u,v)
    root['surface_maps']='Original matched cotton/leather albedo and normal atlas; physical tiles 0.60 m / 0.35 m'

def pose_roger_hands(root):
    """Expose relaxed thumb/fingertip breaks while retaining every skin weight."""
    from mathutils import Matrix
    for ob in root.children_recursive:
        if ob.type!='MESH' or not any(word in ob.name.lower() for word in ['metacarpal','finger','opposable thumb']):continue
        side=-1 if 'Left' in ob.parent.name else 1
        pivot=Vector((side*.237,.029,.978))
        matrix=root.matrix_world.inverted()@ob.matrix_world;inv=matrix.inverted()
        for vertex in ob.data.vertices:
            co=matrix@vertex.co;t=max(0,min(1,(.982-co.z)/.068));t=t*t*(3-2*t)
            # Turn the continuous donor palm slightly toward the rear camera.
            # The existing thumb web and unequal fingertip lengths then read
            # in silhouette; wrist position, anatomy and skin weights stay put.
            palm_turn=(-.72 if side<0 else .90) if ob.name.startswith('Studio ') else .52
            turn=Matrix.Rotation(-side*palm_turn*t,3,'Z')@Matrix.Rotation(-.30*t,3,'X')@Matrix.Rotation(-side*.13*t,3,'Y')
            digit_t=max(0,min(1,(.934-co.z)/.072));digit_t=digit_t*digit_t*(3-2*digit_t)
            thumb_t=max(0,min(1,(.938-co.z)/.048));thumb_t=thumb_t*thumb_t*(3-2*thumb_t)
            co=pivot+turn@(co-pivot)
            if ob.name.startswith('Studio ') and side<0:
                # A little resting clearance from the coat reveals the donor
                # thumb web. The movement fades out at the unchanged wrist.
                co.x-=.010*t;co.y-=.010*t
            if 'thumb' in ob.name.lower():co.x+=side*.014*t;co.y-=.010*t
            if side<0:
                # Keep the wrist and palm pose. Relax the fingers inward and
                # abduct the thumb into the same outer hand envelope so its
                # notch survives the oblique rear camera without a wide splay.
                if ob.name.startswith('Finger '):
                    digit=int(ob.name.split()[1].split('.')[0])
                    co.x+=[0,.009,.017,.024][digit]*digit_t
                    co.z+=[.011,0,.006,.016][digit]*digit_t
                if 'thumb' in ob.name.lower():co.x-=.032*thumb_t;co.y-=.023*thumb_t
            vertex.co=inv@co


def bake_hero_cavity(root):
    """Bake short-range occlusion and sculpted concavity into linear vertex color.

    The bake is carried by the skin, so narrow folds retain their shading in
    the game's diffuse backlight. Original face colors are left exactly white.
    """
    from mathutils.bvhtree import BVHTree
    meshes=[ob for ob in root.children_recursive if ob.type=='MESH']
    vertices=[];faces=[]
    for ob in meshes:
        offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces)
    hemisphere=[]
    for i in range(20):
        z=(i+.5)/20;a=i*2.399963229728653;r=math.sqrt(1-z*z)
        hemisphere.append(Vector((r*cos(a),r*sin(a),z)))
    copied={};baked=[]
    for ob in meshes:
        me=ob.data;me.update();colors=me.color_attributes.new(name='SculptAO',type='FLOAT_COLOR',domain='POINT')
        me.color_attributes.active_color_index=0;me.color_attributes.render_color_index=0
        adjacency=[set() for v in me.vertices]
        for edge in me.edges:
            a,b=edge.vertices;adjacency[a].add(b);adjacency[b].add(a)
        unaffected=any(w in ob.name.lower() for w in ['face','cranium','sculpted ear','ear helix','neck'])
        world=ob.matrix_world;normal_matrix=world.to_3x3().inverted().transposed()
        for v in me.vertices:
            value=1.
            if not unaffected:
                n=(normal_matrix@v.normal).normalized();p=world@v.co
                tangent=n.cross(Vector((0,0,1)) if abs(n.z)<.9 else Vector((0,1,0))).normalized();bitangent=n.cross(tangent)
                occlusion=0.
                for sample in hemisphere:
                    direction=tangent*sample.x+bitangent*sample.y+n*sample.z
                    hit,normal,index,distance=tree.ray_cast(p+n*.0011,direction,.115)
                    if hit is not None:occlusion+=1-(distance/.115)*.65
                neighbors=adjacency[v.index]
                curvature=0.
                if neighbors:
                    delta=sum((me.vertices[i].co-v.co for i in neighbors),Vector())/len(neighbors)
                    span=sum((me.vertices[i].co-v.co).length for i in neighbors)/len(neighbors)
                    curvature=max(0,delta.dot(v.normal)/max(span,.0001))
                value=max(.36,min(1,1-.68*occlusion/len(hemisphere)-.65*min(.55,curvature)))
            if any(m.name=='ACG_Fabric030_Roger_khaki_cotton' for m in me.materials):value=.42+.58*value
            if 'hair' in ob.name.lower():value=.60+.40*value
            if 'diagonal strap' in ob.name.lower() or 'Shoulder bridge strap'==ob.name:
                # A continuous leather band must remain distinct from the
                # cloth valleys. Its five columns retain a narrow edge sheen.
                value=.72+.28*value
                if ob.name=='Satchel rear diagonal strap' and v.index%5 in (0,4):value=min(1,value+.055)
            colors.data[v.index].color=(value,value,value,1)
            if not unaffected:baked.append(value)
        for slot in ob.material_slots:
            material=slot.material
            if material.name.endswith('_photoreal_skin') or not material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].is_linked:continue
            if material not in copied:
                shaded=material.copy();shaded.name=material.name+' sculpt'
                bs=shaded.node_tree.nodes.get('Principled BSDF')
                attr=shaded.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='SculptAO';attr.label='Baked sculpt cavity and occlusion'
                mix=shaded.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
                if bs.inputs['Base Color'].is_linked:
                    link=bs.inputs['Base Color'].links[0];shaded.node_tree.links.new(link.from_socket,mix.inputs[1])
                else:mix.inputs[1].default_value=bs.inputs['Base Color'].default_value
                shaded.node_tree.links.new(attr.outputs['Color'],mix.inputs[2]);shaded.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
                copied[material]=shaded
            slot.material=copied[material]
    root['surface_bake']='SculptAO: 20 hemisphere rays / 0.115 m and local concavity; face white'
    print('SCULPT_AO',len(baked),'vertices',min(baked),sum(baked)/len(baked))

build_character('Roger','roger',1.83)
build_character('WitnessCongo','congo',1.75)
build_character('WitnessAmazonia','amazonia',1.64)
build_character('ContactIreland','ireland',1.79)
for key,root in CHARACTERS:rig_character(key,root)
pose_roger_hands(CHARACTERS[0][1])
apply_roger_surface_atlas(CHARACTERS[0][1])
apply_professional_surfaces(CHARACTERS[0][1],MATS)
bake_hero_cavity(CHARACTERS[0][1])
apply_npc_professional_surfaces(CHARACTERS,MATS)
# Save original unjoined .blend with all modeling parts and packed maps.
for key,root in CHARACTERS:root.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

# Export selected character with meshes merged within each animated pivot.
def compress_export_albedos(doc,binary_chunk):
    """JPEG only exported fabric/leather/hair color; source and normals stay PNG."""
    payload=binary_chunk[8:];replacements={};normal_sources=set();color_sources=set()
    for material in doc.get('materials',[]):
        if 'normalTexture' in material:
            normal_sources.add(doc['textures'][material['normalTexture']['index']]['source'])
        color=material.get('pbrMetallicRoughness',{}).get('baseColorTexture')
        if color and 'skin' not in material.get('name','').lower() and not material.get('name','').startswith('MH_'):
            color_sources.add(doc['textures'][color['index']]['source'])
    with tempfile.TemporaryDirectory(prefix='celta-albedo-') as temp:
        for index in sorted(color_sources-normal_sources):
            image=doc['images'][index]
            if image.get('mimeType')!='image/png':continue
            view=doc['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
            source=os.path.join(temp,str(index)+'.png');target=os.path.join(temp,str(index)+'.jpg')
            with open(source,'wb') as f:f.write(payload[start:start+view['byteLength']])
            temporary=bpy.data.images.load(source,check_existing=False)
            temporary.pixels[0]  # Load the PNG before changing its output path.
            temporary.filepath_raw=target;temporary.file_format='JPEG';temporary.save(quality=92)
            bpy.data.images.remove(temporary)
            with open(target,'rb') as f:replacements[image['bufferView']]=f.read()
            image['mimeType']='image/jpeg'
    packed=bytearray()
    for index,view in enumerate(doc['bufferViews']):
        start=view.get('byteOffset',0);data=replacements.get(index,payload[start:start+view['byteLength']])
        packed.extend(b'\0'*((-len(packed))%4));view['byteOffset']=len(packed);view['byteLength']=len(data);packed.extend(data)
    packed.extend(b'\0'*((-len(packed))%4));doc['buffers'][0]['byteLength']=len(packed)
    return struct.pack('<II',len(packed),0x004E4942)+packed

metadata={'sourceScript':'tools/celta/characters.py','sourceBlend':'tools/celta/blend/characters.blend','textureProvenance':'Roger: Julien Kaspar / Blender Studio anatomy CC BY 4.0; ambientCG Fabric030 and Leather030 CC0 1.0; MakeHuman Short02 hair CC0 1.0, original generated face/other maps. NPCs: Blender Studio anatomy CC BY 4.0; ambientCG Fabric030 CC0 1.0; original generated face and skin maps. All maps packed. See tools/celta/assets/characters/provenance.json.','coordinateSystem':{'units':'metres','up':'+Y','forward':'-Z','groundY':0},'characters':{}}
filenames={'Roger':'roger','WitnessCongo':'witness-congo','WitnessAmazonia':'witness-amazonia','ContactIreland':'contact-ireland'}
for key,root in CHARACTERS:
    bpy.ops.object.select_all(action='DESELECT')
    # Duplicate only descendants so pristine editable source is retained.
    descendants=[root]+list(root.children_recursive)
    dupmap={}
    for src in descendants:
        dup=src.copy()
        if src.type in ('MESH','ARMATURE'):dup.data=src.data.copy()
        # Blender joins UV layers by name. Primitive hands use UVMap while
        # authored cloth uses SurfaceUV; consolidate the active coordinates
        # before joining so sleeve/boot panels cannot collapse to (0, 0).
        if src.type=='MESH' and dup.data.uv_layers.active:
            active_uv=dup.data.uv_layers.active
            for layer in list(dup.data.uv_layers):
                if layer!=active_uv:dup.data.uv_layers.remove(layer)
            active_uv.name='SurfaceUV'
        bpy.context.collection.objects.link(dup);dupmap[src]=dup;dup.hide_render=False;dup.hide_set(False)
    for src,dup in dupmap.items():
        if src.parent in dupmap:dup.parent=dupmap[src.parent]
        if dup.type=='MESH':
            for mod in dup.modifiers:
                if mod.type=='ARMATURE':mod.object=dupmap[mod.object]
    eroot=dupmap[root]
    groups=[o for o in dupmap.values() if o.type=='EMPTY' and o!=eroot]
    original_tris=0
    for o in dupmap.values():
        if o.type=='MESH':o.data.calc_loop_triangles();original_tris+=len(o.data.loop_triangles)
    budget_ratio=min(.90,(78000 if key=='Roger' else 23200)/original_tris)*.985
    for group in groups:
        meshes=[o for o in list(group.children) if o.type=='MESH']
        if meshes:
            bpy.ops.object.select_all(action='DESELECT')
            for o in meshes:o.select_set(True)
            bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
            meshes[0].name=group.name.split('.')[0]+'Surface'
            dec=meshes[0].modifiers.new('Mobile surface optimization','DECIMATE');dec.ratio=budget_ratio
            bpy.ops.object.modifier_apply(modifier=dec.name)
            # glTF skins attach directly to their armature. Keep the exact rest
            # transform while removing the old rigid anatomical parent path.
            bpy.context.view_layer.update();world_matrix=meshes[0].matrix_world.copy()
            meshes[0].parent=dupmap[RIGS[key]];meshes[0].matrix_world=world_matrix
            # Remove duplicated empty suffix from export joints, retain exact public contract.
        group.name=group.name.split('.')[0]
    bpy.ops.object.select_all(action='DESELECT')
    expobs=[eroot]+list(eroot.children_recursive)
    for o in expobs:o.select_set(True)
    bpy.context.view_layer.update()
    verts=[o.matrix_world@v.co for o in expobs if o.type=='MESH' for v in o.data.vertices]
    lo=[min(v[i] for v in verts) for i in range(3)];hi=[max(v[i] for v in verts) for i in range(3)]
    triangles=0;prims=0
    for o in expobs:
        if o.type=='MESH':
            o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
            prims+=len(set(p.material_index for p in o.data.polygons))
    fp=os.path.join(OUT,filenames[key]+'.glb')
    export_rig=dupmap[RIGS[key]];export_rig.data.pose_position='POSE'
    for track in export_rig.animation_data.nla_tracks:track.mute=False
    bpy.ops.export_scene.gltf(filepath=fp,export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_cameras=False,export_lights=False,export_apply=True,export_image_format='AUTO',export_jpeg_quality=92,export_extras=True,export_anim_slide_to_zero=True,export_vertex_color='NAME' if key=='Roger' else 'MATERIAL',export_vertex_color_name='SculptAO',export_all_vertex_colors=False)
    # Stable glTF node names: Blender source names must be unique across four assets.
    raw=open(fp,'rb').read();jsonlen=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+jsonlen]);binary=raw[20+jsonlen:]
    binary=compress_export_albedos(doc,binary)
    if key=='Roger':binary=pack_professional_materials(doc,binary)
    else:binary=pack_npc_professional_materials(doc,binary)
    for material in doc.get('materials',[]):material['name']=material.get('name','Material').removesuffix(' sculpt')
    for node in doc.get('nodes',[]):
        node['name']=re.sub(r'\.\d+$','',node.get('name','Node'))
    for animation in doc.get('animations',[]):
        animation['name']='Walk' if 'Walk' in animation.get('name','') else 'Idle'
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    fixed=struct.pack('<III',0x46546C67,2,12+8+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+binary
    open(fp,'wb').write(fixed)
    # Blender +Y becomes glTF -Z. The root group applies scale to exact authored stature.
    joints={}
    for bone in export_rig.data.bones:
        q=export_rig.matrix_world@bone.head_local;joints[bone.name]=[round(q.x,4),round(q.z,4),round(-q.y,4)]
    clips=[{'name':'Idle','duration':4.0,'loop':True,'rootMotion':False}]
    if key=='Roger':clips.append({'name':'Walk','duration':1.0,'loop':True,'rootMotion':False,'distancePerCycle':1.20,'nominalSpeed':1.20})
    metadata['characters'][filenames[key]]={'file':filenames[key]+'.glb','height':round(hi[2]-lo[2],4),'bounds':{'min':[round(lo[0],4),round(lo[2],4),round(-hi[1],4)],'max':[round(hi[0],4),round(hi[2],4),round(-lo[1],4)]},'triangles':triangles,'drawPrimitives':prims,'bytes':os.path.getsize(fp),'pivots':joints,'animations':clips,'skin':{'bones':len(export_rig.data.bones),'maxInfluences':4},'materials':sorted({m.name.removesuffix(' sculpt') for o in expobs if o.type=='MESH' for m in o.data.materials if m})}
    for o in expobs:bpy.data.objects.remove(o,do_unlink=True)
with open(os.path.join(OUT,'characters.json'),'w') as f:json.dump(metadata,f,indent=2)
def render_preview():
    if not os.environ.get('CELTA_CHARACTER_SKIP_PREVIEW'):bpy.ops.render.render(write_still=True)

# The source includes polished studio presentation for inspection, but export is character-only.
for rig in RIGS.values():
    rig.data.pose_position='POSE'
    for track in rig.animation_data.nla_tracks:track.mute=track.name!='Idle'
bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=120;bpy.context.scene.frame_set(0)
for i,(key,root) in enumerate(CHARACTERS):root.hide_render=False;root.location.x=(i-1.5)*.76
floor=mat('Preview studio floor',(.085,.10,.11),'solid',.82)
box('Preview floor',(0,0,-.045),(200,200,.08),floor,None,.01)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.205,.24,1);world.node_tree.nodes['Background'].inputs[1].default_value=.42

def area(name,loc,energy,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-3,4,5),430,(1,.83,.67),4)
area('Cool sculptural fill',(3,2,3),260,(.65,.80,1),3)
area('Edge separation',(1,-3,4),530,(.89,.94,1),3)
data=bpy.data.cameras.new('Character review');camera=bpy.data.objects.new('Character review',data);bpy.context.collection.objects.link(camera)
camera.location=(2.4,6.8,2.8);target=Vector((0,0,.94));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=3.64
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(PREVIEW,'lineup.png')
render_preview()
# Back view establishes the visible play silhouette, coat seams and satchel quality.
camera.location=(2.4,-6.8,2.8);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(PREVIEW,'lineup-back.png');render_preview()
for i,(key,root) in enumerate(CHARACTERS):
    root.hide_render=(i!=0)
camera.location=(-1.52,2.7,1.83);target=Vector((-1.14,0,1.55));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=.70
scene.render.resolution_x=850;scene.render.resolution_y=1000;scene.render.filepath=os.path.join(PREVIEW,'roger-face.png');render_preview()
# Save a reviewable lineup of the editable source characters with studio lighting.
for i,(key,root) in enumerate(CHARACTERS):root.location.x=(i-1.5)*.76;root.hide_render=False
camera.location=(2.4,6.8,2.8);target=Vector((0,0,.94));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=3.64
scene.render.resolution_x=1500;scene.render.resolution_y=1000
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print('CHARACTER_METADATA '+json.dumps(metadata))
