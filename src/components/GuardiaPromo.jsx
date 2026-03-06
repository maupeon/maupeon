import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import guardiaScreenshot from '@/images/apps/guardia.png'
import { useTranslation } from '@/lib/useTranslation'

// ─── SVG Icon Components ───

function ShieldCheckIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  )
}

function ShieldSolidIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function BellIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  )
}

function HomeIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function HeartIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  )
}

function CheckCircleIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function HandTapIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
      />
    </svg>
  )
}

function FireIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z"
      />
    </svg>
  )
}

function SparklesIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

function AppleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function PlayStoreIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 12l2.302-2.492zM5.864 3.658L16.8 9.99l-2.302 2.302L5.864 3.658z" />
    </svg>
  )
}

function ArrowDownIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
      />
    </svg>
  )
}

// ─── Animated components ───

function useInView(options = {}) {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [ref, isInView]
}

function FadeIn({ children, delay = 0, className = '', direction = 'up' }) {
  const [ref, isInView] = useInView()
  const transforms = {
    up: 'translateY(32px)',
    down: 'translateY(-32px)',
    left: 'translateX(32px)',
    right: 'translateX(-32px)',
    none: 'none',
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'none' : transforms[direction],
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Grain overlay ───

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }}
    />
  )
}

// ─── Navbar ───

function Navbar({ t }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(245,245,240,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(27,115,64,0.08)'
          : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/app/guardia" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B7340] transition-transform duration-300 group-hover:scale-105">
            <ShieldSolidIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#1A1A1A]">
            Guardia
          </span>
        </Link>

        <a
          href="#"
          className="rounded-full bg-[#1B7340] px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#145A32] hover:shadow-lg hover:shadow-[#1B7340]/20"
        >
          {t('guardia.downloadFree')}
        </a>
      </div>
    </nav>
  )
}

// ─── Store Buttons ───

function StoreButtons({ variant = 'dark', t }) {
  const isDark = variant === 'dark'
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href="#"
        className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-sm font-semibold transition-all duration-300 ${
          isDark
            ? 'bg-[#1A1A1A] text-white hover:-translate-y-0.5 hover:bg-[#333] hover:shadow-xl hover:shadow-black/10'
            : 'bg-white text-[#1B7340] hover:-translate-y-0.5 hover:bg-[#F5F5F0] hover:shadow-xl hover:shadow-white/20'
        }`}
      >
        <AppleIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        {t('guardia.appStoreButton')}
      </a>
      <a
        href="#"
        className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-sm font-semibold transition-all duration-300 ${
          isDark
            ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] ring-1 ring-[#1A1A1A]/10 hover:-translate-y-0.5 hover:bg-[#1A1A1A]/10'
            : 'text-white ring-1 ring-white/30 hover:-translate-y-0.5 hover:bg-white/10 hover:ring-white/50'
        }`}
      >
        <PlayStoreIcon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        {t('guardia.playStoreButton')}
      </a>
    </div>
  )
}

// ─── Section 1: Hero ───

function HeroSection({ t }) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#F5F5F0]">
      {/* Organic background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/4 -right-1/4 h-[800px] w-[800px] rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, rgba(27,115,64,0.12) 0%, rgba(27,115,64,0) 70%)',
          }}
        />
        <div
          className="absolute -bottom-1/3 -left-1/4 h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(27,115,64,0.15) 0%, rgba(27,115,64,0) 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 pt-24 pb-16 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left */}
          <div>
            <FadeIn delay={0.1}>
              <span className="border-[#1B7340]/15 inline-flex items-center gap-2 rounded-full border bg-[#1B7340]/5 px-4 py-2 text-xs font-medium uppercase tracking-widest text-[#1B7340]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1B7340] opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1B7340]" />
                </span>
                {t('guardia.availableBadge')}
              </span>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="mt-8 text-5xl font-bold leading-[1.08] tracking-tight text-[#1A1A1A] sm:text-6xl lg:text-7xl">
                {t('guardia.heroTitle1')}{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">{t('guardia.heroTitle2')}</span>
                  <span
                    className="absolute left-0 right-0 -bottom-1 z-0 h-3 rounded-full opacity-25 sm:h-4"
                    style={{ backgroundColor: '#1B7340' }}
                  />
                </span>
                <br />
                {t('guardia.heroTitle3')}
              </h1>
            </FadeIn>

            <FadeIn delay={0.35}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#4A4A4A] sm:text-xl">
                {t('guardia.heroDescription')}
              </p>
            </FadeIn>

            <FadeIn delay={0.5}>
              <div className="mt-10">
                <StoreButtons variant="dark" t={t} />
              </div>
            </FadeIn>

            <FadeIn delay={0.65}>
              <div className="mt-10 flex items-center gap-6 text-sm text-[#4A4A4A]">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 text-[#1B7340]" />
                  {t('guardia.noSubscriptions')}
                </div>
                <div className="h-4 w-px bg-[#1A1A1A]/10" />
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-[#1B7340]" />
                  {t('guardia.setupTime')}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Right — App mockup */}
          <FadeIn
            delay={0.4}
            direction="left"
            className="flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Glow behind phone */}
              <div
                className="absolute inset-0 -m-8 rounded-[3rem] opacity-40 blur-3xl"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(27,115,64,0.2) 0%, transparent 70%)',
                }}
              />
              <div className="relative aspect-[9/16] w-64 overflow-hidden rounded-[2.5rem] border border-[#1A1A1A]/5 bg-white shadow-2xl shadow-black/10 sm:w-72">
                <Image
                  src={guardiaScreenshot}
                  alt="Guardia app screenshot"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Scroll indicator */}
        <FadeIn delay={1} className="mt-auto flex justify-center pt-12">
          <div className="guardia-bounce flex flex-col items-center gap-2 text-[#4A4A4A]/40">
            <ArrowDownIcon className="h-5 w-5" />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Section 2: El problema ───

