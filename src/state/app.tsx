import { createContext, createEffect, createMemo, createSignal, createStore, deep, reconcile, snapshot, untrack, useContext } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { POSES } from '../content/poses'
import { PRACTICES } from '../content/practices'
import { PATHS } from '../content/paths'
import { mediaBlobs, type Path, type Pose, type PoseId, type Practice, type PracticeId, type SessionLog, type Settings } from '../domain/types'
import * as db from '../store/db'
import { parseSettings } from '../store/schema'
import type { PlayerState } from '../domain/player'

export type ActiveSession = {
  practice: PracticeId
  title: string
  kind: Practice['kind']
  startedAt: number
  savedAt: number
  player: PlayerState
  path?: SessionLog['path']
}

export type Loaded = {
  settings: Settings
  poses: Pose[]
  practices: Practice[]
  logs: SessionLog[]
  active: ActiveSession | null
  favorites: PracticeId[]
}

export async function loadAll(): Promise<Loaded> {
  const [settings, poses, practices, logs, active, favorites] = await Promise.all([
    db.getKV<unknown>('settings'),
    db.getAll<Pose>('poses'),
    db.getAll<Practice>('practices'),
    db.getAll<SessionLog>('logs'),
    db.getKV<ActiveSession>('active'),
    db.getKV<PracticeId[]>('favorites')
  ])
  return {
    settings: parseSettings(settings),
    poses,
    practices,
    logs: logs.sort((a, b) => a.startedAt - b.startedAt),
    active: active ?? null,
    favorites: favorites ?? []
  }
}

function createApp(initial: Loaded) {
  const [settings, setSettings] = createStore<Settings>(initial.settings)
  const [mine, setMine] = createStore({ poses: initial.poses, practices: initial.practices, favorites: initial.favorites })
  const [history, setHistory] = createStore({ logs: initial.logs })
  const [active, setActive] = createSignal<ActiveSession | null>(initial.active)

  createEffect(
    () => deep(settings),
    () => void db.setKV('settings', snapshot(settings)),
    { defer: true }
  )

  // Settings and favorites are written whole, so another open tab would write
  // its stale copy over a newer change. Tabs tell each other instead.
  type Sync = { settings: Settings } | { favorites: PracticeId[] } | { erased: true }
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('still') : null
  const tell = (msg: Sync) => channel?.postMessage(msg)
  channel?.addEventListener('message', (e: MessageEvent<Sync>) => {
    const msg = e.data
    if ('erased' in msg) location.reload()
    else if ('settings' in msg) setSettings(s => void reconcile(msg.settings, 'id')(s))
    else setMine(s => void s.favorites.splice(0, s.favorites.length, ...msg.favorites))
  })

  const poses = createMemo(() => new Map<PoseId, Pose>([...POSES, ...mine.poses].map(p => [p.id, p])))
  const userPractices = createMemo(() => mine.practices.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)))
  const practices = createMemo(() => [...userPractices(), ...PRACTICES])
  const practiceMap = createMemo(() => new Map<PracticeId, Practice>(practices().map(p => [p.id, p])))

  // Records handed in are often built from store proxies, which IndexedDB
  // cannot clone, so every write takes a plain snapshot first.
  const upsert = <T extends { id: string }>(list: T[], item: T) => {
    const i = list.findIndex(x => x.id === item.id)
    if (i === -1) list.push(item)
    else reconcile(item, 'id')(list[i])
  }
  const drop = <T extends { id: string }>(list: T[], id: string) => {
    const i = list.findIndex(x => x.id === id)
    if (i !== -1) list.splice(i, 1)
  }

  // Imported copies of a pose share media ids, so only media no pose uses is deleted.
  const dropUnused = async (blobs: Set<string>) => {
    const used = mediaBlobs(mine.poses)
    await Promise.all([...blobs].filter(id => !used.has(id)).map(id => db.remove('blobs', id)))
  }

  return {
    settings,
    updateSettings(fn: (draft: Settings) => void) {
      setSettings(fn)
      queueMicrotask(() => tell({ settings: snapshot(settings) }))
    },
    poses,
    practices,
    practice: (id: string) => practiceMap().get(id as PracticeId),
    pose: (id: string) => poses().get(id as PoseId),
    paths: PATHS as readonly Path[],
    userPoses: () => mine.poses,
    userPractices,
    logs: () => history.logs,
    active,
    saveActive(session: ActiveSession | null) {
      setActive(session)
      void db.setKV('active', session ?? undefined)
    },
    favorites: () => mine.favorites,
    toggleFavorite(id: PracticeId) {
      setMine(s => {
        const i = s.favorites.indexOf(id)
        if (i === -1) s.favorites.push(id)
        else s.favorites.splice(i, 1)
      })
      queueMicrotask(() => {
        const favorites = snapshot(mine.favorites)
        void db.setKV('favorites', favorites)
        tell({ favorites })
      })
    },
    async savePose(pose: Pose) {
      const plain = snapshot(pose)
      const before = mediaBlobs(mine.poses.filter(p => p.id === plain.id))
      setMine(s => upsert(s.poses, plain))
      await db.put('poses', plain)
      await dropUnused(before)
    },
    async deletePose(id: PoseId) {
      const before = mediaBlobs(mine.poses.filter(p => p.id === id))
      setMine(s => drop(s.poses, id))
      await db.remove('poses', id)
      await dropUnused(before)
    },
    async savePractice(practice: Practice) {
      const stamped = { ...snapshot(practice), updatedAt: Date.now() }
      setMine(s => upsert(s.practices, stamped))
      await db.put('practices', stamped)
    },
    async deletePractice(id: PracticeId) {
      setMine(s => drop(s.practices, id))
      await db.remove('practices', id)
    },
    async addLog(log: SessionLog) {
      const plain = snapshot(log)
      setHistory(s => void s.logs.push(plain))
      await db.put('logs', plain)
    },
    async updateLog(log: SessionLog) {
      const plain = snapshot(log)
      setHistory(s => upsert(s.logs, plain))
      await db.put('logs', plain)
    },
    async deleteLog(id: string) {
      setHistory(s => drop(s.logs, id))
      await db.remove('logs', id)
    },
    async importRecords(records: { poses: Pose[]; practices: Practice[]; logs: SessionLog[]; blobs: db.StoredBlob[]; settings?: Settings }) {
      setMine(s => {
        for (const p of records.poses) upsert(s.poses, p)
        for (const p of records.practices) upsert(s.practices, p)
      })
      setHistory(s => {
        s.logs = [...s.logs, ...records.logs].sort((a, b) => a.startedAt - b.startedAt)
      })
      if (records.settings) {
        const next = records.settings
        setSettings(() => next)
        tell({ settings: next })
      }
      await Promise.all([
        db.putMany('poses', records.poses),
        db.putMany('practices', records.practices),
        db.putMany('logs', records.logs),
        db.putMany('blobs', records.blobs)
      ])
    },
    async eraseEverything() {
      await db.clearAll()
      tell({ erased: true })
      location.replace('/')
    }
  }
}

export type App = ReturnType<typeof createApp>

const AppContext = createContext<App>()

export function AppProvider(props: { initial: Loaded; children: JSX.Element }) {
  const app = untrack(() => createApp(props.initial))
  return <AppContext value={app}>{props.children}</AppContext>
}

export const useApp = () => useContext(AppContext)
