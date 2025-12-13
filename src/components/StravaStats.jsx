import { useEffect, useState } from 'react'

function RunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function DistanceIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>
  )
}

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function SpeedIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function TrophyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0" />
    </svg>
  )
}

function ExternalLinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function StravaLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

function AnimatedNumber({ value, suffix = '', duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)

  // Check if value contains a colon (like pace "6:08") - don't animate these
  const isTimeFormat = typeof value === 'string' && value.includes(':')
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value

  useEffect(() => {
    if (isTimeFormat || isNaN(numericValue)) {
      return
    }

    let startTime
    let animationFrame

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(numericValue * easeOut))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setDisplayValue(numericValue)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [numericValue, duration, isTimeFormat])

  // For time formats like "6:08", display as-is
  if (isTimeFormat) {
    return <>{value}{suffix}</>
  }

  if (isNaN(numericValue)) {
    return <>{value}{suffix}</>
  }

  return (
    <>
      {displayValue.toLocaleString()}
      {suffix}
    </>
  )
}

function StatCard({ stat, index }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-800/80 p-5 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10 transition-all duration-500 hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full ${stat.bgColor} opacity-30 blur-2xl transition-all duration-500 group-hover:opacity-50 group-hover:scale-110`} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={`inline-flex p-2.5 rounded-xl ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
        </div>

        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          <AnimatedNumber value={stat.value} />
          {stat.suffix && (
            <span className="ml-1 text-base font-medium text-zinc-400 dark:text-zinc-500">
              {stat.suffix}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function PRCard({ pr, index }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200 + index * 100)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <a
      href={`https://www.strava.com/activities/${pr.activityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-800/80 p-5 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5 hover:ring-orange-300 dark:hover:ring-orange-500/50">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-orange-500/0 transition-all duration-300 group-hover:from-orange-500/5 group-hover:to-transparent" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {pr.name}
              </span>
              <ExternalLinkIcon className="w-4 h-4 text-zinc-400 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 flex-shrink-0" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {new Date(pr.date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-mono text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {pr.timeFormatted}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {pr.pace}
            </p>
          </div>
        </div>
      </div>
    </a>
  )
}

export default function StravaStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/strava')
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-6 h-32"
            />
          ))}
        </div>

        <div className="space-y-4">
          <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-5 h-24"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Error al cargar datos</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.stats) return null

  const stats = [
    {
      label: 'Carreras',
      value: data.stats.totalRuns,
      icon: RunIcon,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
    },
    {
      label: 'Distancia',
      value: data.stats.totalDistanceKm,
      suffix: 'km',
      icon: DistanceIcon,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    },
    {
      label: 'Tiempo',
      value: data.stats.totalTimeHours,
      suffix: 'hrs',
      icon: ClockIcon,
      color: 'text-purple-500 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
    },
    {
      label: 'Ritmo',
      value: data.stats.averagePace,
      suffix: '/km',
      icon: SpeedIcon,
      color: 'text-orange-500 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
    },
  ]

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>

      {/* Personal Records */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10">
            <TrophyIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Records Personales
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.personalRecords?.map((pr, index) => (
            <PRCard key={pr.name} pr={pr} index={index} />
          ))}
        </div>
      </div>

      {/* Strava Attribution */}
      <div className="flex items-center justify-center pt-4">
        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-medium transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-lg hover:shadow-orange-500/10"
        >
          <span>Powered by</span>
          <StravaLogo className="w-5 h-5" />
          <span className="font-semibold">Strava</span>
        </a>
      </div>
    </div>
  )
}
