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
import { worldIds, groundHeight, traversable } from '@/lib/celta/worlds'
import { assessPhotograph } from '@/lib/celta/photography'
import {
  createMaterials,
  createTree,
  createFern,
  createCrate,
  createDesk,
  createPrison,
  foliageCard,
} from './models'

const palettes = [
  {
    fog: '#b5ae92',
    zenith: '#bd937c',
    horizon: '#e7b67b',
    water: '#314b3e',
    sun: '#ffcf8e',
    ground: '#666449',
    density: 0.012,
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
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    textures[name] = texture
  })
  foliage.dispose()
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
      void main(){vec3 dir=normalize(vPos);float h=max(0.,dir.y);vec3 color=mix(horizon,top,pow(h,.6));vec2 uv=vec2(atan(dir.x,-dir.z),dir.y);float cloud=smoothstep(.42,.7,fbm(uv*vec2(4.,32.)+4.));cloud*=smoothstep(.06,.17,h)*(1.-smoothstep(.4,.65,h));color=mix(color,horizon*.66,cloud*.48);vec3 sky=texture2D(skyMap,vec2(fract(uv.x/6.283185+.674),clamp(.43+dir.y*.82,0.,1.))).rgb;color=mix(color,sky,photographed);float sun=max(0.,dot(dir,sunDir));vec3 amber=mix(sunColor,vec3(2.4,1.15,.14),photographed);color=mix(color,amber,pow(sun,120.)*.3);color=mix(color,amber*1.4,pow(sun,420.)*.7);color=mix(color,sunColor*vec3(8.,8.,7.),smoothstep(.99988,.99995,sun));gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    })
  )
}

