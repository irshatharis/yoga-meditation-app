import { createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Portal } from '@solidjs/web'
import { useNavigate } from '@solidjs/router'
import { Figure } from '../figure/Figure'
import { bounds, solve, type FigurePose } from '../figure/skeleton'
import type { Practice } from '../domain/types'
import { useApp } from '../state/app'
import { estimateSec } from '../domain/timeline'
import { Icon } from './icons'

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const pressed = (on: boolean) => (on ? 'true' : 'false')

export const minutes = (sec: number) => {
  const m = Math.round(sec / 60)
  return m < 1 ? '<1 min' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`
}

export const clock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

// The router stamps every history entry with its depth. An entry deeper than
// the one the app opened on means there is a page of ours to go back to.
const openedAt: number = history.state?._depth ?? history.length - 1

export function useBack(fallback: () => string) {
  const navigate = useNavigate()
  return () => ((history.state?._depth ?? openedAt) > openedAt ? history.back() : navigate(fallback(), { replace: true }))
}

export const KIND_LABEL: Record<Practice['kind'], string> = { yoga: 'Yoga', meditation: 'Meditation', breath: 'Breathwork' }

export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" class="switch" aria-checked={pressed(props.checked)} aria-label={props.label} onClick={() => props.onChange(!props.checked)} />
}

export function Stepper(props: { value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void; label: string }) {
  const set = (v: number) => props.onChange(Math.min(props.max, Math.max(props.min, Math.round(v / props.step) * props.step)))
  return (
    <div class="stepper" role="group" aria-label={props.label}>
      <button type="button" aria-label={`Less ${props.label}`} disabled={props.value <= props.min} onClick={() => set(props.value - props.step)}>
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite">{props.format ? props.format(props.value) : props.value}</output>
      <button type="button" aria-label={`More ${props.label}`} disabled={props.value >= props.max} onClick={() => set(props.value + props.step)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

export function Segmented<T extends string | number>(props: { value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div class="segmented" role="group" aria-label={props.label}>
      <For each={props.options}>
        {o => (
          <button type="button" aria-pressed={pressed(props.value === o.value)} onClick={() => props.onChange(o.value)}>
            {o.label}
          </button>
        )}
      </For>
    </div>
  )
}

export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: JSX.Element }) {
  return (
    <Show when={props.open}>
      <SheetPanel title={props.title} onClose={props.onClose}>
        {props.children}
      </SheetPanel>
    </Show>
  )
}

const focusables = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]')]

function SheetPanel(props: { onClose: () => void; title: string; children: JSX.Element }) {
  const opener = document.activeElement
  onCleanup(() => {
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  })
  const onKeyDown = (e: KeyboardEvent & { currentTarget: HTMLElement }) => {
    if (e.key === 'Escape') return props.onClose()
    if (e.key !== 'Tab') return
    const all = focusables(e.currentTarget)
    const edge = e.shiftKey ? all[0] : all.at(-1)
    if (document.activeElement === edge) {
      e.preventDefault()
      ;(e.shiftKey ? all.at(-1) : all[0])?.focus()
    }
  }
  return (
    <Portal>
      <div class="scrim" onClick={() => props.onClose()} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={props.title} onKeyDown={onKeyDown} ref={el => queueMicrotask(() => focusables(el)[0]?.focus())}>
        {props.children}
      </div>
    </Portal>
  )
}

const [toastState, setToastState] = createSignal<{ text: string; action?: { label: string; run: () => void } } | null>(null)
let toastTimer = 0

export function toast(text: string, action?: { label: string; run: () => void }) {
  clearTimeout(toastTimer)
  setToastState({ text, action })
  toastTimer = window.setTimeout(() => setToastState(null), action ? 6000 : 3200)
}

export function Toaster() {
  return (
    <Show when={toastState()}>
      {t => (
        <div class="toast" role="status">
          <span>{t().text}</span>
          <Show when={t().action}>
            {a => (
              <button
                type="button"
                onClick={() => {
                  a().run()
                  setToastState(null)
                }}
              >
                {a().label}
              </button>
            )}
          </Show>
        </div>
      )}
    </Show>
  )
}

export function PracticeArt(props: { practice: Practice; class?: string }) {
  const app = useApp()
  // The most expansive figure in the sequence reads best as a thumbnail.
  const figure = createMemo(() => {
    let best: FigurePose | null = null
    let bestArea = 0
    for (const item of props.practice.items) {
      const ids = item.type === 'pose' ? [item.pose] : item.type === 'flow' ? item.steps.map(s => s.pose) : []
      for (const id of ids) {
        const f = app.pose(id)?.figure
        if (!f) continue
        const b = bounds(solve(f))
        const area = (b.maxX - b.minX) * (b.maxY - b.minY)
        if (area > bestArea) {
          best = f
          bestArea = area
        }
      }
    }
    return best
  })
  const color = () => (props.practice.kind === 'meditation' ? 'var(--dusk)' : 'var(--tide)')
  return (
    <div class={['art', props.practice.kind, props.class]}>
      <Show when={props.practice.kind === 'yoga' && figure()} fallback={<div class="orb-art" style={{ '--c': color() }} />}>
        {f => <Figure pose={f()} mat={false} title="" />}
      </Show>
    </div>
  )
}

export function PracticeCard(props: { practice: Practice }) {
  const app = useApp()
  const total = () => estimateSec(props.practice, app.poses(), app.settings)
  return (
    <a class="pcard" href={`/practices/${props.practice.id}`}>
      <PracticeArt practice={props.practice} />
      <div>
        <div class="row" style={{ gap: '6px' }}>
          <span class={['tag', props.practice.kind]}>{KIND_LABEL[props.practice.kind]}</span>
          <span class="tag">
            <Icon name="clock" size={12} />
            {props.practice.adjustable ? 'Any length' : minutes(total())}
          </span>
        </div>
        <h3>{props.practice.title}</h3>
        <p>{props.practice.summary}</p>
      </div>
    </a>
  )
}

export function download(name: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
