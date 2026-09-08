// Original interactive scenes. Documents and encounters are dramatized; dates
// and the historical outcome are explained separately in the notebook.
const talk = (id, title, position, speaker, text, replies) => ({ id, type: 'talk', title, position, speaker, text, replies, instruction: `Acércate y conversa: ${title.toLowerCase()}.` })
const photo = (id, title, position, subject, height = 1.25, radius = .55) => ({ id, type: 'photo', title, position, subject, height, radius, instruction: `Abre la cámara con C. Encuadra ${subject.toLowerCase()}, ajusta el enfoque y toma la fotografía.`, verb: 'Abrir cámara' })
const inspect = (id, title, position, document) => ({ id, type: 'inspect', title, position, document, instruction: `Examina ${title.toLowerCase()}. Encuentra las anotaciones y contrasta lo que dicen.`, verb: 'Examinar' })
const collect = (id, title, position, text) => ({ id, type: 'collect', title, position, text, instruction: `Busca ${title.toLowerCase()} y guarda una copia en tu expediente.`, verb: 'Recoger copia' })
const connect = (id, title, position, pairs) => ({ id, type: 'connect', title, position, pairs, instruction: 'Relaciona cada afirmación con la prueba que permite sostenerla.', verb: 'Construir el informe' })

export const missionDesign = {
  'congo-witness': {
    title: 'Un rostro, una voz', position: [-8,-10], target: 'El testigo de la ribera',
    steps: [
      talk('congo-consent', 'La historia antes de la imagen', [-8,-10], 'Un habitante de la ribera', 'No somos las cifras de sus libros. Cuando el caucho no alcanza, se llevan a alguien de la aldea. Puedes hacer mi retrato, pero acompáñalo de lo que te he contado; no escribas mi nombre.', [
        ['Escuchar el relato completo', 'Habla de las ausencias, de las cuotas y del miedo. Anotas los hechos sin identificarlo. El retrato ya cuenta con su permiso.'],
        ['Preguntar qué quiere que llegue al exterior', 'Quiere que se conozca el sistema de castigos. Te permite fotografiarlo y pide que conserves el contexto de su testimonio.'],
      ]),
      photo('congo-portrait', 'Una imagen con contexto', [-8,-10], 'El testigo de la ribera'),
    ],
  },
  'congo-ledger': {
    title: 'La cuota imposible', position: [-15,-22], target: 'El depósito de caucho',
    steps: [
      inspect('congo-document', 'El libro del depósito', [-15,-22], {
        heading: 'Puesto del río · Libro de entregas', subtitle: 'Documento recreado para la investigación',
        rows: [['Concepto','Registro del puesto'],['Entrega','Cuota obligatoria por aldea'],['Ausencias','Se mantiene la cuota completa'],['Incumplimiento','Custodia de familiares'],['Pago','Sin recibos firmados']],
        marks: [{row:2,label:'La obligación no disminuye',note:'Aunque falten trabajadores, el puesto exige la misma entrega.'},{row:3,label:'La amenaza aparece por escrito',note:'La retención de familiares contradice un acuerdo voluntario.'}],
        question: 'El administrador llama a esto «comercio libre». ¿Qué anotación contradice directamente esa afirmación?',
        answers: ['El registro de entregas por aldea','La custodia de familiares por incumplimiento','La ausencia de un precio del transporte'],correct:1,
        explanation: 'La amenaza contra las familias convierte la entrega en coacción. Ya puedes vincular el documento al testimonio, sin confundir una cifra con una prueba suficiente.',
      }),
      photo('congo-depot', 'El lugar de las cifras', [-15,-22], 'El depósito y sus cargamentos', 1.1, 1.5),
    ],
  },
  'congo-report': {
    title: 'Que las pruebas crucen el río', position: [1,-34], target: 'El embarque del informe',
    steps: [connect('congo-case', 'Informe del Congo', [1,-34], [
      {claim:'Las entregas se obtienen por coacción',evidence:'El libro permite retener familiares',context:'El documento explica el mecanismo de presión.'},
      {claim:'La denuncia necesita una voz y un contexto',evidence:'Retrato autorizado y testimonio de la ribera',context:'La imagen acompaña las palabras del testigo; no las sustituye.'},
      {claim:'La investigación debe poder contrastarse',evidence:'Registro del puesto y fotografía del depósito',context:'Lugar, documento y testimonio forman una cadena verificable.'},
    ])],
  },
  'amazon-witness': {
    title: 'El camino del caucho', position: [-12,-9], target: 'Los árboles del sendero',
    steps: [
      photo('amazon-rubber', 'Las marcas en la corteza', [-12,-9], 'El árbol sangrado y el recipiente de caucho', 1.0, .8),
      talk('amazon-voice', 'Lo que una fotografía no cuenta', [-16,-25], 'Testimonio recogido con un intérprete', 'El árbol puede fotografiarse. La deuda no se ve. Nos cobran herramientas, comida y el viaje, y al terminar la temporada seguimos debiendo más que antes. Mi familia no puede salir de la estación.', [
        ['Preguntar quién decide que la deuda está saldada', 'El mismo puesto que fija los precios decide cuánto vale el caucho. No existe una salida que el trabajador pueda controlar.'],
        ['Preguntar por la posibilidad de abandonar el trabajo', 'Los permisos de salida se niegan. Anotas esta restricción para contrastarla con los contratos de la compañía.'],
      ]),
    ],
  },
  'amazon-ledger': {
    title: 'Los nombres bajo la deuda', position: [-16,-25], target: 'El archivo de la estación',
    steps: [
      inspect('amazon-account', 'La cuenta que nunca termina', [-16,-25], {
        heading: 'Estación cauchera · Cuenta de un trabajador',subtitle:'Cifras ficticias para reconstruir el mecanismo de deuda',
        rows:[['Movimiento','Saldo'],['Deuda inicial','40'],['Caucho entregado','−30'],['Comida y herramientas','+24'],['Saldo al cierre','34'],['Salida de la estación','Denegada mientras exista deuda']],
        marks:[{row:2,label:'El trabajo sí produce una entrega',note:'Se acreditan 30, pero el puesto decide unilateralmente el valor del caucho.'},{row:3,label:'La compañía vuelve a cargar 24',note:'Tras entregar caucho, la deuda apenas disminuye: 40 − 30 + 24 = 34.'},{row:5,label:'La deuda impide marcharse',note:'El saldo se usa para restringir la libertad del trabajador.'}],
        question:'¿Qué combinación permite denunciar servidumbre por deudas, más allá de una cuenta desfavorable?',
        answers:['Una deuda de 34 y la prohibición de salir','Un precio bajo del caucho por sí solo','Que se utilicen herramientas importadas'],correct:0,
        explanation:'La deuda se convierte en control de la persona cuando no puede abandonar el trabajo. Las declaraciones de trabajadores de Barbados aportan otra fuente para contrastar lo que ocurre.',
      }),
      connect('amazon-crosscheck','Cruzar las versiones',[-16,-25],[
        {claim:'El contrato promete libertad de trabajo',evidence:'El permiso de salida está denegado',context:'La práctica contradice la promesa del documento.'},
        {claim:'Una contabilidad limpia no basta',evidence:'Testimonio recogido con un intérprete',context:'La voz del trabajador permite entender el efecto real de las cifras.'},
      ]),
    ],
  },
  'amazon-report': {
    title: 'La copia que debe sobrevivir', position: [-9,-27], target: 'Los archivos de la estación',
    steps: [
      collect('amazon-copy-account','La copia de la contabilidad',[-9,-27],'Copias los cargos y las restricciones de salida. El original permanece en el archivo; la investigación conserva una reproducción.'),
      collect('amazon-copy-witness','Las declaraciones de Barbados',[-17,-32],'Las declaraciones de trabajadores de Barbados permiten contrastar responsabilidades y prácticas del puesto. Las guardas separadas de los nombres de los testigos locales.'),
      connect('amazon-dispatch','El expediente del Putumayo',[3,-40],[
        {claim:'La extracción se sostiene mediante control de las personas',evidence:'La cuenta y la prohibición de abandonar la estación',context:'El informe debe describir el sistema, además de los hechos particulares.'},
        {claim:'El relato necesita fuentes que se corroboren',evidence:'Declaraciones y copia de la contabilidad',context:'La copia permite que la investigación continúe fuera de la selva.'},
      ]),
    ],
  },
  'ireland-landing': {
    title: 'Antes del amanecer', position: [0,-10], target: 'El equipaje de Banna Strand',
    steps: [
      collect('ireland-satchel','La cartera del desembarco',[0,-10],'El equipaje ha llegado mojado a la arena. Recuperas las notas sobre la ayuda alemana y el camino hacia el interior. La noche del regreso ha agotado a Roger.'),
      inspect('ireland-route','Las notas del regreso',[0,-10],{
        heading:'Banna Strand · 21 de abril de 1916',subtitle:'Reconstrucción jugable de las notas del viaje',
        rows:[['Apunte','Situación'],['Ayuda alemana','Insuficiente para sostener el levantamiento'],['Objetivo del regreso','Hacer llegar una advertencia'],['Costa','Desembarco difícil; no hay recibimiento organizado'],['Camino','Buscar contacto hacia el interior']],
        marks:[{row:1,label:'La ayuda no alcanza',note:'Casement vuelve convencido de que la insurrección carece del apoyo necesario.'},{row:2,label:'El regreso tiene una urgencia',note:'Su propósito es advertir del peligro, aunque siga deseando una Irlanda independiente.'}],
        question:'¿Qué mensaje corresponde al propósito de este regreso?',answers:['La ayuda está asegurada: avanzar','La ayuda no basta: intentar detener el levantamiento','La independencia ya se ha conseguido'],correct:1,
        explanation:'El objetivo inmediato es evitar una catástrofe. No se trata de convertir a Casement en un combatiente victorioso ni de cambiar el desenlace histórico.',
      }),
    ],
  },
  'ireland-warning': {
    title: 'El mensaje que no llegó', position: [-6,-18], target: 'El camino entre las dunas',
    steps: [
      {id:'ireland-crossing',type:'reach',title:'Cruzar las dunas',position:[-6,-18],instruction:'Abandona la playa y encuentra el paso que sube entre las dunas. Arrastra la vista para reconocer el camino.',verb:'Seguir el camino',text:'Desde la altura distingues la costa y el camino del interior. El viento borra las huellas del desembarco.'},
      talk('ireland-contact','Una advertencia interrumpida',[-12,-28],'Encuentro dramatizado en el camino','Intentas hacer llegar la advertencia: el apoyo es insuficiente. El cansancio y la incertidumbre pesan en cada palabra. Tu regreso terminará con la detención; haber alcanzado este encuentro no cambia la historia.',[
        ['Transmitir la advertencia con claridad','La ayuda que esperábamos no basta. El mensaje debe intentar evitar una pérdida de vidas.'],
        ['Reconocer lo que no puedes garantizar','No sabes si el mensaje llegará a tiempo. Dejas claras las limitaciones de la ayuda y la urgencia de la advertencia.'],
      ]),
    ],
  },
  'ireland-last-page': {
    title:'Lo que queda', position:[-1.5,-2],target:'El cuaderno de Pentonville',
    steps:[connect('last-memory','Las páginas de una conciencia',[-1.5,-2],[
      {claim:'El Congo deshace la promesa de la misión civilizadora',evidence:'Un testimonio frente al libro de cuotas',context:'La admiración juvenil por el imperio cede ante lo que has documentado.'},
      {claim:'El Putumayo revela que el abuso no es una excepción',evidence:'La deuda y las voces de la estación cauchera',context:'El mismo sistema aparece bajo otra bandera comercial.'},
      {claim:'La convicción política no elimina los errores ni las dudas',evidence:'El regreso a Irlanda para advertir del peligro',context:'En la celda quedan el deseo de libertad, las contradicciones y una sentencia que no puedes cambiar.'},
    ])],
  },
}

export const allSteps = Object.values(missionDesign).flatMap(m => m.steps)
export function getStep(progress, chapters) {
  return chapters[progress.chapter]?.missions[progress.mission]?.steps[progress.step || 0] || null
}
