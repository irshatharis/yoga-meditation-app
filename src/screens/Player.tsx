import { createMemo, createSignal, For, Match, onCleanup, Show, Switch, untrack } from 'solid-js'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Figure } from '../figure/Figure'
import { blend, type FigurePose } from '../figure/skeleton'
import { advance, back, dueCues, extend, locate, next, pause, play, position, practiced, start, stepOf, steps, type PlayerState } from '../domain/player'
import { compile, type Segment } from '../domain/timeline'
import type { PathId, Practice, SessionLog } from '../domain/types'
import { createKeepAwake, type AwakeState } from '../engine/awake'
import { resumeAudio, setAmbient, setKeepAlive, silence } from '../engine/audio'
import { playCue, primeForPractice, recentlyPrimed, showNowPlaying, vibrate } from '../engine/session'
import { createSpeaker } from '../engine/speech'
import { useApp, type ActiveSession } from '../state/app'
import { Icon } from '../ui/icons'
import { clock, minutes, Segmented, Sheet, pressed } from '../ui/kit'
import { newId } from '../store/transfer'
import '../ui/player.css'

const reduceMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches

// Sessions saved before they carried an id.
const UNNAMED = 'resume'

export default function Player() {
  const app = useApp()
  const params = useParams()
  const [search] = useSearchParams()
  const practice = untrack(() => app.practice(params.id ?? ''))
  const q = untrack(() => ({ ...search }))
  return (
    <Show when={practice} fallback={<Missing />}>
      {p => (
        <Session
          practice={p()}
          id={typeof q.session === 'string' ? q.session : q.resume === '1' ? UNNAMED : undefined}
          lengthSec={Number(q.len) || undefined}
          scale={Number(q.scale) || undefined}
          bells={q.bells === undefined ? undefined : Number(q.bells)}
          path={q.path ? { id: q.path as PathId, day: Number(q.day) || 1 } : undefined}
        />
      )}
    </Show>
  )
}

function Missing() {
  return (
    <main class="player yoga">
      <div class="player-center">
        <p class="display" style={{ 'font-size': '1.6rem' }}>This practice is no longer here.</p>
        <a class="btn" href="/practices">Browse practices</a>
      </div>
    </main>
  )
}

// `id` names one run of a practice. The address carries it, so a reload finds the saved run again.
type SessionProps = { practice: Practice; id?: string; lengthSec?: number; scale?: number; bells?: number; path?: { id: PathId; day: number } }

type Run = { id: string; state: PlayerState; startedAt: number; resumed: boolean }

function openRun(props: SessionProps, active: ActiveSession | null, build: () => PlayerState): Run {
  if (props.id && active && active.practice === props.practice.id && (active.id ?? UNNAMED) === props.id) {
    const s = active.player
    // Time kept passing while the app was closed. Resume where it was saved.
    const posMs = s.phase.status === 'running' ? active.savedAt - s.phase.originMs : 'posMs' in s.phase ? s.phase.posMs : 0
    // Sessions saved before practised time was tracked count their position instead.
    const kept = practiced(s, active.savedAt)
    const practicedMs = Number.isFinite(kept) ? kept : posMs
    return { id: props.id, state: { ...s, practicedMs, phase: { status: 'paused', posMs } }, startedAt: active.startedAt, resumed: true }
  }
  return { id: props.id ?? newId('run'), state: build(), startedAt: Date.now(), resumed: false }
}

