import Link from 'next/link'
import clsx from 'clsx'

import { ArrowUpRightIcon } from '@/components/home/ThinIcons'

const variants = {
  primary: {
    button:
      'bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
    icon: 'bg-white/15 dark:bg-zinc-900/10',
  },
  secondary: {
    button:
      'bg-zinc-900/[0.03] text-zinc-800 ring-1 ring-zinc-900/10 hover:bg-zinc-900/[0.06] dark:bg-white/[0.05] dark:text-zinc-100 dark:ring-white/10 dark:hover:bg-white/[0.09]',
    icon: 'bg-zinc-900/[0.07] dark:bg-white/10',
  },
  light: {
    button: 'bg-zinc-50 text-zinc-900 hover:bg-white',
    icon: 'bg-zinc-900/10',
  },
}

// Pill with the arrow nested in its own circle ("button in button"); on hover
// the circle drifts diagonally and the whole pill compresses on press.
export function PillButton({
  href,
  variant = 'primary',
  icon: Icon = ArrowUpRightIcon,
  className,
  children,
}) {
  const styles = variants[variant]
  const isNewTab = /^https?:\/\//.test(href) || href.endsWith('.pdf')

  return (
    <Link
      href={href}
      {...(isNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
      className={clsx(
        'group inline-flex items-center gap-4 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-medium outline-offset-4 transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]',
        styles.button,
        className
      )}
    >
      {children}
      <span
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-full transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105',
          styles.icon
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    </Link>
  )
}
