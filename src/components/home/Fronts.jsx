import Link from 'next/link'

import { Container } from '@/components/Container'
import { Reveal } from '@/components/home/Reveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { ArrowUpRightIcon } from '@/components/home/ThinIcons'
import { useTranslation } from '@/lib/useTranslation'

const hrefs = {
  product: '/proyectos',
  words: '/speaking',
  endurance: '/ejercicio',
  inspiration: '/inspiraciones',
  faith: '/religion',
}

// The site as an index: each row is one thing I do and where to find it.
export function Fronts() {
  const { t } = useTranslation()
  const items = t('home.fronts.items', [])

  return (
    <section aria-labelledby="fronts-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <SectionHeading
            id="fronts-title"
            eyebrow={t('home.fronts.eyebrow')}
            title={t('home.fronts.title')}
          />
        </Reveal>
        <ol
          role="list"
          className="mt-14 border-b border-zinc-900/10 dark:border-white/10"
        >
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.key}
              delay={index * 70}
              className="border-t border-zinc-900/10 dark:border-white/10"
            >
              <Link
                href={hrefs[item.key]}
                className="group -mx-4 grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-4 gap-y-3 rounded-2xl px-4 py-8 outline-offset-2 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zinc-900/[0.025] dark:hover:bg-white/[0.03] sm:-mx-6 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:gap-x-8 sm:px-6"
              >
                <span className="text-xs tabular-nums tracking-widest text-zinc-400 dark:text-zinc-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-2 dark:text-zinc-50 sm:text-4xl">
                  {item.title}
                </span>
                <span className="col-start-2 col-end-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:col-auto sm:max-w-md">
                  {item.description}
                </span>
                <span className="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 ring-1 ring-zinc-900/10 transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-zinc-900 group-hover:text-zinc-50 group-hover:ring-transparent dark:text-zinc-400 dark:ring-white/10 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 sm:col-auto sm:row-auto">
                  <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}
