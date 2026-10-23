// The city, drawn in the 1440 × 960 coordinates of the approved sketch.
// Projection is 2:1 isometric: one step along a floor axis moves (2, 1) or
// (-2, 1) on screen. Parts are painted back to front, bottom to top.
//
// These components only describe the art. AgentCity rasterizes them at a
// third of the size with hard edges (one art pixel = 3 units), so every
// texture below is laid out on that 3-unit grid.

export const VIEW_W = 1440
export const VIEW_H = 960
export const PX = 3

const MONO = "'IBM Plex Mono', ui-monospace, monospace"

export const PALETTES = {
  day: {
    bg: '#FFFFFF',
    wave: '#C4D9EF',
    halo: '#E3EEF9',
    haloEdge: '#CFE1F4',
    land: '#8CC452',
    speckA: '#A0D263',
    speckB: '#78B242',
    fringe: '#6CA83A',
    cliffL: '#B98E5F',
    cliffR: '#9B7448',
    strata: '#86633D',
    pave: '#E8E4DC',
    paveB: '#D5D0C5',
    road: '#5C616D',
    roadB: '#666B78',
    curb: '#D5D0C5',
    dash: '#F2C94C',
    zebra: '#F5F5F2',
    ringGrass: '#79B843',
    shadow: 'rgba(28, 44, 22, 0.24)',
    tree: ['#C6E07A', '#9CCB55', '#E6E39A'],
    pine: ['#4E9F5E', '#3A7F49'],
    trunk: '#6B4E33',
    medu: '#A8D69C',
    meduB: '#94C988',
    meduFringe: '#7DB673',
    meduCliffL: '#B98E5F',
    meduCliffR: '#9B7448',
    bb: '#9DCB6B',
    lit: '#FFD95E',
    litDim: '#C9A64A',
    glass: '#8FB5DE',
    smoke: '#B9BEC8',
    water: '#BFD7F0',
    ferryRoute: '#7FA3D3',
    dot: ['#F2B630', '#FFFFFF'],
    halo2: 0.35,
  },
  night: {
    bg: '#0B1630',
    wave: '#1E2D52',
    halo: '#0F1D3D',
    haloEdge: '#15274D',
    land: '#23365A',
    speckA: '#2A3F66',
    speckB: '#1E2F50',
    fringe: '#2E4472',
    cliffL: '#182848',
    cliffR: '#111D38',
    strata: '#14213F',
    pave: '#33497A',
    paveB: '#2D426F',
    road: '#2E4370',
    roadB: '#34497A',
    curb: '#3A5287',
    dash: '#6F86BD',
    zebra: '#9AA9CC',
    ringGrass: '#2A5A48',
    shadow: 'rgba(3, 8, 20, 0.35)',
    tree: ['#2F7A55', '#225C40', '#3E8E66'],
    pine: ['#2F7A55', '#225C40'],
    trunk: '#5A4632',
    medu: '#2A4A46',
    meduB: '#30534E',
    meduFringe: '#3F6B64',
    meduCliffL: '#16302E',
    meduCliffR: '#12282A',
    bb: '#2B3160',
    lit: '#FFD27A',
    litDim: '#8C7448',
    glass: '#3B4A6B',
    smoke: '#C9CED9',
    water: '#1E2D52',
    ferryRoute: '#8FA6D6',
    dot: ['#FFE08A', '#FFFFFF'],
    halo2: 0.2,
  },
}

/* ------------------------------------------------------------ helpers */

const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(' ')

// Cheap deterministic noise in [0, 1).
export const hash = (n) => (((Math.sin(n * 127.1) * 43758.5453) % 1) + 1) % 1

// A box standing on the floor. (x, y) is the ground point of its back
// corner, `a` runs toward the right corner, `b` toward the left one.
function boxFaces(x, y, a, b, h) {
  const back = [x, y - h]
  const right = [x + a, y + a / 2 - h]
  const left = [x - b, y + b / 2 - h]
  const front = [x + a - b, y + (a + b) / 2 - h]
  const down = ([px, py]) => [px, py + h]
  return {
    top: pts([back, right, front, left]),
    left: pts([left, front, down(front), down(left)]),
    right: pts([front, right, down(right), down(front)]),
  }
}

function Box({ x, y, a, b = a, h, top, left, right }) {
  const f = boxFaces(x, y, a, b, h)
  return (
    <>
      <polygon points={f.left} fill={left} />
      <polygon points={f.right} fill={right} />
      <polygon points={f.top} fill={top} />
    </>
  )
}

// Light comes from the left, so a footprint's shadow stretches toward the
// lower right by `s` along the floor.
function Shadow({ x, y, a, b = a, s, p }) {
  const L = [x - b, y + b / 2]
  const B = [x, y]
  const F = [x + a - b, y + (a + b) / 2]
  const t = [2 * s, s]
  return (
    <polygon
      points={pts([L, B, [x + a + t[0], y + a / 2 + t[1]], [F[0] + t[0], F[1] + t[1]], F])}
      fill={p.shadow}
    />
  )
}

// Tufts of grass along an edge, pointing along `out` (a screen vector).
function Fringe({ from, to, out, fill, seed = 0, step = 6 }) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const n = Math.floor(len / step)
  const tufts = []
  for (let i = 0; i < n; i++) {
    const k = hash(seed + i)
    if (k < 0.18) continue
    const t0 = i / n
    const t1 = (i + 1) / n
    const h = 3 + Math.floor(k * 3) * 3
    const a = [from[0] + dx * t0, from[1] + dy * t0]
    const b = [from[0] + dx * t1, from[1] + dy * t1]
    const m = [(a[0] + b[0]) / 2 + out[0] * h, (a[1] + b[1]) / 2 + out[1] * h]
    tufts.push(pts([a, b, m]))
  }
  return tufts.map((d, i) => <polygon key={i} points={d} fill={fill} />)
}

export function windowColor(p, i, frame) {
  return hash(i * 7.3 + frame * 131.7) < 0.2 ? p.litDim : p.lit
}

function ConeTree({ x, y, h = 26, w = 8, p }) {
  return (
    <>
      <ellipse cx={x + 9} cy={y + 1} rx={w + 2} ry={4} fill={p.shadow} />
      <polygon points={pts([[x - w, y - 4], [x, y], [x, y - h]])} fill={p.pine[0]} />
      <polygon points={pts([[x, y], [x + w, y - 4], [x, y - h]])} fill={p.pine[1]} />
    </>
  )
}

