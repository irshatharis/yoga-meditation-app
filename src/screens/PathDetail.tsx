import { createMemo, For, Show } from 'solid-js'
import { useParams } from '@solidjs/router'
import { useApp } from '../state/app'
import { Icon } from '../ui/icons'
import { KIND_LABEL, minutes, useBack } from '../ui/kit'
import { estimateSec } from '../domain/timeline'

export default function PathDetail() {
  const app = useApp()
  const params = useParams()
  const back = useBack(() => '/practices')
  const path = createMemo(() => app.paths.find(p => p.id === params.id))
  const done = createMemo(() => new Set(app.logs().filter(l => l.path?.id === params.id && l.completed).map(l => l.path!.day)))
  const nextDay = createMemo(() => (path()?.days.findIndex((_, i) => !done().has(i + 1)) ?? -1) + 1)

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="back" />
        </button>
      </header>
      <Show when={path()} fallback={<p class="empty">This path does not exist.</p>}>
        {p => (
          <>
            <div class="stack">
              <span class={['tag', p().kind]}>
                {KIND_LABEL[p().kind]} path · {p().days.length} days
              </span>
              <h1 class="display">{p().title}</h1>
              <p class="lede">{p().summary}</p>
              <div class="bars">
                <span style={{ width: `${(done().size / p().days.length) * 100}%`, background: 'var(--sage)' }} />
              </div>
              <p class="small muted">
                {done().size === p().days.length ? 'Path complete. Beautifully done.' : `${done().size} of ${p().days.length} days done. One day at a time, at your own pace.`}
              </p>
            </div>
            <div class="card" style={{ padding: '4px 16px' }}>
              <div class="list">
                <For each={p().days}>
                  {(day, i) => {
                    const practice = () => app.practice(day.practice)
                    const n = () => i() + 1
                    return (
                      <a class="list-row" href={`/practices/${day.practice}?path=${p().id}&day=${n()}`}>
                        <span class={['path-day', { done: done().has(n()), next: nextDay() === n() }]}>
                          <Show when={done().has(n())} fallback={n()}>
                            <Icon name="check" size={16} />
                          </Show>
                        </span>
                        <span class="grow">
                          <strong style={{ 'font-weight': 550 }}>{practice()?.title ?? 'Missing practice'}</strong>
                          <span class="small muted" style={{ display: 'block' }}>
                            {day.note}
                          </span>
                        </span>
                        <span class="small muted">{practice() ? minutes(estimateSec(practice()!, app.poses(), app.settings)) : ''}</span>
                      </a>
                    )
                  }}
                </For>
              </div>
            </div>
          </>
        )}
      </Show>
    </main>
  )
}
