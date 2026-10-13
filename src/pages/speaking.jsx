import Head from 'next/head'

import { Card } from '@/components/Card'
import { Section } from '@/components/Section'
import { SimpleLayout } from '@/components/SimpleLayout'
import { useTranslation } from '@/lib/useTranslation'

const sections = [
  {
    key: 'conferences',
    items: [
      {
        key: 'mhs',
        href: 'https://mexicobusiness.events/health/2025/09',
      },
      {
        key: 'neuron',
        href: 'https://neuronbusinessmedia.mx/impulsando-la-innovacion-empresarial-con-datos-y-tecnologias-cloud/',
      },
    ],
  },
  {
    key: 'writing',
    items: [
      {
        key: 'mbn',
        href: 'https://mexicobusiness.news/cloudanddata/news/medvi-ai-scandal-highlights-shortcuts-and-fine-print',
      },
    ],
  },
  {
    key: 'press',
    items: [
      {
        key: 'meduAi',
        href: 'https://mexicobusiness.news/health/news/medu-ai-transforms-medical-learning-advanced-ai-tool',
      },
    ],
  },
]

function SpeakingSection({ children, ...props }) {
  return (
    <Section {...props}>
      <div className="space-y-16">{children}</div>
    </Section>
  )
}

function Appearance({ title, description, event, cta, href }) {
  return (
    <Card as="article">
      <Card.Title as="h3" href={href}>
        {title}
      </Card.Title>
      <Card.Eyebrow decorate>{event}</Card.Eyebrow>
      <Card.Description>{description}</Card.Description>
      <Card.Cta>{cta}</Card.Cta>
    </Card>
  )
}

export default function Speaking() {
  const { t } = useTranslation()

  return (
    <>
      <Head>
        <title>{t('speaking.title')}</title>
        <meta name="description" content={t('speaking.metaDescription')} />
      </Head>
      <SimpleLayout
        title={t('speaking.heading')}
        intro={t('speaking.intro')}
      >
        <div className="space-y-20">
          {sections.map((section) => (
            <SpeakingSection
              key={section.key}
              title={t(`speaking.sections.${section.key}`)}
            >
              {section.items.map((item) => (
                <Appearance
                  key={item.key}
                  href={item.href}
                  title={t(`speaking.items.${item.key}.title`)}
                  event={t(`speaking.items.${item.key}.event`)}
                  description={t(`speaking.items.${item.key}.description`)}
                  cta={t(`speaking.items.${item.key}.cta`)}
                />
              ))}
            </SpeakingSection>
          ))}
        </div>
      </SimpleLayout>
    </>
  )
}
