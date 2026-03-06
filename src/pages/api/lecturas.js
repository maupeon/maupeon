import { JSDOM } from 'jsdom'

function extractTextFromElement(el) {
  if (!el) return { reference: '', text: '' }

  const paragraphs = el.querySelectorAll('p')
  let reference = ''
  let text = ''

  if (paragraphs.length > 0) {
    paragraphs.forEach((p) => {
      const content = p.textContent?.trim() || ''
      if (!content) return

      if (!reference && content.length < 80 && /^[A-Z\d]/.test(content)) {
        reference = content
      } else {
        text += content + '\n\n'
      }
    })
  } else {
    // Fallback: use direct text content if no <p> tags
    text = el.textContent?.trim() || ''
  }

  return { reference, text: text.trim() }
}

function classifyHeading(headingText) {
  if (/primera\s+lectura/i.test(headingText) || /lectura del d[ií]a/i.test(headingText)) {
    return 'lectura'
  }
  if (/segunda\s+lectura/i.test(headingText)) {
    return 'segunda_lectura'
  }
  if (/salmo/i.test(headingText)) {
    return 'salmo'
  }
  if (/evangelio/i.test(headingText)) {
    return 'evangelio'
  }
  return null
}

// Strategy 1: Original selectors (section.section--evidence)
function parseStrategyOriginal(doc) {
  const sections = doc.querySelectorAll('section.section--evidence')
  if (!sections.length) return null

  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  sections.forEach((section) => {
    const headEl =
      section.querySelector('.section__head h2') ||
      section.querySelector('h2') ||
      section.querySelector('h3')
    if (!headEl) return

    const headingText = headEl.textContent?.trim() || ''
    const tipo = classifyHeading(headingText)

    if (tipo === 'lectura') {
      const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
      lecturasCount++
      const contentEl = section.querySelector('.section__content') || section
      const { reference, text } = extractTextFromElement(contentEl)
      if (text) {
        lecturas[key] = { title: headingText, reference_displayed: reference, text }
      }
    } else if (tipo) {
      const contentEl = section.querySelector('.section__content') || section
      const { reference, text } = extractTextFromElement(contentEl)
      if (text) {
        lecturas[tipo] = { title: headingText, reference_displayed: reference, text }
      }
    }
  })

  return hasReadings(lecturas) ? lecturas : null
}

// Strategy 2: Look for headings anywhere in the document and grab sibling/parent content
function parseStrategyHeadings(doc) {
  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  const headings = doc.querySelectorAll('h1, h2, h3, h4')
  headings.forEach((heading) => {
    const headingText = heading.textContent?.trim() || ''
    const tipo = classifyHeading(headingText)

    if (tipo === 'lectura') {
      const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
      lecturasCount++
      const contentEl = findContentNear(heading)
      if (contentEl) {
        const { reference, text } = extractTextFromElement(contentEl)
        if (text) {
          lecturas[key] = { title: headingText, reference_displayed: reference, text }
        }
      }
    } else if (tipo) {
      const contentEl = findContentNear(heading)
      if (contentEl) {
        const { reference, text } = extractTextFromElement(contentEl)
        if (text) {
          lecturas[tipo] = { title: headingText, reference_displayed: reference, text }
        }
      }
    }
  })

  return hasReadings(lecturas) ? lecturas : null
}

// Strategy 3: Broad section/article/div search
function parseStrategyBroad(doc) {
  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  // Try various container selectors
  const selectors = [
    'section[class*="section"]',
    'article',
    'div[class*="content"] section',
    'div[class*="reading"]',
    'div[class*="lectura"]',
    'main section',
    '.content section',
    'section',
  ]

  for (const selector of selectors) {
    const elements = doc.querySelectorAll(selector)
    elements.forEach((el) => {
      const heading =
        el.querySelector('h2') || el.querySelector('h3') || el.querySelector('h4')
      if (!heading) return

      const headingText = heading.textContent?.trim() || ''
      const tipo = classifyHeading(headingText)

      if (tipo === 'lectura') {
        const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
        lecturasCount++
        const { reference, text } = extractTextFromElement(el)
        if (text) {
          lecturas[key] = { title: headingText, reference_displayed: reference, text }
        }
      } else if (tipo) {
        const { reference, text } = extractTextFromElement(el)
        if (text) {
          lecturas[tipo] = { title: headingText, reference_displayed: reference, text }
        }
      }
    })

    if (hasReadings(lecturas)) return lecturas
  }

  return hasReadings(lecturas) ? lecturas : null
}

function findContentNear(heading) {
  // Try parent section/article/div
  let parent = heading.parentElement
  for (let i = 0; i < 5 && parent; i++) {
    const tag = parent.tagName?.toLowerCase()
    if (tag === 'section' || tag === 'article') return parent
    if (parent.classList?.length > 0) {
      const cls = Array.from(parent.classList).join(' ')
      if (/content|reading|lectura|section/i.test(cls)) return parent
    }
    parent = parent.parentElement
  }

  // Try next sibling elements
  let sibling = heading.nextElementSibling
  if (sibling) return sibling

  return heading.parentElement
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

function extractFestividad(doc) {
  const allText = doc.body?.textContent || ''
  const liturgicalMatch = allText.match(
    /((?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)[\w\sáéíóúñÁÉÍÓÚÑ,]+(?:Cuaresma|Pascua|Adviento|Navidad|Ordinario|Tiempo[\w\s]+))/i
  )
  return liturgicalMatch ? liturgicalMatch[1].trim() : ''
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
  const dom = new JSDOM(html)
  const doc = dom.window.document

  // Try parsing strategies in order
  let lecturas =
    parseStrategyOriginal(doc) ||
    parseStrategyHeadings(doc) ||
    parseStrategyBroad(doc)

  if (!lecturas) throw new Error('No se encontraron lecturas en Vatican News')

  lecturas.festividad = extractFestividad(doc)
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
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const lecturas = createEmptyLecturas()
  let lecturasCount = 0

  // EWTN uses various structures - try headings approach
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5')
  headings.forEach((heading) => {
    const headingText = heading.textContent?.trim() || ''
    const tipo = classifyHeading(headingText)

    if (tipo === 'lectura') {
      const key = lecturasCount === 0 ? 'primera_lectura' : 'segunda_lectura'
      lecturasCount++
      const contentEl = findContentNear(heading)
      if (contentEl) {
        const { reference, text } = extractTextFromElement(contentEl)
        if (text) {
          lecturas[key] = { title: headingText, reference_displayed: reference, text }
        }
      }
    } else if (tipo) {
      const contentEl = findContentNear(heading)
      if (contentEl) {
        const { reference, text } = extractTextFromElement(contentEl)
        if (text) {
          lecturas[tipo] = { title: headingText, reference_displayed: reference, text }
        }
      }
    }
  })

  if (!hasReadings(lecturas)) throw new Error('No se encontraron lecturas en EWTN')

  return lecturas
}

export default async function handler(req, res) {
  const { fecha } = req.query // formato: YYYY-MM-DD

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Fecha requerida en formato YYYY-MM-DD' })
  }

  const [year, month, day] = fecha.split('-')

  // Try Vatican News first, then EWTN as fallback
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
