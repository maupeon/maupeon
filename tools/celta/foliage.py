"""Original, articulated Celta foreground foliage, authored in Blender.

Run from the repository:
    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/celta/foliage.py

The six full-detail roots and their six mobile Low variants export at a ground-centred local origin in game metres.
Generated alpha atlases retain their original pixels. UVs sample individual leaves
and whole natural fronds; bent surfaces, asymmetric folds, stems and raised ribs
are actual mesh geometry. No external asset downloads or game-engine primitives.
"""
import bpy, math, os, json, random
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('CELTA_FOLIAGE_OUTPUT',str(ROOT/'public/celta/models')))
PREV=ROOT/'.dream-loop/v2/foliage'
BLEND=Path(os.environ.get('CELTA_FOLIAGE_BLEND',str(ROOT/'tools/celta/blend/foliage.blend')))
PALM=ROOT/'public/celta/palm-frond-v2.png'
LEAF=ROOT/'public/celta/broadleaf-atlas-v2.png'
for path in (OUT,PREV,BLEND.parent):path.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def g(p):return (p[0],-p[2],p[1])
def mix(a,b,t):return a+(b-a)*t

def image_source(path):
    if path.exists():im=bpy.data.images.load(str(path),check_existing=True)
    else:
        with bpy.data.libraries.load(str(BLEND),link=False) as (available,loaded):loaded.images=[path.name]
        im=bpy.data.images.get(path.name)
        if im is None:raise FileNotFoundError(path)
    im.colorspace_settings.name='sRGB';im.alpha_mode='STRAIGHT';im.pack();im.use_fake_user=True
    return im


def leaf_material(name,path,roughness):
    im=image_source(path)
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.use_backface_culling=False
    mat.surface_render_method='DITHERED'
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=roughness;bs.inputs['Specular IOR Level'].default_value=.22
    tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='EXTEND';tex.interpolation='Linear'
    links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    cut=nodes.new('ShaderNodeMath');cut.operation='GREATER_THAN';cut.inputs[1].default_value=.52
    links.new(tex.outputs['Alpha'],cut.inputs[0]);links.new(cut.outputs[0],bs.inputs['Alpha'])
    return mat


def stem_material():
    mat=bpy.data.materials.new('Foliage_rachis');mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.075,.092,.025,1)
    bs.inputs['Roughness'].default_value=.86;bs.inputs['Specular IOR Level'].default_value=.18
    return mat


class Batch:
    def __init__(self,name,material):self.name=name;self.material=material;self.v=[];self.f=[];self.uv=[];self.col=[]
    def add(self,verts,faces,uvs=None,colors=None):
        off=len(self.v);self.v.extend([g(p) for p in verts]);self.f.extend([tuple(off+i for i in f) for f in faces])
        self.uv.extend(uvs or [[(0,0)]*len(f) for f in faces]);self.col.extend(colors or [(1,1,1,1)]*len(verts))
    def object(self,parent):
        mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update()
        layer=mesh.uv_layers.new(name='UVMap');layer.data.foreach_set('uv',np.asarray([uv for face in self.uv for uv in face],dtype=np.float32).reshape(-1))
        col=mesh.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.asarray(self.col,dtype=np.float32).reshape(-1))
        for polygon in mesh.polygons:polygon.use_smooth=True
        ob=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(ob);ob.parent=parent;ob.data.materials.append(self.material)
        return ob


def tube(batch,points,radii,sides=4):
    verts=[];faces=[]
    for j,p in enumerate(points):
        tangent=(points[min(j+1,len(points)-1)]-points[max(0,j-1)]).normalized()
        across=tangent.cross(Vector((0,1,0)))
        if across.length<.01:across=tangent.cross(Vector((1,0,0)))
        across.normalize();normal=tangent.cross(across).normalized()
        for i in range(sides):verts.append(p+radii[j]*(across*math.cos(i*TAU/sides)+normal*math.sin(i*TAU/sides)))
        if j:
            for i in range(sides):faces.append(((j-1)*sides+i,(j-1)*sides+(i+1)%sides,j*sides+(i+1)%sides,j*sides+i))
    batch.add(verts,faces)


