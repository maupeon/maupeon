import Head from 'next/head'
import dynamic from 'next/dynamic'

import { Container } from '@/components/Container'
import { MarathonFeature } from '@/components/exercise/MarathonFeature'
import { MonthlyChart } from '@/components/exercise/MonthlyChart'
import { Records } from '@/components/exercise/Records'
import { StravaCredit } from '@/components/exercise/StravaCredit'
import { Totals } from '@/components/exercise/Totals'
import { Bezel } from '@/components/home/Bezel'
import { Emphasis } from '@/components/home/Emphasis'
import { Reveal } from '@/components/home/Reveal'
import { Eyebrow, SectionHeading } from '@/components/home/SectionHeading'
import snapshot from '@/data/strava-snapshot.json'
import { getStravaPageData } from '@/lib/strava-data.mjs'
import { useTranslation } from '@/lib/useTranslation'

const RunnerGame = dynamic(
  () => import('@/components/RunnerGame').then((mod) => mod.RunnerGame),
  { ssr: false, loading: () => <div className="h-96 sm:h-[28rem]" /> }
)

export default function Ejercicio({ strava }) {
  const { t } = useTranslation()
  const marathon = strava?.records.find((record) => record.key === 'Marathon')

  return (
    <>
      <Head>
        <title>{t('exercise.title')}</title>
        <meta name="description" content={t('exercise.metaDescription')} />
      </Head>

      <Container className="mt-16 sm:mt-28">
        <header className="max-w-3xl">
          <Eyebrow>{t('exercise.eyebrow')}</Eyebrow>
          <h1 className="mt-7 font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-zinc-900 [text-wrap:balance] dark:text-zinc-50 sm:text-6xl lg:text-7xl">
            <Emphasis>{t('exercise.heading')}</Emphasis>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t('exercise.intro')}
          </p>
        </header>
      </Container>

      <MarathonFeature record={marathon} />

      {strava ? (
        <>
          <Totals totals={strava.totals} />
          <MonthlyChart monthly={strava.monthly} />
          <Records records={strava.records} />
        </>
      ) : (
        <Container className="mt-24">
          <p className="rounded-2xl bg-zinc-900/[0.03] p-6 text-sm text-zinc-600 ring-1 ring-zinc-900/5 dark:bg-white/[0.04] dark:text-zinc-400 dark:ring-white/10">
            {t('exercise.status.error')}
          </p>
        </Container>
      )}

      <section aria-labelledby="game-title" className="mt-32 sm:mt-40">
        <Container>
          <Reveal>
            <SectionHeading
              id="game-title"
              eyebrow={t('exercise.game.eyebrow')}
              title={t('exercise.game.title')}
            />
            <p className="mt-5 max-w-xl text-zinc-600 dark:text-zinc-400">
              {t('exercise.game.description')}
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={100}>
            <Bezel innerClassName="p-0">
              <RunnerGame />
            </Bezel>
          </Reveal>
        </Container>
      </section>

      <StravaCredit updatedAt={strava?.updatedAt} source={strava?.source} />
    </>
  )
}

// The numbers refresh on their own: Next rebuilds this page in the background
// every three hours, and the data layer only asks Strava for what is new since
// the committed snapshot. If Strava is down the snapshot is shown, and the page
// tries again in ten minutes instead of waiting out the full interval.
export async function getStaticProps() {
  const strava = await getStravaPageData({ snapshot })

  return {
    props: { strava },
    revalidate: strava?.source === 'live' ? 60 * 60 * 3 : 60 * 10,
  }
}
