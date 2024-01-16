import { SimpleLayout } from '@/components/SimpleLayout'
import Head from 'next/head'
import React from 'react'
import amigos from '@/images/photos/peliculas/amigos.jpeg'
import goofy from '@/images/photos/peliculas/goofy.jpg'
import interestelar from '@/images/photos/peliculas/interestelar.jpeg'

const files = [
  {
    title: 'Amigos Intocables',
    size: '3.9 MB',
    source: amigos,
  },
  {
    title: 'Goofy',
    size: '3.9 MB',
    source: goofy,
  },
  {
    title: 'Interestelar',
    size: '3.9 MB',
    source: interestelar,
  },
  // More files...
]
export default function inspiraciones() {
  console.log({ files })
  return (
    <>
      <Head>
        <title>Inspiraciones</title>
        <meta name="description" content="Inspiraciones" />
      </Head>
      <SimpleLayout
        title="Galería de Inspiraciones"
        intro="Bienvenidos a la Galería de Inspiraciones, un espacio único donde comparto las obras y experiencias que han moldeado mi visión y enriquecido mi creatividad. Aquí encontrarás una ecléctica colección de libros, películas, canciones y más, cada uno con su propia historia y significado especial en mi trayectoria personal y profesional. Esta galería es un reflejo de las diversas influencias que han contribuido a mi desarrollo, ofreciendo una ventana a las fuentes de mi inspiración. Disfruta explorando y descubriendo los diversos elementos que alimentan mi creatividad."
      >
        <h1 className="mb-10 text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-3xl">
          Películas
        </h1>
        <ul
          role="list"
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8"
        >
          {files.map((file) => (
            <li key={file.title} className="relative">
              <div className="aspect-h-7 aspect-w-10 group block w-full overflow-hidden rounded-lg bg-gray-100  ">
                <img
                  src={file.source.src}
                  alt=""
                  className="pointer-events-none object-cover group-hover:opacity-75"
                />
                <button
                  type="button"
                  className="absolute inset-0 focus:outline-none"
                >
                  <span className="sr-only">View details for {file.title}</span>
                </button>
              </div>
              <p className="pointer-events-none mt-2 block truncate text-sm font-medium text-gray-200">
                {file.title}
              </p>
              <p className="pointer-events-none block text-sm font-medium text-gray-300">
                {file.size}
              </p>
            </li>
          ))}
        </ul>
      </SimpleLayout>
    </>
  )
}
