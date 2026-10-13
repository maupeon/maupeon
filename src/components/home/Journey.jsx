import { Container } from '@/components/Container'
import { DateRange } from '@/components/DateRange'
import { Bezel } from '@/components/home/Bezel'
import { PillButton } from '@/components/home/PillButton'
import { Reveal } from '@/components/home/Reveal'
import { Eyebrow, SectionHeading } from '@/components/home/SectionHeading'
import { ArrowDownIcon } from '@/components/home/ThinIcons'
import { profile } from '@/lib/profile'
import { useTranslation } from '@/lib/useTranslation'

// One timeline mixing work and study, newest first. Medu is one entry among four.
const order = ['ucm', 'medu', 'ibm', 'itesm']

function buildTimeline(t) {
  const entries = [
    ...profile.jobs.map((job) => ({
      key: job.key,
      title: t(`profile.roles.${job.key}`),
      org: job.company,
      start: job.start,
      end: job.end,
    })),
    ...profile.education.map((item) => ({
      key: item.key,
      title: t(`profile.degrees.${item.key}`),
      org: item.school,
      start: item.start,
      end: item.end,
    })),
  ]

  return order.map((key) => entries.find((entry) => entry.key === key))
}

function Now() {
  const { t } = useTranslation()
  const items = t('home.now.items', [])

  return (
    <div className="lg:col-span-5">
      <Reveal>
        <SectionHeading
          id="now-title"
          eyebrow={t('home.now.eyebrow')}
          title={t('home.now.title')}
        />
      </Reveal>
      <ul
        role="list"
        className="mt-10 divide-y divide-zinc-900/10 dark:divide-white/10"
      >
        {items.map((item, index) => (
          <Reveal
            as="li"
            key={item.label}
            delay={index * 80}
            className="py-6 first:pt-0"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-500 dark:text-purple-400">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {item.title}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {item.detail}
            </p>
          </Reveal>
        ))}
      </ul>
    </div>
  )
}

function Timeline() {
  const { t } = useTranslation()
  const entries = buildTimeline(t)

  return (
    <Reveal className="lg:col-span-7" delay={120}>
      <Bezel as="div">
        <div className="p-7 sm:p-10">
          <Eyebrow>{t('home.journey.eyebrow')}</Eyebrow>
          <ol
            role="list"
            className="relative mt-8 space-y-9 before:absolute before:bottom-2 before:left-[0.4375rem] before:top-2 before:w-px before:bg-zinc-900/10 dark:before:bg-white/10"
          >
            {entries.map((entry) => (
              <li key={entry.key} className="relative pl-9">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-white ring-[3px] ring-purple-500/70 dark:bg-zinc-900 dark:ring-purple-400/70"
                />
                <p className="text-xs tabular-nums tracking-wide text-zinc-400 dark:text-zinc-500">
                  <DateRange
                    compact
                    start={entry.start}
                    end={entry.end}
                    presentLabel={t('profile.present')}
                  />
                </p>
                <p className="mt-1 font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {entry.title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {entry.org}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <PillButton
              href={profile.cv}
              variant="secondary"
              icon={ArrowDownIcon}
            >
              {t('home.resume.downloadCV')}
            </PillButton>
            <p className="mt-3 pl-6 text-xs text-zinc-400 dark:text-zinc-500">
              {t('home.resume.cvNote')}
            </p>
          </div>
        </div>
      </Bezel>
    </Reveal>
  )
}

export function Journey() {
  return (
    <section aria-labelledby="now-title" className="mt-32 sm:mt-40">
      <Container>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-14">
          <Now />
          <Timeline />
        </div>
      </Container>
    </section>
  )
}
