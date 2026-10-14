import Head from 'next/head'
import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

import { Container } from '@/components/Container'
import { Apps } from '@/components/home/Apps'
import { ContactBand } from '@/components/home/ContactBand'
import { Emphasis } from '@/components/home/Emphasis'
import { Fronts } from '@/components/home/Fronts'
import { Journey } from '@/components/home/Journey'
import { ManuelPeonSports } from '@/components/home/ManuelPeonSports'
import { PillButton } from '@/components/home/PillButton'
import { Eyebrow } from '@/components/home/SectionHeading'
import { SelectedWork } from '@/components/home/SelectedWork'
import { ArrowDownIcon } from '@/components/home/ThinIcons'
import image1 from '@/images/photos/image-1.jpg'
import image2 from '@/images/photos/image-2.jpg'
import image3 from '@/images/photos/image-3.jpg'
import image4 from '@/images/photos/image-4.jpg'
import image5 from '@/images/photos/image-5.jpg'
import { generateRssFeed } from '@/lib/generateRssFeed'
import { getAllArticles } from '@/lib/getAllArticles'
import { profile } from '@/lib/profile'
import { useTranslation } from '@/lib/useTranslation'

const photoRotations = [2, -2, 2, 2, -2]

function Photos() {
  return (
    <div className="mt-20 sm:mt-28">
      <div className="-my-4 flex justify-start gap-5 overflow-hidden py-4 sm:gap-8 md:justify-center">
        {[image1, image2, image3, image4, image5].map((image, imageIndex) => (
          <div
            key={image.src}
            className={clsx(
              'photo-card relative aspect-[9/10] w-44 flex-none translate-y-4 overflow-hidden rounded-[1.5rem] bg-zinc-100 opacity-0 shadow-[0_28px_56px_-32px_rgba(24,24,27,0.45)] ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10 sm:w-72 sm:rounded-[2rem]'
            )}
            style={{
              rotate: `${photoRotations[imageIndex % photoRotations.length]}deg`,
            }}
          >
            <img
              src={image.src}
              alt=""
              sizes="(min-width: 640px) 18rem, 11rem"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  url: profile.url,
  jobTitle: 'Co-founder & CTO',
  worksFor: { '@type': 'Organization', name: 'Medu', url: 'https://medu.ai' },
  alumniOf: [
    { '@type': 'CollegeOrUniversity', name: 'Universidad Complutense de Madrid' },
    { '@type': 'CollegeOrUniversity', name: 'Tecnológico de Monterrey' },
  ],
  knowsAbout: [
    'Full-stack development',
    'Next.js',
    'React Native',
    'AWS',
    'Live video streaming',
    'Large language models',
  ],
  sameAs: [profile.links.linkedin, profile.links.github],
}

export default function Home() {
  const { t } = useTranslation()
  const heroRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set('.hero-text', { opacity: 1, y: 0 })
        gsap.set('.photo-card', { opacity: 1, y: 0 })
        return
      }

      gsap.fromTo(
        '.hero-text',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.14, ease: 'power3.out' }
      )

      gsap.fromTo(
        '.photo-card',
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.55,
        }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <>
      <Head>
        <title>{t('home.title')}</title>
        <meta name="description" content={t('home.description')} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </Head>

      {/* Film grain: one fixed, non-interactive layer, never on scrolling content. */}
      <div aria-hidden="true" className="grain" />

      <Container className="mt-9" ref={heroRef}>
        <div className="relative">
          <div aria-hidden="true" className="hero-wash" />
          <div className="relative max-w-3xl pt-6 sm:pt-10">
            <Eyebrow className="hero-text gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400" />
              {t('home.eyebrow')}
            </Eyebrow>
            <h1 className="hero-text mt-7 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-zinc-900 [text-wrap:balance] dark:text-zinc-50 sm:text-6xl lg:text-[5.25rem]">
              <Emphasis>{t('home.hero')}</Emphasis>
            </h1>
            <p className="hero-text mt-8 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t('home.intro')}
            </p>
            <div className="hero-text mt-10 flex flex-wrap items-center gap-3">
              <PillButton href="/proyectos">{t('home.cta.projects')}</PillButton>
              <PillButton
                href={profile.cv}
                variant="secondary"
                icon={ArrowDownIcon}
              >
                {t('home.cta.cv')}
              </PillButton>
            </div>
          </div>
        </div>

        <Photos />
      </Container>

      <ManuelPeonSports />
      <Apps />
      <Fronts />
      <SelectedWork />
      <Journey />
      <ContactBand />
    </>
  )
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === 'production') {
    await generateRssFeed()
  }

  return {
    props: {
      articles: (await getAllArticles())
        .slice(0, 4)
        .map(({ component, ...meta }) => meta),
    },
  }
}
