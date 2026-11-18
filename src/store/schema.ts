import * as v from 'valibot'
import { FAMILIES, FOCUSES, DEFAULT_SETTINGS, type BlobId, type PathId, type PoseId, type PracticeId, type Settings } from '../domain/types'

// Everything that enters from a file, a share link, or storage written by an
// older version is parsed here. Past this point the app trusts its types.

const text = (max = 2000) => v.pipe(v.string(), v.maxLength(max))
const name = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))
const sec = (max: number) => v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(max))
const angle = v.pipe(v.number(), v.finite())
const id = <T>() => v.pipe(v.string(), v.minLength(1), v.maxLength(80), v.transform(s => s as T))

const Origin = v.picklist(['builtin', 'mine', 'imported'])
const Level = v.picklist(['gentle', 'moderate', 'strong'])
const Kind = v.picklist(['yoga', 'meditation', 'breath'])

const Limb = v.union([v.tuple([angle, angle]), v.tuple([angle, angle, angle])])

export const FigureSchema = v.looseObject({
  view: v.picklist(['side', 'front', 'top']),
  spine: v.tuple([angle, angle]),
  head: angle,
  armA: Limb,
  armB: Limb,
  legA: Limb,
  legB: Limb,
  lift: v.optional(angle),
  hips: v.optional(angle),
  torso: v.optional(v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(2))),
  prop: v.optional(v.picklist(['chair', 'wall', 'strap']))
})

const Media = v.variant('kind', [
  v.object({ kind: v.picklist(['image', 'video']), blob: id<BlobId>(), mime: text(80), credit: v.optional(text(200)) }),
  v.object({ kind: v.literal('link'), href: v.pipe(v.string(), v.url(), v.regex(/^https?:/i), v.maxLength(2000)), label: v.optional(text(120)) })
])

export const PoseSchema = v.object({
  id: id<PoseId>(),
  name,
  sanskrit: v.optional(text(120)),
  family: v.picklist(FAMILIES),
  level: Level,
  focus: v.array(v.picklist(FOCUSES)),
  sided: v.boolean(),
  summary: text(400),
  setup: v.array(text(400)),
  cues: v.array(text(400)),
  release: v.optional(text(400)),
  cautions: v.array(text(400)),
  easier: v.optional(text(400)),
  figure: v.nullable(FigureSchema),
  media: v.array(Media),
  origin: Origin
})

const Timed = v.object({ at: sec(24 * 3600), text: text(1000) })
const Pattern = v.object({ inhale: sec(60), holdIn: sec(60), exhale: sec(60), holdOut: sec(60) })

const Item = v.variant('type', [
  v.object({ type: v.literal('pose'), pose: id<PoseId>(), holdSec: sec(3600), sides: v.optional(v.picklist(['both', 'right', 'left'])), cue: v.optional(text(400)) }),
  v.object({
    type: v.literal('flow'),
    title: name,
    rounds: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
    breathSec: sec(30),
    steps: v.pipe(v.array(v.object({ pose: id<PoseId>(), breaths: v.pipe(v.number(), v.minValue(0.5), v.maxValue(50)), cue: text(400) })), v.minLength(1)),
    alternate: v.boolean()
  }),
  v.object({
    type: v.literal('sit'),
    title: name,
    durationSec: sec(6 * 3600),
    intro: v.optional(text(1000)),
    guidance: v.array(Timed),
    intervalBellSec: v.optional(sec(3600)),
    posture: v.optional(id<PoseId>())
  }),
  v.object({
    type: v.literal('breath'),
    title: name,
    pattern: Pattern,
    cycles: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500)),
    intro: v.optional(text(1000)),
    guidedCycles: v.optional(v.number()),
    posture: v.optional(id<PoseId>())
  }),
  v.object({ type: v.literal('rest'), title: name, durationSec: sec(3 * 3600), text: v.optional(text(1000)), pose: v.optional(id<PoseId>()) })
])

const Pacing = v.object({ prepareSec: sec(120), switchSec: sec(120), waitForMe: v.boolean() })

