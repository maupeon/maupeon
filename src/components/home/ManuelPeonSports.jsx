import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { PillButton } from '@/components/home/PillButton'
import { Reveal } from '@/components/home/Reveal'
import { ArrowUpRightIcon } from '@/components/home/ThinIcons'
import { appStoreApps, appStoreUrl } from '@/lib/apps'
import { useTranslation } from '@/lib/useTranslation'
import odfIso from '@/images/mps/iso_odf_dark.svg'
import pdyPortrait from '@/images/mps/pasados-de-yarda.jpg'
import mpsWordmark from '@/images/mps/word_mps_dark.svg'

const SITE = 'https://manuelpeonsports.com'

// Uses the Manuel Peón Sports palette (ink, paper, yellow) rather than the
// portfolio's purple, so the project reads as its own brand.
const pieces = [
  { key: 'pdy', href: `${SITE}/pasados-de-yarda`, image: pdyPortrait },
  { key: 'odf', href: `${SITE}/obsesionados-del-futbol`, image: odfIso },
  { key: 'newsletter', href: `${SITE}/newsletter` },
  {
    key: 'app',
    href: appStoreUrl(appStoreApps.find((app) => app.key === 'pasadosDeYarda')),
    image: { src: appStoreApps.find((app) => app.key === 'pasadosDeYarda').icon },
  },
]

function Piece({ piece }) {
  const { t } = useTranslation()

  return (
    <a
      href={piece.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/piece flex items-start gap-4 rounded-2xl bg-[#f6f3ea]/[0.04] p-4 ring-1 ring-[#f6f3ea]/10 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#f6f3ea]/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd700]"
    >
      {piece.image ? (
        <img
          src={piece.image.src}
          alt=""
          className="h-11 w-11 flex-none rounded-xl bg-[#f6f3ea]/5 object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#ffd700] font-serif text-lg font-semibold text-[#16140f]">
          @
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd700]/80">
          {t(`home.mps.pieces.${piece.key}.label`)}
        </span>
        <span className="mt-1 block font-serif text-lg font-semibold text-[#f6f3ea]">
          {t(`home.mps.pieces.${piece.key}.title`)}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-[#f6f3ea]/60">
          {t(`home.mps.pieces.${piece.key}.description`)}
        </span>
      </span>
      <ArrowUpRightIcon className="mt-1 h-4 w-4 flex-none text-[#f6f3ea]/40 transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/piece:-translate-y-px group-hover/piece:translate-x-0.5 group-hover/piece:text-[#ffd700]" />
    </a>
  )
}

export function ManuelPeonSports() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="mps-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <Bezel innerClassName="bg-[#16140f] px-6 py-10 text-[#f6f3ea] shadow-none sm:px-12 sm:py-14 dark:bg-[#16140f]">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-7">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#ffd700]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd700] ring-1 ring-[#ffd700]/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700]" />
                  {t('home.mps.eyebrow')}
                </p>
                <h2 id="mps-title" className="mt-7">
                  <span className="sr-only">Manuel Peón Sports</span>
                  <img
                    src={mpsWordmark.src}
                    alt=""
                    className="h-16 w-auto sm:h-20"
                  />
                </h2>
                <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#f6f3ea]/80">
                  {t('home.mps.lead')}
                </p>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#f6f3ea]/55">
                  {t('home.mps.role')}
                </p>
                <div className="mt-9">
                  <PillButton href={SITE} variant="light">
                    {t('home.mps.cta')}
                  </PillButton>
                </div>
              </div>

              <figure className="lg:col-span-5">
                <img
                  src={pdyPortrait.src}
                  alt={t('home.mps.portraitAlt')}
                  className="aspect-square w-full max-w-sm rounded-[1.5rem] object-cover ring-1 ring-[#f6f3ea]/10 lg:ml-auto"
                />
                <figcaption className="mt-3 text-xs text-[#f6f3ea]/50 lg:text-right">
                  {t('home.mps.portraitCaption')}
                </figcaption>
              </figure>
            </div>

            <ul
              role="list"
              className="mt-12 grid grid-cols-1 gap-3 border-t border-[#f6f3ea]/10 pt-10 sm:grid-cols-2"
            >
              {pieces.map((piece) => (
                <li key={piece.key}>
                  <Piece piece={piece} />
                </li>
              ))}
            </ul>
          </Bezel>
        </Reveal>
      </Container>
    </section>
  )
}
