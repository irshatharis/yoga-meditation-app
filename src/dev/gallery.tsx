import { render } from '@solidjs/web'
import { For, Show, createSignal, onSettled } from 'solid-js'
import { Figure } from '../figure/Figure'
import { blend, mirror, type FigurePose } from '../figure/skeleton'
import { POSES } from '../content/poses'
import type { Pose } from '../domain/types'

// Dev-only page: every built-in figure, its mirrored left side, and morph strips.
// Query params: ?size=320 for larger cards, ?ids=tree,cat to filter, ?morph=0 to hide strips.
const params = new URLSearchParams(location.search)
const size = Number(params.get('size') ?? 200)
const only = params.get('ids')?.split(',')
const showMorph = params.get('morph') !== '0'
const shown = only ? POSES.filter(p => only.includes(p.id)) : POSES

const byId = new Map(POSES.map(p => [p.id as string, p]))
const figureOf = (id: string): FigurePose => {
  const f = byId.get(id)?.figure
  if (!f) throw new Error(`no figure for ${id}`)
  return f
}

const SEQUENCES: string[][] = [
  ['mountain', 'upward-salute', 'standing-forward-fold', 'halfway-lift', 'plank', 'chaturanga', 'upward-dog', 'downward-dog'],
  ['tabletop', 'cat', 'cow', 'child', 'downward-dog', 'low-lunge', 'warrior-1', 'warrior-2', 'reverse-warrior', 'extended-side-angle']
]
const STEPS = [0, 0.33, 0.66]

const palette = {
  '--fig': '#c46b4f',
  '--fig-far': '#9c4f39',
  '--fig-shadow': 'rgba(60, 40, 20, 0.12)',
  '--fig-mat': '#e2d6c2',
  '--fig-prop': '#cdbb9c'
}

function Card(props: { pose: Pose }) {
  return (
    <figure class={['card', { wide: props.pose.sided }]}>
      <div class="pair">
        <Figure pose={props.pose.figure!} title={props.pose.name} />
        <Show when={props.pose.sided}>
          <Figure pose={mirror(props.pose.figure!)} title={`${props.pose.name}, left side`} class="left" />
        </Show>
      </div>
      <figcaption>
        <strong>{props.pose.name}</strong>
        <span>{props.pose.id} · {props.pose.figure!.view}{props.pose.sided ? ' · R / L' : ''}</span>
      </figcaption>
    </figure>
  )
}

function Strip(props: { ids: string[] }) {
  const frames = () =>
    props.ids.flatMap((id, i) => {
      const next = props.ids[i + 1]
      if (!next) return [{ label: id, pose: figureOf(id) }]
      return STEPS.map(t => ({ label: t === 0 ? id : '', pose: blend(figureOf(id), figureOf(next), t) }))
    })
  return (
    <div class="strip">
      <For each={frames()}>{f => (
        <figure class="frame">
          <Figure pose={f.pose} mat={false} />
          <figcaption>{f.label}</figcaption>
        </figure>
      )}</For>
    </div>
  )
}

function LiveMorph(props: { ids: string[] }) {
  const [t, setT] = createSignal(0)
  onSettled(() => {
    let raf = 0
    const tick = (now: number) => {
      setT(now / 1800)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })
  const pose = () => {
    const n = props.ids.length
    const i = Math.floor(t()) % n
    const f = Math.min(1, (t() % 1) * 1.6)
    return blend(figureOf(props.ids[i]!), figureOf(props.ids[(i + 1) % n]!), f * f * (3 - 2 * f))
  }
  return <figure class="card"><Figure pose={pose()} /><figcaption><strong>live morph</strong></figcaption></figure>
}

function Gallery() {
  return (
    <main style={{ ...palette, '--size': `${size}px` }}>
      <h1>{shown.length} figures</h1>
      <section class="grid">
        <For each={shown}>{p => <Card pose={p} />}</For>
      </section>
      <Show when={showMorph}>
        <h1>Morphs</h1>
        <For each={SEQUENCES}>{ids => <Strip ids={ids} />}</For>
        <section class="grid"><LiveMorph ids={SEQUENCES[0]!} /></section>
      </Show>
    </main>
  )
}

const style = document.createElement('style')
style.textContent = `
  body { margin: 0; background: #f5f0e6; font: 13px/1.35 system-ui, sans-serif; color: #3a2e25; }
  main { padding: 16px; }
  h1 { font-size: 16px; margin: 8px 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, calc(var(--size) + 16px)); gap: 10px; }
  .wide { grid-column: span 2; }
  .card { margin: 0; background: #fbf8f2; border-radius: 14px; padding: 8px; box-sizing: border-box; }
  .pair { display: flex; gap: 8px; justify-content: space-around; }
  .pair .figure, .card > .figure { width: var(--size); height: auto; display: block; }
  .left { opacity: 0.85; }
  figcaption { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  figcaption span { color: #8a7a6a; font-size: 11px; }
  .strip { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
  .frame { margin: 0; width: calc(var(--size) * 0.6); background: #fbf8f2; border-radius: 10px; }
  .frame .figure { width: 100%; height: auto; display: block; }
  .frame figcaption { font-size: 10px; min-height: 14px; }
`
document.head.append(style)
render(() => <Gallery />, document.getElementById('root')!)
