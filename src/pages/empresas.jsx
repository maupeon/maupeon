import Head from 'next/head'

import { Container } from '@/components/Container'
import { AgentList, CityFrame, CityLegend } from '@/components/empresas/CityFrame'
import { Emphasis } from '@/components/home/Emphasis'
import { Eyebrow } from '@/components/home/SectionHeading'
import { getAgents } from '@/lib/agents'
import { useTranslation } from '@/lib/useTranslation'

export default function Empresas({ data }) {
  const { t } = useTranslation()

  return (
    <>
      <Head>
        <title>{t('companies.title')}</title>
        <meta name="description" content={t('companies.metaDescription')} />
      </Head>

      <Container className="mt-16 sm:mt-28">
        <header className="max-w-3xl">
          <Eyebrow>{t('companies.eyebrow')}</Eyebrow>
          <h1 className="mt-7 font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-zinc-900 [text-wrap:balance] dark:text-zinc-50 sm:text-6xl lg:text-7xl">
            <Emphasis>{t('companies.heading')}</Emphasis>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t('companies.intro')}
          </p>
        </header>
      </Container>

      <Container.Outer className="mt-14 sm:mt-20">
        <div className="px-4 sm:px-8 lg:px-12">
          <CityFrame data={data} />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CityLegend />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('companies.hint')}</p>
          </div>
          <AgentList data={data} />
        </div>
      </Container.Outer>

      <Container className="mt-14 sm:mt-20">
        <div className="grid max-w-4xl gap-8 text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
          {['coordinate', 'isolate', 'ferry'].map((key) => (
            <div key={key}>
              <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {t(`companies.notes.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                {t(`companies.notes.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </>
  )
}

export async function getStaticProps() {
  return { props: { data: await getAgents() } }
}
