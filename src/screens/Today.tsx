import { createMemo, createSignal, For, onSettled, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useApp } from '../state/app'
import { dayKey, minutesOn, streaks, weekDays, parseDay } from '../domain/stats'
import { Icon } from '../ui/icons'
import { KIND_LABEL, PracticeArt, PracticeCard, clock, minutes } from '../ui/kit'
import { estimateSec } from '../domain/timeline'
import { locate } from '../domain/player'
import { primeForPractice } from '../engine/session'
import type { Practice } from '../domain/types'
import { SOURCE_URL } from '../seo'

const greeting = (h: number) => (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night')

// What to suggest depends on the hour. These ids are built-in practices.
const SUGGEST: [maxHour: number, ids: string[]][] = [
  [5, ['sleep-wind-down', 'breath-awareness']],
  [11, ['morning-flow', 'gentle-wake-up', 'morning-intention']],
  [14, ['desk-break', 'box-breathing', 'breath-awareness']],
  [18, ['standing-strength', 'hips-and-hamstrings', 'breathing-space']],
  [21, ['evening-wind-down', 'body-scan', 'extended-exhale']],
  [24, ['sleep-wind-down', 'relaxing-breath', 'evening-wind-down']]
]

export default function Today() {
  const app = useApp()
  const navigate = useNavigate()
  // An installed app resumes without reloading, so the time is read again on return.
  const [stamp, setStamp] = createSignal(Date.now())
  onSettled(() => {
    const check = () => setStamp(Date.now())
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  })
  const hour = createMemo(() => new Date(stamp()).getHours())
  const today = createMemo(() => dayKey(stamp()))
  const streak = createMemo(() => streaks(app.logs(), today()))
  const todayMin = createMemo(() => minutesOn(app.logs(), today()))
  const week = createMemo(() => weekDays(today(), app.settings.weekStart).map(d => ({ day: d, min: minutesOn(app.logs(), d) })))

  const suggestion = createMemo<Practice | undefined>(() => {
    const ids = SUGGEST.find(([h]) => hour() < h)?.[1] ?? []
    const fav = app.favorites().map(id => app.practice(id)).find(Boolean)
    return ids.map(id => app.practice(id)).find(Boolean) ?? fav ?? app.practices()[0]
  })

  const resume = createMemo(() => {
    const a = app.active()
    if (!a || Date.now() - a.savedAt > 12 * 3600_000 || !app.practice(a.practice)) return null
    const s = a.player
    const pos = s.phase.status === 'running' ? a.savedAt - s.phase.originMs : 'posMs' in s.phase ? s.phase.posMs : 0
    const at = locate(s.timeline, pos)
    return { ...a, left: (at.totalMs - at.posMs) / 1000, step: at.segment.title }
  })

  const continuePath = createMemo(() => {
    for (const path of app.paths) {
      const done = new Set(app.logs().filter(l => l.path?.id === path.id && l.completed).map(l => l.path!.day))
      if (done.size === 0 || done.size >= path.days.length) continue
      const day = path.days.findIndex((_, i) => !done.has(i + 1)) + 1
      return { path, day, done: done.size }
    }
    return null
  })

  const begin = (p: Practice) => {
    primeForPractice(app.settings)
    navigate(`/play/${p.id}`)
  }

  const picks = (kind: Practice['kind']) => app.practices().filter(p => p.kind === kind && p.origin === 'builtin').slice(0, 3)

  return (
    <main class="page">
      <header class="topbar">
        <span class="brand">
          still<span>.</span>
        </span>
        <a class="icon-btn" href="/settings" aria-label="Settings">
          <Icon name="settings" />
        </a>
      </header>

      <div>
        <p class="eyebrow">{greeting(hour())}</p>
        <h1 class="display" style={{ 'margin-top': '6px' }}>
          A little space <em>for yourself.</em>
        </h1>
      </div>

      <Show when={resume()}>
        {r => (
          <a class="banner" href={`/play/${r().practice}?resume=1`}>
            <Icon name="play" fill size={18} />
            <div class="grow">
              <strong>Resume {r().title}</strong>
              <div class="small muted">
                {r().step} · {clock(r().left)} left
              </div>
            </div>
            <Icon name="chevron" />
          </a>
        )}
      </Show>

      <Show when={suggestion()}>
        {p => (
          <section class="hero">
            <div class="hero-content stack">
              <p class="eyebrow">Suggested now</p>
              <h2 class="display">{p().title}</h2>
              <p class="lede small">{p().summary}</p>
              <div class="row wrap">
                <button class="btn primary" onClick={() => begin(p())}>
                  <Icon name="play" fill size={16} /> Begin · {minutes(estimateSec(p(), app.poses(), app.settings))}
                </button>
                <a class="btn ghost small" href={`/practices/${p().id}`}>
                  Details
                </a>
              </div>
            </div>
            <PracticeArt practice={p()} class="hero-art" />
          </section>
        )}
      </Show>

      <section class="card pad stack">
        <div class="section-head">
          <h2 class="display" style={{ 'font-size': '1.25rem' }}>
            This week
          </h2>
          <a href="/journal">Journal</a>
        </div>
        <div class="week">
          <For each={week()}>
            {d => (
              <div class="day">
                <span>{parseDay(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                <span class={['dot', { done: d.min > 0, today: d.day === today() }]} title={`${d.min} min`}>
                  <Show when={d.min > 0}>
                    <Icon name="check" size={16} />
                  </Show>
                </span>
              </div>
            )}
          </For>
        </div>
        <div class="stats">
          <div class="stat">
            <strong>{streak().current}</strong>
            <span>streak</span>
          </div>
          <div class="stat">
            <strong>
              {todayMin()}
              <Show when={app.settings.goalMin > 0}>
                <span class="muted" style={{ 'font-size': '1rem' }}>
                  /{app.settings.goalMin}
                </span>
              </Show>
            </strong>
            <span>min today</span>
          </div>
          <div class="stat">
            <strong>{week().reduce((s, d) => s + d.min, 0)}</strong>
            <span>min this week</span>
          </div>
        </div>
      </section>

      <Show when={continuePath()}>
        {c => (
          <a class="card pad row" href={`/paths/${c().path.id}`}>
            <span class="thumb" style={{ background: 'var(--sage-soft)', color: 'var(--sage)' }}>
              <Icon name="path" />
            </span>
            <div class="grow">
              <p class="eyebrow">Continue your path</p>
              <strong>
                {c().path.title}, day {c().day}
              </strong>
              <div class="small muted">
                {c().done} of {c().path.days.length} days done
              </div>
            </div>
            <Icon name="chevron" />
          </a>
        )}
      </Show>

      <For each={['yoga', 'meditation', 'breath'] as const}>
        {kind => (
          <section class="stack">
            <div class="section-head">
              <h2 class="display">{kind === 'yoga' ? 'Move' : kind === 'meditation' ? 'Be still' : 'Breathe'}</h2>
              <a href={`/practices?kind=${kind}`}>All {KIND_LABEL[kind].toLowerCase()}</a>
            </div>
            <div class="practice-grid">
              <For each={picks(kind)}>{p => <PracticeCard practice={p} />}</For>
            </div>
          </section>
        )}
      </For>

      <Show when={app.userPractices().length > 0}>
        <section class="stack">
          <div class="section-head">
            <h2 class="display">Yours</h2>
            <a href="/practices?kind=mine">See all</a>
          </div>
          <div class="practice-grid">
            <For each={app.userPractices().slice(0, 4)}>{p => <PracticeCard practice={p} />}</For>
          </div>
        </section>
      </Show>

      <footer class="muted small" style={{ 'text-align': 'center', padding: '12px 0' }}>
        <a href="/about">About still.</a> · <a href="/about#feedback">Feedback</a> · <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Open source</a>
        <br />
        Free, private, works offline
      </footer>
    </main>
  )
}
