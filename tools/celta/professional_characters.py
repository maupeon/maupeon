"""Professional-source adaptations for Roger; source files and licenses in assets/characters.
Julien Kaspar / Blender Studio, realistic_human_base.blend, CC BY 4.0.
Lennart Demes / ambientCG, Fabric030 and Leather030, CC0 1.0.
The original sources are retained byte for byte. Coordinates, segmentation,
retopology, garment fitting, original facial UVs, and rig adaptation are ours.
"""
import bpy,math,os,json,struct,tempfile
import numpy as np
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS=os.path.join(ROOT,'tools/celta/assets/characters')

def replace_roger_anatomy(root,body,skin,face_material,make_mesh,face_uv):
    source=os.path.join(ASSETS,'realistic_human_base.blend')
    with bpy.data.libraries.load(source,link=False) as (src,dst):dst.objects=['GEO-body','GEO-eye.R']
    donor,eyes=dst.objects
    for ob in (donor,eyes):bpy.context.collection.objects.link(ob)
    if donor.animation_data:donor.animation_data_clear()
    for mod in donor.modifiers:
        if mod.type=='MULTIRES':mod.levels=1;mod.render_levels=1
    donor.hide_set(False);donor.hide_viewport=False
    bpy.context.view_layer.update()
    evaluated=donor.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data=bpy.data.meshes.new_from_object(evaluated)
    source_vertices=[donor.matrix_world@v.co for v in data.vertices]
    def head_point(p):
        x,y,z=p
        zz=float(np.interp(z,[1.515,1.545,1.558,1.603,1.638,1.677,1.710,1.79835],[1.435,1.515,1.585,1.644,1.675,1.729,1.766,1.823]))
        xx=x*.88
        yy=-y*.84-.037
        # The longer lean nose and narrower lower face distinguish Casement's
        # original design, while preserving the professional lips/orbits/ears.
        frontal=max(0,min(1,(yy+.015)/.06))
        yy+=.007*math.exp(-(xx/.016)**2-((zz-1.685)/.026)**2)*frontal
        if zz<1.635:xx*=.95
        # Blend the cervical opening into the actual linen collar.
        t=max(0,min(1,(1.585-zz)/.11))
        xx*=1-.08*t;yy=yy*(1-.2*t)
        neck_t=max(0,min(1,(1.575-zz)/.075))
        r=math.sqrt((xx/.057)**2+(yy/.05)**2)
        if r>1:xx*=1-neck_t*(1-1/r);yy*=1-neck_t*(1-1/r)
        return (xx,yy,zz)
    def section(name,predicate,transform,parent,face=False):
        polys=[p for p in data.polygons if all(predicate(source_vertices[i]) for i in p.vertices)]
        indices=sorted({i for p in polys for i in p.vertices});lookup={i:n for n,i in enumerate(indices)}
        verts=[transform(source_vertices[i]) for i in indices]
        # Every donor-to-game mapping here reflects one axis. Reverse winding
        # to keep the external normals external, including for the cavity bake.
        ob=make_mesh(name,verts,[tuple(lookup[i] for i in reversed(p.vertices)) for p in polys],skin,parent,0,[face_uv(co,'roger') if face else (co[0]*4,co[2]*4) for co in verts])
        ob['source']='Julien Kaspar / Blender Studio: realistic_human_base.blend; CC BY 4.0'
        if face:
            ob.data.materials.append(face_material)
            for p in ob.data.polygons:
                c=p.center if p.center.length else sum((ob.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
                # Original generated face map stays on the frontal facial mask;
                # the ears, scalp and complete neck use matched skin.
                if c.y>.013 and 1.586<c.z<1.795 and abs(c.x)<.068:p.material_index=1
        return ob
    old=[o for o in root.children_recursive if o.type=='MESH' and any(k in o.name.lower() for k in ['adult face and cranium','anatomical neck','sculpted ear','outer ear helix','metacarpal','finger ','finger knuckle','opposable thumb'])]
    for ob in old:bpy.data.objects.remove(ob,do_unlink=True)
    head=section('Studio anatomical face cranium and neck',lambda p:p.z>1.519 and abs(p.x)<.105,head_point,body,True)
    # Replace the old sculpted groom with the official MakeHuman short02
    # strand cards and untouched alpha atlas. This is independent of the rig.
    for ob in list(root.children_recursive):
        if ob.type=='MESH' and 'hair' in ob.name.lower():bpy.data.objects.remove(ob,do_unlink=True)
    groom=add_makehuman_hair(root,body,make_mesh)
    from mathutils.bvhtree import BVHTree
    surface=BVHTree.FromPolygons([v.co for v in head.data.vertices],[tuple(p.vertices) for p in head.data.polygons])
    center=Vector((0,-.01,1.725))
    for vertex in groom.data.vertices:
        point=vertex.co
        if point.z<1.765:continue
        direction=(point-center).normalized()
        hit,normal,index,distance=surface.ray_cast(center+direction*.4,-direction,.65)
        if hit is not None and (point-center).length<(hit-center).length+.006:
            vertex.co=hit+direction*.006
    add_fitted_hair_locks(groom,body,make_mesh)

    face_material.name='BS_Roger_photoreal_skin'
    face_material['projectionFadeColor']=[.4357758254,.2022674907,.1278734554]
    face_material['projectionFade']='UV edges u .015-.11/.89-.985, v .03-.14/.88-.99; blend to projectionFadeColor in linear RGB'
    # The base's hands are already anatomically posed: one continuous surface
    # contains wrist, palm, nails, thumb web and individually articulated digits.
    for side,name in [(1,'Right'),(-1,'Left')]:
        parent=next(o for o in root.children if o.name==name+'Arm')
        def hand_point(p):
            x,y,z=p;center=.414+.10*(.975-z)
            return (side*(.275+(y+.067)*.55),.027+(abs(x)-center)*.82,.999+(z-.975)*.73)
        ob=section('Studio '+name+' hand metacarpal and digits',lambda p:p.x*side>.30 and p.z<.994,hand_point,parent)
        ob.location-=parent.location
    # Donor eyes are paired by a Mirror modifier. Keep modeled sclera and iris
    # directly inside the imported orbital rims rather than painting eyes on skin.
    bpy.context.view_layer.objects.active=eyes;eyes.hide_set(False)
    for mod in list(eyes.modifiers):
        if mod.type=='SUBSURF':mod.levels=1;mod.render_levels=1
    bpy.context.view_layer.update()
    eye_data=bpy.data.meshes.new_from_object(eyes.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    ev=[head_point(eyes.matrix_world@v.co) for v in eye_data.vertices]
    sclera=bpy.data.materials.new('Studio_Roger_sclera');sclera.use_nodes=True
    bs=sclera.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.38,.34,.28,1);bs.inputs['Roughness'].default_value=.26
    iris=bpy.data.materials.new('Studio_Roger_grey_iris');iris.use_nodes=True
    ib=iris.node_tree.nodes.get('Principled BSDF');ib.inputs['Base Color'].default_value=(.023,.031,.026,1);ib.inputs['Roughness'].default_value=.21
    pupil=bpy.data.materials.new('Studio_Roger_pupil');pupil.use_nodes=True;pupil.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.001,.001,.001,1)
    eye=make_mesh('Studio paired eyes face',ev,[tuple(reversed(p.vertices)) for p in eye_data.polygons],sclera,body)
    eye.data.materials.append(iris);eye.data.materials.append(pupil)
    for p in eye.data.polygons:
        c=sum((eye.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        r=((abs(c.x)-.0262)**2+(c.z-1.729)**2)**.5
        if c.y>.064 and r<.0055:p.material_index=2 if r<.0024 else 1
    bpy.data.meshes.remove(eye_data)
    bpy.data.meshes.remove(data)
    for ob in (donor,eyes):bpy.data.objects.remove(ob,do_unlink=True)
    root['anatomy_credit']='Anatomy adapted from Realistic Human Base by Julien Kaspar / Blender Studio, CC BY 4.0. Face proportions, original generated skin UV, hands, clothing, and native rig adapted for Roger.'
    print('PRO_ANATOMY',len(head.data.vertices),'head/neck vertices')


def add_makehuman_hair(root,body,make_mesh):
    asset=os.path.join(ASSETS,'MakeHumanShort02')
    positions=[];uv=[];vertices=[];coordinates=[];faces=[];lookup={}
    for line in open(os.path.join(asset,'short02.obj')):
        fields=line.split()
        if not fields:continue
        if fields[0]=='v':positions.append(tuple(map(float,fields[1:4])))
        elif fields[0]=='vt':uv.append(tuple(map(float,fields[1:3])))
        elif fields[0]=='f':
            face=[]
            for item in fields[1:]:
                numbers=item.split('/');key=(int(numbers[0])-1,int(numbers[1])-1)
                if key not in lookup:
                    x,y,z=positions[key[0]]
                    lookup[key]=len(vertices);vertices.append((x*.102,(z-.64)*.087,1.837+(y-9.4537)*.095));coordinates.append(uv[key[1]])
                face.append(lookup[key])
            # The Y/Z coordinate swap changes handedness.
            faces.append(tuple(reversed(face)))
    m=bpy.data.materials.new('MH_Short02_Roger_hair');m.use_nodes=True
    nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.90;bs.inputs['Specular IOR Level'].default_value=.025
    image=bpy.data.images.load(os.path.join(asset,'short02_diffuse.png'),check_existing=True);image.name='MH_short02_diffuse';image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;links.new(tex.outputs['Color'],bs.inputs['Base Color']);links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
    m.surface_render_method='DITHERED';m.use_backface_culling=False
    normal_path=os.path.join(asset,'short02_normal.png')
    if os.path.exists(normal_path):
        normal=bpy.data.images.load(normal_path,check_existing=True);normal.colorspace_settings.name='Non-Color';normal.name='MH_short02_normal';normal.pack()
        nt=nodes.new('ShaderNodeTexImage');nt.image=normal;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.08;links.new(nt.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    m['source']='MakeHuman system assets: short02, CC0 1.0; Data Collection AB, Joel Palmius, Jonas Hauquier'
    ob=make_mesh('MakeHuman short02 fitted strand hair',vertices,faces,m,body,0,coordinates)
    for poly in ob.data.polygons:
        for li in poly.loop_indices:ob.data.uv_layers.active.data[li].uv=coordinates[ob.data.loops[li].vertex_index]
    mod=ob.modifiers.new('Smooth authored strand cards','SUBSURF');mod.levels=1;mod.render_levels=1
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
    ob['source']=m['source'];ob['adaptation']='Coordinate conversion, cranial fit, native Head bone binding; source UV and alpha atlas retained'
    root['hair_credit']=m['source']
    return ob


def add_fitted_hair_locks(groom,body,make_mesh):
    """Five unequal shingled locks retain the professional strand-map UVs.

    A lock rises about 2 mm above the fitted source groom, with its root,
    pointed tip and both thin edges buried into it. This avoids exposed card
    edges while retaining a narrow real ridge through the professional strands.
    """
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import barycentric_transform
    groom.data.calc_loop_triangles()
    triangles=list(groom.data.loop_triangles)
    points=[v.co.copy() for v in groom.data.vertices]
    uv=groom.data.uv_layers.active
    surface=BVHTree.FromPolygons(points,[tuple(t.vertices) for t in triangles],all_triangles=True)
    center=Vector((0,-.009,1.736));material=groom.data.materials[0]
    layouts=[
        ((-.015,.025,.093),(-.066,-.064,.027),.012,.0028),
        ((.018,.028,.095),(.006,-.094,.026),.016,.0030),
        ((.032,.021,.091),(.052,-.079,.012),.013,.0027),
        ((-.026,-.017,.087),(-.062,-.071,-.014),.011,.0027),
        ((.048,.004,.076),(.076,-.045,.010),.009,.0024),
    ]
    for number,(start,end,width,lift) in enumerate(layouts):
        start,end=Vector(start),Vector(end);verts=[];coordinates=[]
        rows=18;columns=5
        for j in range(rows):
            t=j/(rows-1);direction=start.lerp(end,t).normalized()
            tangent=(end-start).normalized();across=direction.cross(tangent).normalized()
            envelope=(math.sin(math.pi*t)**.65)*(.96-.33*t)
            for i in range(columns):
                s=i/(columns-1)*2-1
                ray=(direction+across*s*width*envelope/.18).normalized()
                hit,normal,index,distance=surface.ray_cast(center+ray*.35,-ray,.55)
                if hit is None:hit=center+ray*.09;normal=ray;index=0
                tri=triangles[index]
                tex=[Vector((*uv.data[li].uv,0)) for li in tri.loops]
                co_uv=barycentric_transform(hit,*[points[k] for k in tri.vertices],*tex)
                # Both card boundaries taper below the original groom. An
                # exposed raised boundary reads as a paper tab in close-up.
                rise=-.00065+lift*math.sin(math.pi*t)**.8*max(0,math.cos(math.pi*s/2))**1.4
                verts.append(tuple(hit+normal*rise));coordinates.append(tuple(co_uv[:2]))
        faces=[((j+1)*columns+i,(j+1)*columns+i+1,j*columns+i+1,j*columns+i) for j in range(rows-1) for i in range(columns-1)]
        ob=make_mesh('MakeHuman fitted overlapping hair lock '+str(number),verts,faces,material,body,0,coordinates)
        for poly in ob.data.polygons:
            for li in poly.loop_indices:ob.data.uv_layers.active.data[li].uv=coordinates[ob.data.loops[li].vertex_index]
        ob['source']=material['source'];ob['adaptation']='Original shingled lock geometry fitted to Short02; source strand atlas UV sampled on the fitted surface, about 2 mm relief'


def apply_professional_surfaces(root,materials):
    """Use untouched professional color/normal/roughness maps at physical scale."""
    for old,asset,new,tile,tint,normal_strength in [
        ('Khaki drill cotton','Fabric030','ACG_Fabric030_Roger_khaki_cotton',.32,(.85,.612,.3485,1),.38),
        ('Satchel chestnut leather','Leather030','ACG_Leather030_Roger_satchel',.44,(1,.88,.76,1),.32),
    ]:
        m=materials[old];m.name=new;nodes=m.node_tree.nodes;links=m.node_tree.links
        bs=nodes.get('Principled BSDF')
        for socket in ['Base Color','Normal','Roughness']:
            for link in list(bs.inputs[socket].links):links.remove(link)
        textures={}
        for suffix in ['Color','NormalGL','Roughness']:
            image=bpy.data.images.load(os.path.join(ASSETS,asset,asset+'_1K-JPG_'+suffix+'.jpg'),check_existing=True)
            image.name='ACG_'+asset+'_'+suffix;image.colorspace_settings.name='sRGB' if suffix=='Color' else 'Non-Color';image.pack()
            node=nodes.new('ShaderNodeTexImage');node.image=image;textures[suffix]=node
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=tint
        links.new(textures['Color'].outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
        nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal_strength
        links.new(textures['NormalGL'].outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
        links.new(textures['Roughness'].outputs['Color'],bs.inputs['Roughness'])
        bs.inputs['Specular IOR Level'].default_value=.23 if asset=='Fabric030' else .38
        m['source']='Lennart Demes / ambientCG; '+asset+'; CC0 1.0'
        m['baseColorFactor']=list(tint)
        if asset=='Leather030':m['albedoExposure']=1.7
        # Previous UVs are the original .60 m cotton / .35 m leather atlas.
        # Retile from these stable surfaces without modifying any source pixels.
        ratio=(.60 if asset=='Fabric030' else .35)/tile
        for ob in root.children_recursive:
            if ob.type!='MESH' or m not in ob.data.materials[:]:continue
            uv=ob.data.uv_layers.active
            for p in ob.data.polygons:
                if ob.data.materials[p.material_index]!=m:continue
                for li in p.loop_indices:uv.data[li].uv*=ratio
    root['surface_maps']='ambientCG Fabric030 (.32 m) and Leather030 (.44 m): untouched 1K color, tangent normal, roughness, packed. Khaki/chestnut material tint. CC0 1.0.'


def pack_professional_materials(doc,binary_chunk):
    """glTF tint factors and web image encoding, with original pixels preserved.

    The official 1K JPEGs use almost-lossless encoding; quality 92 is sufficient
    at mobile texel density. This changes encoding only, never painting maps.
    """
    doc.setdefault('asset',{})['copyright']='Anatomy adapted from Realistic Human Base Mesh by Julien Kaspar / Blender Studio, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Fabric030 and Leather030 by Lennart Demes / ambientCG, CC0 1.0. Short02 hair by MakeHuman system assets (Data Collection AB, Joel Palmius, Jonas Hauquier), CC0 1.0. Original project clothing, face maps and rig adaptations.'
    doc.setdefault('extras',{})['thirdPartyAssets']=[{'title':'Realistic Human Base Mesh','author':'Julien Kaspar / Blender Studio','source':'https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','changes':'Head, neck, eyes and hands extracted, reshaped and bound to native game rig; original face UV projection and groom fitting.'},{'title':'Fabric030 and Leather030','author':'Lennart Demes / ambientCG','source':'https://ambientcg.com/','license':'CC0 1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','changes':'Physical UV scale, material tint, normal strength and web image encoding.'}]
    doc['extras']['thirdPartyAssets'].append({'title':'Short02 hair','author':'MakeHuman system assets: Data Collection AB, Joel Palmius, Jonas Hauquier','source':'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html','license':'CC0 1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','changes':'Coordinate conversion, cranial fit, native Head bone binding, five fitted overlapping locks; source UV and alpha atlas retained.'})
    payload=binary_chunk[8:];replacements={}
    for material in doc.get('materials',[]):
        if material.get('name','').startswith('MH_'):
            material['alphaMode']='MASK';material['alphaCutoff']=.42;material['doubleSided']=True
        if material.get('name','').startswith('ACG_'):
            material['pbrMetallicRoughness']['baseColorFactor']=material['extras']['baseColorFactor']
    with tempfile.TemporaryDirectory(prefix='celta-pro-web-') as temp:
        for image in doc.get('images',[]):
            if not image.get('name','').startswith(('Fabric030_','Leather030_','short02_normal','MH_short02_normal')):continue
            view=doc['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
            source=os.path.join(temp,'source'+('.jpg' if image['mimeType']=='image/jpeg' else '.png'));target=os.path.join(temp,'web.jpg')
            with open(source,'wb') as f:f.write(payload[start:start+view['byteLength']])
            temporary=bpy.data.images.load(source,check_existing=False);temporary.pixels[0]
            temporary.filepath_raw=target;temporary.file_format='JPEG';temporary.save(quality=92);bpy.data.images.remove(temporary)
            with open(target,'rb') as f:replacements[image['bufferView']]=f.read()
            image['mimeType']='image/jpeg'
    packed=bytearray()
    for index,view in enumerate(doc['bufferViews']):
        start=view.get('byteOffset',0);data=replacements.get(index,payload[start:start+view['byteLength']])
        packed.extend(b'\0'*((-len(packed))%4));view['byteOffset']=len(packed);view['byteLength']=len(data);packed.extend(data)
    packed.extend(b'\0'*((-len(packed))%4));doc['buffers'][0]['byteLength']=len(packed)
    return struct.pack('<II',len(packed),0x004E4942)+packed
