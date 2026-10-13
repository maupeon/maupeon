// Translation strings mark the word to set in italic with single asterisks:
// "Construyo productos, *escribo* y corro."
export function Emphasis({
  children,
  className = 'font-normal italic text-zinc-500 dark:text-zinc-400',
}) {
  return children.split('*').map((part, index) =>
    index % 2 ? (
      <em key={index} className={className}>
        {part}
      </em>
    ) : (
      part
    )
  )
}
