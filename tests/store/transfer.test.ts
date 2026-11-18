import { describe, expect, it } from 'vitest'
import { backupBlob, parseBackup } from '../../src/store/transfer'
import { DEFAULT_SETTINGS, poseId, practiceId, type BlobId, type Pose, type Practice, type SessionLog } from '../../src/domain/types'
import type { StoredBlob } from '../../src/store/db'

const pose: Pose = {
  id: poseId('pose-a'),
  name: 'My lunge',
  family: 'standing',
  level: 'gentle',
  focus: ['hips'],
  sided: true,
  summary: 'A low lunge.',
  setup: ['Step back.'],
  cues: ['Breathe.'],
  cautions: [],
  figure: null,
  media: [{ kind: 'video', blob: 'media-1' as BlobId, mime: 'video/mp4' }],
  origin: 'mine'
}
const practice: Practice = { id: practiceId('practice-a'), title: 'Morning', summary: '', kind: 'yoga', level: 'gentle', focus: [], items: [{ type: 'pose', pose: pose.id, holdSec: 30 }], origin: 'mine' }
const log: SessionLog = { id: 'log-a', practice: practice.id, title: 'Morning', kind: 'yoga', startedAt: 1, endedAt: 2, plannedSec: 60, practicedSec: 60, completed: true }
const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => (i * 7) & 255)
const blob: StoredBlob = { id: 'media-1', mime: 'video/mp4', name: 'clip.mp4', blob: new Blob([bytes], { type: 'video/mp4' }) }
const snap = { settings: DEFAULT_SETTINGS, poses: [pose], practices: [practice], logs: [log], blobs: [blob] }

const fileBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())
const encode = (value: unknown, space?: number) => new TextEncoder().encode(JSON.stringify(value, null, space))

describe('backups', () => {
  it('round-trips records and media bytes', async () => {
    const out = parseBackup(await fileBytes(await backupBlob(snap, true)))
    if (!out.ok) throw new Error(out.message)
    expect(out.value.backup).toMatchObject({ poses: [pose], practices: [practice], logs: [log], settings: DEFAULT_SETTINGS })
    expect(out.value.blobs.map(b => [b.id, b.mime, b.name])).toEqual([['media-1', 'video/mp4', 'clip.mp4']])
    expect(await fileBytes(out.value.blobs[0]!.blob)).toEqual(bytes)
  })

  it('reads a hand-formatted backup with media', async () => {
    const data = Buffer.from(bytes).toString('base64')
    const file = { app: 'still', format: 1, exportedAt: 1, poses: [pose], media: [{ id: 'media-1', mime: 'video/mp4', name: 'clip.mp4', data }] }
    const out = parseBackup(encode(file, 2))
    if (!out.ok) throw new Error(out.message)
    expect(await fileBytes(out.value.blobs[0]!.blob)).toEqual(bytes)
  })

  it('rejects media that is not base64 with a message instead of throwing', () => {
    const file = { app: 'still', format: 1, exportedAt: 1, media: [{ id: 'm', mime: 'image/png', name: 'x', data: '!!not base64!!' }] }
    expect(parseBackup(encode(file))).toMatchObject({ ok: false })
  })

  it('rejects a file that is not JSON', () => {
    expect(parseBackup(new TextEncoder().encode('PK\u0003\u0004 zip'))).toEqual({ ok: false, message: 'This file is not valid JSON.' })
  })
})
