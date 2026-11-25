import type { Ambient, BellSound } from '../domain/types'

// One AudioContext for the whole app, created on the first tap. Browsers only
// allow audio that a gesture unlocked, and a fresh context per sound is what
// made the old bell go silent after the screen locked.
let ctx: AudioContext | null = null
let master: GainNode | null = null
// Bells and ticks play through this bus so `silence` can cut whatever is still ringing.
let fx: GainNode | null = null
let keepAlive: HTMLAudioElement | null = null
let lingerTimer = 0

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

// Recordings are CC0 from freesound.org (credited on the About page).
const FILES: Partial<Record<BellSound | Ambient, string>> = {
  bowl: '/sounds/bowl.mp3',
  strike: '/sounds/bowl-strike.mp3',
  gong: '/sounds/gong.mp3',
  chime: '/sounds/chime.mp3',
  rain: '/sounds/rain.mp3',
  ocean: '/sounds/ocean.mp3',
  forest: '/sounds/forest.mp3',
  stream: '/sounds/stream.mp3'
}

const buffers = new Map<string, Promise<AudioBuffer | null>>()

function load(key: BellSound | Ambient): Promise<AudioBuffer | null> {
  const url = FILES[key]
  if (!ctx || !url) return Promise.resolve(null)
  let p = buffers.get(url)
  if (!p) {
    const context = ctx
    p = fetch(url)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then(data => context.decodeAudioData(data))
      .catch(() => null)
    buffers.set(url, p)
  }
  return p
}

export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'playback' })
    master = ctx.createGain()
    master.connect(ctx.destination)
    fx = ctx.createGain()
    fx.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  // Plays even with the iPhone silent switch on, like any meditation app.
  const nav = navigator as AudioSessionNavigator
  if (nav.audioSession) nav.audioSession.type = 'playback'
  return ctx
}

export function preloadSounds(bell: BellSound, ambient: Ambient) {
  void load(bell)
  if (ambient !== 'none') void load(ambient)
}

export function resumeAudio() {
  if (ctx && ctx.state !== 'running') void ctx.resume()
}

// A near-silent looping media element keeps the page "audible": Chrome then
// exempts it from background timer throttling, iOS keeps the audio session
// alive, and lock-screen media controls appear.
export function setKeepAlive(on: boolean) {
  clearTimeout(lingerTimer)
  if (on) {
    if (!keepAlive) {
      keepAlive = new Audio(silentWavUrl())
      keepAlive.loop = true
      keepAlive.volume = 0.01
      keepAlive.setAttribute('playsinline', '')
    }
    void keepAlive.play().catch(() => {})
  } else keepAlive?.pause()
}

function playBuffer(buffer: AudioBuffer, volume: number, when: number, bus: GainNode) {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const g = ctx.createGain()
  g.gain.value = volume
  src.connect(g).connect(bus)
  src.start(ctx.currentTime + when)
}

export function bell(kind: BellSound, volume: number, when = 0) {
  if (!ctx || !master || !fx || volume <= 0) return
  // The bus it was struck on, so a recording still loading when the bells are hushed stays hushed.
  const bus = fx
  if (kind === 'soft') {
    synthBell(volume, when, bus)
    return
  }
  void load(kind).then(buffer => (buffer ? playBuffer(buffer, volume * 0.9, when, bus) : synthBell(volume, when, bus)))
}

function synthBell(volume: number, when: number, bus: GainNode) {
  if (!ctx) return
  const t0 = ctx.currentTime + when
  const out = ctx.createGain()
  out.gain.value = volume * 0.3
  out.connect(bus)
  const partials: [number, number, number][] = [[1, 1, 6], [2.71, 0.45, 4.5], [5.18, 0.2, 3], [8.33, 0.07, 2]]
  for (const [ratio, gain, decay] of partials) {
    for (const detune of [-3, 3]) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.frequency.value = 392 * ratio
      osc.detune.value = detune
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(gain * 0.5, t0 + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
      osc.connect(g).connect(out)
      osc.start(t0)
      osc.stop(t0 + decay + 0.05)
    }
  }
}

export function tick(volume: number) {
  if (!ctx || !fx || volume <= 0) return
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.value = 1046
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.1 * volume, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14)
  osc.connect(g).connect(fx)
  osc.start(t0)
  osc.stop(t0 + 0.16)
}

// Fades out ringing and scheduled bells within about half a second. A struck
// bowl otherwise rings for 26 seconds, on into whatever comes next.
export function hushBells() {
  if (!ctx || !master) return
  const old = fx
  fx = ctx.createGain()
  fx.connect(master)
  if (old) {
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
    setTimeout(() => old.disconnect(), 600)
  }
}

// Ends every sound: bells and the ambient loop.
export function silence() {
  hushBells()
  setAmbient('none', 0, 0.1)
}

// The practice has already let go of the audio session when the closing bell
// starts, so the bell holds it open until the last strike has rung out.
// Otherwise a locked phone can suspend the page between strikes.
export function endChime(kind: BellSound, volume: number) {
  setKeepAlive(true)
  lingerTimer = window.setTimeout(() => keepAlive?.pause(), 12_000)
  bell(kind, volume, 0)
  bell(kind, volume * 0.8, 3)
  bell(kind, volume * 0.65, 6)
}

// Ambient loops overlap their own ends with a crossfade, so any recording
// loops without a seam.
type AmbientVoice = { kind: Ambient; gain: GainNode; stop: () => void }
let ambient: AmbientVoice | null = null
const FADE = 4

function loopBuffer(buffer: AudioBuffer, out: GainNode) {
  let stopped = false
  let timer = 0
  const sources: AudioBufferSourceNode[] = []
  const schedule = (at: number) => {
    if (stopped || !ctx) return
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    src.buffer = buffer
    src.connect(g).connect(out)
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(1, at + FADE)
    const end = at + buffer.duration
    g.gain.setValueAtTime(1, end - FADE)
    g.gain.linearRampToValueAtTime(0, end)
    src.start(at)
    src.stop(end + 0.1)
    sources.push(src)
    src.onended = () => sources.splice(sources.indexOf(src), 1)
    const nextAt = end - FADE
    timer = window.setTimeout(() => schedule(nextAt), Math.max(0, (nextAt - ctx.currentTime - 2) * 1000))
  }
  schedule(ctx!.currentTime + 0.05)
  return () => {
    stopped = true
    clearTimeout(timer)
    for (const s of sources) s.stop()
  }
}

function deepNoise(out: GainNode) {
  const context = ctx!
  const rate = context.sampleRate
  const buffer = context.createBuffer(1, rate * 10, rate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  const src = context.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 500
  src.connect(filter).connect(out)
  src.start()
  return () => src.stop()
}

// `fade` is the time constant of the fade-out. The loop is cut after five of
// them, when it is below one percent of its volume.
export function setAmbient(kind: Ambient, volume: number, fade = 0.7) {
  if (!ctx || !master) return
  const context = ctx
  if (ambient && (ambient.kind !== kind || kind === 'none')) {
    const old = ambient
    old.gain.gain.cancelScheduledValues(context.currentTime)
    old.gain.gain.setTargetAtTime(0, context.currentTime, fade)
    setTimeout(() => old.stop(), fade * 5000)
    ambient = null
  }
  if (kind === 'none') return
  if (!ambient) {
    const gain = context.createGain()
    gain.gain.value = 0
    gain.connect(master)
    const voice: AmbientVoice = { kind, gain, stop: () => {} }
    ambient = voice
    if (kind === 'deep') voice.stop = deepNoise(gain)
    else
      void load(kind).then(buffer => {
        if (buffer && ambient === voice) voice.stop = loopBuffer(buffer, gain)
      })
  }
  ambient.gain.gain.setTargetAtTime(volume * 0.8, context.currentTime, 0.9)
}

let silentUrl: string | null = null
function silentWavUrl() {
  if (silentUrl) return silentUrl
  const rate = 8000
  const samples = rate
  const view = new DataView(new ArrayBuffer(44 + samples * 2))
  const text = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  silentUrl = URL.createObjectURL(new Blob([view], { type: 'audio/wav' }))
  return silentUrl
}
