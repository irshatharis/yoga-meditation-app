import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { authoredSec, compile, type Segment } from '../domain/timeline'
import { Figure } from '../figure/Figure'
import { primeForPractice } from '../engine/session'
import { encodeShare, newId } from '../store/transfer'
import { Icon } from '../ui/icons'
import { KIND_LABEL, PracticeArt, Segmented, Sheet, clock, minutes, toast, pressed, useBack } from '../ui/kit'
import type { Pose, Practice } from '../domain/types'

const LENGTH_CHOICES = [5, 10, 15, 20, 30, 45, 60]
const SCALES = [
  { value: 0.75, label: 'Shorter' },
  { value: 1, label: 'As written' },
  { value: 1.4, label: 'Longer' }
] as const

export default function PracticeDetail() {
  const app = useApp()
  const params = useParams()
  const practice = createMemo(() => app.practice(params.id ?? ''))
  return (
    <Show when={practice()} fallback={<NotFoundPractice />}>
      {p => <Detail practice={p()} />}
    </Show>
  )
}

function NotFoundPractice() {
  return (
    <main class="page">
      <div class="empty">
        <p>This practice could not be found. It may have been deleted.</p>
        <a class="btn" href="/practices">
          All practices
        </a>
      </div>
    </main>
  )
}

