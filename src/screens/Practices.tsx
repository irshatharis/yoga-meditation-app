import { createMemo, For, Show, untrack } from 'solid-js'
import { useSearchParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { estimateSec } from '../domain/timeline'
import { Icon } from '../ui/icons'
import { PracticeCard, pressed } from '../ui/kit'
import type { Practice } from '../domain/types'

type Filter = 'all' | Practice['kind'] | 'mine' | 'saved'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'breath', label: 'Breathwork' },
  { value: 'saved', label: 'Saved' },
  { value: 'mine', label: 'Mine' }
]
type Length = 'any' | 'short' | 'medium' | 'long'
const LENGTHS: { value: Length; label: string; test: (min: number) => boolean }[] = [
  { value: 'any', label: 'Any length', test: () => true },
  { value: 'short', label: 'Under 10 min', test: m => m < 10 },
  { value: 'medium', label: '10 to 25 min', test: m => m >= 10 && m <= 25 },
  { value: 'long', label: 'Over 25 min', test: m => m > 25 }
]

export default function Practices() {
  const app = useApp()
  const [search, setSearch] = useSearchParams()
  // Search and filters live in the URL so they are still there after opening a result and coming back.
  const query = () => (typeof search.q === 'string' ? search.q : '')
  const setQuery = (q: string) => setSearch({ q: q || undefined }, { replace: true })
  const length = () => LENGTHS.find(l => l.value === search.len)?.value ?? 'any'
  const setLength = (len: Length) => setSearch({ len: len === 'any' ? undefined : len }, { replace: true })
  const filter = () => ((search.kind as Filter) || 'all') as Filter

  const list = createMemo(() => {
    const q = query().trim().toLowerCase()
    const lengthTest = LENGTHS.find(l => l.value === length())!.test
    return app.practices().filter(p => {
      const f = filter()
      if (f === 'mine' && p.origin === 'builtin') return false
      if (f === 'saved' && !app.favorites().includes(p.id)) return false
      if ((f === 'yoga' || f === 'meditation' || f === 'breath') && p.kind !== f) return false
      if (q && !`${p.title} ${p.summary} ${p.focus.join(' ')}`.toLowerCase().includes(q)) return false
      if (length() !== 'any' && !p.adjustable && !lengthTest(estimateSec(p, app.poses(), app.settings) / 60)) return false
      return true
    })
  })

  return (
    <main class="page">
      <header class="topbar">
        <h1 class="display" style={{ 'font-size': '2rem' }}>
          Practices
        </h1>
        <a class="btn small" href="/practices/new">
          <Icon name="plus" size={16} /> Create
        </a>
      </header>

      <Show when={untrack(() => filter()) === 'all'}>
        <section class="stack">
          <p class="eyebrow">Paths</p>
          <div class="chips" style={{ gap: '10px' }}>
            <For each={app.paths}>
              {path => {
                const done = () => new Set(app.logs().filter(l => l.path?.id === path.id && l.completed).map(l => l.path!.day)).size
                return (
                  <a class="card pad path-card" href={`/paths/${path.id}`}>
                    <span class={['tag', path.kind]}>{path.days.length} days</span>
                    <strong>{path.title}</strong>
                    <span class="small muted">{path.summary}</span>
                    <div class="bars" aria-label={`${done()} of ${path.days.length} days done`}>
                      <span style={{ width: `${(done() / path.days.length) * 100}%`, background: 'var(--sage)' }} />
                    </div>
                  </a>
                )
              }}
            </For>
          </div>
        </section>
      </Show>

      <div class="stack">
        <label class="search">
          <Icon name="search" size={18} />
          <input class="input" type="search" placeholder="Search practices" value={query()} onInput={e => setQuery(e.currentTarget.value)} aria-label="Search practices" />
        </label>
        <div class="chips" role="group" aria-label="Kind">
          <For each={FILTERS}>
            {f => (
              <button class="chip" aria-pressed={pressed(filter() === f.value)} onClick={() => setSearch({ kind: f.value === 'all' ? undefined : f.value }, { replace: true })}>
                {f.label}
              </button>
            )}
          </For>
        </div>
        <div class="chips" role="group" aria-label="Length">
          <For each={LENGTHS}>
            {l => (
              <button class="chip" aria-pressed={pressed(length() === l.value)} onClick={() => setLength(l.value)}>
                {l.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show
        when={list().length > 0}
        fallback={
          <div class="empty">
            <p>{filter() === 'mine' ? 'Practices you create or import will show up here.' : filter() === 'saved' ? 'Tap the heart on any practice to keep it here.' : 'Nothing matches that search.'}</p>
            <Show when={filter() === 'mine'}>
              <a class="btn primary" href="/practices/new">
                <Icon name="plus" size={16} /> Create a practice
              </a>
            </Show>
          </div>
        }
      >
        <div class="practice-grid">
          <For each={list()}>{p => <PracticeCard practice={p} />}</For>
        </div>
      </Show>
    </main>
  )
}
