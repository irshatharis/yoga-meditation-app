import * as v from 'valibot'
import { mediaBlobs, type Pose, type Practice, type SessionLog, type Settings } from '../domain/types'
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

const B64_INDEX = new Int8Array(128).fill(-1)
for (const [i, c] of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].entries()) B64_INDEX[c.charCodeAt(0)] = i

// Decodes base64 from ASCII bytes, so a large video never has to become a string.
function decodeBase64(src: Uint8Array): Uint8Array {
  let len = src.length
  while (len > 0 && src[len - 1] === 61) len--
  if (len % 4 === 1) throw new Error('bad base64')
  const out = new Uint8Array(Math.floor((len * 3) / 4))
  let bits = 0
  let n = 0
  let o = 0
  for (let i = 0; i < len; i++) {
    const c = src[i]!
    const value = c < 128 ? B64_INDEX[c]! : -1
    if (value < 0) throw new Error('bad base64')
    bits = ((bits << 6) | value) & 0xffffff
    n += 6
    if (n >= 8) {
      n -= 8
      out[o++] = (bits >> n) & 255
    }
  }
  return out
}

// A backup with a few videos is larger than the biggest string a browser can
// hold, so the file is written in parts and media goes in as separate parts.
export async function backupBlob(snap: Snapshot, includeMedia: boolean): Promise<Blob> {
  const backup: Backup = { app: 'still', format: 1, exportedAt: Date.now(), settings: snap.settings, poses: snap.poses, practices: snap.practices, logs: snap.logs, media: [] }
  const parts: BlobPart[] = [JSON.stringify(backup).slice(0, -2)]
  const used = mediaBlobs(snap.poses)
  for (const [i, b] of (includeMedia ? snap.blobs.filter(b => used.has(b.id)) : []).entries()) {
    const meta = JSON.stringify({ id: b.id, mime: b.mime, name: b.name }).slice(0, -1)
    parts.push(new Blob([`${i ? ',' : ''}${meta},"data":"`, toBase64(new Uint8Array(await b.blob.arrayBuffer())), '"}']))
  }
  parts.push(']}')
  return new Blob(parts, { type: 'application/json' })
}

export function backupFileName(now = new Date()) {
  const d = now.toISOString().slice(0, 10)
  return `still-backup-${d}.json`
}

export type ParsedBackup = { backup: Backup; blobs: StoredBlob[] }

export type ParseError = { ok: false; message: string }

const QUOTE = 34
const isSpace = (c: number | undefined) => c === 32 || c === 9 || c === 10 || c === 13
const DATA_KEY = new TextEncoder().encode('"data"')

// Lifts every "data" string out of the file before JSON.parse, leaving "#n" in
// its place. Base64 never contains a quote, and a quote inside any other JSON
// string is escaped, so the scan cannot be fooled by user text.
function liftData(bytes: Uint8Array) {
  const decoder = new TextDecoder()
  const text: string[] = []
  const payloads: Uint8Array[] = []
  let from = 0
  for (let i = bytes.indexOf(QUOTE); i !== -1; i = bytes.indexOf(QUOTE, i + 1)) {
    if (!DATA_KEY.every((b, k) => bytes[i + k] === b)) continue
    let j = i + DATA_KEY.length
    while (isSpace(bytes[j])) j++
    if (bytes[j] !== 58) continue
    j++
    while (isSpace(bytes[j])) j++
    if (bytes[j] !== QUOTE) continue
    const end = bytes.indexOf(QUOTE, j + 1)
    if (end === -1) break
    text.push(decoder.decode(bytes.subarray(from, j + 1)), `#${payloads.length}`)
    payloads.push(bytes.subarray(j + 1, end))
    from = end
    i = end
  }
  text.push(decoder.decode(bytes.subarray(from)))
  return { text: text.join(''), payloads }
}

export function parseBackup(bytes: Uint8Array): { ok: true; value: ParsedBackup } | ParseError {
  const { text, payloads } = liftData(bytes)
  let raw: unknown
  try {
    raw = JSON.parse(text)
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
  try {
    const blobs = backup.media.map(m => {
      const payload = payloads[Number(/^#(\d+)$/.exec(m.data)?.[1] ?? NaN)]
      if (!payload) throw new Error('missing media')
      return { id: m.id, mime: m.mime, name: m.name, blob: new Blob([decodeBase64(payload) as Uint8Array<ArrayBuffer>], { type: m.mime }) }
    })
    return { ok: true, value: { backup, blobs } }
  } catch {
    return { ok: false, message: 'A photo or video in this backup is damaged.' }
  }
}

export type Conflict = 'skip' | 'replace' | 'copy'

export type MergePlan = {
  poses: { add: Pose[]; clash: Pose[]; same: number }
  practices: { add: Practice[]; clash: Practice[]; same: number }
  logs: { add: SessionLog[]; duplicate: number }
}

// Missing and undefined fields count as equal, as they do after a JSON round trip.
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].every(k => same(x[k], y[k]))
}

// Records already on this device unchanged are neither added nor conflicts.
function split<T extends { id: string; origin: string }>(current: readonly T[], incoming: readonly T[]) {
  const byId = new Map(current.map(r => [r.id, r]))
  const user = incoming.filter(r => r.origin !== 'builtin')
  const known = user.filter(r => byId.has(r.id))
  const clash = known.filter(r => !same(byId.get(r.id), r))
  return { add: user.filter(r => !byId.has(r.id)), clash, same: known.length - clash.length }
}

export function planMerge(current: Pick<Snapshot, 'poses' | 'practices' | 'logs'>, incoming: Backup): MergePlan {
  const logIds = new Set(current.logs.map(l => l.id))
  return {
    poses: split(current.poses, incoming.poses),
    practices: split(current.practices, incoming.practices),
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
