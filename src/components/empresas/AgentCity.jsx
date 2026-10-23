import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import clsx from 'clsx'

import { appStoreApps } from '@/lib/apps'
import { useTranslation } from '@/lib/useTranslation'

import s from './AgentCity.module.css'
import {
  ArtSvg,
  Engravings,
  FERRY_ROUTE,
  FerrySvg,
  HITS,
  HIT_ORDER,
  MESSAGES,
  PALETTES,
  PX,
  STATIC_DOTS,
  VIEW_H,
  VIEW_W,
  WALKERS,
} from './Scene'

const ART_W = VIEW_W / PX
const ART_H = VIEW_H / PX
const FRAMES = 4
const FRAME_MS = 700
const TICK_MS = 50

// Where the card opens for each building, in drawing coordinates (top-left
// corner of the card), over open water where possible.
const CARD_AT = {
  neumann: [742, 150],
  shannon: [80, 380],
  babbage: [960, 362],
  apps: [1080, 560],
  hopper: [240, 540],
  lovelace: [880, 600],
  nash: [1060, 390],
  bluebook: [1080, 500],
  unio: [390, 690],
  medu: [490, 40],
}

// Horizontal centre of each building, used to pan the phone view to it.
const CENTER_X = {
  neumann: 720,
  shannon: 520,
  babbage: 900,
  apps: 990,
  hopper: 650,
  lovelace: 795,
  nash: 1250,
  bluebook: 1210,
  unio: 280,
  medu: 180,
}

const CALLOUTS = [
  { id: 'neumann', box: [748, 176, 190, 48], line: [726, 232, 748, 206] },
  { id: 'shannon', box: [300, 324, 210, 48], line: [490, 372, 508, 388] },
  { id: 'babbage', box: [952, 296, 190, 48], line: [930, 352, 952, 332] },
  { id: 'apps', box: [1080, 580, 170, 48], line: [1052, 512, 1092, 580] },
  { id: 'hopper', box: [400, 664, 180, 48], line: [580, 676, 614, 604] },
  { id: 'lovelace', box: [846, 706, 230, 48], line: [846, 716, 812, 632], dashed: true },
  { id: 'nash', box: [1150, 146, 230, 48], line: [1250, 194, 1250, 236] },
  { id: 'bluebook', box: [1120, 866, 190, 48] },
  { id: 'medu', box: [250, 160, 210, 48], line: [250, 180, 200, 106] },
  { id: 'unio', box: [190, 864, 180, 48] },
]

const SUBS = {
  es: {
    neumann: 'Jefe · torre de control',
    shannon: 'Manuel Peón Sports · estadio',
    babbage: 'Marketing · estudio 1001',
    apps: 'Las apps del estudio',
    hopper: 'Operación · taller',
    lovelace: 'Líneas en Blanco · por definir',
    nash: 'Financiero · islote sin puente',
    bluebook: 'Su propio VPS · capilla',
    medu: 'Tierra firme · sin puente',
    unio: 'Iglesia en la colina',
  },
  en: {
    neumann: 'Boss · control tower',
    shannon: 'Manuel Peón Sports · stadium',
    babbage: 'Marketing · 1001 studio',
    apps: 'The studio’s apps',
    hopper: 'Operations · workshop',
    lovelace: 'Líneas en Blanco · to be defined',
    nash: 'Finance · islet, no bridge',
    bluebook: 'Its own VPS · chapel',
    medu: 'Mainland · no bridge',
    unio: 'Church on the hill',
  },
}

/* ------------------------------------------------------ rasterizing */