// A round tree made of a few overlapping blobs, like the reference.
function BlobTree({ x, y, r = 7, p, seed = 0 }) {
  const c = p.tree
  const k = hash(seed)
  return (
    <>
      <ellipse cx={x + 10} cy={y + 2} rx={r + 4} ry={r / 2 + 1} fill={p.shadow} />
      <rect x={x - 1.5} y={y - 9} width="3" height="9" fill={p.trunk} />
      <circle cx={x - r * 0.45} cy={y - 9 - r * 0.7} r={r * 0.75} fill={c[1]} />
      <circle cx={x + r * 0.5} cy={y - 9 - r * 0.6} r={r * 0.7} fill={c[1]} />
      <circle cx={x} cy={y - 9 - r * 1.25} r={r * 0.8} fill={c[0]} />
      <circle cx={x - r * 0.35 + k * 3} cy={y - 9 - r * 1.5} r={r * 0.35} fill={c[2]} />
    </>
  )
}

function Ring({ cx, cy, w, color }) {
  return (
    <polygon
      points={pts([
        [cx, cy - w / 2],
        [cx + w, cy],
        [cx, cy + w / 2],
        [cx - w, cy],
      ])}
      fill={color}
      fillOpacity="0.28"
      stroke={color}
      strokeWidth="4.5"
    />
  )
}

// Wrapper for every building or place you can point at: the one in focus
// rises and gets a ring; the others fade.
function Part({ id, active, ring, children }) {
  const on = active === id
  return (
    <g filter={active && !on ? 'url(#wash)' : undefined}>
      {on && ring}
      <g transform={on ? 'translate(0 -6)' : undefined}>{children}</g>
    </g>
  )
}

/* ------------------------------------------------------------ textures */

// Pattern tiles on the 3-unit pixel grid.
function specks(id, w, h, base, colors, count, seed) {
  const cells = []
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(seed + i * 3.1) * (w / PX)) * PX
    const y = Math.floor(hash(seed + i * 5.7 + 1) * (h / PX)) * PX
    cells.push(<rect key={i} x={x} y={y} width={PX} height={PX} fill={colors[i % colors.length]} />)
  }
  return (
    <pattern key={id} id={id} width={w} height={h} patternUnits="userSpaceOnUse">
      <rect width={w} height={h} fill={base} />
      {cells}
    </pattern>
  )
}

// Mix every colour 60 % toward the paper, keeping it opaque, so a faded
// building never shows the ground through it.
function washMatrix(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const k = 0.4
  return [
    `${k} 0 0 0 ${((1 - k) * c[0]).toFixed(3)}`,
    `0 ${k} 0 0 ${((1 - k) * c[1]).toFixed(3)}`,
    `0 0 ${k} 0 ${((1 - k) * c[2]).toFixed(3)}`,
    '0 0 0 1 0',
  ].join(' ')
}

export function Defs({ p }) {
  return (
    <defs>
      <filter id="wash" x="0" y="0" width={VIEW_W} height={VIEW_H} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={washMatrix(p.bg)} />
      </filter>
      {specks('t-land', 60, 30, p.land, [p.speckA, p.speckB], 16, 1)}
      {specks('t-medu', 60, 30, p.medu, [p.meduB], 12, 7)}
      {specks('t-bb', 60, 30, p.bb, [p.speckA, p.speckB], 10, 9)}
      {specks('t-road', 30, 15, p.road, [p.roadB], 4, 3)}
      {specks('t-cliffL', 30, 18, p.cliffL, [p.strata], 3, 5)}
      {specks('t-cliffR', 30, 18, p.cliffR, [p.strata], 3, 6)}
      <pattern id="t-pave" width="12" height="6" patternUnits="userSpaceOnUse">
        <rect width="12" height="6" fill={p.pave} />
        <rect x="0" y="0" width="3" height="3" fill={p.paveB} />
        <rect x="6" y="3" width="3" height="3" fill={p.paveB} />
      </pattern>
      {/* bricks on a face: 4 × 2 px bricks with 1 px mortar, sheared */}
      <pattern id="t-brickL" width="15" height="9" patternUnits="userSpaceOnUse" patternTransform="matrix(1 0.5 0 1 0 0)">
        <rect width="15" height="9" fill="#E86E57" />
        <rect y="6" width="15" height="3" fill="#C9553F" />
        <rect x="12" y="0" width="3" height="6" fill="#C9553F" />
      </pattern>
      <pattern id="t-brickR" width="15" height="9" patternUnits="userSpaceOnUse" patternTransform="matrix(1 -0.5 0 1 0 0)">
        <rect width="15" height="9" fill="#B44E3B" />
        <rect y="6" width="15" height="3" fill="#963D2D" />
        <rect x="6" y="0" width="3" height="6" fill="#963D2D" />
      </pattern>
      <pattern id="t-metal" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="matrix(1 0.5 0 1 0 0)">
        <rect width="6" height="6" fill="#4F8FE0" />
        <rect width="3" height="6" fill="#4886D6" />
      </pattern>
    </defs>
  )
}

/* ------------------------------------------------------------------ sea */

const WAVES = [
  [150, 330], [1040, 210], [960, 880], [1360, 640], [90, 640], [1300, 470],
  [440, 120], [600, 250], [60, 420], [1000, 410], [880, 805], [480, 790],
  [1300, 560], [300, 640], [1390, 400], [620, 900], [40, 900], [1240, 640],
]

function Sea({ p, frame }) {
  return (
    <g fill="none" stroke={p.wave} strokeWidth="3">
      {WAVES.map(([x, y], i) => {
        const dx = ((frame + i) % 4 < 2 ? 0 : 3)
        return <path key={i} d={`M${x + dx} ${y} q9 -6 18 0 q9 6 18 0`} />
      })}
    </g>
  )
}

// Shallow water around an island: a larger diamond at the waterline.
function Halo({ cx, cy, w, p }) {
  return (
    <polygon
      points={pts([
        [cx, cy - w / 2],
        [cx + w, cy],
        [cx, cy + w / 2],
        [cx - w, cy],
      ])}
      fill={p.halo}
      stroke={p.haloEdge}
      strokeWidth="3"
    />
  )
}

/* ----------------------------------------------------------------- Medu */

