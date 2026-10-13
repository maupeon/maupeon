/**
 * A gothic stained-glass window drawn in SVG. The glass is a seeded mosaic (same
 * on server and client, so hydration matches) clipped to a pointed arch, with stone
 * tracery on top: two lancets, a mullion and a rose. Each pane "ignites" from the
 * rose outwards like sunrise (CSS, see `.pane` in Unio.module.css).
 */
import s from './Unio.module.css'

const W = 400
const H = 620
const SUN = { x: 200, y: 165 }

// Pointed arch, inset from the outer frame.
const INNER = 'M34 614V262C34 140 120 52 200 26c80 26 166 114 166 236v352z'
const OUTER = 'M14 620V256C14 124 110 30 200 4c90 26 186 120 186 252v364z'

const BANDS = [
  { until: 150, colors: ['#f5cf63', '#eeb547', '#f9e19a', '#e39a32', '#f2c14e'] },
  { until: 250, colors: ['#e9a640', '#f5cf63', '#c9607a', '#3e6fb0', '#f9e19a'] },
  { until: 400, colors: ['#3e6fb0', '#5b8fd1', '#2f4f8f', '#c9607a', '#8a5aa8', '#6aa0d8'] },
  { until: 500, colors: ['#5b8fd1', '#e3b04b', '#6aa0d8', '#c9607a', '#79a85a'] },
  { until: 999, colors: ['#4f8a4a', '#79a85a', '#3d6b3c', '#a3c46c', '#5f9a52'] },
]

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildPanes() {
  const rand = mulberry32(7)
  const cols = 9
  const rows = 15
  const x0 = 24
  const y0 = 18
  const cw = (W - 2 * x0) / cols
  const rh = (H - y0) / rows
  // Jittered lattice shared by neighbouring panes, so lead lines meet.
  const pts = []
  for (let r = 0; r <= rows; r++) {
    pts.push([])
    for (let c = 0; c <= cols; c++) {
      const edgeX = c === 0 || c === cols
      const edgeY = r === 0 || r === rows
      const jx = edgeX ? 0 : (rand() - 0.5) * cw * 0.55
      const jy = edgeY ? 0 : (rand() - 0.5) * rh * 0.55
      pts[r].push([x0 + c * cw + jx, y0 + r * rh + jy])
    }
  }
  const panes = []
  const pick = (y) => {
    const band = BANDS.find((b) => y < b.until)
    // A few pale, sunlit panes everywhere.
    if (rand() < 0.08) return '#fbeec4'
    return band.colors[Math.floor(rand() * band.colors.length)]
  }
  const push = (poly) => {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length
    const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length
    const dist = Math.hypot(cx - SUN.x, cy - SUN.y)
    panes.push({
      d: `M${poly.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`,
      fill: pick(cy),
      delay: Math.round(250 + dist * 3.4 + rand() * 220),
    })
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = pts[r][c]
      const b = pts[r][c + 1]
      const d = pts[r + 1][c + 1]
      const e = pts[r + 1][c]
      const split = rand()
      if (split < 0.3) {
        push([a, b, d])
        push([a, d, e])
      } else if (split < 0.55) {
        push([a, b, e])
        push([b, d, e])
      } else {
        push([a, b, d, e])
      }
    }
  }
  return panes
}

const PANES = buildPanes()

// Rose: 8 spokes between an inner boss and the outer ring.
const ROSE = { x: 200, y: 165, r: 84, boss: 22 }
const SPOKES = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4
  return {
    x1: ROSE.x + Math.cos(a) * ROSE.boss,
    y1: ROSE.y + Math.sin(a) * ROSE.boss,
    x2: ROSE.x + Math.cos(a) * ROSE.r,
    y2: ROSE.y + Math.sin(a) * ROSE.r,
  }
})

export function StainedWindow({ className = '' }) {
  return (
    <svg className={`${s.window} ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Un vitral gótico que se ilumina con la luz del amanecer">
      <defs>
        <clipPath id="unio-glass">
          <path d={INNER} />
        </clipPath>
        <radialGradient id="unio-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#fff3cf" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
        </radialGradient>
        {/* Darker rim, like real cathedral glass (static: no filters, cheap on phones) */}
        <radialGradient id="unio-rim" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0.55" stopColor="#1e1a14" stopOpacity="0" />
          <stop offset="1" stopColor="#1e1a14" stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id="unio-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6efe0" />
          <stop offset="1" stopColor="#e3d8c2" />
        </linearGradient>
      </defs>

      {/* Stone frame */}
      <path d={OUTER} fill="url(#unio-stone)" />

      <g clipPath="url(#unio-glass)">
        {/* Unlit glass: dull, as before dawn */}
        <rect x="0" y="0" width={W} height={H} fill="#bdb6a6" />
        {PANES.map((p, i) => (
          <path key={`b${i}`} d={p.d} fill="#cbc4b3" stroke="#3a342c" strokeWidth="1.6" strokeLinejoin="round" />
        ))}
        {/* Lit glass */}
        {PANES.map((p, i) => (
          <path
            key={`p${i}`}
            className={s.pane}
            d={p.d}
            fill={p.fill}
            stroke="#231f1a"
            strokeWidth="2.6"
            strokeLinejoin="round"
            style={{ '--d': `${p.delay}ms` }}
          />
        ))}
        <rect x="0" y="0" width={W} height={H} fill="url(#unio-rim)" />
        {/* Sunlight on the glass. Static after it fades in: anything that keeps
            moving inside the SVG would repaint every pane on every frame. */}
        <circle className={s.sun} cx={SUN.x + 20} cy={SUN.y + 40} r="230" fill="url(#unio-sun)" />
      </g>

      {/* Stone tracery */}
      <g fill="none" stroke="url(#unio-stone)" strokeLinecap="round" className={s.tracery}>
        <path d={INNER} strokeWidth="10" />
        <path d="M34 340C34 296 74 262 117 248c43 14 83 48 83 92M200 340c0-44 40-78 83-92 43 14 83 48 83 92" strokeWidth="8" />
        <path d="M200 340V614" strokeWidth="10" />
        <circle cx={ROSE.x} cy={ROSE.y} r={ROSE.r} strokeWidth="10" />
        <circle cx={ROSE.x} cy={ROSE.y} r={ROSE.boss} strokeWidth="7" />
        {SPOKES.map((sp, i) => (
          <line key={i} x1={sp.x1} y1={sp.y1} x2={sp.x2} y2={sp.y2} strokeWidth="5" />
        ))}
      </g>
      {/* Thin dark outline so the stone reads against ivory */}
      <path d={OUTER} fill="none" stroke="rgba(58,52,44,0.18)" strokeWidth="1.5" />
    </svg>
  )
}
