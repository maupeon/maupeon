import Image from 'next/image'
import Head from 'next/head'

import { Card } from '@/components/Card'
import { SimpleLayout } from '@/components/SimpleLayout'
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

const projects = [
  {
    name: 'Medu',
    description:
      'Somos una plataforma de educación médica en español especializada en contenido audiovisual de Ciencias de la Salud.',
    link: { href: 'http://medu.red', label: 'medu.red' },
    logo: logoMedu2,
  },
  {
    name: 'Medu App',
    description:
      'Aplicación móvil de educación médica en español especializada en contenido audiovisual de Ciencias de la Salud.',
    link: {
      href: 'https://apps.apple.com/mx/app/medu/id1584009164',
      label: 'App Store',
    },
    logo: logoMedu,
  },
  {
    name: 'PPAA',
    description:
      'PPAA es impulsado por una arquitectura de ideas sobre una de formas.',
    link: { href: 'https://www.ppaa.mx', label: 'ppaa.mx' },
    logo: ppaa,
  },
  {
    name: 'A911',
    description:
      'a|911 es una oficina multidisciplinaria que abarca proyectos de arquitectura, urbanismo, movilidad y paisaje.',
    link: { href: 'https://www.arq911.com/', label: 'arq911.com' },
    logo: a911,
  },
  {
    name: 'Domingo',
    description:
      'Tienda en línea de sábanas suaves, 100% de algodón basada en la Ciudad de México.',
    link: { href: 'https://domingo-shop.com/', label: 'domingo-shop.com' },
    logo: domingo,
  },
  {
    name: 'Xolo',
    description:
      'Este proyecto ofrece una experiencia única de alojamiento en Ciudad de México.',
    link: { href: 'https://xolostays.mx/', label: 'xolostays.mx' },
    logo: xolo,
  },
  {
    name: 'Zamme',
    description:
      'Zamme es una plataforma de comunicación visual con el objetivo de construir comunidad a través del intercambio de conocimiento y colaboraciones.',
    link: { href: 'https://zamme.org/', label: 'zamme.org' },
    logo: zamme,
  },
  {
    name: 'Macondo',
    description:
      'Este proyecto es un compendio cuidadosamente curado de más de 200 variedades de plantas y accesorios esenciales de jardinería.',
    link: { href: 'https://macondo-shop.com/', label: 'macondo-shop.com' },
    logo: macondo,
  },
  {
    name: 'CAMSAM',
    description:
      'Esta herramienta innovadora está diseñada para simplificar y agilizar el cálculo de aranceles para arquitectos en la Ciudad de México.',
    link: {
      href: 'https://www.colegiodearquitectoscdmx.org/aranceles/',
      label: 'colegiodearquitectoscdmx.org',
    },
    logo: camsam,
  },
  {
    name: 'Presidentes de México',
    description:
      'Es una página sátira de las hazañas que han logrado los presidentes de México.',
    link: {
      href: 'https://presidentesdemexico.vercel.app/',
      label: 'presidentesdemexico.vercel.app',
    },
    logo: presidentes,
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

export default function Projects() {
  return (
    <>
      <Head>
        <title>Proyectos - Mauricio Peón</title>
        <meta
          name="description"
          content="Algunos proyectos en los que he tenido la oportunidad de colaborar."
        />
      </Head>
      <SimpleLayout
        title="Algunos proyectos en los que he tenido la oportunidad de colaborar."
        intro="En esta sección, te invito a explorar una colección cuidadosamente seleccionada de mis proyectos más significativos. Cada uno de ellos es un reflejo de mi pasión, dedicación y evolución como profesional."
      >
        <ul
          role="list"
          className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((project) => (
            <Card as="li" key={project.name}>
              <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
                <img
                  src={project.logo.src}
                  alt=""
                  className="w-8 h-8 rounded-full"
                  unoptimized
                />
              </div>
              <h2 className="mt-6 text-base font-semibold text-zinc-800 dark:text-zinc-100">
                <Card.Link href={project.link.href}>{project.name}</Card.Link>
              </h2>
              <Card.Description>{project.description}</Card.Description>
              <p className="relative z-10 flex mt-6 text-sm font-medium transition text-zinc-400 group-hover:text-purple-500 dark:text-zinc-200">
                <LinkIcon className="flex-none w-6 h-6" />
                <span className="ml-2">{project.link.label}</span>
              </p>
            </Card>
          ))}
        </ul>
      </SimpleLayout>
    </>
  )
}
