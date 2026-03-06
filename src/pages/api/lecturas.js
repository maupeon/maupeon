function stripTags(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&eacute;/g, 'é')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&laquo;/g, '\u00AB')
    .replace(/&raquo;/g, '\u00BB')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function classifyHeading(text) {
  if (/primera\s+lectura/i.test(text) || /lectura del d[ií]a/i.test(text)) return 'lectura'
  if (/segunda\s+lectura/i.test(text)) return 'segunda_lectura'
  if (/salmo/i.test(text)) return 'salmo'
  if (/evangelio/i.test(text)) return 'evangelio'
  return null
}

function extractReadingFromSection(sectionHtml) {
  const contentMatch = sectionHtml.match(
    /<div[^>]*class="[^"]*section__content[^"]*"[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|<\/div>\s*$)/
  )
  const content = contentMatch ? contentMatch[1] : sectionHtml

  const paragraphs = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match
  while ((match = pRegex.exec(content)) !== null) {
    const text = stripTags(match[1]).trim()
    if (text) paragraphs.push(text)
  }

  let reference = ''
  let text = ''

  if (paragraphs.length > 0) {
    paragraphs.forEach((p) => {
      if (!reference && p.length < 80 && /^[A-Z\d]/.test(p)) {
        reference = p
      } else {
        text += p + '\n\n'
      }
    })
  }

  return { reference, text: text.trim() }
}

function createEmptyLecturas() {
  return {
    primera_lectura: null,
    salmo: null,
    segunda_lectura: null,
    evangelio: null,
    festividad: '',
  }
}

function hasReadings(lecturas) {
  return lecturas.evangelio || lecturas.primera_lectura
}

async function fetchVaticanNews(year, month, day) {
  const url = `https://www.vaticannews.va/es/evangelio-de-hoy/${year}/${month}/${day}.html`

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  })
  if (!response.ok) throw new Error(`Vatican News respondio ${response.status}`)

  const html = await response.text()

  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  // Extract section--evidence blocks
  const sectionRegex =
    /<section[^>]*class="[^"]*section--evidence[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
  let sMatch
  while ((sMatch = sectionRegex.exec(html)) !== null) {
    const sectionHtml = sMatch[1]

    // Find heading
    const headingMatch = sectionHtml.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)
    if (!headingMatch) continue

    const headingText = stripTags(headingMatch[1]).trim()
    const tipo = classifyHeading(headingText)

    if (tipo === 'lectura') {
      const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
      lecturasCount++
      const { reference, text } = extractReadingFromSection(sectionHtml)
      if (text) {
        lecturas[key] = { title: headingText, reference_displayed: reference, text }
      }
    } else if (tipo) {
      const { reference, text } = extractReadingFromSection(sectionHtml)
      if (text) {
        lecturas[tipo] = { title: headingText, reference_displayed: reference, text }
      }
    }
  }

  if (!hasReadings(lecturas)) throw new Error('No se encontraron lecturas en Vatican News')

  // Extract festividad
  const liturgicalMatch = html.match(
    /((?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)[\w\sáéíóúñÁÉÍÓÚÑ,]+(?:Cuaresma|Pascua|Adviento|Navidad|Ordinario|Tiempo[\w\s]+))/i
  )
  if (liturgicalMatch) lecturas.festividad = stripTags(liturgicalMatch[1]).trim()

  return lecturas
}

async function fetchEWTN(year, month, day) {
  const fecha = `${year}-${month}-${day}`
  const url = `https://www.ewtn.com/es/catolicismo/lecturas/${fecha}`

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`EWTN respondio ${response.status}`)

  const html = await response.text()

  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  // EWTN: title-container followed by readings__group at the same level
  // Find all title positions first, then grab the group block after each
  const titleRegex = /<h[2-5][^>]*class="[^"]*readings__title[^"]*"[^>]*>([\s\S]*?)<\/h[2-5]>/gi
  let tMatch
  const titles = []
  while ((tMatch = titleRegex.exec(html)) !== null) {
    titles.push({ text: stripTags(tMatch[1]).trim(), index: tMatch.index })
  }

  for (const title of titles) {
    const tipo = classifyHeading(title.text)
    if (!tipo) continue

    // Find the readings__group that follows this title
    const afterTitle = html.substring(title.index, title.index + 15000)
    const groupMatch = afterTitle.match(
      /<div[^>]*class="[^"]*readings__group[^"]*"[^>]*data-seq="\d+"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*readings__title-container|$)/i
    )
    if (!groupMatch) continue
    const groupHtml = groupMatch[1]

    // Extract reference
    const refMatch = groupHtml.match(/<h3[^>]*class="[^"]*readings__reference[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)
    const reference = refMatch ? stripTags(refMatch[1]).trim() : ''

    // Extract verse text from readings__text spans
    const verses = []
    const verseRegex = /<span[^>]*class="[^"]*readings__text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    let vMatch
    while ((vMatch = verseRegex.exec(groupHtml)) !== null) {
      const v = stripTags(vMatch[1]).trim()
      if (v) verses.push(v)
    }

    const text = verses.join('\n')

    if (tipo === 'lectura') {
      const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
      lecturasCount++
      if (text) {
        lecturas[key] = { title: title.text, reference_displayed: reference, text }
      }
    } else if (tipo && text) {
      lecturas[tipo] = { title: title.text, reference_displayed: reference, text }
    }
  }

  if (!hasReadings(lecturas)) throw new Error('No se encontraron lecturas en EWTN')

  return lecturas
}

export default async function handler(req, res) {
  const { fecha } = req.query

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Fecha requerida en formato YYYY-MM-DD' })
  }

  const [year, month, day] = fecha.split('-')

  const sources = [
    { name: 'Vatican News', fn: () => fetchVaticanNews(year, month, day) },
    { name: 'EWTN', fn: () => fetchEWTN(year, month, day) },
  ]

  for (const source of sources) {
    try {
      const lecturas = await source.fn()
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
      return res.status(200).json(lecturas)
    } catch (error) {
      console.error(`Error fetching ${source.name}:`, error.message)
    }
  }

  return res.status(500).json({ error: 'No se pudieron obtener las lecturas' })
}
