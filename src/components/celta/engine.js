import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { findWalkingPath } from '@/lib/celta/navigation'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { worldIds, groundHeight, traversable, surfaceContains } from '@/lib/celta/worlds'
import { assessPhotograph } from '@/lib/celta/photography'
import { createPhotoLens } from './photoLens'
import { createPhotoOcclusionTest } from './photoOcclusion'
import {
  createMaterials,
  createTree,
  createCrate,
  createDesk,
  createPrison,
  foliageCard,
} from './models'

const palettes = [
  {
    fog: '#a5a18a',
    zenith: '#bd937c',
    horizon: '#e7b67b',
    water: '#4c4130',
    sun: '#ffcf8e',
    ground: '#666449',
    density: 0.0052,
  },
  {
    fog: '#77958a',
    zenith: '#385b59',
    horizon: '#bed0b4',
    water: '#3c5950',
    sun: '#d4e7c4',
    ground: '#595c39',
    density: 0.019,
  },
  {
    fog: '#889ca8',
    zenith: '#405363',
    horizon: '#c0c7c5',
    water: '#344d5b',
    sun: '#e3e4d9',
    ground: '#8c866c',
    density: 0.011,
  },
]

function random(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

async function loadTextures(renderer) {
  const source = await new THREE.TextureLoader().loadAsync(
    '/celta/materials.jpg'
  )
  const textures = {}
  ;['wood', 'bark', 'ground', 'cloth', 'leaf', 'stone'].forEach((name, i) => {
    if (['wood', 'bark', 'cloth'].includes(name)) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const w = source.image.width / 3,
      h = source.image.height / 2
    canvas
      .getContext('2d')
      .drawImage(
        source.image,
        (i % 3) * w,
        Math.floor(i / 3) * h,
        w,
        h,
        0,
        0,
        512,
        512
      )
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    textures[name] = texture
  })
  source.dispose()
  // Dedicated hero scans preserve broad grain, bark plates and clothing folds.
  const heroAtlas = await new THREE.TextureLoader().loadAsync('/celta/surfaces.jpg')
  ;['wood', 'bark', 'cloth', 'hair'].forEach((name, i) => {
    textures[name]?.dispose()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const half = heroAtlas.image.width / 2
    canvas.getContext('2d').drawImage(heroAtlas.image, (i % 2) * half, Math.floor(i / 2) * half, half, half, 0, 0, 512, 512)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    textures[name] = texture
  })
  heroAtlas.dispose()
  textures.cloth.repeat.set(1, 1)
  const foliage = await new THREE.TextureLoader().loadAsync(
    '/celta/foliage.webp'
  )
  ;['canopy', 'frond', 'fernCard', 'branchCard'].forEach((name, i) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const w = foliage.image.width / 2,
      h = foliage.image.height / 2
    canvas
      .getContext('2d')
      .drawImage(
        foliage.image,
        (i % 2) * w,
        Math.floor(i / 2) * h,
        w,
        h,
        0,
        0,
        512,
        512
      )
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.premultiplyAlpha = true
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    textures[name] = texture
  })
  foliage.dispose()
  // A dedicated open branch spray avoids the clipped, dense silhouette of the
  // old atlas quadrant. Preserve the generated alpha between individual leaves.
  textures.canopy.dispose()
  textures.canopy = await new THREE.TextureLoader().loadAsync('/celta/canopy-spray-v2.png')
  textures.canopy.colorSpace = THREE.SRGBColorSpace
  textures.canopy.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  textures.sky = await new THREE.TextureLoader().loadAsync('/celta/sky.jpg')
  textures.sky.colorSpace = THREE.SRGBColorSpace
  textures.sky.mapping = THREE.EquirectangularReflectionMapping
  textures.sky.wrapS = THREE.RepeatWrapping
  return textures
}

function makeSky(palette, texture, chapter) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(250, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(palette.zenith) },
        horizon: { value: new THREE.Color(palette.horizon) },
        sunColor: { value: new THREE.Color(palette.sun) },
        sunDir: { value: new THREE.Vector3(0.16, 0.125, -0.98).normalize() },
        skyMap: { value: texture },
        photographed: { value: chapter === 0 ? 1 : 0.12 },
      },
      vertexShader:
        'varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vPos; uniform vec3 top,horizon,sunColor,sunDir; uniform sampler2D skyMap; uniform float photographed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.03+vec2(13.1,4.7);a*=.5;}return v;}
      void main(){vec3 dir=normalize(vPos);float h=max(0.,dir.y);vec3 color=mix(horizon,top,pow(h,.6));vec2 uv=vec2(atan(dir.x,-dir.z),dir.y);float cloud=smoothstep(.42,.7,fbm(uv*vec2(4.,32.)+4.));cloud*=smoothstep(.06,.17,h)*(1.-smoothstep(.4,.65,h));color=mix(color,horizon*.66,cloud*.48);vec3 sky=texture2D(skyMap,vec2(fract(uv.x/6.283185+.42),clamp(.49+dir.y*.48,0.,1.))).rgb;sky=max(vec3(0.),(sky-.2)*1.22+.2);float skyLuma=dot(sky,vec3(.21,.72,.07));sky=mix(vec3(skyLuma),sky,.65);float cloudTop=smoothstep(.035,.16,h)*(1.-smoothstep(.50,.85,skyLuma));sky=mix(sky,vec3(skyLuma)*vec3(1.005,1.015,1.025),cloudTop*.8);color=mix(color,sky,photographed);float sun=max(0.,dot(dir,sunDir));vec3 amber=mix(sunColor,vec3(2.4,1.15,.14),photographed);color=mix(color,amber,pow(sun,120.)*.3);color=mix(color,amber*1.4,pow(sun,420.)*.7);color=mix(color,sunColor*vec3(8.,8.,7.),smoothstep(.99988,.99995,sun));gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    })
  )
}

