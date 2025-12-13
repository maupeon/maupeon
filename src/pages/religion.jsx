import { Container } from '@/components/Container'
import Head from 'next/head'
import React, { useState, useEffect } from 'react'

// Decorative divider component
function BiblicalDivider({ symbol = '✦' }) {
  return (
    <div className="my-8 biblical-divider text-biblical-gold/60 dark:text-biblical-gold/40">
      <span className="biblical-divider-symbol animate-divine-glow">
        {symbol}
      </span>
    </div>
  )
}

// Ornate section header
function SectionHeader({ title, reference }) {
  return (
    <div className="mb-8 text-center animate-descend">
      <h2 className="text-2xl tracking-wide font-biblical-decorative text-biblical-sepia dark:text-biblical-sepia-light sm:text-3xl">
        {title}
      </h2>
      {reference && (
        <p className="mt-2 text-sm tracking-widest uppercase font-biblical-heading text-biblical-gold">
          {reference}
        </p>
      )}
    </div>
  )
}

// Scripture text with drop cap styling
function ScriptureText({ text, showDropCap = false }) {
  // Clean the text from any bracketed content
  const cleanText = text?.replace(/\[\[.*?\]\]/g, '') || ''

  return (
    <p
      className={`
        font-biblical-body text-lg leading-relaxed text-biblical-sepia
        dark:text-biblical-sepia-light sm:text-xl
        ${showDropCap ? 'drop-cap' : ''}
        animate-scroll-unfurl
      `}
    >
      {cleanText}
    </p>
  )
}

// Loading state with cross animation
function BiblicalLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-biblical-cream dark:bg-biblical-cream-dark">
      <div className="biblical-loader text-biblical-gold">
        <span className="text-4xl biblical-loader-cross">✝</span>
        <p className="animate-candlelight font-biblical-heading text-biblical-sepia dark:text-biblical-sepia-light">
          Cargando la Palabra...
        </p>
      </div>
    </div>
  )
}

// Error state
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-biblical-cream dark:bg-biblical-cream-dark">
      <div className="px-4 text-center">
        <span className="block mb-4 text-4xl">😔</span>
        <p className="mb-4 font-biblical-heading text-biblical-sepia dark:text-biblical-sepia-light">
          {message || 'No se pudieron cargar las lecturas'}
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2 transition-colors rounded bg-biblical-gold/20 font-biblical-heading text-biblical-sepia hover:bg-biblical-gold/30 dark:text-biblical-sepia-light"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}