function Medu({ p, active, frame }) {
  const win = (i) => windowColor(p, i, frame)
  return (
    <Part
      id="medu"
      active={active}
      ring={<polygon points={pts([[0, 0], [470, 0], [0, 235]])} fill="#6FD1BE" fillOpacity="0.25" stroke="#6FD1BE" strokeWidth="4.5" />}
    >
      <polygon points="0,269 470,34 470,58 0,293" fill={p.halo} />
      <polygon points="0,235 470,0 470,34 0,269" fill={p.meduCliffL} />
      <polygon points="0,252 470,17 470,34 0,269" fill={p.meduCliffR} />
      <polygon points="0,0 470,0 0,235" fill="url(#t-medu)" />
      <Fringe from={[470, 0]} to={[0, 235]} out={[0.45, 0.9]} fill={p.meduFringe} seed={40} />

      {/* campus walks */}
      <g stroke="url(#t-pave)" strokeWidth="9" strokeLinecap="square">
        <line x1="150" y1="128" x2="214" y2="96" />
        <line x1="150" y1="128" x2="92" y2="157" />
        <line x1="260" y1="80" x2="214" y2="96" />
      </g>

      <ConeTree x={380} y={34} p={p} />
      <ConeTree x={330} y={46} p={p} />
      <ConeTree x={302} y={62} h={20} w={6} p={p} />

      {/* classroom block, back */}
      <Shadow x={260} y={45} a={30} b={30} s={12} p={p} />
      <polygon points="230,30 260,45 260,75 230,60" fill="#C9D6D3" />
      <polygon points="260,45 290,30 290,60 260,75" fill="#93A8A4" />
      <polygon points="260,15 290,30 260,45 230,30" fill="#EAF2F0" />
      <polygon points="260,20 280,30 260,40 240,30" fill="#D6E2DF" />
      {[0, 1, 2].map((r) => (
        <g key={r} strokeWidth="3">
          <line stroke={win(r)} x1="234" y1={40 + r * 10} x2="256" y2={51 + r * 10} />
          <line stroke={win(r + 3)} x1="264" y1={51 + r * 10} x2="286" y2={40 + r * 10} />
        </g>
      ))}

      {/* hospital */}
      <Shadow x={150} y={72.5} a={55} b={55} s={18} p={p} />
      <polygon points="95,45 150,72.5 150,122.5 95,95" fill="#DDE7E5" />
      <polygon points="150,72.5 205,45 205,95 150,122.5" fill="#A3B8B4" />
      <polygon points="150,17.5 205,45 150,72.5 95,45" fill="#F5FAF9" />
      <polygon points="150,23.5 193,45 150,66.5 107,45" fill="#E4ECEA" />
      <ellipse cx="150" cy="45" rx="16" ry="8" fill="#F5FAF9" stroke="#A3B8B4" strokeWidth="3" />
      <g fill="#7E9692">
        <rect x="144" y="40" width="3" height="10" />
        <rect x="153" y="40" width="3" height="10" />
        <rect x="147" y="43.5" width="6" height="3" />
      </g>
      {[0, 1, 2, 3].map((r) => (
        <line key={r} stroke={win(10 + r)} strokeWidth="3" x1="99" y1={56 + r * 10} x2="146" y2={79.5 + r * 10} />
      ))}
      <line stroke={win(20)} strokeWidth="3" x1="154" y1="114" x2="201" y2="90.5" />
      <polygon points="175,72 181,69 181,93 175,96" fill="#E8505B" />
      <polygon points="168,84.5 188,74.5 188,80.5 168,90.5" fill="#E8505B" />
      <polygon points="116,95.5 124,99.5 124,109.5 116,105.5" fill="#5C7470" />
      <line x1="113" y1="93.5" x2="127" y2="100.5" stroke="#B9CCC8" strokeWidth="3" />

      {/* ambulance */}
      <Box x={214} y={98} a={12} b={6} h={6} top="#FFFFFF" left="#E2E8E6" right="#B9C4C2" />
      <line x1="209" y1="98.5" x2="219" y2="103.5" stroke="#E8505B" strokeWidth="2" />
      {frame % 2 === 0 && <rect x="213" y="89" width="3" height="3" fill="#FF6B7A" />}

      {/* classroom block, front */}
      <Shadow x={60} y={135} a={30} b={30} s={12} p={p} />
      <polygon points="30,120 60,135 60,165 30,150" fill="#C9D6D3" />
      <polygon points="60,135 90,120 90,150 60,165" fill="#93A8A4" />
      <polygon points="60,105 90,120 60,135 30,120" fill="#EAF2F0" />
      <polygon points="60,110 80,120 60,130 40,120" fill="#D6E2DF" />
      {[0, 1, 2].map((r) => (
        <g key={r} strokeWidth="3">
          <line stroke={win(r + 30)} x1="34" y1={130 + r * 10} x2="56" y2={141 + r * 10} />
          {r !== 1 && <line stroke={win(r + 33)} x1="64" y1={141 + r * 10} x2="86" y2={130 + r * 10} />}
        </g>
      ))}
      <ConeTree x={20} y={204} p={p} />
      <BlobTree x={118} y={150} r={6} p={p} seed={1} />
      <BlobTree x={200} y={124} r={6} p={p} seed={2} />
    </Part>
  )
}

/* ----------------------------------------------------------------- nash */

function Nash({ p, active, frame }) {
  const fence = [
    [1250, 251],
    [1370, 311],
    [1250, 371],
    [1130, 311],
  ]
  const posts = []
  fence.forEach((q0, i) => {
    const q1 = fence[(i + 1) % 4]
    for (let k = 0; k < 6; k++) {
      posts.push([q0[0] + ((q1[0] - q0[0]) * k) / 6, q0[1] + ((q1[1] - q0[1]) * k) / 6])
    }
  })
  return (
    <Part id="nash" active={active} ring={<Ring cx={1250} cy={311} w={132} color="#FF6B7A" />}>
      <Halo cx={1250} cy={322} w={110} p={p} />
      <polygon points="1160,300 1250,345 1250,367 1160,322" fill="url(#t-cliffL)" />
      <polygon points="1250,345 1340,300 1340,322 1250,367" fill="url(#t-cliffR)" />
      <polygon points="1250,255 1340,300 1250,345 1160,300" fill="url(#t-land)" />
      <Fringe from={[1160, 300]} to={[1250, 345]} out={[0, 1]} fill={p.fringe} seed={60} />
      <Fringe from={[1250, 345]} to={[1340, 300]} out={[0, 1]} fill={p.fringe} seed={70} />
      {/* concrete apron */}
      <polygon points="1250,262 1300,287 1250,312 1200,287" fill="url(#t-pave)" />
      <Shadow x={1250} y={286} a={30} b={30} s={14} p={p} />
      <Box x={1250} y={286} a={36} b={36} h={4} top="#C2C8D4" left="#9CA4B4" right="#7E879A" />
      <polygon points="1220,256 1250,271 1250,315 1220,300" fill="#A9B1C2" />
      <polygon points="1250,271 1280,256 1280,300 1250,315" fill="#7C859A" />
      <polygon points="1250,241 1280,256 1250,271 1220,256" fill="#D9DEE8" />
      <polygon points="1250,247 1268,256 1250,265 1232,256" fill="#C6CCD8" />
      <line x1="1220" y1="294" x2="1250" y2="309" stroke="#8A93A6" strokeWidth="3" />
      <ellipse cx="1265" cy="287" rx="9" ry="12" fill="#C99A2E" stroke="#8A6514" strokeWidth="3" />
      <line x1="1259" y1="287" x2="1271" y2="287" stroke="#8A6514" strokeWidth="3" />
      <line x1="1265" y1="279" x2="1265" y2="295" stroke="#8A6514" strokeWidth="3" />
      <line x1="1222" y1="262" x2="1213" y2="257" stroke="#646C80" strokeWidth="3" />
      {frame % 2 === 1 && <rect x="1209" y="252" width="3" height="3" fill="#FF6B7A" />}
      {/* the fence stands in the water, all round */}
      <polygon points="1250,251 1370,311 1250,371 1130,311" fill="none" stroke="#FF6B7A" strokeWidth="3" strokeDasharray="9 6" />
      {posts.map(([x, y], i) => (
        <rect key={i} x={x - 1.5} y={y - 6} width="3" height="6" fill="#FF6B7A" />
      ))}
      {[
        [1310, 281],
        [1190, 281],
        [1310, 341],
        [1190, 341],
      ].map(([x, y], i) => (
        <g key={i}>
          <polygon points={pts([[x - 4, y], [x + 4, y], [x + 3, y - 9], [x - 3, y - 9]])} fill="#E8505B" />
          <polygon points={pts([[x, y], [x + 4, y], [x + 3, y - 9], [x, y - 9]])} fill="#B23A45" />
          <rect x={x - 1.5} y={y - 15} width="3" height="6" fill="#E6EAF2" />
          {(frame + i) % 2 === 0 && <rect x={x - 3} y={y - 18} width="6" height="3" fill="#FF6B7A" />}
        </g>
      ))}
    </Part>
  )
}

