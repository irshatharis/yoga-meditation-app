// Text-to-speech through the browser's own voices, so it works offline.

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)

const QUALITY = /(premium|enhanced|natural|neural|siri)/i

export const listVoices = (): SpeechSynthesisVoice[] => synth()?.getVoices() ?? []

// Browsers fill the voice list some time after load, and Chrome fills it in more than one go.
export function subscribeVoices(fn: (voices: SpeechSynthesisVoice[]) => void): () => void {
  const s = synth()
  if (!s) return () => {}
  const run = () => fn(listVoices())
  s.addEventListener('voiceschanged', run)
  run()
  return () => s.removeEventListener('voiceschanged', run)
}

const lang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-')

// Only on-device voices are considered unless one was chosen by name. A
// network voice that stalls makes the browser fall back to another voice,
// which is how a second accent crept in mid-practice.
export function chooseVoice(uri: string | null, voices = listVoices()): SpeechSynthesisVoice | null {
  const chosen = uri ? voices.find(v => v.voiceURI === uri) : undefined
  if (chosen) return chosen
  const locale = (navigator.language || 'en-US').toLowerCase()
  const base = locale.slice(0, 2)
  const local = voices.filter(v => v.localService)
  const pool = local.length ? local : voices
  const best = (list: SpeechSynthesisVoice[]) => list.find(v => QUALITY.test(v.name)) ?? list[0]
  return (
    pool.find(v => v.default && lang(v).startsWith(base)) ??
    best(pool.filter(v => lang(v) === locale)) ??
    best(pool.filter(v => lang(v).startsWith(base))) ??
    best(pool.filter(v => lang(v).startsWith('en'))) ??
    pool[0] ??
    null
  )
}

export type VoiceOptions = { voiceURI: string | null; rate: number; volume: number }

export type Speaker = {
  // Lines with the same topic play in order. A line with a new topic first
  // drops whatever the old topic still had to say.
  say(text: string, topic: number): void
  stop(): void
}

// Waits this long for the voice list before speaking with the device default.
const VOICES_WAIT_MS = 1500
// The engine is left alone this long after any cancel. Safari drops a line
// spoken straight after cancel(), and fires the cancelled line's end inside
// cancel() itself, so a line started from that event is lost too.
const AFTER_CANCEL_MS = 250
// A line the engine has not started by now, while saying it is idle, was dropped.
const START_WAIT_MS = 2000
// A new step's first line waits this long, so tapping through several steps
// stays quiet instead of starting and cutting off a line on every tap.
const NEW_STEP_MS = 400

type Line = { text: string; retry: boolean }
type Speaking = Line & { utterance: SpeechSynthesisUtterance; started: boolean; sentAt: number; deadline: number }

// Speaks one sentence at a time. Every decision happens in `pump`, which reads
// the state, takes at most one step and books its own next look, so it is
// safe to call at any moment and never runs inside an engine event.
export function createSpeaker(options: () => VoiceOptions): Speaker {
  const createdAt = Date.now()
  let locked: { uri: string | null; voice: SpeechSynthesisVoice | null } | null = null
  let queue: Line[] = []
  let topic: number | null = null
  let current: Speaking | null = null
  let quietUntil = 0
  let timer = 0

  const voice = (): SpeechSynthesisVoice | null | undefined => {
    const uri = options().voiceURI
    if (locked && locked.uri === uri) return locked.voice
    const voices = listVoices()
    if (!voices.length && Date.now() - createdAt < VOICES_WAIT_MS) return undefined
    locked = { uri, voice: chooseVoice(uri, voices) }
    return locked.voice
  }

  const later = (ms: number) => {
    clearTimeout(timer)
    timer = window.setTimeout(pump, Math.max(0, ms))
  }

  // `current` is cleared first, so events the engine fires from inside cancel() find nothing to act on.
  const cancel = (s: SpeechSynthesis) => {
    current = null
    s.cancel()
    quietUntil = Date.now() + AFTER_CANCEL_MS
  }

  function pump() {
    const s = synth()
    if (!s) return
    const now = Date.now()
    if (current) {
      const line = current
      if (!line.started && now - line.sentAt >= START_WAIT_MS && !s.speaking && !s.pending) {
        cancel(s)
        if (!line.retry) queue.unshift({ text: line.text, retry: true })
      } else if (now >= line.deadline) cancel(s)
      else {
        const startBy = line.sentAt + START_WAIT_MS
        return later((line.started ? line.deadline : now < startBy ? startBy : Math.min(line.deadline, now + 500)) - now)
      }
    }
    if (!queue.length) return
    if (now < quietUntil) return later(quietUntil - now)
    const v = voice()
    if (v === undefined) return later(200)
    const next = queue.shift()!
    const { rate, volume } = options()
    const u = new SpeechSynthesisUtterance(next.text)
    if (v) u.voice = v
    u.lang = v?.lang ?? navigator.language
    u.rate = rate
    u.volume = Math.min(1, Math.max(0.2, volume + 0.3))
    // Some engines never report the end of a line. Move on once it surely finished.
    const line: Speaking = { ...next, utterance: u, started: false, sentAt: now, deadline: now + 4000 + (next.text.length * 120) / rate }
    u.onstart = () => {
      if (current === line) line.started = true
    }
    u.onend = u.onerror = () => {
      if (current !== line) return
      current = null
      later(0)
    }
    current = line
    if (s.paused) s.resume()
    s.speak(u)
    later(START_WAIT_MS)
  }

  const interrupt = () => {
    queue = []
    const s = synth()
    if (current && s) cancel(s)
  }

  return {
    say(text, next) {
      if (next !== topic) {
        topic = next
        interrupt()
        quietUntil = Math.max(quietUntil, Date.now() + NEW_STEP_MS)
      }
      // Chrome cuts a single utterance off after about fifteen seconds.
      for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? []) if (sentence.trim()) queue.push({ text: sentence.trim(), retry: false })
      pump()
    },
    stop() {
      topic = null
      interrupt()
    }
  }
}

// iOS only speaks after speech was first triggered inside a tap.
export function primeSpeech() {
  const s = synth()
  if (!s) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  s.speak(u)
}
