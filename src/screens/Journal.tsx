import { createMemo, createSignal, For, Show } from 'solid-js'
import { useApp } from '../state/app'
import { addDays, byDay, dayKey, parseDay, streaks, totals, type DayKey } from '../domain/stats'
import { Icon } from '../ui/icons'
import { KIND_LABEL, Sheet, minutes, toast, pressed } from '../ui/kit'
import type { SessionLog } from '../domain/types'

const FEELING = ['', 'Heavy', 'Restless', 'Steady', 'Calm', 'Bright']

export default function Journal() {
  const app = useApp()
  const today = dayKey(Date.now())
  const [selected, setSelected] = createSignal<DayKey>(today)
  const [monthsShown, setMonthsShown] = createSignal(3)
  const [editing, setEditing] = createSignal<SessionLog | null>(null)
  const days = createMemo(() => byDay(app.logs()))
  const s = createMemo(() => streaks(app.logs(), today))
  const t = createMemo(() => totals(app.logs()))

  const months = createMemo(() => {
    const out: { label: string; cells: (DayKey | null)[] }[] = []
    const now = parseDay(today)
    for (let m = 0; m < monthsShown(); m++) {
      const first = new Date(now.getFullYear(), now.getMonth() - m, 1)
      const lead = (first.getDay() - app.settings.weekStart + 7) % 7
      const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
      const cells: (DayKey | null)[] = Array.from({ length: lead }, () => null)
      for (let d = 1; d <= count; d++) cells.push(dayKey(new Date(first.getFullYear(), first.getMonth(), d).getTime()))
      out.push({ label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), cells })
    }
    return out
  })
  const dows = createMemo(() => Array.from({ length: 7 }, (_, i) => parseDay(addDays('2026-11-15', i + app.settings.weekStart)).toLocaleDateString(undefined, { weekday: 'narrow' })))

  const level = (d: DayKey) => {
    const min = (days().get(d) ?? []).reduce((sum, l) => sum + l.practicedSec, 0) / 60
    if (min <= 0) return 0
    const goal = app.settings.goalMin || 15
    return min >= goal * 1.5 ? 3 : min >= goal ? 2 : 1
  }
  const dayLogs = () => days().get(selected()) ?? []
  const kindShare = () => {
    const total = Math.max(1, t().byKind.yoga + t().byKind.meditation + t().byKind.breath)
    return (['yoga', 'meditation', 'breath'] as const).map(k => ({ k, pct: (t().byKind[k] / total) * 100 }))
  }

  return (
    <main class="page">
      <header class="topbar">
        <h1 class="display" style={{ 'font-size': '2rem' }}>
          Journal
        </h1>
        <a class="icon-btn" href="/settings#data" aria-label="Export or import">
          <Icon name="download" />
        </a>
      </header>

      <div class="stats">
        <div class="stat">
          <strong>{s().current}</strong>
          <span>day streak</span>
        </div>
        <div class="stat">
          <strong>{s().longest}</strong>
          <span>longest streak</span>
        </div>
        <div class="stat">
          <strong>{t().minutes >= 600 ? `${Math.round(t().minutes / 60)}h` : t().minutes}</strong>
          <span>{t().minutes >= 600 ? 'hours total' : 'minutes total'}</span>
        </div>
      </div>

      <Show when={t().minutes > 0}>
        <section class="card pad stack">
          <div class="bars">
            <For each={kindShare()}>{x => <span style={{ width: `${x.pct}%`, background: x.k === 'yoga' ? 'var(--accent)' : x.k === 'meditation' ? 'var(--dusk)' : 'var(--tide)' }} />}</For>
          </div>
          <div class="row wrap small" style={{ gap: '16px' }}>
            <For each={kindShare()}>
              {x => (
                <span>
                  <span class={['tag', x.k]}>{KIND_LABEL[x.k]}</span> {t().byKind[x.k]} min
                </span>
              )}
            </For>
            <span class="muted">{t().sessions} sessions</span>
          </div>
        </section>
      </Show>

      <section class="card pad stack">
        <div class="section-head">
          <h2 class="display" style={{ 'font-size': '1.2rem' }}>
            {parseDay(selected()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <Show when={dayLogs().length}>
            <span class="small muted">{minutes(dayLogs().reduce((sum, l) => sum + l.practicedSec, 0))}</span>
          </Show>
        </div>
        <Show when={dayLogs().length} fallback={<p class="muted small" style={{ margin: 0 }}>{selected() === today ? 'Nothing yet today. Even five minutes counts.' : 'No practice recorded on this day.'}</p>}>
          <div class="list">
            <For each={dayLogs()}>
              {log => (
                <button class="list-row" style={{ 'text-align': 'left', width: '100%' }} onClick={() => setEditing(log)}>
                  <span class={['log-dot', log.kind]} />
                  <span class="grow">
                    <strong style={{ 'font-weight': 550 }}>{log.title}</strong>
                    <span class="small muted" style={{ display: 'block' }}>
                      {new Date(log.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {minutes(log.practicedSec)}
                      {log.completed ? '' : ' · ended early'}
                      {log.feeling ? ` · ${FEELING[log.feeling]}` : ''}
                    </span>
                    <Show when={log.note}>
                      <span class="small" style={{ display: 'block', 'margin-top': '4px', color: 'var(--ink-2)' }}>
                        {log.note}
                      </span>
                    </Show>
                  </span>
                  <Icon name="edit" size={16} class="muted" />
                </button>
              )}
            </For>
          </div>
        </Show>
      </section>

      <section class="months">
        <For each={months()}>
          {month => (
            <div class="month">
              <h4>{month.label}</h4>
              <div class="cal" role="grid" aria-label={month.label}>
                <For each={dows()}>{d => <span class="dow">{d}</span>}</For>
                <For each={month.cells}>
                  {cell => (
                    <Show when={cell} fallback={<span />}>
                      {c => (
                        <button
                          data-level={level(c())}
                          aria-current={c() === today ? 'date' : undefined}
                          aria-pressed={pressed(c() === selected())}
                          disabled={c() > today}
                          aria-label={`${parseDay(c()).toLocaleDateString()} ${level(c()) ? 'practised' : ''}`}
                          onClick={() => setSelected(c())}
                        >
                          {parseDay(c()).getDate()}
                        </button>
                      )}
                    </Show>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <button class="btn small" style={{ 'justify-self': 'center' }} onClick={() => setMonthsShown(n => n + 3)}>
          Show earlier months
        </button>
      </section>

      <Sheet open={!!editing()} onClose={() => setEditing(null)} title="Session">
        <Show when={editing()}>{log => <EditLog log={log()} onDone={() => setEditing(null)} />}</Show>
      </Sheet>
    </main>
  )
}

function EditLog(props: { log: SessionLog; onDone: () => void }) {
  const app = useApp()
  const [note, setNote] = createSignal(props.log.note ?? '')
  const [feeling, setFeeling] = createSignal(props.log.feeling)
  return (
    <div class="stack">
      <h2 class="display">{props.log.title}</h2>
      <p class="muted" style={{ margin: 0 }}>
        {new Date(props.log.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {minutes(props.log.practicedSec)} of {minutes(props.log.plannedSec)}
      </p>
      <div class="chips" style={{ margin: 0, padding: 0, 'flex-wrap': 'wrap' }}>
        <For each={[1, 2, 3, 4, 5] as const}>
          {f => (
            <button class="chip" aria-pressed={pressed(feeling() === f)} onClick={() => setFeeling(feeling() === f ? undefined : f)}>
              {FEELING[f]}
            </button>
          )}
        </For>
      </div>
      <textarea class="input" placeholder="Notes" value={note()} onInput={e => setNote(e.currentTarget.value)} />
      <button
        class="btn primary block"
        onClick={async () => {
          await app.updateLog({ ...props.log, note: note().trim() || undefined, feeling: feeling() })
          props.onDone()
        }}
      >
        Save
      </button>
      <button
        class="btn danger block"
        onClick={async () => {
          const log = props.log
          await app.deleteLog(log.id)
          props.onDone()
          toast('Session removed.', { label: 'Undo', run: () => void app.addLog(log) })
        }}
      >
        <Icon name="trash" size={16} /> Remove from journal
      </button>
    </div>
  )
}
