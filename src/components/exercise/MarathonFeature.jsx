import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { PillButton } from '@/components/home/PillButton'
import { Reveal } from '@/components/home/Reveal'
import { formatLongDate, formatPace, formatTime } from '@/lib/run-format'
import { useTranslation } from '@/lib/useTranslation'

// The milestone is part of the page's story, so it does not depend on Strava
// being reachable: the CV time is the floor, and Strava's measured time and
// pace replace it whenever the record is available.
export const MARATHON = { date: '2025-12-07', cvTime: '3:51', meters: 42195 }

export function MarathonFeature({ record }) {
  const { t, locale } = useTranslation()
  const time = record ? formatTime(record.time) : MARATHON.cvTime
  const date = formatLongDate(record?.date ?? MARATHON.date, locale)
  const stats = [
    record && {
      label: t('exercise.marathon.pace'),
      value: `${formatPace(record.time, MARATHON.meters)} /km`,
    },
    { label: t('exercise.marathon.distance'), value: '42.195 km' },
    { label: t('exercise.marathon.date'), value: date },
  ].filter(Boolean)

  return (
    <section aria-labelledby="marathon-title" className="mt-16 sm:mt-20">
      <Container>
        <Reveal>
          <Bezel innerClassName="bg-zinc-900 px-7 py-12 text-zinc-50 shadow-none sm:px-14 sm:py-16 dark:bg-zinc-800/80">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 select-none font-serif text-[12rem] font-semibold leading-none tracking-tighter text-white/[0.045] lg:block"
            >
              42.195
            </span>
            <div className="relative">
              <p className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 ring-1 ring-white/10">
                {t('exercise.marathon.eyebrow')}
              </p>
              <h2
                id="marathon-title"
                className="mt-6 font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                {t('exercise.marathon.title')}
              </h2>
              <p className="mt-10 font-serif text-7xl font-semibold leading-none tracking-tight tabular-nums sm:text-8xl lg:text-9xl">
                {time}
              </p>
              <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      {stat.label}
                    </dt>
                    <dd className="mt-1.5 text-lg text-zinc-100">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-10 max-w-xl text-sm leading-relaxed text-zinc-400">
                {record
                  ? t('exercise.marathon.note')
                  : t('exercise.marathon.noteOffline')}{' '}
                {t('exercise.marathon.also')}
              </p>
              {record?.isPublic && (
                <div className="mt-8">
                  <PillButton
                    href={`https://www.strava.com/activities/${record.activityId}`}
                    variant="light"
                  >
                    {t('exercise.marathon.viewOnStrava')}
                  </PillButton>
                </div>
              )}
            </div>
          </Bezel>
        </Reveal>
      </Container>
    </section>
  )
}
