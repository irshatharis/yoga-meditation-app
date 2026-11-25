// The one video element every practice shows its poses in. An iPhone (in Low
// Power Mode, say) lets a video start without a tap only if that same element
// was once started from one. The tap that begins a practice comes before the
// player exists, so the element outlives every player and is started here.
let element: HTMLVideoElement | null = null

export function stageElement(): HTMLVideoElement {
  if (!element) {
    element = document.createElement('video')
    element.className = 'pose-video'
    element.muted = true
    element.loop = true
    element.playsInline = true
    element.setAttribute('playsinline', '')
    element.preload = 'auto'
  }
  return element
}

// Call from a tap.
export function primeStage() {
  void stageElement()
    .play()
    .catch(() => {})
}

// Leaves the element empty and still for the next practice.
export function clearStage() {
  if (!element) return
  element.pause()
  element.removeAttribute('src')
  element.style.backgroundImage = ''
  element.classList.remove('mirrored')
  element.load()
  element.remove()
}
