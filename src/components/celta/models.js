import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Hand-built, metre-scale scenery. Geometry is joined by material before it reaches
// the renderer; a tree is a handful of draws, rather than a mesh for every leaf.
const Y = new THREE.Vector3(0, 1, 0)
const TAU = Math.PI * 2
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const sphereGeometry = new THREE.SphereGeometry(1, 14, 10)

function randomGenerator(seed = 1) {
  let value = (seed * 9301 + 49297) >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

function geometry(positions, indices, uvs) {
  const result = new THREE.BufferGeometry()
  result.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  result.setIndex(indices)
  result.computeVertexNormals()
  return result
}

class Assembly {
  constructor() {
    this.parts = new Map()
  }
  add(shape, material, position, scale, rotation) {
    const geo = shape.clone()
    if (!geo.index)
      geo.setIndex(
        Array.from({ length: geo.attributes.position.count }, (_, i) => i)
      )
    const transform = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    if (rotation instanceof THREE.Quaternion) q.copy(rotation)
    else if (rotation) q.setFromEuler(new THREE.Euler(...rotation))
    transform.compose(
      new THREE.Vector3(...(position || [0, 0, 0])),
      q,
      new THREE.Vector3(...(scale || [1, 1, 1]))
    )
    geo.applyMatrix4(transform)
    if (!this.parts.has(material)) this.parts.set(material, [])
    this.parts.get(material).push(geo)
    return this
  }
  box(material, position, scale, rotation) {
    return this.add(boxGeometry, material, position, scale, rotation)
  }
  oval(material, position, scale, rotation) {
    return this.add(sphereGeometry, material, position, scale, rotation)
  }
  beam(material, start, end, radius = 0.05, endRadius = radius, sides = 7) {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    const shape = new THREE.CylinderGeometry(
      endRadius,
      radius,
      direction.length(),
      sides,
      1
    )
    this.add(
      shape,
      material,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
      null,
      new THREE.Quaternion().setFromUnitVectors(Y, direction.normalize())
    )
    shape.dispose()
    return this
  }
  finish(name = '') {
    const group = new THREE.Group()
    group.name = name
    this.parts.forEach((parts, material) => {
      const combined = mergeGeometries(parts, false)
      const mesh = new THREE.Mesh(combined, material)
      mesh.castShadow = !material.transparent
      mesh.receiveShadow = true
      group.add(mesh)
      parts.forEach((part) => part.dispose())
    })
    return group
  }
}

function surface(color, map, roughness = 0.88, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    map: map || null,
    bumpMap: map || null,
    bumpScale: map ? 0.006 : 0,
    roughness,
    ...extra,
  })
}

function foliageMaterial(map, color = '#c5d3aa') {
  if (!map) return null
  return surface(color, map, 0.96, {
    side: THREE.DoubleSide,
    alphaTest: 0.45,
    alphaToCoverage: true,
    vertexColors: true,
    emissive: '#708149',
    emissiveMap: map,
    emissiveIntensity: 0.035,
  })
}

/** Optional texture maps also include canopy, frond, fernCard and branchCard. */
export function createMaterials(textures = {}) {
  return {
    wood: surface('#b4b5a3', textures.wood, 0.82, { bumpScale: 0.003 }),
    woodLight: surface('#c8c3b0', textures.wood, 0.86, { bumpScale: 0.003 }),
    woodDark: surface('#6f7161', textures.wood, 0.9, { bumpScale: 0.004 }),
    wetWood: new THREE.MeshPhysicalMaterial({
      color: '#9b9e8c',
      map: textures.wood,
      bumpMap: textures.wood,
      bumpScale: 0.004,
      roughnessMap: null,
      roughness: 0.72,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
    }),
    hullWood: new THREE.MeshPhysicalMaterial({
      color: '#747967',
      map: textures.wood,
      bumpMap: textures.wood,
      bumpScale: 0.004,
      roughness: 0.48,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      vertexColors: true,
    }),
    bark: surface(textures.bark ? '#ae9f88' : '#796e59', textures.bark, 1, {
      bumpScale: 0.045,
    }),
    barkDark: surface('#534d3c', textures.bark, 1),
    leaf: surface(textures.leaf ? '#9db271' : '#4b6332', textures.leaf, 0.86, {
      side: THREE.DoubleSide,
    }),
    leafLight: surface(
      textures.leaf ? '#c3cd93' : '#758547',
      textures.leaf,
      0.9,
      { side: THREE.DoubleSide }
    ),
    leafDark: surface(textures.leaf ? '#6e865b' : '#263c25', textures.leaf, 1, {
      side: THREE.DoubleSide,
    }),
    leafVein: surface('#485339', null, 1),
    moss: surface('#58613c', textures.ground, 1),
    cloth: surface('#e0d9be', textures.cloth, 1, { bumpScale: 0.0006 }),
    clothLight: surface('#f0e6cc', textures.cloth, 1, { bumpScale: 0.0006 }),
    clothShadow: surface('#afa387', textures.cloth, 1, { bumpScale: 0.0006 }),
    clothRim: surface('#ead3a5', textures.cloth, .9, { emissive: '#a67e42', emissiveIntensity: .16, bumpScale: .0004 }),
    trousers: surface('#9a9077', textures.cloth, 1, { bumpScale: 0.0006 }),
    leather: surface('#3a2c22', textures.cloth, 0.6, { bumpScale: 0.0008 }),
    leatherLight: surface('#5d4730', textures.cloth, 0.65, {
      bumpScale: 0.0008,
    }),
    skin: surface('#a68262', null, 0.65),
    hair: surface('#827565', textures.hair, 0.68, { bumpScale: 0.005 }),
    hairLight: surface('#a5977d', textures.hair, 0.74, { bumpScale: 0.005 }),
    dark: surface('#252821', null, 1),
    rope: surface('#9a8d67', textures.cloth, 1),
    metal: surface('#373e3b', null, 0.58, { metalness: 0.6 }),
    brass: surface('#a08b54', null, 0.48, { metalness: 0.65 }),
    paper: surface('#d1c4a0', textures.cloth, 1, { bumpScale: 0.0002 }),
    stone: surface('#8a8980', textures.stone || textures.ground, 1),
    stoneLight: surface('#a39e8c', textures.stone || textures.ground, 1),
    stoneDark: surface('#686b62', textures.stone || textures.ground, 1),
    slate: surface('#4c5857', textures.bark, 0.86),
    thatch: surface('#bbab83', textures.bark, 1, { side: THREE.DoubleSide }),
    canopy: foliageMaterial(textures.canopy),
    frond: foliageMaterial(textures.frond, '#bdcda0'),
    fernCard: foliageMaterial(textures.fernCard, '#b9c99e'),
    branchCard: foliageMaterial(textures.branchCard),
    lantern: surface('#ffc56a', null, 0.35, {
      emissive: '#ffad44',
      emissiveIntensity: 2.2,
    }),
  }
}

// Elliptical cross-sections give coats, limbs and posts a tailored silhouette.
function loft(rings, segments = 12, seed = 0, irregularity = 0) {
  const positions = [],
    indices = [],
    uvs = []
  const rand = randomGenerator(seed)
  const ridges = Array.from(
    { length: segments },
    () => (rand() - 0.5) * irregularity
  )
  rings.forEach((ring, level) => {
    const [cx, cy, cz, rx, rz] = ring
    for (let j = 0; j <= segments; j += 1) {
      const angle = (j / segments) * TAU
      const ridge = 1 + ridges[j % segments]
      positions.push(
        cx + Math.cos(angle) * rx * ridge,
        cy,
        cz + Math.sin(angle) * rz * ridge
      )
      uvs.push(j / segments, level / (rings.length - 1))
      if (level && j) {
        const a = level * (segments + 1) + j,
          b = a - segments - 1
        indices.push(a - 1, a, b - 1, a, b, b - 1)
      }
    }
  })
  // Close the hidden ends, keeping the same UV/normal attribute contract.
  for (const [level, reverse] of [
    [0, false],
    [rings.length - 1, true],
  ]) {
    const ring = rings[level]
    const middle = positions.length / 3
    positions.push(ring[0], ring[1], ring[2])
    uvs.push(0.5, 0.5)
    for (let j = 0; j < segments; j += 1) {
      const a = level * (segments + 1) + j
      indices.push(...(reverse ? [middle, a + 1, a] : [middle, a, a + 1]))
    }
  }
  return geometry(positions, indices, uvs)
}

// A ribbon follows arbitrary world-space points; useful for belts and leaf veins.
function ribbon(points, widths, normal = [0, 0, 1]) {
  const positions = [],
    indices = [],
    uvs = []
  const face = new THREE.Vector3(...normal)
  const vectors = points.map((point) => new THREE.Vector3(...point))
  vectors.forEach((point, i) => {
    const direction = vectors[Math.min(i + 1, vectors.length - 1)]
      .clone()
      .sub(vectors[Math.max(0, i - 1)])
      .normalize()
    const across = new THREE.Vector3()
      .crossVectors(direction, face)
      .normalize()
      .multiplyScalar((Array.isArray(widths) ? widths[i] : widths) / 2)
    positions.push(
      ...point.clone().sub(across).toArray(),
      ...point.clone().add(across).toArray()
    )
    uvs.push(0, i / (points.length - 1), 1, i / (points.length - 1))
    if (i) {
      const a = i * 2
      indices.push(a - 2, a - 1, a, a - 1, a + 1, a)
    }
  })
  return geometry(positions, indices, uvs)
}

function roundedBox(width, height, depth, radius = 0.035) {
  const shape = new THREE.Shape()
  const x = -width / 2,
    y = -height / 2
  const r = Math.min(radius, width * 0.49, height * 0.49)
  const bevel = Math.min(radius / 2, depth * 0.24, r * 0.5)
  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  const result = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 3,
  })
  result.translate(0, 0, -(depth - bevel * 2) / 2)
  // Extrude's secondary UV channel is unnecessary when joining hand-built meshes.
  if (result.getAttribute('uv1')) result.deleteAttribute('uv1')
  return result
}

// Casement's cloth is sculpted along a curved profile. Broad tension folds are
// displaced into the surface, so they survive silhouette and grazing sunlight.
// A fold is [angle, height, angularWidth, heightWidth, depth, diagonalSlope,
// optional 'compression']. Compression uses a sharply tucked cross-section.
function casementFabric(rings, segments, folds = [], hem = false) {
  const ordered = [...rings].sort((a, b) => a[1] - b[1])
  const smooth = []
  const blend = (a, b, c, d, t) =>
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const steps = Math.max(
      3,
      Math.ceil((ordered[i + 1][1] - ordered[i][1]) / 0.018)
    )
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      smooth.push(
        ordered[i].map((value, axis) =>
          axis === 1
            ? value + (ordered[i + 1][axis] - value) * t
            : blend(
                ordered[Math.max(0, i - 1)][axis],
                value,
                ordered[i + 1][axis],
                ordered[Math.min(ordered.length - 1, i + 2)][axis],
                t
              )
        )
      )
    }
  }
  smooth.push(ordered[ordered.length - 1])
  const profile = [...smooth]
  for (const fold of folds) {
    if (fold[6] !== 'compression') continue
    for (const knot of [-1.2, -0.38, 0, 0.22, 0.68, 1.2]) {
      const y = fold[1] + knot * fold[3]
      const upper = profile.findIndex((ring) => ring[1] > y)
      if (upper < 1 || smooth.some((ring) => Math.abs(ring[1] - y) < 0.0003))
        continue
      const a = profile[upper - 1],
        b = profile[upper]
      const t = (y - a[1]) / (b[1] - a[1])
      smooth.push(a.map((value, axis) => value + (b[axis] - value) * t))
    }
  }
  smooth.sort((a, b) => a[1] - b[1])
  const result = loft(smooth, segments)
  const vertices = result.attributes.position
  for (let level = 0; level < smooth.length; level += 1) {
    const [cx, cy, cz, rx, rz] = smooth[level]
    for (let j = 0; j <= segments; j += 1) {
      const angle = (j / segments) * TAU
      let displacement = 0
      for (const [
        centre,
        height,
        width,
        length,
        depth,
        slope = 0,
        kind,
      ] of folds) {
        if (kind === 'compression') {
          const delta = Math.atan2(
            Math.sin(angle - centre),
            Math.cos(angle - centre)
          )
          const across = delta / width
          const along = (cy - height - delta * slope) / length
          if (along > -1.2 && along < 1.2 && Math.abs(across) < 1.6) {
            const section = [
              [-1.2, 0],
              [-0.38, 0.45],
              [0, 1],
              [0.22, -0.34],
              [0.68, -0.12],
              [1.2, 0],
            ]
            const upper = section.findIndex((point) => point[0] >= along)
            const a = section[upper - 1],
              b = section[upper]
            const t = (along - a[0]) / (b[0] - a[0])
            displacement +=
              depth *
              (a[1] + (b[1] - a[1]) * t) *
              Math.exp(-Math.pow(across, 4))
          }
          continue
        }
        const delta = Math.atan2(
          Math.sin(angle - centre - (cy - height) * slope),
          Math.cos(angle - centre - (cy - height) * slope)
        )
        const across = delta / width
        const along = (cy - height) / length
        // A crest with a shallow valley on each side reads as folded fabric,
        // rather than a tube with random bumps on it.
        displacement +=
          depth *
          (1 - 1.5 * across * across) *
          Math.exp(-across * across - along * along)
      }
      let y = cy
      if (hem) {
        const lower = Math.exp(-Math.pow((cy - 0.855) / 0.052, 2))
        const rear = Math.atan2(
          Math.sin(angle - Math.PI / 2),
          Math.cos(angle - Math.PI / 2)
        )
        y +=
          lower *
          (0.008 * Math.sin(angle * 3 + 0.6) +
            0.035 * Math.exp(-Math.pow(rear / 0.14, 2)))
        y +=
          0.011 * Math.cos(angle) * Math.exp(-Math.pow((cy - 1.42) / 0.13, 2))
      }
      vertices.setXYZ(
        level * (segments + 1) + j,
        cx + Math.cos(angle) * (rx + displacement),
        y,
        cz + Math.sin(angle) * (rz + displacement)
      )
    }
  }
  result.computeVertexNormals()
  // The duplicated UV seam needs the same smooth normal on both sides.
  const normals = result.attributes.normal
  const normal = new THREE.Vector3()
  for (let level = 0; level < smooth.length; level += 1) {
    const first = level * (segments + 1),
      last = first + segments
    normal
      .set(
        normals.getX(first) + normals.getX(last),
        normals.getY(first) + normals.getY(last),
        normals.getZ(first) + normals.getZ(last)
      )
      .normalize()
    normals.setXYZ(first, normal.x, normal.y, normal.z)
    normals.setXYZ(last, normal.x, normal.y, normal.z)
  }
  return result
}

/** 1.83m tall, feet at y=0, face toward -Z. Limb pivots are animation-ready. */
export function createCasement(m) {
  const person = new THREE.Group()
  person.name = 'Roger Casement'
  const body = new Assembly()
  body.add(
    casementFabric(
      [
        [-0.006, 0.845, 0.02, 0.187, 0.128],
        [-0.008, 0.9, 0.012, 0.187, 0.128],
        [-0.006, 0.99, 0.002, 0.177, 0.121],
        [-0.004, 1.075, -0.004, 0.154, 0.109],
        [-0.009, 1.14, -0.003, 0.158, 0.115],
        [-0.012, 1.25, 0.003, 0.181, 0.137],
        [-0.009, 1.355, 0.009, 0.199, 0.14],
        [-0.006, 1.409, 0.011, 0.202, 0.121],
        [-0.003, 1.443, 0.007, 0.167, 0.093],
        [0, 1.475, 0.003, 0.102, 0.07],
        [0, 1.498, 0.001, 0.069, 0.063],
      ],
      48,
      [
        // Long tension folds descend from each rear shoulder to the waist.
        // Their 5–10cm spread remains legible on the 300px screen character.
        [0.94, 1.305, 0.37, 0.135, 0.027, -3.25],
        [2.25, 1.292, 0.36, 0.14, 0.023, 3.15],
        [1.54, 1.34, 0.27, 0.1, -0.011, -0.4],
        [0.47, 1.156, 0.35, 0.09, 0.021, -3.1],
        [2.72, 1.174, 0.33, 0.105, 0.025, 2.8],
        // Two broad, asymmetric compression folds across the small of the back.
        [1.31, 1.097, 0.88, 0.034, 0.022, 0.025, 'compression'],
        [1.79, 1.041, 0.79, 0.028, 0.019, -0.02, 'compression'],
        [0.72, 0.938, 0.27, 0.1, 0.017, 1.2],
        [1.3, 0.918, 0.25, 0.097, 0.02, 0.7],
        [1.94, 0.929, 0.25, 0.102, 0.025, -1.2],
        [2.5, 0.954, 0.25, 0.105, 0.017, -0.8],
        [3.72, 1.15, 0.26, 0.14, 0.009, -2],
        [5.48, 1.18, 0.23, 0.14, 0.009, 1.8],
        [4.15, 0.94, 0.23, 0.11, 0.012, -0.9],
        [5.4, 0.91, 0.2, 0.09, 0.008, 0.5],
      ],
      true
    ),
    m.cloth
  )
  // A rolled standing collar covers the lower nape. Its folded cross-section
  // has a real underside and rounded top lip, rather than a line on the coat.
  const collarPositions = [],
    collarIndices = [],
    collarUvs = []
  const collarProfile = [
    [0.087, 0.076, 1.483],
    [0.105, 0.097, 1.497],
    [0.096, 0.091, 1.519],
    [0.082, 0.081, 1.546],
    [0.076, 0.073, 1.558],
    [0.07, 0.066, 1.556],
    [0.068, 0.064, 1.534],
    [0.07, 0.065, 1.49],
    [0.087, 0.076, 1.483],
  ]
  const collarSegments = 32
  collarProfile.forEach(([rx, rz, height], row) => {
    for (let j = 0; j <= collarSegments; j += 1) {
      const angle = -Math.PI / 4 + (j / collarSegments) * Math.PI * 1.5
      const frontDrop = Math.max(0, -Math.sin(angle)) * 0.033
      collarPositions.push(
        Math.cos(angle) * rx,
        height - frontDrop + Math.cos(angle) * 0.0025,
        0.003 + Math.sin(angle) * rz
      )
      collarUvs.push(j / collarSegments, row / (collarProfile.length - 1))
      if (row && j) {
        const a = row * (collarSegments + 1) + j,
          b = a - collarSegments - 1
        collarIndices.push(a - 1, a, b - 1, a, b, b - 1)
      }
    }
  })
  body.add(geometry(collarPositions, collarIndices, collarUvs), m.cloth)
  body.add(
    ribbon(
      [
        [-0.087, 1.501, 0.057],
        [-0.055, 1.5, 0.087],
        [0, 1.502, 0.102],
        [0.055, 1.504, 0.087],
        [0.087, 1.506, 0.057],
      ],
      0.005,
      [0, 0, 1]
    ),
    m.clothShadow
  )
  // Lower jacket panels and stitched rear seam.
  body.add(
    ribbon(
      [
        [-0.008, 1.412, 0.134],
        [-0.012, 1.28, 0.147],
        [-0.008, 1.16, 0.122],
        [-0.004, 1.075, 0.108],
        [-0.006, 0.97, 0.131],
        [-0.006, 0.892, 0.144],
      ],
      0.0035
    ),
    m.clothShadow
  )
  body.add(
    ribbon(
      [
        [-0.153, 1.04, 0.072],
        [-0.18, 0.95, 0.071],
        [-0.181, 0.859, 0.072],
      ],
      0.007
    ),
    m.clothShadow
  )
  for (const side of [-1, 1]) {
    body.add(roundedBox(0.105, 0.115, 0.012, 0.012), m.clothShadow, [
      side * 0.11,
      1.27,
      -0.129,
    ])
    body.add(roundedBox(0.112, 0.039, 0.015, 0.005), m.cloth, [
      side * 0.11,
      1.305,
      -0.139,
    ])
    body.box(
      m.clothLight,
      [side * 0.053, 1.474, -0.079],
      [0.068, 0.042, 0.018],
      [0.2, 0, side * -0.43]
    )
  }
  body.beam(m.skin, [0, 1.48, 0.003], [0, 1.577, 0.001], 0.064, 0.067, 12)
  const head = new Assembly()
  head.add(
    loft(
      [
        [0, 1.583, -0.018, 0.047, 0.067],
        [0, 1.605, -0.022, 0.071, 0.085],
        [0, 1.655, -0.009, 0.082, 0.094],
        [0, 1.715, 0, 0.083, 0.09],
        [0, 1.775, 0.009, 0.074, 0.077],
        [0, 1.806, 0.014, 0.047, 0.058],
        [0, 1.815, 0.014, 0.009, 0.012],
      ],
      20
    ),
    m.skin
  )
  head.oval(m.skin, [-0.084, 1.671, 0.012], [0.018, 0.034, 0.022])
  head.oval(m.skin, [0.084, 1.671, 0.012], [0.018, 0.034, 0.022])
  head.oval(m.skin, [0, 1.67, -0.098], [0.025, 0.035, 0.033], [-0.1, 0, 0])
  // Several swept masses make the crown and nape asymmetric at gameplay scale;
  // fine ridges sit on those volumes instead of trying to carry the silhouette.
  const hairPositions = [],
    hairIndices = [],
    hairUvs = []
  const hairSides = 40,
    hairRows = 18
  const hairMasses = [
    [0.56, 0.59, 0.58, 0.38, 0.038],
    [1.75, 0.79, 0.52, 0.38, 0.028],
    [2.62, 1.28, 0.42, 0.45, 0.040],
    [1.2, 1.47, 0.37, 0.39, 0.029],
    [2.03, 1.98, 0.42, 0.4, 0.036],
    [0.3, 1.75, 0.33, 0.4, 0.025],
  ]
  for (let row = 0; row <= hairRows; row += 1) {
    const v = row / hairRows
    for (let j = 0; j <= hairSides; j += 1) {
      const angle = (j / hairSides) * TAU
      const hairline =
        1.92 + Math.sin(angle) * 0.6 + 0.09 * Math.cos(angle - 0.9)
      const theta = v * hairline
      const part = Math.exp(
        -Math.pow(
          Math.atan2(Math.sin(angle + 0.7), Math.cos(angle + 0.7)) / 0.19,
          2
        )
      )
      let mass = 0
      for (const [centre, polar, width, length, depth] of hairMasses) {
        const delta = Math.atan2(
          Math.sin(angle - centre - (theta - polar) * 0.55),
          Math.cos(angle - centre - (theta - polar) * 0.55)
        )
        mass +=
          depth * .25 *
          Math.exp(
            -Math.pow(delta / width, 2) - Math.pow((theta - polar) / length, 2)
          )
      }
      const wave = mass - part * Math.sin(theta) * 0.004
      const sweep = 0.003 * Math.sin(theta) * Math.sin(angle * 2 + theta * 3)
      hairPositions.push(
        Math.cos(angle) * Math.sin(theta) * (0.087 + wave) + sweep,
        1.714 +
          Math.cos(theta) * (0.109 + wave) +
          0.005 * Math.sin(theta) * Math.cos(angle - 0.5),
        0.015 + Math.sin(angle) * Math.sin(theta) * (0.092 + wave)
      )
      hairUvs.push(j / hairSides, v)
      if (row && j) {
        const a = row * (hairSides + 1) + j,
          b = a - hairSides - 1
        hairIndices.push(a - 1, b - 1, a, a, b - 1, b)
      }
    }
  }
  head.add(geometry(hairPositions, hairIndices, hairUvs), m.hair)
  // Five individually directed, flattened clumps sweep over the crown and
  // terminate at different nape heights. They do not serrate a shared edge.
  const sweptLocks = [
    [[[-.07,1.785,.025],[-.02,1.823,.045],[.035,1.79,.08]], .027, .01],
    [[[.07,1.76,.01],[.055,1.799,.036],[0,1.77,.095]], .031, .013],
    [[[-.073,1.745,.022],[-.064,1.788,.07],[-.045,1.748,.1]], .022, .016],
    [[[-.02,1.80,-.025],[.025,1.81,.015],[.065,1.765,.06]], .027, .014],
    [[[.032,1.75,.087],[.042,1.735,.108],[-.01,1.68,.105]], .025, .012],
  ]
  sweptLocks.forEach(([points, width, depth], lockIndex) => {
    const path = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point))
    )
    const positions = [],
      indices = [],
      uvs = []
    for (let row = 0; row <= 10; row += 1) {
      const t = row / 10,
        centre = path.getPointAt(t),
        tangent = path.getTangentAt(t)
      // Keep the locks on the scalp: raised control points must not make
      // detached, tubular tufts above the crown.
      const scalp = new THREE.Vector3(
        centre.x / .089,
        (centre.y - 1.714) / .11,
        (centre.z - .015) / .096
      ).normalize()
      centre.set(scalp.x * .089, 1.714 + scalp.y * .11, .015 + scalp.z * .096)
      const radial = new THREE.Vector3(
        centre.x,
        (centre.y - 1.704) * 0.85,
        centre.z - 0.013
      ).normalize()
      const across = new THREE.Vector3()
        .crossVectors(tangent, radial)
        .normalize()
      const normal = new THREE.Vector3()
        .crossVectors(across, tangent)
        .normalize()
      const taper = 0.22 + Math.pow(Math.sin(t * Math.PI), 0.8) * 0.78
      for (let j = 0; j <= 8; j += 1) {
        const angle = (j / 8) * TAU
        const point = centre
          .clone()
          .addScaledVector(across, Math.cos(angle) * width * taper)
          .addScaledVector(normal, Math.sin(angle) * depth * taper * .85)
        positions.push(...point.toArray())
        uvs.push(j / 8, t)
        if (row && j) {
          const a = row * 9 + j,
            b = a - 9
          indices.push(a - 1, a, b - 1, a, b, b - 1)
        }
      }
    }
    head.add(geometry(positions, indices, uvs), lockIndex % 2 ? m.hair : m.hairLight)
  })
  head.add(
    loft(
      [
        [0, 1.588, -0.031, 0.034, 0.065],
        [0, 1.608, -0.028, 0.069, 0.073],
        [0, 1.642, -0.026, 0.07, 0.077],
      ],
      16
    ),
    m.hair
  )
  // Small eyes and moustache are deliberately understated at third-person scale.
  for (const side of [-1, 1]) {
    head.oval(m.hair, [side * 0.035, 1.699, -0.079], [0.02, 0.007, 0.007])
    head.oval(m.hair, [side * 0.018, 1.64, -0.105], [0.023, 0.008, 0.01])
  }
  const headGroup = head.finish('Casement portrait')
  headGroup.children.forEach((mesh) => {
    const vertices = mesh.geometry.attributes.position
    for (let i = 0; i < vertices.count; i += 1) {
      vertices.setXYZ(
        i,
        vertices.getX(i) * 1.08,
        1.7 + (vertices.getY(i) - 1.7) * 1.07,
        vertices.getZ(i) * 1.05
      )
    }
    vertices.needsUpdate = true
    mesh.geometry.computeVertexNormals()
    mesh.geometry.computeBoundingSphere()
  })
  person.add(headGroup)
  for (let i = 0; i < 5; i += 1) {
    body.oval(
      m.leatherLight,
      [0, 1.38 - i * 0.084, -0.137],
      [0.009, 0.009, 0.006]
    )
  }
  // Cross-body leather satchel: strap bends around the shoulders on both sides.
  const rearStrap = [
    [0.12, 1.461, 0.039],
    [0.155, 1.405, 0.117],
    [0.107, 1.335, 0.162],
    [0.067, 1.269, 0.167],
    [-0.06, 1.087, 0.147],
    [-0.207, 0.88, 0.106],
  ]
  body.add(ribbon(rearStrap, 0.038), m.leather)
  body.add(
    ribbon(
      [
        [0.12, 1.461, -0.046],
        [0.15, 1.401, -0.092],
        [0.036, 1.218, -0.145],
        [-0.096, 1.017, -0.132],
        [-0.225, 0.882, -0.07],
      ],
      0.038,
      [0, 0, -1]
    ),
    m.leather
  )
  body.add(
    roundedBox(0.26, 0.29, 0.108),
    m.leatherLight,
    [-0.245, 0.859, 0.018],
    null,
    [0.02, -0.14, -0.1]
  )
  body.add(
    roundedBox(0.266, 0.14, 0.016, 0.025),
    m.leather,
    [-0.248, 0.934, 0.079],
    null,
    [0, -0.14, -0.1]
  )
  body.box(m.brass, [-0.24, 0.855, 0.084], [0.027, 0.031, 0.012])
  person.add(body.finish('Tailored field jacket and satchel'))

  const legs = [],
    arms = []
  for (const side of [-1, 1]) {
    const relaxed = side < 0
    const ankleX = side * (relaxed ? 0.023 : 0.018)
    const ankleZ = relaxed ? 0.032 : -0.027
    const kneeZ = relaxed ? -0.047 : -0.02
    const leg = new Assembly()
    leg.add(
      casementFabric(
        [
          [0, 0, 0, 0.096, 0.109],
          [side * 0.006, -0.095, -0.005, 0.102, 0.111],
          [side * 0.011, -0.2, kneeZ * 0.5, 0.098, 0.102],
          [side * 0.015, -0.3, kneeZ * 0.85, 0.085, 0.09],
          [side * 0.014, -0.355, kneeZ, 0.078, 0.083],
          [side * 0.012, -0.398, kneeZ - 0.003, 0.077, 0.088],
          [side * 0.015, -0.436, kneeZ + 0.01, 0.081, 0.079],
          [side * 0.017, -0.47, kneeZ + 0.017, 0.073, 0.08],
          [side * 0.02, -0.515, ankleZ * 0.6, 0.068, 0.071],
          [ankleX, -0.545, ankleZ, 0.074, 0.078],
          [ankleX, -0.574, ankleZ, 0.071, 0.076],
          [ankleX, -0.591, ankleZ, 0.055, 0.061],
          [ankleX, -0.622, ankleZ, 0.054, 0.059],
        ],
        28,
        [
          [1.03, -0.17, 0.35, 0.18, 0.012, 0.8 * side],
          [2.06, -0.24, 0.34, 0.15, 0.015, -side],
          [4.72, -0.26, 0.2, 0.2, 0.005, 0.2],
          [1.35, -0.373, 1.55, 0.034, 0.024, side * 0.018, 'compression'],
          [1.8, -0.435, 1.5, 0.031, 0.022, -side * 0.017, 'compression'],
          [4.48, -0.446, 0.85, 0.021, 0.009, 7 * side],
          [1.3, -0.489, 1.2, 0.024, 0.012, side * 0.014, 'compression'],
          [4.82, -0.542, 1.2, 0.016, 0.01, -5 * side],
          [1.75, -0.55, 1.12, 0.023, 0.012, 7 * side],
        ]
      ),
      m.trousers
    )
    // The trouser cloth folds outward over the boot shaft. A recessed, narrow
    // dark lip follows the uneven opening, making the material overlap clear.
    const cuff = (profile, material) => {
      const positions = [],
        indices = [],
        uvs = []
      profile.forEach(([rx, rz, height], row) => {
        for (let j = 0; j <= 24; j += 1) {
          const angle = (j / 24) * TAU
          positions.push(
            ankleX + Math.cos(angle) * rx,
            height + Math.sin(angle + side * 0.6) * 0.007,
            ankleZ + Math.sin(angle) * rz
          )
          uvs.push(j / 24, row / (profile.length - 1))
          if (row && j) {
            const a = row * 25 + j,
              b = a - 25
            indices.push(a - 1, a, b - 1, a, b, b - 1)
          }
        }
      })
      leg.add(geometry(positions, indices, uvs), material)
    }
    cuff(
      [
        [0.066, 0.072, -0.565],
        [0.075, 0.08, -0.579],
        [0.08, 0.084, -0.599],
        [0.075, 0.08, -0.61],
        [0.069, 0.074, -0.611],
        [0.066, 0.071, -0.592],
        [0.066, 0.072, -0.565],
      ].reverse(),
      m.trousers
    )
    cuff(
      [
        [0.069, 0.074, -0.619],
        [0.072, 0.077, -0.61],
      ],
      m.dark
    )
    leg.add(
      casementFabric(
        [
          [ankleX, -0.578, ankleZ, 0.062, 0.068],
          [ankleX, -0.595, ankleZ, 0.065, 0.071],
          [ankleX, -0.651, ankleZ + 0.004, 0.062, 0.072],
          [ankleX, -0.722, ankleZ + 0.009, 0.06, 0.07],
          [ankleX, -0.791, ankleZ + 0.002, 0.051, 0.059],
          [ankleX, -0.831, ankleZ - 0.025, 0.057, 0.09],
          [ankleX, -0.861, ankleZ - 0.053, 0.06, 0.115],
        ],
        20,
        [
          [1.6, relaxed ? -.745 : -.732, relaxed ? 1.2 : .95, .024, relaxed ? .012 : .016, .04, 'compression'],
          [4.7, -.789, relaxed ? .8 : 1.1, .02, relaxed ? .014 : .019, -.015, 'compression'],
          [1.85, relaxed ? -.815 : -.802, .9, relaxed ? .018 : .023, .013, .022, 'compression'],
        ]
      ),
      m.leather
    )
    leg.oval(m.leather, [ankleX, -0.858, ankleZ - 0.075], [0.063, 0.046, 0.137])
    leg.add(roundedBox(0.13, 0.026, 0.239, 0.031), m.dark, [
      ankleX,
      -0.889,
      ankleZ - 0.063,
    ])
    leg.add(roundedBox(0.115, 0.029, 0.075, 0.016), m.dark, [
      ankleX,
      -0.887,
      ankleZ + 0.018,
    ])
    leg.add(
      casementFabric(
        [
          [ankleX, -0.58, ankleZ, 0.064, 0.07],
          [ankleX, -0.594, ankleZ, 0.067, 0.073],
          [ankleX, -0.602, ankleZ, 0.065, 0.071],
        ],
        20
      ),
      m.leatherLight
    )
    leg.add(
      ribbon(
        [
          [ankleX + side * 0.06, -0.605, ankleZ + 0.014],
          [ankleX + side * 0.059, -0.71, ankleZ + 0.018],
          [ankleX + side * 0.05, -0.81, ankleZ + 0.01],
        ],
        0.0035,
        [side, 0, 0]
      ),
      m.leatherLight
    )
    const legGroup = leg.finish(side < 0 ? 'Left leg' : 'Right leg')
    // The slight toe-out and uneven stance are in the mesh, leaving the hip
    // rotations free for the existing walk cycle.
    const toeAngle = -side * (relaxed ? 0.13 : 0.08)
    legGroup.children.forEach((mesh) => {
      const vertices = mesh.geometry.attributes.position
      for (let i = 0; i < vertices.count; i += 1) {
        const factor = THREE.MathUtils.smoothstep(-vertices.getY(i), 0.63, 0.86)
        const angle = toeAngle * factor
        const x = vertices.getX(i) - ankleX,
          z = vertices.getZ(i) - ankleZ
        vertices.setX(i, ankleX + x * Math.cos(angle) + z * Math.sin(angle))
        vertices.setZ(i, ankleZ + z * Math.cos(angle) - x * Math.sin(angle))
      }
      mesh.geometry.computeBoundingBox()
    })
    const footY = Math.min(
      ...legGroup.children.map((mesh) => mesh.geometry.boundingBox.min.y)
    )
    legGroup.children.forEach((mesh) => {
      mesh.geometry.translate(0, -0.91 - footY, 0)
      mesh.geometry.computeVertexNormals()
      mesh.geometry.computeBoundingSphere()
    })
    legGroup.position.set(side * 0.103, 0.91, relaxed ? 0.012 : -0.008)
    person.add(legGroup)
    legs.push(legGroup)

    const arm = new Assembly()
    const wristX = side * (relaxed ? 0.05 : 0.065)
    const wristZ = relaxed ? -0.05 : -0.028
    arm.add(
      casementFabric(
        [
          [-side * 0.012, 0.039, 0, 0.031, 0.044],
          [0, 0.017, 0, 0.061, 0.068],
          [side * 0.011, -0.028, 0, 0.073, 0.081],
          [side * 0.024, -0.103, 0.002, 0.066, 0.074],
          [side * 0.03, -0.191, 0.014, 0.057, 0.063],
          [side * 0.037, -0.245, 0.024, 0.055, 0.061],
          [side * 0.04, -0.284, 0.011, 0.06, 0.06],
          [side * 0.044, -0.316, -0.003, 0.055, 0.056],
          [wristX * 0.9, -0.378, wristZ * 0.7, 0.048, 0.051],
          [wristX, -0.436, wristZ, 0.042, 0.046],
          [wristX, -0.468, wristZ - 0.001, 0.039, 0.043],
        ],
        24,
        [
          [1.0, -0.084, 0.42, 0.1, 0.012, side * 2],
          [2.15, -0.146, 0.43, 0.1, 0.014, -side * 2],
          [4.1, -0.172, 0.34, 0.09, 0.005, side * 2.3],
          [1.43, -0.227, 1.2, 0.026, 0.019, side * 0.049, 'compression'],
          [4.5, -0.268, 0.92, 0.019, 0.009, -side * 8],
          [1.78, -0.286, 1.35, 0.025, 0.019, -side * 0.043, 'compression'],
          [1.13, -0.335, 1.1, 0.021, 0.011, side * 0.038, 'compression'],
          [4.85, -0.339, 0.85, 0.02, 0.006, side * 8],
          [1.23, -0.407, 1.1, 0.023, 0.016, -side * 0.025, 'compression'],
          [4.65, -0.436, 0.95, 0.018, 0.01, side * 0.022, 'compression'],
        ]
      ),
      m.cloth
    )
    const shoulderSeam = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-side * 0.039, 0.01, 0.046),
        new THREE.Vector3(-side * 0.031, -0.017, 0.071),
        new THREE.Vector3(-side * 0.019, -0.049, 0.081),
        new THREE.Vector3(-side * 0.011, -0.093, 0.073),
      ]),
      7,
      0.0038,
      5,
      false
    )
    arm.add(shoulderSeam, m.clothShadow)
    shoulderSeam.dispose()
    // Narrow exposed fold crests follow the cloth, rather than lighting the whole sleeve.
    arm.add(ribbon([
      [side*.02,-.242,.086], [side*.049,-.277,.084], [side*.073,-.309,.064]
    ], .0055), m.clothLight)
    arm.add(ribbon([
      [side*.02,-.251,.084], [side*.049,-.286,.081], [side*.073,-.318,.061]
    ], .008), m.clothShadow)
    if (side > 0) {
      arm.add(ribbon([[.064,.01,.035],[.088,-.024,.028],[.088,-.075,.034]], .009), m.clothRim)
      arm.add(ribbon([[.084,-.177,.04],[.095,-.219,.041],[.088,-.25,.039]], .008), m.clothRim)
    }
    arm.add(
      casementFabric(
        [
          [wristX, -0.446, wristZ, 0.042, 0.047],
          [wristX, -0.471, wristZ - 0.001, 0.042, 0.044],
          [wristX, -0.479, wristZ - 0.001, 0.04, 0.043],
        ],
        20
      ),
      m.clothShadow
    )
    arm.add(
      casementFabric(
        [
          [wristX, -0.471, wristZ, 0.027, 0.028],
          [wristX + side * 0.003, -0.501, wristZ - 0.002, 0.032, 0.028],
          [wristX + side * 0.004, -0.537, wristZ - 0.004, 0.034, 0.026],
          [wristX + side * 0.003, -0.571, wristZ - 0.009, 0.027, 0.023],
          [wristX, -0.588, wristZ - 0.016, 0.014, 0.017],
        ],
        12
      ),
      m.skin
    )
    arm.oval(
      m.skin,
      [wristX - side * 0.028, -0.522, wristZ - 0.022],
      [0.016, 0.038, 0.021],
      [0.3, 0, side * -0.34]
    )
    const armGroup = arm.finish(side < 0 ? 'Left arm' : 'Right arm')
    armGroup.position.set(side * 0.197 - 0.006, relaxed ? 1.407 : 1.419, 0.002)
    person.add(armGroup)
    arms.push(armGroup)
  }
  person.userData.legs = legs
  person.userData.arms = arms
  person.userData.height = 1.83
  person.userData.forward = new THREE.Vector3(0, 0, -1)
  // Keep the documented height exact as the hairstyle changes.
  const crownY = new THREE.Box3().setFromObject(headGroup).max.y
  headGroup.children.forEach((mesh) => {
    const vertices = mesh.geometry.attributes.position
    for (let i = 0; i < vertices.count; i += 1) {
      vertices.setY(
        i,
        1.52 + (vertices.getY(i) - 1.52) * (0.31 / (crownY - 1.52))
      )
    }
    mesh.geometry.computeVertexNormals()
    mesh.geometry.computeBoundingBox()
    mesh.geometry.computeBoundingSphere()
  })
  return person
}

