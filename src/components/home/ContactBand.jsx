import { Container } from '@/components/Container'
import { Bezel } from '@/components/home/Bezel'
import { Emphasis } from '@/components/home/Emphasis'
import { PillButton } from '@/components/home/PillButton'
import { Reveal } from '@/components/home/Reveal'
import { MailIcon } from '@/components/home/ThinIcons'
import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'
import { profile } from '@/lib/profile'
import { useTranslation } from '@/lib/useTranslation'

const socials = [
  { label: 'X', href: 'https://twitter.com/agapaudi', icon: TwitterIcon },
  { label: 'GitHub', href: profile.links.github, icon: GitHubIcon },
  { label: 'LinkedIn', href: profile.links.linkedin, icon: LinkedInIcon },
]

export function ContactBand() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="contact-title" className="mt-32 sm:mt-40">
      <Container>
        <Reveal>
          <Bezel innerClassName="bg-zinc-900 px-7 py-14 text-zinc-50 shadow-none sm:px-14 sm:py-20 dark:bg-zinc-800/80">
            <p className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 ring-1 ring-white/10">
              {t('home.contact.eyebrow')}
            </p>
            <h2
              id="contact-title"
              className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight [text-wrap:balance] sm:text-6xl"
            >
              <Emphasis className="font-normal italic text-zinc-400">
                {t('home.contact.title')}
              </Emphasis>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300">
              {t('home.contact.description')}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
              <PillButton
                href={`mailto:${profile.email}`}
                variant="light"
                icon={MailIcon}
              >
                {t('home.contact.cta')}
              </PillButton>
              <a
                href={`mailto:${profile.email}`}
                className="text-lg font-medium text-zinc-100 underline decoration-white/25 underline-offset-8 transition-colors duration-700 hover:decoration-white"
              >
                {profile.email}
              </a>
            </div>
            <ul
              role="list"
              className="mt-14 flex items-center gap-6 border-t border-white/10 pt-8"
            >
              {socials.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group -m-1 block p-1"
                  >
                    <Icon className="h-5 w-5 fill-zinc-500 transition-colors duration-700 group-hover:fill-zinc-100" />
                  </a>
                </li>
              ))}
            </ul>
          </Bezel>
        </Reveal>
      </Container>
    </section>
  )
}