// Draw an SVG element into a small canvas: render it at full size, then
// keep one sample from every 3 × 3 block. Browsers antialias SVG edges even
// with crispEdges; point sampling gives hard pixel-art edges instead.
async function rasterize(element, w, h) {
  const markup = renderToStaticMarkup(element)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const big = document.createElement('canvas')
    big.width = w * PX
    big.height = h * PX
    big.getContext('2d').drawImage(img, 0, 0, w * PX, h * PX)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(big, 0, 0, w, h)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

const keyOf = (layer, theme, active, frame) =>
  `${layer}|${theme}|${active ?? '-'}|${frame}`

function useArtCache() {
  const cache = useRef(new Map())
  const queue = useRef(Promise.resolve())
  const [version, setVersion] = useState(0)

  const request = useCallback((layer, theme, active, frame) => {
    const key = keyOf(layer, theme, active, frame)
    if (cache.current.has(key)) return
    cache.current.set(key, null)
    queue.current = queue.current
      .then(() =>
        rasterize(
          <ArtSvg layer={layer} theme={theme} active={active} frame={frame} />,
          ART_W,
          ART_H
        )
      )
      .then((canvas) => {
        cache.current.set(key, canvas)
        setVersion((v) => v + 1)
      })
      .catch(() => cache.current.delete(key))
  }, [])

  const get = useCallback(
    (layer, theme, active, frame) =>
      cache.current.get(keyOf(layer, theme, active, frame)) ?? null,
    []
  )

  return { request, get, version }
}

/* ------------------------------------------------------ moving things */

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// The ferry's place along its route at time t (s): out, wait, back, wait.
function ferryAt(t) {
  const k = (t % 44) / 44
  if (k < 0.42) return ease(k / 0.42)
  if (k < 0.5) return 1
  if (k < 0.92) return 1 - ease((k - 0.5) / 0.42)
  return 0
}

function messageAt(m, t) {
  const rest = m.rest ?? 0.3
  const run = 1 - rest
  if (t < m.begin) return null
  const k = ((t - m.begin) % m.dur) / m.dur
  if (k >= run) return null
  const u = k / run
  const alpha = Math.min(1, u / 0.1, (1 - u) / 0.15)
  return { u: m.back ? 1 - u : u, alpha }
}

const px = (v) => Math.round(v / PX)

function drawDot(ctx, x, y, color, alpha) {
  const cx = px(x)
  const cy = px(y)
  ctx.globalAlpha = alpha * 0.35
  ctx.fillStyle = color
  ctx.fillRect(cx - 2, cy - 1, 4, 2)
  ctx.fillRect(cx - 1, cy - 2, 2, 4)
  ctx.globalAlpha = alpha
  ctx.fillRect(cx - 1, cy - 1, 2, 2)
  ctx.globalAlpha = 1
}

function drawWalker(ctx, w, t, still) {
  const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])
  const d = still ? 0 : (t * w.speed) % (2 * len)
  const f = d < len ? d / len : 2 - d / len
  const x = px(w.a[0] + (w.b[0] - w.a[0]) * f)
  const y = px(w.a[1] + (w.b[1] - w.a[1]) * f)
  const step = still ? 0 : Math.floor(t * 5) % 2
  ctx.fillStyle = 'rgba(20, 30, 20, 0.25)'
  ctx.fillRect(x - 1, y, 3, 1)
  ctx.fillStyle = '#2B2F3A'
  if (step) {
    ctx.fillRect(x - 2, y - 1, 1, 1)
    ctx.fillRect(x + 1, y - 1, 1, 1)
  } else {
    ctx.fillRect(x - 1, y - 1, 2, 1)
  }
  ctx.fillStyle = w.shirt
  ctx.fillRect(x - 1, y - 3, 2, 2)
  ctx.fillStyle = '#F1C27D'
  ctx.fillRect(x - 1, y - 5, 2, 2)
  ctx.fillStyle = '#4A3424'
  ctx.fillRect(x - 1, y - 5, 2, 1)
}

function drawSmoke(ctx, t, color, still) {
  ctx.fillStyle = color
  for (let i = 0; i < 3; i++) {
    const a = still ? 0.5 : ((t / 5.5 + i / 3) % 1)
    const x = px(664 + 10 * a)
    const y = px(534 - 26 * a)
    const r = 1 + Math.round(a * 2)
    ctx.globalAlpha = still ? 0.3 : a < 0.2 ? (a / 0.2) * 0.55 : 0.55 * (1 - a)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r + r * 0.6) ctx.fillRect(x + dx, y + dy, 1, 1)
      }
    }
  }
  ctx.globalAlpha = 1
}

/* --------------------------------------------------------------- figure */