function branchGeometry(points, radii, sides = 8) {
  const positions = [],
    indices = [],
    uvs = []
  let vectors = points.map((point) => new THREE.Vector3(...point))
  let widths = radii
  const maxRadius = Math.max(...radii)
  // Subdivide only woody elbows. Thin stems already have enough path samples.
  if (points.length < 6 && maxRadius > 0.07) {
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal')
    const steps = (points.length - 1) * 2
    vectors = curve.getPoints(steps)
    widths = vectors.map((_, i) => {
      const t = (i / steps) * (radii.length - 1),
        index = Math.min(radii.length - 2, Math.floor(t))
      return THREE.MathUtils.lerp(radii[index], radii[index + 1], t - index)
    })
  }
  const radialSegments = maxRadius > 0.3 && points.length >= 10 ? Math.max(sides, 18) : sides
  let previousSide
  vectors.forEach((point, i) => {
    const t = i / (vectors.length - 1)
    const tangent = vectors[Math.min(vectors.length - 1, i + 1)]
      .clone()
      .sub(vectors[Math.max(0, i - 1)])
      .normalize()
    // Transport the frame along the branch; changing its reference axis at a
    // vertical elbow used to introduce a visible angular kink in the bark.
    const side = previousSide
      ? previousSide.clone().addScaledVector(tangent, -previousSide.dot(tangent)).normalize()
      : new THREE.Vector3()
          .crossVectors(tangent, Math.abs(tangent.y) < 0.95 ? Y : new THREE.Vector3(1, 0, 0))
          .normalize()
    const up = new THREE.Vector3().crossVectors(side, tangent).normalize()
    previousSide = side
    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = (j / radialSegments) * TAU
      const relief = maxRadius > 0.12
        ? 1 + 0.068 * Math.sin(angle * 3 + t * 4.1) + 0.037 * Math.sin(angle * 7 - t * 6.3)
          - 0.08 * Math.pow(Math.max(0, Math.cos(angle * 5 + t * 2.6)), 12)
        : 1
      const vertex = point
        .clone()
        .addScaledVector(side, Math.cos(angle) * widths[i] * relief)
        .addScaledVector(up, Math.sin(angle) * widths[i] * relief)
      positions.push(...vertex.toArray())
      // Broad, wandering scales instead of equally stretched vertical grooves.
      uvs.push(
        j / radialSegments + Math.sin(t * 5.4 + angle * 2) * 0.033,
        t * 2 + Math.sin(angle * 3 + t * 3.2) * 0.11
      )
      if (i && j) {
        const a = i * (radialSegments + 1) + j,
          b = a - radialSegments - 1
        indices.push(a - 1, a, b - 1, a, b, b - 1)
      }
    }
  })
  return geometry(positions, indices, uvs)
}

