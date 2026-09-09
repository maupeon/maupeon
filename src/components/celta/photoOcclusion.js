export function createPhotoOcclusionTest() {
  const pixels=new WeakMap()
  const sample=(texture,point,channel)=>{
    if(!texture?.image || !point)return 1
    let data=pixels.get(texture.image)
    if(!data) {
      const canvas=document.createElement('canvas')
      canvas.width=texture.image.width;canvas.height=texture.image.height
      const context=canvas.getContext('2d',{willReadFrequently:true})
      context.drawImage(texture.image,0,0)
      data=context.getImageData(0,0,canvas.width,canvas.height)
      pixels.set(texture.image,data)
    }
    if(texture.matrixAutoUpdate)texture.updateMatrix()
    const uv=texture.transformUv(point.clone())
    const x=Math.max(0,Math.min(data.width-1,Math.floor(uv.x*data.width)))
    const y=Math.max(0,Math.min(data.height-1,Math.floor(uv.y*data.height)))
    return data.data[(y*data.width+x)*4+channel]/255
  }
  return hit=>{
    for(let parent=hit.object;parent;parent=parent.parent)if(!parent.visible)return false
    const material=Array.isArray(hit.object.material)
      ? hit.object.material[hit.face?.materialIndex || 0] : hit.object.material
    if(!material || material.opacity===0)return false
    if(!material.alphaTest)return true
    // Raycasting sees the whole foliage mesh. Match its texture cutout so a
    // transparent gap between leaves cannot falsely obstruct the photograph.
    const alpha=material.opacity*sample(material.map,hit.uv,3)*sample(material.alphaMap,hit.uv,1)
    return alpha>=material.alphaTest
  }
}

