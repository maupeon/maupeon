import { SimpleLayout } from '@/components/SimpleLayout'
import Head from 'next/head'
import React from 'react'
import InspirationsLayout from '@/components/InspirationsLayout'
import { books, movies, series, songs } from '@/lib/inspirations'
import { useTranslation } from '@/lib/useTranslation'

export default function Inspiraciones() {
  const { t } = useTranslation()
  return (
    <>
      <Head>
        <title>{t('inspirations.title')}</title>
        <meta name="description" content={t('inspirations.title')} />
      </Head>
      <SimpleLayout
        title={t('inspirations.heading')}
        intro={t('inspirations.intro')}
      >
        <InspirationsLayout files={books} title={t('inspirations.books')} />
        <InspirationsLayout files={movies} title={t('inspirations.movies')} />
        <InspirationsLayout files={songs} title={t('inspirations.songs')} />
        <InspirationsLayout files={series} title={t('inspirations.series')} />
      </SimpleLayout>
    </>
  )
}
