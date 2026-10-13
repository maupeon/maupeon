import clsx from 'clsx'

// "Double bezel": an outer tray holding an inner plate with concentric radii,
// so cards read as machined objects instead of flat boxes. With `spotlight`,
// a soft glow follows the pointer across the plate.
export function Bezel({
  as: Component = 'div',
  spotlight = false,
  className,
  innerClassName,
  children,
  ...props
}) {
  function handlePointerMove(event) {
    const { left, top } = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - top}px`)
  }

  return (
    <Component
      className={clsx(
        'group rounded-[2rem] bg-zinc-900/[0.03] p-1.5 ring-1 ring-zinc-900/[0.06] dark:bg-white/[0.04] dark:ring-white/10',
        className
      )}
      onPointerMove={spotlight ? handlePointerMove : undefined}
      {...props}
    >
      <div
        className={clsx(
          'relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_28px_56px_-36px_rgba(24,24,27,0.35)] dark:bg-zinc-900 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]',
          innerClassName
        )}
      >
        {spotlight && <div aria-hidden="true" className="spotlight" />}
        {children}
      </div>
    </Component>
  )
}
