import { useEffect, useRef } from 'react'

/**
 * Dust drifting in the window's light: a few dozen warm motes on a canvas.
 * Off with prefers-reduced-motion, paused while the tab is hidden.
 */
export function DustMotes({ className = '', count = 46 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const ctx = canvas.getContext('2d')
    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Fewer motes on small screens.
    const n = window.innerWidth < 760 ? Math.round(count / 2) : count
    const motes = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vx: -0.05 - Math.random() * 0.12,
      vy: -0.04 - Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      a: 0.25 + Math.random() * 0.5,
    }))

    // Stop drawing while the hero is off screen.
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(canvas)

    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(48, now - last) / 16.7
      last = now
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.phase += 0.012 * dt
        m.x += (m.vx + Math.sin(m.phase) * 0.08) * dt
        m.y += m.vy * dt
        if (m.y < -6) m.y = h + 6
        if (m.x < -6) m.x = w + 6
        const twinkle = 0.6 + 0.4 * Math.sin(m.phase * 1.7)
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 236, 190, ${m.a * twinkle})`
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = visible ? requestAnimationFrame(tick) : 0
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
