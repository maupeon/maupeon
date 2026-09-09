import { missionDesign, allSteps } from './expeditions'

export const SAVE_KEY = 'celta.journey.v2'
export const SETTINGS_KEY = 'celta.settings.v1'

const originalChapters = [
  {
    id: 'congo',
    numeral: 'I',
    name: 'El Congo',
    year: '1903',
    place: 'A orillas del río Congo',
    subtitle: 'El despertar de una conciencia',
    description:
      'Llegaste creyendo en la promesa del progreso. El río te llevará hasta las voces que esa promesa ha silenciado.',
    memory:
      'Pentonville, 1916. En la celda, el rumor del agua vuelve a ti. Antes de la condena, antes de Irlanda, hubo un río y una pregunta: ¿qué significa civilizar?',
    fact: 'Casement investigó los abusos del Estado Libre del Congo en 1903. Su informe se publicó en 1904 y contribuyó a la denuncia internacional del régimen de Leopoldo II.',
    missions: [
      {
        id: 'congo-witness',
        title: 'Las voces del río',
        verb: 'Escuchar',
        target: 'El testigo del embarcadero',
        type: 'person',
        position: [-5, -9],
        instruction:
          'Sigue el sendero hasta el embarcadero y escucha al testigo.',
        speaker: 'Un habitante de la ribera',
        text: 'Cada vez exigen más caucho. Cuando alguien no alcanza la cuota, castigan al pueblo. Los hombres que cuentan las cargas nunca cuentan a quienes no regresan.',
        question: '¿Cómo recogerás este testimonio?',
        choices: [
          {
            label: 'Escuchar y proteger su identidad',
            note: 'He registrado el testimonio sin exponer el nombre del testigo. Una denuncia no debe poner en peligro a quien se atreve a hablar.',
          },
          {
            label: 'Anotar hechos y buscar otras pruebas',
            note: 'He anotado lugares, cuotas y castigos. Contrastaré lo que he oído con registros y testimonios independientes.',
          },
        ],
        evidence: 'Testimonio de la ribera',
      },
      {
        id: 'congo-ledger',
        title: 'Detrás de las cifras',
        verb: 'Examinar',
        target: 'El registro del puesto',
        type: 'ledger',
        position: [-11, -20],
        instruction: 'Localiza el libro de cuotas en el puesto comercial.',
        speaker: 'Cuaderno de campo',
        text: 'El registro enumera cargamentos de caucho y cuotas impuestas. Junto a las cifras, tus notas describen poblaciones agotadas por el trabajo forzado. Las cuentas de la compañía ocultan el coste humano.',
        question: '¿Qué pondrás en relación?',
        choices: [
          {
            label: 'Las cuotas con los testimonios',
            note: 'Las cifras respaldan el patrón descrito por los testigos: la extracción depende de la coacción. He conservado ambos tipos de prueba.',
          },
          {
            label: 'Los beneficios con el trabajo forzado',
            note: 'El beneficio comercial no demuestra progreso. Debo explicar el sistema de violencia que hace posibles estas cifras.',
          },
        ],
        evidence: 'Registro de las cuotas',
      },
      {
        id: 'congo-report',
        title: 'Romper el silencio',
        verb: 'Enviar informe',
        target: 'El correo del río',
        type: 'dispatch',
        position: [1, -30],
        instruction: 'Lleva tus conclusiones al correo del río.',
        speaker: 'Roger Casement · reflexión',
        text: 'Habías llegado al servicio de un imperio. Ahora ese mismo cargo te permite denunciar lo que has visto. El informe debe cruzar el mar, aunque sus conclusiones incomoden a quienes te enviaron.',
        question: '¿Cómo cerrarás el informe?',
        choices: [
          {
            label: 'Exigir una investigación independiente',
            note: 'He enviado un informe que exige investigar responsabilidades. Los testimonios del Congo no deben quedar encerrados en mi cuaderno.',
          },
          {
            label: 'Exponer el sistema de explotación',
            note: 'He descrito la violencia como parte del sistema de extracción. No basta atribuirla a un único funcionario cruel.',
          },
        ],
        evidence: 'Informe del Congo · 1904',
      },
    ],
  },
  {
    id: 'amazonia',
    numeral: 'II',
    name: 'La Amazonía',
    year: '1910',
    place: 'Putumayo · La Chorrera',
    subtitle: 'El eco de la misma herida',
    description:
      'Otro continente. El mismo caucho. En el Putumayo, tu investigación descubre cuánto puede repetirse la crueldad.',
    memory:
      'Pentonville, 1916. Cierras los ojos y la humedad de la selva regresa. Habías creído que el Congo era una excepción. En el Putumayo aprendiste que una frontera no detiene la codicia.',
    fact: 'Casement investigó el Putumayo en 1910 y volvió a la región en 1911. La publicación de su informe en 1912 expuso abusos vinculados a la Peruvian Amazon Company.',
    missions: [
      {
        id: 'amazon-witness',
        title: 'La voz del Putumayo',
        verb: 'Escuchar',
        target: 'El encuentro junto a la maloca',
        type: 'person',
        position: [-6, -10],
        instruction:
          'Encuentra al intérprete y escucha el testimonio junto a la maloca.',
        speaker: 'Testimonio recogido con un intérprete',
        text: 'Nos obligan a entregar caucho. La deuda nunca disminuye. Han separado a nuestras familias y nos castigan si tratamos de marcharnos. Queremos que alguien fuera de aquí lo sepa.',
        question: '¿Por dónde empezarás?',
        choices: [
          {
            label: 'Dejar que el testigo cuente su historia',
            note: 'He escuchado sin imponer mi relato. El testimonio describe una deuda interminable, violencia y familias separadas.',
          },
          {
            label: 'Preguntar cómo funciona la deuda',
            note: 'La deuda impuesta no ofrece una salida real. He documentado cómo se utiliza para mantener el trabajo forzado.',
          },
        ],
        evidence: 'Testimonio del Putumayo',
      },
      {
        id: 'amazon-ledger',
        title: 'Una deuda sin salida',
        verb: 'Contrastar',
        target: 'El archivo de la estación',
        type: 'ledger',
        position: [-13, -23],
        instruction: 'Busca los registros de la estación cauchera.',
        speaker: 'Archivo de la estación',
        text: 'Los registros presentan el trabajo como una relación comercial. Los testimonios de indígenas y trabajadores de Barbados revelan coacción. La compañía cotiza en Londres: la distancia no borra la responsabilidad.',
        question: '¿Qué prueba debe acompañar a los registros?',
        choices: [
          {
            label: 'Los relatos de quienes fueron sometidos',
            note: 'He contrastado la contabilidad con las voces de quienes sufren sus efectos. Ningún contrato justifica la coacción.',
          },
          {
            label: 'Las declaraciones de los trabajadores de Barbados',
            note: 'He añadido declaraciones de trabajadores de Barbados, súbditos británicos cuya situación formaba parte del encargo consular.',
          },
        ],
        evidence: 'Registros de la estación cauchera',
      },
      {
        id: 'amazon-report',
        title: 'Que el mundo lo sepa',
        verb: 'Preparar informe',
        target: 'El embarcadero de salida',
        type: 'dispatch',
        position: [2, -34],
        instruction: 'Regresa al río y prepara el envío de tu investigación.',
        speaker: 'Roger Casement · reflexión',
        text: 'La investigación tiene nombres, lugares y testimonios. Publicarla no garantiza que la violencia termine. Pero callar dejaría a las víctimas frente a la compañía, sin siquiera una voz fuera de la selva.',
        question: '¿Qué compromiso dejarás escrito?',
        choices: [
          {
            label: 'Pedir responsabilidades a la compañía',
            note: 'He reclamado responsabilidades por los abusos documentados. Un domicilio en Londres no puede servir de refugio a la explotación.',
          },
          {
            label: 'Exigir protección y seguimiento',
            note: 'He pedido medidas de protección y una verificación posterior. Una investigación no termina al salir de la selva.',
          },
        ],
        evidence: 'Informe del Putumayo · 1912',
      },
    ],
  },
  {
    id: 'ireland',
    numeral: 'III',
    name: 'Irlanda',
    year: '1916',
    place: 'Banna Strand · Condado de Kerry',
    subtitle: 'El precio de una convicción',
    description:
      'El viaje termina en tu propia tierra. Vuelves para advertir de un levantamiento sin el apoyo que esperabas.',
    memory:
      'Pentonville, 1916. El mar de Irlanda ocupa el lugar de los ríos. Buscaste ayuda en Alemania para la causa irlandesa. Ahora sabes que el apoyo es insuficiente y quieres evitar una catástrofe.',
    fact: 'Casement desembarcó en Banna Strand el 21 de abril de 1916 y fue detenido. Condenado por alta traición, fue ejecutado en Pentonville el 3 de agosto de 1916.',
    missions: [
      {
        id: 'ireland-landing',
        title: 'Regreso a la costa',
        verb: 'Recuperar',
        target: 'Las notas del desembarco',
        type: 'ledger',
        position: [-4, -9],
        instruction: 'Recupera tus notas cerca de la barca en la playa.',
        speaker: 'Notas del viaje',
        text: 'Has vuelto de Alemania convencido de que la ayuda prometida no basta. Tras un desembarco difícil, necesitas hacer llegar una advertencia a quienes preparan el levantamiento.',
        question: '¿Qué debe decir el mensaje?',
        choices: [
          {
            label: 'El apoyo es insuficiente; hay que advertirlo',
            note: 'He preparado una advertencia: la ayuda disponible no permite sostener el levantamiento como se había imaginado.',
          },
          {
            label: 'Evitar una pérdida de vidas inútil',
            note: 'La independencia sigue siendo mi esperanza. Precisamente por ello quiero impedir que se sacrifique a quienes la defienden sin medios suficientes.',
          },
        ],
        evidence: 'Notas de Banna Strand',
      },
      {
        id: 'ireland-warning',
        title: 'Una advertencia a tiempo',
        verb: 'Entregar mensaje',
        target: 'El encuentro del camino',
        type: 'person',
        position: [-11, -23],
        instruction:
          'Lleva la advertencia al encuentro junto a la casa del camino.',
        speaker: 'Encuentro dramatizado',
        text: 'Tratas de hacer llegar el mensaje. Estás enfermo y exhausto. La detención interrumpe tu regreso: ya no decidirás desde un camino de Kerry, sino desde una celda en Londres.',
        question: '¿Qué convicción conservarás?',
        choices: [
          {
            label: 'La libertad necesita también cuidar de la vida',
            note: 'Mi advertencia buscaba evitar una catástrofe. Defender una causa no elimina el deber de proteger a quienes pueden morir por ella.',
          },
          {
            label: 'Reconocer la incertidumbre de mis decisiones',
            note: 'He actuado por convicción, pero también entre errores y dudas. Ninguna causa convierte a un ser humano en una figura sin contradicciones.',
          },
        ],
        evidence: 'La advertencia interrumpida',
      },
      {
        id: 'ireland-last-page',
        title: 'La última página',
        verb: 'Escribir',
        target: 'El cuaderno de la celda',
        type: 'ledger',
        position: [-1.5, -2],
        instruction:
          'Acércate a la mesa de tu celda y escribe la última página.',
        speaker: 'Pentonville · 3 de agosto de 1916',
        text: 'La petición de clemencia no ha prosperado. La circulación de tus diarios privados ha contribuido a desacreditarte. En estas últimas horas vuelven los rostros del Congo, del Putumayo y de Irlanda. Ya no puedes cambiar la sentencia.',
        question: '¿Qué quieres conservar en esta última página?',
        choices: [
          {
            label: 'Las voces que no debían ser olvidadas',
            note: 'Que mi nombre no borre a las personas que escuché. Sus vidas importan más que la historia de quien escribió el informe.',
          },
          {
            label: 'Una conciencia, incluso entre contradicciones',
            note: 'No he sido un hombre sin contradicciones. He intentado responder a lo que vi. Dejo estas páginas para que otros puedan seguir preguntando.',
          },
        ],
        evidence: 'Última página · Pentonville',
      },
    ],
  },
]

