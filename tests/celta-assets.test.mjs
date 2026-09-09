import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Protect the Blender → glTF → AnimationMixer contract: an unskinned export
// looks correct while stationary but silently breaks every walking animation.
for (const name of ['roger','witness-congo','witness-amazonia','contact-ireland']) {
  test(`${name} exports outward anatomy, weighted skin and loopable animation`, async () => {
    const bytes=await readFile(new URL(`../public/celta/models/${name}.glb`,import.meta.url))
    assert.equal(bytes.toString('ascii',0,4),'glTF')
    assert.equal(bytes.readUInt32LE(4),2)
    const jsonLength=bytes.readUInt32LE(12)
    const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength))
    const binary=bytes.subarray(28+jsonLength)
    const readAccessor=index=>{
      const accessor=gltf.accessors[index],view=gltf.bufferViews[accessor.bufferView]
      const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[accessor.type]
      const readers={5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4],5126:['readFloatLE',4]}
      const [read,size]=readers[accessor.componentType]
      return Array.from({length:accessor.count},(_,row)=>Array.from({length:components},(_,column)=>
        binary[read]((view.byteOffset||0)+(accessor.byteOffset||0)+row*(view.byteStride||size*components)+column*size)))
    }
    const skinned=gltf.nodes.filter(node=>node.skin!==undefined)
    assert.ok(skinned.length>0,'SkinnedMesh nodes are required')
    for(const node of skinned) {
      const skin=gltf.skins[node.skin]
      assert.equal(skin.joints.length,17)
      for(const bone of ['LeftShin','RightShin','LeftForeArm','RightForeArm'])
        assert.ok(skin.joints.some(index=>gltf.nodes[index].name===bone),`Missing ${bone}`)
      for(const primitive of gltf.meshes[node.mesh].primitives) {
        const weights=readAccessor(primitive.attributes.WEIGHTS_0)
        const joints=readAccessor(primitive.attributes.JOINTS_0)
        assert.equal(weights.length,gltf.accessors[primitive.attributes.POSITION].count)
        for(let vertex=0;vertex<weights.length;vertex++) {
          assert.ok(Math.abs(weights[vertex].reduce((sum,w)=>sum+w,0)-1)<.001,'Weights sum to one')
          assert.ok(joints[vertex].every(j=>j<skin.joints.length),'Joint indices bind to this skin')
        }
      }
    }
    // A reflected donor-axis conversion can preserve every vertex and bone
    // while turning the anatomical surfaces inside out. The two closed eyes
    // must enclose positive volume; double-sided materials can hide this bug.
    const primitives=gltf.meshes.flatMap(mesh=>mesh.primitives)
    const eyes=primitives.filter(p=>/^(Studio_Roger|BS_).*_(sclera|iris|pupil)$/.test(gltf.materials[p.material].name))
    assert.ok(eyes.length>=3,'Professional eye surfaces are present')
    let eyeVolume=0
    for(const primitive of eyes) {
      const positions=readAccessor(primitive.attributes.POSITION)
      const indices=readAccessor(primitive.indices).flat()
      for(let i=0;i<indices.length;i+=3) {
        const a=positions[indices[i]],b=positions[indices[i+1]],c=positions[indices[i+2]]
        eyeVolume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
      }
    }
    assert.ok(eyeVolume>1e-8,'The closed eye shells face outwards')
    if(name==='roger') {
      const hair=primitives.find(p=>gltf.materials[p.material].name==='MH_Short02_Roger_hair')
      assert.ok(hair,'Professional hair is present')
      const positions=readAccessor(hair.attributes.POSITION),indices=readAccessor(hair.indices).flat()
      const center=[0,1,2].map(axis=>(Math.min(...positions.map(p=>p[axis]))+Math.max(...positions.map(p=>p[axis])))*.5)
      let radialOrientation=0
      for(let i=0;i<indices.length;i+=3) {
        const [a,b,c]=[indices[i],indices[i+1],indices[i+2]].map(index=>positions[index])
        const u=b.map((v,j)=>v-a[j]),v=c.map((value,j)=>value-a[j])
        const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        radialOrientation+=normal.reduce((sum,n,j)=>sum+n*((a[j]+b[j]+c[j])/3-center[j]),0)
      }
      assert.ok(radialOrientation>0,'Hair cards predominantly face away from the scalp')
    }
    assert.deepEqual(gltf.animations.map(clip=>clip.name).sort(),name==='roger'?['Idle','Walk']:['Idle'])
    for(const clip of gltf.animations) {
      const duration=clip.name==='Idle'?4:1
      for(const channel of clip.channels) {
        assert.ok(gltf.nodes[channel.target.node],'Animation target exists')
        const sampler=clip.samplers[channel.sampler]
        const times=readAccessor(sampler.input).flat(),values=readAccessor(sampler.output)
        assert.ok(Math.abs(times.at(-1)-duration)<.00001,'Clip duration matches runtime speed contract')
        assert.ok(times.every((t,i)=>i===0||t>times[i-1]),'Key times increase')
        for(let axis=0;axis<values[0].length;axis++)
          assert.ok(Math.abs(values[0][axis]-values.at(-1)[axis])<.00001,'Loop closes without a jump')
      }
    }
  })
}
