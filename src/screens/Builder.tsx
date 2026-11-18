import { createMemo, createSignal, For, Match, Show, Switch as SwitchFlow, untrack, snapshot } from 'solid-js'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { Figure } from '../figure/Figure'
import { estimateSec } from '../domain/timeline'
import type { BreathPattern, Practice, PracticeId, PracticeItem, PoseId } from '../domain/types'
import { newId } from '../store/transfer'
import { Icon } from '../ui/icons'
import { Segmented, Sheet, Stepper, Switch, clock, minutes, toast, useBack } from '../ui/kit'

const BREATHS: { label: string; pattern: BreathPattern; cycles: number }[] = [
  { label: 'Box breathing', pattern: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }, cycles: 8 },
  { label: 'Relaxing breath', pattern: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, cycles: 4 },
  { label: 'Coherent breathing', pattern: { inhale: 5.5, holdIn: 0, exhale: 5.5, holdOut: 0 }, cycles: 16 },
  { label: 'Extended exhale', pattern: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }, cycles: 12 }
]

export default function Builder() {
  const app = useApp()
  const params = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  // `?from=` starts a copy. Built-in practices are never edited in place, so they copy too.
  const { source, editing } = untrack(() => {
    const id = params.id ?? search.from
    const found = typeof id === 'string' ? app.practice(id) : undefined
    const source = found && snapshot(found)
    return { source, editing: source && params.id && source.origin !== 'builtin' ? source : undefined }
  })
  // Fixed for the life of the editor, so a second tap on Save updates the practice the first one made.
  const id = (editing?.id ?? newId('practice')) as PracticeId
  const [title, setTitle] = createSignal(editing?.title ?? (source ? `${source.title} (my version)` : ''))
  const [summary, setSummary] = createSignal(editing?.summary ?? source?.summary ?? '')
  const [kind, setKind] = createSignal<Practice['kind']>(source?.kind ?? 'yoga')
  const [items, setItems] = createSignal<PracticeItem[]>(structuredClone(source?.items ?? []))
  const [ownPacing, setOwnPacing] = createSignal(source?.pacing?.prepareSec !== undefined)
  const [prepare, setPrepare] = createSignal(source?.pacing?.prepareSec ?? untrack(() => app.settings.pacing.prepareSec))
  const [adding, setAdding] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [dragging, setDragging] = createSignal<number | null>(null)

  const draft = createMemo<Practice>(() => ({
    id,
    title: title().trim() || 'Untitled practice',
    summary: summary().trim(),
    kind: kind(),
    level: source?.level ?? 'gentle',
    focus: source?.focus ?? [],
    items: items(),
    pacing: ownPacing() ? { prepareSec: prepare() } : undefined,
    origin: 'mine'
  }))
  const cancel = useBack(() => (source ? `/practices/${source.id}` : '/practices'))
  const total = createMemo(() => estimateSec(draft(), app.poses(), app.settings))

  const update = (i: number, fn: (item: PracticeItem) => PracticeItem) => setItems(xs => xs.map((x, j) => (j === i ? fn(x) : x)))
  const remove = (i: number) => setItems(xs => xs.filter((_, j) => j !== i))
  const move = (from: number, to: number) =>
    setItems(xs => {
      if (to < 0 || to >= xs.length || from === to) return xs
      const next = xs.slice()
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it!)
      return next
    })

  const startDrag = (index: number, e: PointerEvent) => {
    e.preventDefault()
    let at = index
    setDragging(at)
    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-index]')
      const target = el ? Number(el.dataset.index) : at
      if (target !== at) {
        move(at, target)
        at = target
        setDragging(at)
      }
    }
    const onUp = () => {
      setDragging(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const poseResults = createMemo(() => {
    const q = query().trim().toLowerCase()
    return [...app.poses().values()].filter(p => !q || `${p.name} ${p.sanskrit ?? ''}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
  })

  const addPose = (id: PoseId) => {
    setItems(xs => [...xs, { type: 'pose', pose: id, holdSec: 30 }])
    toast(`Added ${app.pose(id)?.name ?? 'pose'}.`)
  }

  const save = async () => {
    if (items().length === 0) {
      toast('Add at least one step first.')
      return
    }
    const practice: Practice = { ...draft(), title: title().trim() || 'My practice', summary: summary().trim() || `${items().length} steps, about ${minutes(total())}.` }
    await app.savePractice(practice)
    toast('Practice saved.')
    navigate(`/practices/${practice.id}`, { replace: true })
  }

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Cancel" onClick={cancel}>
          <Icon name="close" />
        </button>
        <strong>{editing ? 'Edit practice' : 'New practice'}</strong>
        <button class="btn primary small" onClick={() => void save()}>
          Save
        </button>
      </header>

      <div class="stack">
        <input class="input display-input" placeholder="Name your practice" value={title()} onInput={e => setTitle(e.currentTarget.value)} aria-label="Title" />
        <input class="input" placeholder="A short description (optional)" value={summary()} onInput={e => setSummary(e.currentTarget.value)} aria-label="Description" />
        <div class="row between wrap">
          <Segmented
            label="Kind"
            value={kind()}
            options={[
              { value: 'yoga', label: 'Yoga' },
              { value: 'meditation', label: 'Meditation' },
              { value: 'breath', label: 'Breathwork' }
            ]}
            onChange={setKind}
          />
          <span class="tag">
            <Icon name="clock" size={12} /> {minutes(total())}
          </span>
        </div>
      </div>

      <section class="stack">
        <Show when={items().length} fallback={<div class="empty card">Add poses, rests, a sit or some breathing to build your practice.</div>}>
          <For each={items()} keyed={false}>
            {(item, i) => (
              <div class="item-card" data-index={i} data-dragging={dragging() === i ? '' : undefined}>
                <button class="drag" aria-label="Drag to reorder" onPointerDown={e => startDrag(i, e)}>
                  <Icon name="grip" />
                </button>
                <ItemEditor item={item()} onChange={fn => update(i, fn)} />
                <div class="item-actions">
                  <button class="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <Icon name="up" size={18} />
                  </button>
                  <button class="icon-btn" aria-label="Remove" onClick={() => remove(i)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
            )}
          </For>
        </Show>
        <div class="row wrap">
          <button class="btn" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Pose
          </button>
          <button class="btn" onClick={() => setItems(xs => [...xs, { type: 'rest', title: 'Rest', durationSec: 60, pose: 'corpse' as PoseId }])}>
            <Icon name="moon" size={16} /> Rest
          </button>
          <button class="btn" onClick={() => setItems(xs => [...xs, { type: 'sit', title: 'Sit in stillness', durationSec: 300, guidance: [], posture: 'easy-seat' as PoseId }])}>
            <Icon name="leaf" size={16} /> Sit
          </button>
          <button class="btn" onClick={() => setItems(xs => [...xs, { type: 'breath', title: BREATHS[0]!.label, pattern: BREATHS[0]!.pattern, cycles: BREATHS[0]!.cycles, posture: 'easy-seat' as PoseId }])}>
            <Icon name="wind" size={16} /> Breathing
          </button>
        </div>
      </section>

      <section class="card pad">
        <div class="setting" style={{ 'padding-top': 0 }}>
          <div>
            <strong>Own get-ready time</strong>
            <small>Otherwise uses your setting ({app.settings.pacing.prepareSec} s)</small>
          </div>
          <Switch label="Own get-ready time" checked={ownPacing()} onChange={setOwnPacing} />
        </div>
        <Show when={ownPacing()}>
          <div class="setting" style={{ 'padding-bottom': 0 }}>
            <strong>Seconds before each pose</strong>
            <Stepper label="seconds" value={prepare()} min={0} max={60} step={5} onChange={setPrepare} format={v => `${v} s`} />
          </div>
        </Show>
      </section>

      <button class="btn primary big block" onClick={() => void save()}>
        Save practice
      </button>

      <Sheet open={adding()} onClose={() => setAdding(false)} title="Add a pose">
        <div class="stack">
          <div class="row between">
            <h2 class="display">Add a pose</h2>
            <button class="btn small" onClick={() => setAdding(false)}>
              Done
            </button>
          </div>
          <label class="search">
            <Icon name="search" size={18} />
            <input class="input" type="search" placeholder="Search poses" value={query()} onInput={e => setQuery(e.currentTarget.value)} />
          </label>
          <div class="pose-grid compact">
            <For each={poseResults()}>
              {p => (
                <button class="pose-tile" onClick={() => addPose(p.id)}>
                  <div class="pose-tile-art">
                    <Show when={p.figure} fallback={<Icon name="image" />}>
                      {f => <Figure pose={f()} mat={false} title="" />}
                    </Show>
                  </div>
                  <strong>{p.name}</strong>
                </button>
              )}
            </For>
          </div>
        </div>
      </Sheet>
    </main>
  )
}

function ItemEditor(props: { item: PracticeItem; onChange: (fn: (item: PracticeItem) => PracticeItem) => void }) {
  const app = useApp()
  return (
    <div class="item-body">
      <SwitchFlow>
        <Match when={props.item.type === 'pose' && props.item}>
          {item => {
            const pose = () => app.pose(item().pose)
            return (
              <>
                <div class="row">
                  <span class="thumb">
                    <Show when={pose()?.figure}>{f => <Figure pose={f()} mat={false} title="" />}</Show>
                  </span>
                  <strong class="grow">{pose()?.name ?? 'Missing pose'}</strong>
                </div>
                <Show when={pose()?.sided}>
                  <Segmented
                    label="Sides"
                    value={item().sides ?? 'both'}
                    options={[
                      { value: 'both', label: 'Both' },
                      { value: 'right', label: 'Right' },
                      { value: 'left', label: 'Left' }
                    ]}
                    onChange={v => props.onChange(x => ({ ...x, sides: v }) as PracticeItem)}
                  />
                </Show>
                <Stepper label="hold" value={item().holdSec} min={5} max={900} step={5} format={clock} onChange={v => props.onChange(x => ({ ...x, holdSec: v }) as PracticeItem)} />
              </>
            )
          }}
        </Match>
        <Match when={props.item.type === 'flow' && props.item}>
          {item => (
            <>
              <strong>{item().title}</strong>
              <Stepper label="rounds" value={item().rounds} min={1} max={12} step={1} format={v => `${v} ${v === 1 ? 'round' : 'rounds'}`} onChange={v => props.onChange(x => ({ ...x, rounds: v }) as PracticeItem)} />
            </>
          )}
        </Match>
        <Match when={props.item.type === 'breath' && props.item}>
          {item => (
            <>
              <select
                class="input"
                value={BREATHS.find(b => b.label === item().title)?.label ?? item().title}
                onChange={e => {
                  const b = BREATHS.find(x => x.label === e.currentTarget.value)
                  if (b) props.onChange(x => ({ ...x, title: b.label, pattern: b.pattern, cycles: b.cycles }) as PracticeItem)
                }}
              >
                <For each={BREATHS}>{b => <option>{b.label}</option>}</For>
                <Show when={!BREATHS.some(b => b.label === item().title)}>
                  <option>{item().title}</option>
                </Show>
              </select>
              <Stepper label="breaths" value={item().cycles} min={1} max={60} step={1} format={v => `${v} breaths`} onChange={v => props.onChange(x => ({ ...x, cycles: v }) as PracticeItem)} />
            </>
          )}
        </Match>
        <Match when={(props.item.type === 'sit' || props.item.type === 'rest') && props.item}>
          {item => (
            <>
              <input class="input" value={item().title} onChange={e => props.onChange(x => ({ ...x, title: e.currentTarget.value || 'Rest' }) as PracticeItem)} aria-label="Step name" />
              <Stepper label="length" value={item().durationSec} min={15} max={7200} step={item().durationSec >= 300 ? 60 : 15} format={clock} onChange={v => props.onChange(x => ({ ...x, durationSec: v }) as PracticeItem)} />
            </>
          )}
        </Match>
      </SwitchFlow>
    </div>
  )
}