export const chapters = originalChapters.map(chapter => ({
  ...chapter,
  missions: chapter.missions.map(mission => ({ ...mission, ...missionDesign[mission.id] })),
}))

export const sources = [
  { title: 'Fragmento editorial de la novela · Penguin Libros', url: 'https://www.penguinlibros.com/es/literatura-contemporanea/34822-libro-el-sueno-del-celta-9788490626092/fragmento' },
  {
    title: 'El sueño del celta · Mario Vargas Llosa · Alfaguara',
    url: 'https://books.google.com/books/about/El_sue%C3%B1o_del_celta.html?id=-SuzAAAAQBAJ',
  },
  {
    title: 'Estructura de la novela · estudio en SciELO',
    url: 'https://www.scielo.cl/scielo.php?pid=S0718-22012011000100019&script=sci_arttext',
  },
  {
    title: 'Roger Casement (1864–1916) · Gobierno de Irlanda',
    url: 'https://www.gov.ie/en/department-of-foreign-affairs/publications/roger-casement-1864-1916/',
  },
  {
    title: 'Informe del Putumayo · The National Archives',
    url: 'https://discovery.nationalarchives.gov.uk/details/r/C10185637',
  },
  {
    title: 'Roger Casement · National Library of Ireland',
    url: 'https://www.nli.ie/1916/exhibition/en/content/rogercasement/index.pdf',
  },
]

