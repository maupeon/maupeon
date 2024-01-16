import { SimpleLayout } from '@/components/SimpleLayout'
import Head from 'next/head'
import React from 'react'
import InspirationsLayout from '@/components/InspirationsLayout'
import { books, movies, series, songs } from '@/lib/inspirations'

export default function inspiraciones() {
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
        <InspirationsLayout files={books} title={'Libros'} />
        <InspirationsLayout files={movies} title={'Películas'} />
        <InspirationsLayout files={songs} title={'Canciones'} />
        <InspirationsLayout files={series} title={'Series'} />
      </SimpleLayout>
    </>
  )
}