// Five cross-leaf samples form a raised midrib, cupped halves and rolled edges.
function leafGeometry(
  start,
  end,
  width,
  droop = 0.12,
  twist = 0,
  segments = 5,
  worn = false
) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end)
  const direction = b.clone().sub(a)
  const axis = direction.clone().normalize()
  const variation=Math.sin(a.x*13.17+a.y*9.31+a.z*17.73+width*31.8)
  const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize()
  if (side.lengthSq() < 0.01) side.set(1, 0, 0)
  const positions = [],
    indices = [],
    uvs = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const center = a.clone().addScaledVector(direction, t)
    center.y += Math.sin(t * Math.PI) * droop
    center.addScaledVector(side, Math.sin(t * Math.PI) * Math.sin(twist + t * 2.3) * width * (0.18+variation*.06))
    const across = side.clone().applyAxisAngle(axis, twist * (0.35 + t * 0.85)+Math.sin(t*Math.PI)*variation*.38)
    const normal = new THREE.Vector3().crossVectors(across, axis).normalize()
    const profile = Math.pow(Math.sin(t * Math.PI), 0.79+variation*.19)
    const halfWidth = profile * width * 0.5
    for (let j = -2; j <= 2; j += 1) {
      const u = j / 2
      const asymmetry = 1 + Math.sign(u) * Math.sin(t * 3.1 + twist) * 0.11
      const nick = worn && Math.abs(u) > .9 && Math.sin(variation*39+j*17)>.1
        ? 1-.42*Math.exp(-Math.pow((t-(.35+variation*.2))/.09,2)) : 1
      const vertex = center.clone().addScaledVector(across, halfWidth * u * asymmetry * nick)
      vertex.addScaledVector(normal,
        halfWidth * (0.1 - Math.pow(Math.abs(u), 0.72) * 0.29)
        + Math.pow(Math.abs(u), 3) * width * Math.sin(t * 9 + twist * 2 + j) * 0.033
      )
      positions.push(...vertex.toArray())
      // The generated source is a leaf on a pale background. Follow its outline
      // in UV space so the modeled edge never samples that background.
      uvs.push(0.49 + u * Math.pow(Math.sin(t * Math.PI), 0.69) * 0.23, 0.085 + t * 0.85)
      if (i && j > -2) {
        const n = i * 5 + j + 2,
          previous = n - 5
        indices.push(previous - 1, previous, n - 1, previous, n, n - 1)
      }
    }
  }
  return geometry(positions, indices, uvs)
}

// Nonuniform dishing and a twisted tip let atlas clusters respond to side light.
export function foliageCard(width, height, seed = 1, segments = 5) {
  const rand = randomGenerator(seed),
    positions = [],
    indices = [],
    uvs = [],
    colors = []
  const brightness = 0.83 + rand() * 0.17,
    bend = 0.16 + rand() * 0.12,
    lean = (rand() - 0.5) * 0.2,
    phase = rand() * TAU
  for (let row = 0; row <= segments; row += 1) {
    for (let col = 0; col <= segments; col += 1) {
      const u = col / segments,
        v = row / segments
      const cup = Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
      positions.push(
        (u - 0.5) * width * (0.93 + Math.sin(v * 2.7 + phase) * 0.07) + lean * width * (v - 0.5),
        (v - 0.5) * height + Math.sin(u * Math.PI) * height * 0.075,
        cup * width * bend + (u - 0.5) * (v - 0.5) * width * 0.3
          + Math.sin(v * 5.2 + u * 4.1 + phase) * width * 0.027
      )
      uvs.push(seed % 2 ? 1 - u : u, v)
      const shade = brightness * (0.84 + v * 0.14 + cup * 0.02)
      colors.push(shade, shade, shade * 0.97)
      if (row && col) {
        const n = row * (segments + 1) + col,
          last = n - segments - 1
        indices.push(last - 1, last, n - 1, last, n, n - 1)
      }
    }
  }
  const result = geometry(positions, indices, uvs)
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return result
}

function frondCard(points, side, width, seed) {
  const positions = [],
    indices = [],
    uvs = [],
    colors = []
  const rand = randomGenerator(seed),
    shade = 0.82 + rand() * 0.18,
    curl = 0.16 + rand() * 0.24,
    phase = rand() * TAU,
    columns = 4
  // The photographed frond starts at its upper-left corner. Its diagonal stem
  // follows the branch, while the leaflets hang below that stem in world space.
  points.forEach((point, row) => {
    const t = row / (points.length - 1),
      stemInImage = 0.06 + 0.82 * t * t
    for (let col = 0; col <= columns; col += 1) {
      const imageY = col / columns,
        drop = imageY - stemInImage
      const vertex = new THREE.Vector3(...point).addScaledVector(
        side,
        width * (drop * (0.17 + curl * t) + Math.sin(t * 5.3 + phase) * drop * drop * 0.085)
      )
      vertex.y -= drop * width * (0.9 + Math.sin(t * 4.2 + phase) * 0.07)
      vertex.y += Math.sin(imageY * Math.PI) * width * 0.045
      positions.push(...vertex.toArray())
      uvs.push(t, 1 - imageY)
      const localShade = shade * (1 - Math.abs(drop) * 0.14)
      colors.push(localShade, localShade, localShade * 0.98)
      if (row && col) {
        const n = row * (columns + 1) + col,
          last = n - columns - 1
        indices.push(last - 1, last, n - 1, last, n, n - 1)
      }
    }
  })
  const result = geometry(positions, indices, uvs)
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return result
}

