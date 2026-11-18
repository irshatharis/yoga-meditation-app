import type { FigurePose } from '../figure/skeleton'

declare const brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [brand]: B }

export type PoseId = Brand<string, 'PoseId'>
export type PracticeId = Brand<string, 'PracticeId'>
export type PathId = Brand<string, 'PathId'>
export type BlobId = Brand<string, 'BlobId'>

export const poseId = (s: string) => s as PoseId
export const practiceId = (s: string) => s as PracticeId
export const pathId = (s: string) => s as PathId

export type Origin = 'builtin' | 'mine' | 'imported'
export type Level = 'gentle' | 'moderate' | 'strong'
export type Side = 'right' | 'left'

export const FAMILIES = ['standing', 'balance', 'seated', 'kneeling', 'prone', 'supine', 'arm-support', 'inversion', 'rest'] as const
export type Family = (typeof FAMILIES)[number]

export const FOCUSES = ['hips', 'hamstrings', 'back', 'spine', 'shoulders', 'chest', 'core', 'legs', 'balance', 'neck', 'calm'] as const
export type Focus = (typeof FOCUSES)[number]

export type MediaRef =
  | { kind: 'image' | 'video'; blob: BlobId; mime: string; credit?: string }
  | { kind: 'link'; href: string; label?: string }

export const mediaBlobs = (poses: readonly Pose[]) => new Set<string>(poses.flatMap(p => p.media.flatMap(m => (m.kind === 'link' ? [] : [m.blob]))))

export type Pose = {
  id: PoseId
  name: string
  sanskrit?: string
  family: Family
  level: Level
  focus: Focus[]
  sided: boolean
  summary: string
  setup: string[]
  cues: string[]
  release?: string
  cautions: string[]
  easier?: string
  // The figure shows the right side. The left side is its mirror image.
  figure: FigurePose | null
  media: MediaRef[]
  origin: Origin
}

export type BreathPattern = { inhale: number; holdIn: number; exhale: number; holdOut: number }

export type TimedText = { at: number; text: string }

export type PoseItem = {
  type: 'pose'
  pose: PoseId
  holdSec: number
  sides?: 'both' | Side
  cue?: string
}

export type FlowStep = { pose: PoseId; breaths: number; cue: string }

export type FlowItem = {
  type: 'flow'
  title: string
  rounds: number
  breathSec: number
  steps: FlowStep[]
  // Sided steps lead with the right on odd rounds and the left on even rounds.
  alternate: boolean
}

export type SitItem = {
  type: 'sit'
  title: string
  durationSec: number
  intro?: string
  guidance: TimedText[]
  intervalBellSec?: number
  posture?: PoseId
}

export type BreathItem = {
  type: 'breath'
  title: string
  pattern: BreathPattern
  cycles: number
  intro?: string
  // Spoken phase labels for the first few cycles, then the orb carries the rhythm.
  guidedCycles?: number
  posture?: PoseId
}

export type RestItem = { type: 'rest'; title: string; durationSec: number; text?: string; pose?: PoseId }

export type PracticeItem = PoseItem | FlowItem | SitItem | BreathItem | RestItem

export type PracticeKind = 'yoga' | 'meditation' | 'breath'

export type Pacing = { prepareSec: number; switchSec: number; waitForMe: boolean }

export type Practice = {
  id: PracticeId
  title: string
  summary: string
  description?: string
  kind: PracticeKind
  level: Level
  focus: Focus[]
  items: PracticeItem[]
  pacing?: Partial<Pacing>
  // Lets the person pick a length before starting (meditation timers).
  adjustable?: { minSec: number; maxSec: number }
  origin: Origin
  credit?: string
  updatedAt?: number
}

export type PathDay = { practice: PracticeId; note: string }
export type Path = { id: PathId; title: string; summary: string; kind: PracticeKind; days: PathDay[] }

export type SessionLog = {
  id: string
  practice: PracticeId
  title: string
  kind: PracticeKind
  startedAt: number
  endedAt: number
  plannedSec: number
  practicedSec: number
  completed: boolean
  path?: { id: PathId; day: number }
  feeling?: 1 | 2 | 3 | 4 | 5
  note?: string
}

export type BellSound = 'bowl' | 'strike' | 'gong' | 'chime' | 'soft'
export type Ambient = 'none' | 'rain' | 'ocean' | 'forest' | 'stream' | 'deep'
export type VoiceDetail = 'full' | 'names' | 'quiet'

export type Settings = {
  pacing: Pacing
  voice: { enabled: boolean; voiceURI: string | null; rate: number; detail: VoiceDetail }
  sound: { bell: BellSound; volume: number; countdown: boolean; ambient: Ambient; ambientVolume: number }
  keepAwake: boolean
  haptics: boolean
  theme: 'system' | 'light' | 'dark'
  motion: 'system' | 'reduce'
  goalMin: number
  weekStart: 0 | 1
}

export const DEFAULT_SETTINGS: Settings = {
  pacing: { prepareSec: 10, switchSec: 6, waitForMe: false },
  voice: { enabled: true, voiceURI: null, rate: 0.92, detail: 'names' },
  sound: { bell: 'bowl', volume: 0.7, countdown: true, ambient: 'none', ambientVolume: 0.35 },
  keepAwake: true,
  haptics: true,
  theme: 'system',
  motion: 'system',
  goalMin: 15,
  weekStart: 1
}
