import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Texture, Vector2 } from 'three'

const source=await readFile(new URL('../src/components/celta/photoOcclusion.js',import.meta.url),'utf8')
const {createPhotoOcclusionTest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))

test('photographs see through cutout foliage, but stop at opaque leaves',()=>{
  const oldDocument=globalThis.document
  let reads=0
  globalThis.document={createElement:()=>{
    let image
    return {getContext:()=>({
      drawImage:value=>{image=value},
      getImageData:()=>{reads++;return image},
    })}
  }}
  try {
    // A vertical leaf atlas: transparent sky above an opaque leaf.
    const texture=new Texture({width:1,height:2,data:new Uint8ClampedArray([40,80,20,0,40,80,20,255])})
    texture.flipY=false
    const material={opacity:1,alphaTest:.52,map:texture}
    const parent={visible:true,parent:null}
    const object={visible:true,parent,material}
    const hit=v=>({object,uv:new Vector2(.5,v)})
    const occludes=createPhotoOcclusionTest()
    assert.equal(occludes(hit(.25)),false,'Transparent part of the card must not block a photograph')
    assert.equal(occludes(hit(.75)),true,'Visible leaf still blocks a photograph')
    assert.equal(reads,1,'Repeated rays reuse the decoded pixels')
    texture.flipY=true
    assert.equal(occludes(hit(.25)),true,'Texture orientation matches the rendered leaf')
    assert.equal(occludes(hit(.75)),false)
    parent.visible=false
    assert.equal(occludes(hit(.25)),false,'Hidden parent geometry is not an obstacle')
    parent.visible=true
    object.material={opacity:1,alphaTest:0}
    assert.equal(occludes(hit(.25)),true,'A wall remains opaque')
    object.material={opacity:0,alphaTest:0}
    assert.equal(occludes(hit(.25)),false)
  } finally {globalThis.document=oldDocument}
})
