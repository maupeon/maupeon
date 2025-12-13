import Head from 'next/head'

import StravaStats from '@/components/StravaStats'
import { SimpleLayout } from '@/components/SimpleLayout'

export default function Ejercicio() {
  return (
    <>
      <Head>
        <title>Ejercicio - Mauricio Peón</title>
        <meta name="description" content="Actividades recientes de Strava." />
      </Head>
      <SimpleLayout title="Ejercicio" intro="">
        <StravaStats />
      </SimpleLayout>
    </>
  )
}
