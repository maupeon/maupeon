import { SimpleLayout } from '@/components/SimpleLayout'
import Head from 'next/head'
import React, { useState, useEffect } from 'react'

export default function EvangelioDeHoy() {
  // State variables to store the data
  const [date, setDate] = useState(null)
  const [firstReading, setFirstReading] = useState(null)
  const [gospel, setGospel] = useState(null)
  const [psalm, setPsalm] = useState(null)

  useEffect(() => {
    async function fetchData() {
      // Crear un objeto Date para la fecha y hora de hoy en UTC
      let today = new Date()

      // Convertir a la hora estándar del centro (CST) para la Ciudad de México
      let offset = today.getTimezoneOffset() + 6 * 60
      today.setMinutes(today.getMinutes() - offset)

      // Formatear la fecha en el formato 'yyyy-mm-dd'
      const formattedDate = today.toISOString().split('T')[0]

      // Construir la URL
      const url = `https://evangelium.manuelsanchez.dev/api/es/days/${formattedDate}`

      // Fetch the data
      const response = await fetch(url)
      const data = await response.json()

      // Update state with fetched data
      setDate(formattedDate)
      setFirstReading(data.first_reading)
      setGospel(data.gospel)
      setPsalm(data.psalm)
    }

    fetchData()
  }, [])

  // Conditional rendering in case data is not yet fetched
  if (!date || !firstReading || !gospel || !psalm) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>Evangelio de hoy</title>
        <meta name="description" content="Evangelio de hoy" />
      </Head>
      <SimpleLayout title="Evangelio de hoy" intro="">
        <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
          <h1>Lectura del día: {date}</h1>

          <h2>{firstReading.title}</h2>
          <p>{firstReading.reference_displayed}</p>
          <p>{firstReading.text.replace(/\[\[.*?\]\]/g, '')}</p>

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