export function createTree(m, { height = 9, seed = 1, palm = false } = {}) {
  const rand = randomGenerator(seed),
    tree = new Assembly()
  const sway = (rand() - 0.5) * height * 0.27
  const girth = height * (palm ? 0.019 : 0.047)
  const trunkTop = height * (palm ? 1 : 0.94)
  const trunkAt = (t) => [
    Math.sin(t * 1.9) * sway + Math.sin(t * 5.1) * girth * 0.25,
    trunkTop * t,
    Math.sin(t * 3.7 + 0.2) * sway * 0.31,
  ]
  const trunk = Array.from({ length: 12 }, (_, i) => trunkAt(i / 11))
  const taper = palm
    ? [1.14, 1.04, 1, 0.95, 0.9, 0.84, 0.78, 0.71, 0.64, 0.57, 0.49, 0.31]
    : [1.5, 1.05, 0.94, 0.84, 0.71, 0.58, 0.45, 0.32, 0.21, 0.11, 0.041, 0.003]
  tree.add(
    branchGeometry(
      trunk,
      taper.map((value) => girth * value),
      11
    ),
    m.bark
  )
  if (!palm && seed >= 200 && seed < 300) {
    // Broken bark plates sit in the trunk's surface rather than floating as
    // separate cylinders. Hero trees carry this relief; distant trunks stay light.
    for (let plate = 0; plate < 34; plate += 1) {
      const start = 0.025 + rand() * 0.54,
        length = 0.026 + rand() * 0.073,
        angle = rand() * TAU,
        angularWidth = 0.2 + rand() * 0.39,
        phase = rand() * TAU,
        fissure = plate % 5 === 0
      const positions = [], indices = [], uvs = []
      for (let row = 0; row <= 5; row += 1) {
        const v = row / 5,
          t = start + v * length,
          center = new THREE.Vector3(...trunkAt(t)),
          level = t * 11,
          lower = Math.min(10, Math.floor(level)),
          radius = THREE.MathUtils.lerp(taper[lower], taper[lower + 1], level - lower) * girth
        for (let col = 0; col <= 4; col += 1) {
          const u = col / 4,
            edge = Math.pow(Math.sin(v * Math.PI), 0.38),
            a = angle + (u - 0.5) * angularWidth * (fissure ? 0.25 : 1) * (0.35 + edge * 0.65)
              + Math.sin(v * 5.1 + phase) * 0.055,
            relief = 1 + 0.068 * Math.sin(a * 3 + t * 4.1) + 0.037 * Math.sin(a * 7 - t * 6.3)
              - 0.08 * Math.pow(Math.max(0, Math.cos(a * 5 + t * 2.6)), 12),
            ridge = Math.sin(u * Math.PI) * edge * girth * (fissure ? 0.004 : 0.055),
            r = radius * relief + ridge + girth * (fissure ? 0.004 : -0.01)
          positions.push(center.x + Math.sin(a) * r, center.y, center.z - Math.cos(a) * r)
          uvs.push(0.11 + u * 0.26 + plate * 0.173, v * (0.55 + length * 3) + plate * 0.219)
          if (row && col) {
            const n = row * 5 + col, last = n - 5
            indices.push(last - 1, n - 1, last, last, n - 1, n)
          }
        }
      }
      tree.add(geometry(positions, indices, uvs), fissure ? m.barkDark : m.bark)
    }
  }
  if (palm) {
    for (let i = 1; i < height * 4; i += 1) {
      const t = i / (height * 4),
        ringRadius = girth * (1.04 - t * 0.6)
      const ring = new THREE.TorusGeometry(ringRadius + 0.003, 0.006, 3, 10)
      tree.add(ring, m.bark, trunkAt(t), null, [Math.PI / 2, 0, 0])
      ring.dispose()
    }
    const top = new THREE.Vector3(...trunk[11])
    const fronds = m.frond ? 14 + (seed % 4) : 13
    for (let f = 0; f < fronds; f += 1) {
      const angle = (f / fronds) * TAU + (rand() - 0.5) * 0.62
      const length = height * (0.33 + rand() * 0.18)
      const reach = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
      const sideways = new THREE.Vector3(-reach.z, 0, reach.x)
      const points = [],
        radii = [],
        lift = 0.2 + rand() * 0.17,
        drop = 0.26 + rand() * 0.25
      for (let j = 0; j <= 10; j += 1) {
        const t = j / 10,
          point = top.clone().addScaledVector(reach, t * length)
        point.y += Math.sin(t * Math.PI) * length * lift - t * t * length * drop
        point.addScaledVector(sideways, Math.sin(t * Math.PI) * length * (rand() - 0.5) * 0.025)
        points.push(point.toArray())
        radii.push(0.031 * (1 - t) + 0.003)
      }
      tree.add(branchGeometry(points, radii, 5), m.leafVein)
      if (m.frond) {
        tree.add(frondCard(points, sideways, length * 0.73, seed + f), m.frond)
      } else {
        for (let j = 1; j <= 19; j += 1) {
          const t = j / 20,
            base = top.clone().addScaledVector(reach, t * length)
          base.y +=
            Math.sin(t * Math.PI) * length * lift - t * t * length * drop
          for (const sign of [-1, 1]) {
            const tip = base
              .clone()
              .addScaledVector(
                sideways,
                sign * length * (0.32 * Math.sin(t * Math.PI) + 0.025)
              )
              .addScaledVector(reach, length * 0.13)
            tip.y -= length * 0.08
            tree.add(
              leafGeometry(
                base.toArray(),
                tip.toArray(),
                length * 0.042,
                length * 0.032,
                sign * 0.22,
                4
              ),
              (f + j) % 5 === 0 ? m.leafLight : m.leaf
            )
          }
        }
      }
    }
    // Young upright leaves conceal the stem's crown attachment.
    for (let i = 0; i < 4; i += 1) {
      const angle = i * 2.3,
        end = top
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(angle) * height * 0.09,
              height * 0.075,
              Math.sin(angle) * height * 0.09
            )
          )
      tree.add(
        leafGeometry(
          top.toArray(),
          end.toArray(),
          height * 0.036,
          0.14,
          angle,
          4
        ),
        m.leaf
      )
    }
  } else {
    for (let r = 0; r < 7; r += 1) {
      const angle = (r / 7) * TAU + rand() * 0.3,
        reach = girth * (2.7 + rand() * 1.8)
      const dx = Math.cos(angle),
        dz = Math.sin(angle)
      tree.add(
        branchGeometry(
          [
            [dx * girth * 0.6, girth * 2.8, dz * girth * 0.6],
            [dx * girth * 1.1, girth * 1.1, dz * girth * 1.1],
            [dx * reach * 0.64, girth * 0.24, dz * reach * 0.64],
            [dx * reach, 0.025, dz * reach],
          ],
          [girth * 0.32, girth * 0.5, girth * 0.24, 0.025],
          7
        ),
        m.bark
      )
    }
    const addCrownCluster = (anchor, width, clusterSeed) => {
      if (!m.canopy) return
      for (let c = 0; c < 5; c += 1) {
        const position = anchor
          .clone()
          .add(
            new THREE.Vector3(
              (rand() - 0.5) * width * 0.55,
              (rand() - 0.4) * width * 0.43,
              (rand() - 0.5) * width * 0.55
            )
          )
        tree.add(
          foliageCard(
            width * (0.76 + rand() * 0.28),
            width * (0.67 + rand() * 0.26),
            clusterSeed + c,
            seed >= 200 && seed < 300 ? 4 : 3
          ),
          m.canopy,
          position.toArray(),
          null,
          [-0.95 + rand() * 1.9, rand() * TAU, (rand() - 0.5) * 1.2]
        )
      }
    }
    for (let b = 0; b < 12; b += 1) {
      const angle = b * 2.399 + rand() * 0.7
      const branchT = b < 4 ? 0.41 + rand() * 0.16 : 0.57 + rand() * 0.29
      const origin = new THREE.Vector3(...trunkAt(branchT))
      const branchLength =
        height * (b < 4 ? 0.34 + rand() * 0.12 : 0.23 + rand() * 0.13)
      const dx = Math.cos(angle),
        dz = Math.sin(angle)
      const endpoint = origin
        .clone()
        .add(
          new THREE.Vector3(
            dx * branchLength,
            branchLength * (0.42 + rand() * 0.23),
            dz * branchLength
          )
        )
      const crook = (rand() - 0.5) * branchLength * 0.31
      const branchPoints = Array.from({ length: 5 }, (_, i) => {
        const t = i / 4,
          point = origin.clone().lerp(endpoint, t)
        point.x -= dz * Math.sin(t * Math.PI) * crook
        point.z += dx * Math.sin(t * Math.PI) * crook
        point.y -= Math.sin(t * Math.PI) * branchLength * (0.1 + 0.025 * (b % 3))
        return point.toArray()
      })
      tree.add(
        branchGeometry(
          branchPoints,
          [girth * (0.4 - branchT * 0.13), girth * 0.25, girth * 0.15, girth * 0.067, 0.014],
          7
        ),
        m.bark
      )
      for (let s = 0; s < 4; s += 1) {
        const sprayAngle = angle + (s - 1.5) * 0.83
        const anchor = endpoint
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(sprayAngle) * height * (0.06 + rand() * 0.05),
              (rand() - 0.35) * height * 0.15,
              Math.sin(sprayAngle) * height * (0.06 + rand() * 0.05)
            )
          )
        const elbow = endpoint.clone().lerp(anchor, 0.54)
        elbow.y += height * 0.025
        tree.add(
          branchGeometry(
            [endpoint.toArray(), elbow.toArray(), anchor.toArray()],
            [0.029, 0.017, 0.0025],
            5
          ),
          m.bark
        )
        addCrownCluster(
          anchor,
          height * (0.19 + rand() * 0.09),
          seed * 100 + b * 7 + s
        )
        const leafCount = m.canopy ? (seed >= 200 && seed < 300 ? 3 : 2) : 9
        for (let l = 0; l < leafCount; l += 1) {
          const leafAngle = sprayAngle + l * 1.25 + rand() * 0.7
          const length = height * (0.038 + rand() * 0.024)
          const base = anchor
            .clone()
            .add(
              new THREE.Vector3(
                (rand() - 0.5) * length * 1.5,
                (rand() - 0.5) * length,
                (rand() - 0.5) * length * 1.5
              )
            )
          const tip = base
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(leafAngle) * length,
                (rand() - 0.5) * length * 1.1,
                Math.sin(leafAngle) * length
              )
            )
          const twist = (rand() - 0.5) * 2.2
          const blade = leafGeometry(base.toArray(), tip.toArray(), length * 0.43, length * 0.19, twist, seed >= 200 && seed < 300 ? 4 : 3)
          tree.add(blade, l % 5 === 0 ? m.leafLight : l % 3 === 0 ? m.leafDark : m.leaf)
          if (seed >= 200 && seed < 300 && l === 0) {
            const underside = blade.clone(),
              positions = underside.attributes.position,
              normals = underside.attributes.normal
            for (let v = 0; v < positions.count; v += 1) {
              positions.setXYZ(v,
                positions.getX(v) - normals.getX(v) * 0.003,
                positions.getY(v) - normals.getY(v) * 0.003,
                positions.getZ(v) - normals.getZ(v) * 0.003)
            }
            tree.add(underside, m.leafDark)
            underside.dispose()
          }
          blade.dispose()
          // A few exposed leaves have a physical midrib; the rest use the atlas vein.
          if (seed >= 200 && seed < 300 && l === 0 && b % 2 === 0) {
            const middle = base.clone().lerp(tip, 0.5)
            middle.y += length * 0.19 + length * 0.014
            tree.add(
              branchGeometry([base.toArray(), middle.toArray(), tip.toArray()],
                [length * 0.005, length * 0.003, 0.001], 3),
              m.leafVein
            )
          }
        }
      }
    }
    addCrownCluster(new THREE.Vector3(...trunk[11]), height * 0.29, seed + 97)
    for (let v = 0; v < 3; v += 1) {
      const angle = v * 2.4 + seed,
        x = Math.cos(angle) * height * 0.1,
        z = Math.sin(angle) * height * 0.1
      tree.add(
        branchGeometry(
          [
            [x, height * 0.76, z],
            [x * 0.8, height * 0.52, z * 0.7],
            [x * 0.9, height * 0.3, z * 0.7],
            [x * 1.3, height * 0.14, z],
          ],
          [0.023, 0.018, 0.012, 0.003],
          4
        ),
        m.bark
      )
    }
  }
  const result = tree.finish(palm ? 'Feather palm' : 'Buttress canopy tree')
  result.userData.height = height
  return result
}

export function createBroadleafUnderstory(m, { scale = 1, seed = 1 } = {}) {
  const rand=randomGenerator(seed),plant=new Assembly(),phase=rand()*TAU
  for(let stem=0;stem<6;stem++) {
    const angle=phase+stem*2.39996+(rand()-.5)*.4
    const out=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle))
    const side=new THREE.Vector3(-out.z,0,out.x)
    const height=.44+rand()*.55,reach=.4+rand()*.38
    const at=t=>out.clone().multiplyScalar(reach*t*t).setY(.04+height*t)
    const points=Array.from({length:6},(_,i)=>at(i/5).toArray())
    plant.add(branchGeometry(points,points.map((_,i)=>.0085-i*.00115),4),m.leafVein)
    for(let leaf=0;leaf<6;leaf++) {
      const sign=leaf%2===0?1:-1,t=.38+leaf*.10
      const base=at(t),length=.35+rand()*.39
      const tip=base.clone().addScaledVector(out,length*(.48+rand()*.2))
        .addScaledVector(side,sign*length*.63)
      tip.y-=length*(.13+rand()*.28)
      plant.add(leafGeometry(base.toArray(),tip.toArray(),length*(.35+rand()*.14),length*.16,sign*(.15+rand()*.5),6),leaf%4===0?m.leafDark:stem%3===0?m.leafLight:m.leaf)
    }
  }
  const result=plant.finish('Curved broadleaf understory')
  result.scale.setScalar(scale)
  return result
}

export function createUnderstoryPalm(m, { scale = 1, seed = 1 } = {}) {
  const rand=randomGenerator(seed),palm=new Assembly()
  const count=6+Math.floor(rand()*3),phase=rand()*TAU
  for(let f=0;f<count;f++) {
    const angle=phase+f*2.39996+(rand()-.5)*.32
    const direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle))
    const side=new THREE.Vector3(-direction.z,0,direction.x)
    const length=1.2+rand()*.85,height=.48+rand()*.42,lean=(rand()-.5)*.26
    const at=t=>direction.clone().multiplyScalar(length*t)
      .addScaledVector(side,Math.sin(t*Math.PI)*lean)
      .setY(.11+Math.sin(t*Math.PI*.79)*height-.15*t*t)
    const points=Array.from({length:11},(_,i)=>at(i/10).toArray())
    palm.add(branchGeometry(points,points.map((_,i)=>.010*(1-i/12)),5),m.leafVein)
    const pairs=11+Math.floor(rand()*5)
    for(let j=1;j<=pairs;j++) {
      for(const sign of [-1,1]) {
        if(rand()<.19)continue
        const t=(j+(sign>0?.28:0)+(rand()-.5)*.4)/(pairs+1)
        const base=at(t)
        const reach=(.1+.38*Math.pow(Math.sin(t*Math.PI),.7))*(.6+rand()*.65)
        const tip=base.clone().addScaledVector(side,sign*reach)
          .addScaledVector(direction,.07+reach*.22)
        tip.y-=.06+reach*(.18+rand()*.27)+t*t*.1
        palm.add(leafGeometry(base.toArray(),tip.toArray(),reach*(.11+rand()*.10),.016+rand()*.065,sign*(.08+rand()*.85),9,true),f%4===0?m.leafDark:m.leaf)
      }
    }
    palm.add(leafGeometry(at(.91).toArray(),at(1.07).toArray(),.023,.025,lean,4),m.leaf)
  }
  const result=palm.finish('Individually arcing understory palm')
  result.scale.setScalar(scale)
  return result
}

