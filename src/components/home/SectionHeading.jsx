import clsx from 'clsx'

import { Emphasis } from '@/components/home/Emphasis'

export function Eyebrow({ children, className }) {
  return (
    <p
      className={clsx(
        'inline-flex items-center rounded-full bg-zinc-900/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 ring-1 ring-zinc-900/[0.06] dark:bg-white/[0.05] dark:text-zinc-400 dark:ring-white/10',
        className
      )}
    >
      {children}
    </p>
  )
}

export function SectionHeading({ id, eyebrow, title, className, children }) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 [text-wrap:balance] dark:text-zinc-50 sm:text-5xl"
      >
        <Emphasis>{title}</Emphasis>
      </h2>
      {children}
    </div>
  )
}