function ProblemSection({ t }) {
  const problems = [
    {
      icon: HomeIcon,
      title: t('guardia.problem1Title'),
      text: t('guardia.problem1Text'),
      number: '01',
    },
    {
      icon: BellIcon,
      title: t('guardia.problem2Title'),
      text: t('guardia.problem2Text'),
      number: '02',
    },
    {
      icon: HeartIcon,
      title: t('guardia.problem3Title'),
      text: t('guardia.problem3Text'),
      number: '03',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-[#1B7340] py-24 sm:py-32">
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <FadeIn>
          <p className="text-sm font-medium uppercase tracking-widest text-white/50">
            {t('guardia.problemLabel')}
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {t('guardia.problemHeading')}
          </h2>
        </FadeIn>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {problems.map((item, i) => (
            <FadeIn key={i} delay={0.15 + i * 0.12}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] p-7 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:bg-white/[0.12] sm:p-8">
                <span className="text-xs font-semibold tracking-wider text-white/20">
                  {item.number}
                </span>
                <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <item.icon className="h-5 w-5 text-white/80" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {item.text}
                </p>
                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                  }}
                />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 3: Cómo funciona ───

function HowItWorksSection({ t }) {
  const steps = [
    {
      icon: HandTapIcon,
      title: t('guardia.step1Title'),
      description: t('guardia.step1Description'),
    },
    {
      icon: ShieldCheckIcon,
      title: t('guardia.step2Title'),
      description: t('guardia.step2Description'),
    },
    {
      icon: BellIcon,
      title: t('guardia.step3Title'),
      description: t('guardia.step3Description'),
    },
  ]

  return (
    <section className="relative bg-[#F5F5F0] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <FadeIn>
          <p className="text-sm font-medium uppercase tracking-widest text-[#1B7340]">
            {t('guardia.howItWorksLabel')}
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="mt-4 max-w-lg text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl lg:text-5xl">
            {t('guardia.howItWorksHeading')}
          </h2>
        </FadeIn>

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div className="via-[#1B7340]/15 absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent to-transparent md:block" />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <FadeIn key={i} delay={0.15 + i * 0.15}>
                <div className="relative text-center md:text-left">
                  {/* Step number & icon */}
                  <div className="relative z-10 mx-auto inline-flex md:mx-0">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                      style={{
                        background:
                          'linear-gradient(135deg, #1B7340 0%, #2a9d5c 100%)',
                        boxShadow: '0 4px 20px rgba(27,115,64,0.25)',
                      }}
                    >
                      <span className="text-lg font-bold">{i + 1}</span>
                    </div>
                  </div>
                  <step.icon className="mx-auto mt-5 h-5 w-5 text-[#1B7340]/50 md:mx-0" />
                  <h3 className="mt-4 text-lg font-semibold text-[#1A1A1A]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 4: Features ───

function FeaturesSection({ t }) {
  const features = [
    {
      icon: CheckCircleIcon,
      title: t('guardia.feature1Title'),
      description: t('guardia.feature1Description'),
      accent: '#1B7340',
    },
    {
      icon: FireIcon,
      title: t('guardia.feature2Title'),
      description: t('guardia.feature2Description'),
      accent: '#c67b1c',
    },
    {
      icon: BellIcon,
      title: t('guardia.feature3Title'),
      description: t('guardia.feature3Description'),
      accent: '#2563eb',
    },
    {
      icon: SparklesIcon,
      title: t('guardia.feature4Title'),
      description: t('guardia.feature4Description'),
      accent: '#9333ea',
    },
  ]

  return (
    <section className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left — text + grid */}
          <div>
            <FadeIn>
              <p className="text-sm font-medium uppercase tracking-widest text-[#1B7340]">
                {t('guardia.featuresLabel')}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl">
                {t('guardia.featuresHeading1')}
                <br />
                {t('guardia.featuresHeading2')}
              </h2>
            </FadeIn>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {features.map((feature, i) => (
                <FadeIn key={i} delay={0.15 + i * 0.1}>
                  <div className="group relative rounded-2xl border border-[#1A1A1A]/[0.04] bg-[#F5F5F0]/50 p-6 transition-all duration-300 hover:border-[#1A1A1A]/[0.08] hover:bg-[#F5F5F0] hover:shadow-lg hover:shadow-black/[0.03]">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${feature.accent}10` }}
                    >
                      <feature.icon
                        className="h-5 w-5"
                        style={{ color: feature.accent }}
                      />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-[#1A1A1A]">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4A4A4A]">
                      {feature.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          {/* Right — placeholder image */}
          <FadeIn delay={0.3} direction="left" className="flex items-center">
            <div className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#F5F5F0] to-[#e8e8e0]">
              <div className="flex aspect-[4/5] items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B7340]/10">
                    <HeartIcon className="h-8 w-8 text-[#1B7340]/40" />
                  </div>
                  <p className="text-sm text-[#4A4A4A]/50">
                    {t('guardia.imagePlaceholder1')}
                    <br />
                    {t('guardia.imagePlaceholder2')}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── Section 5: Cierre emocional ───

function EmotionalCloseSection({ t }) {
  return (
    <section className="relative overflow-hidden bg-[#F5F5F0] py-28 sm:py-36">
      {/* Decorative organic shapes */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(27,115,64,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <FadeIn>
          <div className="text-center">
            <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#1B7340]/10">
              <HeartIcon className="h-6 w-6 text-[#1B7340]" />
            </div>
            <blockquote>
              <p className="text-2xl font-semibold leading-snug tracking-tight text-[#1A1A1A] sm:text-3xl lg:text-[2.5rem] lg:leading-[1.2]">
                &ldquo;{t('guardia.emotionalQuote1')}
                <br className="hidden sm:block" /> {t('guardia.emotionalQuote2')}{' '}
                <span className="text-[#1B7340]">{t('guardia.emotionalQuote3')}</span>
                &rdquo;
              </p>
            </blockquote>
            <div className="mx-auto mt-10 h-1 w-12 rounded-full bg-[#1B7340]/20" />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Section 6: CTA final ───

function FinalCTASection({ t }) {
  return (
    <section className="relative overflow-hidden bg-[#1B7340] py-24 sm:py-32">
      {/* Gradient mesh */}
      <div className="absolute inset-0">
        <div
          className="absolute -top-1/2 -right-1/4 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(42,157,92,0.3) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-1/2 -left-1/4 h-[500px] w-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(20,90,50,0.4) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {t('guardia.ctaHeading')}
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-5 text-lg text-white/70">
              {t('guardia.ctaDescription')}
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-10 flex justify-center">
              <StoreButtons variant="light" t={t} />
            </div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="mt-12 text-sm text-white/40">
              {t('guardia.ctaFooter')}
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───

function GuardiaFooter({ t }) {
  return (
    <footer className="bg-[#F5F5F0] py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B7340]">
              <ShieldSolidIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#1A1A1A]">
              Guardia
            </span>
          </div>
          <p className="text-xs text-[#4A4A4A]/50">
            &copy; {new Date().getFullYear()} Guardia. {t('guardia.footerTagline')}
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── CSS Keyframes ───

function GuardiaStyles() {
  return (
    <style jsx global>{`
      @keyframes guardia-bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(6px);
        }
      }
      .guardia-bounce {
        animation: guardia-bounce 2s ease-in-out infinite;
      }
    `}</style>
  )
}

// ─── Main Export ───

export default function GuardiaPromo() {
  const { t } = useTranslation()
  return (
    <div
      style={{ fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}
    >
      <GuardiaStyles />
      <GrainOverlay />
      <Navbar t={t} />
      <main>
        <HeroSection t={t} />
        <ProblemSection t={t} />
        <HowItWorksSection t={t} />
        <FeaturesSection t={t} />
        <EmotionalCloseSection t={t} />
        <FinalCTASection t={t} />
      </main>
      <GuardiaFooter t={t} />
    </div>
  )
}