export function createFern(m, { scale = 1, seed = 1 } = {}) {
  const rand = randomGenerator(seed),
    fern = new Assembly()
  const habit = seed % 3,
    fronds = 4 + Math.floor(rand() * 3),
    spread = 0.78 + rand() * 0.42,
    crownLean = rand() * TAU,
    crown = new THREE.Vector3(Math.cos(crownLean) * 0.08, 0.035, Math.sin(crownLean) * 0.08)
  for (let f = 0; f < fronds; f += 1) {
    const angle = f * 2.39996 + rand() * 0.68 + crownLean,
      reach = (0.64 + rand() * 0.55) * spread * (habit === 1 ? 0.79 : 1),
      height = (0.35 + rand() * 0.39) * (habit === 1 ? 0.92 : habit === 2 ? 0.8 : 1),
      aging = f === 0 && habit !== 1 ? 0.25 : rand() * 0.09,
      sweep = (rand() - 0.5) * reach * 0.3,
      roll = (rand() - 0.5) * 0.62
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const side = new THREE.Vector3(-direction.z, 0, direction.x)
    const points = [],
      radii = []
    const pointAt = (t) => crown.clone()
      .addScaledVector(direction, reach * t)
      .addScaledVector(side, Math.sin(t * Math.PI) * sweep)
      .setY(0.035 + Math.sin(t * Math.PI * (0.77 + aging)) * height - t * t * aging * 0.3)
    for (let i = 0; i <= 7; i += 1) {
      points.push(pointAt(i / 7).toArray())
      radii.push(0.01 * (1 - i / 8))
    }
    fern.add(branchGeometry(points, radii, 4), m.leafVein)
    const pairs = 8 + Math.floor(rand() * 4)
    for (let j = 1; j <= pairs; j += 1) {
      for (const sign of [-1, 1]) {
        // Alternating attachments and missing lower pinnae break the comb shape.
        if (rand() < (j < 3 ? 0.3 : 0.2)) continue
        const t = (j + (rand() - 0.5) * 0.4 + (sign > 0 ? 0.24 : 0)) / (pairs + 1.35),
          base = pointAt(t),
          length = (Math.pow(Math.sin(t * Math.PI), 0.74) * reach * (habit === 2 ? 0.32 : 0.255) + 0.018)
            * (0.65 + rand() * 0.65)
        const tip = base
          .clone()
          .addScaledVector(side, length * sign)
          .addScaledVector(direction, reach * (0.085 + rand() * 0.064))
        tip.y += 0.027 - t * t * 0.125 + Math.sin(t * 4 + roll) * sign * 0.022
        fern.add(
          leafGeometry(base.toArray(), tip.toArray(), length * (habit === 2 ? 0.32 : 0.24),
            0.026 + length * 0.09, sign * (0.22 + roll), 3),
          f === 0 && habit === 2 ? m.leafDark : rand() < 0.2 ? m.leafLight : rand() < 0.25 ? m.leafDark : m.leaf
        )
      }
    }
    const tipBase = pointAt(0.86), tip = pointAt(1.04)
    fern.add(leafGeometry(tipBase.toArray(), tip.toArray(), reach * 0.043, 0.025, roll + Math.sin(seed) * 0.3, 3), m.leaf)
  }
  if (m.fernCard) {
    const cards = seed % 4 === 0 ? 2 : 1
    for (let i = 0; i < cards; i += 1) {
      const cardWidth = (1.22 + rand() * 0.42) * spread,
        cardHeight = 0.83 + rand() * 0.34
      fern.add(
        foliageCard(cardWidth, cardHeight, seed * 7 + i),
        seed % 3 === 1 && m.branchCard ? m.branchCard : m.fernCard,
        [(rand() - 0.5) * 0.24, cardHeight * 0.45, (rand() - 0.5) * 0.24],
        null,
        [-0.26 + rand() * 0.55, crownLean + i * 2.1 + rand() * 0.6, (rand() - 0.5) * 0.4]
      )
    }
  }
  // One furled young shoot gives upright silhouettes an asymmetric centre.
  if (habit === 1) {
    const angle = crownLean + 0.7,
      side = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
      stem = [crown.toArray(), [crown.x + side.x * 0.08, 0.24, crown.z + side.z * 0.08],
        [crown.x + side.x * 0.05, 0.49, crown.z + side.z * 0.05],
        [crown.x + side.x * 0.12, 0.54, crown.z + side.z * 0.12],
        [crown.x + side.x * 0.15, 0.5, crown.z + side.z * 0.15]]
    fern.add(branchGeometry(stem, [0.017, 0.014, 0.012, 0.015, 0.009], 5), m.leaf)
  }
  const result = fern.finish('Pinnate fern')
  result.scale.setScalar(scale)
  return result
}

function ropeWrap(parts, m, x, y, z, radius, turns = 3) {
  for (let i = 0; i < turns; i += 1) {
    const ring = new THREE.TorusGeometry(radius, 0.014, 4, 12)
    parts.add(ring, m.rope, [x, y + i * 0.026, z], null, [
      Math.PI / 2 + i * 0.025,
      0,
      0,
    ])
    ring.dispose()
  }
}

function weatheredPlank(width, depth, seed) {
  const positions = [],
    indices = [],
    uvs = []
  const divisions = 14,
    columns = 9
  const bevel = Math.min(0.009, depth * 0.09)
  const rows = []
  for (let i = 0; i <= divisions; i += 1) {
    const t = i / divisions,
      x = (t - 0.5) * width
    const split =
      depth * (0.12 * Math.sin(seed * 2.9) + 0.05 * Math.sin(t * 6 + seed))
    const direction = seed % 2 ? t : 1 - t
    const fracture = Math.max(0, 1 - direction / (0.44 + (seed % 3) * 0.13))
    const crackWidth = 0.002 + fracture * Math.min(depth * 0.057, 0.01)
    const edges = [
      -depth / 2,
      -depth / 2 + bevel,
      split - depth * 0.2,
      split - crackWidth,
      split,
      split + crackWidth,
      split + depth * 0.2,
      depth / 2 - bevel,
      depth / 2,
    ]
    const row = []
    edges.forEach((z, j) => {
      let y = 0.05 - Math.pow(z / depth, 2) * 0.01
      y -= (Math.sin(x * 6.7 + seed + z * 31) + 1) * 0.0014
      y -= Math.pow(Math.sin(t * Math.PI), 2) * (0.001 + (seed % 4) * 0.0015)
      if (j === 0 || j === columns - 1) y -= bevel
      if (j === 4) y -= fracture * 0.022
      const endWear =
        i === 0 || i === divisions
          ? Math.sign(x) *
            (0.005 + Math.pow(Math.sin(z * 49 + seed * 3), 8) * 0.025)
          : 0
      row.push([x - endWear, y, z])
      positions.push(x - endWear, y, z)
      // Vary the crop within the broad worn timber scan for each board.
      uvs.push(
        t + seed * 0.137,
        seed * 0.171 + ((z + depth / 2) / depth) * 0.38
      )
      if (i && j) {
        const a = i * columns + j,
          b = a - columns
        indices.push(b - 1, b, a - 1, b, a, a - 1)
      }
    })
    rows.push(row)
  }
  const edge = [
    ...rows.map((row) => row[0]),
    ...rows[divisions].slice(1),
    ...rows
      .slice(0, divisions)
      .reverse()
      .map((row) => row[columns - 1]),
    ...rows[0].slice(1, columns - 1).reverse(),
  ]
  edge.forEach((point, i) => {
    const next = edge[(i + 1) % edge.length],
      start = positions.length / 3
    positions.push(
      ...point,
      ...next,
      next[0],
      -0.05,
      next[2],
      point[0],
      -0.05,
      point[2]
    )
    uvs.push(
      point[0] / width + seed * 0.137,
      seed * 0.171,
      next[0] / width + seed * 0.137,
      seed * 0.171,
      next[0] / width + seed * 0.137,
      seed * 0.171 + 0.38,
      point[0] / width + seed * 0.137,
      seed * 0.171 + 0.38
    )
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3)
  })
  const bottom = positions.length / 3
  positions.push(
    -width / 2,
    -0.05,
    -depth / 2,
    width / 2,
    -0.05,
    -depth / 2,
    width / 2,
    -0.05,
    depth / 2,
    -width / 2,
    -0.05,
    depth / 2
  )
  uvs.push(0, 0.05, 1, 0.05, 1, 0.2, 0, 0.2)
  indices.push(bottom, bottom + 1, bottom + 2, bottom, bottom + 2, bottom + 3)
  return geometry(positions, indices, uvs)
}

// The cap is part of the timber, with deep radial checks continuing down its
// sides. No box sits on top of the post, and the broken rim catches side light.
function splitRiverPost(height, seed) {
  const rand = randomGenerator(seed)
  const cracks = [0.35 + rand() * 0.3, 2.35 + rand() * 0.4, 4.7 + rand() * 0.4]
  const angles = Array.from({ length: 24 }, (_, i) => (i * TAU) / 24)
  cracks.forEach((angle) =>
    angles.push(angle - 0.09, angle - 0.035, angle, angle + 0.035, angle + 0.09)
  )
  angles.sort((a, b) => a - b)
  angles.push(TAU)
  const positions = [],
    indices = [],
    uvs = []
  const levels = [
    -1.2,
    -0.25,
    0.05,
    height * 0.42,
    height - 0.19,
    height - 0.055,
    height - 0.015,
    height,
  ]
  const profile = (angle) => {
    let check = 0
    cracks.forEach((centre, i) => {
      const d = Math.atan2(Math.sin(angle - centre), Math.cos(angle - centre))
      check += Math.exp(-Math.pow(d / 0.042, 2)) * (i === 1 ? 1 : 0.7)
    })
    return check
  }
  levels.forEach((y, level) => {
    angles.forEach((angle, j) => {
      const upper = THREE.MathUtils.smoothstep(y, height - 0.37, height)
      const check = profile(angle)
      const radius =
        0.122 +
        Math.sin(angle * 5 + seed) * 0.008 +
        Math.cos(angle * 9 - seed) * 0.003 +
        (y < 0.06 ? 0.008 : 0) -
        upper * check * 0.034 -
        (level === levels.length - 1 ? 0.007 : 0)
      const crown =
        level === levels.length - 1
          ? -0.009 - (Math.sin(angle * 7 + seed) + 1) * 0.006 - check * 0.016
          : 0
      positions.push(
        Math.cos(angle) * radius + y * 0.013,
        y + crown,
        Math.sin(angle) * radius * 0.94 + Math.sin(y * 1.6) * 0.008
      )
      uvs.push(
        y * 0.7 + seed * 0.31,
        (seed % 4) * 0.25 + 0.045 + (angle / TAU) * 0.15
      )
      if (level && j) {
        const a = level * angles.length + j,
          b = a - angles.length
        indices.push(a - 1, a, b - 1, a, b, b - 1)
      }
    })
  })
  const shell = geometry(positions, indices, uvs)
  const capPositions = [],
    capIndices = [],
    capUvs = []
  const capRings = [0, 0.35, 0.7, 1]
  capRings.forEach((r, row) => {
    angles.forEach((angle, j) => {
      const edge = (levels.length - 1) * angles.length + j
      const ex = positions[edge * 3] - height * 0.013
      const ez = positions[edge * 3 + 2] - Math.sin(height * 1.6) * 0.008
      capPositions.push(
        ex * r + height * 0.013,
        positions[edge * 3 + 1] -
          (1 - r) * 0.011 -
          profile(angle) * Math.sin(r * Math.PI) * 0.029,
        ez * r + Math.sin(height * 1.6) * 0.008
      )
      capUvs.push(
        0.5 + ex * r * 2.3 + seed * 0.137,
        (seed % 4) * 0.25 + 0.12 + ez * r * 0.55
      )
      if (row && j) {
        const a = row * angles.length + j,
          b = a - angles.length
        capIndices.push(b - 1, a, a - 1, b - 1, b, a)
      }
    })
  })
  return { shell, cap: geometry(capPositions, capIndices, capUvs) }
}

