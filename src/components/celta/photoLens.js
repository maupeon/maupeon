import * as THREE from 'three'
import { PHOTO_FOCUS_TOLERANCE } from '../../lib/celta/photography'

// The field camera uses actual scene depth. Allocate its offscreen buffers only
// when it is opened; ordinary exploration keeps the cheaper existing render path.
export function createPhotoLens(renderer, camera) {
  let target, horizontalTarget
  const size = new THREE.Vector2()
  const canRenderHDR = renderer.extensions.has('EXT_color_buffer_float')
  const uniforms = {
    colorMap: { value: null }, depthMap: { value: null },
    focus: { value: 5 }, near: { value: camera.near }, far: { value: camera.far },
    aspect: { value: 1 },
    focusMinimum: { value: PHOTO_FOCUS_TOLERANCE.minimum },
    focusFraction: { value: PHOTO_FOCUS_TOLERANCE.relative },
  }
  const makeMaterial = output => new THREE.ShaderMaterial({
    uniforms: {...uniforms, sourceMap:{value:null},direction:{value:new THREE.Vector2(output?0:1,output?1:0)}},
    depthTest: false, depthWrite: false, toneMapped: output,
    vertexShader: 'varying vec2 lensUv; void main(){lensUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      uniform sampler2D colorMap,depthMap,sourceMap;
      uniform float focus,near,far,aspect,focusMinimum,focusFraction;
      uniform vec2 direction;
      varying vec2 lensUv;
      float distanceAt(vec2 uv){
        float z=texture2D(depthMap,uv).x;
        return near*far/(far-z*(far-near));
      }
      void main(){
        float distance=distanceAt(lensUv);
        float tolerance=max(focusMinimum,distance*focusFraction);
        float radius=clamp((abs(distance-focus)-tolerance)/max(distance,1.)*.018,0.,.012);
        vec3 color=texture2D(sourceMap,lensUv).rgb;
        float weight=1.;
        if(radius>.0001){
          for(int i=-6;i<=6;i++){
            if(i==0)continue;
            float spread=float(i)/6.;
            vec2 offset=direction*vec2(1./aspect,1.)*radius*spread;
            vec2 uv=clamp(lensUv+offset,vec2(.001),vec2(.999));
            float sampleDistance=distanceAt(uv);
            // Keep a distant bright background from bleeding over a nearer face.
            float sampleWeight=exp(-spread*spread*2.2)*(sampleDistance>distance*1.25?.18:1.);
            color+=texture2D(sourceMap,uv).rgb*sampleWeight;
            weight+=sampleWeight;
          }
        }
        color/=weight;
        ${output ? 'color=mix(texture2D(colorMap,lensUv).rgb,color,smoothstep(.0003,.0012,radius));' : ''}
        gl_FragColor=vec4(color,1.);
        ${output ? '#include <tonemapping_fragment>\n#include <colorspace_fragment>' : ''}
      }`,
  })
  const horizontal = makeMaterial(false), material = makeMaterial(true)
  const geometry = new THREE.PlaneGeometry(2,2)
  const scene = new THREE.Scene()
  const quad=new THREE.Mesh(geometry,material)
  scene.add(quad)
  const screenCamera = new THREE.Camera()
  return {
    render(world, focus, lowQuality = false) {
      if (!canRenderHDR) { renderer.render(world,camera); return }
      if (!target) {
        target = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType})
        target.depthTexture = new THREE.DepthTexture(1,1,THREE.UnsignedIntType)
        horizontalTarget = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false})
        uniforms.colorMap.value=target.texture
        uniforms.depthMap.value=target.depthTexture
        horizontal.uniforms.sourceMap.value=target.texture
        material.uniforms.sourceMap.value=horizontalTarget.texture
      }
      renderer.getSize(size)
      const scale=Math.min(renderer.getPixelRatio(),(lowQuality?900:1536)/Math.max(size.x,size.y))
      const width=Math.max(1,Math.round(size.x*scale)),height=Math.max(1,Math.round(size.y*scale))
      if(target.width!==width || target.height!==height){target.setSize(width,height);horizontalTarget.setSize(width,height)}
      uniforms.focus.value=focus
      uniforms.aspect.value=camera.aspect
      const previous=renderer.getRenderTarget()
      renderer.setRenderTarget(target)
      renderer.render(world,camera)
      renderer.setRenderTarget(horizontalTarget)
      quad.material=horizontal
      renderer.render(scene,screenCamera)
      renderer.setRenderTarget(previous)
      quad.material=material
      renderer.render(scene,screenCamera)
    },
    dispose() { target?.dispose();horizontalTarget?.dispose();horizontal.dispose();material.dispose();geometry.dispose() },
  }
}
