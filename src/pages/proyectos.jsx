import Head from 'next/head'

import { Card } from '@/components/Card'
import { SimpleLayout } from '@/components/SimpleLayout'
import { useTranslation } from '@/lib/useTranslation'
import { MoonIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { appStoreApps, appStoreUrl } from '@/lib/apps'
import logoMps from '@/images/mps/iso_mps.svg'
import logoMedu from '@/images/logos/medu.png'
import logoMedu2 from '@/images/logos/medu2.png'
import ppaa from '@/images/logos/ppaa.jpg'
import a911 from '@/images/logos/a911.png'
import domingo from '@/images/logos/domingo.png'
import xolo from '@/images/logos/xolo.png'
import zamme from '@/images/logos/zamme.png'
import macondo from '@/images/logos/macondo.png'
import camsam from '@/images/logos/camsam.png'
import presidentes from '@/images/logos/presidentes.ico'
// App Store apps first, then my other products, then work with other teams.
// `icon` replaces the logo circle for projects without a logo file.
const projectGroups = [
  {
    key: 'apps',
    projects: appStoreApps.map((app) => ({
      name: app.name,
      descriptionPath: `apps.items.${app.key}.tagline`,
      link: { href: appStoreUrl(app), label: 'App Store' },
      logo: { src: app.icon },
    })),
  },
  {
    key: 'built',
    projects: [
      {
        name: 'Manuel Peón Sports',
        descriptionKey: 'mps',
        link: {
          href: 'https://manuelpeonsports.com',
          label: 'manuelpeonsports.com',
        },
        logo: logoMps,
      },
      {
        name: 'Medu',
        descriptionKey: 'medu',
        link: { href: 'https://medu.ai', label: 'medu.ai' },
        logo: logoMedu2,
      },
      {
        name: 'Medu IA',
        descriptionKey: 'meduIA',
        link: {
          href: 'https://mexicobusiness.news/health/news/medu-ai-transforms-medical-learning-advanced-ai-tool',
          labelKey: 'projects.links.meduIA',
        },
        icon: SparklesIcon,
      },
      {
        name: 'Medu App',
        descriptionKey: 'meduApp',
        link: {
          href: 'https://apps.apple.com/mx/app/medu/id1584009164',
          label: 'App Store',
        },
        logo: logoMedu,
      },
      {
        name: 'Meditation',
        nameKey: 'projects.names.meditation',
        descriptionKey: 'meditation',
        inProgress: true,
        icon: MoonIcon,
      },
    ],
  },
  {
    key: 'more',
    projects: [
      {
        name: 'PPAA',
        descriptionKey: 'ppaa',
        link: { href: 'https://www.ppaa.mx', label: 'ppaa.mx' },
        logo: ppaa,
      },
      {
        name: 'A911',
        descriptionKey: 'a911',
        link: { href: 'https://www.arq911.com/', label: 'arq911.com' },
        logo: a911,
      },
      {
        name: 'Domingo',
        descriptionKey: 'domingo',
        link: { href: 'https://domingo-shop.com/', label: 'domingo-shop.com' },
        logo: domingo,
      },
      {
        name: 'Xolo',
        descriptionKey: 'xolo',
        link: { href: 'https://xolostays.mx/', label: 'xolostays.mx' },
        logo: xolo,
      },
      {
        name: 'Zamme',
        descriptionKey: 'zamme',
        link: { href: 'https://zamme.org/', label: 'zamme.org' },
        logo: zamme,
      },
      {
        name: 'Macondo',
        descriptionKey: 'macondo',
        link: {
          href: 'https://macondo-shop.com/',
          label: 'macondo-shop.com',
        },
        logo: macondo,
      },
      {
        name: 'CAMSAM',
        descriptionKey: 'camsam',
        link: {
          href: 'https://www.colegiodearquitectoscdmx.org/aranceles/',
          label: 'colegiodearquitectoscdmx.org',
        },
        logo: camsam,
      },
      {
        name: 'Presidentes de México',
        descriptionKey: 'presidentes',
        link: {
          href: 'https://presidentesdemexico.vercel.app/',
          label: 'presidentesdemexico.vercel.app',
        },
        logo: presidentes,
      },
    ],
  },
]

function LinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M15.712 11.823a.75.75 0 1 0 1.06 1.06l-1.06-1.06Zm-4.95 1.768a.75.75 0 0 0 1.06-1.06l-1.06 1.06Zm-2.475-1.414a.75.75 0 1 0-1.06-1.06l1.06 1.06Zm4.95-1.768a.75.75 0 1 0-1.06 1.06l1.06-1.06Zm3.359.53-.884.884 1.06 1.06.885-.883-1.061-1.06Zm-4.95-2.12 1.414-1.415L12 6.344l-1.415 1.413 1.061 1.061Zm0 3.535a2.5 2.5 0 0 1 0-3.536l-1.06-1.06a4 4 0 0 0 0 5.656l1.06-1.06Zm4.95-4.95a2.5 2.5 0 0 1 0 3.535L17.656 12a4 4 0 0 0 0-5.657l-1.06 1.06Zm1.06-1.06a4 4 0 0 0-5.656 0l1.06 1.06a2.5 2.5 0 0 1 3.536 0l1.06-1.06Zm-7.07 7.07.176.177 1.06-1.06-.176-.177-1.06 1.06Zm-3.183-.353.884-.884-1.06-1.06-.884.883 1.06 1.06Zm4.95 2.121-1.414 1.414 1.06 1.06 1.415-1.413-1.06-1.061Zm0-3.536a2.5 2.5 0 0 1 0 3.536l1.06 1.06a4 4 0 0 0 0-5.656l-1.06 1.06Zm-4.95 4.95a2.5 2.5 0 0 1 0-3.535L6.344 12a4 4 0 0 0 0 5.656l1.06-1.06Zm-1.06 1.06a4 4 0 0 0 5.657 0l-1.061-1.06a2.5 2.5 0 0 1-3.535 0l-1.061 1.06Zm7.07-7.07-.176-.177-1.06 1.06.176.178 1.06-1.061Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ProjectCard({ project }) {
  const { t } = useTranslation()
  const Icon = project.icon
  const name = project.nameKey ? t(project.nameKey) : project.name
  const linkLabel = project.link?.labelKey
    ? t(project.link.labelKey)
    : project.link?.label

  return (
    <Card as="li">
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
        {Icon ? (
          <Icon className="h-6 w-6 text-purple-500 dark:text-purple-400" />
        ) : (
          <img
            src={project.logo.src}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
      </div>
      <h3 className="mt-6 text-base font-semibold text-zinc-800 dark:text-zinc-100">
        {project.link ? (
          <Card.Link href={project.link.href}>{name}</Card.Link>
        ) : (
          name
        )}
      </h3>
      <Card.Description>
        {t(project.descriptionPath ?? `projects.descriptions.${project.descriptionKey}`)}
      </Card.Description>
      {project.link ? (
        <p className="relative z-10 mt-6 flex text-sm font-medium text-zinc-400 transition group-hover:text-purple-500 dark:text-zinc-200">
          <LinkIcon className="h-6 w-6 flex-none" />
          <span className="ml-2">{linkLabel}</span>
        </p>
      ) : (
        <p className="relative z-10 mt-6 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 ring-1 ring-purple-500/20 dark:bg-purple-400/10 dark:text-purple-300 dark:ring-purple-400/20">
          {t('projects.inProgress')}
        </p>
      )}
    </Card>
  )
}

export default function Projects() {
  const { t } = useTranslation()
  return (
    <>
      <Head>
        <title>{t('projects.title')}</title>
        <meta name="description" content={t('projects.metaDescription')} />
      </Head>
      <SimpleLayout title={t('projects.heading')} intro={t('projects.intro')}>
        <div className="space-y-20">
          {projectGroups.map((group) => (
            <section key={group.key} aria-labelledby={`projects-${group.key}`}>
              <h2
                id={`projects-${group.key}`}
                className="mb-10 font-serif text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100"
              >
                {t(`projects.groups.${group.key}`)}
              </h2>
              <ul
                role="list"
                className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
              >
                {group.projects.map((project) => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SimpleLayout>
    </>
  )
}