/* ----------------------------------------------------- main island base */

const zebra = (x, y, dx, dy) => {
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  return [-6, 0, 6].map((k) => [x - uy * k - ux * 4, y + ux * k - uy * 4, x - uy * k + ux * 4, y + ux * k + uy * 4])
}

function IslandBase({ p }) {
  const stripes = [
    ...zebra(653, 486.5, 2, 1),
    ...zebra(787, 486.5, -2, 1),
    ...zebra(653, 553.5, -2, 1),
    ...zebra(787, 553.5, 2, 1),
  ]
  return (
    <g>
      <Halo cx={720} cy={556} w={420} p={p} />
      <polygon points="340,520 720,710 720,746 340,556" fill="url(#t-cliffL)" />
      <polygon points="720,710 1100,520 1100,556 720,746" fill="url(#t-cliffR)" />
      <polygon points="720,330 1100,520 720,710 340,520" fill="url(#t-land)" />
      <Fringe from={[340, 520]} to={[720, 710]} out={[0, 1]} fill={p.fringe} seed={100} />
      <Fringe from={[720, 710]} to={[1100, 520]} out={[0, 1]} fill={p.fringe} seed={200} />
      <Fringe from={[720, 330]} to={[340, 520]} out={[-0.45, -0.9]} fill={p.fringe} seed={300} />
      <Fringe from={[1100, 520]} to={[720, 330]} out={[0.45, -0.9]} fill={p.fringe} seed={400} />

      {/* paved plazas under the buildings */}
      <polygon points="520,447 600,487 520,527 440,487" fill="url(#t-pave)" />
      <polygon points="900,478 952,504 900,530 848,504" fill="url(#t-pave)" />
      <polygon points="650,586 704,613 650,640 596,613" fill="url(#t-pave)" />
      <polygon points="795,589 843,613 795,637 747,613" fill="url(#t-pave)" />
      <polygon points="725,622 757,638 725,654 693,638" fill="url(#t-pave)" />
      <Box x={735} y={630} a={9} b={3} h={3} top="#8A6A4A" left="#6B5038" right="#5A4230" />

      {/* streets: sidewalk, asphalt, then the roundabout over the crossing */}
      <g strokeLinecap="butt">
        <line x1="530" y1="425" x2="910" y2="615" stroke="url(#t-pave)" strokeWidth="27" />
        <line x1="910" y1="425" x2="530" y2="615" stroke="url(#t-pave)" strokeWidth="27" />
        <line x1="530" y1="425" x2="910" y2="615" stroke="url(#t-road)" strokeWidth="18" />
        <line x1="910" y1="425" x2="530" y2="615" stroke="url(#t-road)" strokeWidth="18" />
      </g>
      <line x1="898" y1="611" x2="1052" y2="534" stroke="url(#t-pave)" strokeWidth="12" />

      <ellipse cx="720" cy="520" rx="72" ry="36" fill="url(#t-pave)" />
      <ellipse cx="720" cy="520" rx="66" ry="33" fill="url(#t-road)" />
      <ellipse cx="720" cy="520" rx="46" ry="23" fill={p.ringGrass} stroke={p.fringe} strokeWidth="3" />
      <ellipse cx="720" cy="520" rx="56" ry="28" fill="none" stroke={p.dash} strokeWidth="3" strokeDasharray="9 9" />
      <g stroke={p.dash} strokeWidth="3" strokeDasharray="12 12">
        <line x1="530" y1="425" x2="644" y2="482" />
        <line x1="796" y1="558" x2="910" y2="615" />
        <line x1="910" y1="425" x2="796" y2="482" />
        <line x1="644" y1="558" x2="530" y2="615" />
      </g>
      <g stroke={p.zebra} strokeWidth="3">
        {stripes.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      {/* ferry pier */}
      <polygon points="968,586 1004,604 1004,610 968,592" fill="#5A4230" />
      <polygon points="974,583 1010,601 1004,604 968,586" fill="#A07A52" />
      {[976, 988, 1000].map((x) => (
        <rect key={x} x={x - 1.5} y={590 + (x - 976) / 2} width="3" height="15" fill="#3B2C20" />
      ))}
      <rect x="1006" y="594" width="3" height="3" fill={p.lit} />
    </g>
  )
}

/* ------------------------------------------------------------- trees */

function NorthTrees({ p }) {
  return (
    <g>
      <BlobTree x={600} y={412} p={p} seed={3} />
      <BlobTree x={835} y={410} r={6} p={p} seed={4} />
      <BlobTree x={720} y={372} r={6} p={p} seed={5} />
      <ConeTree x={675} y={402} p={p} />
      <ConeTree x={765} y={402} p={p} />
      <ConeTree x={662} y={434} p={p} />
      <ConeTree x={778} y={434} p={p} />
      <ConeTree x={630} y={450} p={p} />
      <ConeTree x={810} y={450} p={p} />
      <BlobTree x={420} y={520} r={7} p={p} seed={6} />
      <ConeTree x={445} y={552} h={20} w={6} p={p} />
    </g>
  )
}

function EastTrees({ p }) {
  return (
    <g>
      <BlobTree x={968} y={480} r={7} p={p} seed={7} />
      <ConeTree x={1060} y={530} h={18} w={5} p={p} />
    </g>
  )
}

function SouthTrees({ p }) {
  return (
    <g>
      <BlobTree x={586} y={624} r={7} p={p} seed={8} />
      <BlobTree x={712} y={642} r={6} p={p} seed={9} />
      <BlobTree x={864} y={628} r={7} p={p} seed={10} />
      <ConeTree x={558} y={602} h={20} w={6} p={p} />
    </g>
  )
}

/* -------------------------------------------------------------- shannon */

function Shannon({ p, active, frame }) {
  const doorsL = [468, 484, 500].map((x) => {
    const b = 520 + (x - 458) / 2
    return pts([[x, b - 9], [x + 6, b - 6], [x + 6, b + 3], [x, b]])
  })
  const doorsR = [530, 546, 562].map((x) => {
    const b = 551 - (x - 520) / 2
    return pts([[x, b - 9], [x + 6, b - 12], [x + 6, b - 3], [x, b]])
  })
  const seats = []
  for (let i = 0; i < 16; i++) {
    const t = i / 16
    seats.push([520 + 53 * t, 459.5 + 26.5 * t], [467 + 53 * t, 486 + 26.5 * t])
  }
  return (
    <Part id="shannon" active={active} ring={<Ring cx={520} cy={521} w={76} color="#7FE0C4" />}>
      <Shadow x={520} y={486} a={62} b={62} s={16} p={p} />
      <polygon points="458,486 520,517 520,551 458,520" fill="#3FA88B" />
      <polygon points="520,517 582,486 582,520 520,551" fill="#2A7F68" />
      <line x1="461" y1="493" x2="517" y2="521" stroke={windowColor(p, 1, frame)} strokeWidth="3" />
      <line x1="523" y1="521" x2="579" y2="493" stroke={windowColor(p, 2, frame)} strokeWidth="3" />
      {doorsL.map((d, i) => (
        <polygon key={i} points={d} fill="#1F5E4D" />
      ))}
      {doorsR.map((d, i) => (
        <polygon key={i} points={d} fill="#1A4E40" />
      ))}
      <polygon points="520,455 582,486 520,517 458,486" fill="#5FC9AA" />
      {seats.map(([x, y], i) => (
        <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" fill={i % 3 ? '#3FA88B' : '#E8505B'} />
      ))}
      <polygon points="520,464.5 563,486 520,507.5 477,486" fill="#4DAE5F" />
      {[0, 2, 4].map((k) => {
        // mowing stripes across the pitch, along its long axis
        const a0 = k / 6
        const a1 = (k + 1) / 6
        const P = (u, v) => [477 + 43 * u + 43 * v, 486 - 21.5 * u + 21.5 * v]
        return <polygon key={k} points={pts([P(a0, 0), P(a1, 0), P(a1, 1), P(a0, 1)])} fill="#43A055" />
      })}
      <polygon points="520,464.5 563,486 520,507.5 477,486" fill="none" stroke="#E6F7EF" strokeWidth="3" />
      <line x1="541.5" y1="475.25" x2="498.5" y2="496.75" stroke="#E6F7EF" strokeWidth="3" />
      <rect x="516" y="483" width="9" height="6" fill="#E6F7EF" />
      {/* floodlights */}
      <rect x="456.5" y="450" width="3" height="36" fill="#CFF5E6" />
      <rect x="580.5" y="450" width="3" height="36" fill="#CFF5E6" />
      <rect x="452" y="444" width="12" height="6" fill={frame % 2 ? '#FFF3C4' : '#FFE08A'} />
      <rect x="576" y="444" width="12" height="6" fill={frame % 2 ? '#FFE08A' : '#FFF3C4'} />
      {/* broadcast mast */}
      <rect x="518.5" y="398" width="3" height="57" fill="#CFF5E6" />
      <line x1="512" y1="455" x2="519" y2="420" stroke="#9FD9C4" strokeWidth="3" />
      <line x1="528" y1="455" x2="521" y2="420" stroke="#9FD9C4" strokeWidth="3" />
      <rect x="516" y="393" width="8" height="6" fill="#7FE0C4" />
      <path d="M508 390 Q520 378 532 390" fill="none" stroke="#3FB894" strokeWidth="3" opacity={frame % 2 ? 1 : 0.45} />
      <path d="M499 382 Q520 361 541 382" fill="none" stroke="#3FB894" strokeWidth="3" opacity={frame % 2 ? 0.45 : 1} />
    </Part>
  )
}

/* -------------------------------------------------------------- neumann */

function Neumann({ p, active, frame }) {
  const rows = Array.from({ length: 10 }, (_, i) => 334 + i * 18)
  const beacon = [12, 16, 21, 16][frame % 4]
  return (
    <Part id="neumann" active={active} ring={<Ring cx={720} cy={520} w={50} color="#FFD27A" />}>
      <Shadow x={720} y={503} a={34} b={34} s={60} p={p} />
      <Box x={720} y={497} a={40} b={40} h={6} top="#8A99BA" left="#5B6A8C" right="#4A5878" />
      <polygon points="686,310 720,327 720,537 686,520" fill="#A9B7D3" />
      <polygon points="720,327 754,310 754,520 720,537" fill="#7F8FB2" />
      <polygon points="720,293 754,310 720,327 686,310" fill="#DCE4F2" />
      <line x1="686" y1="416" x2="720" y2="433" stroke="#8E9DBD" strokeWidth="3" />
      <line x1="720" y1="433" x2="754" y2="416" stroke="#6C7CA0" strokeWidth="3" />
      {rows.map((y, i) => (
        <g key={y} strokeWidth="3">
          <line stroke={windowColor(p, 40 + i, frame)} x1="690" y1={y} x2="716" y2={y + 13} />
          <line stroke={windowColor(p, 60 + i, frame)} x1="724" y1={y + 13} x2="750" y2={y} />
        </g>
      ))}
      <polygon points="699,512 711,518 711,531 699,525" fill="#3B4A6B" />
      <line x1="696" y1="509" x2="714" y2="518" stroke="#DCE4F2" strokeWidth="3" />
      <polygon points="720,299 742,310 720,321 698,310" fill="#C9D3E6" />
      <polygon points="700,286 720,296 720,320 700,310" fill="#E0A43C" />
      <polygon points="720,296 740,286 740,310 720,320" fill="#B07A22" />
      <polygon points="720,276 740,286 720,296 700,286" fill="#FFD27A" />
      <line x1="704" y1="296" x2="716" y2="302" stroke="#FFF1C9" strokeWidth="3" />
      <line x1="724" y1="302" x2="736" y2="296" stroke="#FFE09A" strokeWidth="3" />
      <rect x="718.5" y="244" width="3" height="32" fill="#DCE4F2" />
      <rect x="713" y="249" width="14" height="3" fill="#DCE4F2" />
      <circle cx="720" cy="236" r={beacon + 8} fill="#FFD27A" opacity={p.halo2 * 0.5} />
      <circle cx="720" cy="236" r={beacon} fill="#FFD27A" opacity={p.halo2} />
      <circle cx="720" cy="236" r="6" fill="#FFD27A" />
      <rect x="718" y="234" width="4" height="4" fill="#FFF6D8" />
    </Part>
  )
}

/* -------------------------------------------------------------- babbage */

function Babbage({ p, active, frame }) {
  return (
    <Part id="babbage" active={active} ring={<Ring cx={900} cy={505} w={56} color="#FF9E8A" />}>
      <Shadow x={900} y={486} a={38} b={38} s={44} p={p} />
      <polygon points="862,365 900,384 900,524 862,505" fill="url(#t-brickL)" />
      <polygon points="900,384 938,365 938,505 900,524" fill="url(#t-brickR)" />
      <polygon points="900,346 938,365 900,384 862,365" fill="#FF9E8A" />
      <polygon points="900,352 926,365 900,378 874,365" fill="#F48B76" />
      <Box x={912} y={362} a={10} b={8} h={6} top="#FFE6DD" left="#E3BFB3" right="#C49A8D" />
      <rect x="898.5" y="322" width="3" height="24" fill="#FFE6DD" />
      <rect x="897" y="316" width="6" height="6" fill={frame % 2 ? '#FFC93C' : '#C98F1C'} />
      {/* billboard: frame, sheet and a lamp row; the words are drawn on top */}
      <polygon points="862,380 900,399 900,452 862,433" fill="#7A2E1F" />
      <polygon points="865,383 897,399 897,449 865,433" fill="#FFF4EE" />
      <polygon points="903,399 935,383 935,433 903,449" fill="#FFC93C" />
      <line x1="905" y1="444" x2="933" y2="430" stroke="#7A2E1F" strokeWidth="3" />
      <rect x="909" y="430" width="6" height="12" fill="#7A2E1F" />
      <rect x="918" y="418" width="6" height="20" fill="#7A2E1F" />
      <rect x="927" y="404" width="6" height="30" fill="#7A2E1F" />
      {[868, 880, 892].map((x, i) => (
        <rect key={x} x={x - 1.5} y={376 + (x - 862) / 2} width="3" height="3" fill={windowColor(p, 80 + i, frame)} />
      ))}
      {[0, 1, 2].map((r) => (
        <g key={r} strokeWidth="3">
          <line stroke={windowColor(p, 90 + r, frame)} x1="866" y1={458 + r * 14} x2="896" y2={473 + r * 14} />
          <line stroke={windowColor(p, 95 + r, frame)} x1="904" y1={473 + r * 14} x2="934" y2={458 + r * 14} />
        </g>
      ))}
      <polygon points="875,500 887,506 887,518 875,512" fill="#5A2016" />
    </Part>
  )
}

/* --------------------------------------------------------- the 6 shops */

const SHOPS = [
  { x: 1044, y: 498.5, c: ['#F7D488', '#D9AE4E', '#A8822F'] },
  { x: 1020, y: 510.5, c: ['#9FD3F5', '#5FA8D9', '#3F7FAD'] },
  { x: 996, y: 522.5, c: ['#C7B6F7', '#9C85E3', '#7059B5'] },
  { x: 972, y: 534.5, c: ['#8FE0B0', '#55B47F', '#3A8A5C'] },
  { x: 948, y: 546.5, c: ['#F5A9C4', '#D9759B', '#A85273'] },
  { x: 924, y: 558.5, c: ['#F2F2F2', '#C9CED9', '#9AA2B5'] },
]

function Shops({ p, active, frame }) {
  return (
    <Part
      id="apps"
      active={active}
      ring={<polygon points="1044,492 1068,504 930,592 906,580" fill="#E6EAF2" fillOpacity="0.3" stroke="#9AA2B5" strokeWidth="4.5" />}
    >
      {SHOPS.map(({ x, y, c }, i) => {
        const x0 = x - 11
        const y0 = y + 5.5
        return (
          <g key={i}>
            <Shadow x={x} y={y + 16} a={11} b={11} s={6} p={p} />
            <polygon points={pts([[x0, y0], [x, y + 11], [x, y + 27], [x0, y0 + 16]])} fill={c[1]} />
            <polygon points={pts([[x, y + 11], [x + 11, y0], [x + 11, y0 + 16], [x, y + 27]])} fill={c[2]} />
            <polygon points={pts([[x, y], [x + 11, y0], [x, y + 11], [x0, y0]])} fill={c[0]} />
            <polygon
              points={pts([[x0 + 1.5, y0 + 7], [x - 1.5, y + 15.5], [x - 1.5, y + 23.5], [x0 + 1.5, y0 + 15]])}
              fill={windowColor(p, 100 + i, frame)}
            />
            <polygon points={pts([[x0 - 1.5, y0 + 1.5], [x + 1.5, y + 12.75], [x + 1.5, y + 16.75], [x0 - 1.5, y0 + 5.5]])} fill="#F5F7FB" />
            <line x1={x0 + 3} y1={y0 + 3} x2={x0 + 3} y2={y0 + 7} stroke={c[2]} strokeWidth="3" />
            <line x1={x0 + 9} y1={y0 + 6} x2={x0 + 9} y2={y0 + 10} stroke={c[2]} strokeWidth="3" />
          </g>
        )
      })}
    </Part>
  )
}

/* ------------------------------------------------------------- lovelace */

function Lovelace({ p, active }) {
  return (
    <Part id="lovelace" active={active} ring={<Ring cx={795} cy={615} w={50} color="#C9B6FF" />}>
      <Shadow x={795} y={598} a={34} b={34} s={22} p={p} />
      <g opacity="0.7">
        <polygon points="761,525 795,542 795,632 761,615" fill="#9A82E6" />
        <polygon points="795,542 829,525 829,615 795,632" fill="#6E57B8" />
        <polygon points="795,508 829,525 795,542 761,525" fill="#C9B6FF" />
        <g stroke="#EDE6FF" strokeWidth="3">
          <line x1="768" y1="540.5" x2="768" y2="614.5" />
          <line x1="777" y1="545" x2="777" y2="619" />
          <line x1="786" y1="549.5" x2="786" y2="623.5" />
        </g>
        <g stroke="#B7A4F0" strokeWidth="3">
          {[0, 1, 2, 3].map((r) => (
            <line key={r} x1="800" y1={556 + r * 18} x2="824" y2={544 + r * 18} />
          ))}
        </g>
      </g>
      {/* dashed outline: the building is still being drawn */}
      <g fill="none" stroke="#C9B6FF" strokeWidth="3" strokeDasharray="6 6">
        <polygon points="761,525 795,508 829,525 829,615 795,632 761,615" />
        <polyline points="761,525 795,542 829,525" />
        <line x1="795" y1="542" x2="795" y2="632" />
      </g>
    </Part>
  )
}

/* --------------------------------------------------------------- hopper */

function Hopper({ p, active }) {
  return (
    <Part id="hopper" active={active} ring={<Ring cx={650} cy={615} w={58} color="#8EC1FF" />}>
      <Shadow x={650} y={595} a={40} b={40} s={24} p={p} />
      <polygon points="610,565 650,585 650,635 610,615" fill="url(#t-metal)" />
      <polygon points="650,585 690,565 690,615 650,635" fill="#3567AD" />
      <polygon points="650,545 690,565 650,585 610,565" fill="#8EC1FF" />
      <polygon points="638,556 662,568 656,571 632,559" fill="#C4DEFF" />
      {/* the roller door */}
      <polygon points="615,589 645,604 645,608 615,593" fill="#C4DEFF" />
      <polygon points="618,593 642,605 642,631 618,619" fill="#1B3560" />
      <g stroke="#4F8FE0" strokeWidth="3">
        <line x1="618" y1="600" x2="642" y2="612" />
        <line x1="618" y1="609" x2="642" y2="621" />
      </g>
      <g stroke="#28508A" strokeWidth="3">
        <line x1="656" y1="590" x2="666" y2="585" />
        <line x1="656" y1="597" x2="666" y2="592" />
      </g>
      <polygon points="656,546 662,549 662,563 656,560" fill="#C9CED9" />
      <polygon points="662,549 668,546 668,560 662,563" fill="#9AA2B5" />
      <polygon points="662,543 668,546 662,549 656,546" fill="#F2F2F2" />
      {/* the moth, hidden on the wall */}
      <rect x="668" y="599" width="6" height="6" fill="#E8DCC0" />
      <rect x="677" y="599" width="6" height="6" fill="#E8DCC0" />
      <rect x="674" y="597" width="3" height="10" fill="#2B2B2B" />
    </Part>
  )
}

/* ----------------------------------------------- Blue Book and Unio */

export const FERRY_ROUTE = 'M1012 614 Q1058 700 1116 748'

function BlueBook({ p, active, frame }) {
  return (
    <Part id="bluebook" active={active} ring={<Ring cx={1210} cy={770} w={112} color="#8FB0F0" />}>
      <Halo cx={1210} cy={792} w={130} p={p} />
      <path d={FERRY_ROUTE} fill="none" stroke={p.ferryRoute} strokeWidth="3" strokeDasharray="6 9" />
      <polygon points="1105,770 1210,822.5 1210,844.5 1105,792" fill="url(#t-cliffL)" />
      <polygon points="1210,822.5 1315,770 1315,792 1210,844.5" fill="url(#t-cliffR)" />
      <polygon points="1210,717.5 1315,770 1210,822.5 1105,770" fill="url(#t-bb)" />
      <Fringe from={[1105, 770]} to={[1210, 822.5]} out={[0, 1]} fill={p.fringe} seed={500} />
      <Fringe from={[1210, 822.5]} to={[1315, 770]} out={[0, 1]} fill={p.fringe} seed={510} />
      <polygon points="1132.4,756.8 1116.4,748.8 1116.4,754.8 1132.4,762.8" fill="#5A4230" />
      <polygon points="1139.6,753.2 1132.4,756.8 1116.4,748.8 1123.6,745.2" fill="#A07A52" />
      <rect x="1116.5" y="751" width="3" height="10" fill="#3B2C20" />
      <line x1="1138" y1="760" x2="1196" y2="773" stroke="url(#t-pave)" strokeWidth="9" />
      <ConeTree x={1170} y={754} p={p} />
      <Shadow x={1210} y={735} a={26} b={26} s={20} p={p} />
      <polygon points="1184,722 1210,735 1210,783 1184,770" fill="#E3DDCF" />
      <polygon points="1210,735 1236,722 1236,770 1210,783" fill="#B3AB98" />
      <polygon points="1184,722 1210,735 1210,690" fill="#8FB0F0" />
      <polygon points="1210,735 1236,722 1210,690" fill="#5F80C8" />
      <polygon points="1191,759 1203,765 1203,780 1191,774" fill="#4A3F35" />
      <circle cx="1223" cy="744" r="5" fill={windowColor(p, 120, frame)} />
      <rect x="1221.5" y="739" width="3" height="10" fill="#B3AB98" />
      <ConeTree x={1150} y={779} p={p} />
      <ConeTree x={1255} y={789} p={p} />
      <BlobTree x={1278} y={774} r={6} p={p} seed={11} />
    </Part>
  )
}

function Unio({ p, active, frame }) {
  return (
    <Part id="unio" active={active} ring={<Ring cx={280} cy={790} w={90} color="#E2C27E" />}>
      <Halo cx={280} cy={810} w={104} p={p} />
      <polygon points="200,790 280,830 280,850 200,810" fill="url(#t-cliffL)" />
      <polygon points="280,830 360,790 360,810 280,850" fill="url(#t-cliffR)" />
      <polygon points="280,750 360,790 280,830 200,790" fill="url(#t-land)" />
      <Fringe from={[200, 790]} to={[280, 830]} out={[0, 1]} fill={p.fringe} seed={600} />
      <Fringe from={[280, 830]} to={[360, 790]} out={[0, 1]} fill={p.fringe} seed={610} />
      <path d="M212 794 C 236 742, 324 742, 348 794 Q 280 826 212 794 Z" fill={p.pine[1]} />
      <path d="M226 790 C 248 754, 312 754, 334 790 Q 280 812 226 790 Z" fill={p.pine[0]} />
      <path d="M271 770 Q 262 790 252 806" fill="none" stroke={p.pave} strokeWidth="4" />
      <ConeTree x={232} y={798} h={18} w={5} p={p} />
      <ConeTree x={328} y={800} h={18} w={5} p={p} />
      <polygon points="264,739 280,747 280,773 264,765" fill="#F4F1EA" />
      <polygon points="280,747 296,739 296,765 280,773" fill="#CFC8B6" />
      <polygon points="264,739 280,747 280,716" fill="#E2C27E" />
      <polygon points="280,747 296,739 280,716" fill="#B8954D" />
      <rect x="278.5" y="700" width="3" height="16" fill="#F4F1EA" />
      <rect x="274" y="705" width="12" height="3" fill="#F4F1EA" />
      <polygon points="267,757 274,761 274,771 267,767" fill="#5A4632" />
      <rect x="286" y="750" width="5" height="5" fill={windowColor(p, 130, frame)} />
    </Part>
  )
}

/* ------------------------------------------------------------- layers */

// Everything under the street traffic: sea, the other islands, the main
// island's ground.
export function GroundArt({ p, active, frame }) {
  const props = { p, active, frame }
  return (
    <>
      <rect width={VIEW_W} height={VIEW_H} fill={p.bg} />
      <Sea {...props} />
      <Medu {...props} />
      <Nash {...props} />
      <BlueBook {...props} />
      <Unio {...props} />
      <IslandBase {...props} />
    </>
  )
}

// Everything that stands on the main island, over the street traffic.
export function AboveArt({ p, active, frame }) {
  const props = { p, active, frame }
  return (
    <>
      <NorthTrees {...props} />
      <Shannon {...props} />
      <Neumann {...props} />
      <EastTrees {...props} />
      <Babbage {...props} />
      <Shops {...props} />
      <Lovelace {...props} />
      <Hopper {...props} />
      <SouthTrees {...props} />
    </>
  )
}

export function ArtSvg({ layer, theme, active, frame }) {
  const p = PALETTES[theme]
  const Layer = layer === 'ground' ? GroundArt : AboveArt
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={VIEW_W / PX}
      height={VIEW_H / PX}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      shapeRendering="crispEdges"
    >
      <Defs p={p} />
      <Layer p={p} active={active} frame={frame} />
    </svg>
  )
}

