import { Container } from '@/components/Container'
import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/useTranslation'

function ReadingSection({ label, title, reference, text, isGospel = false }) {
  const cleanText = text?.replace(/\[\[.*?\]\]/g, '') || ''
  if (!text) return null

  return (
    <section className="mb-16">
      {label && (
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-500"
           style={{ fontFamily: "'Cinzel', serif" }}>
          {label}
        </p>
      )}
      <h2
        className={`mb-2 font-semibold tracking-wide ${
          isGospel ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        } text-zinc-900 dark:text-zinc-100`}
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        {title}
      </h2>
      {!reference && <div className="mb-6" />}
      <div
        className={`text-lg leading-[1.9] sm:text-xl sm:leading-[1.9] text-zinc-700 dark:text-zinc-300 ${
          isGospel ? 'first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-[0.8] first-letter:mt-1' : ''
        }`}
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        {cleanText}
      </div>
      {reference && (
        <p className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-right text-zinc-400 dark:text-zinc-500"
           style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          {reference}
        </p>
      )}
    </section>
  )
}

function Divider() {
  return (
    <div className="flex items-center justify-center my-12">
      <span className="block w-12 h-px bg-zinc-200 dark:bg-zinc-700" />
    </div>
  )
}

export default function EvangelioDeHoy() {
  const { t, locale } = useTranslation()
  const [date, setDate] = useState(null)
  const [firstReading, setFirstReading] = useState(null)
  const [gospel, setGospel] = useState(null)
  const [psalm, setPsalm] = useState(null)
  const [secondReading, setSecondReading] = useState(null)
  const [festividad, setFestividad] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    let today = new Date()
    let offset = today.getTimezoneOffset() + 6 * 60
    today.setMinutes(today.getMinutes() - offset)
    const formattedDate = today.toISOString().split('T')[0]

    try {
      const response = await fetch(`/api/lecturas?fecha=${formattedDate}`)
      if (!response.ok) throw new Error('Vatican News no disponible')
      const lecturas = await response.json()

      setDate(formattedDate)
      setFirstReading(lecturas.primera_lectura)
      setGospel(lecturas.evangelio)
      setPsalm(lecturas.salmo)
      setSecondReading(lecturas.segunda_lectura)
      setFestividad(lecturas.festividad)
      setLoading(false)
    } catch (e) {
      console.error('Error Vatican News:', e)
      setError(t('religion.errorDefault'))
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (dateStr) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(
      locale === 'en' ? 'en-US' : 'es-ES',
      options
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm tracking-widest uppercase text-zinc-400 dark:text-zinc-500"
           style={{ fontFamily: "'Cinzel', serif" }}>
          {t('religion.loading')}
        </p>
      </div>
    )
  }

  if (error || !date || !gospel) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="mb-4 text-zinc-500 dark:text-zinc-400">
            {error || t('religion.errorNoReadings')}
          </p>
          <button
            onClick={fetchData}
            className="px-5 py-2 text-sm transition-colors border rounded-full text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
          >
            {t('religion.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('religion.pageTitle')}</title>
        <meta name="description" content={t('religion.metaDescription')} />
      </Head>

      <Container className="mt-16 sm:mt-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <header className="mb-16 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-zinc-400 dark:text-zinc-500 mb-3"
               style={{ fontFamily: "'Cinzel', serif" }}>
              {formatDate(date)}
            </p>
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {t('religion.heading')}
            </h1>
            {festividad && (
              <p className="mt-3 text-base italic text-zinc-500 dark:text-zinc-400"
                 style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                {festividad}
              </p>
            )}
          </header>

          {/* First Reading */}
          {firstReading && (
            <>
              <ReadingSection
                title={firstReading.title}
                reference={firstReading.reference_displayed}
                text={firstReading.text}
              />
              <Divider />
            </>
          )}

          {/* Psalm */}
          {psalm && (
            <>
              <ReadingSection
                title={psalm.title}
                text={psalm.text}
              />
              <Divider />
            </>
          )}

          {/* Second Reading (Sundays) */}
          {secondReading && (
            <>
              <ReadingSection
                title={secondReading.title}
                reference={secondReading.reference_displayed}
                text={secondReading.text}
              />
              <Divider />
            </>
          )}

          {/* Gospel */}
          <ReadingSection
            label={t('religion.gospel')}
            title={gospel.title}
            reference={gospel.reference_displayed}
            text={gospel.text}
            isGospel={true}
          />

          {/* Footer */}
          <footer className="pt-8 pb-16 text-center border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-sm italic text-zinc-400 dark:text-zinc-500"
               style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
              &ldquo;{t('religion.wordOfTheLord')}&rdquo;
            </p>
          </footer>
        </div>
      </Container>
    </>
  )
}