function makeWater(palette,mobile) {
  const shader = {
    uniforms: {
      color: { value: new THREE.Color(palette.water) },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      time: { value: 0 },
      deep: { value: new THREE.Color(palette.water) },
      haze: { value: new THREE.Color(palette.horizon) },
      sunlight: { value: new THREE.Color(palette.sun) },
    },
    vertexShader: `varying vec3 world; varying vec3 eye;varying vec4 reflectionUv;uniform mat4 textureMatrix;
    void main(){vec4 w=modelMatrix*vec4(position,1.);world=w.xyz;eye=cameraPosition;reflectionUv=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 world; varying vec3 eye;varying vec4 reflectionUv;uniform sampler2D tDiffuse;uniform float time;uniform vec3 deep,haze,sunlight;
    float grain(vec2 p){vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);float b=fract(sin(dot(cell+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);float c=fract(sin(dot(cell+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);float d=fract(sin(dot(cell+1.,vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
    void main(){
      vec2 p=world.xz;
      float dist=length(eye-world);
      float footprint=max(length(dFdx(p)),length(dFdy(p)));
      float fineFilter=1./(1.+footprint*12.);
      float closeWater=1.-smoothstep(16.,60.,dist);
      float a=sin(p.x*1.7+p.y*.9+time*.8);
      float b=cos(p.x*3.9-p.y*2.8+time*1.1);
      vec3 normal=normalize(vec3((a+b*.35)*.045,1.,cos(p.y*2.7+time*.6)*.025));
      vec3 view=normalize(eye-world);
      float fres=pow(1.-max(dot(view,normal),0.),3.);
      // Wind makes localized packets of ripples, separated by sheltered water.
      // Filtering uses the projected pixel footprint, avoiding distant glitter.
      vec2 drift=vec2(time*.018,-time*.026);
      float windPatch=smoothstep(.33,.60,grain(p*vec2(.36,.22)+drift));
      windPatch*=.35+.65*smoothstep(.25,.56,grain(p*vec2(.15,.39)-drift));
      vec2 ripplePoint=p+vec2(grain(p*.31)*1.1,grain(p*vec2(.42,.27))*.7);
      vec2 along=mat2(.985,.174,-.174,.985)*ripplePoint;
      float carrier=grain(along*vec2(3.4,14.)+vec2(time*.09,time*.3));
      float crossing=grain((ripplePoint+vec2(0.,p.x*.12))*vec2(8.,6.)-time*.11);
      vec2 broadOffset=vec2(grain(p*vec2(.7,1.8)+vec2(time*.06,0.)),grain(p*vec2(.45,2.1)+vec2(0.,time*.04)))-.5;
      vec2 smallOffset=vec2(carrier,crossing)-.5;
      float transverse=sin(p.y*4.2+grain(p*vec2(.19,.37))*2.4+time*.65);
      float crossSwell=sin(p.y*9.1+p.x*.44-time*.7);
      float swellFilter=1./(1.+footprint*5.);
      vec2 swellOffset=vec2(transverse*.005+crossSwell*.002*windPatch,transverse*.001)*swellFilter;
      vec2 uv=reflectionUv.xy/reflectionUv.w+broadOffset*.014+swellOffset+smallOffset*.009*windPatch*fineFilter+vec2(a,b)*.001;
      vec3 reflected=texture2D(tDiffuse,uv).rgb;
      reflected/=1.+max(0.,dot(reflected,vec3(.21,.72,.07))-.42)*3.;
      reflected=mix(reflected,vec3(dot(reflected,vec3(.21,.72,.07))),.18);
      vec3 color=mix(deep,reflected,.22+fres*.24);
      float band=smoothstep(.47,.64,carrier)*smoothstep(.30,.64,crossing);
      float packet=windPatch*closeWater*fineFilter;
      color=mix(color,mix(deep,haze,.14),band*packet*.52);
      color*=1.+((carrier-.5)*.75+(crossing-.5)*.25)*packet*.22;
      color+=vec3((band-.18)*.12*packet);
      float narrowCrest=pow(max(0.,sin(along.y*16.+grain(along*vec2(.4,.7))*3.+time*.8)),12.);
      color+=vec3(narrowCrest*.035*packet);
    vec3 halfv=normalize(view+normalize(vec3(.16,.125,-.98)));halfv.x+=(grain(p*vec2(1.8,.7)+time*.06)-.5)*.035;float spec=exp(-pow(halfv.x/.060,2.)-pow(halfv.z/.68,2.));float sparkle=grain(vec2(p.x*3.2,p.y*18.+time*.4))+.15*grain(vec2(p.x*6.,p.y*51.-time*.2));spec*=smoothstep(.57,.87,sparkle)*(.22+.78*smoothstep(.33,.58,grain(vec2(.3,p.y*2.1+time*.035))));color+=sunlight*vec3(4.2,2.7,1.1)*spec*1.6;
      // Quiet regions retain long low-contrast undulations, not a second
      // blanket of tiny bright noise over the entire water plane.
      float broadWave=(grain(ripplePoint*vec2(.7,2.5)+time*.05)-.5);
      color+=broadWave*.025+transverse*.012*swellFilter;
      color=mix(color,haze,1.-exp(-dist*.0015));
      gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  }
  const mesh = new Reflector(new THREE.PlaneGeometry(400, 400), {
    shader,
    color: palette.water,
    textureWidth: mobile ? 512 : 1024,
    textureHeight: mobile ? 512 : 1024,
    multisample: 0,
    clipBias: 0.003,
  })
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0
  return mesh
}

function batchStatic(root) {
  root.updateMatrixWorld(true)
  const batches = new Map()
  root.traverse((object) => {
    if (!object.isMesh || Array.isArray(object.material)) return
    const key =
      object.material.uuid +
      '/' +
      object.castShadow +
      '/' +
      object.receiveShadow
    if (!batches.has(key))
      batches.set(key, {
        material: object.material,
        cast: object.castShadow,
        receive: object.receiveShadow,
        geometries: [],
      })
    batches
      .get(key)
      .geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld))
  })
  const result = new THREE.Group()
  batches.forEach((batch) => {
    const geometry = mergeGeometries(batch.geometries, false)
    batch.geometries.forEach((g) => g.dispose())
    if (!geometry) return
    const mesh = new THREE.Mesh(geometry, batch.material)
    mesh.castShadow = batch.cast
    mesh.receiveShadow = batch.receive
    result.add(mesh)
  })
  return result
}


function marker() {
  const group = new THREE.Group()
  const color = '#e7cd8b'
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13),
    new THREE.MeshBasicMaterial({ color })
  )
  diamond.position.y = 2.6
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.48, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.16
  group.add(diamond, ring)
  return group
}

export async function createEngine(container, callbacks) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.setAttribute('aria-label', 'Mundo 3D de Roger Casement')
  container.appendChild(renderer.domElement)
  let textures, assets, worlds
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const pendingAssets = new Map()
  try {
    const names = ['congo','roger','witness-congo','foliage']
    const loaded = await Promise.all([
      loadTextures(renderer),
      fetch('/celta/models/worlds.json').then(response => { if (!response.ok) throw new Error('World metadata unavailable'); return response.json() }),
      Promise.all(names.map(async name => [name, await loader.loadAsync(`/celta/models/${name}.glb`)])),
    ])
    textures = loaded[0]
    worlds = loaded[1]
    assets = Object.fromEntries(loaded[2])
  } catch (error) {
    renderer.dispose()
    renderer.domElement.remove()
    throw error
  }
  const materials = createMaterials(textures)
  const edgeLight = new THREE.Color()
  for (const name of [
    'cloth',
    'clothLight',
    'clothShadow',
    'trousers',
    'wetWood',
    'woodLight',
    'wood',
    'woodDark',
  ]) {
    const material = materials[name]
    const timber = ['wood', 'woodLight', 'woodDark', 'wetWood'].includes(name)
    material.onBeforeCompile = (shader) => {
      shader.uniforms.celtaEdge = { value: edgeLight }
      shader.fragmentShader =
        'uniform vec3 celtaEdge;\n' + shader.fragmentShader
      if (!timber) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          '#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse*.28,diffuseColor.rgb,.45);'
        )
      }
      if (timber) {
        shader.vertexShader =
          'varying vec3 celtaSurface;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nceltaSurface=(modelMatrix*vec4(transformed,1.)).xyz;'
        )
        shader.fragmentShader =
          'varying vec3 celtaSurface;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          vec2 dampUv=celtaSurface.xz;
          float damp=smoothstep(.62,.82,.5+.24*sin(dampUv.x*3.1+sin(dampUv.y*.73))+.24*sin(dampUv.y*1.7-dampUv.x*.7));
          damp*=smoothstep(-.02,.04,celtaSurface.y)*(1.-smoothstep(.13,.3,celtaSurface.y));
          roughnessFactor=mix(.94,.11,damp);
          diffuseColor.rgb*=1.-damp*.58;
          diffuseColor.rgb*=mix(.65,1.,smoothstep(-.22,.08,celtaSurface.y));
        `
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_physical_fragment>',
          `
          #include <lights_physical_fragment>
          #ifdef USE_CLEARCOAT
            material.clearcoat*=damp;
          #endif
        `
        )
      }
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        float grazing=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.5);
        vec3 edgeDirection=normalize((viewMatrix*vec4(1.,.3,-.25,0.)).xyz);
        outgoingLight+=celtaEdge*${timber ? "0.35" : "1.6"}*grazing*max(0.,dot(normal,edgeDirection));
        #include <opaque_fragment>`
      )
    }
    material.customProgramCacheKey = () => 'celta-edge-v2-' + timber
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromEquirectangular(textures.sky)
  pmrem.dispose()
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300)
  camera.layers.enable(1)
  const photoLens = createPhotoLens(renderer,camera)
  // Keep the HDR glow off touch devices: their direct render path saves bandwidth.
  const touchDevice = window.matchMedia('(pointer: coarse)').matches
  const useGlow = !touchDevice && container.clientWidth > 700
  const composer = useGlow
    ? new EffectComposer(
        renderer,
        new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.HalfFloatType,
          // Multisampled HDR targets produced an empty final buffer in Chrome.
          samples: 0,
        })
      )
    : null
  const renderPass = composer ? new RenderPass(null, camera) : null
  const bloom = composer
    ? new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.35, 1.7)
    : null
  const outputPass = composer ? new OutputPass() : null
  const antialiasPass = composer ? new ShaderPass(FXAAShader) : null
  if (composer) {
    composer.addPass(renderPass)
    composer.addPass(bloom)
    composer.addPass(outputPass)
    composer.addPass(antialiasPass)
  }
  renderer.info.autoReset = false
  let scene,
    world,
    player,
    water,
    objective,
    state = {
      chapter: 0,
      mission: 0,
      mode: 'menu',
      target: null,
      reducedMotion: false,
      quality: 'auto',
      activity: null,
    }
  let frame = 0,
    previous = 0,
    time = 0,
    lastHud = 0,
    lastPhotoHud = 0,
    stopped = false,
    frameSum = 0,
    frameCount = 0,
    distanceWalked = 0,
    cameraSide = -2.6,
    lastPausedFrame = 0,
    lastRigShadow = 0
  let currentWorld = '',
    near = false,
    guided = false,
    route = []
  let activeWorld, cameraYaw = 0, cameraPitch = .04, photoZoom = 1, photoFocus = 5, cameraDrag = null
  const raycaster = new THREE.Raycaster()
  const photoStatus = { ready:false, hint:'Encuadra el sujeto' }
  const photoOccludes = createPhotoOcclusionTest()
  const keys = new Set(),
    stick = { x: 0, y: 0 },
    obstacles = []
  const reusable = {
    look: new THREE.Vector3(),
    destination: new THREE.Vector3(),
    projected: new THREE.Vector3(),
  }
  const ownedMaterials = new Set(Object.values(materials).filter(Boolean)),
    ownedTextures = new Set(Object.values(textures)),
    ownedGeometry = new Set()
  const registerAsset = asset => asset.scene.traverse(object => {
    if (!object.isMesh) return
    ownedGeometry.add(object.geometry)
    object.castShadow = true
    object.receiveShadow = true
    const mats = Array.isArray(object.material) ? object.material : [object.material]
    mats.forEach(material => {
      // Professional PBR maps carry their own calibrated albedo and roughness.
      // The older image-atlas corrections below must not be applied a second time.
      const professional = /^(PH_|ACG_|BS_|MH_|Foliage_(broadleaf_|fern_scan|rachis_pachira))/.test(material.name)
      const albedoExposure=material.userData.albedoExposure
      if(professional && Number.isFinite(albedoExposure) && albedoExposure>0 && albedoExposure<=4 && !material.userData.celtaAlbedoExposureApplied) {
        material.color.multiplyScalar(albedoExposure)
        material.userData.celtaAlbedoExposureApplied=true
      }
      if (/^Foliage_(broadleaf_|fern_scan)/.test(material.name)) {
        // Thin leaves scatter a little sunlight through their back faces. This
        // uses the actual shadow map and keeps the photographic colour intact.
        const leafValue=(key,fallback)=>Number.isFinite(material.userData[key])?THREE.MathUtils.clamp(material.userData[key],0,1):fallback
        const backAlbedo=leafValue('backfaceAlbedoFactor',1)
        const backSpecular=leafValue('backfaceSpecularFactor',1)
        const frontSpecular=leafValue('frontSpecularFactor',1)
        const roughnessFloor=leafValue('roughnessFloor',0)
        const roughnessSpan=leafValue('roughnessSpan',1)
        material.onBeforeCompile=shader=>{
          shader.uniforms.celtaLeafSun={value:edgeLight}
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            diffuseColor.rgb*=gl_FrontFacing?1.:${backAlbedo.toFixed(4)};`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            roughnessFactor=clamp(${roughnessFloor.toFixed(4)}+roughnessFactor*${roughnessSpan.toFixed(4)},${roughnessFloor.toFixed(4)},${Math.min(1,roughnessFloor+roughnessSpan).toFixed(4)});`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
            float leafSpecularFace=gl_FrontFacing?${frontSpecular.toFixed(4)}:${backSpecular.toFixed(4)};
            reflectedLight.directSpecular*=leafSpecularFace;
            reflectedLight.indirectSpecular*=leafSpecularFace;`)
          shader.fragmentShader='uniform vec3 celtaLeafSun;\n'+shader.fragmentShader
          shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
          shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
            vec3 leafSunDirection=normalize((viewMatrix*vec4(.48,.38,-.79,0.)).xyz);
            float throughLeaf=pow(max(0.,dot(normal,-leafSunDirection)),.6);
            outgoingLight+=diffuseColor.rgb*celtaLeafSun*.6*throughLeaf*mix(.2,1.,getShadowMask());
            #include <opaque_fragment>`)
        }
        material.customProgramCacheKey=()=> 'celta-professional-leaf-scattering-'+[backAlbedo,backSpecular,frontSpecular,roughnessFloor,roughnessSpan].join('/')
      }
      if (professional && material.userData.surfaceRole==='soil') {
        material.onBeforeCompile=shader=>{
          shader.vertexShader='varying vec3 celtaSoilWorld;\n'+shader.vertexShader
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceltaSoilWorld=(modelMatrix*vec4(transformed,1.)).xyz;')
          shader.fragmentShader=`varying vec3 celtaSoilWorld;
            float celtaSoilNoise(vec2 p){
              vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
              float a=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
              float b=fract(sin(dot(cell+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);
              float c=fract(sin(dot(cell+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);
              float d=fract(sin(dot(cell+1.,vec2(127.1,311.7)))*43758.5453);
              return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
            }\n`+shader.fragmentShader
          shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            float dampPatch=smoothstep(.60,.80,celtaSoilNoise(celtaSoilWorld.xz*1.3));
            dampPatch*=1.-smoothstep(.2,1.6,celtaSoilWorld.y);
            roughnessFactor=mix(mix(.82,.98,roughnessFactor),.38,dampPatch);
            diffuseColor.rgb*=mix(1.,.72,dampPatch);`)
        }
        material.customProgramCacheKey=()=> 'celta-professional-soil-moisture'
      }
      const skinColor=material.userData.projectionFadeColor
      if (/^BS_.+_photoreal_skin$/.test(material.name) && material.userData.projectionFade && Array.isArray(skinColor) && skinColor.length===3 && skinColor.every(Number.isFinite)) {
        material.onBeforeCompile=shader=>{
          shader.uniforms.celtaSkinColor={value:new THREE.Color().setRGB(...skinColor)}
          shader.fragmentShader='uniform vec3 celtaSkinColor;\n'+shader.fragmentShader
          shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            #ifdef USE_MAP
              float portraitBlend=smoothstep(.015,.11,vMapUv.x)*(1.-smoothstep(.89,.985,vMapUv.x))*smoothstep(.03,.14,vMapUv.y)*(1.-smoothstep(.88,.99,vMapUv.y));
              diffuseColor.rgb=mix(diffuse*celtaSkinColor,diffuseColor.rgb,portraitBlend);
            #endif`)
        }
        material.customProgramCacheKey=()=> 'celta-blender-studio-portrait'
      }
      if (['Laterite','WornLaterite','BankMud'].includes(material.name) && !material.userData.celtaSurface) {
        material.userData.celtaSurface=true
        // Damp forest soil absorbs more light than the neutral source sample.
        // This is an art calibration; the authored map already has correct sRGB.
        material.color.multiply(new THREE.Color().setRGB(.48,.43,.37))
        material.onBeforeCompile=shader=>{
          shader.vertexShader='varying vec3 celtaGround;\n'+shader.vertexShader
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceltaGround=(modelMatrix*vec4(transformed,1.)).xyz;')
          shader.fragmentShader='varying vec3 celtaGround;\n'+shader.fragmentShader
          shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            float wet=smoothstep(.65,.82,.5+.25*sin(celtaGround.x*1.7+sin(celtaGround.z*1.3))+.25*sin(celtaGround.z*.8-celtaGround.x*.65));
            float bank=1.-smoothstep(.55,2.25,celtaGround.y);
            float dampBank=smoothstep(-3.4,-1.3,celtaGround.x)*(1.-smoothstep(1.3,2.5,celtaGround.y));
            roughnessFactor=mix(clamp(roughnessFactor,.72,.98),.25,wet*bank);
            diffuseColor.rgb*=mix(1.,.45,dampBank)*mix(1.,.65,bank*wet);`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
            material.specularColor*=mix(1.,.2,dampBank*(1.-wet));
            material.specularColorBlended=material.specularColor;`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
            reflectedLight.directSpecular*=mix(1.,.12,dampBank*(1.-wet));`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float riverBounce=(1.-smoothstep(.4,1.7,celtaGround.y))*smoothstep(-3.4,-1.3,celtaGround.x);
            outgoingLight+=vec3(.035,.025,.014)*riverBounce;
            #include <opaque_fragment>`)
        }
        material.customProgramCacheKey=()=> 'celta-authored-soil-pbr'
      }
      const cloth=/cotton|trousers|linen/i.test(material.name)
      const timber=['Timber','DarkTimber','WallBoards','Bark','BarkSculpt'].includes(material.name)
      const hair=/^Roger_(sunlit_)?hair$/.test(material.name)
      const leather=material.name==='Satchel chestnut leather'
      const broadleaf=material.name==='Foliage_broadleaf'
      if(broadleaf)material.roughness=.77
      if (!professional && (cloth || timber || hair || leather || broadleaf) && !material.userData.celtaEdge) {
        material.userData.celtaEdge=true
        material.onBeforeCompile=shader=>{
          shader.uniforms.celtaEdge={value:edgeLight}
          shader.fragmentShader='uniform vec3 celtaEdge;\n'+shader.fragmentShader
          // Reduce lighting baked into the original swatch around its measured
          // linear mean; real folds and normals provide the directional relief.
          if(material.name==='Khaki drill cotton' || leather) {
            const mean=leather?'vec3(.09347,.03822,.01636)':'vec3(.05899,.03737,.01556)'
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
              diffuseColor.rgb=mix(diffuse*${mean},diffuseColor.rgb,${leather?'.56':'.41'});`)
          }
          if(broadleaf)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
            diffuseColor.rgb=mix(diffuse*vec3(.0914,.10382,.03294),diffuseColor.rgb,.70);`)
          shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
            float fabricGrazing=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.5);
            vec3 bounceDirection=normalize((viewMatrix*vec4(.9,.35,.2,0.)).xyz);
            outgoingLight+=celtaEdge*${broadleaf?'0.':cloth?'.65':hair?'.7':leather?'.38':'.45'}*fabricGrazing*max(0.,dot(normal,bounceDirection));
            #include <opaque_fragment>`)
        }
        material.customProgramCacheKey=()=> 'celta-authored-bounce-'+material.name
      }
      ownedMaterials.add(material)
      if (!professional) material.envMapIntensity = leather ? 1.1 : hair ? .9 : .45
      Object.values(material).forEach(value => {
        if (value?.isTexture) {
          value.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy())
          ownedTextures.add(value)
        }
      })
    })
  })
  Object.values(assets).forEach(registerAsset)
  const loadAsset = name => {
    if (assets[name]) return Promise.resolve(assets[name])
    if (!pendingAssets.has(name)) pendingAssets.set(name,loader.loadAsync(`/celta/models/${name}.glb`).then(asset=>{assets[name]=asset;registerAsset(asset);return asset}))
    return pendingAssets.get(name)
  }
  let updateRevision = 0
  const model = name => {
    const result = cloneSkeleton(assets[name].scene)
    result.userData.legs = ['LeftLeg','RightLeg'].map(n => result.getObjectByName(n)).filter(Boolean)
    result.userData.arms = ['LeftArm','RightArm'].map(n => result.getObjectByName(n)).filter(Boolean)
    const idleClip=assets[name].animations?.find(clip=>clip.name==='Idle')
    if(idleClip) {
      const mixer=new THREE.AnimationMixer(result)
      const idle=mixer.clipAction(idleClip).play()
      const walkClip=assets[name].animations.find(clip=>clip.name==='Walk')
      const walk=walkClip ? mixer.clipAction(walkClip).setEffectiveWeight(0).play() : null
      result.userData.animation={mixer,idle,walk,blend:0}
    }
    return result
  }
  const understory = (kind,seed,scale=1,lowDetail=touchDevice) => {
    const variant=['A','B','C'][Math.abs(seed)%3]
    const base=kind==='LongPalm' ? 'LongPalmA' : kind==='CanopySpray' ? kind : kind+variant
    const name=base+(lowDetail?'Low':'')
    const source=assets.foliage.scene.getObjectByName(name)
    if(!source)throw new Error(`Missing Blender foliage: ${name}`)
    const result=source.clone(true)
    result.position.set(0,0,0)
    result.scale.multiplyScalar(scale)
    // Each placement can bend over the shore independently. The immutable
    // loaded meshes remain available when another chapter rebuilds the forest.
    result.traverse(mesh=>{
      if(mesh.isMesh)mesh.geometry=mesh.geometry.clone()
    })
    return result
  }
  const animateActor=(actor,speed,dt)=>{
    const animation=actor?.userData.animation
    if(!animation || state.mode==='paused')return false
    const {mixer,idle,walk}=animation
    if(state.reducedMotion && speed<.02) {
      animation.blend=0
      idle.setEffectiveWeight(1)
      walk?.setEffectiveWeight(0)
      mixer.setTime(0)
      return false
    }
    animation.blend=THREE.MathUtils.damp(animation.blend,walk && speed>.02 ? 1 : 0,10,dt)
    idle.setEffectiveWeight(1-animation.blend)
    if(walk) {
      walk.setEffectiveWeight(animation.blend)
      // The authored in-place cycle represents two 0.60 m steps.
      walk.setEffectiveTimeScale(Math.max(.15,speed/1.2))
    }
    mixer.update(dt)
    return true
  }
  const heightAt = (x,z) => currentWorld.endsWith('/true') ? 0 : groundHeight(activeWorld,x,z)
  let worldGeometries = new Set(),
    worldMaterials = new Set()
  const clearWorld = () => {
    if (!scene) return
    water?.getRenderTarget?.().dispose()
    scene.traverse((object) => {
      object.shadow?.map?.dispose()
      if(object.userData.animation) {
        object.userData.animation.mixer.stopAllAction()
        object.userData.animation.mixer.uncacheRoot(object)
      }
      if(object.isSkinnedMesh)object.skeleton.dispose()
      if (object.geometry && !ownedGeometry.has(object.geometry)) worldGeometries.add(object.geometry)
      const mats = Array.isArray(object.material)
        ? object.material
        : [object.material]
      mats.forEach((mat) => {
        if (mat && !ownedMaterials.has(mat)) worldMaterials.add(mat)
      })
    })
    worldGeometries.forEach((g) => g.dispose())
    worldGeometries.clear()
    worldMaterials.forEach((m) => {
      if (m.map && !ownedTextures.has(m.map)) m.map.dispose()
      m.dispose()
    })
    worldMaterials.clear()
    scene.clear()
    renderer.renderLists.dispose()
  }

  const add = (object, x = 0, z = 0, y = 0, rotation = 0) => {
    object.position.set(x, y, z)
    object.rotation.y = rotation
    world.add(object)
    return object
  }

  function rebuild() {
    clearWorld()
    renderer.shadowMap.needsUpdate = true
    const prison =
      state.chapter === 2 && state.mission >= 2 && state.mode !== 'menu'
    currentWorld = state.chapter + '/' + prison
    activeWorld = worlds[worldIds[state.chapter]]
    callbacks.onMap?.(activeWorld.walkableGrid)
    cameraYaw = 0
    cameraPitch = .04
    const p = palettes[state.chapter],
      rng = random(419 + state.chapter * 91)
    edgeLight
      .set(p.sun)
      .multiplyScalar(prison ? 0 : state.chapter === 0 ? 0.9 : 0.22)
    scene = new THREE.Scene()
    if (renderPass) renderPass.scene = scene
    scene.environment = prison ? null : environment.texture
    scene.environmentIntensity = state.chapter === 0 ? 0.32 : 0.3
    scene.background = new THREE.Color(prison ? '#171b1a' : p.fog)
    scene.fog = new THREE.FogExp2(
      prison ? '#171b1a' : p.fog,
      prison ? 0.045 : p.density * (composer ? 0.83 : 1)
    )
    world = new THREE.Group()
    cameraSide = -2.6
    obstacles.length = 0
    scene.add(
      new THREE.HemisphereLight(
        prison ? '#b5c7d2' : '#b0bcc0',
        prison ? '#302d28' : '#374938',
        prison ? 1.3 : .65
      )
    )
    const sun = new THREE.DirectionalLight(
      prison ? '#d6e2ed' : p.sun,
      prison ? 3 : state.chapter === 0 ? 5.1 : 3.8
    )
    sun.position.set(18, prison ? 18 : 19, -55)
    if (prison) sun.position.set(2, 6, -5)
    sun.target.position.set(prison ? -1 : -6, 0, prison ? -2 : -15)
    sun.castShadow = true
    sun.shadow.mapSize.set(touchDevice?2048:3072, touchDevice?2048:3072)
    Object.assign(sun.shadow.camera, {
      left: prison ? -6 : -26,
      right: prison ? 6 : 26,
      top: prison ? 6 : 26,
      bottom: prison ? -6 : -26,
      near: 0.5,
      far: 150,
    })
    sun.shadow.bias = -0.00035
    sun.shadow.normalBias = 0.02
    scene.add(sun, sun.target)
    const fill = new THREE.DirectionalLight(
      prison ? '#ccdbe4' : '#d6dfd8',
      prison ? 0.7 : .6
    )
    fill.position.set(8, 7, 6)
    scene.add(fill)
    if (!prison) {
      const rim = new THREE.DirectionalLight(
        state.chapter === 0 ? '#ffcf83' : p.sun,
        state.chapter === 0 ? 1.2 : .9
      )
      rim.position.set(10, 6, 8)
      rim.target.position.set(0, 1, -6)
      scene.add(rim, rim.target)
    }
    if (prison) {
      add(createPrison(materials))
      const lamp = new THREE.PointLight('#dfb36b', 8, 7, 2)
      lamp.position.set(-1.5, 2, -2)
      scene.add(lamp)
      water = null
    } else {
      scene.add(makeSky(p, textures.sky, state.chapter))
      water = makeWater(p,touchDevice)
      scene.add(water)
      const environmentModel = model(worldIds[state.chapter])
      environmentModel.name = 'Blender environment'
      environmentModel.traverse(object=>{
        if (!object.isMesh) return
        if (state.chapter<2 && object.material?.name==='Grass') object.visible=false
      })
      world.add(environmentModel)
      const npcName = ['witness-congo','witness-amazonia','contact-ireland'][state.chapter]
      const npcPosition = [[-8,-10],[-16,-25],[-12,-28]][state.chapter]
      const witness = add(model(npcName),npcPosition[0],npcPosition[1],heightAt(...npcPosition),Math.PI*.16)
      witness.name = 'Witness'
      // Navigation targets are kept outside solid architecture. These small
      // field props are separate from the authored Blender land and buildings.
      const desks = [[[-15,-22],[1,-34]],[[-16,-25],[-9,-27],[-17,-32],[3,-40]],[[0,-10]]][state.chapter]
      desks.forEach(([x,z],i) => add(state.chapter===2 ? createCrate(materials) : createDesk(materials),x,z,heightAt(x,z),i*.4))
      if (state.chapter < 2) {
        const forest = new THREE.Group()
        // Distant leaf clusters use matte diffuse lighting. Specular response
        // on thousands of subpixel leaves creates distracting sparkling rims.
        const farMaterials={...materials}
        for(const key of ['canopy','leaf','leafLight','leafDark','bark','barkDark','frond','leafVein']) {
          const leaf=['canopy','leaf','leafLight','leafDark'].includes(key)
          farMaterials[key]=leaf ? new THREE.MeshLambertMaterial({map:materials[key].map,color:key==='canopy'?'#63784d':'#4b623d',side:THREE.DoubleSide,alphaTest:key==='canopy'?.48:0,vertexColors:key==='canopy',fog:true}) : materials[key].clone()
          if(state.chapter!==0)continue
          farMaterials[key].onBeforeCompile=shader=>{
            shader.vertexShader='varying vec3 celtaForestWorld;\n'+shader.vertexShader
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceltaForestWorld=(modelMatrix*vec4(transformed,1.)).xyz;')
            shader.fragmentShader=`varying vec3 celtaForestWorld;
            float celtaCrownLight(vec2 p){
              vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
              float a=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
              float b=fract(sin(dot(cell+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);
              float c=fract(sin(dot(cell+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);
              float d=fract(sin(dot(cell+1.,vec2(127.1,311.7)))*43758.5453);
              return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
            }\n`+shader.fragmentShader
            // Scatter light before tone mapping, so the mobile direct renderer
            // and desktop HDR path see the same air, rather than a beige overlay.
            shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
              #ifdef USE_FOG
              float forestDistance=length(celtaForestWorld-cameraPosition);
              float sunCone=pow(max(0.,dot(normalize(celtaForestWorld-cameraPosition),normalize(vec3(.16,.125,-.98)))),115.);
              float crownShade=celtaCrownLight(celtaForestWorld.xz*.12);
              float crownDepth=celtaCrownLight(celtaForestWorld.xz*.035+vec2(9.,2.));
              outgoingLight*=mix(.68,1.12,crownShade)*mix(.91,1.09,crownDepth);
              // Distance into each bank separates actual tree layers. Camera
              // distance alone gave adjacent crowns the same gray veil.
              float upstream=smoothstep(70.,95.,-celtaForestWorld.z);
              float bankDepth=mix(max(0.,celtaForestWorld.x-42.),max(0.,-celtaForestWorld.z-84.),upstream);
              float middleLayer=smoothstep(4.,18.,bankDepth);
              float rearLayer=smoothstep(28.,55.,bankDepth);
              vec3 middleTint=mix(vec3(.92),vec3(.82,1.05,1.13),middleLayer*(1.-sunCone));
              outgoingLight*=middleTint;
              outgoingLight=mix(outgoingLight,outgoingLight*.65+vec3(.055,.078,.075),rearLayer);
              float extinction=mix(.0010,.0024,middleLayer)+rearLayer*.0006;
              float opticalDepth=max(0.,forestDistance-28.)*(extinction+sunCone*.006);
              float air=1.-exp(-opticalDepth);
              vec3 valleyHaze=mix(vec3(.24,.34,.32),vec3(.83,.67,.42),sunCone);
              outgoingLight=mix(outgoingLight,valleyHaze,air);
              #endif
              #include <opaque_fragment>`)
            shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','')
          }
          farMaterials[key].customProgramCacheKey=()=> 'celta-valley-scattering-v4'
        }
        const plant = (object,x,z,scale=1) => {
          object.position.set(x,heightAt(x,z),z)
          object.rotation.y = rng()*Math.PI*2
          object.scale.multiplyScalar(scale)
          forest.add(object)
        }
        // Dense distant treelines are shared texture meshes; the close terrain
        // and landmark trees are authored in Blender for each distinct region.
        const number = touchDevice ? 24 : 40
        for (let i=0;i<number;i++) {
          const x = -27-rng()*24, z = 8-rng()*91
          plant(createTree(farMaterials,{height:10+rng()*9,seed:730+i,palm:state.chapter===1 && i%5===0}),x,z)
        }
        const footpath={type:'path',points:[activeWorld.spawn,npcPosition,[-15,-22],[1,-34]],width:1.5}
        const onWalkway = (x,z) => activeWorld.walkSurfaces.some(surface=>surfaceContains(surface,x,z,.35)) || (state.chapter===0 && surfaceContains(footpath,x,z))
        for (let i=0;i<(touchDevice?750:1200);i++) {
          const x = -24+rng()*36, z = 10-rng()*59
          const arrivalClearing=state.chapter===0 && z>0 && x>-6 && x<1
          const dockSightline=state.chapter===0 && z<-20 && z>-37 && x>-7 && x<6
          if (!traversable(activeWorld,x,z) || heightAt(x,z)<.3 || onWalkway(x,z) || arrivalClearing || dockSightline || desks.some(d=>Math.hypot(x-d[0],z-d[1])<2.8) || Math.hypot(x-npcPosition[0],z-npcPosition[1])<2.6 || Math.hypot(x-activeWorld.spawn[0],z-activeWorld.spawn[1])<1.6) continue
          if(i%8===0) {
            plant(understory('Palm',4500+i,.55+rng()*.35,true),x,z)
            continue
          }
          if(z>-20 && i%3!==0) {
            plant(understory(i%4===1?'Broadleaf':'Shrub',4700+i,.8+rng()*.5,true),x,z)
            continue
          }
          // Keep the placement sequence while replacing the remaining flat
          // close branch cards with smaller three-dimensional scanned plants.
          const cards=Array.from({length:3},(_,j)=>({width:.8+rng()*.7,height:.6+rng()*.7,yaw:j*Math.PI/3+rng(),roll:rng()*.25}))
          const scanned=z>-20 || i%4===0
          const cluster=scanned?understory(i%2===0?'Broadleaf':'Shrub',950+i,.8,true):new THREE.Group()
          if(!scanned)cards.forEach((card,j)=>{
            const leaf=new THREE.Mesh(foliageCard(card.width,card.height,950+i*3+j),materials.branchCard)
            leaf.rotation.set(-.3,card.yaw,card.roll)
            leaf.position.y=.35
            leaf.castShadow=true;leaf.receiveShadow=true
            cluster.add(leaf)
          })
          plant(cluster,x,z,.7+rng()*.85)
          if(i%4===0)plant(understory('Palm',950+i,.45+rng()*.45,true),x+.3,z+.3)
        }
        if(state.chapter===0) {
          // Deliberately composed continuous banks of undergrowth, rather than
          // isolated randomly spaced shrubs around the arrival clearing.
          for(let row=0;row<23;row++) {
            const z=2-row*.60
            const center=-3+(z-3)*5/13
            for(let column=0;column<6;column++) {
              const x=center-1.15-column*.72+(rng()-.5)*.22
              if(!traversable(activeWorld,x,z) || (z>0 && x>-6) || Math.hypot(x+8,z+10)<2.8)continue
              const scale=.40+rng()*.25
              const kind=(row+column)%4===0 || (row+column)%7===2 ? 'Broadleaf' : (row+column)%5===0 ? 'Palm' : 'Shrub'
              plant(understory(kind,3100+row*6+column,scale*1.3),x,z)
              if(column%2===0) {
                const leaf=understory('Broadleaf',3300+row+column,.55)
                leaf.rotation.x=-.3;leaf.castShadow=true;leaf.receiveShadow=true
                plant(leaf,x+.1,z+.2,.8)
                leaf.position.y+=.03
              }
            }
          }
          // Follow the inside bend of the path without placing leaves between
          // the arrival camera and Roger's silhouette.
          for(const [i,point] of [[-6,1],[-5.7,2],[-5.2,3],[-4.9,4],[-4.4,4.7]].entries()) {
            for(let j=0;j<3;j++)plant(understory(j===0?'Broadleaf':j===1?'Shrub':'Palm',4200+i*3+j,j===0?(i<3?.92:.7):.85),point[0]-j*.5,point[1]+j*.08)
          }
          // Overhanging fronds anchor the close river edge after erosion.
          for(const [i,point] of [[-.65,.2],[-.7,1.4],[-1,2.2],[-.4,.9],[-.5,2.6]].entries()) {
            const longFrond=i===0 || i===4
            const palm=understory(longFrond?'LongPalm':i===2?'Broadleaf':'Palm',4300+i,.9+(i%3)*.08)
            palm.scale.x*=1.05;palm.scale.z*=1.05
            plant(palm,...point)
            // Keep the professional fronds' natural blade widths. Only the
            // two original long palms retain the authored path-side shortening.
            if(!longFrond) {palm.position.x+=.28;continue}
            // Keep the overhang on the river side; shorten only the fronds
            // reaching over the walking track, without lowering the crown.
            palm.updateMatrixWorld(true)
            const vertex=new THREE.Vector3(),edge=point[0]-.55
            palm.traverse(mesh=>{
              if(!mesh.isMesh)return
              const inverse=mesh.matrixWorld.clone().invert(),positions=mesh.geometry.attributes.position
              for(let n=0;n<positions.count;n++) {
                vertex.fromBufferAttribute(positions,n).applyMatrix4(mesh.matrixWorld)
                if(vertex.x<edge)vertex.x=edge+(vertex.x-edge)*.25
                vertex.applyMatrix4(inverse)
                positions.setXYZ(n,vertex.x,vertex.y,vertex.z)
              }
              mesh.geometry.computeVertexNormals()
            })
          }
          for(const [i,point] of [[-1.05,.1],[-1.2,1.2],[-1.4,2.0]].entries()) {
            plant(understory('Shrub',2,.55+i*.04),...point)
          }
          // Authored stones and branching roots replace the cosmetic tubes.
          if(!environmentModel.getObjectByName('RootWood')) {
            for(let i=0;i<(touchDevice?340:650);i++) {
              const x=-13+rng()*17,z=7-rng()*25
              if(!traversable(activeWorld,x,z) || activeWorld.walkSurfaces.some(surface=>surfaceContains(surface,x,z)))continue
              const stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.032+rng()*.078,0),materials.stoneDark)
              stone.scale.set(.8+rng()*.7,.4+rng()*.3,1)
              stone.castShadow=true;stone.receiveShadow=true
              plant(stone,x,z)
              stone.position.y-=.045
            }
            for(let i=0;i<28;i++) {
              const sampled=[-11+rng()*10,5-rng()*17]
              const [x,z]=[[-4.8,5.5],[-3.1,6.3],[-4.1,3.9],[-2.4,4.8],[-4.7,1.2],[-3.7,-.5]][i] || sampled
              if(!traversable(activeWorld,x,z))continue
              const angle=rng()*Math.PI*2,length=.45+rng()*.8,bend=(rng()-.5)*.35
              const points=Array.from({length:6},(_,j)=>{
                const t=j/5,across=Math.sin(t*Math.PI)*bend
                const px=x+Math.cos(angle)*length*t-Math.sin(angle)*across
                const pz=z+Math.sin(angle)*length*t+Math.cos(angle)*across
                return new THREE.Vector3(px,heightAt(px,pz)+.008-.018*Math.max(0,Math.sin(t*13+i)),pz)
              })
              const curve=new THREE.CatmullRomCurve3(points)
              const geometry=new THREE.TubeGeometry(curve,18,.035+rng()*.022,7,false)
              const vertices=geometry.attributes.position
              for(let j=0;j<vertices.count;j++) {
                const t=Math.floor(j/8)/18,center=curve.getPointAt(t)
                const taper=.16+.84*Math.pow(Math.sin(t*Math.PI),.7)
                const px=center.x+(vertices.getX(j)-center.x)*taper,pz=center.z+(vertices.getZ(j)-center.z)*taper
                vertices.setXYZ(j,px,heightAt(px,pz)+.002+(vertices.getY(j)-center.y)*taper*.45,pz)
              }
              geometry.computeVertexNormals()
              const root=new THREE.Mesh(geometry,materials.bark)
              root.castShadow=true;root.receiveShadow=true;forest.add(root)
              if(i<6) {
                const origin=curve.getPointAt(.48),turn=angle+(i%2 ? .8 : -.9)
                const twigPoints=Array.from({length:5},(_,j)=>{
                  const t=j/4,px=origin.x+Math.cos(turn)*length*.55*t,pz=origin.z+Math.sin(turn)*length*.55*t
                  return new THREE.Vector3(px,heightAt(px,pz)+.006-.008*t,pz)
                })
                const twigCurve=new THREE.CatmullRomCurve3(twigPoints)
                const twigGeometry=new THREE.TubeGeometry(twigCurve,12,.022,5,false)
                const attr=twigGeometry.attributes.position
                for(let v=0;v<attr.count;v++) {
                  const t=Math.floor(v/6)/12,center=twigCurve.getPointAt(t),taper=1.-t*.92
                  const px=center.x+(attr.getX(v)-center.x)*taper,pz=center.z+(attr.getZ(v)-center.z)*taper
                  attr.setXYZ(v,px,heightAt(px,pz)+.002+(attr.getY(v)-center.y)*taper*.50,pz)
                }
                twigGeometry.computeVertexNormals()
                const twig=new THREE.Mesh(twigGeometry,materials.bark)
                twig.castShadow=true;twig.receiveShadow=true;forest.add(twig)
              }
            }
          }
        }
        for(const tree of activeWorld.heroTrees || []) {
          for(let j=0;j<7;j++) {
            const crown = new THREE.Mesh(foliageCard(tree.canopyRadius*1.5,tree.canopyRadius,1800+j),materials.canopy)
            const angle=j/7*Math.PI*2
            crown.position.set(tree.x+Math.cos(angle)*tree.canopyRadius*.42,tree.y+tree.height*.82+Math.sin(j*2)*.8,tree.z+Math.sin(angle)*tree.canopyRadius*.4)
            crown.rotation.set(-.2,angle,Math.sin(j)*.3)
            crown.castShadow=true;crown.receiveShadow=true
            forest.add(crown)
          }
        }
        // The far shore gives the Congo a river channel and encloses the
        // Amazon wetlands; Ireland alone retains an open Atlantic horizon.
        const bank = new THREE.PlaneGeometry(90,190,24,44)
        bank.rotateX(-Math.PI/2)
        const vertices=bank.attributes.position
        const east=state.chapter===0?42:31
        for(let i=0;i<vertices.count;i++) {
          const x=vertices.getX(i)+east+40,z=vertices.getZ(i)-35
          const edge=Math.min(1,Math.max(0,(x-east)/12))
          vertices.setXYZ(i,x,(2+Math.sin(z*.08)*1.2+Math.sin(x*.09)*1.3)*edge-.15,z)
        }
        bank.computeVertexNormals()
        const bankMesh=new THREE.Mesh(bank,new THREE.MeshStandardMaterial({color:'#294431',roughness:1,map:textures.ground}))
        bankMesh.receiveShadow=true;world.add(bankMesh)
        // The upstream forest stands on a modeled bank as well as the east
        // shore; without this closure the sky showed through to an endless sea.
        const northBank=new THREE.PlaneGeometry(184,45,46,12)
        northBank.rotateX(-Math.PI/2)
        const northVertices=northBank.attributes.position
        for(let i=0;i<northVertices.count;i++) {
          const x=northVertices.getX(i)+29,z=northVertices.getZ(i)-108
          const inland=THREE.MathUtils.smoothstep(-z,87,106)
          const height=(4.5+Math.sin(x*.055)*1.3+Math.sin(x*.19+z*.08)*.8)*inland-.12
          const inlet=Math.sin(x*.09)*3+Math.sin(x*.22+1.7)*1.8
          northVertices.setXYZ(i,x,height,z+inlet)
        }
        northBank.computeVertexNormals()
        const northBankMaterial=new THREE.MeshLambertMaterial({color:'#344638',map:textures.ground})
        northBankMaterial.onBeforeCompile=farMaterials.canopy.onBeforeCompile
        northBankMaterial.customProgramCacheKey=()=> 'celta-riverbank-depth'
        const northBankMesh=new THREE.Mesh(northBank,northBankMaterial)
        northBankMesh.receiveShadow=true;world.add(northBankMesh)
        const farRng=random(1807+state.chapter*73)
        for(let i=0;i<(touchDevice?23:34);i++) {
          const z=22-i*5+farRng()*4,x=east+Math.sin(i*.7)*5+farRng()*9
          const tree=createTree(farMaterials,{height:10+farRng()*7,seed:1300+i,palm:state.chapter===1 && i%4===0})
          tree.position.set(x,1,z);forest.add(tree)
        }
        // A continuous, irregular forest closes the upstream horizon. Multiple
        // canopy heights conceal the artificial pole-like gaps between trunks.
        for(let i=0;i<(touchDevice?22:32);i++) {
          const x=-55+i*5.7+farRng()*4,z=-91-farRng()*15
          const tree=createTree(farMaterials,{height:(x>15 && x<45 ? 7+farRng()*3 : 9+farRng()*8),seed:2100+i})
          tree.position.set(x,0,z);forest.add(tree)
        }
        // An uneven middle storey closes the bare trunk gaps along the river.
        // Separate silhouettes give the atmosphere actual depth to scatter through.
        const middleRng=random(18271+state.chapter*41)
        const scanCanopyMaterials=new Map()
        const scanCrown=(seed,scale)=>{
          const crown=understory('CanopySpray',seed,scale,true)
          crown.traverse(mesh=>{
            if(!mesh.isMesh)return
            const original=mesh.material
            if(!scanCanopyMaterials.has(original.uuid)) {
              const matte=new THREE.MeshLambertMaterial({
                map:original.map,color:original.color,normalMap:original.normalMap,
                normalScale:original.normalScale,side:THREE.DoubleSide,
                alphaTest:original.alphaTest,vertexColors:original.vertexColors,fog:true,
              })
              matte.onBeforeCompile=farMaterials.canopy.onBeforeCompile
              matte.customProgramCacheKey=()=> 'celta-scanned-canopy-depth'
              scanCanopyMaterials.set(original.uuid,matte)
            }
            mesh.material=scanCanopyMaterials.get(original.uuid)
          })
          return crown
        }
        // A rear canopy really sits behind the riverbank trees. Its smaller
        // projected leaves and longer air path make a third depth layer.
        const rearRng=random(9327+state.chapter*41)
        for(let i=0;i<(touchDevice?24:38);i++) {
          const x=-60+i*(touchDevice?7.5:4.8)+rearRng()*3
          const z=-147-rearRng()*18
          const height=19+rearRng()*10
          for(let branch=0;branch<18;branch++) {
            const angle=branch*2.399+i
            const crown=scanCrown(9100+i*18+branch,1.6+rearRng()*.8)
            const radius=height*(.05+rearRng()*.12)
            crown.position.set(x+Math.cos(angle)*radius,4+height*(.32+rearRng()*.23),z+Math.sin(angle)*radius)
            crown.rotation.set((rearRng()-.5)*.35,angle,(rearRng()-.5)*.3)
            forest.add(crown)
          }
        }
        for(let i=0;i<(touchDevice?25:40);i++) {
          const upstream=i%2===0
          const x=upstream?-35+middleRng()*112:east+1+middleRng()*9
          const z=upstream?-83-middleRng()*9:12-middleRng()*135
          const height=4.5+middleRng()*4.5
          const tree=i%4===1 ? createTree(farMaterials,{height,seed:5100+i,palm:true}) : new THREE.Group()
          if(i%4!==1)for(let branch=0;branch<4;branch++) {
            const crown=scanCrown(5100+i*4+branch,height*.32)
            const angle=branch*Math.PI*.5+i
            crown.position.set(Math.cos(angle)*height*.16,height*(.22+(branch%2)*.14),Math.sin(angle)*height*.16)
            crown.rotation.y=angle
            tree.add(crown)
          }
          tree.position.set(x,.6,z)
          tree.rotation.y=middleRng()*Math.PI*2
          forest.add(tree)
        }
        // Continuous three-dimensional understory replaces the oversized
        // vertical leaf cards. Staggered rows close the bright holes under the
        // tree canopy while retaining a separate, cooler background layer.
        const shoreRng=random(7221+state.chapter*31)
        const shoreCount=touchDevice?46:60
        for(let layer=0;layer<(touchDevice?2:3);layer++) {
          for(let side=0;side<2;side++)for(let i=0;i<shoreCount;i++) {
            const t=(i+shoreRng()*.6)/shoreCount
            const x=side===0?-53+t*177:east+layer*4+shoreRng()*2
            const z=side===0?-86-layer*5-shoreRng()*3:24-t*179
            const height=2.4+shoreRng()*2.2
            for(let branch=0;branch<3;branch++) {
              const crown=scanCrown(7200+i*3+branch,height)
              const angle=shoreRng()*Math.PI*2
              crown.position.set(x+Math.cos(angle)*1.2,.35+layer*.6+branch*1.5,z+Math.sin(angle)*1.2)
              crown.rotation.set((shoreRng()-.5)*.3,angle,(shoreRng()-.5)*.22)
              crown.receiveShadow=true
              forest.add(crown)
            }
          }
        }
        const batched = batchStatic(forest)
        forest.traverse(object=>object.geometry?.dispose())
        world.add(batched)
      }
      if (state.chapter === 1) {
        const rain = [], rainGeo = new THREE.BufferGeometry()
        for(let i=0;i<400;i++)rain.push(rng()*60-30,rng()*18,rng()*65-45)
        rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(rain,3))
        const rainMesh = new THREE.Points(rainGeo,new THREE.PointsMaterial({color:'#cbddd0',size:.025,transparent:true,opacity:.35}))
        rainMesh.name = 'rain'
        scene.add(rainMesh)
      }
    }
    scene.add(world)
    player = model('roger')
    scene.add(player)
    const starts = prison ? [0,1.8] : activeWorld.spawn
    player.position.set(starts[0],heightAt(...starts),starts[1])
    player.rotation.y = 0
    objective = marker()
    scene.add(objective)
    guided = false
    route = []
    camera.position.set(prison ? 3 : -3.7, prison ? 3.1 : 3.8, prison ? 6 : 8.8)
    camera.lookAt(prison ? 0 : -3, prison ? 1 : 2, prison ? -2 : -7)
    setTarget(state.target)
    resize()
  }

  function setTarget(target) {
    state.target = target
    if (target && objective) objective.position.set(target[0], heightAt(...target), target[1])
    if (objective) objective.visible = !!target && state.mode === 'play'
    near = false
  }

  function resize() {
    const width = container.clientWidth,
      height = container.clientHeight
    const limit =
      state.quality === 'high'
        ? 1.75
        : state.quality === 'low'
        ? 0.85
        : width < 800
        ? 1.15
        : 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, limit))
    renderer.setSize(width, height)
    if (composer) {
      composer.setPixelRatio(
        Math.min(state.quality === 'high' ? 1.35 : 1, renderer.getPixelRatio())
      )
      composer.setSize(width, height)
      antialiasPass.uniforms.resolution.value.set(
        1 / composer.readBuffer.width,
        1 / composer.readBuffer.height
      )
    }
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    lastPausedFrame = 0
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)

  function walkable(x, z) {
    if (currentWorld.endsWith('/true'))
      return x > -2.4 && x < 2.4 && z > -3 && z < 3
    return traversable(activeWorld,x,z,obstacles)
  }

  function guide() {
    if (!state.target || state.mode !== 'play') return
    route = findWalkingPath(
      [player.position.x, player.position.z],
      state.target,
      walkable,
      currentWorld.endsWith('/true'),
      activeWorld.bounds
    )
    guided = route.length > 0
    callbacks.onGuide?.(guided)
  }
  const resetInput = () => {
    keys.clear()
    stick.x = stick.y = 0
    guided = false
    route = []
    callbacks.onGuide?.(false)
  }
  function down(e) {
    if (!['play','photo'].includes(state.mode) || e.target.closest('input,select,textarea'))
      return
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Shift',
        ' ',
        'w',
        'a',
        's',
        'd',
        'W',
        'A',
        'S',
        'D',
      ].includes(e.key)
    ) {
      e.preventDefault()
      keys.add(e.key.toLowerCase())
      guided = false
      callbacks.onGuide?.(false)
    }
  }
  const up = (e) => keys.delete(e.key.toLowerCase())
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', resetInput)
  document.addEventListener('visibilitychange', resetInput)
  function tick(now) {
    if (stopped) return
    frame = requestAnimationFrame(tick)
    if (document.hidden) {
      previous = now
      return
    }
    const elapsed = (now - (previous || now)) / 1000
    const dt = Math.min(elapsed, 0.045)
    previous = now
    if (state.mode === 'paused') {
      if (now - lastPausedFrame < 1000) return
      lastPausedFrame = now
    } else time += dt
    const witness = world.getObjectByName('Witness')
    let actorSpeed=0
    if (state.mode === 'play' || state.mode === 'photo') {
      let dx =
        (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
        (keys.has('a') || keys.has('arrowleft') ? 1 : 0) +
        stick.x
      let dz =
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
        (keys.has('w') || keys.has('arrowup') ? 1 : 0) +
        stick.y
      if (!guided) {
        const x = dx, z = dz
        dx = x*Math.cos(cameraYaw)-z*Math.sin(cameraYaw)
        dz = x*Math.sin(cameraYaw)+z*Math.cos(cameraYaw)
      }
      // Stop at a useful interaction distance. Walking all the way to the
      // marker could leave the field camera inside its minimum focus range,
      // depending on how quickly a conversation button was pressed.
      if (guided && state.target && Math.hypot(state.target[0]-player.position.x,state.target[1]-player.position.z)<2.55) {
        route=[]
        guided=false
        callbacks.onGuide?.(false)
      }
      if (guided && route.length) {
        const target = route[0],
          x = target[0] - player.position.x,
          z = target[1] - player.position.z,
          len = Math.hypot(x, z)
        if (len < 0.15) {
          route.shift()
          if (!route.length) {
            guided = false
            callbacks.onGuide?.(false)
          }
        } else {
          dx = x / len
          dz = z / len
        }
      }
      const length = Math.hypot(dx, dz)
      if (length > 0.08) {
        renderer.shadowMap.needsUpdate = true
        dx /= Math.max(length, 1)
        dz /= Math.max(length, 1)
        const oldX=player.position.x,oldZ=player.position.z
        const speed = (state.mode === 'photo' ? 1.25 : keys.has('shift') ? 3.4 : 2.1) * dt
        const nx = player.position.x + dx * speed,
          nz = player.position.z + dz * speed
        if (walkable(nx, player.position.z)) player.position.x = nx
        if (walkable(player.position.x, nz)) player.position.z = nz
        const angle = Math.atan2(-dx, -dz)
        let delta = angle - player.rotation.y
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        player.rotation.y += delta * Math.min(1, dt * 12)
        const distance=Math.hypot(player.position.x-oldX,player.position.z-oldZ)
        distanceWalked += distance
        actorSpeed=dt>0 ? distance/dt : 0
      }
      player.position.y = heightAt(player.position.x,player.position.z)
      if(!player.userData.animation)player.userData.legs?.forEach(
        (leg, i) =>
          (leg.rotation.x =
            length > 0.08
              ? Math.sin(distanceWalked * 5 + i * Math.PI) * 0.44
              : leg.rotation.x * 0.8)
      )
      if(!player.userData.animation)player.userData.arms?.forEach(
        (arm, i) =>
          (arm.rotation.x =
            length > 0.08
              ? Math.sin(distanceWalked * 5 + i * Math.PI) * -0.28
              : arm.rotation.x * 0.8)
      )
      const prison = currentWorld.endsWith('/true')
      if (witness && witness.position.distanceTo(player.position)<12) {
        const angle=Math.atan2(witness.position.x-player.position.x,witness.position.z-player.position.z)
        const delta=Math.atan2(Math.sin(angle-witness.rotation.y),Math.cos(angle-witness.rotation.y))
        witness.rotation.y+=delta*Math.min(1,dt*3)
      }
      if (state.mode === 'photo') {
        camera.position.copy(player.position).add(new THREE.Vector3(0,1.72,0))
        reusable.look.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),-Math.cos(cameraYaw)*Math.cos(cameraPitch)).add(camera.position)
        camera.lookAt(reusable.look)
        camera.fov = 56/photoZoom
      } else {
        const back = prison ? 3.5 : camera.aspect<.8 ? 5.1 : 4.2
        const side = .8
        reusable.destination.set(
          player.position.x-Math.sin(cameraYaw)*back+Math.cos(cameraYaw)*side,
          player.position.y+2.25+cameraPitch*2.5,
          player.position.z+Math.cos(cameraYaw)*back+Math.sin(cameraYaw)*side
        )
        const cameraFloor = heightAt(reusable.destination.x,reusable.destination.z)+.6
        reusable.destination.y = Math.max(reusable.destination.y,cameraFloor)
        const pivot = reusable.look.set(player.position.x,player.position.y+1.5,player.position.z)
        const direction = reusable.destination.clone().sub(pivot)
        const horizontal=direction.x*direction.x+direction.z*direction.z
        let cameraFraction=1
        for(const collider of activeWorld.colliders || []) {
          const t=((collider.x-pivot.x)*direction.x+(collider.z-pivot.z)*direction.z)/(horizontal || 1)
          if(t<=0 || t>=cameraFraction)continue
          const separation=Math.hypot(pivot.x+direction.x*t-collider.x,pivot.z+direction.z*t-collider.z)
          if(separation<collider.r+.3) cameraFraction=Math.max(.2,t-(collider.r+.35)/Math.sqrt(horizontal))
        }
        if(cameraFraction<1)reusable.destination.copy(pivot).addScaledVector(direction,cameraFraction)
        camera.position.lerp(reusable.destination,state.reducedMotion ? 1 : 1-Math.exp(-dt*6))
        reusable.look.set(player.position.x+Math.sin(cameraYaw)*1.8,player.position.y+1.3+cameraPitch*3,player.position.z-Math.cos(cameraYaw)*1.8)
        camera.lookAt(reusable.look)
        camera.fov = 52
      }
      camera.updateProjectionMatrix()
    } else if (state.mode === 'menu' || state.mode === 'cinematic') {
      const portrait = camera.aspect < .8
      const spawn = activeWorld.spawn
      const angle = state.mode === 'cinematic' && !state.reducedMotion ? Math.sin(time*.11)*.15 : 0
      camera.position.set(spawn[0]+(portrait?-4:-4)+angle,heightAt(...spawn)+(portrait?3.5:3),spawn[1]+9)
      camera.lookAt(spawn[0]+(portrait?3.7:6),heightAt(...spawn)+(portrait?2.4:1.7),spawn[1]-12)
      camera.fov = 48
      camera.updateProjectionMatrix()
    }
    const actorAnimated=animateActor(player,actorSpeed,dt)
    const witnessAnimated=animateActor(witness,0,dt)
    if((actorAnimated || witnessAnimated) && now-lastRigShadow>250) {
      renderer.shadowMap.needsUpdate=true
      lastRigShadow=now
    }
    player.visible = state.mode !== 'photo'
    if (water)
      water.material.uniforms.time.value = state.reducedMotion ? 0 : time
    if (objective) objective.visible=state.mode==='play' && !near
    if (objective && !state.reducedMotion) {
      objective.children[0].rotation.y = time * 0.5
      objective.children[0].position.y = 2.6 + Math.sin(time * 2) * 0.08
    }
    const rain = scene.getObjectByName('rain')
    if (rain && !state.reducedMotion) rain.position.y = -(time * 3) % 8
    if (now - lastHud > 120 && player) {
      lastHud = now
      let distance = Infinity
      if (state.target)
        distance = Math.hypot(
          state.target[0] - player.position.x,
          state.target[1] - player.position.z
        )
      near = distance < 2.8
      if (state.target) {
        reusable.projected
          .set(state.target[0], heightAt(...state.target)+2.5, state.target[1])
          .project(camera)
      }
      callbacks.onUpdate?.({
        x: player.position.x,
        yaw: cameraYaw,
        z: player.position.z,
        near,
        distance: Number.isFinite(distance) ? Math.round(distance) : 0,
        markerX: (reusable.projected.x * 0.5 + 0.5) * 100,
        markerY: (-0.5 * reusable.projected.y + 0.5) * 100,
        markerVisible:
          !!state.target &&
          reusable.projected.z < 1 &&
          Math.abs(reusable.projected.x) < 0.95 &&
          Math.abs(reusable.projected.y) < 0.9,
      })
    }
    if (state.mode === 'photo' && now-lastPhotoHud>110) {updatePhotoStatus();lastPhotoHud=now}
    renderer.info.reset()
    if (state.mode==='photo') photoLens.render(scene,photoFocus,state.quality==='low')
    else if (composer && state.quality !== 'low') composer.render(dt)
    else renderer.render(scene, camera)
    if (dt > 0 && ['play','photo'].includes(state.mode)) {
      frameSum += elapsed
      frameCount++
      if (frameCount >= 120) {
        const fps = Math.round(frameCount / frameSum)
        callbacks.onPerformance?.({
          fps,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          pixelRatio: renderer.getPixelRatio(),
          renderWidth: renderer.domElement.width,
          renderHeight: renderer.domElement.height,
        })
        if (
          fps < 38 &&
          state.quality === 'auto' &&
          renderer.getPixelRatio() > 0.85
        ) {
          renderer.setPixelRatio(
            Math.max(0.85, renderer.getPixelRatio() - 0.15)
          )
          composer?.setPixelRatio(
            Math.min(
              state.quality === 'high' ? 1.35 : 1,
              renderer.getPixelRatio()
            )
          )
          if (antialiasPass)
            antialiasPass.uniforms.resolution.value.set(
              1 / composer.readBuffer.width,
              1 / composer.readBuffer.height
            )
        }
        frameSum = 0
        frameCount = 0
      }
    }
  }

  function aimAtSubject() {
    if (!state.activity?.position || !player) return
    const subject=state.activity.subjectPosition
    const [x,z] = subject ? [subject[0],subject[2]] : state.activity.position
    const eyeY = player.position.y+1.72
    const y = subject ? subject[1] : heightAt(x,z)+(state.activity.height || 1.2)
    cameraYaw = Math.atan2(x-player.position.x,-(z-player.position.z))
    cameraPitch = Math.atan2(y-eyeY,Math.hypot(x-player.position.x,z-player.position.z))
  }
  function updatePhotoStatus() {
    const activity = state.activity
    if (!activity?.position) return
    if (activity.type!=='photo') {
      Object.assign(photoStatus,{ready:true,sharp:true,inFrame:true,range:true,occluded:false,hint:'Fotografía libre · Encuadra el paisaje y dispara cuando quieras.'})
      callbacks.onPhoto?.({...photoStatus,zoom:photoZoom,focus:photoFocus})
      return
    }
    const [x,z] = activity.position
    const point = activity.subjectPosition ? new THREE.Vector3(...activity.subjectPosition) : new THREE.Vector3(x,heightAt(x,z)+(activity.height || 1.2),z)
    const projected = point.clone().project(camera)
    const distance = camera.position.distanceTo(point)
    const direction = point.clone().sub(camera.position).normalize()
    raycaster.set(camera.position,direction)
    raycaster.far = Math.max(0,distance-(activity.radius || .6))
    const occluded = raycaster.intersectObjects(world.children,true).some(photoOccludes)
    const coverage = (activity.radius || .6)/(Math.max(distance,.1)*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)))
    Object.assign(photoStatus,assessPhotograph({distance,frameX:projected.x,frameY:projected.y,depth:projected.z,focus:photoFocus,occluded,coverage}))
    callbacks.onPhoto?.({...photoStatus,zoom:photoZoom,focus:photoFocus})
  }
  function photograph() {
    if (state.mode !== 'photo') return null
    updatePhotoStatus()
    if (!photoStatus.ready) return {error:photoStatus.hint}
    player.visible = false
    photoLens.render(scene,photoFocus,state.quality==='low')
    const output = document.createElement('canvas')
    output.width = 720
    output.height = Math.round(720/camera.aspect)
    if (output.height>960) { output.height=960;output.width=Math.round(960*camera.aspect) }
    output.getContext('2d').drawImage(renderer.domElement,0,0,output.width,output.height)
    let image = output.toDataURL('image/jpeg',.66)
    if (image.length>210000) image = output.toDataURL('image/jpeg',.4)
    return {image,...photoStatus}
  }
  const pointerDown = event => {
    if (!['play','photo'].includes(state.mode)) return
    cameraDrag = {id:event.pointerId,x:event.clientX,y:event.clientY}
    renderer.domElement.setPointerCapture(event.pointerId)
  }
  const pointerMove = event => {
    if (!cameraDrag || cameraDrag.id!==event.pointerId) return
    cameraYaw -= (event.clientX-cameraDrag.x)*.005
    cameraPitch = THREE.MathUtils.clamp(cameraPitch-(event.clientY-cameraDrag.y)*.004,-.6,.65)
    cameraDrag.x=event.clientX;cameraDrag.y=event.clientY
  }
  const pointerUp = () => {cameraDrag=null}
  renderer.domElement.addEventListener('pointerdown',pointerDown)
  renderer.domElement.addEventListener('pointermove',pointerMove)
  renderer.domElement.addEventListener('pointerup',pointerUp)
  renderer.domElement.addEventListener('pointercancel',pointerUp)
  renderer.domElement.style.touchAction='none'

  rebuild()
  frame = requestAnimationFrame(tick)
  const contextLost = (e) => {
    e.preventDefault()
    callbacks.onError?.(
      'La escena 3D se ha interrumpido. Tu progreso está guardado. Recarga para continuar.'
    )
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  return {
    async update(next) {
      const revision = ++updateRevision
      const names = [worldIds[next.chapter],['witness-congo','witness-amazonia','contact-ireland'][next.chapter]]
      if (names.some(name=>!assets[name])) {
        callbacks.onLoading?.(true)
        state.mode='paused'
        try { await Promise.all(names.map(loadAsset)) }
        catch { callbacks.onLoading?.(false);callbacks.onError?.('No se pudo cargar este territorio. Tu expediente está guardado; recarga para continuar.');return }
        if (revision!==updateRevision || stopped) return
        callbacks.onLoading?.(false)
      }
      const previousMode = state.mode,
        previousMission = state.mission
      state = { ...state, ...next }
      const prison =
        state.chapter === 2 && state.mission >= 2 && state.mode !== 'menu'
      if (currentWorld !== state.chapter + '/' + prison) rebuild()
      if (previousMode !== state.mode || previousMission !== state.mission)
        resetInput()
      if (previousMode !== 'photo' && previousMode !== 'paused' && state.mode === 'photo') {
        aimAtSubject()
      }
      setTarget(state.target)
      resize()
    },
    joystick(x, y) {
      stick.x = x
      stick.y = y
      if (x || y) {
        guided = false
        callbacks.onGuide?.(false)
      }
    },
    guide,
    aimAtSubject,
    photograph,
    setLens(zoom,focus) {photoZoom=THREE.MathUtils.clamp(zoom,1,3);photoFocus=THREE.MathUtils.clamp(focus,1,20)},
    isNear: () => near,
    dispose() {
      stopped = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', resetInput)
      document.removeEventListener('visibilitychange', resetInput)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      renderer.domElement.removeEventListener('pointerdown',pointerDown)
      renderer.domElement.removeEventListener('pointermove',pointerMove)
      renderer.domElement.removeEventListener('pointerup',pointerUp)
      renderer.domElement.removeEventListener('pointercancel',pointerUp)
      clearWorld()
      ownedGeometry.forEach(g=>g.dispose())
      ownedMaterials.forEach((m) => m.dispose())
      ownedTextures.forEach((t) => t.dispose())
      environment.dispose()
      bloom?.dispose()
      outputPass?.dispose()
      antialiasPass?.dispose()
      composer?.dispose()
      photoLens.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
