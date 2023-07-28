import { SimpleLayout } from '@/components/SimpleLayout'
import Head from 'next/head'
import React from 'react'

export default function evangelioDeHoy({ date, first_reading, gospel, psalm }) {
  return (
    <>
      <Head>
        <title>Evangelio de hoy</title>
        <meta name="description" content="Evangelio de hoy" />
      </Head>
      <SimpleLayout title="Evangelio de hoy" intro="">
        <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
          <h1>Lectura del día: {date}</h1>

          <h2>{first_reading.title}</h2>
          <p>{first_reading.reference_displayed}</p>
          <p>{first_reading.text.replace(/\[\[.*?\]\]/g, '')}</p>

          <h2>{gospel.title}</h2>
          <p>{gospel.reference_displayed}</p>
          <p>{gospel.text.replace(/\[\[.*?\]\]/g, '')}</p>

          <h2>{psalm.title}</h2>
          <p>{psalm.text.replace(/\[\[.*?\]\]/g, '')}</p>
        </div>
      </SimpleLayout>
    </>
  )
}

export async function getStaticProps(context) {
  // Crear un objeto Date para la fecha y hora de hoy en UTC
  let today = new Date()

  // Convertir a la hora estándar del centro (CST) para la Ciudad de México
  let offset = today.getTimezoneOffset() + 6 * 60
  today.setMinutes(today.getMinutes() - offset)

  // Restar un día
  today.setDate(today.getDate() - 1)

  // Formatear la fecha en el formato 'yyyy-mm-dd'
  const date = today.toISOString().split('T')[0]

  // Construir la URL
  const url = `https://evangelium.manuelsanchez.dev/api/es/days/${date}`

  // Fetch the data
  const response = await fetch(url)
  const data = await response.json()

  return {
    props: data, // se pasarán al componente de la página como props
  }
}
