import { JSDOM } from 'jsdom'

function extractSectionText(section) {
  const contentDiv = section.querySelector('.section__content')
  if (!contentDiv) return { reference: '', text: '' }

  const paragraphs = contentDiv.querySelectorAll('p')
  let reference = ''
  let text = ''

  paragraphs.forEach((p) => {
    const content = p.textContent?.trim() || ''
    if (!content) return

    // La referencia biblica suele ser corta y estar al inicio (ej: "Gn 37, 3-4. 12-13. 17-28")
    if (!reference && content.length < 80 && /^[A-Z\d]/.test(content)) {
      reference = content
    } else {
      text += content + '\n\n'
    }
  })

  return { reference, text: text.trim() }
}

export default async function handler(req, res) {
  const { fecha } = req.query // formato: YYYY-MM-DD

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Fecha requerida en formato YYYY-MM-DD' })
  }

  const [year, month, day] = fecha.split('-')
  const url = `https://www.vaticannews.va/es/evangelio-de-hoy/${year}/${month}/${day}.html`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Vatican News respondio ${response.status}`)

    const html = await response.text()
    const dom = new JSDOM(html)
    const doc = dom.window.document

    const lecturas = {
      primera_lectura: null,
      salmo: null,
      segunda_lectura: null,
      evangelio: null,
      festividad: '',
    }

    // Extraer festividad del periodo liturgico
    const allText = doc.body?.textContent || ''
    const liturgicalMatch = allText.match(
      /((?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)[\w\sáéíóúñÁÉÍÓÚÑ,]+(?:Cuaresma|Pascua|Adviento|Navidad|Ordinario|Tiempo[\w\s]+))/i
    )
    if (liturgicalMatch) {
      lecturas.festividad = liturgicalMatch[1].trim()
    }

    // Las secciones estan en <section class="section section--evidence">
    // con <h2> dentro de <div class="section__head">
    const sections = doc.querySelectorAll('section.section--evidence')
    let lecturasCount = 0

    sections.forEach((section) => {
      const headEl = section.querySelector('.section__head h2')
      if (!headEl) return

      const headingText = headEl.textContent?.trim() || ''
      let tipo = null

      if (/Lectura del D[ií]a/i.test(headingText)) {
        if (lecturasCount === 0) {
          tipo = 'primera_lectura'
        } else {
          tipo = 'segunda_lectura'
        }
        lecturasCount++
      } else if (/Salmo/i.test(headingText)) {
        tipo = 'salmo'
      } else if (/Evangelio del D[ií]a/i.test(headingText)) {
        tipo = 'evangelio'
      }

      if (tipo) {
        const { reference, text } = extractSectionText(section)
        if (text) {
          lecturas[tipo] = {
            title: headingText,
            reference_displayed: reference,
            text,
          }
        }
      }
    })

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).json(lecturas)
  } catch (error) {
    console.error('Error fetching Vatican News:', error)
    return res.status(500).json({ error: 'No se pudieron obtener las lecturas' })
  }
}
