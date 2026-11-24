import { createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { Figure } from '../figure/Figure'
import { blend, mirror, type FigurePose } from '../figure/skeleton'
import { Icon } from '../ui/icons'
import { Segmented, Sheet, toast, useBack } from '../ui/kit'
import { DEMO_CREDIT, demoFor, youtubeUrl } from '../content/demos'
import { MediaGallery, PoseVideo, addMediaFromFile, addMediaLink } from './media'
import { FAMILY_LABEL } from './Poses'
import type { Pose } from '../domain/types'

export default function PoseDetail() {
  const app = useApp()
  const params = useParams()
  const pose = createMemo(() => app.pose(params.id ?? ''))
  return (
    <Show when={pose()} keyed fallback={<main class="page"><p class="empty">This pose could not be found.</p></main>}>
      {p => <Detail pose={p} />}
    </Show>
  )
}

function useMorph(target: () => FigurePose) {
  const [shown, setShown] = createSignal(untrack(target))
  let raf = 0
  const go = (to: FigurePose) => {
    cancelAnimationFrame(raf)
    const from = shown()
    const start = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 700)
      setShown(blend(from, to, 1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  onCleanup(() => cancelAnimationFrame(raf))
  return { shown, go }
}

function Detail(props: { pose: Pose }) {
  const app = useApp()
  const navigate = useNavigate()
  const [side, setSide] = createSignal<'right' | 'left'>('right')
  const [linkOpen, setLinkOpen] = createSignal(false)
  const [link, setLink] = createSignal('')
  const [confirmDelete, setConfirmDelete] = createSignal(false)
  const figureFor = (s: 'right' | 'left') => (props.pose.figure ? (s === 'left' ? mirror(props.pose.figure) : props.pose.figure) : null)
  const morph = useMorph(() => figureFor('right') ?? ({} as FigurePose))
  const custom = () => props.pose.origin !== 'builtin'
  const demo = demoFor(props.pose.id)
  const back = useBack(() => '/poses')

  const chooseSide = (s: 'right' | 'left') => {
    setSide(s)
    const f = figureFor(s)
    if (f) morph.go(f)
  }

  const usedIn = createMemo(() =>
    app.practices().filter(pr => pr.items.some(i => (i.type === 'pose' && i.pose === props.pose.id) || (i.type === 'flow' && i.steps.some(s => s.pose === props.pose.id))))
  )

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="back" />
        </button>
        <Show when={custom()}>
          <a class="btn small" href={`/poses/${props.pose.id}/edit`}>
            <Icon name="edit" size={16} /> Edit
          </a>
        </Show>
      </header>

      <Show when={props.pose.figure || demo}>
        <div class={['pose-stage', { video: !!demo }]}>
          <Show when={demo} fallback={<Figure pose={morph.shown()} title={`${props.pose.name}, ${side()} side`} />}>
            <PoseVideo pose={props.pose.id} title={`${props.pose.name}, ${side()} side`} mirrored={side() === 'left'} autoplay />
          </Show>
          <Show when={props.pose.sided}>
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <Segmented
                label="Side"
                value={side()}
                options={[
                  { value: 'right', label: 'Right' },
                  { value: 'left', label: 'Left' }
                ]}
                onChange={chooseSide}
              />
            </div>
          </Show>
        </div>
      </Show>
      <Show when={demo}>
        {d => (
          <p class="small muted video-credit">
            Video by{' '}
            <a class="link" href={youtubeUrl(d())} target="_blank" rel="noopener noreferrer">
              {DEMO_CREDIT.by}
            </a>
            ,{' '}
            <a class="link" href={DEMO_CREDIT.licenseUrl} target="_blank" rel="noopener noreferrer">
              {DEMO_CREDIT.license}
            </a>
            , trimmed and cropped.
          </p>
        )}
      </Show>

      <div class="stack">
        <div class="row wrap" style={{ gap: '6px' }}>
          <span class="tag yoga">{FAMILY_LABEL[props.pose.family]}</span>
          <span class="tag">{props.pose.level}</span>
          <Show when={props.pose.sided}>
            <span class="tag">Both sides</span>
          </Show>
          <For each={props.pose.focus}>{f => <span class="tag">{f}</span>}</For>
        </div>
        <h1 class="display">{props.pose.name}</h1>
        <Show when={props.pose.sanskrit}>
          <p class="muted" style={{ margin: 0, 'font-style': 'italic' }}>
            {props.pose.sanskrit}
          </p>
        </Show>
        <p class="lede">{props.pose.summary}</p>
      </div>

      <section class="card pad prose">
        <h2 class="display" style={{ 'font-size': '1.2rem' }}>
          How to come in
        </h2>
        <ol>
          <For each={props.pose.setup}>{s => <li>{s}</li>}</For>
        </ol>
        <Show when={props.pose.cues.length}>
          <h2 class="display" style={{ 'font-size': '1.2rem', 'margin-top': '18px' }}>
            While you hold
          </h2>
          <ul>
            <For each={props.pose.cues}>{c => <li>{c}</li>}</For>
          </ul>
        </Show>
        <Show when={props.pose.release}>
          <h2 class="display" style={{ 'font-size': '1.2rem', 'margin-top': '18px' }}>
            Coming out
          </h2>
          <p>{props.pose.release}</p>
        </Show>
      </section>

      <Show when={props.pose.easier || props.pose.cautions.length}>
        <section class="card pad prose">
          <Show when={props.pose.easier}>
            <p>
              <strong style={{ color: 'var(--sage)' }}>Make it gentler. </strong>
              {props.pose.easier}
            </p>
          </Show>
          <Show when={props.pose.cautions.length}>
            <p style={{ 'margin-bottom': 0 }}>
              <strong style={{ color: 'var(--accent)' }}>Take care. </strong>
              {props.pose.cautions.join(' ')}
            </p>
          </Show>
        </section>
      </Show>

      <section class="stack">
        <div class="section-head">
          <h2 class="display">Your media</h2>
        </div>
        <MediaGallery media={props.pose.media} onRemove={i => void app.savePose({ ...props.pose, origin: custom() ? props.pose.origin : 'mine', media: props.pose.media.filter((_, j) => j !== i) })} />
        <div class="row wrap">
          <button
            class="btn small"
            onClick={async () => {
              const ref = await addMediaFromFile()
              if (ref) {
                await app.savePose({ ...props.pose, origin: custom() ? props.pose.origin : 'mine', media: [...props.pose.media, ref] })
                toast('Saved on this device.')
              }
            }}
          >
            <Icon name="image" size={16} /> Add photo or video
          </button>
          <button class="btn small" onClick={() => setLinkOpen(true)}>
            <Icon name="link" size={16} /> Add a link
          </button>
        </div>
        <p class="small muted" style={{ margin: 0 }}>
          Add a reference photo, a clip of yourself, or a link to a tutorial you like. It stays on this device and goes into your backups.
        </p>
      </section>

      <Show when={usedIn().length}>
        <section class="stack">
          <h2 class="display">Found in</h2>
          <div class="chips">
            <For each={usedIn()}>
              {p => (
                <a class="chip" href={`/practices/${p.id}`} style={{ display: 'inline-flex', 'align-items': 'center' }}>
                  {p.title}
                </a>
              )}
            </For>
          </div>
        </section>
      </Show>

      <Show when={custom()}>
        <button class="btn danger" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={16} /> {props.pose.id.startsWith('pose-') ? 'Delete pose' : 'Remove my changes'}
        </button>
      </Show>

      <Sheet open={linkOpen()} onClose={() => setLinkOpen(false)} title="Add a link">
        <form
          class="stack"
          onSubmit={async e => {
            e.preventDefault()
            const ref = addMediaLink(link())
            if (!ref) {
              toast('That does not look like a web address.')
              return
            }
            await app.savePose({ ...props.pose, origin: custom() ? props.pose.origin : 'mine', media: [...props.pose.media, ref] })
            setLink('')
            setLinkOpen(false)
          }}
        >
          <h2 class="display">Add a link</h2>
          <input class="input" type="url" inputmode="url" placeholder="https://" value={link()} onInput={e => setLink(e.currentTarget.value)} />
          <button class="btn primary block" type="submit">
            Add link
          </button>
        </form>
      </Sheet>

      <Sheet open={confirmDelete()} onClose={() => setConfirmDelete(false)} title="Delete">
        <div class="stack">
          <h2 class="display">{props.pose.id.startsWith('pose-') ? `Delete ${props.pose.name}?` : 'Remove your media and changes?'}</h2>
          <p class="muted">Practices that use this pose will {props.pose.id.startsWith('pose-') ? 'skip it' : 'use the original'}.</p>
          <button
            class="btn primary block"
            onClick={async () => {
              await app.deletePose(props.pose.id)
              navigate('/poses', { replace: true })
            }}
          >
            Confirm
          </button>
          <button class="btn block" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </main>
  )
}
