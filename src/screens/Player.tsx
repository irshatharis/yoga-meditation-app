import { createEffect, createMemo, createSignal, For, Match, onSettled, Show, Switch, untrack } from 'solid-js'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Figure } from '../figure/Figure'
import { blend, type FigurePose } from '../figure/skeleton'
import { advance, back, dueCues, extend, locate, next, pause, play, position, start, type PlayerState } from '../domain/player'
import { compile, type Segment, type Timeline } from '../domain/timeline'
import type { PathId, Practice, SessionLog } from '../domain/types'
import { createKeepAwake, type AwakeState } from '../engine/awake'
import { resumeAudio, setAmbient, setKeepAlive, silence } from '../engine/audio'
import { mediaSession, playCue, primeForPractice, recentlyPrimed, stopVoice, vibrate } from '../engine/session'
import { useApp, type ActiveSession } from '../state/app'
import { Icon } from '../ui/icons'
import { clock, minutes, Segmented, Sheet, pressed } from '../ui/kit'
import { newId } from '../store/transfer'
import '../ui/player.css'

const reduceMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Player() {
  const app = useApp()
  const params = useParams()
  const [search] = useSearchParams()
  const practice = untrack(() => app.practice(params.id ?? ''))
  return (
    <Show when={practice} fallback={<Missing />}>
      {p => <Session practice={p()} resume={untrack(() => search.resume === '1')} lengthSec={untrack(() => Number(search.len) || undefined)} scale={untrack(() => Number(search.scale) || undefined)} bells={untrack(() => (search.bells === undefined ? undefined : Number(search.bells)))} path={untrack(() => (search.path ? { id: search.path as PathId, day: Number(search.day) || 1 } : undefined))} />}
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

type SessionProps = { practice: Practice; resume: boolean; lengthSec?: number; scale?: number; bells?: number; path?: { id: PathId; day: number } }

function initialState(props: SessionProps, active: ActiveSession | null, build: () => Timeline): { state: PlayerState; startedAt: number } {
  if (props.resume && active && active.practice === props.practice.id) {
    const s = active.player
    // Time kept passing while the app was closed. Resume where it was saved.
    const posMs = s.phase.status === 'running' ? active.savedAt - s.phase.originMs : 'posMs' in s.phase ? s.phase.posMs : 0
    return { state: { ...s, phase: { status: 'paused', posMs } }, startedAt: active.startedAt }
  }
  return { state: start(build()), startedAt: Date.now() }
}

function Session(props: SessionProps) {
  const app = useApp()
  const navigate = useNavigate()
  const settings = app.settings
  const init = untrack(() =>
    initialState(props, app.active(), () => compile(props.practice, app.poses(), settings, { lengthSec: props.lengthSec, scale: props.scale, intervalBellSec: props.bells }))
  )
  let current = init.state
  let lastPos = -1
  let log: SessionLog | null = null

  const [state, setState] = createSignal<PlayerState>(current)
  const [now, setNow] = createSignal(Date.now())
  const [awake, setAwake] = createSignal<AwakeState>('off')
  const [endOpen, setEndOpen] = createSignal(false)
  const [soundOpen, setSoundOpen] = createSignal(false)
  const [summary, setSummary] = createSignal<SessionLog | null>(null)
  // The last spoken line, tagged with its segment so it clears itself when the segment changes.
  const [said, setSaid] = createSignal<{ index: number; text: string } | null>(null)

  const loc = createMemo(() => locate(state().timeline, position(state(), now())))
  const segment = () => loc().segment
  const status = () => state().phase.status

  const keepAwake = createKeepAwake(setAwake)
  const media = mediaSession({
    play: () => toggle(true),
    pause: () => toggle(false),
    next: () => skip(1),
    prev: () => skip(-1),
    stop: () => setEndOpen(true)
  })

  const commit = (next: PlayerState) => {
    current = next
    setState(next)
  }

  const persist = () => {
    if (current.phase.status === 'done' || current.phase.status === 'ready') return
    app.saveActive({
      practice: props.practice.id,
      title: props.practice.title,
      kind: props.practice.kind,
      startedAt: init.startedAt,
      savedAt: Date.now(),
      player: current,
      path: props.path
    })
  }

  const finish = (completed: boolean) => {
    const t = Date.now()
    const practicedSec = Math.round(position(current, t) / 1000)
    keepAwake.off()
    setKeepAlive(false)
    silence()
    media.dispose()
    app.saveActive(null)
    if (!completed && practicedSec < 60) {
      stopVoice()
      navigate(`/practices/${props.practice.id}`, { replace: true })
      return
    }
    log = {
      id: newId('log'),
      practice: props.practice.id,
      title: props.practice.title,
      kind: props.practice.kind,
      startedAt: init.startedAt,
      endedAt: t,
      plannedSec: current.timeline.totalSec,
      practicedSec,
      completed,
      ...(props.path ? { path: props.path } : {})
    }
    void app.addLog(log)
    if (completed) {
      playCue({ at: 0, sound: 'end', say: settings.voice.detail === 'quiet' ? undefined : 'Your practice is complete. Take a moment before you move on.' }, settings)
    } else stopVoice()
    setSummary(log)
  }

  const loop = () => {
    const t = Date.now()
    const before = current
    if (before.phase.status === 'running') {
      const after = advance(before, t)
      if (after !== before) commit(after)
      const pos = position(after, t)
      for (const cue of dueCues(after.timeline, lastPos, Math.min(pos, after.timeline.totalSec * 1000))) {
        playCue(cue, settings)
        if (cue.say) setSaid({ index: Number(cue.key.split(':')[0]), text: cue.say })
      }
      lastPos = pos
      if (after.phase.status === 'waiting') {
        playCue({ at: 0, sound: 'tick' }, settings)
        vibrate(settings, 30)
      }
      if (after.phase.status === 'done') finish(true)
    }
    setNow(t)
  }

  const run = () => {
    keepAwake.on()
    setKeepAlive(true)
    resumeAudio()
    setAmbient(settings.sound.ambient, settings.sound.ambientVolume)
  }

  function toggle(want?: boolean) {
    // Once the practice has ended, the lock-screen play button must not restart it.
    if (log) return
    const t = Date.now()
    const playing = current.phase.status === 'running'
    if (want === playing) return
    if (playing) {
      commit(pause(current, t))
      stopVoice()
      silence()
      keepAwake.off()
      persist()
    } else {
      primeForPractice(settings)
      const wasWaiting = current.phase.status === 'waiting'
      commit(play(current, t))
      lastPos = wasWaiting || current.phase.status === 'running' && lastPos < 0 ? position(current, t) - 1 : position(current, t)
      run()
      loop()
    }
  }

  function skip(direction: 1 | -1) {
    const t = Date.now()
    stopVoice()
    commit(direction === 1 ? next(current, t) : back(current, t))
    if (current.phase.status === 'done') {
      finish(true)
      return
    }
    lastPos = position(current, t) - 1
    loop()
  }

  const addTime = () => {
    commit(extend(current, Date.now(), 15))
    vibrate(settings, 15)
  }

  // When the segment changes, the figure morphs from the previous pose.
  const morph = createMemo<{ index: number; from: FigurePose | null; at: number }>(prev => {
    const index = loc().index
    if (prev && prev.index === index) return prev
    return untrack(() => ({ index, from: prev && !reduceMotion() ? (state().timeline.segments[prev.index]?.figure ?? null) : null, at: now() }))
  })

  createEffect(
    () => loc().index,
    (index, prev) => {
      if (prev !== undefined && index !== prev) untrack(() => vibrate(settings, [20, 40, 20]))
    }
  )

  const mediaInfo = createMemo(
    () => {
      const l = loc()
      return { title: l.segment.title, practice: props.practice.title, playing: status() === 'running', posSec: Math.floor(l.posMs / 5000) * 5, totalSec: l.totalMs / 1000 }
    },
    { equals: (a, b) => a.title === b.title && a.playing === b.playing && a.posSec === b.posSec }
  )
  createEffect(mediaInfo, info => media.update(info))

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

  onSettled(() => {
    let raf = 0
    const frame = () => {
      loop()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    // rAF stops while hidden; the interval keeps cues and the clock moving.
    const interval = window.setInterval(() => document.visibilityState === 'hidden' && loop(), 500)
    const saver = window.setInterval(() => current.phase.status === 'running' && persist(), 5000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
      else {
        resumeAudio()
        loop()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || summary()) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight') skip(1)
      else if (e.key === 'ArrowLeft') skip(-1)
      else if (e.key === 'Escape') setEndOpen(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persist)
    window.addEventListener('keydown', onKey)
    if (current.phase.status === 'ready' && recentlyPrimed()) toggle(true)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(interval)
      clearInterval(saver)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persist)
      window.removeEventListener('keydown', onKey)
      if (current.phase.status !== 'done' && !log) persist()
      stopVoice()
      silence()
      setKeepAlive(false)
      keepAwake.dispose()
      media.dispose()
    }
  })

  const upNext = createMemo(() => {
    const segs = state().timeline.segments
    const isGap = (k: string) => k === 'prepare' || k === 'switch'
    // During a get-ready gap the step being prepared is already on screen, so look past it.
    let skip = isGap(segs[loc().index]!.kind) ? 1 : 0
    for (let i = loc().index + 1; i < segs.length; i++) {
      if (isGap(segs[i]!.kind)) continue
      if (skip-- > 0) continue
      return segs[i]
    }
    return undefined
  })

  const stepCount = createMemo(() => {
    const segs = state().timeline.segments
    // Counted the way the outline lists them: a whole flow is one step, and a
    // get-ready gap belongs to the step it introduces.
    const isGap = (k: string) => k === 'prepare' || k === 'switch'
    const firsts: number[] = []
    segs.forEach((seg, i) => {
      if (isGap(seg.kind)) return
      const prev = segs[firsts.at(-1) ?? -1]
      if (seg.kind === 'flow' && prev?.kind === 'flow' && prev.item === seg.item) return
      firsts.push(i)
    })
    const target = segs.findIndex((seg, i) => i >= loc().index && !isGap(seg.kind))
    const at = firsts.filter(i => i <= (target === -1 ? segs.length : target)).length
    return { at: Math.max(1, at), of: firsts.length }
  })

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
              <button class="btn primary big ready-btn" onClick={() => toggle(true)}>
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
          <button class="icon-btn" aria-label="Previous" onClick={() => skip(-1)}>
            <Icon name="prev" fill size={22} />
          </button>
          <button class="play-btn" aria-label={status() === 'running' ? 'Pause' : 'Play'} onClick={() => toggle()}>
            <Icon name={status() === 'running' ? 'pause' : 'play'} fill size={30} />
          </button>
          <button class="icon-btn" aria-label="Next" onClick={() => skip(1)}>
            <Icon name="next" fill size={22} />
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

        <Show when={status() === 'ready' || (status() === 'paused' && lastPos < 0)}>
          <div class="player-gate">
            <div class="gate-card">
              <p class="eyebrow">{props.resume ? 'Pick up where you left off' : minutes(state().timeline.totalSec)}</p>
              <h2 class="display">{props.practice.title}</h2>
              <p class="muted">Your screen stays on while you practise. Tap pause any time.</p>
              <button class="btn primary big block" onClick={() => toggle(true)}>
                <Icon name="play" fill size={18} /> {props.resume ? 'Resume' : 'Begin'}
              </button>
            </div>
          </div>
        </Show>

        <Sheet open={endOpen()} onClose={() => setEndOpen(false)} title="End practice">
          <div class="stack">
            <h2 class="display">End this practice?</h2>
            <p class="muted">
              {loc().posMs >= 60000 ? `You have practised for ${minutes(loc().posMs / 1000)}. It will be saved to your journal.` : 'Less than a minute in, so nothing will be saved.'}
            </p>
            <button
              class="btn primary block"
              onClick={() => {
                setEndOpen(false)
                if (current.phase.status === 'running') commit(pause(current, Date.now()))
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
                    if (v === 'off') stopVoice()
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
          <a
            class="btn primary big block"
            href="/journal"
            onClick={() => save()}
          >
            Save to journal
          </a>
          <a class="btn ghost block" href="/" onClick={() => save()}>
            Done
          </a>
        </div>
      </div>
    </main>
  )
}

const ordinal = (n: number) => (['first', 'second', 'third', 'fourth', 'fifth'][n - 1] ?? `${n}th`)