function makeWater(palette) {
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
    void main(){vec2 p=world.xz;float a=sin(p.x*1.7+p.y*.9+time*.8);float b=cos(p.x*3.9-p.y*2.8+time*1.1);vec3 normal=normalize(vec3((a+b*.35)*.045,1.,cos(p.y*2.7+time*.6)*.025));vec3 view=normalize(eye-world);float fres=pow(1.-max(dot(view,normal),0.),3.);vec2 rippleOffset=vec2(grain(p*vec2(.7,1.8)+vec2(time*.06,0.)),grain(p*vec2(.45,2.1)+vec2(0.,time*.04)))-.5;vec2 uv=reflectionUv.xy/reflectionUv.w+rippleOffset*.031+vec2(a,b)*.001;vec3 reflected=texture2D(tDiffuse,uv).rgb;reflected/=1.+max(0.,dot(reflected,vec3(.21,.72,.07))-.42)*3.;reflected=mix(reflected,vec3(dot(reflected,vec3(.21,.72,.07))),.36);vec3 color=mix(deep,reflected,.22+fres*.24);
    vec2 ripplePoint=p+vec2(grain(p*vec2(.9,1.3))*.28,grain(p*vec2(1.7,.8))*.42);
    vec2 slanted=mat2(.995,.10,-.10,.995)*ripplePoint;
    float facets=grain(slanted*vec2(4.5,19.)+time*.12)*.65+grain((ripplePoint+vec2(ripplePoint.y*.065,0.))*vec2(12.,55.)-time*.07)*.35;
    float interruptions=smoothstep(.49,.63,facets)*(.35+.65*grain(p*vec2(1.4,2.7)));
    color=mix(color,mix(deep,haze,.14),interruptions*.75);vec3 halfv=normalize(view+normalize(vec3(.16,.125,-.98)));halfv.x+=(grain(p*vec2(1.8,.7)+time*.06)-.5)*.035;float spec=exp(-pow(halfv.x/.048,2.)-pow(halfv.z/.21,2.));float sparkle=grain(vec2(p.x*1.2,p.y*18.+time*.4))+.15*grain(vec2(p.x*6.,p.y*51.-time*.2));spec*=smoothstep(.68,.9,sparkle)*(.22+.78*smoothstep(.33,.58,grain(vec2(.3,p.y*2.1+time*.035))));color+=sunlight*vec3(4.2,2.7,1.1)*spec*1.2;vec2 broken=p+vec2(grain(p*.8)*.5,grain(p*vec2(1.3,.7))*.32);float waves=(grain(broken*vec2(1.7,9.)+time*.08)-.5)*.7+(grain(broken*vec2(4.2,23.)-time*.07)-.5)*.3;color+=waves*.07*(.3+.7*grain(p*1.6));float dist=length(eye-world);color=mix(color,haze,1.-exp(-dist*.0015));gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  }
  const mesh = new Reflector(new THREE.PlaneGeometry(400, 400), {
    shader,
    color: palette.water,
    textureWidth: 512,
    textureHeight: 512,
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
  renderer.toneMappingExposure = 1.2
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.setAttribute('aria-label', 'Mundo 3D de Roger Casement')
  container.appendChild(renderer.domElement)
  let textures, assets, worlds
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const pendingAssets = new Map()
  try {
    const names = ['congo','roger','witness-congo']
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
    lastPausedFrame = 0
  let currentWorld = '',
    near = false,
    guided = false,
    route = []
  let activeWorld, cameraYaw = 0, cameraPitch = .04, photoZoom = 1, photoFocus = 5, cameraDrag = null
  const raycaster = new THREE.Raycaster()
  const photoStatus = { ready:false, hint:'Encuadra el sujeto' }
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
      ownedMaterials.add(material)
      material.envMapIntensity = .45
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
    return result
  }
  const heightAt = (x,z) => currentWorld.endsWith('/true') ? 0 : groundHeight(activeWorld,x,z)
  let worldGeometries = new Set(),
    worldMaterials = new Set()
  const clearWorld = () => {
    if (!scene) return
    water?.getRenderTarget?.().dispose()
    scene.traverse((object) => {
      object.shadow?.map?.dispose()
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
    scene.environmentIntensity = state.chapter === 0 ? 0.7 : 0.3
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
        prison ? '#b5c7d2' : p.horizon,
        prison ? '#302d28' : '#374938',
        prison ? 1.3 : 1.35
      )
    )
    const sun = new THREE.DirectionalLight(
      prison ? '#d6e2ed' : p.sun,
      prison ? 3 : 3.8
    )
    sun.position.set(18, prison ? 18 : 19, -55)
    if (prison) sun.position.set(2, 6, -5)
    sun.target.position.set(prison ? -1 : -6, 0, prison ? -2 : -15)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
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
      prison ? 0.7 : .85
    )
    fill.position.set(8, 7, 6)
    scene.add(fill)
    if (!prison) {
      const rim = new THREE.DirectionalLight(
        state.chapter === 0 ? '#ffcf83' : p.sun,
        state.chapter === 0 ? 1.5 : .9
      )
      rim.position.set(15, 6, -3)
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
      water = makeWater(p)
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
          plant(createTree(materials,{height:10+rng()*9,seed:730+i,palm:state.chapter===1 && i%5===0}),x,z)
        }
        const paths = activeWorld.walkSurfaces.filter(surface=>surface.type==='path')
        const onWalkway = (x,z) => paths.some(path=>path.points.some(point=>Math.hypot(x-point[0],z-point[1])<path.width*.6))
        for (let i=0;i<(touchDevice?400:700);i++) {
          const x = -24+rng()*36, z = 10-rng()*59
          if (heightAt(x,z)<.3 || onWalkway(x,z) || desks.some(d=>Math.hypot(x-d[0],z-d[1])<2.8) || Math.hypot(x-npcPosition[0],z-npcPosition[1])<2.6 || Math.hypot(x-activeWorld.spawn[0],z-activeWorld.spawn[1])<2) continue
          const cluster = new THREE.Group()
          for(let j=0;j<3;j++) {
            const leaf = new THREE.Mesh(foliageCard(1.1+rng()*.8,.7+rng()*.7,950+i*3+j),materials.branchCard)
            leaf.rotation.set(-.3,j*Math.PI/3+rng(),rng()*.25)
            leaf.position.y=.35
            leaf.castShadow=true;leaf.receiveShadow=true
            cluster.add(leaf)
          }
          plant(cluster,x,z,.6+rng()*.7)
          if(i%7===0)plant(createFern(materials,{scale:.55+rng()*.5,seed:950+i}),x+.5,z+.5)
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
        for(let i=0;i<(touchDevice?23:34);i++) {
          const z=22-i*5,x=east+Math.sin(i*.7)*5
          const tree=createTree(materials,{height:12+rng()*10,seed:1300+i,palm:state.chapter===1 && i%4===0})
          tree.position.set(x,1,z);forest.add(tree)
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
        const speed = (state.mode === 'photo' ? 1.25 : keys.has('shift') ? 3.8 : 2.55) * dt
        const nx = player.position.x + dx * speed,
          nz = player.position.z + dz * speed
        if (walkable(nx, player.position.z)) player.position.x = nx
        if (walkable(player.position.x, nz)) player.position.z = nz
        const angle = Math.atan2(-dx, -dz)
        let delta = angle - player.rotation.y
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        player.rotation.y += delta * Math.min(1, dt * 12)
        distanceWalked += speed
      }
      player.position.y = heightAt(player.position.x,player.position.z)
      player.userData.legs?.forEach(
        (leg, i) =>
          (leg.rotation.x =
            length > 0.08
              ? Math.sin(distanceWalked * 5 + i * Math.PI) * 0.44
              : leg.rotation.x * 0.8)
      )
      player.userData.arms?.forEach(
        (arm, i) =>
          (arm.rotation.x =
            length > 0.08
              ? Math.sin(distanceWalked * 5 + i * Math.PI) * -0.28
              : arm.rotation.x * 0.8)
      )
      const prison = currentWorld.endsWith('/true')
      if (state.mode === 'photo') {
        camera.position.copy(player.position).add(new THREE.Vector3(0,1.63,0))
        reusable.look.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),Math.sin(cameraPitch),-Math.cos(cameraYaw)*Math.cos(cameraPitch)).add(camera.position)
        camera.lookAt(reusable.look)
        camera.fov = 56/photoZoom
      } else {
        const back = prison ? 3.5 : camera.aspect<.8 ? 5.6 : 4.8
        const side = .8
        reusable.destination.set(
          player.position.x-Math.sin(cameraYaw)*back+Math.cos(cameraYaw)*side,
          player.position.y+2.5+cameraPitch*2.5,
          player.position.z+Math.cos(cameraYaw)*back+Math.sin(cameraYaw)*side
        )
        const cameraFloor = heightAt(reusable.destination.x,reusable.destination.z)+.6
        reusable.destination.y = Math.max(reusable.destination.y,cameraFloor)
        camera.position.lerp(reusable.destination,state.reducedMotion ? 1 : 1-Math.exp(-dt*6))
        reusable.look.set(player.position.x+Math.sin(cameraYaw)*1.8,player.position.y+1.55+cameraPitch*3,player.position.z-Math.cos(cameraYaw)*1.8)
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
    player.visible = state.mode !== 'photo'
    if (water)
      water.material.uniforms.time.value = state.reducedMotion ? 0 : time
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
      near = distance < (state.activity?.type === 'photo' ? 18 : 2.8)
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
    if (composer && state.quality !== 'low') composer.render(dt)
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
    const [x,z] = state.activity.position
    const eyeY = player.position.y+1.63
    const y = heightAt(x,z)+(state.activity.height || 1.2)
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
    const point = new THREE.Vector3(x,heightAt(x,z)+(activity.height || 1.2),z)
    const projected = point.clone().project(camera)
    const distance = camera.position.distanceTo(point)
    const direction = point.clone().sub(camera.position).normalize()
    raycaster.set(camera.position,direction)
    raycaster.far = Math.max(0,distance-(activity.radius || .6))
    const occluded = raycaster.intersectObjects(world.children,true).some(hit => hit.object.visible && hit.object.material?.opacity!==0)
    const coverage = (activity.radius || .6)/(Math.max(distance,.1)*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)))
    Object.assign(photoStatus,assessPhotograph({distance,frameX:projected.x,frameY:projected.y,depth:projected.z,focus:photoFocus,occluded,coverage}))
    callbacks.onPhoto?.({...photoStatus,zoom:photoZoom,focus:photoFocus})
  }
  function photograph() {
    if (state.mode !== 'photo') return null
    updatePhotoStatus()
    if (!photoStatus.ready) return {error:photoStatus.hint}
    player.visible = false
    if (composer && state.quality !== 'low') composer.render(0)
    else renderer.render(scene,camera)
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
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
