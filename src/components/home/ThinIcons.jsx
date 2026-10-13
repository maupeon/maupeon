// Hairline arrows for the home page: 1.25px strokes read as "precision" next to
// the serif headings, where the template's 1.5px icons look heavy.
export function ArrowUpRightIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.5 11.5 11.5 4.5M5.75 4.5h5.75v5.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArrowDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 3v9.25M4.5 8.75 8 12.25l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MailIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.75 4.75h10.5a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-.5.5H2.75a.5.5 0 0 1-.5-.5v-5.5a.5.5 0 0 1 .5-.5Zm.25.5L8 9l5-3.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
