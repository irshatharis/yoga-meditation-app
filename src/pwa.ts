import { registerSW } from 'virtual:pwa-register'
import { toast } from './ui/kit'

// Updates wait for the person. An automatic reload in the middle of a
// practice is exactly what the old app did wrong.
export function registerUpdates() {
  if (import.meta.env.DEV) return
  const update = registerSW({
    onNeedRefresh() {
      const offer = () => {
        if (location.pathname.startsWith('/play')) {
          setTimeout(offer, 60_000)
          return
        }
        toast('A new version of still. is ready.', { label: 'Update', run: () => void update(true) })
      }
      offer()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update().catch(() => {}), 60 * 60 * 1000)
    }
  })
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferred = e as InstallPrompt
  listeners.forEach(f => f())
})

export const canPromptInstall = () => deferred !== null
export const onInstallAvailable = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
export async function promptInstall() {
  if (!deferred) return false
  await deferred.prompt()
  const choice = await deferred.userChoice
  deferred = null
  return choice.outcome === 'accepted'
}
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