// The player is driven by plain functions. Taps call play, pause, skip and
// end; one frame loop moves the clock, plays due cues and notices when the
// step changes. Signals only carry the result to the screen.
function Session(props: SessionProps) {
  const app = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const settings = app.settings
  const run = untrack(() =>
    openRun(props, app.active(), () => start(compile(props.practice, app.poses(), settings, { lengthSec: props.lengthSec, scale: props.scale, intervalBellSec: props.bells })))
  )
  const stepList = steps(run.state.timeline)
  let current = run.state
  let lastPos = -1
  let lastIndex = -1
  // Once ended, a run is never saved for resuming again, whether or not it made the journal.
  let ended = false

  const [state, setState] = createSignal<PlayerState>(current)
  const [now, setNow] = createSignal(Date.now())
  const [awake, setAwake] = createSignal<AwakeState>('off')
  const [endOpen, setEndOpen] = createSignal(false)
  const [soundOpen, setSoundOpen] = createSignal(false)
  const [summary, setSummary] = createSignal<SessionLog | null>(null)
  const [begun, setBegun] = createSignal(false)
  // The last spoken line, tagged with its segment so it clears itself when the segment changes.
  const [said, setSaid] = createSignal<{ index: number; text: string } | null>(null)
  // When the segment changes, the figure morphs from the previous pose.
  const [morph, setMorph] = createSignal<{ from: FigurePose | null; at: number }>({ from: null, at: 0 })

  const loc = createMemo(() => locate(state().timeline, position(state(), now())))
  const segment = () => loc().segment
  const status = () => state().phase.status

  const keepAwake = createKeepAwake(setAwake)
  const speaker = createSpeaker(() => ({ voiceURI: settings.voice.voiceURI, rate: settings.voice.rate, volume: settings.sound.volume }))
  // A get-ready gap speaks for the step it introduces, so its lines run on into that step.
  const topic = (index: number) => {
    const kind = current.timeline.segments[index]?.kind
    return kind === 'prepare' || kind === 'switch' ? index + 1 : index
  }

  const commit = (next: PlayerState) => {
    current = next
    setState(next)
  }

  const nowPlaying = () =>
    showNowPlaying({ title: locate(current.timeline, position(current, Date.now())).segment.title, practice: props.practice.title, playing: current.phase.status === 'running' })

  const persist = () => {
    if (ended || current.phase.status === 'done' || current.phase.status === 'ready') return
    app.saveActive({
      id: run.id,
      practice: props.practice.id,
      title: props.practice.title,
      kind: props.practice.kind,
      startedAt: run.startedAt,
      savedAt: Date.now(),
      player: current,
      path: props.path
    })
  }

  const quiet = () => {
    speaker.stop()
    silence()
    setKeepAlive(false)
    keepAwake.off()
  }

  const finish = (completed: boolean) => {
    ended = true
    const t = Date.now()
    if (current.phase.status === 'running') commit(pause(current, t))
    const practicedSec = Math.round(practiced(current, t) / 1000)
    quiet()
    showNowPlaying(null)
    app.saveActive(null)
    // Under a minute is not a practice, even when skipped through to the end, so it never counts toward a streak.
    if (practicedSec < 60) {
      navigate(`/practices/${props.practice.id}`, { replace: true })
      return
    }
    const log: SessionLog = {
      id: newId('log'),
      practice: props.practice.id,
      title: props.practice.title,
      kind: props.practice.kind,
      startedAt: run.startedAt,
      endedAt: t,
      plannedSec: current.timeline.totalSec,
      practicedSec,
      completed,
      ...(props.path ? { path: props.path } : {})
    }
    void app.addLog(log)
    // The closing bell marks the end of every practice that counts, finished or ended early, as it would close a class.
    const words = completed && settings.voice.detail !== 'quiet' ? 'Your practice is complete. Take a moment before you move on.' : undefined
    playCue({ at: 0, sound: 'end', say: words }, settings, speaker, -1)
    setSummary(log)
  }

  // Runs every frame while visible and every half second while hidden. Safe to
  // call any number of times: cues already played are behind `lastPos`.
  const tick = () => {
    const t = Date.now()
    if (current.phase.status === 'running') {
      const after = advance(current, t)
      if (after !== current) commit(after)
      const pos = position(after, t)
      for (const cue of dueCues(after.timeline, lastPos, Math.min(pos, after.timeline.totalSec * 1000))) {
        const index = Number(cue.key.split(':')[0])
        playCue(cue, settings, speaker, topic(index))
        if (cue.say) setSaid({ index, text: cue.say })
      }
      lastPos = pos
      if (after.phase.status === 'waiting') {
        playCue({ at: 0, sound: 'tick' }, settings, speaker, -1)
        vibrate(settings, 30)
      }
      if (after.phase.status === 'done') {
        finish(true)
        return
      }
    }
    const index = locate(current.timeline, position(current, t)).index
    if (index !== lastIndex) {
      const from = current.timeline.segments[lastIndex]?.figure ?? null
      setMorph({ from: lastIndex === -1 || reduceMotion() ? null : from, at: t })
      if (lastIndex !== -1 && current.phase.status === 'running') vibrate(settings, [20, 40, 20])
      lastIndex = index
      nowPlaying()
    }
    setNow(t)
  }

  const resume = () => {
    if (ended || current.phase.status === 'running' || current.phase.status === 'done') return
    const t = Date.now()
    primeForPractice(settings)
    commit(play(current, t))
    // Cues at the exact start position are due, so a step skipped to while paused is announced.
    lastPos = position(current, t) - 1
    if (!begun()) {
      setBegun(true)
      if (search.session !== run.id) setSearch({ session: run.id, resume: undefined }, { replace: true })
    }
    if (settings.keepAwake) keepAwake.on()
    setKeepAlive(true)
    resumeAudio()
    setAmbient(settings.sound.ambient, settings.sound.ambientVolume)
    tick()
    nowPlaying()
  }

  const hold = () => {
    if (current.phase.status !== 'running') return
    commit(pause(current, Date.now()))
    quiet()
    persist()
    tick()
    nowPlaying()
  }

  const skip = (direction: 1 | -1) => {
    if (ended) return
    const t = Date.now()
    speaker.stop()
    commit(direction === 1 ? next(current, t) : back(current, t))
    if (current.phase.status === 'done') {
      finish(true)
      return
    }
    lastPos = position(current, t) - 1
    persist()
    tick()
  }

  const addTime = () => {
    if (ended) return
    commit(extend(current, Date.now(), 15))
    persist()
    vibrate(settings, 15)
  }

  const shown = createMemo<FigurePose | null>(() => {
    const target = segment().figure
    const m = morph()
    if (!target) return null
    if (!m.from) return target
    const k = Math.min(1, (now() - m.at) / 850)
    if (k >= 1) return target
    const e = 1 - Math.pow(1 - k, 3)
    return blend(m.from, target, e)
  })

  // The next frame is booked before this one runs, so one failing frame cannot stop the clock.
  let raf = 0
  const frame = () => {
    raf = requestAnimationFrame(frame)
    tick()
  }
  raf = requestAnimationFrame(frame)
  const background = window.setInterval(() => document.visibilityState === 'hidden' && tick(), 500)
  const saver = window.setInterval(() => current.phase.status === 'running' && persist(), 5000)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') persist()
    else {
      resumeAudio()
      tick()
    }
  }
  const onKey = (e: KeyboardEvent) => {
    // A sheet handles its own keys, and its Escape has already closed it by the time this runs.
    const inSheet = e.target instanceof Element && e.target.closest('[role="dialog"]')
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || summary() || endOpen() || soundOpen() || inSheet) return
    if (e.key === ' ') {
      e.preventDefault()
      if (current.phase.status === 'running') hold()
      else resume()
    } else if (e.key === 'ArrowRight') skip(1)
    else if (e.key === 'ArrowLeft') skip(-1)
    else if (e.key === 'Escape') setEndOpen(true)
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', onKey)
  onCleanup(() => {
    cancelAnimationFrame(raf)
    clearInterval(background)
    clearInterval(saver)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', persist)
    window.removeEventListener('keydown', onKey)
    persist()
    quiet()
    keepAwake.dispose()
    showNowPlaying(null)
  })
  // Arriving from a Begin tap starts straight away; a reload or a shared link waits for a tap.
  if (!run.resumed && recentlyPrimed()) resume()

  const upNext = createMemo(() => {
    const segs = state().timeline.segments
    const k = stepOf(stepList, loc().index)
    const after = stepList[k + 1]
    if (!after) return undefined
    return segs.slice(after.first, after.last + 1).find(seg => seg.kind !== 'prepare' && seg.kind !== 'switch')
  })

  const stepCount = createMemo(() => ({ at: stepOf(stepList, loc().index) + 1, of: stepList.length }))

  const remaining = () => loc().remainingMs / 1000
  const fraction = () => {
    const d = segment().durationSec * 1000
    return d > 0 ? Math.min(1, loc().intoMs / d) : 0
  }
  const mode = () => (props.practice.kind === 'yoga' ? 'yoga' : props.practice.kind)

  return (
    <Show when={!summary()} fallback={<Summary log={summary()!} practice={props.practice} onLog={l => void app.updateLog(l)} />}>
      <main class={['player', mode(), { prepping: segment().kind === 'prepare' || segment().kind === 'switch', paused: status() !== 'running' }]}>
        <div class="player-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${loc().totalMs ? loc().posMs / loc().totalMs : 0})` }} />
        </div>
        <header class="player-top">
          <button class="icon-btn" aria-label="End practice" onClick={() => setEndOpen(true)}>
            <Icon name="close" />
          </button>
          <div class="player-title">
            <span>{props.practice.title}</span>
            <small class="tabular">
              {stepCount().at} of {stepCount().of}
              <Show when={awake() === 'unavailable' && settings.keepAwake}> · screen may sleep</Show>
            </small>
          </div>
          <button class="icon-btn" aria-label="Sound and voice" onClick={() => setSoundOpen(true)}>
            <Icon name={settings.voice.enabled ? 'volume' : 'mute'} />
          </button>
        </header>

        <section class="player-stage" aria-live="polite">
          <Switch>
            <Match when={segment().kind === 'breath'}>
              <BreathOrb segment={segment()} intoMs={loc().intoMs} />
            </Match>
            <Match when={shown()}>
              {pose => (
                <div class="stage-figure">
                  <Figure pose={pose()} title={segment().title} />
                </div>
              )}
            </Match>
            <Match when={!shown()}>
              <div class={['calm-orb', { still: status() !== 'running' }]} />
            </Match>
          </Switch>
        </section>

        <section class="player-info">
          <p class="eyebrow">
            <Switch fallback={segment().label ?? kindLabel(segment())}>
              <Match when={segment().kind === 'prepare'}>{status() === 'waiting' ? 'When you are ready' : 'Next up'}</Match>
              <Match when={segment().kind === 'switch'}>Switch sides</Match>
            </Switch>
          </p>
          <h1 class="display player-name">{segment().title}</h1>
          <Show when={(segment().kind === 'prepare' || segment().kind === 'switch') && segment().label && segment().label !== 'Get ready'}>
            <p class="side-label">{segment().label}</p>
          </Show>
          <p class="player-text">{said()?.index === loc().index ? said()!.text : segment().text}</p>
        </section>

        <section class="player-clock">
          <Show
            when={status() !== 'waiting'}
            fallback={
              <button class="btn primary big ready-btn" onClick={() => resume()}>
                I'm ready
              </button>
            }
          >
            <Ring fraction={fraction()} big={segment().kind === 'prepare' || segment().kind === 'switch'}>
              <span class="tabular">{segment().kind === 'prepare' || segment().kind === 'switch' ? Math.ceil(remaining()) : clock(remaining())}</span>
            </Ring>
          </Show>
        </section>

        <nav class="player-controls" aria-label="Playback">
          <button class="skip-btn" aria-label="Previous" onClick={() => skip(-1)}>
            <Icon name="prev" fill size={26} />
          </button>
          <button class="play-btn" aria-label={status() === 'running' ? 'Pause' : 'Play'} onClick={() => (status() === 'running' ? hold() : resume())}>
            <Icon name={status() === 'running' ? 'pause' : 'play'} fill size={32} />
          </button>
          <button class="skip-btn" aria-label="Next" onClick={() => skip(1)}>
            <Icon name="next" fill size={26} />
          </button>
        </nav>

        <footer class="player-foot">
          <button class="pill" onClick={addTime}>
            +15 s
          </button>
          <Show when={upNext()} fallback={<span class="muted small">Last one</span>}>
            {n => (
              <span class="upnext">
                <span class="muted">Then</span> {n().title}
                <Show when={n().side}> · {n().side}</Show>
              </span>
            )}
          </Show>
          <span class="muted small tabular">{clock((loc().totalMs - loc().posMs) / 1000)} left</span>
        </footer>

        <Show when={!begun()}>
          <div class="player-gate">
            <div class="gate-card">
              <p class="eyebrow">{run.resumed ? 'Pick up where you left off' : minutes(state().timeline.totalSec)}</p>
              <h2 class="display">{props.practice.title}</h2>
              <p class="muted">{settings.keepAwake ? 'Your screen stays on while you practise. Tap pause any time.' : 'Tap pause any time.'}</p>
              <button class="btn primary big block" onClick={() => resume()}>
                <Icon name="play" fill size={18} /> {run.resumed ? 'Resume' : 'Begin'}
              </button>
            </div>
          </div>
        </Show>

        <Sheet open={endOpen()} onClose={() => setEndOpen(false)} title="End practice">
          <div class="stack">
            <h2 class="display">End this practice?</h2>
            <p class="muted">
              {practiced(state(), now()) >= 60000 ? `You have practised for ${minutes(practiced(state(), now()) / 1000)}. It will be saved to your journal.` : 'Less than a minute in, so nothing will be saved.'}
            </p>
            <button
              class="btn primary block"
              onClick={() => {
                setEndOpen(false)
                finish(false)
              }}
            >
              End practice
            </button>
            <button class="btn block" onClick={() => setEndOpen(false)}>
              Keep going
            </button>
          </div>
        </Sheet>

        <Sheet open={soundOpen()} onClose={() => setSoundOpen(false)} title="Sound">
          <div class="stack">
            <h2 class="display">Sound</h2>
            <div class="setting">
              <div>
                <strong>Voice guidance</strong>
                <small>Spoken pose names and cues</small>
              </div>
              <Segmented
                label="Voice"
                value={settings.voice.enabled ? settings.voice.detail : 'off'}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'names', label: 'Names' },
                  { value: 'full', label: 'Full' }
                ]}
                onChange={v =>
                  app.updateSettings(s => {
                    s.voice.enabled = v !== 'off'
                    if (v !== 'off') s.voice.detail = v as 'names' | 'full'
                    if (v === 'off') speaker.stop()
                  })
                }
              />
            </div>
            <div class="setting">
              <div>
                <strong>Background</strong>
                <small>Soft sound under your practice</small>
              </div>
              <Segmented
                label="Background sound"
                value={settings.sound.ambient}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'rain', label: 'Rain' },
                  { value: 'ocean', label: 'Ocean' },
                  { value: 'forest', label: 'Forest' },
                  { value: 'stream', label: 'Stream' }
                ]}
                onChange={v => {
                  app.updateSettings(s => void (s.sound.ambient = v))
                  if (current.phase.status === 'running') setAmbient(v, settings.sound.ambientVolume)
                }}
              />
            </div>
            <p class="muted small">Voice changes apply from the next cue. Detail changes apply next time you start.</p>
          </div>
        </Sheet>
      </main>
    </Show>
  )
}