/* -------------------------------------------- vector layer: words, hits */

// Words engraved on the ground stay vector so they read at any size.
export function Engravings({ theme, active }) {
  const day = theme === 'day'
  const lift = (id) => (active === id ? 'translate(0 -6)' : undefined)
  const fade = (id) => (active && active !== id ? 0.4 : 1)
  return (
    <g fontFamily={MONO} pointerEvents="none">
      <g opacity={fade('medu')}>
        <text x="40" y="257" transform="matrix(1 -0.5 0 1 0 0)" fontSize="12" letterSpacing="2" fill={day ? '#5A4128' : '#A8DCCF'}>
          TIERRA FIRME · MEDU
        </text>
      </g>
      <text x="420" y="374" transform="matrix(1 0.5 0 1 0 0)" fontSize="13" letterSpacing="2" fontWeight="600" fill={day ? '#264516' : '#AEBCDD'}>
        VPS PRINCIPAL
      </text>
      <g opacity={fade('bluebook')}>
        <text x="1124" y="232" transform="matrix(1 0.5 0 1 0 0)" fontSize="10" letterSpacing="1" fill={day ? '#5A4128' : '#B4BEE6'}>
          OTRO VPS
        </text>
        <text x="1086" y="672" fontSize="11" fill={day ? '#3F5F8F' : '#9DB1DC'}>
          ferry · solo Notion
        </text>
      </g>
      <g opacity={fade('babbage')} transform={lift('babbage')}>
        <text x="868" y="-18" transform="matrix(1 0.5 0 1 0 0)" fontSize="12" fontWeight="600" fill="#B44E3B">
          1001
        </text>
        <text x="871" y="-6.5" transform="matrix(1 0.5 0 1 0 0)" fontSize="10" fill="#B44E3B">
          apps
        </text>
      </g>
    </g>
  )
}

