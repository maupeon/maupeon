// Small synthesized soundscape: no audio downloads and no autoplay before a gesture.
export function createSoundscape() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = 0
  master.connect(context.destination)
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 4,
    context.sampleRate
  )
  const data = buffer.getChannelData(0)
  let smooth = 0
  for (let i = 0; i < data.length; i++) {
    smooth = (smooth + Math.random() * 0.04 - 0.02) / 1.02
    data[i] = smooth * 3
  }
  const noise = context.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  const wind = context.createGain()
  wind.gain.value = 0.32
  noise.connect(filter)
  filter.connect(wind)
  wind.connect(master)
  noise.start()
  const notes = [130.81, 196, 261.63]
  const oscillators = notes.map((note, i) => {
    const o = context.createOscillator(),
      g = context.createGain()
    o.type = 'sine'
    o.frequency.value = note
    g.gain.value = 0.014 / (i + 1)
    o.connect(g)
    g.connect(master)
    o.start()
    return o
  })
  let enabled = false
  const visibility = () => {
    if (document.hidden) context.suspend()
    else if (enabled) context.resume().catch(() => {})
  }
  document.addEventListener('visibilitychange', visibility)
  return {
    setEnabled(value) {
      enabled = value
      if (value) context.resume().catch(() => {})
      master.gain.setTargetAtTime(value ? 0.6 : 0, context.currentTime, 0.4)
    },
    chapter(index) {
      filter.frequency.setTargetAtTime(
        index === 2 ? 330 : 650,
        context.currentTime,
        1
      )
      oscillators.forEach((o, i) =>
        o.frequency.setTargetAtTime(
          notes[i] * (index === 2 ? 0.89 : 1),
          context.currentTime,
          1
        )
      )
    },
    chime() {
      if (!enabled) return
      const oscillator = context.createOscillator(),
        gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(523.25, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        783.99,
        context.currentTime + 0.18
      )
      gain.gain.setValueAtTime(0, context.currentTime)
      gain.gain.linearRampToValueAtTime(0.065, context.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start()
      oscillator.stop(context.currentTime + 1)
      oscillator.onended = () => {
        gain.disconnect()
        oscillator.disconnect()
      }
    },
    dispose() {
      document.removeEventListener('visibilitychange', visibility)
      noise.stop()
      oscillators.forEach((o) => o.stop())
      context.close().catch(() => {})
    },
  }
}
