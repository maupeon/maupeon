import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

import s from '@/components/unio/Unio.module.css'
import { DustMotes } from '@/components/unio/DustMotes'
import { StainedWindow } from '@/components/unio/StainedWindow'

const APP_STORE_URL = 'https://apps.apple.com/app/id6820168371'
const LEGAL = 'https://maupeon-unio.expo.app'
const COVERS = Array.from({ length: 18 }, (_, i) => `/unio/covers/${String(i).padStart(2, '0')}.webp`)

const PHRASES = ['para empezar el día.', 'para rezar el Rosario.', 'para leer la Palabra.', 'para la misa de hoy.', 'para dormir en paz.']

const MANIFESTO = 'Unos minutos al día | cambian | el día entero. | Para empezar con gratitud, | para una noche difícil, | para rezar por los tuyos.'
  .split(' | ')
  .flatMap((chunk, ci) => chunk.split(' ').map((t) => ({ t, em: ci === 1 || ci === 2 })))

const CHAPTERS = [
  {
    id: 'palabra',
    numeral: 'I',
    eyebrow: 'La Palabra',
    title: ['La Biblia,', 'siempre contigo'],
    body: 'Los 73 libros del canon católico, en orden católico y en español, incluidos en la app. Léela en el metro, en la capilla o en un avión: funciona sin conexión.',
    points: ['Resalta versículos con colores y añade tus notas', 'Elige el tamaño de letra y lee de día o de noche', 'Edición de dominio público, hecha para Unio'],
    shot: '/unio/02-biblia.webp',
    alt: 'La Biblia en Unio, abierta en Génesis 1',
  },
  {
    id: 'misal',
    numeral: 'II',
    eyebrow: 'El Misal',
    title: ['Las lecturas', 'de la misa de hoy'],
    body: 'Cada día, la primera lectura, el salmo y el Evangelio, con el texto de nuestra Biblia. Para prepararte antes de misa o rezar con la Palabra aunque no puedas ir.',
    points: ['El día litúrgico y la cita de cada lectura', 'Avanza o vuelve a días cercanos', 'Con el aviso honesto: no es el texto oficial del Leccionario'],
    shot: '/unio/04-misal.webp',
    alt: 'Lecturas de la misa del día en Unio',
  },
  {
    id: 'audio',
    numeral: 'III',
    eyebrow: 'Orar en audio',
    title: ['Reza con calma,', 'a tu ritmo'],
    body: 'El Rosario del día guiado en audio, con los misterios que tocan hoy. El Padrenuestro, el Ave María, el Ángelus y el examen de conciencia, meditados con pausas para orar.',
    points: ['Sigue sonando con la pantalla bloqueada', 'Lee el texto mientras escuchas', 'Retoma donde te quedaste'],
    shot: '/unio/05-reproductor.webp',
    alt: 'Reproductor de Unio con el Padrenuestro meditado',
  },
  {
    id: 'santos',
    numeral: 'IV',
    eyebrow: 'Novenas y santos',
    title: ['Nueve días para', 'confiar tu intención'],
    body: 'Novenas guiadas con san José, la Virgen de Guadalupe y santa Teresita, un día a la vez. Y cada mañana, el santo del día con una breve oración.',
    points: ['Calendario de santos de todo el año', 'Tus intenciones guardadas, solo para ti', 'Las novenas son parte de Unio+'],
    shot: '/unio/06-novenas.webp',
    alt: 'Novenas en Unio: san José, Virgen de Guadalupe y santa Teresita',
  },
]

const HABITS = [
  { title: 'Recordatorio diario', body: 'A la hora que elijas, un aviso suave para tu momento de oración.' },
  { title: 'Frase del día', body: 'Un widget con una frase de los santos en tu pantalla de inicio.' },
  { title: 'Apple Salud', body: 'Si lo activas, cada oración cuenta como minutos de atención plena.' },
  { title: 'De día y de noche', body: 'Tema claro, oscuro o automático, para rezar antes de dormir.' },
]

