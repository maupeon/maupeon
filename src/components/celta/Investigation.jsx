/* eslint-disable @next/next/no-img-element -- JPEG data URLs are created locally by the in-game camera. */
import { useState } from 'react'
import styles from './CeltaGame.module.css'

export default function Investigation({step,photos,onComplete,onClose}) {
  const [reply,setReply] = useState(null)
  const [marks,setMarks] = useState([])
  const [note,setNote] = useState('Busca las anotaciones en el documento.')
  const [answer,setAnswer] = useState(null)
  const [selected,setSelected] = useState(0)
  const [linked,setLinked] = useState([])
  const [feedback,setFeedback] = useState('')
  const document = step.document
  const pairs = step.pairs || []
  const connect = index => {
    if (index !== selected) {setFeedback('Esa prueba no demuestra esta afirmación. Revisa qué dice cada fuente.');return}
    const next = [...linked,index]
    setLinked(next)
    setFeedback(pairs[index].context)
    setSelected(pairs.findIndex((_,i)=>!next.includes(i)))
  }
  return <>
    <div className={styles.activityHeading}>
      <span className={styles.eyebrow}>{step.type==='talk' ? step.speaker : step.type==='connect' ? 'MESA DE INVESTIGACIÓN' : 'EXAMEN DE UNA FUENTE'}</span>
      <h2>{step.title}</h2>
    </div>
    {step.type==='talk' && <div className={styles.conversation}>
      <p>{step.text}</p>
      {reply === null ? <div className={styles.choices}>
        {step.replies.map(([label],i)=><button key={label} onClick={()=>setReply(i)}><span>0{i+1}</span>{label}<span>↗</span></button>)}
      </div> : <>
        <div className={styles.testimony}><span>En tu cuaderno</span><p>{step.replies[reply][1]}</p></div>
        <button className={styles.primaryButton} onClick={()=>onComplete({choice:reply})}>Conservar el testimonio <span>→</span></button>
      </>}
    </div>}
    {(step.type==='collect' || step.type==='reach') && <div className={styles.conversation}>
      <div className={styles.documentSeal}>R. C.</div><p>{step.text}</p>
      <button className={styles.primaryButton} onClick={()=>onComplete({})}>{step.type==='collect'?'Guardar la copia':'Continuar por el camino'} <span>→</span></button>
    </div>}
    {step.type==='inspect' && <div className={styles.inspector}>
      <div className={styles.paperDocument}>
        <span className={styles.paperNumber}>ARCHIVO · {step.id.includes('ireland')?'1916':step.id.includes('amazon')?'1910':'1903'}</span>
        <h3>{document.heading}</h3>
        <small>{document.subtitle}</small>
        <div className={styles.ledgerRows}>
          {document.rows.map(([label,value],i)=>{
            const mark = document.marks.find(m=>m.row===i)
            return mark ? <button key={label} className={marks.includes(i)?styles.documentMarkFound:''} aria-label={`Examinar anotación: ${label}`} onClick={()=>{setMarks(v=>v.includes(i)?v:[...v,i]);setNote(mark.note)}}><span>{label}</span><strong>{value}</strong><i>{marks.includes(i)?'✓':'⌕'}</i></button> : <div key={label}><span>{label}</span><strong>{value}</strong></div>
          })}
        </div>
        <span className={styles.paperSignature}>Copia de trabajo · R. Casement</span>
      </div>
      <div className={styles.inspectorNotes}>
        <span className={styles.eyebrow}>{marks.length} / {document.marks.length} ANOTACIONES</span>
        <p aria-live="polite">{note}</p>
        {marks.length===document.marks.length ? <>
          <h3>{document.question}</h3>
          <div className={styles.documentAnswers}>{document.answers.map((text,i)=><button key={text} className={answer===i?styles.answerSelected:''} onClick={()=>{setAnswer(i);setFeedback(i===document.correct?document.explanation:'Esa conclusión no se desprende de las anotaciones. Puedes volver a examinarlas.')}}>{text}<span>{answer===i?(i===document.correct?'✓':'↺'):'○'}</span></button>)}</div>
          {feedback && <p className={answer===document.correct?styles.feedbackSuccess:styles.feedback} role="status">{feedback}</p>}
          {answer===document.correct && <button className={styles.primaryButton} onClick={()=>onComplete({})}>Añadir la conclusión <span>→</span></button>}
        </> : <small>Toca las filas marcadas con una lupa para examinarlas.</small>}
      </div>
    </div>}
    {step.type==='connect' && <div className={styles.caseBoard}>
      {step.text && <p className={styles.caseReflection}>{step.text}</p>}
      {!!photos.length && <div className={styles.evidenceContactSheet}>{photos.slice(-3).map(photo=><figure key={photo.id}><img src={photo.image} alt={photo.subject} /><figcaption>{photo.title}</figcaption></figure>)}</div>}
      <div className={styles.boardColumns}>
        <div><span className={styles.eyebrow}>01 · AFIRMACIÓN</span>{pairs.map((pair,i)=><button key={pair.claim} className={`${styles.claimCard} ${selected===i?styles.claimSelected:''} ${linked.includes(i)?styles.claimLinked:''}`} onClick={()=>!linked.includes(i)&&setSelected(i)}><small>{linked.includes(i)?'✓ VINCULADA':`0${i+1}`}</small><strong>{pair.claim}</strong>{linked.includes(i)&&<span>{pair.evidence}</span>}</button>)}</div>
        <div><span className={styles.eyebrow}>02 · PRUEBA</span>{pairs.map((_,i)=>(i+1)%pairs.length).map(i=><button key={pairs[i].evidence} className={styles.evidenceCard} disabled={linked.includes(i)} onClick={()=>connect(i)}><span>{linked.includes(i)?'✓':'↗'}</span>{pairs[i].evidence}</button>)}</div>
      </div>
      <p className={styles.boardFeedback} aria-live="polite">{feedback || 'Selecciona una afirmación y la prueba que la sostiene. Una imagen sola no explica todo.'}</p>
      {linked.length===pairs.length && <button className={styles.primaryButton} onClick={()=>onComplete({})}>{step.id==='last-memory'?'Cerrar la última página':'Cerrar el expediente'} <span>→</span></button>}
    </div>}
    <div className={styles.activityFooter}><small>Escena y documentos recreados · Inspirados en la novela</small><button className={styles.textButton} onClick={onClose}>Volver a explorar</button></div>
  </>
}
