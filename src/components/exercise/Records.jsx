import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { Reveal } from '@/components/home/Reveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { ArrowUpRightIcon } from '@/components/home/ThinIcons'
import { MARATHON } from '@/components/exercise/MarathonFeature'
import { formatLongDate, formatPace, formatTime } from '@/lib/run-format'
import { useTranslation } from '@/lib/useTranslation'

function RecordCard({ record, index }) {
  const { t, locale } = useTranslation()
  const isValencia = record.key === 'Marathon' && record.date === MARATHON.date
  const name = t(`exercise.records.names.${record.key}`)

  return (
    <Reveal as="li" delay={(index % 3) * 80}>
      <Bezel spotlight className="h-full">
        <div className="flex h-full flex-col p-7 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {name}
            </p>
            {isValencia && (
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-medium text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-300">
                {t('exercise.records.valencia')}
              </span>
            )}
          </div>
          <p className="mt-8 font-serif text-5xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatTime(record.time)}
          </p>
          <p className="mt-auto pt-6 text-sm text-zinc-500 dark:text-zinc-400">
            {formatPace(record.time, record.meters)} /km ·{' '}
            {formatLongDate(record.date, locale)}
          </p>
        </div>
        {record.isPublic && (
          <a
            href={`https://www.strava.com/activities/${record.activityId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} · Strava`}
            className="absolute inset-0 z-10 flex items-start justify-end p-6 text-zinc-300 outline-offset-[-4px] transition-colors duration-700 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 dark:text-zinc-600 dark:hover:text-zinc-100"
          >
            <ArrowUpRightIcon className="h-4 w-4" />
          </a>
        )}
      </Bezel>
    </Reveal>
  )
}

export function Records({ records }) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="records-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <SectionHeading
            id="records-title"
            eyebrow={t('exercise.records.eyebrow')}
            title={t('exercise.records.title')}
          />
        </Reveal>
        <ul role="list" className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record, index) => (
            <RecordCard key={record.key} record={record} index={index} />
          ))}
        </ul>
      </Container>
    </section>
  )
}
