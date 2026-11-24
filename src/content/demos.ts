import type { PoseId } from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

// A real person showing the pose, cut from Gezond10's yoga series on YouTube
// (CC BY). `node scripts/pose-videos.mjs` downloads, trims and crops each one
// into public/media/poses from the cut written here.
export type Demo = {
  youtube: string
  title: string
  // Seconds of the source to keep.
  from: number
  to: number
  // Left, top and width of a 16:9 box in the 1920x1080 source.
  crop: [x: number, y: number, width: number]
}

export const DEMO_CREDIT = {
  by: 'Gezond10',
  channel: 'https://www.youtube.com/@Gezond10Nl',
  license: 'CC BY',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
}

export const DEMOS: Partial<Record<BuiltinPoseId, Demo>> = {
  child: { youtube: '34VqmhcuKHI', title: 'Child pose (Balasana)', from: 6.1, to: 32.2, crop: [220, 360, 1060] }
}

export const demoFor = (pose: PoseId | undefined) => (pose ? DEMOS[pose as BuiltinPoseId] : undefined)

export const demoSrc = (pose: PoseId | string) => `/media/poses/${pose}.mp4`

export const youtubeUrl = (demo: Demo) => `https://www.youtube.com/watch?v=${demo.youtube}`
