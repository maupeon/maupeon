import { Container } from '@/components/Container'
import { Reveal } from '@/components/home/Reveal'
import { Eyebrow } from '@/components/home/SectionHeading'
import { formatNumber, formatPace } from '@/lib/run-format'
import { useTranslation } from '@/lib/useTranslation'

export function Totals({ totals }) {
  const { t, locale } = useTranslation()
  const thisYear = t('exercise.totals.thisYear')

  const tiles = [
    {
      key: 'runs',
      value: formatNumber(totals.runs, locale),
      sub: `${formatNumber(totals.ytdRuns, locale)} ${thisYear}`,
    },
    {
      key: 'km',
      value: formatNumber(totals.km, locale),
      unit: 'km',
      sub: `${formatNumber(totals.ytdKm, locale)} km ${thisYear}`,
    },
    { key: 'hours', value: formatNumber(totals.hours, locale), unit: 'h' },
    {
      key: 'pace',
      value: formatPace(totals.paceSecondsPerKm, 1000),
      unit: '/km',
    },
  ]

  return (
    <section aria-labelledby="totals-title" className="mt-24 sm:mt-32">
      <Container>
        <Reveal>
          <Eyebrow>
            <span id="totals-title">{t('exercise.totals.eyebrow')}</span>
          </Eyebrow>
        </Reveal>
        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {tiles.map((tile, index) => (
            <Reveal
              key={tile.key}
              delay={index * 80}
              className="flex flex-col-reverse justify-end border-l border-zinc-900/10 pl-5 dark:border-white/10 sm:pl-6"
            >
              <dt className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {t(`exercise.totals.${tile.key}`)}
                {tile.sub && (
                  <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                    {tile.sub}
                  </span>
                )}
              </dt>
              <dd className="font-serif text-5xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-6xl">
                {tile.value}
                {tile.unit && (
                  <span className="ml-1.5 font-sans text-base font-normal tracking-normal text-zinc-400 dark:text-zinc-500">
                    {tile.unit}
                  </span>
                )}
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  )
}
