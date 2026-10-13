import Head from 'next/head'
import Link from 'next/link'
import clsx from 'clsx'

import { ArrowRightIcon } from '@/components/ArrowRightIcon'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { DateRange } from '@/components/DateRange'
import { Section } from '@/components/Section'
import { GitHubIcon, LinkedInIcon, MailIcon } from '@/components/SocialIcons'
import portraitImage from '@/images/avatar.jpg'
import { profile } from '@/lib/profile'
import { useTranslation } from '@/lib/useTranslation'

const stackCategories = [
  'languages',
  'frontend',
  'backend',
  'infrastructure',
  'ai',
  'other',
]

// Copy in the translation files marks emphasis with **double asterisks**.
function RichText({ children }) {
  return (
    <>
      {children.split('**').map((part, index) =>
        index % 2 ? (
          <strong
            key={index}
            className="font-semibold text-zinc-800 dark:text-zinc-200"
          >
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  )
}

function SocialLink({ className, href, children, icon: Icon }) {
  return (
    <li className={clsx(className, 'flex')}>
      <Link
        href={href}
        className="group flex text-sm font-medium text-zinc-800 transition hover:text-purple-500 dark:text-zinc-200 dark:hover:text-purple-400"
      >
        <Icon className="h-6 w-6 flex-none fill-zinc-500 transition group-hover:fill-purple-500" />
        <span className="ml-4">{children}</span>
      </Link>
    </li>
  )
}

function TextLink({ href, children }) {
  return (
    <Link
      href={href}
      className="group mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-purple-500 transition hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
    >
      {children}
      <ArrowRightIcon className="h-4 w-4 stroke-current transition group-hover:translate-x-0.5" />
    </Link>
  )
}

function BulletList({ items }) {
  return (
    <ul role="list" className="mt-5 space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-400"
        >
          <span
            aria-hidden="true"
            className="mt-2 h-1 w-1 flex-none rounded-full bg-purple-500 dark:bg-purple-400"
          />
          <span>
            <RichText>{item}</RichText>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Experience() {
  const { t } = useTranslation()

  return (
    <Section title={t('about.experience.title')} anchor="experiencia">
      <ol role="list" className="space-y-14">
        {profile.jobs.map((job) => {
          const description = t(`profile.orgDescriptions.${job.key}`, '')

          return (
            <li key={job.key}>
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
                  <img
                    src={job.logo.src}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                    {t(`profile.roles.${job.key}`)} · {job.company}
                  </h3>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {description && <>{description} · </>}
                    <DateRange
                      start={job.start}
                      end={job.end}
                      presentLabel={t('profile.present')}
                    />
                  </p>
                </div>
              </div>
              <BulletList items={t(`about.experience.${job.key}`, [])} />
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

function Stack() {
  const { t } = useTranslation()

  return (
    <Section title={t('about.stack.title')} anchor="stack">
      <dl className="space-y-6">
        {stackCategories.map((category) => (
          <div key={category}>
            <dt className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {t(`about.stack.categories.${category}`)}
            </dt>
            <dd className="mt-2">
              <ul role="list" className="flex flex-wrap gap-2">
                {t(`about.stack.items.${category}`, []).map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-900/5 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-white/10"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function Projects() {
  const { t } = useTranslation()

  return (
    <Section title={t('about.projects.title')} anchor="proyectos">
      <ul role="list" className="space-y-6">
        {t('about.projects.items', []).map((project) => (
          <li key={project.name}>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {project.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <TextLink href="/proyectos">{t('about.projects.viewAll')}</TextLink>
      </div>
    </Section>
  )
}

function Education() {
  const { t } = useTranslation()

  return (
    <Section title={t('about.education.title')} anchor="educacion">
      <ol role="list" className="space-y-8">
        {profile.education.map((item) => (
          <li key={item.key}>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              {t(`profile.degrees.${item.key}`)}
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {item.school} ·{' '}
              <DateRange
                start={item.start}
                end={item.end}
                presentLabel={t('profile.present')}
              />
            </p>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t(`about.education.notes.${item.key}`)}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

function More() {
  const { t } = useTranslation()

  return (
    <Section title={t('about.more.title')} anchor="mas">
      <dl className="space-y-6">
        <div>
          <dt className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t('about.more.languages.label')}
          </dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('about.more.languages.value')}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t('about.more.speaking.label')}
          </dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('about.more.speaking.value')}
            <div>
              <TextLink href="/speaking">{t('about.more.speaking.cta')}</TextLink>
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t('about.more.athlete.label')}
          </dt>
          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t('about.more.athlete.value')}
            <div>
              <TextLink href="/ejercicio">{t('about.more.athlete.cta')}</TextLink>
            </div>
          </dd>
        </div>
      </dl>
    </Section>
  )
}

export default function About() {
  const { t } = useTranslation()

  return (
    <>
      <Head>
        <title>{t('about.title')}</title>
        <meta name="description" content={t('about.metaDescription')} />
      </Head>
      <Container className="mt-16 sm:mt-32">
        <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-12">
          <div className="lg:pl-20">
            <div className="max-w-xs px-2.5 lg:max-w-none">
              <img
                src={portraitImage.src}
                alt={t('about.portraitAlt')}
                sizes="(min-width: 1024px) 32rem, 20rem"
                className="aspect-square rotate-3 rounded-2xl bg-zinc-100 object-cover dark:bg-zinc-800"
              />
            </div>
          </div>
          <div className="lg:order-first lg:row-span-2">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
              {t('about.heading')}
            </h1>
            <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
              {t('about.bio', []).map((paragraph) => (
                <p key={paragraph}>
                  <RichText>{paragraph}</RichText>
                </p>
              ))}
            </div>
          </div>
          <div className="lg:pl-20">
            <ul role="list">
              <SocialLink href={profile.links.github} icon={GitHubIcon}>
                {t('about.links.github')}
              </SocialLink>
              <SocialLink
                href={profile.links.linkedin}
                icon={LinkedInIcon}
                className="mt-4"
              >
                {t('about.links.linkedin')}
              </SocialLink>
              <SocialLink
                href={`mailto:${profile.email}`}
                icon={MailIcon}
                className="mt-8 border-t border-zinc-100 pt-8 dark:border-zinc-700/40"
              >
                {profile.email}
              </SocialLink>
            </ul>
            <Button
              target="_blank"
              href={profile.cv}
              variant="secondary"
              className="mt-8 w-full sm:w-auto"
            >
              {t('about.links.cv')}
              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                {t('home.resume.cvNote')}
              </span>
            </Button>
          </div>
        </div>
      </Container>
      <Container className="mt-24 sm:mt-32">
        <div className="space-y-20">
          <Experience />
          <Stack />
          <Projects />
          <Education />
          <More />
        </div>
      </Container>
    </>
  )
}
