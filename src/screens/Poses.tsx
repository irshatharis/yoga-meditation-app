import { createMemo, For, Show } from 'solid-js'
import { useSearchParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { Figure } from '../figure/Figure'
import { Icon } from '../ui/icons'
import { FAMILIES, type Family } from '../domain/types'
import { pressed } from '../ui/kit'

const FAMILY_LABEL: Record<Family, string> = {
  standing: 'Standing',
  balance: 'Balance',
  seated: 'Seated',
  kneeling: 'Kneeling',
  prone: 'Belly',
  supine: 'Back',
  'arm-support': 'Arm support',
  inversion: 'Inversion',
  rest: 'Rest'
}

export default function Poses() {
  const app = useApp()
  const [search, setSearch] = useSearchParams()
  const query = () => (typeof search.q === 'string' ? search.q : '')
  const setQuery = (q: string) => setSearch({ q: q || undefined }, { replace: true })
  const family = (): Family | 'all' | 'mine' => (search.family === 'mine' || FAMILIES.includes(search.family as Family) ? (search.family as Family | 'mine') : 'all')
  const setFamily = (f: Family | 'all' | 'mine') => setSearch({ family: f === 'all' ? undefined : f }, { replace: true })
  const list = createMemo(() => {
    const q = query().trim().toLowerCase()
    return [...app.poses().values()]
      .filter(p => (family() === 'all' ? true : family() === 'mine' ? p.origin !== 'builtin' : p.family === family()))
      .filter(p => !q || `${p.name} ${p.sanskrit ?? ''} ${p.focus.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  })
  const families = createMemo(() => FAMILIES.filter(f => [...app.poses().values()].some(p => p.family === f)))

  return (
    <main class="page">
      <header class="topbar">
        <h1 class="display" style={{ 'font-size': '2rem' }}>
          Poses
        </h1>
        <a class="btn small" href="/poses/new">
          <Icon name="plus" size={16} /> Add pose
        </a>
      </header>
      <div class="stack">
        <label class="search">
          <Icon name="search" size={18} />
          <input class="input" type="search" placeholder="Search by name, Sanskrit, or body area" value={query()} onInput={e => setQuery(e.currentTarget.value)} aria-label="Search poses" />
        </label>
        <div class="chips" role="group" aria-label="Pose family">
          <button class="chip" aria-pressed={pressed(family() === 'all')} onClick={() => setFamily('all')}>
            All
          </button>
          <For each={families()}>
            {f => (
              <button class="chip" aria-pressed={pressed(family() === f)} onClick={() => setFamily(f)}>
                {FAMILY_LABEL[f]}
              </button>
            )}
          </For>
          <button class="chip" aria-pressed={pressed(family() === 'mine')} onClick={() => setFamily('mine')}>
            Mine
          </button>
        </div>
      </div>
      <Show when={list().length} fallback={<p class="empty">No poses match. You can add your own.</p>}>
        <div class="pose-grid">
          <For each={list()}>
            {p => (
              <a class="pose-tile" href={`/poses/${p.id}`}>
                <div class="pose-tile-art">
                  <Show when={p.figure} fallback={<Icon name="image" size={28} />}>
                    {f => <Figure pose={f()} mat={false} title="" />}
                  </Show>
                </div>
                <strong>{p.name}</strong>
                <span class="small muted">{p.sanskrit ?? FAMILY_LABEL[p.family]}</span>
              </a>
            )}
          </For>
        </div>
      </Show>
      <p class="small muted" style={{ 'text-align': 'center' }}>
        {app.poses().size} poses. Illustrations are drawn by still. from a shared body model.
      </p>
    </main>
  )
}

export { FAMILY_LABEL }
