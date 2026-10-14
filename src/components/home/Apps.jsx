import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { Reveal } from '@/components/home/Reveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { ArrowUpRightIcon } from '@/components/home/ThinIcons'
import { appStoreApps, appStoreUrl } from '@/lib/apps'
import { useTranslation } from '@/lib/useTranslation'

function AppCard({ app, index }) {
  const { t } = useTranslation()

  return (
    <Reveal as="li" delay={(index % 3) * 80}>
      <Bezel spotlight className="h-full" innerClassName="h-full">
        <a
          href={appStoreUrl(app)}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 flex h-full flex-col p-6 outline-offset-[-4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <img
              src={app.icon}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-[1.1rem] shadow-[0_12px_24px_-12px_rgba(24,24,27,0.45)] ring-1 ring-zinc-900/10 dark:ring-white/10"
            />
            <span className="text-right text-[10px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              {t(`apps.items.${app.key}.category`)}
              <span className="block">{app.year}</span>
            </span>
          </div>
          <h3 className="mt-7 font-serif text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {app.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t(`apps.items.${app.key}.tagline`)}
          </p>
          <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            App Store
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/[0.06] transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-110 dark:bg-white/10">
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </span>
          </span>
        </a>
      </Bezel>
    </Reveal>
  )
}

export function Apps() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="apps-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <SectionHeading
            id="apps-title"
            eyebrow={t('apps.eyebrow')}
            title={t('apps.title')}
          >
            <p className="mt-5 max-w-xl text-zinc-600 dark:text-zinc-400">
              {t('apps.intro')}
            </p>
          </SectionHeading>
        </Reveal>
        <ul
          role="list"
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {appStoreApps.map((app, index) => (
            <AppCard key={app.key} app={app} index={index} />
          ))}
        </ul>
      </Container>
    </section>
  )
}
