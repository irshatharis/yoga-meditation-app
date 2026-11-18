import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseVoice, createSpeaker } from '../../src/engine/speech'

type Voice = { name: string; lang: string; voiceURI: string; localService: boolean; default: boolean }
const voice = (name: string, lang: string, extra: Partial<Voice> = {}): Voice => ({ name, lang, voiceURI: name, localService: true, default: false, ...extra })

class Utterance {
  voice: Voice | null = null
  lang = ''
  rate = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

// A speech engine that finishes a line only when the test says so, like a real one that takes time to talk.
function fakeSynth(list: Voice[]) {
  const log: string[] = []
  let speaking: Utterance | null = null
  const synth = {
    voices: list,
    paused: false,
    getVoices: () => synth.voices,
    addEventListener() {},
    removeEventListener() {},
    resume() {},
    speak(u: Utterance) {
      if (speaking) log.push(`OVERLAP ${u.text}`)
      speaking = u
      log.push(`say ${u.text} [${u.voice?.name ?? 'none'}]`)
    },
    cancel() {
      log.push('cancel')
      const u = speaking
      speaking = null
      if (u) setTimeout(() => u.onerror?.(), 30)
    },
    finish() {
      const u = speaking
      speaking = null
      u?.onend?.()
    }
  }
  return { synth, log }
}

let env: ReturnType<typeof fakeSynth>
const options = () => ({ voiceURI: null, rate: 1, volume: 0.7 })

beforeEach(() => {
  vi.useFakeTimers()
  env = fakeSynth([voice('Daniel', 'en-GB'), voice('Samantha', 'en-US', { default: true }), voice('Google US English', 'en-US', { localService: false })])
  vi.stubGlobal('window', { speechSynthesis: env.synth, setTimeout, clearTimeout })
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('navigator', { language: 'en-US' })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('chooseVoice', () => {
  it('prefers the device default in the person’s language and never a network voice', () => {
    expect(chooseVoice(null)?.name).toBe('Samantha')
    env.synth.voices = [voice('Google US English', 'en-US', { localService: false }), voice('Daniel', 'en-GB')]
    expect(chooseVoice(null)?.name).toBe('Daniel')
  })

  it('honours a chosen voice', () => {
    expect(chooseVoice('Daniel')?.name).toBe('Daniel')
  })
})

describe('speaker', () => {
  it('speaks one line at a time, in order', () => {
    const s = createSpeaker(options)
    s.say('Warrior two. Right side.', 1)
    expect(env.log).toEqual(['say Warrior two. [Samantha]'])
    env.synth.finish()
    expect(env.log.at(-1)).toBe('say Right side. [Samantha]')
  })

  it('waits for an interrupted line to end before starting the next step', () => {
    const s = createSpeaker(options)
    s.say('Kneel with your big toes together. Sit your hips back.', 1)
    s.say('Next, Cobra.', 2)
    expect(env.log).toEqual(['say Kneel with your big toes together. [Samantha]', 'cancel'])
    vi.advanceTimersByTime(30)
    expect(env.log).toEqual(['say Kneel with your big toes together. [Samantha]', 'cancel', 'say Next, Cobra. [Samantha]'])
    expect(env.log.join()).not.toContain('OVERLAP')
  })

  it('keeps the same voice for the whole practice when the voice list changes', () => {
    const s = createSpeaker(options)
    s.say('First, Child.', 1)
    env.synth.finish()
    env.synth.voices = [voice('Karen', 'en-AU', { default: true }), ...env.synth.voices]
    s.say('Next, Cobra.', 2)
    expect(env.log.filter(l => l.startsWith('say')).map(l => l.split('[')[1])).toEqual(['Samantha]', 'Samantha]'])
  })

  it('waits for the voice list instead of starting in a different voice', () => {
    const list = env.synth.voices
    env.synth.voices = []
    const s = createSpeaker(options)
    s.say('First, Child.', 1)
    expect(env.log).toEqual([])
    env.synth.voices = list
    vi.advanceTimersByTime(200)
    expect(env.log).toEqual(['say First, Child. [Samantha]'])
  })

  it('moves on when an engine never reports the end of a line', () => {
    const s = createSpeaker(options)
    s.say('Breathe in. Breathe out.', 1)
    vi.advanceTimersByTime(10_000)
    expect(env.log).toContain('say Breathe out. [Samantha]')
  })

  it('goes quiet on stop and drops what was queued', () => {
    const s = createSpeaker(options)
    s.say('One. Two. Three.', 1)
    s.stop()
    vi.advanceTimersByTime(1_000)
    expect(env.log).toEqual(['say One. [Samantha]', 'cancel'])
  })
})
