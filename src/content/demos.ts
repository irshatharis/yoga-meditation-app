import type { BlobId, Pose, Side } from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

// Real people showing each pose, cut from yoga videos released under CC BY.
// `node scripts/pose-videos.mjs` downloads, trims and crops each one into
// public/media/poses from the cut written here, and
// `uv run --with ultralytics scripts/frame-person.py` finds the crop.
export const SOURCES = {
  gezond10: { by: 'Gezond10', url: 'https://www.youtube.com/@Gezond10Nl' },
  yogaes: { by: 'Yogaes', url: 'https://www.youtube.com/channel/UCk3ZDhpeSQ75WXiT1VtX-iA' }
} as const satisfies Record<string, { by: string; url: string }>

export type SourceId = keyof typeof SOURCES

export const LICENSE = { name: 'CC BY', url: 'https://creativecommons.org/licenses/by/4.0/' }

export type Demo = {
  source: SourceId
  youtube: string
  title: string
  // Seconds of the source to keep.
  from: number
  to: number
  // Left, top and side of a square around the person in the source frame.
  crop: [x: number, y: number, size: number]
  // The side the clip shows, for sided poses. The other side plays mirrored.
  shows?: Side
}

// Changing how clips are encoded changes every file, so it is part of each file's address.
export const ENCODING = { size: 720, crf: 28, fps: 30 }

export const DEMOS: Partial<Record<BuiltinPoseId, Demo>> = {
  child: { source: 'gezond10', youtube: '34VqmhcuKHI', title: 'Child pose (Balasana)', from: 6.1, to: 32.2, crop: [399, 284, 796] }
}

// A file's address changes whenever its cut does, so a phone that saved the old clip fetches the new one.
const version = (demo: Demo) => {
  let h = 2166136261
  for (const c of JSON.stringify([demo.youtube, demo.from, demo.to, demo.crop, ENCODING])) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(36)
}

export const demoFile = (pose: string) => `${pose}.mp4`

export const demoSrc = (pose: BuiltinPoseId, demo: Demo) => `/media/poses/${demoFile(pose)}?v=${version(demo)}`

export const youtubeUrl = (demo: Demo) => `https://www.youtube.com/watch?v=${demo.youtube}`

// What plays on a pose's stage: the person's own video first, then the built-in clip.
export type StageVideo = { kind: 'own'; blob: BlobId } | { kind: 'builtin'; src: string; demo: Demo }

export function stageVideo(pose: Pose | undefined): StageVideo | null {
  if (!pose) return null
  const own = pose.media.find(m => m.kind === 'video')
  if (own && own.kind === 'video') return { kind: 'own', blob: own.blob }
  const demo = DEMOS[pose.id as BuiltinPoseId]
  return demo ? { kind: 'builtin', src: demoSrc(pose.id as BuiltinPoseId, demo), demo } : null
}

export const builtinVideoUrls = () => Object.entries(DEMOS).map(([pose, demo]) => demoSrc(pose as BuiltinPoseId, demo!))

// Whether the stage plays the clip mirrored for the side being practised.
export const mirrorFor = (video: StageVideo, side: Side | undefined) => !!side && side !== (video.kind === 'builtin' ? (video.demo.shows ?? 'right') : 'right')

