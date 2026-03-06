import Head from 'next/head'

import GuardiaPromo from '@/components/GuardiaPromo'

export default function GuardiaPage() {
  return (
    <>
      <Head>
        <title>Guardia - Tu compañero de seguridad</title>
        <meta
          name="description"
          content="Guardia es tu check-in diario de seguridad. Si un día no puedes pulsar el botón, tu contacto de emergencia recibirá un aviso automático por email y WhatsApp."
        />
      </Head>
      <GuardiaPromo />
    </>
  )
}
