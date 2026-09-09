"""Credited Blender Studio anatomy and ambientCG fabric for the three witnesses.

Only geometric fitting, physical UV coordinates and PBR factors are adapted.
The licensed source meshes/maps and the project's distinct face atlases remain
unchanged. See assets/characters/NPC-ATTRIBUTION.md for required attribution.
"""
import bpy, math, os, json, struct, tempfile
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS=os.path.join(ROOT,'tools/celta/assets/characters')
SKIN_LINEAR={
    'congo':(.1504694378,.0562921921,.0307961191),
    'amazonia':(.3381238645,.1097525048,.0513929301),
    'ireland':(.4410623483,.1625043418,.1251194667),
}
CREDIT={'title':'Realistic Human Base Mesh','author':'Julien Kaspar / Blender Studio','source':'https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','changes':'Head, neck, eyes and continuous hands extracted, individually reshaped, fitted to original character identity and clothing, and bound to the native 17-bone Idle rig. Original project face maps retained.'}


def replace_npc_anatomy(root,body,skin,face_material,make_mesh,face_uv,kind):
    if kind not in SKIN_LINEAR:raise ValueError(kind)
    with bpy.data.libraries.load(os.path.join(ASSETS,'realistic_human_base.blend'),link=False) as (src,dst):dst.objects=['GEO-body','GEO-eye.R']
    donor,eyes=dst.objects
    for ob in (donor,eyes):
        bpy.context.collection.objects.link(ob);ob.hide_set(False);ob.hide_viewport=False
        if ob.animation_data:ob.animation_data_clear()
        for mod in ob.modifiers:
            if mod.type in ('MULTIRES','SUBSURF'):mod.levels=1;mod.render_levels=1
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    data=bpy.data.meshes.new_from_object(donor.evaluated_get(deps))
    source=[donor.matrix_world@v.co for v in data.vertices]
    width={'congo':.98,'amazonia':.85,'ireland':.95}[kind]
    def point(p):
        x,y,z=p
        zz=float(np.interp(z,[1.515,1.545,1.558,1.603,1.638,1.677,1.710,1.79835],[1.435,1.515,1.585,1.644,1.675,1.729,1.766,1.823]))
        xx=x*width;yy=-y*.84-.037
        frontal=max(0,min(1,(yy+.018)/.05))
        # These are individual fictional witness faces already designed in the
        # game, not a claim that one anatomy typifies an ethnicity or gender.
        if kind=='congo':
            xx*=1+.18*math.exp(-(xx/.024)**2-((zz-1.673)/.020)**2)
            yy-=.006*math.exp(-(xx/.018)**2-((zz-1.687)/.032)**2)*frontal
            yy+=.003*math.exp(-((abs(xx)-.043)/.019)**2-((zz-1.683)/.028)**2)*frontal
        elif kind=='amazonia':
            xx*=1-.12*max(0,min(1,(1.668-zz)/.068))
            yy-=.005*math.exp(-((zz-1.748)/.019)**2)*frontal
            yy-=.004*math.exp(-(xx/.019)**2-((zz-1.691)/.024)**2)*frontal
            yy+=.003*math.exp(-((abs(xx)-.039)/.020)**2-((zz-1.682)/.024)**2)*frontal
        else:
            xx*=1+.025*math.exp(-((zz-1.636)/.028)**2)
            yy+=.003*math.exp(-(xx/.018)**2-((zz-1.687)/.028)**2)*frontal
        t=max(0,min(1,(1.585-zz)/.11));xx*=1-.08*t;yy*=1-.2*t
        neck=max(0,min(1,(1.575-zz)/.075));r=math.sqrt((xx/.057)**2+(yy/.05)**2)
        if r>1:xx*=1-neck*(1-1/r);yy*=1-neck*(1-1/r)
        # The game compresses the cervical z range after this hook. Fit the
        # entire lower neck inside its collar before that compression; a
        # partial radial clamp leaves two visible triangular side flares.
        fitted=max(0,min(1,(1.61-zz)/.03))
        rr=math.sqrt((xx/.052)**2+(yy/.045)**2)
        if rr>1:xx*=1-fitted*(1-1/rr);yy*=1-fitted*(1-1/rr)
        return Vector((xx,yy,zz))
    def uv(co):
        # Match donor orbital positions to the existing distinct iris pixels.
        u=max(.012,min(.988,.5+co[0]*{'congo':7.62,'amazonia':8.28,'ireland':6.81}[kind]))
        return (u,face_uv(co,kind)[1])
    def section(name,predicate,transform,parent,face=False):
        polys=[p for p in data.polygons if all(predicate(source[i]) for i in p.vertices)]
        ids=sorted({i for p in polys for i in p.vertices});lookup={i:n for n,i in enumerate(ids)}
        vertices=[transform(source[i]) for i in ids]
        # Both the reflected head basis and the hand X/Y swap have negative
        # determinant. Reverse only imported donor polygons to preserve the
        # source's outward orientation; original clothing/hair are untouched.
        ob=make_mesh(name,vertices,[tuple(lookup[i] for i in reversed(p.vertices)) for p in polys],skin,parent,0,[uv(v) if face else (v[0]*4,v[2]*4) for v in vertices])
        ob['source']='Julien Kaspar / Blender Studio; Realistic Human Base Mesh; CC BY 4.0'
        if face:
            ob.data.materials.append(face_material)
            for poly in ob.data.polygons:
                c=sum((ob.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
                if c.y>.004 and 1.58<c.z<1.803 and abs(c.x)<.085:poly.material_index=1
        return ob
    old=[o for o in root.children_recursive if o.type=='MESH' and any(k in o.name.lower() for k in ['adult face and cranium','anatomical neck','sculpted ear','outer ear helix','metacarpal','finger ','finger knuckle','opposable thumb'])]
    for ob in old:bpy.data.objects.remove(ob,do_unlink=True)
    head=section('Studio anatomical '+kind+' face cranium and neck',lambda p:p.z>1.519 and abs(p.x)<.105,point,body,True)
    face_material.name='BS_'+kind+'_photoreal_skin'
    face_material['projectionFadeColor']=list(SKIN_LINEAR[kind])
    face_material['projectionFade']='UV edges u .015-.11/.89-.985, v .03-.14/.88-.99; blend to projectionFadeColor in linear RGB'
    face_material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.70
    # Keep the original close-cropped / gathered / swept styles, fitting their
    # inner shell onto the professional skull so it cannot slice into scalp.
    surface=BVHTree.FromPolygons([v.co for v in head.data.vertices],[tuple(p.vertices) for p in head.data.polygons])
    center=Vector((0,-.012,1.725))
    for ob in root.children_recursive:
        if ob.type!='MESH' or 'hair' not in ob.name.lower():continue
        if 'gathered' in ob.name.lower() or 'interwoven' in ob.name.lower() or 'tie' in ob.name.lower():continue
        for vertex in ob.data.vertices:
            p=vertex.co
            if p.z<1.765:continue
            direction=(p-center).normalized()
            hit,normal,index,distance=surface.ray_cast(center+direction*.4,-direction,.65)
            if hit is not None and (p-center).length<(hit-center).length+.0025:vertex.co=hit+direction*.0025
    for side,label in [(1,'Right'),(-1,'Left')]:
        parent=next(o for o in root.children if o.name.split('.')[0]==label+'Arm')
        handscale=.93 if kind=='amazonia' else 1.
        def hand_point(p):
            x,y,z=p;center=.414+.10*(.975-z)
            return Vector((side*(.275+(y+.067)*.55*handscale),.027+(abs(x)-center)*.82*handscale,.999+(z-.975)*.73*handscale))
        hand=section('Studio '+kind+' '+label+' continuous hand and digits',lambda p:p.x*side>.30 and p.z<.994,hand_point,parent)
        hand.location-=parent.location
    eye_data=bpy.data.meshes.new_from_object(eyes.evaluated_get(deps))
    ev=[point(eyes.matrix_world@v.co) for v in eye_data.vertices]
    materials=[]
    for suffix,color,rough in [('sclera',(.32,.275,.21),.26),('iris',(.026,.016,.010) if kind!='ireland' else (.035,.044,.040),.25),('pupil',(.001,.001,.001),.20)]:
        m=bpy.data.materials.new('BS_'+kind+'_'+suffix);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;materials.append(m)
    eye=make_mesh('Studio '+kind+' paired eyes face',ev,[tuple(reversed(p.vertices)) for p in eye_data.polygons],materials[0],body)
    for m in materials[1:]:eye.data.materials.append(m)
    eye_x=.02977*width
    for poly in eye.data.polygons:
        c=sum((eye.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
        r=math.hypot(abs(c.x)-eye_x,c.z-1.729)
        if c.y>.060 and r<.0053:poly.material_index=2 if r<.0023 else 1
    bpy.data.meshes.remove(eye_data);bpy.data.meshes.remove(data)
    for ob in (donor,eyes):bpy.data.objects.remove(ob,do_unlink=True)
    # Broad folds where the existing garments hang or gather, leaving quieter
    # panels for the measured fine weave instead of a mottled noise surface.
    for ob in root.children_recursive:
        if ob.type!='MESH' or 'tailored torso' not in ob.name.lower():continue
        for v in ob.data.vertices:
            x,y,z=v.co;front=max(0,min(1,y/.06));rear=max(0,min(1,-y/.06))
            hanging=math.exp(-((z-1.22)/.21)**4)
            fold=(.009*math.sin(32*x+4*z)+.006*math.sin(55*x-3*z))*hanging
            diagonal=.010*math.exp(-((z-(1.18+.44*x))/.026)**2)*math.exp(-(x/.16)**6)
            v.co.y+=(front-rear)*(fold+diagonal)
    root['anatomy_credit']=json.dumps(CREDIT,ensure_ascii=False)
    root['professional_npc']=kind
    print('PRO_NPC',kind,len(head.data.vertices),'head vertices')


def apply_npc_professional_surfaces(characters,materials):
    specs={
        'Indigo washed cotton':('congo',(.18,.325,.345,1)),
        'Faded umber trousers':('congo',(.42,.275,.14,1)),
        'Ecru cotton':('congo',(.73,.655,.50,1)),
        'Unbleached woven blouse':('amazonia',(.77,.66,.46,1)),
        'Madderrust woven wrap':('amazonia',(.50,.175,.075,1)),
        'Woven ochre belt':('amazonia',(.58,.365,.135,1)),
        'Slate Donegal wool':('ireland',(.155,.215,.235,1)),
        'Charcoal wool trousers':('ireland',(.145,.15,.135,1)),
        'Heather moss wool scarf':('ireland',(.35,.395,.225,1)),
    }
    textures={}
    for suffix in ['Color','NormalGL','Roughness']:
        im=bpy.data.images.load(os.path.join(ASSETS,'Fabric030','Fabric030_1K-JPG_'+suffix+'.jpg'),check_existing=True)
        im.name='ACG_Fabric030_'+suffix;im.colorspace_settings.name='sRGB' if suffix=='Color' else 'Non-Color';im.pack();textures[suffix]=im
    for old,(kind,tint) in specs.items():
        if old not in materials:continue
        m=materials[old];m.name='ACG_Fabric030_'+kind+'_'+old.lower().replace(' ','_');nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
        for socket in ['Base Color','Normal','Roughness']:
            for link in list(bs.inputs[socket].links):links.remove(link)
        ts={}
        for suffix,im in textures.items():node=nodes.new('ShaderNodeTexImage');node.image=im;ts[suffix]=node
        multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=tint;links.new(ts['Color'].outputs['Color'],multiply.inputs[1]);links.new(multiply.outputs[0],bs.inputs['Base Color'])
        nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.22;links.new(ts['NormalGL'].outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);links.new(ts['Roughness'].outputs['Color'],bs.inputs['Roughness']);bs.inputs['Specular IOR Level'].default_value=.22
        m['source']='Fabric030 by Lennart Demes / ambientCG; CC0 1.0';m['baseColorFactor']=list(tint)
        for key,root in characters:
            if key=='Roger':continue
            for ob in root.children_recursive:
                if ob.type!='MESH' or m not in ob.data.materials[:]:continue
                # Use rest mesh coordinates through each pivot, in metres.
                mat=root.matrix_world.inverted()@ob.matrix_world
                uv=ob.data.uv_layers.active
                for poly in ob.data.polygons:
                    if ob.data.materials[poly.material_index]!=m:continue
                    normal=poly.normal
                    for li in poly.loop_indices:
                        co=mat@ob.data.vertices[ob.data.loops[li].vertex_index].co
                        u=co.y if abs(normal.x)>abs(normal.y)*1.5 else co.x
                        uv.data[li].uv=(u/.28,co.z/.28)
            root['professional_fabric']='Fabric030, Lennart Demes / ambientCG, CC0 1.0; original source maps, 0.28 metre UV tile and clothing tint'


def pack_npc_professional_materials(doc,binary_chunk):
    doc.setdefault('asset',{})['copyright']='Adapted anatomy: Julien Kaspar / Blender Studio, Realistic Human Base Mesh, CC BY 4.0. Fabric030: Lennart Demes / ambientCG, CC0 1.0. Original project face maps, garments and animation rig.'
    doc.setdefault('extras',{})['thirdPartyAssets']=[CREDIT,{'title':'Fabric030','author':'Lennart Demes / ambientCG','source':'https://ambientcg.com/view?id=Fabric030','license':'CC0 1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','changes':'0.28 metre UV scale, original garment color tint, .22 tangent normal strength and JPEG encoding.'}]
    for m in doc.get('materials',[]):
        if m.get('name','').startswith('ACG_'):m['pbrMetallicRoughness']['baseColorFactor']=m['extras']['baseColorFactor']
    payload=binary_chunk[8:];replacements={}
    with tempfile.TemporaryDirectory(prefix='celta-npc-web-') as temp:
        for im in doc.get('images',[]):
            if not im.get('name','').startswith('Fabric030_'):continue
            view=doc['bufferViews'][im['bufferView']];start=view.get('byteOffset',0)
            source=os.path.join(temp,'source'+('.jpg' if im['mimeType']=='image/jpeg' else '.png'));target=os.path.join(temp,'web.jpg')
            with open(source,'wb') as f:f.write(payload[start:start+view['byteLength']])
            image=bpy.data.images.load(source,check_existing=False);image.pixels[0]
            image.filepath_raw=target;image.file_format='JPEG';image.save(quality=92);bpy.data.images.remove(image)
            with open(target,'rb') as f:replacements[im['bufferView']]=f.read()
            im['mimeType']='image/jpeg'
    packed=bytearray()
    for index,view in enumerate(doc['bufferViews']):
        start=view.get('byteOffset',0);data=replacements.get(index,payload[start:start+view['byteLength']])
        packed.extend(b'\0'*((-len(packed))%4));view['byteOffset']=len(packed);view['byteLength']=len(data);packed.extend(data)
    packed.extend(b'\0'*((-len(packed))%4));doc['buffers'][0]['byteLength']=len(packed)
    return struct.pack('<II',len(packed),0x004E4942)+packed
