import { createSignal, onCleanup } from 'solid-js'
import { deviceFor, installWay, type Device, type InstallWay } from './domain/install'
import { registerSW } from 'virtual:pwa-register'
import { DEMOS, demoSrc } from './content/demos'
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
      void navigator.serviceWorker.ready.then(saveVideos).catch(() => {})
      setInterval(() => void registration.update().catch(() => {}), 60 * 60 * 1000)
    }
  })
}

// Every pose video is kept on the device so practices work offline. The
// service worker's 'pose-videos' cache serves them, cutting byte ranges from
// these whole copies. Clips no longer listed are dropped.
async function saveVideos() {
  const cache = await caches.open('pose-videos')
  const wanted = new Set(Object.keys(DEMOS).map(demoSrc))
  const have = new Set<string>()
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname
    if (wanted.has(path)) have.add(path)
    else await cache.delete(request)
  }
  for (const url of wanted) if (!have.has(url)) await cache.add(url).catch(() => {})
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()
const changed = () => listeners.forEach(f => f())
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferred = e as InstallPrompt
  changed()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  installed = true
  changed()
})

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

const currentWay = () => installWay({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints, standalone: installed || isStandalone(), canPrompt: deferred !== null })

// Chromium offers its install dialog some time after load, and only once it
// decides the page is installable, so the way can change while a screen is open.
export function useInstallWay() {
  const [way, setWay] = createSignal<InstallWay>(currentWay())
  const update = () => setWay(currentWay())
  listeners.add(update)
  onCleanup(() => listeners.delete(update))
  return way
}

export async function promptInstall() {
  if (!deferred) return
  const prompt = deferred
  deferred = null
  await prompt.prompt()
  if ((await prompt.userChoice).outcome === 'accepted') installed = true
  changed()
}

export const thisDevice = (): Device => deviceFor({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints })
