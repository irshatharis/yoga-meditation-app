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

// Speaks one sentence at a time and only starts the next once the browser
// reports the last one finished. Calling speak() straight after cancel() is
// what doubled lines on phones, so an interrupted line is waited out first.
export function createSpeaker(options: () => VoiceOptions): Speaker {
  const createdAt = Date.now()
  let locked: { uri: string | null; voice: SpeechSynthesisVoice | null } | null = null
  let queue: string[] = []
  let topic: number | null = null
  let current: SpeechSynthesisUtterance | null = null
  let watchdog = 0
  let waiting = 0

  const voice = (): SpeechSynthesisVoice | null | undefined => {
    const uri = options().voiceURI
    if (locked && locked.uri === uri) return locked.voice
    const voices = listVoices()
    if (!voices.length && Date.now() - createdAt < VOICES_WAIT_MS) return undefined
    locked = { uri, voice: chooseVoice(uri, voices) }
    return locked.voice
  }

  const settle = (u: SpeechSynthesisUtterance) => {
    if (current !== u) return
    current = null
    clearTimeout(watchdog)
    pump()
  }

  function pump() {
    const s = synth()
    if (!s || current || !queue.length) return
    const v = voice()
    if (v === undefined) {
      clearTimeout(waiting)
      waiting = window.setTimeout(pump, 200)
      return
    }
    const text = queue.shift()!
    const { rate, volume } = options()
    const u = new SpeechSynthesisUtterance(text)
    if (v) u.voice = v
    u.lang = v?.lang ?? navigator.language
    u.rate = rate
    u.volume = Math.min(1, Math.max(0.2, volume + 0.3))
    u.onend = () => settle(u)
    u.onerror = () => settle(u)
    current = u
    // Some engines never report the end of a line. Move on once it surely finished.
    watchdog = window.setTimeout(() => {
      if (current !== u) return
      s.cancel()
      settle(u)
    }, 4000 + (text.length * 120) / rate)
    if (s.paused) s.resume()
    s.speak(u)
  }

  const interrupt = () => {
    queue = []
    clearTimeout(waiting)
    const u = current
    const s = synth()
    if (!u || !s) return
    s.cancel()
    clearTimeout(watchdog)
    watchdog = window.setTimeout(() => settle(u), 250)
  }

  return {
    say(text, next) {
      if (next !== topic) {
        topic = next
        interrupt()
      }
      // Chrome cuts a single utterance off after about fifteen seconds.
      for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? []) if (sentence.trim()) queue.push(sentence.trim())
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
