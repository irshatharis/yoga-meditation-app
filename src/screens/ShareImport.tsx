import { createSignal, For, onSettled, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useApp } from '../state/app'
import { compile } from '../domain/timeline'
import { decodeShare, newId } from '../store/transfer'
import type { Pose, PoseId, Practice, PracticeId } from '../domain/types'
import type { Share } from '../store/transfer'
import { Icon } from '../ui/icons'
import { KIND_LABEL, PracticeArt, minutes, toast } from '../ui/kit'

export default function ShareImport() {
  const app = useApp()
  const navigate = useNavigate()
  const [share, setShare] = createSignal<Share | null>(null)
  const [error, setError] = createSignal('')

  onSettled(() => {
    const code = location.hash.slice(1)
    if (!code) {
      setError('This link has no practice in it.')
      return
    }
    void decodeShare(code).then(r => (r.ok ? setShare(r.value) : setError(r.message)))
  })

  const library = () => {
    const map = new Map(app.poses())
    for (const p of share()?.poses ?? []) if (!map.has(p.id)) map.set(p.id, p as Pose)
    return map
  }
  const total = () => {
    const s = share()
    if (!s) return 0
    try {
      return compile(s.practice as Practice, library(), app.settings).totalSec
    } catch {
      return 0
    }
  }

  const add = async () => {
    const s = share()
    if (!s) return
    const remap = new Map<string, PoseId>()
    for (const pose of s.poses) {
      const existing = app.pose(pose.id)
      if (existing && existing.origin === 'builtin') continue
      const id = existing ? (newId('pose') as PoseId) : pose.id
      remap.set(pose.id, id)
      await app.savePose({ ...(pose as Pose), id, origin: 'imported' })
    }
    const practice = s.practice as Practice
    const items = practice.items.map(item =>
      item.type === 'pose' ? { ...item, pose: remap.get(item.pose) ?? item.pose } : item.type === 'flow' ? { ...item, steps: item.steps.map(st => ({ ...st, pose: remap.get(st.pose) ?? st.pose })) } : item
    )
    const id = (app.practice(practice.id) ? newId('practice') : practice.id) as PracticeId
    await app.savePractice({ ...practice, id, items, origin: 'imported' })
    toast('Added to your practices.')
    navigate(`/practices/${id}`, { replace: true })
  }

  return (
    <main class="page">
      <header class="topbar">
        <a class="brand" href="/">
          still<span>.</span>
        </a>
      </header>
      <Show when={share()} fallback={<div class="empty">{error() || 'Opening shared practice...'}</div>}>
        {s => (
          <>
            <p class="eyebrow">Someone shared a practice with you</p>
            <section class="detail-hero">
              <PracticeArt practice={s().practice as Practice} class="detail-art" />
              <div class="stack">
                <span class={['tag', s().practice.kind]}>
                  {KIND_LABEL[s().practice.kind]} · {minutes(total())}
                </span>
                <h1 class="display">{s().practice.title}</h1>
                <p class="lede">{s().practice.description ?? s().practice.summary}</p>
              </div>
            </section>
            <div class="card" style={{ padding: '4px 16px' }}>
              <div class="list">
                <For each={s().practice.items}>
                  {item => (
                    <div class="list-row">
                      <Icon name={item.type === 'pose' || item.type === 'flow' ? 'figure' : item.type === 'breath' ? 'wind' : 'leaf'} />
                      <span class="grow">{item.type === 'pose' ? (library().get(item.pose)?.name ?? 'Unknown pose') : item.title}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <button class="btn primary big block" onClick={() => void add()}>
              <Icon name="plus" size={18} /> Add to my practices
            </button>
            <p class="small muted" style={{ 'text-align': 'center' }}>
              It is saved on this device only. Nothing was sent to a server.
            </p>
          </>
        )}
      </Show>
    </main>
  )
}
