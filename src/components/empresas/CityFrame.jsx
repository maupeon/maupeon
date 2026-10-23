import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@/lib/useTranslation'

// The city is a Colorfigures page (built from figures/ciudad by
// scripts/build-ciudad.mjs) shown in a frame, so the site keeps its own header
// and footer around it. The page tells the frame its height; the frame tells
// the page the site's theme and the agents' data.
export function CityFrame({ data }) {
  const { t, locale } = useTranslation()
  const frame = useRef(null)
  const [theme, setTheme] = useState(null)
  const [src, setSrc] = useState(null)
  const [height, setHeight] = useState(820)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(root.classList.contains('dark') ? 'night' : 'day')
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // The first theme goes in the address; later changes go by message, so the
  // figure keeps its state (camera, switches) when the theme flips.
  useEffect(() => {
    if (theme && !src) setSrc(`/empresas/ciudad.html?theme=${theme}&lang=${locale}`)
  }, [theme, src, locale])

  useEffect(() => {
    setSrc(null)
  }, [locale])

  useEffect(() => {
    const post = (message) =>
      frame.current?.contentWindow?.postMessage(message, window.location.origin)
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'city:height') setHeight(event.data.h)
      if (event.data?.type === 'city:ready') {
        post({ type: 'city:theme', theme })
        post({ type: 'city:agents', data })
      }
    }
    window.addEventListener('message', onMessage)
    post({ type: 'city:theme', theme })
    return () => window.removeEventListener('message', onMessage)
  }, [theme, data])

  return (
    <div className="overflow-hidden rounded-[1.75rem] ring-1 ring-zinc-900/10 dark:ring-white/10 sm:rounded-[2rem]">
      {src ? (
        <iframe
          ref={frame}
          src={src}
          title={t('companies.figAria')}
          className="block w-full bg-[#f6f4ef] dark:bg-[#0b1630]"
          style={{ height }}
        />
      ) : (
        <div className="bg-[#f6f4ef] dark:bg-[#0b1630]" style={{ height }} />
      )}
    </div>
  )
}

export function CityLegend() {
  const { t } = useTranslation()
  const items = [
    {
      key: 'messages',
      icon: (
        <>
          <circle cx="12" cy="8" r="6.5" fill="#f2b630" opacity=".35" />
          <circle cx="12" cy="8" r="3" fill="#f2b630" stroke="#231e16" strokeWidth=".8" />
        </>
      ),
    },
    {
      key: 'windows',
      icon: (
        <g stroke="#231e16" strokeWidth=".8">
          <rect x="3" y="2" width="8" height="5" fill="#ffd95e" />
          <rect x="13" y="2" width="8" height="5" fill="#ffd95e" />
          <rect x="3" y="9" width="8" height="5" fill="#e8dcb4" />
          <rect x="13" y="9" width="8" height="5" fill="#ffd95e" />
        </g>
      ),
    },
    {
      key: 'isolated',
      icon: <rect x="3" y="2" width="18" height="12" rx="2" fill="none" stroke="#e8505b" strokeWidth="1.6" strokeDasharray="3 2" />,
    },
    {
      key: 'ferry',
      icon: (
        <>
          <path d="M1 14 Q12 9 23 14" fill="none" stroke="#5c86b8" strokeWidth="1.3" strokeDasharray="2.5 2.5" />
          <polygon points="6,7 18,7 16,11 8,11" fill="#f4f6fa" stroke="#231e16" strokeWidth=".8" />
          <rect x="9" y="3" width="5" height="4" fill="#6c8fd8" stroke="#231e16" strokeWidth=".8" />
        </>
      ),
    },
    {
      key: 'tbd',
      icon: <rect x="5" y="2" width="14" height="12" rx="1" fill="#9a82e6" fillOpacity=".45" stroke="#231e16" strokeDasharray="2.5 2" />,
    },
  ]
  return (
    <ul
      className="flex flex-wrap gap-x-6 gap-y-2.5 font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
      aria-label={t('companies.legend.title')}
    >
      {items.map(({ key, icon }) => (
        <li key={key} className="flex items-center gap-2">
          <svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0 rounded-sm dark:bg-zinc-200/90" aria-hidden="true">
            {icon}
          </svg>
          {t(`companies.legend.${key}`)}
        </li>
      ))}
    </ul>
  )
}

export function AgentList({ data }) {
  const { t, locale } = useTranslation()
  const en = locale === 'en'
  return (
    <ul className="sr-only">
      {data.agentes.map((a) => (
        <li key={a.id}>
          {a.nombre}: {en ? a.en.rol : a.rol} {t('companies.card.building')}:{' '}
          {en ? a.en.edificio : a.edificio}. {t('companies.card.channel')}:{' '}
          {a.canal ?? t('companies.card.none')}. {t('companies.card.status')}:{' '}
          {t(`companies.status.${a.estado}`)}.
        </li>
      ))}
    </ul>
  )
}
