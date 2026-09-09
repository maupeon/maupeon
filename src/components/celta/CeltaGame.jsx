/* eslint-disable @next/next/no-img-element -- The album uses local, user-created JPEG data URLs. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  chapters,
  sources,
  initialProgress,
  normalizeProgress,
  recordStep,
  SAVE_KEY,
  SETTINGS_KEY,
} from '@/lib/celta/story'
import { createEngine } from './engine'
import { createSoundscape } from './audio'
import styles from './CeltaGame.module.css'
import Investigation from './Investigation'
import { getStep } from '@/lib/celta/expeditions'
import { artCredits } from '@/lib/celta/credits'

function Icon({ name, size = 20, ...props }) {
  const paths = {
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    book: (
      <>
        <path d="M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z" />
      </>
    ),
    sound: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4Zm5 4 5 6m0-6-5 6" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="1" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C7 2 2 7 5 15s15 4 15-12ZM5 20 16 8" />
      </>
    ),
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.compass}
    </svg>
  )
}

function Joystick({ engine, active }) {
  const ref = useRef(null),
    pointer = useRef(null),
    [offset, setOffset] = useState({ x: 0, y: 0 })
  const reset = useCallback(() => {
    pointer.current = null
    setOffset({ x: 0, y: 0 })
    engine.current?.joystick(0, 0)
  }, [engine])
  useEffect(() => {
    if (!active) reset()
    window.addEventListener('blur', reset)
    return () => window.removeEventListener('blur', reset)
  }, [active, reset])
  const move = (e) => {
    if (pointer.current !== e.pointerId) return
    const bounds = ref.current.getBoundingClientRect(),
      x = e.clientX - bounds.left - bounds.width / 2,
      y = e.clientY - bounds.top - bounds.height / 2,
      length = Math.hypot(x, y),
      max = 34,
      scale = length > max ? max / length : 1
    setOffset({ x: x * scale, y: y * scale })
    engine.current?.joystick((x * scale) / max, (y * scale) / max)
  }
  return (
    <div className={styles.joystickArea}>
      <div
        ref={ref}
        className={styles.joystick}
        role="group"
        aria-label="Joystick para moverse"
        onPointerDown={(e) => {
          if (!active) return
          pointer.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={move}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <span className={styles.joystickCross} />
        <span
          className={styles.joystickKnob}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        />
      </div>
      <span className={styles.controlLabel}>MOVERSE</span>
    </div>
  )
}

function MiniMap({ chapter, mission, position, target, grid }) {
  const mapX = (x) => ((x + 24) / 36) * 112 + 5,
    mapY = (z) => ((z + 48) / 58) * 128 + 3
  const terrainPath=useMemo(()=>grid?.values.map((value,i)=>value ? `M${((grid.origin[0]+i%grid.width*grid.step+24)/36)*112+5} ${((grid.origin[1]+Math.floor(i/grid.width)*grid.step+48)/58)*128+3}h3.2v2.3h-3.2z` : '').join(''),[grid])
  return (
    <svg
      className={styles.minimap}
      viewBox="0 0 132 144"
      role="img"
      aria-label="Mapa: tu posición y los tres objetivos"
    >
      <defs>
        <linearGradient id="mapfade" x2="0" y2="1">
          <stop stopColor="#172820" />
          <stop offset="1" stopColor="#101c17" />
        </linearGradient>
        <filter id="map-terrain-softness" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>
      <rect
        x="1"
        y="1"
        width="130"
        height="142"
        rx="2"
        fill="url(#mapfade)"
        stroke="#d5bc7833"
      />
      {grid && <path fill="#9cb5a919" d={terrainPath} filter="url(#map-terrain-softness)" />}
      <text x="13" y="17" fill="#dbc995" fontSize="8" fontFamily="Georgia">
        N ↑
      </text>
      {chapters[chapter].missions.map((item, i) => (
        <g key={item.id} opacity={i > mission ? 0.3 : 1}>
          <circle
            cx={mapX(i===mission && target ? target[0] : item.position[0])}
            cy={mapY(i===mission && target ? target[1] : item.position[1])}
            r={i === mission ? 4 : 2.5}
            fill={
              i < mission ? '#9abca0' : i === mission ? '#e8cd8c' : '#697b6e'
            }
          />
          {i === mission && (
            <circle
              cx={mapX(target?.[0] ?? item.position[0])}
              cy={mapY(target?.[1] ?? item.position[1])}
              r="8"
              fill="none"
              stroke="#e8cd8c55"
            />
          )}
        </g>
      ))}
      <circle
        cx={mapX(position.x)}
        cy={mapY(position.z)}
        r="3.5"
        fill="#f6eddb"
      />
    </svg>
  )
}

function Panel({ title, eyebrow, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    const key = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll(
          'button,a,input,select,[tabindex="0"]'
        )
        if (!items?.length) return
        const first = items[0],
          last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('keydown', key)
      previous?.focus()
    }
  }, [onClose])
  return (
    <div className={styles.panelBackdrop}>
      <section
        className={styles.panel}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export default function CeltaGame() {
  const canvasRef = useRef(null),
    engine = useRef(null),
    audio = useRef(null),
    settingsRef = useRef(null),
    rootRef = useRef(null)
  const [ready, setReady] = useState(false),
    [loaded, setLoaded] = useState(false),
    [worldLoading,setWorldLoading] = useState(false),
    [mapGrid,setMapGrid] = useState(null),
    [error, setError] = useState(''),
    [saveError, setSaveError] = useState(false)
  const [progress, setProgress] = useState({ ...initialProgress, entries: [] }),
    [screen, setScreen] = useState('menu'),
    [selected, setSelected] = useState(0),
    [panel, setPanel] = useState(null)
  const [settings, setSettings] = useState({
    sound: false,
    quality: 'auto',
    reducedMotion: false,
  })
  const [position, setPosition] = useState({
      x: 0,
      z: 1,
      near: false,
      distance: 0,
    }),
    [guided, setGuided] = useState(false),
    [toast, setToast] = useState(''),
    [journalTab, setJournalTab] = useState('entries'),
    [stats, setStats] = useState(null),
    [photoState,setPhotoState] = useState({ready:false,sharp:false,hint:'Encuadra el sujeto'}),
    [zoom,setZoom] = useState(1),
    [focus,setFocus] = useState(5),
    [flash,setFlash] = useState(false)
  const activity = getStep(progress,chapters)
  const chapter = chapters[screen === 'menu' ? selected : progress.chapter]
  const mission = chapters[progress.chapter].missions[progress.mission]
  const closePanel = useCallback(() => setPanel(null), [])
  settingsRef.current = settings

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (saved) {
        const next = normalizeProgress(JSON.parse(saved))
        setProgress(next)
        setSelected(next.chapter)
      }
    } catch {
      setSaveError(true)
    }
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')
      if (saved)
        setSettings({
          sound: !!saved.sound,
          quality: ['auto', 'low', 'high'].includes(saved.quality)
            ? saved.quality
            : 'auto',
          reducedMotion: !!saved.reducedMotion,
        })
      else
        setSettings((value) => ({
          ...value,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches,
        }))
    } catch {}
    setLoaded(true)
    return () => audio.current?.dispose()
  }, [])

  useEffect(() => {
    let cancelled = false,
      instance
    setReady(false)
    createEngine(canvasRef.current, {
      onUpdate: setPosition,
      onGuide: setGuided,
      onPerformance: setStats,
      onError: setError,
      onPhoto: setPhotoState,
      onLoading: setWorldLoading,
      onMap: setMapGrid,
    })
      .then((result) => {
        instance = result
        if (cancelled) {
          instance.dispose()
          return
        }
        engine.current = result
        setReady(true)
      })
      .catch((cause) => {
        if (!cancelled) {
          console.error('Celta: no se pudo iniciar WebGL', cause)
          setError(
            'No se pudo iniciar la escena 3D. Prueba a recargar o abre el juego en un navegador con WebGL 2.'
          )
        }
      })
    return () => {
      cancelled = true
      instance?.dispose()
      engine.current = null
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress))
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }, [progress, loaded])
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {}
    audio.current?.setEnabled(settings.sound)
  }, [settings, loaded])
  useEffect(() => {
    if (!ready || !engine.current) return
    engine.current.update({
      chapter: screen === 'menu' ? selected : progress.chapter,
      mission: screen === 'menu' ? 0 : progress.mission,
      mode: panel
        ? 'paused'
        : screen === 'photo'
        ? 'photo'
        : screen === 'intro'
        ? 'cinematic'
        : screen === 'play'
        ? 'play'
        : screen === 'menu'
        ? 'menu'
        : 'paused',
      target: activity?.position || null,
      activity,
      quality: settings.quality,
      reducedMotion: settings.reducedMotion,
    })
    audio.current?.chapter(screen === 'menu' ? selected : progress.chapter)
  }, [
    ready,
    screen,
    selected,
    progress.chapter,
    progress.mission,
    mission,
    activity,
    panel,
    settings.quality,
    settings.reducedMotion,
  ])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3800)
    return () => clearTimeout(timer)
  }, [toast])

  const ensureAudio = useCallback(() => {
    try {
      if (!audio.current) audio.current = createSoundscape()
      audio.current?.setEnabled(settingsRef.current.sound)
    } catch {}
  }, [])
  const openCamera = useCallback(() => {
    setToast('')
    setZoom(1)
    setFocus(5)
    setScreen('photo')
    ensureAudio()
  },[ensureAudio])
  const interact = useCallback(() => {
    if (screen === 'play' && !panel && activity) {
      if (activity.type === 'photo') openCamera()
      else if (engine.current?.isNear()) {
        setScreen('investigate')
        ensureAudio()
      }
    }
  }, [screen, panel, activity, openCamera, ensureAudio])
  useEffect(() => {
    if (ready) engine.current?.setLens(zoom,focus)
  },[zoom,focus,ready])
  const completeActivity = useCallback((result = {}) => {
    if (!activity) return
    const next = recordStep(progress,{id:activity.id,complete:true,...result})
    if (next===progress) return
    setProgress(next)
    audio.current?.chime()
    const completedMission=next.mission!==progress.mission
    setToast(completedMission?'Expediente completado · Nueva página en tu cuaderno':activity.type==='photo'?'Fotografía guardada en tu álbum':'Prueba conservada · Continúa la investigación')
    if (next.completed) setScreen('ending')
    else if (next.mission===3) setScreen('chapter-end')
    else if (next.chapter===2 && next.mission===2) setScreen('prison-intro')
    else setScreen('play')
  },[activity,progress])
  const takePhoto = useCallback(() => {
    const photo = engine.current?.photograph()
    if (!photo || photo.error) {setToast(photo?.error || 'Espera a que la cámara esté lista.');return}
    setFlash(true)
    setTimeout(()=>setFlash(false),320)
    audio.current?.shutter?.()
    if (activity?.type==='photo') completeActivity({photo})
    else {
      const id = `free-${Date.now()}`
      setProgress(value=>({...value,photos:[...(value.photos || []).filter(p=>!p.id.startsWith('free-')).concat((value.photos || []).filter(p=>p.id.startsWith('free-')).slice(-7)),{id,title:'Apunte del viaje',subject:chapter.name,image:photo.image}]}))
      setToast('Fotografía libre guardada en tu álbum')
    }
  },[activity,completeActivity,chapter.name])
  useEffect(() => {
    const key = e => {
      if (e.repeat || e.target.closest('input,select,textarea')) return
      const k=e.key.toLowerCase()
      if (k==='escape' && !panel) {
        e.preventDefault()
        if (screen==='photo' || screen==='investigate') setScreen('play')
        else if (screen==='play') setPanel('pause')
      }
      if (k==='e' && screen==='play' && !panel) {e.preventDefault();interact()}
      if (k==='c' && !panel) {
        if (screen==='play') {e.preventDefault();openCamera()}
        else if (screen==='photo') {e.preventDefault();setScreen('play')}
      }
      if (k===' ' && screen==='photo' && !panel) {e.preventDefault();takePhoto()}
      if (k==='j' && !panel && screen==='play') {e.preventDefault();setPanel('journal')}
    }
    window.addEventListener('keydown',key)
    return ()=>window.removeEventListener('keydown',key)
  },[screen,panel,interact,openCamera,takePhoto])

  useEffect(() => {
    if (screen !== 'investigate' || panel) return
    const dialog = rootRef.current?.querySelector('[data-celta-activity]')
    dialog?.querySelectorAll('button,input,select,a')?.[1]?.focus()
    const key = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setScreen('play')
      }
      const buttons=dialog?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a')
      if (event.key !== 'Tab' || !buttons?.length) return
      const first = buttons[0],
        last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [screen, panel])

  function start() {
    ensureAudio()
    if (progress.completed) {
      setScreen('ending')
      return
    }
    if (progress.mission === 3) {
      setScreen('chapter-end')
      return
    }
    if (progress.entries.length || progress.step || progress.photos.length) {
      setSelected(progress.chapter)
      setScreen('play')
      return
    }
    setSelected(0)
    setScreen('intro')
  }
  function nextChapter() {
    setProgress((value) => ({
      ...value,
      chapter: value.chapter + 1,
      mission: 0,
      step: 0,
    }))
    setSelected(progress.chapter + 1)
    setScreen('intro')
  }
  function newGame() {
    setProgress({ ...initialProgress, entries: [], photos: [] })
    setSelected(0)
    setPanel(null)
    setScreen('intro')
    setToast('')
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (rootRef.current?.requestFullscreen)
        await rootRef.current.requestFullscreen()
      else
        setToast(
          'Puedes añadir el juego a tu pantalla de inicio desde el navegador.'
        )
    } catch {
      setToast('La pantalla completa no está disponible en este navegador.')
    }
  }
  const journal = () => {
    setJournalTab('entries')
    setPanel('journal')
  }
  const total = progress.entries.length

  return (
    <main
      ref={rootRef}
      className={`${styles.game} ${
        (settings.reducedMotion ? styles.reduceMotion : '') + (screen==='photo' ? ` ${styles.photoMode}` : '')
      }`}
      lang="es"
    >
      <div ref={canvasRef} className={styles.canvas} style={screen==='photo' && !photoState.sharp ? {filter:'blur(1.4px)'} : undefined} />
      <div
        className={`${styles.vignette} ${
          screen === 'menu' ? styles.menuVignette : ''
        }`}
      />
      <header className={styles.header}>
        <button
          className={styles.wordmark}
          onClick={() =>
            screen === 'menu' ? setSelected(0) : setPanel('pause')
          }
          aria-label={
            screen === 'menu' ? 'Celta · inicio' : 'Abrir menú del juego'
          }
        >
          <span className={styles.emblem}>✧</span> CELTA
        </button>
        {screen === 'play' && (
          <div className={styles.chapterHeading}>
            <span>CAPÍTULO {chapter.numeral}</span>
            <strong>{chapter.name}</strong>
          </div>
        )}
        <nav
          className={styles.headerActions}
          aria-label="Herramientas del juego"
        >
          <button
            onClick={journal}
            className={styles.navButton}
            aria-label={`Cuaderno${total > 0 ? ` ${total}` : ''}`}
          >
            <Icon name="book" />
            <span>Cuaderno</span>
            {total > 0 && <small>{total}</small>}
          </button>
          <button
            className={styles.iconButton}
            onClick={() => {
              ensureAudio()
              setSettings((s) => ({ ...s, sound: !s.sound }))
            }}
            aria-label={settings.sound ? 'Silenciar sonido' : 'Activar sonido'}
            aria-pressed={settings.sound}
          >
            <Icon name={settings.sound ? 'sound' : 'mute'} />
          </button>
          <button
            onClick={() => setPanel(screen === 'play' ? 'pause' : 'settings')}
            className={styles.navButton}
            aria-label={screen === 'play' ? 'Pausa' : 'Ajustes'}
          >
            <Icon name={screen === 'play' ? 'pause' : 'settings'} />
            <span>{screen === 'play' ? 'Pausa' : 'Ajustes'}</span>
          </button>
        </nav>
      </header>

      {(!ready || worldLoading) && !error && (
        <div className={styles.loading} role="status">
          <span className={styles.loadingMark}>✧</span>
          <p>El viaje está tomando forma</p>
          <span>Preparando el mundo 3D…</span>
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <Icon name="compass" size={40} />
          <h1>El viaje espera</h1>
          <p>{error}</p>
          <button
            className={styles.primaryButton}
            onClick={() => location.reload()}
          >
            Volver a intentar <Icon name="arrow" />
          </button>
          <button className={styles.textButton} onClick={journal}>
            Leer mi cuaderno
          </button>
        </div>
      )}

      {ready && screen === 'menu' && (
        <>
          <section className={styles.menuCopy} aria-label="El sueño del celta">
            <div className={styles.overline}>
              <span /> UNA AVENTURA DE ROGER CASEMENT
            </div>
            <h1>
              El Sueño
              <br />
              del Celta<span className={styles.titlePeriod}>.</span>
            </h1>
            <p className={styles.tagline}>Tres territorios. Una conciencia.</p>
            <p className={styles.menuDescription}>
              Adéntrate en la historia de un hombre
              <br className={styles.desktopBreak} /> que decidió no apartar la
              mirada.
            </p>
            <button
              className={styles.startButton}
              onClick={start}
              disabled={!loaded}
            >
              {progress.completed
                ? 'Volver al epílogo'
                : total || progress.step || progress.photos.length
                ? 'Continuar el viaje'
                : 'Comenzar el viaje'}
              <Icon name="arrow" size={23} />
            </button>
            <div className={styles.startNote}>
              {total
                ? `${total} de 9 páginas escritas · Progreso guardado`
                : 'EXPLORACIÓN 3D'}
              <span>·</span>
              {total ? 'En este dispositivo' : '9 INVESTIGACIONES · CÁMARA DE CAMPO'}
            </div>
          </section>
          <aside className={styles.sceneCaption}>
            <span className={styles.captionLine} />
            <span>{chapter.place}</span>
            <strong>{chapter.year}</strong>
          </aside>
          <footer className={styles.menuFooter}>
            <div
              className={styles.chapterTabs}
              role="tablist"
              aria-label="Explorar los tres capítulos"
            >
              {chapters.map((item, i) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={selected === i}
                  className={`${styles.chapterTab} ${
                    selected === i ? styles.chapterTabActive : ''
                  }`}
                  onClick={() => setSelected(i)}
                >
                  <span className={styles.chapterNumber}>0{i + 1}</span>
                  <span>
                    <small>CAPÍTULO {item.numeral}</small>
                    <strong>{item.name}</strong>
                  </span>
                  {i < progress.chapter ? (
                    <Icon name="check" size={15} />
                  ) : i > progress.chapter ? (
                    <Icon name="lock" size={13} />
                  ) : (
                    <span className={styles.chapterDot} />
                  )}
                </button>
              ))}
            </div>
            <div className={styles.literaryCredit}>
              Inspirado en la novela de
              <br />
              <em>Mario Vargas Llosa</em>
              <button
                onClick={() => {
                  setJournalTab('history')
                  setPanel('journal')
                }}
              >
                Sobre esta aventura <span>↗</span>
              </button>
            </div>
          </footer>
        </>
      )}

      {ready && screen === 'play' && (
        <>
          <section className={styles.missionHud} aria-live="polite">
            <span className={styles.eyebrow}>
              MISIÓN {Math.min(progress.mission + 1, 3)} DE 3{' '}
              <span className={styles.missionDash}>—</span> {chapter.year}
            </span>
            <h2>{mission?.title}</h2>
            <p>{activity?.instruction}</p>
            <div className={styles.stageChecklist}>{mission?.steps.map((step,i)=><i key={step.id} data-done={i<=progress.step} />)}<span>{progress.step+1} / {mission?.steps.length} · {activity?.title}</span></div>
            <div className={styles.missionProgress}>
              {chapter.missions.map((item, i) => (
                <span
                  key={item.id}
                  className={i <= progress.mission ? styles.progressActive : ''}
                />
              ))}
            </div>
          </section>
          {position.markerVisible && mission && !position.near && (
            <div
              className={styles.worldMarker}
              style={{
                left: `${position.markerX}%`,
                top: `${position.markerY}%`,
              }}
            >
              <span>{position.distance} m</span>
            </div>
          )}
          <div className={styles.mapWrap}>
            {!(progress.chapter === 2 && progress.mission === 2) && (
              <MiniMap
                chapter={progress.chapter}
                mission={progress.mission}
                position={position}
                target={activity?.position}
                grid={mapGrid}
              />
            )}
            <button
              className={styles.guideButton}
              onClick={() => engine.current?.guide()}
              disabled={guided || position.near}
            >
              <Icon name="compass" size={16} />
              {position.near
                ? 'Has llegado'
                : guided
                ? 'Siguiendo el sendero…'
                : 'Guiarme al objetivo'}
            </button>
            <button className={styles.cameraButton} onClick={openCamera}><Icon name="camera" size={18}/> Cámara <kbd>C</kbd></button>
          </div>
          <div className={styles.desktopControls}>
            <span>
              <kbd>W</kbd>
              <span className={styles.asd}>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd>
              </span>
            </span>
            <span>Caminar</span>
            <i />
            <kbd>E</kbd>
            <span>Interactuar</span>
            <i />
            <kbd>J</kbd>
            <span>Cuaderno</span><i /><span>Arrastra para mirar</span>
          </div>
          <Joystick engine={engine} active={!panel} />
          <div
            className={`${styles.interactWrap} ${
              position.near ? styles.interactReady : ''
            }`}
          >
            <span className={styles.interactTarget}>
              {position.near
                ? activity?.title
                : `${position.distance} m · Objetivo`}
            </span>
            <button
              className={styles.interactButton}
              disabled={(activity?.type!=='photo' && !position.near) || !!panel}
              onClick={interact}
            >
              <Icon
                name={
                  activity?.type === 'photo' ? 'camera' : activity?.type === 'talk'
                    ? 'leaf'
                    : activity?.type === 'connect'
                    ? 'arrow'
                    : 'book'
                }
                size={22}
              />
              <span>{activity?.verb || (activity?.type==='talk'?'Conversar':'Examinar')}</span>
              <kbd>E</kbd>
            </button>
          </div>
        </>
      )}

      {ready && (screen === 'intro' || screen === 'prison-intro') && (
        <section
          className={styles.interlude}
          aria-label="Introducción del capítulo"
        >
          <span className={styles.interludeMark}>✧</span>
          <span className={styles.eyebrow}>
            {screen === 'prison-intro'
              ? 'LONDRES · 1916'
              : `RECUERDOS DESDE PENTONVILLE · CAPÍTULO ${chapter.numeral}`}
          </span>
          <h1>
            {screen === 'prison-intro' ? 'Entre cuatro paredes' : chapter.name}
          </h1>
          <span className={styles.interludeSubtitle}>
            {screen === 'prison-intro' ? 'La última mañana' : chapter.subtitle}
          </span>
          <p>
            {screen === 'prison-intro'
              ? 'Tras tu detención en Kerry, eres juzgado en Londres y condenado por alta traición. La celda de Pentonville se convierte en el lugar donde vuelves sobre tu vida. Es el 3 de agosto de 1916.'
              : chapter.memory}
          </p>
          <div className={styles.interludeRule} />
          <button
            className={styles.primaryButton}
            onClick={() => {
              ensureAudio()
              setScreen('play')
            }}
          >
            {screen === 'prison-intro'
              ? 'Escribir la última página'
              : `Entrar en ${
                  chapter.name === 'El Congo'
                    ? 'el Congo'
                    : chapter.name === 'La Amazonía'
                    ? 'la Amazonía'
                    : 'Irlanda'
                }`}
            <Icon name="arrow" />
          </button>
          <small>
            {screen === 'prison-intro'
              ? 'Tu cuaderno te acompaña hasta el final.'
              : 'Explora · Escucha · Deja constancia'}
          </small>
        </section>
      )}

      {screen==='investigate' && activity && <div className={styles.dialogueBackdrop}>
        <section className={styles.activityPanel} role="dialog" aria-modal="true" aria-label={activity.title} data-celta-activity>
          <button className={`${styles.iconButton} ${styles.activityClose}`} aria-label="Volver a explorar" onClick={()=>setScreen('play')}><Icon name="close"/></button>
          <Investigation key={activity.id} step={activity} photos={progress.photos.filter(photo=>!photo.id.startsWith('free-'))} onComplete={completeActivity} onClose={()=>setScreen('play')}/>
        </section>
      </div>}

      {screen==='photo' && <>
        <div className={`${styles.photoOverlay} ${photoState.ready?styles.photoReady:''}`}>
          <div className={styles.photoHeader}><div><small>ROGER CASEMENT · CÁMARA DE CAMPO</small><strong>{activity?.type==='photo'?activity.subject:'Cuaderno visual · '+chapter.name}</strong></div><button className={styles.iconButton} aria-label="Guardar cámara" onClick={()=>setScreen('play')}><Icon name="close"/></button></div>
          <div className={styles.viewfinder}><i/><i/><i/><i/><span className={styles.focusReticle}/></div>
          <div className={styles.photoCameraBottom}>
            <p className={styles.photoHint} aria-live="polite">{photoState.hint}</p>
            <div className={styles.lensControls}>
              <label><span>ENFOQUE <b>{focus.toFixed(1)} m</b></span><input aria-label="Enfoque de la cámara" type="range" min="1" max="20" step=".1" value={focus} onChange={e=>setFocus(Number(e.target.value))}/></label>
              <button className={styles.shutter} aria-label="Tomar fotografía" disabled={!photoState.ready} onClick={takePhoto}><span/></button>
              <label><span>ZOOM <b>{zoom.toFixed(1)}×</b></span><input aria-label="Zoom de la cámara" type="range" min="1" max="3" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
            </div>
            <div className={styles.photoTools}><button onClick={()=>engine.current?.aimAtSubject()}>Centrar mirada</button><span>ARRASTRA PARA ENCUADRAR · ESPACIO PARA DISPARAR</span><button onClick={()=>{setJournalTab('photos');setPanel('journal')}}>Álbum · {progress.photos.length}</button></div>
          </div>
        </div>
        <Joystick engine={engine} active={!panel}/>
      </>}
      {flash && <div className={styles.shutterFlash}/>}

      {screen === 'chapter-end' && (
        <section className={styles.interlude}>
          <span className={styles.interludeMark}>
            <Icon name="check" size={32} />
          </span>
          <span className={styles.eyebrow}>
            CAPÍTULO {chapter.numeral} · COMPLETADO
          </span>
          <h1>
            {progress.chapter === 0
              ? 'El silencio se rompe'
              : 'La verdad cruza el océano'}
          </h1>
          <p>{chapter.fact}</p>
          <div className={styles.chapterSummary}>
            <Icon name="book" />
            <span>Tres nuevas páginas en tu cuaderno.</span>
          </div>
          <button className={styles.primaryButton} onClick={nextChapter}>
            Continuar hacia {progress.chapter === 0 ? 'la Amazonía' : 'Irlanda'}
            <Icon name="arrow" />
          </button>
          <button className={styles.textButton} onClick={journal}>
            Leer lo que he escrito
          </button>
        </section>
      )}

      {screen === 'ending' && (
        <section className={`${styles.interlude} ${styles.ending}`}>
          <span className={styles.eyebrow}>
            PENTONVILLE, LONDRES · 3 DE AGOSTO DE 1916
          </span>
          <h1>
            Un hombre muere.
            <br />
            <em>Su testimonio permanece.</em>
          </h1>
          <div className={styles.interludeRule} />
          <p>
            Roger Casement fue ejecutado en la horca tras ser condenado por alta
            traición. Su vida terminó en Pentonville. Las voces que recogió en
            el Congo y el Putumayo quedaron en sus informes.
          </p>
          <p className={styles.endingReflection}>
            Has recorrido sus recuerdos y escrito nueve páginas.
            <br />
            El viaje termina. Las preguntas permanecen.
          </p>
          <div className={styles.endingActions}>
            <button className={styles.primaryButton} onClick={journal}>
              Abrir mi cuaderno
              <Icon name="book" />
            </button>
            <button
              className={styles.textButton}
              onClick={() => {
                setScreen('menu')
                setSelected(0)
              }}
            >
              Volver al inicio
            </button>
          </div>
          <span className={styles.endingCredit}>
            Una aventura independiente inspirada en <em>El sueño del celta</em>,
            <br />
            de Mario Vargas Llosa. Textos y encuentros dramatizados originales.
          </span>
        </section>
      )}

      {(panel === 'settings' || panel === 'pause') && (
        <Panel
          title={panel === 'pause' ? 'Un momento en el viaje' : 'A tu manera'}
          eyebrow={
            panel === 'pause' ? 'PARTIDA EN PAUSA' : 'AJUSTES DE LA AVENTURA'
          }
          onClose={closePanel}
        >
          {panel === 'pause' && (
            <button className={styles.primaryButton} onClick={closePanel}>
              Seguir explorando
              <Icon name="arrow" />
            </button>
          )}
          <div className={styles.settingRow}>
            <div>
              <strong>Sonido ambiente</strong>
              <p>Río, viento y una atmósfera musical sutil.</p>
            </div>
            <button
              className={`${styles.toggle} ${
                settings.sound ? styles.toggleOn : ''
              }`}
              role="switch"
              aria-checked={settings.sound}
              aria-label="Sonido ambiente"
              onClick={() => {
                ensureAudio()
                setSettings((s) => ({ ...s, sound: !s.sound }))
              }}
            >
              <span />
            </button>
          </div>
          <div className={styles.settingRow}>
            <div>
              <strong>Calidad visual</strong>
              <p>Automática se adapta al rendimiento.</p>
            </div>
            <select
              aria-label="Calidad visual"
              value={settings.quality}
              onChange={(e) =>
                setSettings((s) => ({ ...s, quality: e.target.value }))
              }
            >
              <option value="auto">Automática</option>
              <option value="low">Ahorro</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div className={styles.settingRow}>
            <div>
              <strong>Movimiento reducido</strong>
              <p>Desactiva la animación ambiental.</p>
            </div>
            <button
              className={`${styles.toggle} ${
                settings.reducedMotion ? styles.toggleOn : ''
              }`}
              role="switch"
              aria-checked={settings.reducedMotion}
              aria-label="Movimiento reducido"
              onClick={() =>
                setSettings((s) => ({ ...s, reducedMotion: !s.reducedMotion }))
              }
            >
              <span />
            </button>
          </div>
          <button className={styles.settingLink} onClick={fullscreen}>
            Pantalla completa
            <Icon name="expand" size={18} />
          </button>
          <div className={styles.controlHelp}>
            <span className={styles.eyebrow}>CÓMO JUGAR</span>
            <p>
              <strong>Móvil:</strong> mueve el joystick y toca el botón de
              acción cuando estés cerca. Arrastra el escenario para mirar. La cámara permite encuadrar, acercar y enfocar. «Guiarme al objetivo» te lleva por el sendero.
            </p>
            <p>
              <strong>Teclado:</strong> WASD o flechas para caminar, E para
              interactuar, C para la cámara, espacio para fotografiar, J para el cuaderno y Esc para salir o pausar. Arrastra para mover la mirada.
            </p>
          </div>
          {stats && (
            <small className={styles.performance}>
              Rendimiento observado en este navegador: {stats.fps} FPS
            </small>
          )}
          <div className={styles.panelBottom}>
            {panel === 'pause' && (
              <button
                className={styles.textButton}
                onClick={() => {
                  setPanel(null)
                  setScreen('menu')
                  setSelected(progress.chapter)
                }}
              >
                Guardar y volver al inicio
              </button>
            )}
            <button
              className={styles.textButton}
              onClick={() => setPanel('restart')}
            >
              Empezar de nuevo
            </button>
          </div>
        </Panel>
      )}

      {panel === 'restart' && (
        <Panel
          title="¿Volver al principio?"
          eyebrow="UN NUEVO CUADERNO"
          onClose={closePanel}
        >
          <p className={styles.panelText}>
            Se borrarán las páginas y el progreso guardado de esta partida en
            este dispositivo.
          </p>
          <button className={styles.primaryButton} onClick={newGame}>
            Sí, comenzar una nueva partida
            <Icon name="arrow" />
          </button>
          <button className={styles.textButton} onClick={closePanel}>
            Conservar mi partida
          </button>
        </Panel>
      )}

      {panel === 'journal' && (
        <Panel
          title="Cuaderno de viaje"
          eyebrow="ROGER CASEMENT · 1903—1916"
          onClose={closePanel}
        >
          <div className={styles.journalTabs}>
            <button
              aria-pressed={journalTab === 'entries'}
              onClick={() => setJournalTab('entries')}
            >
              Mis páginas <span>{total}/9</span>
            </button>
            <button aria-pressed={journalTab==='photos'} onClick={()=>setJournalTab('photos')}>Fotografías <span>{progress.photos.length}</span></button>
            <button
              aria-pressed={journalTab === 'history'}
              onClick={() => setJournalTab('history')}
            >
              Historia y fuentes
            </button>
          </div>
          {journalTab==='photos' ? <div className={styles.album}>{progress.photos.length ? progress.photos.map(photo=><figure key={photo.id}><img src={photo.image} alt={photo.subject}/><figcaption>{photo.title}</figcaption><small>{photo.subject} · Archivo de campo</small></figure>) : <p>Las fotografías que tomes con la cámara quedarán guardadas aquí.</p>}</div> : journalTab === 'entries' ? (
            <div className={styles.journalEntries}>
              {total === 0 ? (
                <div className={styles.emptyJournal}>
                  <Icon name="book" size={36} />
                  <h3>Toda historia empieza por escuchar.</h3>
                  <p>
                    Los testimonios, documentos y decisiones que encuentres
                    durante el viaje quedarán escritos aquí.
                  </p>
                  <span>Tu primera página te espera en el Congo.</span>
                </div>
              ) : (
                chapters.map((item, i) => {
                  const entries = progress.entries.filter((entry) =>
                    item.missions.some((m) => m.id === entry.id)
                  )
                  if (!entries.length) return null
                  return (
                    <section key={item.id} className={styles.journalChapter}>
                      <span className={styles.eyebrow}>
                        {item.numeral} · {item.name} · {item.year}
                      </span>
                      {entries.map((entry, j) => (
                        <article key={entry.id}>
                          <span className={styles.pageNumber}>
                            0{i * 3 + j + 1}
                          </span>
                          <div>
                            <h3>{entry.title}</h3>
                            <p>{entry.note}</p>
                          </div>
                        </article>
                      ))}
                    </section>
                  )
                })
              )}
            </div>
          ) : (
            <div className={styles.history}>
              <p>
                Esta aventura independiente toma como punto de partida las tres
                partes de <em>El sueño del celta</em>, de Mario Vargas Llosa: El
                Congo, La Amazonía e Irlanda. Los recuerdos se entrelazan con la
                prisión de Pentonville.
              </p>
              <p>
                Las misiones, los diálogos y los testigos anónimos son
                dramatizaciones originales. La cámara de campo es una licencia jugable: las fotografías que tomas no son imágenes históricas ni se atribuyen a Casement. Tus decisiones cambian las
                reflexiones del cuaderno; los acontecimientos históricos y el
                desenlace permanecen.
              </p>
              {chapters.map((item) => (
                <section key={item.id}>
                  <h3>{item.name}</h3>
                  <p>{item.fact}</p>
                </section>
              ))}
              <h3>Para seguir leyendo</h3>
              {sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title}
                  <span>↗</span>
                </a>
              ))}
              <small>
                Incluye referencias a explotación colonial, trabajo forzado,
                discriminación y muerte. Se presentan sin violencia gráfica.
              </small>
              <details className={styles.artCredits}>
                <summary>Arte y recursos 3D</summary>
                {artCredits.map(credit=><section key={credit.title}>
                  <h3>{credit.title}</h3>
                  <p><a href={credit.source} target="_blank" rel="noreferrer">{credit.author}</a>{' · '}<a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a></p>
                  <p>{credit.note}</p>
                </section>)}
              </details>
            </div>
          )}
          <div className={styles.journalFoot}>
            <span>✧</span>{' '}
            {saveError
              ? 'El navegador no permite guardar el progreso.'
              : 'Tu cuaderno se guarda automáticamente en este dispositivo.'}
          </div>
        </Panel>
      )}
      {toast && (
        <div className={styles.toast} role="status">
          <Icon name="book" size={16} />
          {toast}
        </div>
      )}
      {saveError && panel !== 'journal' && (
        <div className={styles.saveWarning} role="status">
          No se puede guardar en este navegador. Mantén esta pestaña abierta.
        </div>
      )}
    </main>
  )
}
