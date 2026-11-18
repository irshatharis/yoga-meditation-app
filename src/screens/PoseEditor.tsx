import { createMemo, createSignal, For, Show, snapshot, untrack } from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { Figure } from '../figure/Figure'
import { POSES } from '../content/poses'
import { FAMILIES, FOCUSES, type Family, type Focus, type Level, type Pose, type PoseId } from '../domain/types'
import { newId } from '../store/transfer'
import { Icon } from '../ui/icons'
import { Segmented, Switch, toast, pressed, useBack } from '../ui/kit'
import { FAMILY_LABEL } from './Poses'
import { MediaGallery, addMediaFromFile } from './media'

const lines = (s: string) =>
  s
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

export default function PoseEditor() {
  const app = useApp()
  const params = useParams()
  const navigate = useNavigate()
  const existing = untrack(() => {
    const found = params.id ? app.pose(params.id) : undefined
    return found && snapshot(found)
  })
  // Fixed for the life of the editor, so a second tap on Save updates the pose the first one made.
  const id = (existing?.id ?? newId('pose')) as PoseId
  const cancel = useBack(() => (existing ? `/poses/${existing.id}` : '/poses'))
  const [name, setName] = createSignal(existing?.name ?? '')
  const [sanskrit, setSanskrit] = createSignal(existing?.sanskrit ?? '')
  const [family, setFamily] = createSignal<Family>(existing?.family ?? 'standing')
  const [level, setLevel] = createSignal<Level>(existing?.level ?? 'gentle')
  const [focus, setFocus] = createSignal<Focus[]>(existing?.focus ?? [])
  const [sided, setSided] = createSignal(existing?.sided ?? false)
  const [summary, setSummary] = createSignal(existing?.summary ?? '')
  const [setup, setSetup] = createSignal(existing?.setup.join('\n') ?? '')
  const [cues, setCues] = createSignal(existing?.cues.join('\n') ?? '')
  const [cautions, setCautions] = createSignal(existing?.cautions.join('\n') ?? '')
  const [easier, setEasier] = createSignal(existing?.easier ?? '')
  const [figureFrom, setFigureFrom] = createSignal<string>(existing?.figure ? (POSES.find(p => JSON.stringify(p.figure) === JSON.stringify(existing.figure))?.id ?? 'keep') : '')
  const [media, setMedia] = createSignal(existing?.media ?? [])

  const figure = createMemo(() => {
    const from = figureFrom()
    if (from === 'keep') return existing?.figure ?? null
    return POSES.find(p => p.id === from)?.figure ?? null
  })

  const save = async (e: Event) => {
    e.preventDefault()
    if (!name().trim()) {
      toast('Give your pose a name.')
      return
    }
    const pose: Pose = {
      id,
      name: name().trim(),
      sanskrit: sanskrit().trim() || undefined,
      family: family(),
      level: level(),
      focus: focus(),
      sided: sided(),
      summary: summary().trim() || name().trim(),
      setup: lines(setup()),
      cues: lines(cues()),
      cautions: lines(cautions()),
      easier: easier().trim() || undefined,
      figure: figure(),
      media: media(),
      origin: existing?.origin === 'imported' ? 'imported' : 'mine'
    }
    await app.savePose(pose)
    toast('Pose saved.')
    navigate(`/poses/${pose.id}`, { replace: true })
  }

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Cancel" onClick={cancel}>
          <Icon name="close" />
        </button>
        <strong>{existing ? 'Edit pose' : 'New pose'}</strong>
        <button class="btn primary small" form="pose-form" type="submit">
          Save
        </button>
      </header>

      <form id="pose-form" class="stack" onSubmit={save}>
        <label class="field">
          <span>Name</span>
          <input class="input" required value={name()} onInput={e => setName(e.currentTarget.value)} placeholder="Supported fish" />
        </label>
        <label class="field">
          <span>Sanskrit name (optional)</span>
          <input class="input" value={sanskrit()} onInput={e => setSanskrit(e.currentTarget.value)} />
        </label>
        <div class="row wrap">
          <label class="field grow" style={{ 'min-width': '9rem' }}>
            <span>Family</span>
            <select class="input" value={family()} onChange={e => setFamily(e.currentTarget.value as Family)}>
              <For each={FAMILIES}>{f => <option value={f}>{FAMILY_LABEL[f]}</option>}</For>
            </select>
          </label>
          <div class="field">
            <span>Intensity</span>
            <Segmented
              label="Intensity"
              value={level()}
              options={[
                { value: 'gentle', label: 'Gentle' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'strong', label: 'Strong' }
              ]}
              onChange={setLevel}
            />
          </div>
        </div>
        <div class="setting">
          <div>
            <strong>One side at a time</strong>
            <small>Practices will hold the right side, then switch to the left</small>
          </div>
          <Switch label="One side at a time" checked={sided()} onChange={setSided} />
        </div>
        <div class="field">
          <span>Body focus</span>
          <div class="chips wrap">
            <For each={FOCUSES}>
              {f => (
                <button type="button" class="chip" aria-pressed={pressed(focus().includes(f))} onClick={() => setFocus(xs => (xs.includes(f) ? xs.filter(x => x !== f) : [...xs, f]))}>
                  {f}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="field">
          <span>Illustration</span>
          <div class="row" style={{ 'align-items': 'flex-start' }}>
            <div class="thumb" style={{ width: '96px', height: '96px' }}>
              <Show when={figure()} fallback={<Icon name="image" />}>
                {f => <Figure pose={f()} mat={false} title="" />}
              </Show>
            </div>
            <label class="field grow">
              <select class="input" value={figureFrom()} onChange={e => setFigureFrom(e.currentTarget.value)} aria-label="Looks like">
                <option value="">No illustration</option>
                <Show when={figureFrom() === 'keep'}>
                  <option value="keep">Current illustration</option>
                </Show>
                <For each={[...POSES].sort((a, b) => a.name.localeCompare(b.name))}>{p => <option value={p.id}>Looks like {p.name}</option>}</For>
              </select>
              <small class="muted">Pick the closest built-in pose. Add your own photo or video below.</small>
            </label>
          </div>
        </div>

        <label class="field">
          <span>Summary</span>
          <input class="input" value={summary()} onInput={e => setSummary(e.currentTarget.value)} placeholder="One line shown in lists" />
        </label>
        <label class="field">
          <span>How to come in (one step per line, read aloud before the pose)</span>
          <textarea class="input" rows="4" value={setup()} onInput={e => setSetup(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>Cues while holding (one per line)</span>
          <textarea class="input" rows="3" value={cues()} onInput={e => setCues(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>Make it gentler (optional)</span>
          <input class="input" value={easier()} onInput={e => setEasier(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>Cautions (one per line, optional)</span>
          <textarea class="input" rows="2" value={cautions()} onInput={e => setCautions(e.currentTarget.value)} />
        </label>

        <div class="field">
          <span>Photos and videos</span>
          <MediaGallery media={media()} onRemove={i => setMedia(m => m.filter((_, j) => j !== i))} />
          <button
            type="button"
            class="btn small"
            style={{ 'justify-self': 'start' }}
            onClick={async () => {
              const ref = await addMediaFromFile()
              if (ref) setMedia(m => [...m, ref])
            }}
          >
            <Icon name="image" size={16} /> Add photo or video
          </button>
        </div>
        <button class="btn primary big block" type="submit">
          Save pose
        </button>
      </form>
    </main>
  )
}
