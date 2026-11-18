// Text-to-speech through the browser's own voices, so it works offline.

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const PREFERRED = /(premium|enhanced|natural|neural|siri|samantha|serena|karen|moira|tessa|daniel|google uk english female|google us english|aria|jenny|libby|sonia)/i

export function listVoices(): SpeechSynthesisVoice[] {
  if (!supported()) return []
  return speechSynthesis.getVoices()
}

export function onVoicesChanged(fn: () => void) {
  if (!supported()) return () => {}
  speechSynthesis.addEventListener('voiceschanged', fn)
  return () => speechSynthesis.removeEventListener('voiceschanged', fn)
}

export function pickVoice(uri: string | null): SpeechSynthesisVoice | undefined {
  const voices = listVoices()
  if (uri) {
    const chosen = voices.find(v => v.voiceURI === uri)
    if (chosen) return chosen
  }
  const lang = (navigator.language || 'en').slice(0, 2)
  const local = voices.filter(v => v.lang.toLowerCase().startsWith(lang))
  const pool = local.length ? local : voices.filter(v => v.lang.startsWith('en'))
  return pool.find(v => PREFERRED.test(v.name) && v.localService) ?? pool.find(v => PREFERRED.test(v.name)) ?? pool.find(v => v.localService) ?? pool[0]
}

export type SpeakOptions = { voiceURI: string | null; rate: number; volume: number }

// Long utterances get cut off in Chrome after about fifteen seconds, so each
// sentence is queued as its own utterance.
export function speak(text: string, options: SpeakOptions, interrupt = false) {
  if (!supported() || !text.trim()) return
  if (interrupt) speechSynthesis.cancel()
  const voice = pickVoice(options.voiceURI)
  for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? [text]) {
    const u = new SpeechSynthesisUtterance(sentence.trim())
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = options.rate
    u.pitch = 0.98
    u.volume = Math.min(1, Math.max(0.2, options.volume + 0.3))
    speechSynthesis.speak(u)
  }
  // Safari sometimes leaves the queue paused after an interruption.
  if (speechSynthesis.paused) speechSynthesis.resume()
}

export function hush() {
  if (supported()) speechSynthesis.cancel()
}

// iOS only speaks after speech was first triggered inside a tap.
export function primeSpeech() {
  if (!supported()) return
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  speechSynthesis.speak(u)
}
