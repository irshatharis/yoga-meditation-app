import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseVoice, createSpeaker } from '../../src/engine/speech'

type Voice = { name: string; lang: string; voiceURI: string; localService: boolean; default: boolean }
const voice = (name: string, lang: string, extra: Partial<Voice> = {}): Voice => ({ name, lang, voiceURI: name, localService: true, default: false, ...extra })

class Utterance {
  voice: Voice | null = null
  lang = ''
  rate = 1
  volume = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

// How each engine reacts to cancel(), as measured in this repo's probe against real WebKit and Chromium:
// chrome reports the cut line's error 30 ms later; webkit reports it inside cancel() and loses a line
// spoken from that event; ios reports nothing and loses a line spoken within 120 ms of the cancel.
type Flavor = 'chrome' | 'webkit' | 'ios'

// A speech engine that finishes a line only when the test says so, like a real one that takes time to talk.
function fakeSynth(list: Voice[], flavor: Flavor = 'chrome') {
  const log: string[] = []
  let speaking: Utterance | null = null
  let cancelling = false
  let cancelledAt = -Infinity
  const synth = {
    voices: list,
    paused: false,
    pending: false,
    get speaking() {
      return speaking !== null
    },
    getVoices: () => synth.voices,
    addEventListener() {},
    removeEventListener() {},
    resume() {},
    speak(u: Utterance) {
      if (cancelling || (flavor === 'ios' && Date.now() - cancelledAt < 120)) {
        log.push(`lost ${u.text}`)
        return
      }
      if (speaking) log.push(`OVERLAP ${u.text}`)
      speaking = u
      log.push(`say ${u.text} [${u.voice?.name ?? 'none'}]`)
      u.onstart?.()
    },
    cancel() {
      log.push('cancel')
      cancelledAt = Date.now()
      const u = speaking
      speaking = null
      if (!u) return
      if (flavor === 'chrome') setTimeout(() => u.onerror?.(), 30)
      if (flavor === 'webkit') {
        cancelling = true
        u.onerror?.()
        cancelling = false
      }
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
    vi.advanceTimersByTime(400)
    expect(env.log).toEqual(['say Warrior two. [Samantha]'])
    env.synth.finish()
    vi.advanceTimersByTime(0)
    expect(env.log.at(-1)).toBe('say Right side. [Samantha]')
  })

  it('cuts the last step off at once and starts the next a moment later', () => {
    const s = createSpeaker(options)
    s.say('Kneel with your big toes together. Sit your hips back.', 1)
    vi.advanceTimersByTime(400)
    s.say('Next, Cobra.', 2)
    expect(env.log).toEqual(['say Kneel with your big toes together. [Samantha]', 'cancel'])
    vi.advanceTimersByTime(399)
    expect(env.log).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(env.log).toEqual(['say Kneel with your big toes together. [Samantha]', 'cancel', 'say Next, Cobra. [Samantha]'])
  })

  it('stays quiet while the person taps quickly through steps', () => {
    const s = createSpeaker(options)
    for (const [i, text] of ['Next, Child.', 'Next, Cobra.', 'Next, Tree.'].entries()) {
      s.say(text, i)
      vi.advanceTimersByTime(300)
    }
    vi.advanceTimersByTime(100)
    expect(env.log).toEqual(['say Next, Tree. [Samantha]'])
  })

  it('says a line again once when the engine silently dropped it', () => {
    const s = createSpeaker(options)
    env.synth.speak = (u: Utterance) => void env.log.push(`lost ${u.text}`)
    s.say('Next, Cobra.', 1)
    vi.advanceTimersByTime(2_400)
    expect(env.log).toEqual(['lost Next, Cobra.', 'cancel'])
    vi.advanceTimersByTime(2_500)
    expect(env.log).toEqual(['lost Next, Cobra.', 'cancel', 'lost Next, Cobra.', 'cancel'])
    vi.advanceTimersByTime(10_000)
    expect(env.log.filter(l => l.startsWith('lost'))).toHaveLength(2)
  })

  it('keeps the same voice for the whole practice when the voice list changes', () => {
    const s = createSpeaker(options)
    s.say('First, Child.', 1)
    vi.advanceTimersByTime(400)
    env.synth.finish()
    env.synth.voices = [voice('Karen', 'en-AU', { default: true }), ...env.synth.voices]
    s.say('Next, Cobra.', 2)
    vi.advanceTimersByTime(400)
    expect(env.log.filter(l => l.startsWith('say')).map(l => l.split('[')[1])).toEqual(['Samantha]', 'Samantha]'])
  })

  it('waits for the voice list instead of starting in a different voice', () => {
    const list = env.synth.voices
    env.synth.voices = []
    const s = createSpeaker(options)
    s.say('First, Child.', 1)
    vi.advanceTimersByTime(400)
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

  for (const flavor of ['chrome', 'webkit', 'ios'] as const) {
    it(`says every line of the step skipped to, and nothing older, on ${flavor}`, () => {
      env = fakeSynth(env.synth.voices, flavor)
      vi.stubGlobal('window', { speechSynthesis: env.synth, setTimeout, clearTimeout })
      const s = createSpeaker(options)
      // A person skipping on at a reading pace, then quickly, then waiting.
      const steps = ['Next, Child. Kneel down.', 'Next, Cobra. Lie on your front.', 'Next, Mountain.', 'Next, Tree. Stand tall.']
      for (const [i, text] of steps.entries()) {
        s.say(text, i)
        vi.advanceTimersByTime(i < 2 ? 600 : 50)
      }
      const spokenAfterLastSkip = () => env.log.slice(env.log.lastIndexOf('cancel') + 1)
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(300)
        env.synth.finish()
      }
      expect(env.log.join()).not.toContain('OVERLAP')
      expect(env.log.join()).not.toContain('lost')
      expect(spokenAfterLastSkip()).toEqual(['say Next, Tree. [Samantha]', 'say Stand tall. [Samantha]'])
    })

    it(`keeps talking after an engine that never reports the end, on ${flavor}`, () => {
      env = fakeSynth(env.synth.voices, flavor)
      vi.stubGlobal('window', { speechSynthesis: env.synth, setTimeout, clearTimeout })
      const s = createSpeaker(options)
      s.say('Breathe in. Breathe out. Rest.', 1)
      vi.advanceTimersByTime(30_000)
      expect(env.log.filter(l => l.startsWith('say'))).toEqual(['say Breathe in. [Samantha]', 'say Breathe out. [Samantha]', 'say Rest. [Samantha]'])
      expect(env.log.join()).not.toContain('lost')
    })
  }

  it('goes quiet on stop and drops what was queued', () => {
    const s = createSpeaker(options)
    s.say('One. Two. Three.', 1)
    vi.advanceTimersByTime(400)
    s.stop()
    vi.advanceTimersByTime(1_000)
    expect(env.log).toEqual(['say One. [Samantha]', 'cancel'])
  })
})
