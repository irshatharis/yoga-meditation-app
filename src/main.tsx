import { render } from '@solidjs/web'
import { For, createSignal, onSettled } from 'solid-js'
import { Figure } from './figure/Figure'
import { proto } from './figure/proto-poses'
import { blend, type FigurePose } from './figure/skeleton'

function Morph() {
  const keys = Object.keys(proto)
  const [t, setT] = createSignal(0)
  onSettled(() => {
    let raf = 0
    const tick = (now: number) => { setT(now / 1600); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })
  const pose = (): FigurePose => {
    const i = Math.floor(t()) % keys.length
    const a = proto[keys[i]!]!, b = proto[keys[(i + 1) % keys.length]!]!
    const f = Math.min(1, (t() % 1) * 1.6)
    return blend(a, b, f * f * (3 - 2 * f))
  }
  return <Figure pose={pose()} />
}

render(() => (
  <main style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 220px)', gap: '12px', padding: '16px', background: '#f5f0e6', '--fig': '#c46b4f', '--fig-far': '#9c4f39', '--fig-shadow': 'rgba(60,40,20,.12)', '--fig-mat': '#e2d6c2' } as any}>
    <For each={Object.entries(proto)}>{([name, pose]) => (
      <figure style={{ margin: 0, background: '#fbf8f2', 'border-radius': '16px', padding: '8px' }}>
        <Figure pose={pose} />
        <figcaption style={{ 'text-align': 'center', font: '13px system-ui' }}>{name}</figcaption>
      </figure>
    )}</For>
    <figure id="morph" style={{ margin: 0, background: '#fbf8f2', 'border-radius': '16px', padding: '8px' }}><Morph /><figcaption>morph</figcaption></figure>
  </main>
), document.getElementById('root')!)