export function AgentCity({ data }) {
  const { t, locale } = useTranslation()
  const en = locale === 'en'
  const agents = data.agentes
  const byId = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a])),
    [agents]
  )

  const [theme, setTheme] = useState(null)
  const [hover, setHover] = useState(null)
  const [focused, setFocused] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [ready, setReady] = useState(false)
  const shown = hover ?? focused ?? pinned

  const canvasRef = useRef(null)
  const figureRef = useRef(null)
  const scrollRef = useRef(null)
  const pathRefs = useRef([])
  const ferryRef = useRef(null)
  const ferrySprite = useRef({})
  const { request, get, version } = useArtCache()

  // Day or night follows the site's own theme switch.
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(root.classList.contains('dark') ? 'night' : 'day')
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Rasterize what this theme needs now, then warm the hover states.
  useEffect(() => {
    if (!theme) return
    for (let f = 0; f < FRAMES; f++) {
      request('ground', theme, null, f)
      request('above', theme, null, f)
    }
    for (const id of HIT_ORDER) {
      request('ground', theme, id, 0)
      request('above', theme, id, 0)
    }
    if (!ferrySprite.current[theme]) {
      rasterize(<FerrySvg theme={theme} />, 28, 16).then((c) => {
        ferrySprite.current[theme] = c
      })
    }
  }, [theme, request])

  useEffect(() => {
    if (shown && theme) {
      request('ground', theme, shown, 0)
      request('above', theme, shown, 0)
    }
  }, [shown, theme, request])

  // The render loop: ground, street traffic, buildings, then the ferry and
  // the chimney smoke on top. It sleeps offscreen and under reduced motion.
  const state = useRef({})
  state.current = { theme, shown }
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let inView = true
    let raf = 0
    let last = 0
    const start = performance.now()
    const lastDrawn = {}

    const pick = (layer, theme, active, frame) =>
      get(layer, theme, active, frame) ??
      get(layer, theme, active, 0) ??
      (lastDrawn[layer]?.theme === theme ? lastDrawn[layer].canvas : null)

    const draw = (now) => {
      const { theme, shown } = state.current
      if (!theme) return
      const p = PALETTES[theme]
      const still = reduce.matches
      const time = (now - start) / 1000
      const frame = still || shown ? 0 : Math.floor((now - start) / FRAME_MS) % FRAMES
      const ground = pick('ground', theme, shown, frame)
      const above = pick('above', theme, shown, frame)
      if (!ground || !above) return
      lastDrawn.ground = { theme, canvas: ground }
      lastDrawn.above = { theme, canvas: above }
      setReady(true)

      ctx.clearRect(0, 0, ART_W, ART_H)
      ctx.drawImage(ground, 0, 0)

      const dim = shown ? 0.4 : 1
      if (still) {
        for (const [x, y, c] of STATIC_DOTS) drawDot(ctx, x, y, p.dot[c], dim)
      } else {
        MESSAGES.forEach((m, i) => {
          const at = messageAt(m, time)
          const path = pathRefs.current[i]
          if (!at || !path) return
          const pt = path.getPointAtLength(at.u * path.getTotalLength())
          drawDot(ctx, pt.x, pt.y, p.dot[m.c], at.alpha * dim)
        })
      }
      ctx.globalAlpha = dim
      for (const w of WALKERS) drawWalker(ctx, w, time, still)
      ctx.globalAlpha = 1

      ctx.drawImage(above, 0, 0)

      const route = ferryRef.current
      const sprite = ferrySprite.current[theme]
      if (route && sprite) {
        const u = still ? 0 : ferryAt(time)
        const pt = route.getPointAtLength(u * route.getTotalLength())
        ctx.globalAlpha = shown && shown !== 'bluebook' ? 0.4 : 1
        ctx.drawImage(sprite, px(pt.x) - 14, px(pt.y) - 10)
        ctx.globalAlpha = 1
      }
      ctx.globalAlpha = dim
      drawSmoke(ctx, time, p.smoke, still)
      ctx.globalAlpha = 1
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (now - last < TICK_MS) return
      last = now
      draw(now)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      draw(performance.now())
      if (inView && !reduce.matches) raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      sync()
    })
    io.observe(figureRef.current)
    reduce.addEventListener('change', sync)
    state.current.redraw = () => draw(performance.now())
    sync()
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      reduce.removeEventListener('change', sync)
    }
  }, [get])

  // A still page still has to show new art as it arrives.
  useEffect(() => {
    state.current.redraw?.()
  }, [version, theme, shown])

  const bind = useCallback(
    (id, isLabel = false) => ({
      onPointerEnter: (e) => e.pointerType === 'mouse' && setHover(id),
      onPointerLeave: () => setHover(null),
      onClick: (e) => {
        e.stopPropagation()
        setPinned((p) => (p === id && e.pointerType === 'mouse' ? null : id))
      },
      ...(isLabel
        ? { 'aria-hidden': true }
        : {
            onFocus: () => setFocused(id),
            onBlur: () => setFocused(null),
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setPinned((p) => (p === id ? null : id))
              }
            },
          }),
    }),
    []
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPinned(null)
        setHover(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // On phones the drawing is wider than the screen: start on the main island.
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) * 0.5
    }
  }, [])

  const panTo = (id) => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const x = (CENTER_X[id] / VIEW_W) * el.scrollWidth - el.clientWidth / 2
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: x, behavior: smooth ? 'smooth' : 'auto' })
  }

  const roleOf = (a) => (en ? a.en.rol : a.rol)
  const working = agents.filter((a) => a.tipo === 'agente')
  const activeCount = working.filter((a) => a.estado === 'activo').length

  return (
    <div>
      <div className="relative">
        {/* the stack of paper behind the card */}
        <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 border border-zinc-300 bg-white dark:border-white/10 dark:bg-[#0B1630]" />
        <div aria-hidden="true" className="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-zinc-300 bg-white dark:border-white/10 dark:bg-[#0B1630]" />
        <figure
          ref={figureRef}
          className={clsx(
            s.figure,
            'relative border border-zinc-300 bg-white dark:border-white/15 dark:bg-[#0B1630]'
          )}
        >
          <div className="flex items-baseline justify-between px-5 pt-4 sm:px-7 sm:pt-6">
            <span className={s.corner}>
              {t('companies.activeCount').replace('{n}', activeCount)}
            </span>
          </div>

          <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain sm:overflow-visible">
            <div className="relative w-[860px] sm:w-full">
              <canvas
                ref={canvasRef}
                width={ART_W}
                height={ART_H}
                className={clsx(s.canvas, ready && s.canvasReady)}
                aria-hidden="true"
              />
              <svg
                className={s.overlay}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                role="group"
                aria-label={t('companies.figAria')}
                onClick={() => setPinned(null)}
              >
                <defs>
                  {MESSAGES.map((m, i) => (
                    <path key={i} d={m.path} ref={(el) => (pathRefs.current[i] = el)} />
                  ))}
                  <path d={FERRY_ROUTE} ref={ferryRef} />
                </defs>
                {theme && <Engravings theme={theme} active={shown} />}
                {HIT_ORDER.map((id) => (
                  <g
                    key={id}
                    className={s.hit}
                    role="button"
                    tabIndex={0}
                    aria-label={`${byId[id].nombre}. ${en ? byId[id].en.edificio : byId[id].edificio}. ${roleOf(byId[id])}`}
                    aria-pressed={shown === id}
                    {...bind(id)}
                  >
                    <polygon points={HITS[id]} fill="transparent" />
                  </g>
                ))}
                <Callouts theme={theme ?? 'day'} agents={byId} subs={SUBS[en ? 'en' : 'es']} active={shown} bind={bind} />
              </svg>

              {shown && (
                <FloatingCard agent={byId[shown]} island={data.islas[byId[shown].isla]} at={CARD_AT[shown]} />
              )}
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 px-5 pb-4 sm:px-7 sm:pb-6">
            <span className={s.corner} aria-live="polite">
              {shown
                ? `${byId[shown].nombre} · ${t(`companies.status.${byId[shown].estado}`)}`
                : t('companies.figTitle')}
            </span>
            <span className={s.corner}>{t('companies.fig')}</span>
          </div>
        </figure>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:mt-9 sm:flex-row sm:items-center sm:justify-between">
        <Legend />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">{t('companies.hint')}</span>
          <span className="sm:hidden">{t('companies.hintTouch')}</span>
        </p>
      </div>

      {/* Phones: every building as a button, since some are small to tap. */}
      <div className="mt-5 flex flex-wrap gap-2 sm:hidden">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              setPinned(a.id)
              panTo(a.id)
            }}
            className={clsx(
              s.mono,
              'border px-3 py-1.5 text-xs transition',
              pinned === a.id
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                : 'border-zinc-300 text-zinc-700 dark:border-white/15 dark:text-zinc-300'
            )}
          >
            <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 align-middle" style={{ background: a.color }} />
            {a.nombre}
          </button>
        ))}
      </div>

      {pinned && (
        <Sheet agent={byId[pinned]} island={data.islas[byId[pinned].isla]} onClose={() => setPinned(null)} />
      )}

      <ul className="sr-only">
        {agents.map((a) => (
          <li key={a.id}>
            {a.nombre}: {roleOf(a)} {t('companies.card.building')}: {en ? a.en.edificio : a.edificio}.{' '}
            {t('companies.card.channel')}: {a.canal ?? t('companies.card.none')}. {t('companies.card.status')}:{' '}
            {t(`companies.status.${a.estado}`)}.
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------ labels */

function Callouts({ theme, agents, subs, active, bind }) {
  const day = theme === 'day'
  const ink = day ? '#262A33' : '#E6EAF2'
  const muted = day ? '#5B616D' : '#B9C4DB'
  const paper = day ? '#FFFFFF' : '#0E1A33'
  const edge = day ? '#C9CDD4' : '#2E4370'
  return (
    <g fontFamily="'IBM Plex Mono', ui-monospace, monospace">
      {CALLOUTS.map(({ id, box: [x, y, w, h], line, dashed }) => {
        const a = agents[id]
        const color = a.color
        const shortW = a.nombre.length * 13.2 + 52
        return (
          <g key={id} className={s.callout} data-on={active === id ? '' : undefined} data-active={active ? '' : undefined} {...bind(id, true)}>
            {line && <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke={day ? '#8A909C' : color} strokeWidth="1.5" />}
            {line && <rect x={line[2] - 2.5} y={line[3] - 2.5} width="5" height="5" fill={day ? '#8A909C' : color} />}
            <g className={s.labelFull}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={paper}
                stroke={active === id ? color : edge}
                strokeWidth={active === id ? 2 : 1.5}
                strokeDasharray={dashed ? '5 4' : undefined}
              />
              <rect x={x + 12} y={y + 12} width="9" height="9" fill={color} />
              <text x={x + 28} y={y + 21} fontSize="14" fontWeight="600" fill={day ? ink : color}>
                {a.nombre}
              </text>
              <text x={x + 12} y={y + 38} fontSize="11" fill={muted} fontFamily="'IBM Plex Sans', ui-sans-serif, sans-serif">
                {subs[id]}
              </text>
            </g>
            <g className={s.labelShort}>
              <rect
                x={x}
                y={y + (h - 40) / 2}
                width={shortW}
                height="40"
                fill={paper}
                stroke={edge}
                strokeWidth="2"
                strokeDasharray={dashed ? '6 5' : undefined}
              />
              <rect x={x + 12} y={y + h / 2 - 7} width="14" height="14" fill={color} />
              <text x={x + 34} y={y + h / 2 + 7.5} fontSize="21" fontWeight="600" fill={day ? ink : color}>
                {a.nombre}
              </text>
            </g>
          </g>
        )
      })}
    </g>
  )
}

/* -------------------------------------------------------------- cards */

function CardBody({ agent, island }) {
  const { t, locale } = useTranslation()
  const en = locale === 'en'
  const tbd = agent.estado === 'por_definir'
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={clsx(s.mono, 'flex items-center gap-2 text-base font-semibold leading-tight text-zinc-900 dark:text-white')}>
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5" style={{ background: agent.color }} />
          {agent.nombre}
        </p>
        <span
          className={clsx(
            s.mono,
            'mt-0.5 inline-flex shrink-0 items-center gap-1.5 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider',
            tbd
              ? 'border-dashed border-violet-400 text-violet-700 dark:text-[#C9B6FF]'
              : 'border-emerald-500/50 text-emerald-700 dark:text-[#9FF0C9]'
          )}
        >
          <span aria-hidden="true" className={clsx('h-1.5 w-1.5', tbd ? 'bg-violet-400/60' : clsx('bg-emerald-500', s.dot))} />
          {t(`companies.status.${agent.estado}`)}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-[#B9C4DB]">{en ? agent.en.edificio : agent.edificio}</p>
      <p className="mt-3 text-sm leading-snug text-zinc-800 dark:text-[#E6EAF2]">{en ? agent.en.rol : agent.rol}</p>
      {agent.id === 'apps' && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {appStoreApps.map((app) => (
            <li key={app.key} className="border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-white/10 dark:text-[#E6EAF2]">
              {app.name}
            </li>
          ))}
        </ul>
      )}
      <dl className={clsx(s.mono, 'mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-zinc-200 pt-3 text-[11px] dark:border-white/10')}>
        <div>
          <dt className="uppercase tracking-wider text-zinc-500 dark:text-[#B9C4DB]">{t('companies.card.channel')}</dt>
          <dd className="text-zinc-900 dark:text-[#E6EAF2]">{agent.canal ?? t('companies.card.none')}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-500 dark:text-[#B9C4DB]">{t('companies.card.island')}</dt>
          <dd className="text-zinc-900 dark:text-[#E6EAF2]">{en ? island.en : island.nombre}</dd>
        </div>
      </dl>
    </>
  )
}

function FloatingCard({ agent, island, at }) {
  return (
    <div
      className={clsx(
        s.card,
        'pointer-events-none absolute hidden w-[17rem] border border-zinc-300 bg-white p-4 dark:border-white/15 dark:bg-[#0E1A33] sm:block lg:w-[18.5rem]'
      )}
      style={{
        '--c': agent.color,
        left: `${(at[0] / VIEW_W) * 100}%`,
        top: `${(at[1] / VIEW_H) * 100}%`,
      }}
    >
      <CardBody agent={agent} island={island} />
    </div>
  )
}

function Sheet({ agent, island, onClose }) {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        s.figure,
        s.sheet,
        'fixed inset-x-0 bottom-0 z-50 border-t border-zinc-300 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 dark:border-white/15 dark:bg-[#0E1A33] sm:hidden'
      )}
      style={{ '--c': agent.color }}
      role="dialog"
      aria-label={agent.nombre}
    >
      <CardBody agent={agent} island={island} />
      <button
        type="button"
        onClick={onClose}
        className={clsx(s.mono, 'mt-4 w-full border border-zinc-300 py-2.5 text-xs uppercase tracking-wider text-zinc-800 active:bg-zinc-100 dark:border-white/15 dark:text-[#E6EAF2] dark:active:bg-white/10')}
      >
        {t('companies.card.close')}
      </button>
    </div>
  )
}