const FAQ = [
  {
    q: '¿Unio es gratis?',
    a: 'Sí. La Biblia, las lecturas de la misa, el Rosario, las oraciones esenciales y el santo del día son gratis. Unio+ es una suscripción opcional, mensual o anual, con prueba de 7 días en el plan anual.',
  },
  {
    q: '¿Necesito crear una cuenta?',
    a: 'No. Puedes explorar sin cuenta. Una cuenta gratuita te deja guardar favoritos, intenciones y notas, y es necesaria para suscribirte a Unio+.',
  },
  {
    q: '¿Qué Biblia usa?',
    a: 'La «Biblia Libre · edición Unio»: los 73 libros del canon católico, en una edición de dominio público de la «Santa Biblia libre para el mundo». Es una traducción libre, no oficial y sin aprobación eclesiástica.',
  },
  {
    q: '¿Cómo funciona la oración creada con IA?',
    a: 'Con Unio+, escribes tu intención y recibes una oración guiada con voz. Antes de la primera vez te explicamos qué se envía y te pedimos permiso; puedes retirarlo cuando quieras. Las oraciones con IA pueden tener errores y no sustituyen la enseñanza de la Iglesia.',
  },
  {
    q: '¿Cómo es eso del 10 %?',
    a: 'Unio destina el 10 % de lo que Apple nos paga por Unio+ a obras de caridad católicas, cada trimestre, y publica la institución, el monto y el comprobante. Tu suscripción no es un donativo: es nuestro compromiso.',
  },
  {
    q: '¿Está para Android?',
    a: 'Por ahora Unio es solo para iPhone. Android llegará más adelante.',
  },
]

