// `compact` shortens "Jun 2019" to "2019" for tight layouts such as the home cards.
export function DateRange({ start, end, presentLabel, compact, className }) {
  const label = (date) => (compact ? date.dateTime.slice(0, 4) : date.label)

  return (
    <span className={className}>
      <time dateTime={start.dateTime}>{label(start)}</time>{' '}
      <span aria-hidden="true">—</span>{' '}
      {end ? (
        <time dateTime={end.dateTime}>{label(end)}</time>
      ) : (
        <span>{presentLabel}</span>
      )}
    </span>
  )
}