function Legend() {
  const { t } = useTranslation()
  const items = [
    {
      key: 'messages',
      icon: (
        <>
          <rect x="8" y="4" width="8" height="8" fill="#F2B630" opacity="0.35" />
          <rect x="10" y="6" width="4" height="4" fill="#F2B630" />
        </>
      ),
    },
    {
      key: 'windows',
      icon: (
        <g fill="#F2B630">
          <rect x="4" y="3" width="6" height="3" />
          <rect x="4" y="9" width="6" height="3" />
          <rect x="14" y="3" width="6" height="3" />
          <rect x="14" y="9" width="6" height="3" opacity="0.5" />
        </g>
      ),
    },
    {
      key: 'isolated',
      icon: <rect x="3" y="2" width="18" height="12" fill="none" stroke="#E8505B" strokeWidth="1.5" strokeDasharray="3 2" />,
    },
    {
      key: 'ferry',
      icon: (
        <>
          <line x1="1" y1="13" x2="23" y2="13" stroke="#7FA3D3" strokeWidth="1.5" strokeDasharray="2 2" />
          <polygon points="6,7 18,7 16,11 8,11" fill="#6C8FD8" />
          <rect x="9" y="3" width="5" height="4" fill="#6C8FD8" />
        </>
      ),
    },
    {
      key: 'tbd',
      icon: <rect x="5" y="2" width="14" height="12" fill="#9A82E6" fillOpacity="0.5" stroke="#9A82E6" strokeDasharray="2.5 2" />,
    },
  ]
  return (
    <ul className={clsx(s.mono, 'flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400')} aria-label={t('companies.legend.title')}>
      {items.map(({ key, icon }) => (
        <li key={key} className="flex items-center gap-2">
          <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0" aria-hidden="true">
            {icon}
          </svg>
          {t(`companies.legend.${key}`)}
        </li>
      ))}
    </ul>
  )
}
