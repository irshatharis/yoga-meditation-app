import type { Cue } from '../domain/timeline'
import type { Settings } from '../domain/types'
import { bell, endChime, preloadSounds, tick, unlockAudio } from './audio'
import { hush, primeSpeech, speak } from './speech'

// Call from the tap that starts a practice. Audio and speech both need a
// user gesture before they are allowed to make sound later on.
let primedAt = 0
export function primeForPractice(settings?: Settings) {
  unlockAudio()
  primeSpeech()
  if (settings) preloadSounds(settings.sound.bell, settings.sound.ambient)
  primedAt = Date.now()
}

// True right after a start tap, so the player may begin without a second tap.
export const recentlyPrimed = () => Date.now() - primedAt < 4000

export function playCue(cue: Cue, settings: Settings) {
  if (cue.sound === 'bell') bell(settings.sound.bell, settings.sound.volume)
  else if (cue.sound === 'tick') tick(settings.sound.volume)
  else if (cue.sound === 'end') endChime(settings.sound.bell, settings.sound.volume)
  if (cue.say && settings.voice.enabled) {
    speak(cue.say, { voiceURI: settings.voice.voiceURI, rate: settings.voice.rate, volume: settings.sound.volume }, cue.sound === 'bell')
  }
}

export function stopVoice() {
  hush()
}

export function vibrate(settings: Settings, pattern: number | number[]) {
  if (settings.haptics && 'vibrate' in navigator) navigator.vibrate(pattern)
}

type Handlers = { play: () => void; pause: () => void; next: () => void; prev: () => void; stop: () => void }

export function mediaSession(handlers: Handlers) {
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null
  if (!ms) return { update() {}, dispose() {} }
  const set = (action: MediaSessionAction, fn: (() => void) | null) => {
    try {
      ms.setActionHandler(action, fn)
    } catch {
      // Unsupported action on this platform.
    }
  }
  let disposed = false
  set('play', handlers.play)
  set('pause', handlers.pause)
  set('nexttrack', handlers.next)
  set('previoustrack', handlers.prev)
  set('stop', handlers.stop)
  return {
    update(info: { title: string; practice: string; playing: boolean; posSec: number; totalSec: number }) {
      if (disposed) return
      ms.metadata = new MediaMetadata({
        title: info.title,
        artist: info.practice,
        album: 'still.',
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      })
      ms.playbackState = info.playing ? 'playing' : 'paused'
      try {
        ms.setPositionState({ duration: Math.max(1, info.totalSec), position: Math.min(info.posSec, info.totalSec), playbackRate: 1 })
      } catch {
        // Position state is optional.
      }
    },
    dispose() {
      disposed = true
      for (const a of ['play', 'pause', 'nexttrack', 'previoustrack', 'stop'] as const) set(a, null)
      ms.metadata = null
      ms.playbackState = 'none'
    }
  }
}
