import * as v from 'valibot'
import type { Pose, Practice, SessionLog, Settings } from '../domain/types'
import { BackupSchema, ShareSchema } from './schema'
import type { StoredBlob } from './db'

// The schemas validate shape. Brands and readonly tuples are type-level only,
// so a parsed value is the domain type.
export type Backup = {
  app: 'still'
  format: 1
  exportedAt: number
  settings?: unknown
  poses: Pose[]
  practices: Practice[]
  logs: SessionLog[]
  media: { id: string; mime: string; name: string; data: string }[]
}
export type Share = { app: 'still'; format: 1; practice: Practice; poses: Pose[] }

export type Snapshot = { settings: Settings; poses: Pose[]; practices: Practice[]; logs: SessionLog[]; blobs: StoredBlob[] }

const toBase64 = (bytes: Uint8Array) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const fromBase64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export async function toBackup(snap: Snapshot, includeMedia: boolean): Promise<Backup> {
  return {
    app: 'still',
    format: 1,
    exportedAt: Date.now(),
    settings: snap.settings,
    poses: snap.poses,
    practices: snap.practices,
    logs: snap.logs,
    media: includeMedia
      ? await Promise.all(snap.blobs.map(async b => ({ id: b.id, mime: b.mime, name: b.name, data: toBase64(new Uint8Array(await b.blob.arrayBuffer())) })))
      : []
  }
}

export function backupFileName(now = new Date()) {
  const d = now.toISOString().slice(0, 10)
  return `still-backup-${d}.json`
}

export type ParsedBackup = { backup: Backup; blobs: StoredBlob[] }

export type ParseError = { ok: false; message: string }

export function parseBackup(json: string): { ok: true; value: ParsedBackup } | ParseError {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, message: 'This file is not valid JSON.' }
  }
  const out = v.safeParse(BackupSchema, raw)
  if (!out.success) {
    const issue = out.issues[0]
    const where = issue?.path?.map(p => String(p.key)).join('.') ?? ''
    return { ok: false, message: `This does not look like a still. backup${where ? ` (problem at ${where})` : ''}.` }
  }
  const backup = out.output as unknown as Backup
  const blobs = backup.media.map(m => ({ id: m.id, mime: m.mime, name: m.name, blob: new Blob([fromBase64(m.data)], { type: m.mime }) }))
  return { ok: true, value: { backup, blobs } }
}

export type Conflict = 'skip' | 'replace' | 'copy'

export type MergePlan = {
  poses: { add: Pose[]; clash: Pose[] }
  practices: { add: Practice[]; clash: Practice[] }
  logs: { add: SessionLog[]; duplicate: number }
}

export function planMerge(current: Pick<Snapshot, 'poses' | 'practices' | 'logs'>, incoming: Backup): MergePlan {
  const poseIds = new Set(current.poses.map(p => p.id))
  const practiceIds = new Set(current.practices.map(p => p.id))
  const logIds = new Set(current.logs.map(l => l.id))
  const userPoses = incoming.poses.filter(p => p.origin !== 'builtin')
  const userPractices = incoming.practices.filter(p => p.origin !== 'builtin')
  return {
    poses: { add: userPoses.filter(p => !poseIds.has(p.id)), clash: userPoses.filter(p => poseIds.has(p.id)) },
    practices: { add: userPractices.filter(p => !practiceIds.has(p.id)), clash: userPractices.filter(p => practiceIds.has(p.id)) },
    logs: { add: incoming.logs.filter(l => !logIds.has(l.id)), duplicate: incoming.logs.filter(l => logIds.has(l.id)).length }
  }
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// Applies a merge plan and returns the records to write. Copies get fresh
// ids so nothing the person already has is overwritten.
export function resolveMerge(plan: MergePlan, conflict: Conflict) {
  const poseIdMap = new Map<string, string>()
  const clashPoses = conflict === 'skip' ? [] : plan.poses.clash.map(p => {
    if (conflict === 'replace') return p
    const id = newId('pose')
    poseIdMap.set(p.id, id)
    return { ...p, id: id as Pose['id'], name: `${p.name} (imported)` }
  })
  const remap = (practice: Practice): Practice => ({
    ...practice,
    items: practice.items.map(item => {
      if (item.type === 'pose') return { ...item, pose: (poseIdMap.get(item.pose) ?? item.pose) as Pose['id'] }
      if (item.type === 'flow') return { ...item, steps: item.steps.map(s => ({ ...s, pose: (poseIdMap.get(s.pose) ?? s.pose) as Pose['id'] })) }
      return item
    })
  })
  const clashPractices = conflict === 'skip' ? [] : plan.practices.clash.map(p =>
    conflict === 'replace' ? p : { ...p, id: newId('practice') as Practice['id'], title: `${p.title} (imported)` }
  )
  return {
    poses: [...plan.poses.add, ...clashPoses].map(p => ({ ...p, origin: p.origin === 'mine' ? p.origin : ('imported' as const) })),
    practices: [...plan.practices.add, ...clashPractices].map(remap),
    logs: plan.logs.add
  }
}

// Share links carry a practice (and any custom poses it uses) in the URL
// fragment, compressed. The fragment never reaches a server.
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

const b64url = (bytes: Uint8Array) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64url = (s: string) => fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))

export async function encodeShare(practice: Practice, poses: Pose[]): Promise<string> {
  const share: Share = { app: 'still', format: 1, practice: { ...practice, origin: 'mine' }, poses: poses.map(p => ({ ...p, media: p.media.filter(m => m.kind === 'link') })) }
  const bytes = new TextEncoder().encode(JSON.stringify(share))
  return b64url(await pipe(bytes, new CompressionStream('deflate-raw')))
}

export async function decodeShare(code: string): Promise<{ ok: true; value: Share } | ParseError> {
  try {
    const bytes = await pipe(unb64url(code), new DecompressionStream('deflate-raw'))
    const out = v.safeParse(ShareSchema, JSON.parse(new TextDecoder().decode(bytes)))
    if (!out.success) return { ok: false, message: 'This share link is damaged or from a newer version of still.' }
    return { ok: true, value: out.output as unknown as Share }
  } catch {
    return { ok: false, message: 'This share link could not be read. It may have been cut off when copied.' }
  }
}