export const PracticeSchema = v.object({
  id: id<PracticeId>(),
  title: name,
  summary: text(400),
  description: v.optional(text(4000)),
  kind: Kind,
  level: Level,
  focus: v.array(v.picklist(FOCUSES)),
  items: v.pipe(v.array(Item), v.maxLength(500)),
  pacing: v.optional(v.partial(Pacing)),
  adjustable: v.optional(v.object({ minSec: sec(86400), maxSec: sec(86400) })),
  origin: Origin,
  credit: v.optional(text(400)),
  updatedAt: v.optional(v.number())
})

export const LogSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  practice: id<PracticeId>(),
  title: text(200),
  kind: Kind,
  startedAt: v.number(),
  endedAt: v.number(),
  plannedSec: sec(86400),
  practicedSec: sec(86400),
  completed: v.boolean(),
  path: v.optional(v.object({ id: id<PathId>(), day: v.number() })),
  feeling: v.optional(v.picklist([1, 2, 3, 4, 5])),
  note: v.optional(text(4000))
})

// Settings merge over defaults field by field, so a file from an older
// version (or a hand-edited one) never leaves a setting undefined.
export function parseSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (typeof raw !== 'object' || raw === null) return structuredClone(d)
  const r = raw as Record<string, Record<string, unknown> | unknown>
  const pick = <T>(value: unknown, schema: v.GenericSchema<T>, fallback: T): T => {
    const out = v.safeParse(schema, value)
    return out.success ? out.output : fallback
  }
  const group = (key: string) => (typeof r[key] === 'object' && r[key] !== null ? (r[key] as Record<string, unknown>) : {})
  const pacing = group('pacing')
  const voice = group('voice')
  const sound = group('sound')
  return {
    pacing: {
      prepareSec: pick(pacing.prepareSec, sec(60), d.pacing.prepareSec),
      switchSec: pick(pacing.switchSec, sec(60), d.pacing.switchSec),
      waitForMe: pick(pacing.waitForMe, v.boolean(), d.pacing.waitForMe)
    },
    voice: {
      enabled: pick(voice.enabled, v.boolean(), d.voice.enabled),
      voiceURI: pick(voice.voiceURI, v.nullable(v.string()), d.voice.voiceURI),
      rate: pick(voice.rate, v.pipe(v.number(), v.minValue(0.5), v.maxValue(1.5)), d.voice.rate),
      detail: pick(voice.detail, v.picklist(['full', 'names', 'quiet']), d.voice.detail)
    },
    sound: {
      bell: pick(sound.bell, v.picklist(['bowl', 'strike', 'gong', 'chime', 'soft']), d.sound.bell),
      volume: pick(sound.volume, v.pipe(v.number(), v.minValue(0), v.maxValue(1)), d.sound.volume),
      countdown: pick(sound.countdown, v.boolean(), d.sound.countdown),
      ambient: pick(sound.ambient, v.picklist(['none', 'rain', 'ocean', 'forest', 'stream', 'deep']), d.sound.ambient),
      ambientVolume: pick(sound.ambientVolume, v.pipe(v.number(), v.minValue(0), v.maxValue(1)), d.sound.ambientVolume)
    },
    keepAwake: pick(r.keepAwake, v.boolean(), d.keepAwake),
    haptics: pick(r.haptics, v.boolean(), d.haptics),
    theme: pick(r.theme, v.picklist(['system', 'light', 'dark']), d.theme),
    motion: pick(r.motion, v.picklist(['system', 'reduce']), d.motion),
    goalMin: pick(r.goalMin, v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(600)), d.goalMin),
    weekStart: pick(r.weekStart, v.picklist([0, 1]), d.weekStart)
  }
}

export const BackupSchema = v.object({
  app: v.literal('still'),
  format: v.literal(1),
  exportedAt: v.number(),
  settings: v.optional(v.unknown()),
  poses: v.optional(v.array(PoseSchema), []),
  practices: v.optional(v.array(PracticeSchema), []),
  logs: v.optional(v.array(LogSchema), []),
  media: v.optional(v.array(v.object({ id: v.string(), mime: v.string(), name: v.string(), data: v.string() })), [])
})

export const ShareSchema = v.object({
  app: v.literal('still'),
  format: v.literal(1),
  practice: PracticeSchema,
  poses: v.optional(v.array(PoseSchema), [])
})