// Invisible shapes you can point at, focus and tap.
export const HITS = {
  medu: pts([[0, 0], [470, 0], [470, 34], [0, 269]]),
  nash: pts([[1250, 236], [1376, 311], [1250, 378], [1124, 311]]),
  shannon: pts([[520, 360], [592, 446], [592, 520], [520, 556], [448, 520], [448, 446]]),
  neumann: pts([[720, 206], [756, 236], [756, 522], [720, 540], [684, 522], [684, 236]]),
  babbage: pts([[900, 314], [940, 362], [940, 506], [900, 526], [860, 506], [860, 362]]),
  apps: pts([[1044, 490], [1062, 504], [1062, 522], [924, 592], [906, 580], [906, 562]]),
  lovelace: pts([[795, 500], [832, 522], [832, 616], [795, 636], [758, 616], [758, 522]]),
  hopper: pts([[650, 505], [692, 562], [692, 616], [650, 638], [608, 616], [608, 562]]),
  bluebook: pts([[1210, 680], [1318, 770], [1318, 792], [1210, 846], [1102, 792], [1102, 770]]),
  unio: pts([[280, 696], [364, 790], [364, 810], [280, 852], [196, 810], [196, 790]]),
}

// Paint order of the hit shapes, back to front, so the nearer one wins.
export const HIT_ORDER = ['medu', 'nash', 'bluebook', 'unio', 'shannon', 'neumann', 'babbage', 'apps', 'lovelace', 'hopper']

