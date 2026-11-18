// Keeps the screen on while a practice runs.
//
// Screen Wake Lock is the real mechanism (all current browsers, and iOS home
// screen apps since 18.4). The system drops the lock whenever the page is
// hidden, so it is re-requested on every return to the foreground. Where the
// API is missing or refuses, a muted, inline, looping video does the same job.

type Sentinel = { released: boolean; release(): Promise<void>; addEventListener(t: 'release', f: () => void): void }
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }

export type AwakeState = 'off' | 'lock' | 'video' | 'unavailable'

export function createKeepAwake(onChange: (state: AwakeState) => void) {
  let wanted = false
  let sentinel: Sentinel | null = null
  let video: HTMLVideoElement | null = null

  const startVideo = async () => {
    if (!video) {
      video = document.createElement('video')
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('aria-hidden', 'true')
      video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;bottom:0;left:0'
      const webm = document.createElement('source')
      webm.src = '/media/keepawake.webm'
      webm.type = 'video/webm'
      const mp4 = document.createElement('source')
      mp4.src = '/media/keepawake.mp4'
      mp4.type = 'video/mp4'
      video.append(webm, mp4)
      document.body.append(video)
    }
    try {
      await video.play()
      onChange('video')
    } catch {
      onChange('unavailable')
    }
  }

  const acquire = async () => {
    if (!wanted || document.visibilityState !== 'visible') return
    if (sentinel && !sentinel.released) return
    const api = (navigator as WakeLockNavigator).wakeLock
    if (api) {
      try {
        sentinel = await api.request('screen')
        sentinel.addEventListener('release', () => {
          if (wanted) onChange('off')
        })
        if (!wanted) {
          void sentinel.release()
          return
        }
        onChange('lock')
        return
      } catch {
        // Denied (battery saver, iframe policy). Fall through to the video.
      }
    }
    await startVideo()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void acquire()
  }
  document.addEventListener('visibilitychange', onVisible)

  return {
    // Must first be called from a tap so the video fallback is allowed to play.
    on() {
      wanted = true
      void acquire()
    },
    off() {
      wanted = false
      void sentinel?.release().catch(() => {})
      sentinel = null
      video?.pause()
      onChange('off')
    },
    dispose() {
      this.off()
      document.removeEventListener('visibilitychange', onVisible)
      video?.remove()
      video = null
    }
  }
}
