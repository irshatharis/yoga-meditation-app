import type { Cue } from '../domain/timeline'
import type { Settings } from '../domain/types'
import { bell, endChime, preloadSounds, tick, unlockAudio } from './audio'
import { primeSpeech, type Speaker } from './speech'

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

// `topic` groups the lines of one step, so a new step cuts off the last one's leftovers.
export function playCue(cue: Cue, settings: Settings, speaker: Speaker, topic: number) {
  if (cue.sound === 'bell') bell(settings.sound.bell, settings.sound.volume)
  else if (cue.sound === 'tick') tick(settings.sound.volume)
  else if (cue.sound === 'end') endChime(settings.sound.bell, settings.sound.volume)
  if (cue.say && settings.voice.enabled) speaker.say(cue.say, topic)
}

export function vibrate(settings: Settings, pattern: number | number[]) {
  if (settings.haptics && 'vibrate' in navigator) navigator.vibrate(pattern)
}

export type NowPlaying = { title: string; practice: string; playing: boolean }

// Shows the current step on the lock screen. It registers no play or pause
// handlers, so only the buttons in the app start and stop a practice. The page
// cannot tell a person's lock-screen tap from one the system sends on its own.
export function showNowPlaying(info: NowPlaying | null) {
  if (!('mediaSession' in navigator)) return
  const ms = navigator.mediaSession
  if (!info) {
    ms.metadata = null
    ms.playbackState = 'none'
    return
  }
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
}