/* ------------------------------------------------------- moving things */

// Each message is a dot of light that runs along the streets between two
// buildings, then rests until its next run.
export const MESSAGES = [
  { path: 'M679.7 499.85 L585 452.5', dur: 4.2, begin: 0, c: 0 },
  { path: 'M679.7 499.85 L585 452.5', dur: 4.6, begin: 2.3, c: 1, back: true },
  { path: 'M760.3 499.85 L850 455', dur: 4, begin: 0.8, c: 1 },
  { path: 'M760.3 499.85 L850 455', dur: 4.4, begin: 3.1, c: 0, back: true },
  { path: 'M679.7 540.15 L596 582', dur: 4.4, begin: 1.4, c: 0 },
  { path: 'M760.3 540.15 L852 586', dur: 7, begin: 2.6, c: 1, rest: 0.55 },
  { path: 'M850 455 L760.3 499.85 A57 28.5 0 0 1 760.3 540.15 L898 609 L1040 540', dur: 11, begin: 1, c: 0 },
  { path: 'M596 582 L679.7 540.15 A57 28.5 0 0 0 760.3 540.15 L898 609 L1040 540', dur: 12, begin: 6, c: 1 },
]

// Where the dots rest when motion is reduced (the sketch's own dots).
export const STATIC_DOTS = [
  [600, 460, 0],
  [870, 595, 1],
  [580, 590, 0],
  [680, 540, 1],
  [800, 480, 0],
]

