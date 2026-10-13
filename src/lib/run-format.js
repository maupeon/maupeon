// Formatting for the exercise page. Dates are always formatted in UTC so the
// server render and the browser agree on the calendar day (Strava hands us
// local-time strings, so UTC here means "the day it happened for me").

const localeTag = (locale) => (locale === 'en' ? 'en-US' : 'es-MX')

export function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.round(totalSeconds % 60)
  const pad = (value) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

// Minutes:seconds per kilometre, e.g. "5:29".
export function formatPace(seconds, meters) {
  const perKm = (seconds / meters) * 1000
  const minutes = Math.floor(perKm / 60)
  const rest = Math.round(perKm % 60)

  return rest === 60
    ? `${minutes + 1}:00`
    : `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatNumber(value, locale) {
  return new Intl.NumberFormat(localeTag(locale)).format(value)
}

export function formatLongDate(isoDate, locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`))
}

// "2026-03" -> "mar." / "Mar"
export function formatMonth(month, locale, style = 'short') {
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: style,
    timeZone: 'UTC',
  })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace('.', '')
}
