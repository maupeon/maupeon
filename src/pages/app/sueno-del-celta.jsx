import Head from 'next/head'
import dynamic from 'next/dynamic'

const CeltaGame = dynamic(() => import('@/components/celta/CeltaGame'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#101b15',
        display: 'grid',
        placeItems: 'center',
        color: '#e6dcc5',
        fontFamily: 'Georgia, serif',
      }}
    >
      El sueño del celta · Preparando el viaje…
    </div>
  ),
})

export default function CeltaPage() {
  return (
    <>
      <Head>
        <title>El sueño del celta — Una aventura de Roger Casement</title>
        <meta
          name="description"
          content="Una aventura narrativa 3D por el Congo, la Amazonía e Irlanda. Explora, escucha y escribe el cuaderno de Roger Casement."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#14231b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </Head>
      <CeltaGame />
    </>
  )
}