function AppStoreButton({ tone = 'dark', label = 'Descargar en App Store' }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`${s.store} ${tone === 'light' ? s.storeLight : ''}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={s.storeKicker}>Gratis para iPhone</span>
      <span className={s.storeLabel}>
        {label}
        <svg aria-hidden="true" viewBox="0 0 20 20" className={s.storeArrow}>
          <path d="M5 15 15 5M8 5h7v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  )
}

/** Rotating italic line under the title; static (first phrase) with reduced motion. */
function Cycle({ phrases }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let id = 0
    const start = setTimeout(() => {
      id = setInterval(() => setI((n) => (n + 1) % phrases.length), 2600)
    }, 2400)
    return () => {
      clearTimeout(start)
      clearInterval(id)
    }
  }, [phrases.length])
  return (
    <span className={`${s.cycle} ${s.load}`} style={{ '--d': '560ms' }}>
      <span className={s.srOnly}>cada día.</span>
      {phrases.map((p, n) => (
        <em key={p} aria-hidden="true" className={n === i ? s.cycleOn : n === (i - 1 + phrases.length) % phrases.length ? s.cycleOff : ''}>
          {p}
        </em>
      ))}
    </span>
  )
}

function Phone({ src, alt, className = '', priority = false }) {
  return (
    <div className={`${s.phone} ${className}`}>
      <img src={src} alt={alt} width={780} height={1695} loading={priority ? 'eager' : 'lazy'} decoding="async" />
    </div>
  )
}

/**
 * Fades its children in when they scroll into view. Content is visible without
 * JavaScript: the page only hides `.reveal` once it has mounted (see `.js`).
 */
function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return undefined
    }
    // IntersectionObserver only: no scroll listeners (they forced a layout per
    // element on every scroll event and made phones stutter).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`${s.reveal} ${shown ? s.revealIn : ''} ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

function CoverRow({ covers, reverse }) {
  return (
    <div className={`${s.coverRow} ${reverse ? s.coverRowReverse : ''}`} aria-hidden="true">
      {[...covers, ...covers].map((src, i) => (
        <img key={i} src={src} alt="" width={320} height={320} loading="lazy" decoding="async" />
      ))}
    </div>
  )
}

export default function UnioLanding() {
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef(null)
  const manifestoRef = useRef(null)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    // Scroll-linked motion: --p (0→1) on the hero and the manifesto, set once per frame.
    let raf = 0
    const clamp = (v) => Math.min(1, Math.max(0, v))
    const update = () => {
      raf = 0
      // Read everything first, then write: one layout per frame at most.
      const y = window.scrollY
      const vh = window.innerHeight
      const hero = heroRef.current
      const m = manifestoRef.current
      const heroH = hero ? hero.offsetHeight : 1
      const r = m ? m.getBoundingClientRect() : null
      setScrolled(y > 24)
      if (hero && y < heroH * 1.2) hero.style.setProperty('--p', clamp(y / heroH).toFixed(3))
      if (m && r.top < vh && r.bottom > 0) m.style.setProperty('--p', clamp((vh * 0.8 - r.top) / (r.height + vh * 0.2)).toFixed(3))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <>
      <Head>
        <title>Unio: Oración que ayuda · App católica para iPhone</title>
        <meta
          name="description"
          content="Unio te acompaña a rezar cada día: oración guiada en audio, el Rosario, la Biblia completa sin conexión y las lecturas de la misa. Sin anuncios. El 10 % de Unio+ va a obras de caridad."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F5F1E7" />
        <meta name="apple-itunes-app" content="app-id=6820168371" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.maupeon.com/unio" />
        <meta property="og:title" content="Unio: Oración que ayuda" />
        <meta property="og:description" content="Un momento con Dios, cada día. Oración guiada, la Biblia y el misal en una app católica sin anuncios." />
        <meta property="og:image" content="https://www.maupeon.com/unio/og.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://www.maupeon.com/unio" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
        />
        <link rel="preload" as="image" href="/unio/01-inicio.webp" />
      </Head>

      <div className={`${s.page} ${mounted ? s.js : ''}`}>
        <a href="#contenido" className={s.skip}>
          Saltar al contenido
        </a>

        <header className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
          <a href="#inicio" className={s.brand} aria-label="Unio, inicio">
            <img src="/unio/vitral.webp" alt="" width={520} height={702} />
            <span>Unio</span>
          </a>
          <nav className={s.navLinks} aria-label="Secciones">
            <a href="#palabra">Cómo funciona</a>
            <a href="#plus">Unio+</a>
            <a href="#preguntas">Preguntas</a>
          </nav>
          <a href={APP_STORE_URL} className={s.navCta} target="_blank" rel="noopener noreferrer">
            Descargar
          </a>
        </header>

        <main id="contenido">
          {/* ---------- Hero: dawn in a cathedral ---------- */}
          <section id="inicio" ref={heroRef} className={s.hero} aria-labelledby="hero-title">
            <div className={s.beams} aria-hidden="true">
              <span className={s.beam} style={{ '--c': 'rgba(242, 184, 70, 0.55)', '--x': '18%', '--r': '29deg', '--w': '15%', '--t': '0s' }} />
              <span className={s.beam} style={{ '--c': 'rgba(74, 118, 190, 0.42)', '--x': '27%', '--r': '33deg', '--w': '11%', '--t': '-3s' }} />
              <span className={s.beam} style={{ '--c': 'rgba(206, 104, 128, 0.36)', '--x': '35%', '--r': '27deg', '--w': '9%', '--t': '-6s' }} />
              <span className={s.beam} style={{ '--c': 'rgba(108, 160, 96, 0.36)', '--x': '41%', '--r': '35deg', '--w': '12%', '--t': '-2s' }} />
            </div>
            <DustMotes className={s.dust} />

            <div className={s.heroCopy}>
              <p className={`${s.eyebrow} ${s.load}`} style={{ '--d': '200ms' }}>
                Unio · App católica para iPhone
              </p>
              <h1 id="hero-title" className={s.display}>
                <span className={s.load} style={{ '--d': '320ms' }}>
                  Un momento
                </span>{' '}
                <span className={s.load} style={{ '--d': '440ms' }}>
                  con Dios,
                </span>
                <Cycle phrases={PHRASES} />
              </h1>
              <p className={`${s.lede} ${s.load}`} style={{ '--d': '700ms' }}>
                Oración guiada en audio, el Rosario, la Biblia y las lecturas de la misa de hoy. Unos minutos al día, a tu ritmo.
              </p>
              <div className={`${s.heroActions} ${s.load}`} style={{ '--d': '820ms' }}>
                <AppStoreButton />
                <a href="#manifiesto" className={s.textLink}>
                  Ver cómo funciona
                </a>
              </div>
              <ul className={`${s.promises} ${s.load}`} style={{ '--d': '940ms' }}>
                <li>Sin anuncios</li>
                <li>Sin rastreo</li>
                <li>El 10 % de Unio+ a la caridad</li>
              </ul>
            </div>

            <div className={s.stage}>
              <StainedWindow className={s.heroWindow} />
              <Phone
                src="/unio/01-inicio.webp"
                alt="Pantalla de inicio de Unio con la oración del día"
                className={s.heroPhone}
                priority
              />
            </div>

            <a href="#manifiesto" className={s.scrollCue} aria-label="Bajar a la siguiente sección">
              <span>Desliza</span>
              <i aria-hidden="true" />
            </a>
          </section>

          {/* ---------- Manifesto: words light up as you scroll ---------- */}
          <section id="manifiesto" ref={manifestoRef} className={s.manifesto} aria-label="Para qué es Unio">
            <p className={s.manifestoText} style={{ '--n': MANIFESTO.length }}>
              {MANIFESTO.map((w, i) => (
                <span key={i} style={{ '--i': i }} className={w.em ? s.manifestoEm : undefined}>
                  {w.t}{' '}
                </span>
              ))}
            </p>
          </section>

          {/* ---------- Wall of stained glass ---------- */}
          <section className={s.wall} aria-labelledby="wall-title">
            <div className={s.wallCopy}>
              <h2 id="wall-title" className={s.wallTitle}>
                Cada oración, <em>su propio vitral.</em>
              </h2>
              <p>Oraciones guiadas, el Rosario y novenas: cada una con su propio arte.</p>
            </div>
            <div className={s.wallRows}>
              <CoverRow covers={COVERS.slice(0, 9)} />
              <CoverRow covers={COVERS.slice(9)} reverse />
            </div>
          </section>

          {/* ---------- Chapters ---------- */}
          <div className={s.chapters}>
            {CHAPTERS.map((c, i) => (
              <section key={c.id} id={c.id} className={`${s.chapter} ${i % 2 ? s.chapterFlip : ''}`} aria-labelledby={`${c.id}-title`}>
                <Reveal className={s.chapterArt}>
                  <div className={s.archSmall} aria-hidden="true">
                    <img src="/unio/luz-vertical.webp" alt="" width={1024} height={1536} loading="lazy" />
                  </div>
                  <Phone src={c.shot} alt={c.alt} className={s.chapterPhone} />
                </Reveal>
                <Reveal className={s.chapterCopy} delay={120}>
                  <p className={s.numeral} aria-hidden="true">
                    {c.numeral}
                  </p>
                  <p className={s.eyebrow}>{c.eyebrow}</p>
                  <h2 id={`${c.id}-title`} className={s.h2}>
                    {c.title[0]} <em>{c.title[1]}</em>
                  </h2>
                  <p className={s.body}>{c.body}</p>
                  <ul className={s.points}>
                    {c.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </Reveal>
              </section>
            ))}
          </div>

          {/* ---------- Habits ---------- */}
          <section className={s.habits} aria-labelledby="habitos-title">
            <Reveal className={s.habitsHead}>
              <p className={s.eyebrow}>Pequeños hábitos</p>
              <h2 id="habitos-title" className={s.h2}>
                Lo que sostiene <em>la constancia.</em>
              </h2>
            </Reveal>
            <div className={s.habitsBody}>
              <ol className={s.habitList}>
                {HABITS.map((h, i) => (
                  <Reveal as="li" key={h.title} delay={i * 80}>
                    <h3>{h.title}</h3>
                    <p>{h.body}</p>
                  </Reveal>
                ))}
              </ol>
              <Reveal className={s.habitsPhone} delay={160}>
                <Phone src="/unio/07-oscuro.webp" alt="Inicio de Unio en modo oscuro" className={s.phoneDark} />
              </Reveal>
            </div>
          </section>

          {/* ---------- Unio+ ---------- */}
          <section id="plus" className={s.plus} aria-labelledby="plus-title">
            <div className={s.plusInner}>
              <Reveal className={s.plusCopy}>
                <p className={s.eyebrowGold}>Suscripción opcional</p>
                <h2 id="plus-title" className={s.plusTitle}>
                  Unio<span>+</span>
                </h2>
                <p className={s.plusLede}>Una oración solo tuya, cada día.</p>
                <ul className={s.plusList}>
                  <li>
                    <strong>Tu oración personal del día.</strong> Escribe tu intención y recibe una oración guiada con voz, creada con IA para ti, siempre con tu permiso.
                  </li>
                  <li>
                    <strong>Audios y novenas de Unio+.</strong> Más oraciones guiadas y novenas para acompañarte.
                  </li>
                  <li>
                    <strong>Notas y resaltados sin límite</strong> en toda la Biblia.
                  </li>
                </ul>
                <p className={s.plusFine}>Plan mensual o anual. El anual incluye 7 días de prueba gratis.</p>
              </Reveal>
              <Reveal className={s.plusArt} delay={140}>
                <div className={s.plusWindow}>
                  <img
                    src="/unio/oracion-personal.webp"
                    alt="Vitral de unas manos en oración, la ilustración de la oración personal de Unio+"
                    width={900}
                    height={900}
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>

            <Reveal className={s.charity}>
              <img src="/unio/vitral.webp" alt="" width={520} height={702} className={s.charityGlass} />
              <div>
                <p className={s.eyebrowGold}>Oración que ayuda</p>
                <p className={s.charityText}>
                  Destinamos el <strong>10 %</strong> de lo que recibimos por Unio+ a obras de caridad católicas. Cada trimestre publicamos a quién donamos, cuánto y el comprobante.
                </p>
                <a href={`${LEGAL}/ayuda`} className={s.charityLink} target="_blank" rel="noopener noreferrer">
                  Ver cómo rendimos cuentas
                </a>
              </div>
            </Reveal>
          </section>

          {/* ---------- Trust ---------- */}
          <section className={s.trust} aria-labelledby="confianza-title">
            <Reveal>
              <h2 id="confianza-title" className={s.h2Center}>
                Tu oración <em>es tuya.</em>
              </h2>
            </Reveal>
            <div className={s.trustCols}>
              <Reveal delay={0}>
                <h3>Sin anuncios ni rastreo</h3>
                <p>No vendemos tus datos ni te seguimos por otras apps. Tus intenciones y notas son privadas.</p>
              </Reveal>
              <Reveal delay={90}>
                <h3>Explora sin cuenta</h3>
                <p>Lee, escucha y reza desde el primer minuto. Crea una cuenta gratis solo si quieres guardar tu camino.</p>
              </Reveal>
              <Reveal delay={180}>
                <h3>Tú decides sobre la IA</h3>
                <p>Nada se envía para crear tu oración hasta que aceptas, y puedes retirar tu permiso cuando quieras.</p>
              </Reveal>
            </div>
          </section>

          {/* ---------- FAQ ---------- */}
          <section id="preguntas" className={s.faq} aria-labelledby="preguntas-title">
            <Reveal className={s.faqHead}>
              <p className={s.eyebrow}>Preguntas</p>
              <h2 id="preguntas-title" className={s.h2}>
                Lo que suelen <em>preguntarnos.</em>
              </h2>
            </Reveal>
            <div className={s.faqList}>
              {FAQ.map((f) => (
                <details key={f.q} className={s.faqItem}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ---------- Final CTA ---------- */}
          <section className={s.final} aria-labelledby="final-title">
            <Reveal className={s.finalGlass} aria-hidden="true">
              <img src="/unio/vitral.webp" alt="" width={520} height={702} />
            </Reveal>
            <Reveal delay={120}>
              <h2 id="final-title" className={s.finalTitle}>
                Empieza hoy, <em>con unos minutos.</em>
              </h2>
              <p className={s.finalText}>Unio es gratis. Descárgala y reza tu primer Rosario guiado esta misma noche.</p>
              <div className={s.finalCta}>
                <AppStoreButton />
              </div>
            </Reveal>
          </section>
        </main>

        <footer className={s.footer}>
          <div className={s.footerBrand}>
            <img src="/unio/vitral.webp" alt="" width={520} height={702} />
            <div>
              <p className={s.footerName}>Unio: Oración que ayuda</p>
              <p className={s.footerNote}>Hecha en México por Mauricio Peón.</p>
            </div>
          </div>
          <nav className={s.footerLinks} aria-label="Legal y ayuda">
            <a href={`${LEGAL}/privacidad`}>Privacidad</a>
            <a href={`${LEGAL}/terminos`}>Términos</a>
            <a href={`${LEGAL}/soporte`}>Soporte</a>
            <a href={`${LEGAL}/ayuda`}>Unio ayuda</a>
            <a href="mailto:yo@maupeon.com?subject=Unio">yo@maupeon.com</a>
          </nav>
          <p className={s.footerFine}>
            © 2026 Mauricio Peón. iPhone y App Store son marcas de Apple Inc. Las oraciones creadas con IA pueden contener errores; Unio no sustituye los sacramentos ni la dirección espiritual.
          </p>
        </footer>
      </div>
    </>
  )
}