export const initialProgress = {
  version: 2,
  chapter: 0,
  mission: 0,
  step: 0,
  reflectionChoice: 0,
  entries: [],
  photos: [],
  completed: false,
}

export function normalizeProgress(value) {
  const clean = () => ({ ...initialProgress, entries: [], photos: [] })
  if (!value || value.version !== 2 || !Number.isInteger(value.chapter) ||
      value.chapter < 0 || value.chapter > 2 || !Number.isInteger(value.mission) ||
      value.mission < 0 || value.mission > 3 || !Array.isArray(value.entries)) return clean()
  const all = chapters.flatMap(chapter => chapter.missions)
  const expected = value.chapter * 3 + value.mission
  if (value.entries.length !== expected) return clean()
  const entries = []
  for (let i = 0; i < expected; i++) {
    const item = value.entries[i], mission = all[i]
    if (item?.id !== mission.id) return clean()
    const index = [0,1].includes(item.choice) ? item.choice : 0
    entries.push({ id: mission.id, title: mission.evidence, note: mission.choices[index].note, choice: index })
  }
  const current = chapters[value.chapter].missions[value.mission]
  const step = value.step || 0
  if (!Number.isInteger(step) || step < 0 || (current ? step >= current.steps.length : step !== 0)) return clean()
  const photoIds = new Set(allSteps.filter(item => item.type === 'photo').map(item => item.id))
  const photos = []
  for (const photo of Array.isArray(value.photos) ? value.photos.slice(0,12) : []) {
    if ((!photoIds.has(photo?.id) && !/^free-\d{10,16}$/.test(photo?.id || '')) || photos.some(item => item.id === photo.id) ||
        typeof photo.image !== 'string' || photo.image.length > 220000 ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo.image)) continue
    const source = allSteps.find(item => item.id === photo.id)
    photos.push({ id:photo.id, title:source?.title || 'Apunte del viaje', subject:source?.subject || 'Fotografía libre', image:photo.image })
  }
  return { version:2, chapter:value.chapter, mission:value.mission, step, reflectionChoice:value.reflectionChoice===1?1:0, entries, photos, completed:entries.length===9 }
}

// Completion is tied to a verified activity result; opening and closing a panel
// cannot write a notebook entry or skip a photography objective.
export function recordStep(progress, result = {}) {
  const mission = chapters[progress.chapter]?.missions[progress.mission]
  const step = mission?.steps[progress.step || 0]
  if (!step || result.id !== step.id || result.complete !== true) return progress
  const photos = [...(progress.photos || [])]
  if (step.type === 'photo') {
    const image = result.photo?.image
    if (typeof image !== 'string' || image.length > 220000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return progress
    const photo = { id:step.id, title:step.title, subject:step.subject, image }
    const previous = photos.findIndex(item => item.id === step.id)
    if (previous >= 0) photos[previous] = photo
    else photos.push(photo)
  }
  const choice = result.choice===1 ? 1 : result.choice===0 ? 0 : progress.reflectionChoice || 0
  if (progress.step + 1 < mission.steps.length) return { ...progress, step:progress.step+1, reflectionChoice:choice, photos }
  const entries = [...progress.entries, { id:mission.id, title:mission.evidence, note:mission.choices[choice].note, choice }]
  return { ...progress, mission:progress.mission+1, step:0, reflectionChoice:0, entries, photos, completed:entries.length===9 }
}