function Detail(props: { practice: Practice }) {
  const app = useApp()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const lengthChoices = () => LENGTH_CHOICES.filter(m => !props.practice.adjustable || (m * 60 >= props.practice.adjustable.minSec && m * 60 <= props.practice.adjustable.maxSec))
  // Start at the choice closest to the length the practice was written for.
  const defaultLen = untrack(() => {
    const written = props.practice.items.reduce((sum, item) => sum + authoredSec(item), 0) / 60
    const choices = lengthChoices()
    return choices.reduce((best, m) => (Math.abs(m - written) < Math.abs(best - written) ? m : best), choices[0] ?? 10)
  })
  const [lengthMin, setLengthMin] = createSignal(defaultLen)
  const [scale, setScale] = createSignal<number>(1)
  const [bells, setBells] = createSignal(0)
  const [confirmDelete, setConfirmDelete] = createSignal(false)

  const options = () => (props.practice.adjustable ? { lengthSec: lengthMin() * 60, intervalBellSec: bells() } : { scale: scale() })
  const timeline = createMemo(() => {
    try {
      return compile(props.practice, app.poses(), app.settings, options())
    } catch {
      return null
    }
  })
  // A flow compiles to one segment per movement per round. The outline shows it as one step.
  const steps = createMemo(() => {
    const out: Segment[] = []
    for (const seg of timeline()?.segments ?? []) {
      if (seg.kind === 'prepare' || seg.kind === 'switch') continue
      const last = out.at(-1)
      if (seg.kind === 'flow' && last?.kind === 'flow' && last.item === seg.item) {
        out[out.length - 1] = { ...last, durationSec: last.durationSec + seg.durationSec }
        continue
      }
      const item = props.practice.items[seg.item]
      if (seg.kind === 'flow' && item?.type === 'flow') {
        out.push({ ...seg, title: item.title, label: item.rounds > 1 ? `${item.rounds} rounds` : undefined, side: undefined, pose: undefined })
        continue
      }
      out.push(seg)
    }
    return out
  })
  const pacing = () => ({ ...app.settings.pacing, ...props.practice.pacing })
  const saved = () => app.favorites().includes(props.practice.id)
  const mine = () => props.practice.origin !== 'builtin'

  const begin = () => {
    primeForPractice(app.settings)
    const q = new URLSearchParams()
    if (props.practice.adjustable) {
      q.set('len', String(lengthMin() * 60))
      q.set('bells', String(bells()))
    } else if (scale() !== 1) q.set('scale', String(scale()))
    if (search.path) {
      q.set('path', String(search.path))
      q.set('day', String(search.day ?? 1))
    }
    q.set('session', newId('run'))
    navigate(`/play/${props.practice.id}?${q}`)
  }

  const share = async () => {
    const custom = new Set<string>()
    for (const item of props.practice.items) {
      if (item.type === 'pose') custom.add(item.pose)
      if (item.type === 'flow') item.steps.forEach(s => custom.add(s.pose))
    }
    const poses = [...custom].map(id => app.pose(id)).filter((p): p is Pose => !!p && p.origin !== 'builtin')
    const url = `${location.origin}/share#${await encodeShare(props.practice, poses)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${props.practice.title} on still.`, text: props.practice.summary, url })
        return
      } catch (err) {
        // Dismissing the share sheet is a choice. Any other failure falls back to copying.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    await navigator.clipboard.writeText(url)
    toast('Link copied. Anyone with it can add this practice.')
  }

  const duplicate = () => navigate(`/practices/new?from=${props.practice.id}`)
  const back = useBack(() => '/practices')

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="back" />
        </button>
        <div class="row" style={{ gap: '4px' }}>
          <button class="icon-btn" aria-label={saved() ? 'Remove from saved' : 'Save'} aria-pressed={pressed(saved())} onClick={() => app.toggleFavorite(props.practice.id)}>
            <Icon name="heart" fill={saved()} />
          </button>
          <button class="icon-btn" aria-label="Share" onClick={() => void share()}>
            <Icon name="share" />
          </button>
        </div>
      </header>

      <section class="detail-hero">
        <PracticeArt practice={props.practice} class="detail-art" />
        <div class="stack">
          <div class="row wrap" style={{ gap: '6px' }}>
            <span class={['tag', props.practice.kind]}>{KIND_LABEL[props.practice.kind]}</span>
            <span class="tag">{props.practice.level}</span>
            <For each={props.practice.focus.slice(0, 3)}>{f => <span class="tag">{f}</span>}</For>
          </div>
          <h1 class="display">{props.practice.title}</h1>
          <p class="lede">{props.practice.description ?? props.practice.summary}</p>
        </div>
      </section>

      <section class="card pad stack">
        <Show
          when={props.practice.adjustable}
          fallback={
            <div class="stack">
              <div>
                <strong>Length</strong>
                <div class="small muted">Holds and rests scale together</div>
              </div>
              <Segmented label="Length" value={scale()} options={SCALES} onChange={setScale} />
            </div>
          }
        >
          <div class="stack">
            <strong>How long?</strong>
            <div class="chips" role="group" aria-label="Minutes">
              <For each={lengthChoices()}>
                {m => (
                  <button class="chip" aria-pressed={pressed(lengthMin() === m)} onClick={() => setLengthMin(m)}>
                    {m} min
                  </button>
                )}
              </For>
            </div>
            <Show when={props.practice.kind === 'meditation'}>
              <div class="setting" style={{ padding: 0 }}>
                <div>
                  <strong>Interval bell</strong>
                  <small>A soft bell to mark time passing</small>
                </div>
                <Segmented
                  label="Interval bell"
                  value={bells()}
                  options={[
                    { value: 0, label: 'Off' },
                    { value: 300, label: '5 min' },
                    { value: 600, label: '10 min' }
                  ]}
                  onChange={setBells}
                />
              </div>
            </Show>
          </div>
        </Show>
        <button class="btn primary big block" onClick={begin} disabled={!timeline()}>
          <Icon name="play" fill size={18} /> Begin · {minutes(timeline()?.totalSec ?? 0)}
        </button>
        <p class="small muted" style={{ margin: 0, 'text-align': 'center' }}>
          <Show when={props.practice.kind === 'yoga'} fallback="Your screen stays on. Close your eyes when you are ready.">
            {pacing().waitForMe ? 'Waits for your tap before each pose.' : `${pacing().prepareSec} seconds to get ready before each pose.`}{' '}
            <a class="link" href="/settings">
              Change
            </a>
          </Show>
        </p>
      </section>

      <Show when={search.path ? app.paths.find(p => p.id === search.path) : undefined}>
        {path => (
          <div class="banner">
            <Icon name="path" />
            <span>
              Day {String(search.day)} of {path().title}. {path().days[Number(search.day) - 1]?.note}
            </span>
          </div>
        )}
      </Show>

      <section class="stack">
        <div class="section-head">
          <h2 class="display">{props.practice.kind === 'yoga' ? 'Sequence' : 'Outline'}</h2>
          <span class="small muted">{steps().length} steps</span>
        </div>
        <div class="card" style={{ padding: '4px 16px' }}>
          <div class="list">
            <For each={steps()}>{(s, i) => <StepRow segment={s} index={i()} />}</For>
          </div>
        </div>
      </section>

      <Show when={props.practice.credit}>
        <p class="small muted">Based on {props.practice.credit}.</p>
      </Show>

      <section class="row wrap">
        <Show
          when={mine()}
          fallback={
            <button class="btn" onClick={duplicate}>
              <Icon name="copy" size={16} /> Make it yours
            </button>
          }
        >
          <a class="btn" href={`/practices/${props.practice.id}/edit`}>
            <Icon name="edit" size={16} /> Edit
          </a>
          <button class="btn" onClick={duplicate}>
            <Icon name="copy" size={16} /> Duplicate
          </button>
          <button class="btn danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={16} /> Delete
          </button>
        </Show>
      </section>

      <Show when={props.practice.kind === 'yoga'}>
        <p class="small muted">
          Move within a range that feels good. Skip any pose that causes pain, and check with a health professional if you are pregnant, injured, or managing a medical condition.
        </p>
      </Show>

      <Sheet open={confirmDelete()} onClose={() => setConfirmDelete(false)} title="Delete practice">
        <div class="stack">
          <h2 class="display">Delete {props.practice.title}?</h2>
          <p class="muted">Your journal keeps the sessions you already did.</p>
          <button
            class="btn primary block"
            onClick={async () => {
              await app.deletePractice(props.practice.id)
              toast('Practice deleted.')
              navigate('/practices?kind=mine', { replace: true })
            }}
          >
            Delete
          </button>
          <button class="btn block" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </main>
  )
}

function StepRow(props: { segment: Segment; index: number }) {
  const href = () => (props.segment.pose ? `/poses/${props.segment.pose}` : undefined)
  const body = (
    <>
      <span class="num">{String(props.index + 1).padStart(2, '0')}</span>
      <span class="thumb">
        <Show when={props.segment.figure} fallback={<Icon name={props.segment.kind === 'breath' ? 'wind' : 'leaf'} />}>
          {f => <Figure pose={f()} mat={false} title="" />}
        </Show>
      </span>
      <span class="grow">
        <strong style={{ 'font-weight': 550 }}>{props.segment.title}</strong>
        <span class="small muted" style={{ display: 'block' }}>
          {props.segment.side ? (props.segment.side === 'right' ? 'Right side' : 'Left side') : props.segment.label}
        </span>
      </span>
      <span class="small muted tabular">{clock(props.segment.durationSec)}</span>
    </>
  )
  return (
    <Show when={href()} fallback={<div class="list-row">{body}</div>}>
      {h => (
        <a class="list-row" href={h()}>
          {body}
        </a>
      )}
    </Show>
  )
}
