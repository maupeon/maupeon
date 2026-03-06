import Head from 'next/head'
import dynamic from 'next/dynamic'

import StravaStats from '@/components/StravaStats'
import { SimpleLayout } from '@/components/SimpleLayout'
import { useTranslation } from '@/lib/useTranslation'

const RunnerGame = dynamic(
  () => import('@/components/RunnerGame').then((mod) => mod.RunnerGame),
  { ssr: false }
)

export default function Ejercicio() {
  const { t } = useTranslation()
  return (
    <>
      <Head>
        <title>{t('exercise.title')}</title>
        <meta name="description" content={t('exercise.metaDescription')} />
      </Head>
      <SimpleLayout title={t('exercise.heading')} intro="">
        <div className="mb-12">
          <RunnerGame />
        </div>
        <StravaStats />
      </SimpleLayout>
    </>
  )
}