def patch(batch,point,nu,nv,region=(0,0,1,1),color=(1,1,1)):
    """UV region uses image top-left coordinates, while point receives u,v 0..1."""
    x0,y0,x1,y1=region;verts=[];faces=[];uvs=[];colors=[]
    for j in range(nv+1):
        t=j/nv
        for i in range(nu+1):
            u=i/nu;verts.append(point(u,t))
            shade=.84+.16*math.sin(t*math.pi*.78)
            colors.append((*[c*shade for c in color],1))
    for j in range(nv):
        for i in range(nu):
            face=(j*(nu+1)+i,j*(nu+1)+i+1,(j+1)*(nu+1)+i+1,(j+1)*(nu+1)+i)
            faces.append(face)
            uvs.append([(mix(x0,x1,(v%(nu+1))/nu),1-mix(y1,y0,(v//(nu+1))/nv)) for v in face])
    batch.add(verts,faces,uvs,colors)


# Atlas regions are populated after inspecting the original generated art. These
# are UV windows, not cropped/repainted replacement images.
PALM_REGIONS=[(0,0,1,1)]
LEAF_REGIONS=[(220/1214,10/1295,423/1214,625/1295), (751/1214,14/1295,1058/1214,625/1295), (233/1214,640/1295,485/1214,1280/1295), (776/1214,636/1295,1063/1214,1283/1295)]


# Read-only segmentation of the original alpha. Connected tissue is separated
# from its rachis so neighboring leaflets can acquire independent surface normals.
PALM_ISLANDS=[]
def prepare_palm_islands():
    from collections import deque
    im=bpy.data.images[PALM.name];w,h=im.size
    alpha=np.asarray(im.pixels[:],dtype=np.float32).reshape(h,w,4)[::-1,:,3]
    tissue=alpha>.52
    result=[]
    for sign,cut in [(-1,475),(1,550),(0,250)]:
        mask=tissue.copy()
        if sign<0:mask[:,cut:]=False;column=cut-1
        elif sign>0:mask[:,:cut]=False;column=cut
        else:mask[:,:475]=False;mask[:,550:]=False;mask[cut:]=False;column=cut-1
        labels=np.zeros((h,w),dtype=np.int32);queue=deque();next_id=0
        rows=np.flatnonzero(mask[column,:] if sign==0 else mask[:,column]);runs=[]
        for row in rows:
            if not runs or row>runs[-1][-1]+1:runs.append([])
            runs[-1].append(int(row))
        for run in runs:
            if len(run)<3:continue
            next_id+=1
            for value in run:
                y,x=(column,value) if sign==0 else (value,column)
                labels[y,x]=next_id;queue.append((y,x))
        def flood():
            while queue:
                y,x=queue.popleft();identity=labels[y,x]
                for yy,xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                    if 0<=yy<h and 0<=xx<w and mask[yy,xx] and labels[yy,xx]==0:
                        labels[yy,xx]=identity;queue.append((yy,xx))
        flood()
        # Detached damaged tips remain part of the texture and get their own
        # small surface where they are large enough to matter on screen.
        for y,x in zip(*np.where(mask&(labels==0))):
            if labels[y,x]:continue
            next_id+=1;labels[y,x]=next_id;queue.append((int(y),int(x)));flood()
        for identity in range(1,next_id+1):
            yy,xx=np.where(labels==identity)
            if len(xx)<140:continue
            coords=np.column_stack((xx+.5,yy+.5)).astype(np.float64)
            near=np.abs(coords[:,1 if sign==0 else 0]-column)<1.1
            base=coords[near].mean(0) if near.any() else coords[np.argmin(np.abs(coords[:,1 if sign==0 else 0]-column))]
            tip=coords[np.argmax(np.sum((coords-base)**2,axis=1))]
            length=float(np.linalg.norm(tip-base))
            if length<24:continue
            # Directed cell boundaries trace an exact silhouette without changing
            # a texture pixel. Holes remain alpha holes in the original image.
            edges={}
            def edge(a,b):edges.setdefault(a,[]).append(b)
            for y,x in zip(yy,xx):
                x=int(x);y=int(y)
                if y==0 or labels[y-1,x]!=identity:edge((x,y),(x+1,y))
                if x==w-1 or labels[y,x+1]!=identity:edge((x+1,y),(x+1,y+1))
                if y==h-1 or labels[y+1,x]!=identity:edge((x+1,y+1),(x,y+1))
                if x==0 or labels[y,x-1]!=identity:edge((x,y+1),(x,y))
            loops=[]
            while edges:
                start=next(iter(edges));p=start;loop=[]
                for _ in range(len(edges)*2+8):
                    loop.append(p)
                    if p not in edges:break
                    nxt=edges[p].pop()
                    if not edges[p]:del edges[p]
                    p=nxt
                    if p==start:break
                if len(loop)>3:loops.append(loop)
            def area(poly):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))
            if not loops:continue
            contour=max(loops,key=area)
            axis=(tip-base)/length;projections=(coords-base)@axis
            centers=[]
            for t in [.17,.34,.50,.67,.83]:
                nearby=coords[np.abs(projections-t*length)<max(2,length*.015)]
                if len(nearby):centers.append(nearby.mean(0).tolist())
            result.append({'side':sign,'base':base.tolist(),'tip':tip.tolist(),'contour':contour,'centers':centers,'pixels':len(xx),'width':float(w),'height':float(h)})
    return result


def simplify_outline(points,tolerance):
    def rdp(pts):
        if len(pts)<3:return pts
        a=np.asarray(pts[0],float);b=np.asarray(pts[-1],float);delta=b-a
        allp=np.asarray(pts,float);denom=float(delta@delta)
        t=np.clip((allp-a)@delta/max(denom,1e-8),0,1)
        distances=np.linalg.norm(allp-a-t[:,None]*delta,axis=1);at=int(np.argmax(distances))
        if distances[at]<=tolerance:return [pts[0],pts[-1]]
        return rdp(pts[:at+1])[:-1]+rdp(pts[at:])
    # Split the closed contour at farthest points so the simplifier cannot
    # collapse its seam into a single arbitrary short edge.
    pts=list(points);far=max(range(len(pts)),key=lambda i:(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2)
    return rdp(pts[:far+1])[:-1]+rdp(pts[far:]+pts[:1])[:-1]


def articulated_leaflets(batch,surface,frond,index,lod,color):
    from mathutils.geometry import delaunay_2d_cdt
    from mathutils import Matrix
    # Rank each side from tip to crown. A deliberately unequal neighboring pair
    # remains readable after the individual leaves become only a few pixels wide.
    ranks={}
    for side in (-1,0,1):
        ordered=sorted((n for n,island in enumerate(PALM_ISLANDS) if island['side']==side),key=lambda n:PALM_ISLANDS[n]['base'][1])
        ranks.update({n:rank for rank,n in enumerate(ordered)})
    for n,island in enumerate(PALM_ISLANDS):
        rng=random.Random(17891+index*239+frond*991+n*73)
        outline=simplify_outline(island['contour'],12.0 if lod else 3.0)
        # A long straight contour edge must still receive deformation samples;
        # otherwise its vertices bend while the visible tip remains one chord.
        source_length=math.hypot(island['tip'][0]-island['base'][0],island['tip'][1]-island['base'][1])
        maximum_edge=max(55 if lod else 28,source_length*(.44 if lod else .20))
        sampled=[]
        for a,b in zip(outline,outline[1:]+outline[:1]):
            distance=math.hypot(b[0]-a[0],b[1]-a[1]);steps=max(1,math.ceil(distance/maximum_edge))
            for step in range(steps):sampled.append((mix(a[0],b[0],step/steps),mix(a[1],b[1],step/steps)))
        outline=sampled
        # High uses all midrib control stations; Low retains one central hinge.
        centers=island['centers'][2:3] if lod else island['centers']
        inputs=[Vector(p) for p in outline+centers]
        if len(outline)<3:continue
        edges=[(i,(i+1)%len(outline)) for i in range(len(outline))]
        points,_,faces,*_=delaunay_2d_cdt(inputs,edges,[list(range(len(outline)))],1,1e-4)
        faces=[tuple(reversed(face)) for face in faces]
        bx,by=island['base'];tx,ty=island['tip'];w,h=island['width'],island['height']
        uvbase=Vector((bx,by));uvaxis=Vector((tx-bx,ty-by));uvlength=uvaxis.length;uvaxis.normalize();uvcross=Vector((-uvaxis.y,uvaxis.x))
        base=surface(bx/w,1-by/h);tip=surface(tx/w,1-ty/h);axis=(tip-base).normalized();length=(tip-base).length
        across=axis.cross(Vector((0,1,0)))
        if across.length<.01:across=axis.cross(Vector((1,0,0)))
        across.normalize();normal=across.cross(axis).normalized()
        roll=rng.uniform(-.65,.65);width_scale=rng.uniform(.62,.84);curl=rng.uniform(-.10,.16);droop=rng.uniform(.055,.24);sweep=rng.uniform(-.12,.12)
        # The source has crowded, nearly parallel blades. Shorten alternating
        # neighbors by 25–35%, with a shifted phase per frond, while retaining the
        # terminal leaf's reach. Original UVs and alpha pixels remain untouched.
        short=(ranks[n]+frond+index+(1 if island['side']<0 else 0))%2==0
        length_scale=(rng.uniform(.65,.75) if short else rng.uniform(.98,1.03)) if island['side'] else 1.0
        # Use the original curved midrib as a width reference, rather than
        # compressing its bend along with the body. The taper therefore opens
        # genuine gaps between leaves without straightening their silhouettes.
        stations=[(0.0,uvbase)]
        stations += [((Vector(p)-uvbase).dot(uvaxis)/uvlength,Vector(p)) for p in island['centers']]
        stations.append((1.0,Vector((tx,ty))));stations.sort(key=lambda station:station[0])
        verts=[];uvs=[];colors=[]
        for point in points:
            x,y=point;source=Vector((x,y));u=x/w;v=1-y/h
            t=max(0,min(1,(source-uvbase).dot(uvaxis)/uvlength))
            lateral=(source-uvbase).dot(uvcross)/max(uvlength,1)
            original=surface(u,v)
            for (ta,pa),(tb,pb) in zip(stations,stations[1:]):
                if ta<=t<=tb:
                    middle=pa.lerp(pb,(t-ta)/max(tb-ta,1e-6));break
            else:middle=stations[-1][1]
            midrib=surface(middle.x/w,1-middle.y/h)
            taper=.93-.24*t+.13*math.sin(t*math.pi)
            delta=(midrib-base+(original-midrib)*width_scale*taper)*length_scale
            # Width and roll vary per leaf, not per entire frond. Each leaf has
            # a pinched midrib, curved longitudinal spine and a turning tip.
            delta=Matrix.Rotation(roll*(.25+.75*t),3,axis)@delta
            bending=normal*(length*length_scale*(curl*math.sin(t*math.pi)-droop*t*t))
            bending+=across*(length*length_scale*sweep*math.sin(t*math.pi))
            folding=normal*(abs(lateral)*length*length_scale*.30*math.sin(t*math.pi))
            verts.append(base+delta+bending+folding)
            shade=.84+.16*math.sin(v*math.pi*.78);colors.append((*[c*shade for c in color],1))
        for face in faces:uvs.append([(points[i].x/w,1-points[i].y/h) for i in face])
        batch.add(verts,faces,uvs,colors)


def palm(name,index,mats,lod=False):
    rng=random.Random(983+index*231);root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    leaves=Batch(name+'_folded_fronds',mats[0]);stems=Batch(name+'_slender_rachis',mats[2])
    # Art-directed directions and lengths avoid a golden-angle radial rosette.
    habits=[[(.1,1.50,.76),(.88,1.30,.68),(1.66,1.14,.78),(2.54,1.44,.73),(3.35,1.28,.66),(4.40,1.52,.62),(5.55,1.38,.72)],
            [(.28,1.62,.67),(1.18,1.15,.86),(2.12,1.38,.73),(2.95,1.15,.64),(3.70,1.51,.57),(4.86,1.35,.77),(5.63,1.18,.88)],
            [(-.15,1.29,.91),(.69,1.66,.58),(1.81,1.29,.67),(2.68,1.43,.75),(3.57,1.64,.59),(4.65,1.14,.84),(5.67,1.45,.66)]]
    for f,(angle,length,height) in enumerate(habits[index]):
        angle+=rng.uniform(-.12,.12);direction=Vector((math.cos(angle),0,math.sin(angle)));side=Vector((-direction.z,0,direction.x))
        curve=rng.uniform(-.16,.16);roll=rng.uniform(-.32,.32);width=length*rng.uniform(.36,.46)
        crown=Vector((rng.uniform(-.06,.06),.07+rng.random()*.05,rng.uniform(-.06,.06)))
        def center(t):return crown+direction*(length*t)+side*(math.sin(t*math.pi)*curve)+Vector((0,height*math.sin(t*math.pi*.89)-.075*t*t,0))
        def surface(u,t):
            q=(u-.5)*2;rib=center(t)
            # Independent lateral twists and cupping articulate the alpha leaflets
            # out of the common frond plane, especially the drooping older leaves.
            span=q*width*.5
            arch=.045*math.sin(t*math.pi)*abs(q)**1.25
            twist=roll+math.sin(t*7.3+f)*.19+q*.12
            droop=-abs(q)**1.5*width*.11*math.sin(t*math.pi)
            return rib+side*(span*math.cos(twist))+Vector((0,span*math.sin(twist)+arch+droop,0))+direction*(q*q*.06*math.sin(t*4+f))
        tint=rng.uniform(.87,1.0)
        patch(leaves,lambda u,t:surface(mix(475/1024,550/1024,u),t*(1-250/1536)),2,10 if lod else 28,(475/1024,250/1536,550/1024,1),(tint,tint,tint*.97))
        articulated_leaflets(leaves,surface,f,index,lod,(tint,tint,tint*.97))
        if lod:
            pts=[center(j/8)+Vector((0,.002,0)) for j in range(9)]
            tube(stems,pts,[.0055*(1-j/9)**1.4+.0004 for j in range(9)],3)
        else:
            pts=[center(j/16)+Vector((0,.002,0)) for j in range(17)]
            tube(stems,pts,[.0055*(1-j/18)**1.4+.0004 for j in range(17)],4)
    leaves.object(root);stems.object(root)
    return root


def shrub(name,index,mats,lod=False):
    rng=random.Random(551+index*613);root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    leaves=Batch(name+'_folded_leaves',mats[1]);stems=Batch(name+'_petioles',mats[2])
    counts=[5,6,5];phase=rng.uniform(0,TAU)
    for branch in range(counts[index]):
        angle=phase+branch*TAU/counts[index]+rng.uniform(-.35,.35);direction=Vector((math.cos(angle),0,math.sin(angle)));side=Vector((-direction.z,0,direction.x))
        height=rng.uniform(.48,.87);reach=rng.uniform(.18,.39)
        def at(t):return direction*(reach*t*t)+Vector((0,.025+height*t,0))
        if lod:
            tube(stems,[at(j/4) for j in range(5)],[.0045*(1-(j/4)*(7/9))+.0005 for j in range(5)],3)
        else:
            tube(stems,[at(j/7) for j in range(8)],[.0045*(1-j/9)+.0005 for j in range(8)],4)
        for n in range(4):
            t=.42+n*.17+rng.uniform(-.025,.025);sign=-1 if n%2 else 1;base=at(t)
            leaf_angle=angle+sign*rng.uniform(.45,1.15);out=Vector((math.cos(leaf_angle),0,math.sin(leaf_angle)));across=Vector((-out.z,0,out.x))
            length=rng.uniform(.36,.65)*(1-.05*n);width=length*rng.uniform(.34,.47)
            roll=rng.uniform(-.43,.43);curl=rng.uniform(.07,.15);tip_drop=rng.uniform(.06,.21);bend=rng.uniform(-.07,.07)
            def center(v):return base+out*(length*v)+across*(math.sin(math.pi*v)*bend)+Vector((0,math.sin(v*math.pi)*curl-tip_drop*v*v,0))
            def surface(u,v):
                q=(u-.5)*2
                # A shallow midrib valley, irregular corrugated margin and twisting
                # side planes form a leaf, rather than a uniformly shiny lance.
                span=q*width*.5;rib=center(v)
                fold=(abs(q)**.72)*(.03+.016*math.sin(v*8.4+branch))
                wrinkle=math.sin(v*24+q*2+branch)*.009*abs(q)**2*math.sin(v*math.pi)
                rim_curl=abs(q)**3*.022*math.sin(v*9+n*1.4)
                return rib+across*(span*math.cos(roll))+Vector((0,span*math.sin(roll)+fold+wrinkle+rim_curl,0))+out*(abs(q)*.025*math.sin(v*12+n))
            region=LEAF_REGIONS[(n+branch*2+index)%len(LEAF_REGIONS)]
            tint=rng.uniform(.78,1.0);patch(leaves,surface,4 if lod else 8,7 if lod else 14,region,(tint,tint,tint*.98))
            if lod:
                tube(stems,[center(j/5)+Vector((0,.002,0)) for j in range(6)],[.0028*(1-(j/5)*.9)+.00025 for j in range(6)],3)
            else:
                tube(stems,[center(j/9)+Vector((0,.002,0)) for j in range(10)],[.0028*(1-j/10)+.00025 for j in range(10)],3)
    leaves.object(root);stems.object(root)
    return root


def preview(roots):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=1400;scene.render.resolution_y=980;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Foliage preview');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.30,.24,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
    sun_data=bpy.data.lights.new('Preview warm sun','SUN');sun_data.energy=3.;sun_data.angle=.12
    sun=bpy.data.objects.new('Preview warm sun',sun_data);bpy.context.collection.objects.link(sun);sun.rotation_euler=(.55,-.5,-.85)
    light_data=bpy.data.lights.new('Preview soft fill','AREA');light_data.energy=650;light_data.shape='DISK';light_data.size=8
    light=bpy.data.objects.new('Preview soft fill',light_data);bpy.context.collection.objects.link(light);light.location=g((1,7,3));light.rotation_euler=(Vector(g((0,0,0)))-light.location).to_track_quat('-Z','Y').to_euler()
    floor_mat=bpy.data.materials.new('Preview floor');floor_mat.use_nodes=True;bs=floor_mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.11,.105,.09,1);bs.inputs['Roughness'].default_value=.92
    mesh=bpy.data.meshes.new('Preview floor');mesh.from_pydata([g((-20,-.012,-20)),g((20,-.012,-20)),g((20,-.012,20)),g((-20,-.012,20))],[],[(0,3,2,1)]);floor=bpy.data.objects.new('Preview floor',mesh);bpy.context.collection.objects.link(floor);floor.data.materials.append(floor_mat)
    camdata=bpy.data.cameras.new('Preview camera');cam=bpy.data.objects.new('Preview camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam
    for i,root in enumerate(roots):root.location=g(((i%3-1)*3.5,0,(i//3)*3.2))
    cam.location=g((7.6,6.4,10.8));cam.rotation_euler=(Vector(g((0,.3,1.2)))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=47
    scene.render.filepath=str(PREV/'foliage-library.png')
    if not os.environ.get('CELTA_SKIP_PREVIEWS'):bpy.ops.render.render(write_still=True)
    for root in roots:root.location=(0,0,0)
    for root in roots[1:]:
        for child in root.children:child.hide_render=True
    cam.location=g((2.15,1.55,2.2));cam.rotation_euler=(Vector(g((0,.33,0)))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=49
    scene.render.filepath=str(PREV/'palm-detail.png')
    if not os.environ.get('CELTA_SKIP_PREVIEWS'):bpy.ops.render.render(write_still=True)
    for child in roots[0].children:child.hide_render=True
    for child in roots[3].children:child.hide_render=False
    scene.render.filepath=str(PREV/'shrub-detail.png')
    if not os.environ.get('CELTA_SKIP_PREVIEWS'):bpy.ops.render.render(write_still=True)
    for root in roots:
        for child in root.children:child.hide_render=False
    # Cameras/light/floor are preview-only; runtime export already happened.
    return [sun,light,floor,cam]


def main():
    global PALM_ISLANDS
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
    mats=[leaf_material('Foliage_palm',PALM,.79),leaf_material('Foliage_broadleaf',LEAF,.76),stem_material()]
    PALM_ISLANDS=prepare_palm_islands()
    print('PALM_ALPHA_ISLANDS',len(PALM_ISLANDS),flush=True)
    roots=[palm('Palm'+chr(65+i),i,mats) for i in range(3)]+[shrub('Shrub'+chr(65+i),i,mats) for i in range(3)]
    roots += [palm('Palm'+chr(65+i)+'Low',i,mats,lod=True) for i in range(3)]+[shrub('Shrub'+chr(65+i)+'Low',i,mats,lod=True) for i in range(3)]
    # Keep the established clump silhouette and ground contact while internal
    # leaf surfaces acquire their independent folds. All coordinates stay local.
    palm_bounds=[((-1.3968,.0206,-1.6013),(1.5045,.9305,1.1842)),((-1.5112,.0267,-1.3547),(1.5679,.9957,1.3082)),((-1.6874,.0302,-1.2169),(1.5075,1.1227,1.2477))]
    for root in roots:
        if not root.name.startswith('Palm'):continue
        minimum,maximum=palm_bounds[ord(root.name[4])-65]
        desired_min=Vector((minimum[0],-maximum[2],minimum[1]));desired_max=Vector((maximum[0],-minimum[2],maximum[1]))
        positions=[v.co for ob in root.children for v in ob.data.vertices]
        low=[min(p[a] for p in positions) for a in range(3)];high=[max(p[a] for p in positions) for a in range(3)]
        for ob in root.children:
            for v in ob.data.vertices:
                for axis in range(3):v.co[axis]=desired_min[axis]+(v.co[axis]-low[axis])/(high[axis]-low[axis])*(desired_max[axis]-desired_min[axis])
            ob.data.update()
    # Fewer samples can miss a frond's apex by a few millimetres. Fit only the
    # low mesh's height interval to its unchanged full-detail counterpart; X/Z
    # extents and radius already match because all silhouette endpoints remain.
    for detailed,low in zip(roots[:6],roots[6:]):
        high_z=[v.co.z for ob in detailed.children for v in ob.data.vertices]
        low_z=[v.co.z for ob in low.children for v in ob.data.vertices]
        src_min,src_max=min(low_z),max(low_z);dst_min,dst_max=min(high_z),max(high_z)
        scale=(dst_max-dst_min)/(src_max-src_min)
        for ob in low.children:
            for v in ob.data.vertices:v.co.z=dst_min+(v.co.z-src_min)*scale
            ob.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    for root in roots:
        root.select_set(True)
        for child in root.children:child.select_set(True)
    bpy.context.view_layer.objects.active=roots[0]
    target=OUT/'foliage.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_cameras=False,export_lights=False,export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
    assets={}
    for root in roots:
        points=[Vector((v.co.x,v.co.z,-v.co.y)) for ob in root.children for v in ob.data.vertices]
        assets[root.name]={'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in root.children),'meshes':len(root.children),'bounds':[[round(min(p[a] for p in points),4) for a in range(3)],[round(max(p[a] for p in points),4) for a in range(3)]],'radius':round(max(math.hypot(p.x,p.z) for p in points),4)}
    metadata={'source':'tools/celta/foliage.py','blend':'tools/celta/blend/foliage.blend','file':'/celta/models/foliage.glb','bytes':target.stat().st_size,'coordinateSystem':'Three.js Y-up; metres; every named root at local ground origin','triangles':sum(a['triangles'] for a in assets.values()),'materials':[m.name for m in mats],'textures':[{'file':str(path.relative_to(ROOT)),'width':bpy.data.images[path.name].size[0],'height':bpy.data.images[path.name].size[1],'bytes':path.stat().st_size if path.exists() else None} for path in [PALM,LEAF]],'variants':assets,'alphaMode':'MASK','alphaCutoff':.52,'doubleSided':True}
    metadata['palmAlphaIslands']=len(PALM_ISLANDS)
    metadata['detailTriangles']=sum(a['triangles'] for name,a in assets.items() if not name.endswith('Low'))
    metadata['mobileTriangles']=sum(a['triangles'] for name,a in assets.items() if name.endswith('Low'))
    metadata['mobileTriangleReduction']=round(1-metadata['mobileTriangles']/metadata['detailTriangles'],4)
    for name,a in assets.items():
        if name.endswith('Low'):
            a['lodOf']=name[:-3];a['triangleReduction']=round(1-a['triangles']/assets[name[:-3]]['triangles'],4)
            assert a['triangleReduction']>=.60,(name,a['triangleReduction'])
    assert metadata['triangles']<100000,metadata['triangles']
    (OUT/'foliage.json').write_text(json.dumps(metadata,indent=2))
    preview_objects=preview(roots)
    for ob in preview_objects:ob.hide_set(True)
    for root in roots[1:]:
        root.hide_set(True)
        for child in root.children:child.hide_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
    print('CELTA_FOLIAGE '+json.dumps(metadata),flush=True)

if __name__=='__main__':main()