/** Width along X; deck runs from z=0 to z=-length, walking surface y=0.1. */
export function createDock(m, { length = 12, width = 2.4, insetPosts = false } = {}) {
  const dock = new Assembly(),
    rand = randomGenerator(Math.round(length * 15))
  const count = Math.ceil(length / 0.28),
    spacing = length / count
  for (let i = 0; i < count; i += 1) {
    const z = -(i + 0.5) * spacing
    const board = weatheredPlank(
      width + (rand() - 0.5) * 0.06,
      spacing - 0.009,
      i
    )
    dock.add(
      board,
      i % 7 === 0 ? m.woodDark : i % 3 === 0 ? m.woodLight : m.wetWood,
      [(rand() - 0.5) * 0.03, 0.05 - rand() * 0.006, z],
      null,
      [0, (rand() - 0.5) * 0.004, (rand() - 0.5) * 0.003]
    )
    board.dispose()
    for (const side of [-1, 1]) {
      dock.box(
        m.metal,
        [side * (width * 0.5 - 0.18), 0.096, z - 0.047],
        [0.012, 0.005, 0.013]
      )
    }
  }
  for (const side of [-1, 1]) {
    dock.box(
      m.woodDark,
      [side * width * 0.38, -0.075, -length / 2],
      [0.14, 0.18, length + 0.15]
    )
    for (let z = -0.16; z > -length + 0.05; z -= 2.2) {
      const inward = insetPosts && side > 0 ? 0.45 * Math.min(1, Math.abs(z) / 4) : 0,
        x = side * (width * 0.5 + 0.06) - inward,
        top = 0.66 + rand() * 0.18
      const post = splitRiverPost(
        top,
        Math.round(Math.abs(z) * 100) + (side > 0 ? 13 : 2)
      )
      dock.add(post.shell, m.wetWood, [x, 0, z])
      dock.add(post.cap, m.woodLight, [x, 0, z])
      post.shell.dispose()
      post.cap.dispose()
      ropeWrap(dock, m, x + 0.006, top - 0.25, z + 0.008, 0.129)
    }
  }
  const group = dock.finish('Weathered river landing')
  group.userData.walkingY = 0.1
  group.userData.bounds = {
    minX: -width / 2,
    maxX: width / 2,
    minZ: -length,
    maxZ: 0,
  }
  return group
}

/** Long axis Z, 4.5m length, 1.05m beam. Origin is at the waterline. */
export function createCanoe(m) {
  const boat = new Assembly()
  const length = 4.5,
    stations = 52,
    strakes = 8,
    subdivisions = 4
  const hullPoint = (t, q, inside = false) => {
    const end = Math.abs(t - 0.5) * 2
    const taper = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.72)
    const angle = -Math.PI / 2 + q * Math.PI
    const keel = -0.268 + Math.pow(end, 3.3) * 0.43
    const rim = 0.247 + Math.pow(end, 3) * 0.18
    const x = Math.sin(angle) * taper * (inside ? 0.471 : 0.497)
    const y =
      keel +
      (rim - keel) * Math.pow(1 - Math.cos(angle), 0.77) +
      (inside
        ? Math.cos(angle) * 0.027 - Math.abs(Math.sin(angle)) * 0.008
        : 0) +
      Math.sin(t * 31 + q * 8) * 0.0018 * taper * Math.abs(Math.sin(angle))
    return new THREE.Vector3(x, y, (t - 0.5) * length)
  }
  const hull = (inside) => {
    const positions = [],
      indices = [],
      uvs = []
    // Separate UV islands follow the long grain of each bent plank. Subtle
    // recessed joins describe construction without outlining the whole boat.
    for (let band = 0; band < strakes; band += 1) {
      const start = positions.length / 3
      for (let i = 0; i <= stations; i += 1) {
        const t = i / stations
        for (let j = 0; j <= subdivisions; j += 1) {
          const q = (band + j / subdivisions) / strakes
          const point = hullPoint(t, q, inside)
          if (j === 0 || j === subdivisions) {
            point.x *= inside ? 1.003 : 0.996
            point.y += inside ? 0.001 : -0.001
          }
          positions.push(...point.toArray())
          uvs.push(
            t * 1.9 + band * 0.137,
            (band % 4) * 0.25 + 0.045 + (j / subdivisions) * 0.15
          )
          if (i && j) {
            const a = start + i * (subdivisions + 1) + j,
              b = a - subdivisions - 1
            indices.push(
              ...(inside
                ? [a - 1, a, b - 1, a, b, b - 1]
                : [a - 1, b - 1, a, a, b - 1, b])
            )
          }
        }
      }
    }
    return geometry(positions, indices, uvs)
  }
  const exterior = hull(false)
  const exteriorColors = []
  const exteriorPositions = exterior.attributes.position
  for (let i = 0; i < exteriorPositions.count; i++) {
    const shade = .6+.4*THREE.MathUtils.smoothstep(exteriorPositions.getY(i),-.2,.18)
    exteriorColors.push(shade,shade,shade)
  }
  exterior.setAttribute('color',new THREE.Float32BufferAttribute(exteriorColors,3))
  boat.add(exterior, m.hullWood || m.wetWood)
  boat.add(hull(true), m.wood)
  for (const sign of [-1, 1]) {
    const points = []
    for (let i = 0; i <= 26; i += 1) {
      const t = i / 26,
        point = hullPoint(t, sign < 0 ? 0 : 1)
      point.z *= 0.9875
      point.y += 0.005 + Math.sin(t * 33 + sign) * 0.002
      points.push(point)
    }
    const curve = new THREE.CatmullRomCurve3(points)
    const rail = new THREE.TubeGeometry(curve, 78, 0.028, 10, false)
    const railUvs = rail.attributes.uv
    for (let i = 0; i < railUvs.count; i += 1)
      railUvs.setXY(
        i,
        railUvs.getX(i) * 2 + sign * 0.137,
        0.295 + railUvs.getY(i) * 0.15
      )
    boat.add(rail, m.woodLight)
    rail.dispose()
    // An inset rubbing strip gives the hull a substantial timber rim.
    const innerPoints = points.map(
      (point) => new THREE.Vector3(point.x * 0.956, point.y - 0.033, point.z)
    )
    const innerRail = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(innerPoints),
      64,
      0.012,
      6,
      false
    )
    const innerUvs = innerRail.attributes.uv
    for (let i = 0; i < innerUvs.count; i += 1)
      innerUvs.setXY(
        i,
        innerUvs.getX(i) * 2 + 0.37,
        0.545 + innerUvs.getY(i) * 0.15
      )
    boat.add(innerRail, m.woodDark)
    innerRail.dispose()
  }
  // Curved internal ribs, with narrow floorboards and transverse thwarts.
  for (let z = -1.6; z <= 1.61; z += 0.4) {
    const points = Array.from({ length: 17 }, (_, j) => {
      const point = hullPoint(z / length + 0.5, j / 16, true)
      point.x *= 0.98
      point.y += 0.012
      return point
    })
    const rib = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      0.015,
      6,
      false
    )
    const ribUvs = rib.attributes.uv
    for (let i = 0; i < ribUvs.count; i += 1)
      ribUvs.setXY(
        i,
        ribUvs.getX(i) * 0.65 + z * 0.17,
        0.795 + ribUvs.getY(i) * 0.15
      )
    boat.add(rib, m.woodDark)
    rib.dispose()
  }
  for (let i = -2; i <= 2; i += 1) {
    const plank = weatheredPlank(2.63 - Math.abs(i) * 0.035, 0.068, 32 + i)
    const vertices = plank.attributes.position
    for (let j = 0; j < vertices.count; j += 1)
      vertices.setY(
        j,
        vertices.getY(j) * 0.36 + Math.pow(vertices.getX(j) / 1.4, 4) * 0.038
      )
    plank.computeVertexNormals()
    boat.add(plank, i % 2 ? m.wood : m.woodDark, [i * 0.075, -0.148, 0], null, [
      0,
      Math.PI / 2,
      0,
    ])
    plank.dispose()
  }
  for (const z of [-1.05, 0.1, 1.1]) {
    const width = hullPoint(z / length + 0.5, 1, true).x * 2 - 0.024
    const seat = weatheredPlank(width, 0.19, Math.round(z * 20) + 43)
    boat.add(seat, m.woodLight, [0, 0.18, z], [1, 0.5, 1], [0, z * 0.008, 0])
    seat.dispose()
    // Small angled knees connect thwarts to the inner planking.
    for (const sign of [-1, 1])
      boat.beam(
        m.woodDark,
        [sign * width * 0.43, 0.17, z],
        [sign * width * 0.48, 0.057, z + 0.025],
        0.022,
        0.02,
        6
      )
  }
  boat.beam(m.woodLight, [0.12, 0.24, -1.7], [0.3, 0.36, 1.01], 0.022, 0.022, 7)
  const bladeOutline = new THREE.Shape()
  bladeOutline.moveTo(-0.026, 0.29)
  bladeOutline.bezierCurveTo(-0.045, 0.13, -0.092, -0.025, -0.087, -0.22)
  bladeOutline.quadraticCurveTo(-0.082, -0.292, 0, -0.296)
  bladeOutline.quadraticCurveTo(0.082, -0.29, 0.087, -0.22)
  bladeOutline.bezierCurveTo(0.088, -0.035, 0.042, 0.12, 0.026, 0.29)
  bladeOutline.closePath()
  const blade = new THREE.ExtrudeGeometry(bladeOutline, {
    depth: 0.019,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 6,
    steps: 1,
  })
  const bladeUvs = blade.attributes.uv
  for (let i = 0; i < bladeUvs.count; i += 1)
    bladeUvs.setXY(
      i,
      bladeUvs.getY(i) * 1.6 + 0.3,
      0.295 + (bladeUvs.getX(i) + 0.1) * 0.7
    )
  boat.add(blade, m.woodLight, [0.105, 0.222, -1.89], null, [
    Math.PI / 2,
    0,
    -0.05,
  ])
  blade.dispose()
  const result = boat.finish('Carved wooden river canoe')
  result.userData.length = length
  result.userData.width = 1.05
  return result
}

export function createCrate(m) {
  const crate = new Assembly()
  crate.box(m.woodDark, [0, 0.31, 0], [0.6, 0.6, 0.54])
  for (let i = 0; i < 5; i += 1) {
    for (const side of [-1, 1]) {
      crate.box(
        i % 2 ? m.wood : m.woodLight,
        [(i - 2) * 0.117, 0.32, side * 0.28],
        [0.112, 0.6, 0.027]
      )
      crate.box(
        i % 2 ? m.woodLight : m.wood,
        [side * 0.318, 0.32, (i - 2) * 0.104],
        [0.028, 0.6, 0.1]
      )
    }
    crate.box(m.wood, [(i - 2) * 0.12, 0.633, 0], [0.112, 0.035, 0.58])
  }
  for (const side of [-1, 1]) {
    for (const y of [0.085, 0.557]) {
      crate.box(m.woodDark, [0, y, side * 0.305], [0.66, 0.07, 0.038])
      for (const x of [-0.26, 0.26])
        crate.oval(m.metal, [x, y, side * 0.328], [0.01, 0.01, 0.004])
    }
    crate.box(m.metal, [side * 0.333, 0.405, 0], [0.009, 0.042, 0.145])
  }
  return crate.finish('Shipping crate')
}

export function createDesk(m) {
  const desk = new Assembly()
  for (const x of [-0.55, 0.55])
    for (const z of [-0.29, 0.29]) {
      desk.box(
        m.woodDark,
        [x, 0.38, z],
        [0.065, 0.76, 0.065],
        [z * 0.035, 0, -x * 0.025]
      )
    }
  for (const z of [-0.3, 0.3]) desk.box(m.wood, [0, 0.64, z], [1.2, 0.12, 0.05])
  for (let i = 0; i < 5; i += 1)
    desk.box(m.woodLight, [0, 0.78, (i - 2) * 0.148], [1.3, 0.047, 0.14])
  desk.box(m.leather, [-0.18, 0.814, 0.05], [0.37, 0.045, 0.25], [0, -0.12, 0])
  desk.box(m.paper, [-0.13, 0.843, 0.045], [0.28, 0.006, 0.21], [0, -0.12, 0])
  for (let i = 0; i < 6; i += 1)
    desk.box(
      m.woodDark,
      [-0.13, 0.847, -0.025 + i * 0.023],
      [0.19 - (i % 3) * 0.02, 0.001, 0.002],
      [0, -0.12, 0]
    )
  desk.box(m.paper, [0.25, 0.812, 0.01], [0.22, 0.007, 0.31], [0, 0.27, 0])
  desk.beam(m.dark, [0.32, 0.809, -0.23], [0.32, 0.89, -0.23], 0.029, 0.026, 10)
  desk.beam(
    m.woodDark,
    [0.31, 0.87, -0.23],
    [0.37, 1.065, -0.23],
    0.003,
    0.002,
    5
  )
  // An empty field chair keeps this a scene prop rather than another character.
  desk.box(m.wood, [0, 0.445, 0.71], [0.43, 0.043, 0.42])
  for (const x of [-0.18, 0.18]) {
    for (const z of [0.54, 0.88])
      desk.box(m.woodDark, [x, 0.23, z], [0.036, 0.46, 0.036])
    desk.box(m.woodDark, [x, 0.69, 0.9], [0.035, 0.5, 0.035])
  }
  desk.box(m.wood, [0, 0.86, 0.9], [0.4, 0.125, 0.036])
  return desk.finish('Field desk and report')
}