// People out for a walk: back and forth between two points.
export const WALKERS = [
  { a: [703, 632], b: [741, 651], speed: 9, shirt: '#E8505B' },
  { a: [932, 594], b: [1030, 545], speed: 11, shirt: '#3567AD' },
  { a: [466, 556], b: [512, 579], speed: 8, shirt: '#F2C94C' },
  { a: [96, 155], b: [146, 130], speed: 7, shirt: '#FFFFFF' },
  { a: [1142, 761], b: [1188, 771], speed: 6, shirt: '#9C85E3' },
  { a: [848, 602], b: [884, 584], speed: 7, shirt: '#55B47F' },
]

export function FerrySvg({ theme }) {
  const p = PALETTES[theme]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="16" viewBox="-42 -30 84 48" shapeRendering="crispEdges">
      <path d="M-39 12 q7 3 14 0" fill="none" stroke={p.water} strokeWidth="3" />
      <path d="M-36 6 q6 3 12 0" fill="none" stroke={p.water} strokeWidth="3" />
      <polygon points="-24,-6 24,-6 15,9 -15,9" fill="#2E3B5C" />
      <polygon points="-20,-3 20,-3 13,6 -13,6" fill="#F4F6FA" />
      <rect x="-13" y="3" width="26" height="3" fill="#E8505B" />
      <rect x="-12" y="-18" width="21" height="12" fill="#2E3B5C" />
      <rect x="-9" y="-15" width="15" height="9" fill="#6C8FD8" />
      <rect x="-6" y="-13" width="9" height="3" fill="#C4DEFF" />
      <rect x="9" y="-15" width="9" height="9" fill="#2E3B5C" />
      <rect x="12" y="-12" width="3" height="3" fill="#FFFFFF" />
      <rect x="-21" y="-12" width="9" height="6" fill="#FFFFFF" />
      <rect x="-21" y="-12" width="9" height="3" fill="#D5D9E2" />
      <rect x="-3" y="-27" width="3" height="9" fill="#2E3B5C" />
    </svg>
  )
}