const kindLabel = (s: Segment) =>
  ({ hold: 'Hold', flow: 'Flow', sit: 'Meditation', breath: 'Breathe', rest: 'Rest', prepare: 'Next up', switch: 'Switch sides' })[s.kind]

function Ring(props: { fraction: number; big?: boolean; children: import('@solidjs/web').JSX.Element }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div class={['ring', { big: props.big }]}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} class="ring-track" />
        <circle cx="60" cy="60" r={r} class="ring-fill" stroke-dasharray={String(c)} stroke-dashoffset={String(c * (1 - props.fraction))} />
      </svg>
      <div class="ring-label">{props.children}</div>
    </div>
  )
}

function BreathOrb(props: { segment: Segment; intoMs: number }) {
  const phase = createMemo(() => {
    const p = props.segment.breath!
    const lead = (props.segment.breathLeadSec ?? 0) * 1000
    const t = props.intoMs - lead
    if (t < 0) return { label: 'Settle in', scale: 0.6, left: Math.ceil(-t / 1000) }
    const cycle = (p.inhale + p.holdIn + p.exhale + p.holdOut) * 1000
    let x = t % cycle
    const parts: [number, string, (k: number) => number][] = [
      [p.inhale * 1000, 'Breathe in', k => 0.6 + 0.4 * k],
      [p.holdIn * 1000, 'Hold', () => 1],
      [p.exhale * 1000, 'Breathe out', k => 1 - 0.4 * k],
      [p.holdOut * 1000, 'Hold', () => 0.6]
    ]
    for (const [len, label, f] of parts) {
      if (len <= 0) continue
      if (x < len) {
        const k = x / len
        const eased = 0.5 - Math.cos(Math.PI * k) / 2
        return { label, scale: f(eased), left: Math.ceil((len - x) / 1000) }
      }
      x -= len
    }
    return { label: 'Breathe in', scale: 0.6, left: 0 }
  })
  return (
    <div class="breath-orb">
      <div class="orb" style={{ transform: `scale(${phase().scale})` }} />
      <div class="orb-label">
        <strong>{phase().label}</strong>
        <span class="tabular">{phase().left}</span>
      </div>
    </div>
  )
}