function roofPanel(parts, m, corners, material) {
  const positions = corners.flat()
  const a = new THREE.Vector3(...corners[1]).sub(
    new THREE.Vector3(...corners[0])
  )
  const b = new THREE.Vector3(...corners[2]).sub(
    new THREE.Vector3(...corners[0])
  )
  const upward = a.cross(b).y > 0
  const panel = geometry(
    positions,
    upward ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2],
    [0, 0, 2, 0, 2, 2, 0, 2]
  )
  parts.add(panel, material || m.thatch)
}

export function createShelter(m, { amazon = false, ireland = false } = {}) {
  if (ireland) return createCottage(m)
  const shelter = new Assembly(),
    rand = randomGenerator(amazon ? 19 : 5)
  const width = 3.8,
    depth = 3.25,
    eave = 2.3,
    ridge = 3.22
  for (let i = 0; i < 20; i += 1)
    shelter.box(
      i % 3 ? m.wood : m.woodLight,
      [0, 0.09, (i / 19 - 0.5) * depth],
      [width, 0.12, depth / 20 - 0.004]
    )
  for (const x of [-1.69, 1.69])
    for (const z of [-1.39, 1.39]) {
      shelter.beam(
        m.bark,
        [x, -0.65, z],
        [x + 0.023, eave + 0.05, z],
        0.091,
        0.075,
        8
      )
      shelter.beam(
        m.woodDark,
        [x, eave - 0.58, z],
        [x - Math.sign(x) * 0.5, eave, z],
        0.04,
        0.04,
        6
      )
      ropeWrap(shelter, m, x, eave - 0.12, z, 0.09, 3)
    }
  for (const x of [-1.7, 1.7])
    shelter.beam(m.woodDark, [x, eave, -1.5], [x, eave, 1.5], 0.082, 0.082)
  for (const z of [-1.43, 1.43]) {
    shelter.beam(m.woodDark, [-1.78, eave, z], [1.78, eave, z], 0.075, 0.075)
    shelter.beam(
      m.woodDark,
      [-1.98, eave - 0.03, z],
      [0, ridge, z],
      0.065,
      0.065
    )
    shelter.beam(
      m.woodDark,
      [1.98, eave - 0.03, z],
      [0, ridge, z],
      0.065,
      0.065
    )
    shelter.beam(m.woodDark, [0, eave, z], [0, ridge, z], 0.045, 0.045)
  }
  for (const side of [-1, 1]) {
    roofPanel(shelter, m, [
      [0, ridge, -1.91],
      [0, ridge, 1.91],
      [side * 2.2, eave - 0.15, 1.91],
      [side * 2.2, eave - 0.15, -1.91],
    ])
    // Real roof thickness, including the dark underside, survives eye-level views.
    const drop = ridge - eave + 0.15
    shelter.box(
      m.thatch,
      [side * 1.1, ridge - drop * 0.5 - 0.035, 0],
      [Math.hypot(2.2, drop), 0.1, 3.86],
      [0, 0, -side * Math.atan2(drop, 2.2)]
    )
    for (let z = -1.91; z <= 1.92; z += 0.062) {
      shelter.beam(
        z % 0.13 > 0.06 ? m.woodDark : m.thatch,
        [0, ridge + 0.018, z],
        [
          side * (2.18 + rand() * 0.08),
          eave - 0.17 - rand() * 0.08,
          z + (rand() - 0.5) * 0.03,
        ],
        0.015 + rand() * 0.01,
        0.018,
        5
      )
    }
    for (let row = 1; row <= 3; row += 1) {
      const t = row / 3.2
      shelter.beam(
        m.thatch,
        [side * 2.2 * t, ridge - (ridge - eave + 0.15) * t + 0.02, -1.95],
        [side * 2.2 * t, ridge - (ridge - eave + 0.15) * t + 0.02, 1.95],
        0.017,
        0.017,
        5
      )
    }
  }
  shelter.beam(
    m.woodDark,
    [0, ridge + 0.025, -2],
    [0, ridge + 0.025, 2],
    0.07,
    0.07
  )
  for (const z of [-1.9, 1.9]) {
    // Bundled thatch closes the gable, making the roof silhouette substantial.
    shelter.add(
      geometry(
        [-2.18, eave - 0.16, z, 2.18, eave - 0.16, z, 0, ridge, z],
        [0, 1, 2],
        [0, 0, 1, 0, 0.5, 1]
      ),
      m.thatch
    )
  }
  for (let x = -1.65; x <= 1.66; x += 0.22) {
    shelter.box(
      m.woodDark,
      [x, amazon ? 0.83 : 0.62, 1.42],
      [0.19, amazon ? 1.3 : 0.82, 0.042]
    )
  }
  shelter.box(m.wood, [0, amazon ? 1.51 : 1.06, 1.42], [3.5, 0.07, 0.09])
  // A small warm oil lantern is emissive; the scene decides whether to add light.
  shelter.beam(
    m.metal,
    [1.52, eave, -1.35],
    [1.52, 1.89, -1.35],
    0.007,
    0.007,
    5
  )
  shelter.beam(
    m.dark,
    [1.52, 1.59, -1.35],
    [1.52, 1.64, -1.35],
    0.073,
    0.073,
    8
  )
  shelter.beam(
    m.lantern,
    [1.52, 1.64, -1.35],
    [1.52, 1.8, -1.35],
    0.049,
    0.049,
    8
  )
  shelter.beam(m.dark, [1.52, 1.8, -1.35], [1.52, 1.85, -1.35], 0.075, 0.044, 8)
  for (const dx of [-0.057, 0.057])
    shelter.beam(
      m.metal,
      [1.52 + dx, 1.62, -1.35],
      [1.52 + dx, 1.81, -1.35],
      0.007,
      0.007,
      4
    )
  const result = shelter.finish(
    amazon ? 'Putumayo station' : 'River trading shelter'
  )
  result.userData.footprint = [width, depth]
  result.userData.lantern = new THREE.Vector3(1.52, 1.72, -1.35)
  return result
}

function masonry(parts, m, width, height, position, rotation = 0, seed = 5) {
  const rand = randomGenerator(seed)
  parts.box(m.stoneDark, position, [width, height, 0.23], [0, rotation, 0])
  const transform = new THREE.Matrix4().makeRotationY(rotation)
  for (let row = 0; row < Math.ceil(height / 0.26); row += 1) {
    const rowY = Math.min((row + 0.5) * 0.26, height - 0.12) - height / 2
    for (let x = -width / 2; x < width / 2 - 0.02; ) {
      const length = Math.min(0.32 + rand() * 0.32, width / 2 - x)
      if (length < 0.04) break
      const point = new THREE.Vector3(x + length / 2, rowY, -0.02)
        .applyMatrix4(transform)
        .add(new THREE.Vector3(...position))
      parts.box(
        rand() > 0.7 ? m.stoneLight : m.stone,
        point.toArray(),
        [length - 0.012, 0.238 + rand() * 0.009, 0.24 + rand() * 0.035],
        [0, rotation, (rand() - 0.5) * 0.015]
      )
      x += length
    }
  }
}

function createCottage(m) {
  const cottage = new Assembly()
  // Door and windows are actual openings, set into coursed masonry.
  masonry(cottage, m, 1.45, 2.45, [-1.325, 1.225, -1.6])
  masonry(cottage, m, 1.45, 2.45, [1.325, 1.225, -1.6])
  masonry(cottage, m, 1.2, 0.43, [0, 2.235, -1.6])
  masonry(cottage, m, 4.1, 2.45, [0, 1.225, 1.6])
  masonry(cottage, m, 3.2, 2.45, [-2, 1.225, 0], Math.PI / 2)
  masonry(cottage, m, 3.2, 2.45, [2, 1.225, 0], Math.PI / 2)
  cottage.box(m.dark, [0, 1.02, -1.61], [1.14, 2.04, 0.09])
  for (let i = 0; i < 7; i += 1)
    cottage.box(
      m.woodDark,
      [(i - 3) * 0.153, 0.98, -1.685],
      [0.146, 1.93, 0.05]
    )
  cottage.oval(m.brass, [-0.36, 0.98, -1.727], [0.025, 0.028, 0.018])
  cottage.box(m.stoneLight, [0, 0.045, -1.81], [1.37, 0.09, 0.47])
  for (const x of [-1.28, 1.28]) {
    cottage.box(m.stoneLight, [x, 1.42, -1.757], [0.76, 0.93, 0.09])
    cottage.box(m.dark, [x, 1.45, -1.811], [0.6, 0.72, 0.01])
    cottage.box(m.wood, [x, 1.45, -1.827], [0.039, 0.75, 0.028])
    cottage.box(m.wood, [x, 1.45, -1.827], [0.62, 0.035, 0.028])
  }
  const gable = geometry(
    [-2.05, 2.44, 0, 2.05, 2.44, 0, 0, 3.65, 0],
    [0, 2, 1],
    [0, 0, 2, 0, 1, 1]
  )
  cottage.add(gable, m.stone, [0, 0, -1.6])
  cottage.add(gable, m.stone, [0, 0, 1.6], null, [0, Math.PI, 0])
  for (const sign of [-1, 1]) {
    roofPanel(
      cottage,
      m,
      [
        [0, 3.68, -1.85],
        [0, 3.68, 1.85],
        [sign * 2.25, 2.4, 1.85],
        [sign * 2.25, 2.4, -1.85],
      ],
      m.slate
    )
    for (let row = 1; row <= 8; row += 1) {
      const t = row / 8
      cottage.beam(
        m.stoneDark,
        [sign * t * 2.25, 3.695 - t * 1.28, -1.85],
        [sign * t * 2.25, 3.695 - t * 1.28, 1.85],
        0.013,
        0.013,
        4
      )
    }
  }
  masonry(cottage, m, 0.51, 1.05, [1.16, 3.34, 0.59], 0, 3)
  cottage.box(m.stoneDark, [1.16, 3.89, 0.59], [0.68, 0.14, 0.53])
  const result = cottage.finish('Irish coastal stone cottage')
  result.userData.footprint = [4.5, 3.7]
  return result
}

/** Open-front prison set: x ±2.8, rear z=-3.5, front z=2. */
export function createPrison(m) {
  const prison = new Assembly()
  prison.box(m.stoneDark, [0, -0.09, -0.75], [5.6, 0.17, 5.5])
  for (let col = 0; col < 8; col += 1)
    for (let row = 0; row < 7; row += 1) {
      prison.box(
        m.stone,
        [-2.8 + (col + 0.5) * 0.7, 0.005, -3.5 + (row + 0.5) * (5.5 / 7)],
        [0.684, 0.027, 5.5 / 7 - 0.016]
      )
    }
  masonry(prison, m, 5.5, 3.6, [-2.81, 1.8, -0.75], Math.PI / 2)
  masonry(prison, m, 5.5, 3.6, [2.81, 1.8, -0.75], Math.PI / 2)
  masonry(prison, m, 2.12, 3.6, [-1.74, 1.8, -3.5])
  masonry(prison, m, 2.12, 3.6, [1.74, 1.8, -3.5])
  masonry(prison, m, 1.36, 1.92, [0, 0.96, -3.5])
  masonry(prison, m, 1.36, 0.48, [0, 3.36, -3.5])
  for (let x = -0.54; x <= 0.55; x += 0.18)
    prison.beam(m.metal, [x, 1.91, -3.48], [x, 3.12, -3.48], 0.016, 0.016, 6)
  prison.beam(m.metal, [-0.68, 2.44, -3.48], [0.68, 2.44, -3.48], 0.02, 0.02, 6)
  prison.box(m.stoneLight, [0, 1.9, -3.38], [1.56, 0.12, 0.48])
  // Iron cot with sagging canvas, thin mattress and a folded blanket.
  for (const x of [1.45, 2.25])
    for (const z of [-2.66, -0.64])
      prison.beam(m.metal, [x, 0.04, z], [x, 0.65, z], 0.026, 0.026, 7)
  for (const x of [1.45, 2.25])
    prison.beam(m.metal, [x, 0.49, -2.7], [x, 0.49, -0.6], 0.03, 0.03, 7)
  prison.add(
    roundedBox(0.82, 0.105, 2.01, 0.04),
    m.clothShadow,
    [1.85, 0.52, -1.65]
  )
  prison.add(
    roundedBox(0.64, 0.095, 0.36, 0.07),
    m.clothLight,
    [1.85, 0.62, -2.35]
  )
  prison.add(roundedBox(0.83, 0.13, 0.74, 0.03), m.trousers, [1.85, 0.64, -1.1])
  for (const x of [1.45, 2.25])
    prison.beam(m.metal, [x, 0.5, -2.7], [x, 0.88, -2.7], 0.023, 0.023, 7)
  prison.beam(m.metal, [1.45, 0.88, -2.7], [2.25, 0.88, -2.7], 0.023, 0.023, 7)
  const result = prison.finish('Pentonville cell')
  const desk = createDesk(m)
  desk.position.set(-1.42, 0.025, -2.55)
  result.add(desk)
  result.userData.window = new THREE.Vector3(0, 2.5, -3.5)
  return result
}
