import clsx from 'clsx'

import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { Reveal } from '@/components/home/Reveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { formatMonth, formatNumber } from '@/lib/run-format'
import { useTranslation } from '@/lib/useTranslation'

export function MonthlyChart({ monthly }) {
  const { t, locale } = useTranslation()
  const max = Math.max(...monthly.map((month) => month.km), 1)
  const total = Math.round(monthly.reduce((sum, month) => sum + month.km, 0))
  const peak = monthly.reduce((best, month) => (month.km > best.km ? month : best))

  // No kilometres at all means no data, not a year of rest: show nothing
  // rather than a chart of zeros that reads as "0 km".
  if (total === 0) return null

  const summary = monthly
    .map((month) => `${formatMonth(month.month, locale, 'long')}: ${Math.round(month.km)} km`)
    .join(', ')

  return (
    <section aria-labelledby="monthly-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <SectionHeading
            id="monthly-title"
            eyebrow={t('exercise.monthly.eyebrow')}
            title={t('exercise.monthly.title')}
          />
          <p className="mt-5 text-zinc-600 dark:text-zinc-400">
            {t('exercise.monthly.summary').replace('{km}', formatNumber(total, locale))}
          </p>
        </Reveal>

        <Reveal className="mt-12" delay={100}>
          <Bezel>
            <div className="p-6 sm:p-10">
              <ol
                role="img"
                aria-label={`${t('exercise.monthly.aria')}. ${summary}`}
                className="flex h-60 items-end gap-1.5 sm:gap-3"
              >
                {monthly.map((month, index) => {
                  const isPeak = month.month === peak.month && month.km > 0
                  const height = month.km > 0 ? Math.max((month.km / max) * 100, 4) : 0

                  return (
                    <li
                      key={month.month}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span
                        className={clsx(
                          'text-[10px] tabular-nums sm:text-xs',
                          isPeak
                            ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                            : 'text-zinc-400 dark:text-zinc-500'
                        )}
                      >
                        {month.km > 0 ? Math.round(month.km) : ''}
                      </span>
                      <div className="flex h-36 w-full items-end justify-center">
                        {month.km > 0 ? (
                          <div
                            className={clsx(
                              'chart-bar w-full max-w-[1.75rem] rounded-full',
                              isPeak
                                ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                                : 'bg-gradient-to-t from-zinc-300 to-zinc-200 dark:from-zinc-600 dark:to-zinc-500'
                            )}
                            style={{
                              height: `${height}%`,
                              '--bar-delay': `${index * 55}ms`,
                            }}
                          />
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 sm:text-xs">
                        {formatMonth(month.month, locale)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </Bezel>
        </Reveal>
      </Container>
    </section>
  )
}