const FEELINGS = [
  { value: 1, label: 'Heavy' },
  { value: 2, label: 'Restless' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Calm' },
  { value: 5, label: 'Bright' }
] as const

function Summary(props: { log: SessionLog; practice: Practice; onLog: (log: SessionLog) => void }) {
  const app = useApp()
  const [feeling, setFeeling] = createSignal<SessionLog['feeling']>(undefined)
  const [note, setNote] = createSignal('')
  const save = () => props.onLog({ ...props.log, feeling: feeling(), note: note().trim() || undefined })
  const todayCount = () => app.logs().filter(l => new Date(l.startedAt).toDateString() === new Date().toDateString()).length
  return (
    <main class={['player', 'summary', props.practice.kind]}>
      <div class="summary-card">
        <div class="summary-mark">
          <Icon name={props.log.completed ? 'check' : 'leaf'} size={30} />
        </div>
        <p class="eyebrow">{props.log.completed ? 'Practice complete' : 'Practice saved'}</p>
        <h1 class="display">{props.log.completed ? <>Well <em>practised.</em></> : <>Every minute <em>counts.</em></>}</h1>
        <p class="muted">
          {minutes(props.log.practicedSec)} of {props.practice.title}
          {todayCount() > 1 ? `, your ${ordinal(todayCount())} practice today.` : '.'}
        </p>
        <div class="stack" style={{ 'text-align': 'left', 'margin-top': '22px' }}>
          <p class="eyebrow">How do you feel?</p>
          <div class="feelings" role="group" aria-label="How do you feel">
            <For each={FEELINGS}>
              {f => (
                <button aria-pressed={pressed(feeling() === f.value)} onClick={() => setFeeling(f.value)}>
                  <span class="feel-dot" data-v={f.value} />
                  {f.label}
                </button>
              )}
            </For>
          </div>
          <textarea class="input" placeholder="A note for your journal (optional)" value={note()} onInput={e => setNote(e.currentTarget.value)} />
          {/* The finished run's page is replaced, so going back does not open it again. */}
          <a class="btn primary big block" href="/journal" replace onClick={() => save()}>
            Save to journal
          </a>
          <a class="btn ghost block" href="/" replace onClick={() => save()}>
            Done
          </a>
        </div>
      </div>
    </main>
  )
}

const ordinal = (n: number) => (['first', 'second', 'third', 'fourth', 'fifth'][n - 1] ?? `${n}th`)