// Main scripture card component
function ScriptureCard({ children, delay = 0 }) {
  return (
    <div
      className="rounded-sm biblical-card animate-scroll-unfurl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============ UTILIDADES PARA USCCB ============

function formatearFechaUSCCB(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  const año = String(fecha.getFullYear()).slice(-2)
  return `${mes}${dia}${año}`
}

async function fetchUSCCB(fecha) {
  const fechaFormateada = formatearFechaUSCCB(fecha)
  const url = `https://bible.usccb.org/es/bible/lecturas/${fechaFormateada}.cfm`

  const response = await fetch(url)
  if (!response.ok) throw new Error('USCCB no disponible')

  const html = await response.text()

  // Parsear HTML básico (sin cheerio en cliente)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const lecturas = {
    primera_lectura: null,
    salmo: null,
    segunda_lectura: null,
    evangelio: null,
    festividad: '',
  }

  // Extraer festividad del h1
  const h1 = doc.querySelector('h1')
  if (h1) lecturas.festividad = h1.textContent?.trim() || ''

  // Buscar todas las secciones h3
  const headings = doc.querySelectorAll('h3')

  headings.forEach((heading) => {
    const headingText = heading.textContent?.trim() || ''
    let tipo = null

    if (/Reading\s*1|Primera/i.test(headingText)) {
      tipo = 'primera_lectura'
    } else if (/Psalm|Salmo/i.test(headingText)) {
      tipo = 'salmo'
    } else if (/Reading\s*2|Segunda/i.test(headingText)) {
      tipo = 'segunda_lectura'
    } else if (/Gospel|Evangelio/i.test(headingText)) {
      tipo = 'evangelio'
    }

    if (tipo) {
      // Extraer cita del enlace
      const link = heading.querySelector('a')
      const cita = link?.textContent?.trim() || ''

      // Extraer texto - obtener siblings hasta el siguiente h3
      let texto = ''
      let sibling = heading.nextElementSibling

      while (sibling && sibling.tagName !== 'H3' && sibling.tagName !== 'H2') {
        if (sibling.tagName === 'P') {
          const content = sibling.textContent?.trim() || ''
          if (content && !content.includes('Escuchar Podcasts')) {
            texto += content + '\n\n'
          }
        }
        sibling = sibling.nextElementSibling
      }

      if (texto.trim()) {
        lecturas[tipo] = {
          title: headingText.replace(/\[.*?\]/g, '').trim(),
          reference_displayed: cita,
          text: texto.trim(),
        }
      }
    }
  })

  return lecturas
}

// ============ COMPONENTE PRINCIPAL ============

export default function EvangelioDeHoy() {
  const [date, setDate] = useState(null)
  const [firstReading, setFirstReading] = useState(null)
  const [gospel, setGospel] = useState(null)
  const [psalm, setPsalm] = useState(null)
  const [secondReading, setSecondReading] = useState(null)
  const [festividad, setFestividad] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    let today = new Date()
    let offset = today.getTimezoneOffset() + 6 * 60
    today.setMinutes(today.getMinutes() - offset)
    const formattedDate = today.toISOString().split('T')[0]

    // Intentar primero con tu API original
    try {
      const url = `https://evangelium.manuelsanchez.dev/api/es/days/${formattedDate}`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setDate(formattedDate)
        setFirstReading(data.first_reading)
        setGospel(data.gospel)
        setPsalm(data.psalm)
        setSecondReading(data.second_reading || null)
        setSource('evangelium')
        setLoading(false)
        return
      }
    } catch (e) {
      console.warn('API original no disponible, intentando USCCB...')
    }

    // Fallback a USCCB
    try {
      const lecturas = await fetchUSCCB(today)

      setDate(formattedDate)
      setFirstReading(lecturas.primera_lectura)
      setGospel(lecturas.evangelio)
      setPsalm(lecturas.salmo)
      setSecondReading(lecturas.segunda_lectura)
      setFestividad(lecturas.festividad)
      setSource('usccb')
      setLoading(false)
    } catch (e) {
      console.error('Error USCCB:', e)
      setError('No se pudieron cargar las lecturas de hoy')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Format date in a more elegant way
  const formatDate = (dateStr) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', options)
  }

  if (loading) {
    return <BiblicalLoader />
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />
  }

  if (!date || !gospel) {
    return (
      <ErrorState message="No hay lecturas disponibles" onRetry={fetchData} />
    )
  }

  return (
    <>
      <Head>
        <title>Evangelio de hoy - Lecturas del Día</title>
        <meta name="description" content="Evangelio y lecturas del día" />
      </Head>

      <Container className="mt-16 sm:mt-24">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <header className="mb-16 text-center animate-descend">
            {/* Decorative cross */}
            <div className="mb-6 text-5xl animate-divine-glow text-biblical-gold">
              ✝
            </div>

            <h1 className="mb-4 text-4xl tracking-wide font-biblical-decorative text-biblical-sepia dark:text-biblical-sepia-light sm:text-5xl lg:text-6xl">
              Evangelio de Hoy
            </h1>

            <p className="text-lg tracking-widest uppercase font-biblical-heading text-biblical-gold">
              {formatDate(date)}
            </p>

            {/* Festividad si existe */}
            {festividad && (
              <p className="mt-2 text-sm font-biblical-heading text-biblical-sepia/70 dark:text-biblical-sepia-light/70">
                {festividad}
              </p>
            )}

            {/* Ornate line */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className="w-16 h-px bg-gradient-to-r from-transparent to-biblical-gold/50"></span>
              <span className="text-sm text-biblical-gold">☩</span>
              <span className="w-16 h-px bg-gradient-to-l from-transparent to-biblical-gold/50"></span>
            </div>
          </header>

          {/* First Reading */}
          {firstReading && (
            <section className="mb-12">
              <ScriptureCard delay={100}>
                <SectionHeader
                  title={firstReading.title}
                  reference={firstReading.reference_displayed}
                />
                <ScriptureText text={firstReading.text} showDropCap={true} />
              </ScriptureCard>
            </section>
          )}

          <BiblicalDivider symbol="❧" />

          {/* Psalm */}
          {psalm && (
            <section className="mb-12">
              <ScriptureCard delay={200}>
                <SectionHeader title={psalm.title} />
                <div className="text-center">
                  <ScriptureText text={psalm.text} />
                </div>
              </ScriptureCard>
            </section>
          )}

          {/* Segunda Lectura (domingos) */}
          {secondReading && (
            <>
              <BiblicalDivider symbol="✦" />
              <section className="mb-12">
                <ScriptureCard delay={250}>
                  <SectionHeader
                    title={secondReading.title}
                    reference={secondReading.reference_displayed}
                  />
                  <ScriptureText text={secondReading.text} showDropCap={true} />
                </ScriptureCard>
              </section>
            </>
          )}

          <BiblicalDivider symbol="☩" />

          {/* Gospel */}
          <section className="mb-12">
            <ScriptureCard delay={300}>
              <div className="relative">
                {/* Special gospel indicator */}
                <div className="absolute px-4 -translate-x-1/2 -top-4 left-1/2 bg-biblical-parchment dark:bg-biblical-parchment-dark">
                  <span className="text-sm tracking-widest font-biblical-heading text-biblical-gold">
                    EVANGELIO
                  </span>
                </div>
              </div>

              <SectionHeader
                title={gospel.title}
                reference={gospel.reference_displayed}
              />
              <ScriptureText text={gospel.text} showDropCap={true} />
            </ScriptureCard>
          </section>

          {/* Footer blessing */}
          <footer className="py-12 text-center animate-candlelight">
            <p className="italic font-biblical-heading text-biblical-sepia/60 dark:text-biblical-sepia-light/60">
              &ldquo;Palabra del Señor&rdquo;
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-biblical-gold/40">✦</span>
              <span className="text-biblical-gold/60">✦</span>
              <span className="text-biblical-gold/40">✦</span>
            </div>
          </footer>
        </div>
      </Container>
    </>
  )
}
