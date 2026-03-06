import Head from 'next/head'

export default function GuardiaPrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Política de Privacidad - Guardia</title>
        <meta
          name="description"
          content="Política de Privacidad de Guardia, tu compañero de seguridad."
        />
      </Head>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          <strong>Guardia</strong> — Última actualización: 6 de marzo de 2026
        </p>

        <div className="mt-10 space-y-10 text-base text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Introducción
            </h2>
            <p className="mt-3">
              Guardia (&quot;nosotros&quot; o &quot;nuestro&quot;) opera la
              aplicación móvil Guardia (la &quot;App&quot;). Esta Política de
              Privacidad explica cómo recopilamos, usamos, compartimos y
              protegemos tu información personal cuando utilizas nuestra App.
            </p>
            <p className="mt-3">
              Al usar Guardia, aceptas la recopilación y el uso de información
              de acuerdo con esta política.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Información que Recopilamos
            </h2>

            <h3 className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-200">
              Información que Proporcionas Directamente
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Información de cuenta</strong>: Tu nombre y dirección de
                correo electrónico al crear una cuenta.
              </li>
              <li>
                <strong>Información de contacto de emergencia</strong>: El
                nombre, correo electrónico y/o número de teléfono de la(s)
                persona(s) que designes para recibir notificaciones de check-in.
              </li>
              <li>
                <strong>Datos de check-in</strong>: Registros de tus check-ins
                diarios, incluyendo marcas de tiempo.
              </li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-200">
              Información Recopilada Automáticamente
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Datos de uso</strong>: Información general sobre cómo
                interactúas con la App (por ejemplo, funciones utilizadas,
                frecuencia de check-ins).
              </li>
              <li>
                <strong>Información del dispositivo</strong>: Tipo de
                dispositivo, versión del sistema operativo e identificadores
                únicos del dispositivo, según sea necesario para el
                funcionamiento de la App.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Cómo Usamos tu Información
            </h2>
            <p className="mt-3">Usamos la información recopilada para:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                Operar y mantener la funcionalidad principal de la App,
                incluyendo el procesamiento de tus check-ins diarios.
              </li>
              <li>
                Enviar notificaciones a tu(s) contacto(s) de emergencia
                designado(s) por correo electrónico y/o WhatsApp cuando se
                completa o se omite un check-in.
              </li>
              <li>
                Comunicarnos contigo sobre tu cuenta, actualizaciones o
                solicitudes de soporte.
              </li>
              <li>
                Mejorar y optimizar el rendimiento y la experiencia de usuario de
                la App.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Servicios de Terceros
            </h2>
            <p className="mt-3">
              Guardia utiliza los siguientes proveedores de servicios de terceros
              para operar. Cada proveedor procesa datos únicamente según sea
              necesario para prestar su servicio específico:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Supabase</strong> — Autenticación y almacenamiento de
                datos.{' '}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <strong>Resend</strong> — Envío de correos electrónicos para
                notificaciones de check-in.{' '}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <strong>Kapso</strong> — Envío de mensajes de WhatsApp para
                notificaciones de check-in.{' '}
                <a
                  href="https://kapso.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  Política de Privacidad
                </a>
              </li>
            </ul>
            <p className="mt-3">
              No vendemos tu información personal a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Retención de Datos
            </h2>
            <p className="mt-3">
              Conservamos tu información personal mientras tu cuenta esté activa
              o sea necesario para proporcionarte nuestros servicios. Si eliminas
              tu cuenta, borraremos o anonimizaremos tus datos personales en un
              plazo de 30 días, excepto cuando la ley nos obligue a conservarlos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Seguridad de los Datos
            </h2>
            <p className="mt-3">
              Implementamos medidas técnicas y organizativas apropiadas para
              proteger tu información personal contra el acceso no autorizado, la
              alteración, divulgación o destrucción. Sin embargo, ningún método
              de transmisión por Internet o almacenamiento electrónico es 100%
              seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Tus Derechos
            </h2>
            <p className="mt-3">
              Dependiendo de tu jurisdicción, puedes tener derecho a:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Acceder a los datos personales que tenemos sobre ti.</li>
              <li>Solicitar la corrección de datos inexactos.</li>
              <li>Solicitar la eliminación de tus datos.</li>
              <li>Retirar tu consentimiento en cualquier momento.</li>
              <li>
                Solicitar una copia de tus datos en un formato portátil.
              </li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, contáctanos al correo
              electrónico indicado a continuación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Privacidad de Menores
            </h2>
            <p className="mt-3">
              Guardia no está dirigida a menores de 13 años. No recopilamos
              intencionalmente información personal de menores de 13 años. Si nos
              enteramos de que hemos recopilado datos de un menor de 13 años,
              tomaremos medidas para eliminar esa información de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Cambios a Esta Política de Privacidad
            </h2>
            <p className="mt-3">
              Podemos actualizar esta Política de Privacidad de vez en cuando. Te
              notificaremos de cualquier cambio publicando la nueva Política de
              Privacidad dentro de la App y actualizando la fecha de
              &quot;Última actualización&quot; arriba. Se recomienda revisar esta
              Política de Privacidad periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              Contáctanos
            </h2>
            <p className="mt-3">
              Si tienes alguna pregunta sobre esta Política de Privacidad,
              contáctanos en:
            </p>
            <p className="mt-3">
              <strong>Correo electrónico</strong>:{' '}
              <a
                href="mailto:yo@maupeon.com"
                className="text-teal-500 hover:underline"
              >
                yo@maupeon.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
