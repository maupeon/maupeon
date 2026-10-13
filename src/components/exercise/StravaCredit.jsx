import { Container } from '@/components/Container'
import { formatLongDate } from '@/lib/run-format'
import { useTranslation } from '@/lib/useTranslation'

function StravaLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

// Strava's API terms ask for visible attribution next to their data.
export function StravaCredit({ updatedAt, source }) {
  const { t, locale } = useTranslation()

  return (
    <Container className="mt-24 sm:mt-32">
      <div className="flex flex-col items-start justify-between gap-4 border-t border-zinc-900/10 pt-8 dark:border-white/10 sm:flex-row sm:items-center">
        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors duration-700 hover:text-[#fc4c02] dark:text-zinc-400"
        >
          <span>Powered by</span>
          <StravaLogo className="h-4 w-4 text-[#fc4c02]" />
          <span className="font-semibold">Strava</span>
        </a>
        {updatedAt && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {t('exercise.status.updated')} {formatLongDate(updatedAt, locale)}
            {source === 'snapshot' && ` · ${t('exercise.status.snapshot')}`}
          </p>
        )}
      </div>
    </Container>
  )
}
