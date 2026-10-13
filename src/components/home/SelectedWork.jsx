import Link from 'next/link'
import clsx from 'clsx'
import {
  GlobeEuropeAfricaIcon,
  MoonIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { Reveal } from '@/components/home/Reveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { ArrowUpRightIcon } from '@/components/home/ThinIcons'
import guardiaScreenshot from '@/images/apps/guardia.png'
import logoMedu from '@/images/logos/medu.png'
import logoTeToco from '@/images/logos/logoTeToco.png'
import { useTranslation } from '@/lib/useTranslation'

// Order matters: Medu is deliberately not first. `span` places each card in
// the 12-column bento on large screens; everything stacks on mobile.
const works = [
  {
    key: 'guardia',
    href: '/app/guardia',
    span: 'lg:col-span-7 lg:row-span-2',
    icon: ShieldCheckIcon,
    tall: true,
  },
  {
    key: 'celta',
    href: '/app/sueno-del-celta',
    span: 'lg:col-span-5',
    icon: GlobeEuropeAfricaIcon,
    forest: true,
  },
  {
    key: 'teToco',
    href: 'https://apps.apple.com/es/app/te-toc%C3%B3/id6756806727',
    span: 'lg:col-span-5',
    logo: logoTeToco,
  },
  {
    key: 'medu',
    href: 'https://medu.ai',
    span: 'lg:col-span-4',
    logo: logoMedu,
  },
  {
    key: 'meduIA',
    href: 'https://mexicobusiness.news/health/news/medu-ai-transforms-medical-learning-advanced-ai-tool',
    span: 'lg:col-span-4',
    icon: SparklesIcon,
  },
  {
    key: 'meditation',
    span: 'lg:col-span-4',
    icon: MoonIcon,
  },
]

function Mark({ work }) {
  const Icon = work.icon
  const ring = work.forest
    ? 'ring-[#e6dcc5]/20 text-[#e6dcc5]'
    : 'ring-zinc-900/10 text-zinc-600 dark:ring-white/10 dark:text-zinc-300'

  if (!work.logo && !Icon) return null

  return (
    <span
      className={clsx(
        'flex h-11 w-11 flex-none items-center justify-center rounded-full ring-1',
        ring
      )}
    >
      {work.logo ? (
        <img src={work.logo.src} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <Icon strokeWidth={1} className="h-5 w-5" />
      )}
    </span>
  )
}

function PhoneMock({ alt }) {
  return (
    <div className="relative mt-10 h-80 overflow-hidden lg:absolute lg:inset-y-0 lg:right-8 lg:mt-0 lg:h-auto lg:w-56">
      <div className="mx-auto w-52 rounded-[2.25rem] bg-zinc-900 p-2 shadow-[0_24px_48px_-24px_rgba(24,24,27,0.55)] ring-1 ring-white/10 lg:absolute lg:inset-x-0 lg:bottom-[-4.5rem] lg:mx-0 lg:w-full">
        <img
          src={guardiaScreenshot.src}
          alt={alt}
          className="w-full rounded-[1.75rem]"
        />
      </div>
    </div>
  )
}

function WorkCard({ work, index }) {
  const { t } = useTranslation()
  const copy = t(`home.work.items.${work.key}`, {})
  const isExternal = work.href && /^https?:\/\//.test(work.href)
  const LinkComponent = isExternal ? 'a' : Link

  return (
    <Reveal delay={(index % 3) * 90} className={work.span}>
      <Bezel
        as="article"
        spotlight={!work.forest}
        className="h-full"
        innerClassName={clsx(
          'flex min-h-[19rem] flex-col p-7 sm:p-9',
          work.tall && 'lg:min-h-[34rem]',
          work.forest &&
            'bg-[radial-gradient(120%_90%_at_100%_0%,rgba(230,220,197,0.16),transparent_55%),linear-gradient(160deg,#1c3427,#0f1a14)] text-[#e6dcc5] dark:bg-[#14231b]'
        )}
      >
        {work.href && (
          <LinkComponent
            href={work.href}
            aria-label={copy.title}
            {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
            className="absolute inset-0 z-20 rounded-[calc(2rem-0.375rem)] outline-offset-[-4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
          />
        )}

        <div
          className={clsx(
            'relative z-10 flex items-start justify-between gap-4',
            work.tall && 'lg:pr-64'
          )}
        >
          <Mark work={work} />
          <span
            className={clsx(
              'text-right text-[10px] font-semibold uppercase leading-relaxed tracking-[0.18em]',
              work.forest ? 'text-[#e6dcc5]/60' : 'text-zinc-400 dark:text-zinc-500'
            )}
          >
            {copy.tag}
          </span>
        </div>

        <div
          className={clsx('relative z-10 mt-auto pt-12', work.tall && 'lg:pr-64')}
        >
          <h3
            className={clsx(
              'font-serif text-3xl font-semibold tracking-tight',
              !work.forest && 'text-zinc-900 dark:text-zinc-50'
            )}
          >
            {copy.title}
          </h3>
          <p
            className={clsx(
              'mt-3 max-w-md text-sm leading-relaxed',
              work.forest
                ? 'text-[#e6dcc5]/75'
                : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            {copy.description}
          </p>
          <div
            className={clsx(
              'mt-7 flex items-center gap-3 text-sm font-medium',
              work.forest ? 'text-[#e6dcc5]' : 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {work.href ? (
              <>
                <span>{copy.cta}</span>
                <span
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-110',
                    work.forest
                      ? 'bg-[#e6dcc5]/15'
                      : 'bg-zinc-900/[0.06] dark:bg-white/10'
                  )}
                >
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </span>
              </>
            ) : (
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-300">
                {t('home.work.inProgress')}
              </span>
            )}
          </div>
        </div>

        {work.tall && <PhoneMock alt={copy.imageAlt} />}
      </Bezel>
    </Reveal>
  )
}

export function SelectedWork() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="work-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="work-title"
            eyebrow={t('home.work.eyebrow')}
            title={t('home.work.title')}
          />
          <Link
            href="/proyectos"
            className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors duration-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {t('home.work.viewAll')}
            <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px" />
          </Link>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {works.map((work, index) => (
            <WorkCard key={work.key} work={work} index={index} />
          ))}
        </div>
      </Container>
    </section>
  )
}
