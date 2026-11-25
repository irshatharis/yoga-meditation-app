import type { Page } from '@playwright/test'

// Records wake lock calls so tests can assert the screen is held awake.
export async function stubWakeLock(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __wake: string[] }
    w.__wake = []
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async (type: string) => {
          w.__wake.push(`request:${type}`)
          const sentinel = {
            released: false,
            async release() {
              sentinel.released = true
              w.__wake.push('release')
            },
            addEventListener() {},
            removeEventListener() {}
          }
          return sentinel
        }
      }
    })
  })
}

export const wakeLog = (page: Page) => page.evaluate(() => (window as unknown as { __wake: string[] }).__wake)

export const secondsLeft = async (page: Page) => {
  const text = (await page.locator('.player-foot .tabular').last().textContent()) ?? ''
  const parts = text.replace(' left', '').split(':').map(Number)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

// A value stored under `key` in IndexedDB, so a test can wait for a write to land.
export const stored = (page: Page, key: string) =>
  page.evaluate(
    key =>
      new Promise<unknown>(resolve => {
        const req = indexedDB.open('still')
        req.onsuccess = () => {
          const get = req.result.transaction('kv').objectStore('kv').get(key)
          get.onsuccess = () => {
            req.result.close()
            resolve(get.result)
          }
        }
      }),
    key
  )

type Saved = { savedAt: number; player: { phase: { status: string; posMs?: number; originMs?: number }; timeline: { segments: { title: string; durationSec: number }[] } } }

// The status and step of the session saved for resuming.
export async function savedSession(page: Page) {
  const s = (await stored(page, 'active')) as Saved | undefined
  if (!s) return 'none'
  const { phase, timeline } = s.player
  let pos = phase.status === 'running' ? s.savedAt - phase.originMs! : phase.posMs!
  const step = timeline.segments.find(seg => (pos -= seg.durationSec * 1000) < 0)
  return `${phase.status} ${step?.title}`
}

// Records every spoken line so tests can check what the voice said.
export async function spySpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __said: string[] }
    w.__said = []
    // Patched on the prototype because WebKit ignores an own property on speechSynthesis.
    const speak = SpeechSynthesis.prototype.speak
    SpeechSynthesis.prototype.speak = function (this: SpeechSynthesis, u: SpeechSynthesisUtterance) {
      if (u.text.trim()) w.__said.push(u.text)
      speak.call(this, u)
    }
  })
}

export const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said)

export type Spoken = { text: string; voice: string; overlap: boolean; lost: boolean }

// A speech engine on the page clock that behaves like Safari on a phone: the
// voice list arrives late and lines take time to say. cancel() reports the cut
// line's error from inside itself, and a line spoken then, or within 120 ms of
// a cancel, is silently lost. `endless` lines never report their end, as
// happens to a phone's engine now and then; it is a pattern matched against each line. Each line records whether another
// was still being said, and whether it was lost.
export async function fakeSpeech(page: Page, options: { endless?: string } = {}) {
  await page.addInitScript(endless => {
    type Line = { text: string; voice: { name: string } | null; onstart?: () => void; onend?: () => void; onerror?: () => void }
    const w = window as unknown as { __spoken: Spoken[] }
    w.__spoken = []
    const voice = (name: string, lang: string, isDefault: boolean) => ({ name, lang, voiceURI: name, localService: true, default: isDefault })
    const voices: ReturnType<typeof voice>[] = []
    const listeners = new Set<() => void>()
    const neverEnds = endless ? new RegExp(endless) : null
    let current: Line | null = null
    let cancelling = false
    let cancelledAt = -Infinity
    setTimeout(() => {
      voices.push(voice('Daniel', 'en-GB', false), voice('Samantha', 'en-US', true))
      for (const fn of listeners) fn()
    }, 300)
    const engine = {
      paused: false,
      get speaking() {
        return current !== null
      },
      pending: false,
      getVoices: () => voices.slice(),
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      resume() {},
      pause() {},
      speak(u: Line) {
        if (!u.text.trim()) return
        const lost = cancelling || Date.now() - cancelledAt < 120
        w.__spoken.push({ text: u.text, voice: u.voice?.name ?? '', overlap: !lost && current !== null, lost })
        if (lost) return
        current = u
        u.onstart?.()
        if (neverEnds?.test(u.text)) return
        setTimeout(() => {
          if (current !== u) return
          current = null
          u.onend?.()
        }, 400 + u.text.length * 50)
      },
      cancel() {
        cancelledAt = Date.now()
        const u = current
        current = null
        cancelling = true
        u?.onerror?.()
        cancelling = false
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      voice = null
      lang = ''
      rate = 1
      volume = 1
      constructor(public text: string) {}
    }
  }, options.endless ?? null)
}

export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken)
