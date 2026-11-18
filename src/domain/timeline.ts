import { mirror, type FigurePose } from '../figure/skeleton'
import type { BreathPattern, Pacing, Pose, PoseId, Practice, PracticeItem, Settings, Side } from './types'

export type Sound = 'bell' | 'tick' | 'end'

// `at` is seconds into the segment, or seconds before its end when negative,
// so a countdown stays at the end when the segment is extended.
export type Cue = { at: number; say?: string; sound?: Sound }

export type SegmentKind = 'prepare' | 'switch' | 'hold' | 'flow' | 'sit' | 'breath' | 'rest'

export type Segment = {
  kind: SegmentKind
  title: string
  // "Right side", "Round 2 of 3", "Next up"
  label?: string
  text?: string
  durationSec: number
  figure: FigurePose | null
  pose?: PoseId
  side?: Side
  breath?: BreathPattern
  // Seconds of spoken intro before the first breath cycle starts.
  breathLeadSec?: number
  // Stop here and wait for a tap before moving on ("wait for me" pacing).
  gate?: boolean
  cues: Cue[]
  item: number
}

export type Timeline = { segments: Segment[]; totalSec: number }

export type CompileOptions = {
  // Multiplies hold, sit and rest lengths (and breath cycles). 1 = as written.
  scale?: number
  // Overrides total length for adjustable practices (meditation timers).
  lengthSec?: number
  // Overrides interval bells in sits. 0 turns them off.
  intervalBellSec?: number
}

const SIDE_LABEL: Record<Side, string> = { right: 'Right side', left: 'Left side' }

const sidesFor = (pose: Pose, sides: 'both' | Side | undefined): (Side | undefined)[] => {
  if (!pose.sided) return [undefined]
  if (sides === 'right' || sides === 'left') return [sides]
  return ['right', 'left']
}

const figureFor = (pose: Pose | undefined, side: Side | undefined) =>
  pose?.figure ? (side === 'left' ? mirror(pose.figure) : pose.figure) : null

const cycleSec = (p: BreathPattern) => p.inhale + p.holdIn + p.exhale + p.holdOut

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)

export function compile(practice: Practice, library: ReadonlyMap<PoseId, Pose>, settings: Settings, options: CompileOptions = {}): Timeline {
  const pacing: Pacing = { ...settings.pacing, ...practice.pacing }
  const detail = settings.voice.detail
  const authored = practice.items.reduce((sum, item) => sum + authoredSec(item), 0)
  const scale = options.lengthSec && authored > 0 ? options.lengthSec / authored : (options.scale ?? 1)
  const segments: Segment[] = []
  // A practice may reference a pose the person has since deleted. Those steps
  // are skipped rather than breaking the whole practice.
  const lookup = (id: PoseId | undefined) => (id ? library.get(id) : undefined)

  const prepare = (item: number, title: string, label: string | undefined, figure: FigurePose | null, pose: Pose | undefined, side: Side | undefined, first: boolean) => {
    if (pacing.prepareSec <= 0 && !pacing.waitForMe) return
    const duration = Math.max(pacing.prepareSec, pacing.waitForMe ? 3 : 0)
    const say =
      detail === 'quiet'
        ? undefined
        : [first ? `First, ${title}` : `Next, ${title}`, label, detail === 'full' && pose ? pose.setup.join(' ') : undefined]
            .filter(Boolean)
            .join('. ')
    segments.push({
      kind: 'prepare',
      title,
      label: label ?? 'Get ready',
      text: pose?.setup.join(' '),
      durationSec: duration,
      figure,
      pose: pose?.id,
      side,
      gate: pacing.waitForMe,
      cues: [{ at: 0, say }, ...countdown(duration, settings)],
      item
    })
  }

  practice.items.forEach((item, index) => {
    const first = segments.length === 0
    switch (item.type) {
      case 'pose': {
        const pose = lookup(item.pose)
        if (!pose) return
        const hold = roundTo(item.holdSec * scale, 5)
        sidesFor(pose, item.sides).forEach((side, i) => {
          const figure = figureFor(pose, side)
          const label = side ? SIDE_LABEL[side] : undefined
          if (i === 0) prepare(index, pose.name, label, figure, pose, side, first)
          else if (pacing.switchSec > 0) {
            segments.push({
              kind: 'switch',
              title: pose.name,
              label: 'Switch sides',
              text: `Come out gently and set up on the ${side} side.`,
              durationSec: pacing.switchSec,
              figure,
              pose: pose.id,
              side,
              cues: [{ at: 0, say: detail === 'quiet' ? undefined : `Switch sides. ${label}.` }, ...countdown(pacing.switchSec, settings)],
              item: index
            })
          }
          segments.push({
            kind: 'hold',
            title: pose.name,
            label,
            text: item.cue ?? pose.summary,
            durationSec: hold,
            figure,
            pose: pose.id,
            side,
            cues: [{ at: 0, sound: 'bell' }, ...holdCues(pose, item.cue, hold, detail)],
            item: index
          })
        })
        return
      }
      case 'flow': {
        const steps = item.steps.flatMap(step => {
          const pose = lookup(step.pose)
          return pose ? [{ step, pose }] : []
        })
        if (steps.length === 0) return
        prepare(index, item.title, item.rounds > 1 ? `${item.rounds} rounds` : undefined, figureFor(steps[0]!.pose, 'right'), undefined, undefined, first)
        for (let round = 1; round <= item.rounds; round++) {
          const lead: Side = item.alternate && round % 2 === 0 ? 'left' : 'right'
          steps.forEach(({ step, pose }, s) => {
            const side = pose.sided ? lead : undefined
            segments.push({
              kind: 'flow',
              title: pose.name,
              label: item.rounds > 1 ? `Round ${round} of ${item.rounds}` : item.title,
              text: step.cue,
              durationSec: step.breaths * item.breathSec,
              figure: figureFor(pose, side),
              pose: pose.id,
              side,
              cues: [
                ...(round === 1 && s === 0 ? [{ at: 0, sound: 'bell' as const }] : []),
                { at: 0, say: detail === 'full' ? step.cue : detail === 'names' ? pose.name : undefined }
              ],
              item: index
            })
          })
        }
        return
      }
      case 'sit': {
        const posture = lookup(item.posture)
        const duration = roundTo(item.durationSec * scale, 30)
        if (first) prepare(index, item.title, 'Settle in', figureFor(posture, undefined), undefined, undefined, true)
        const stretch = duration / item.durationSec
        const guidance: Cue[] = detail === 'quiet' ? [] : item.guidance.map(g => ({ at: Math.round(g.at * stretch), say: g.text }))
        const bells: Cue[] = []
        const every = options.intervalBellSec ?? item.intervalBellSec
        if (every) for (let t = every; t < duration - 5; t += every) bells.push({ at: t, sound: 'bell' })
        segments.push({
          kind: 'sit',
          title: item.title,
          text: item.intro,
          durationSec: duration,
          figure: figureFor(posture, undefined),
          pose: posture?.id,
          cues: ([{ at: 0, sound: 'bell' }, ...(item.intro && detail !== 'quiet' ? [{ at: 1, say: item.intro }] : []), ...guidance, ...bells] satisfies Cue[]).sort((a, b) => a.at - b.at),
          item: index
        })
        return
      }
      case 'breath': {
        const posture = lookup(item.posture)
        const cycles = Math.max(1, Math.round(item.cycles * scale))
        const length = cycleSec(item.pattern)
        if (first) prepare(index, item.title, 'Settle in', figureFor(posture, undefined), undefined, undefined, true)
        const lead = item.intro && detail !== 'quiet' ? Math.max(6, Math.ceil(item.intro.length / 14)) : 0
        const cues: Cue[] = [{ at: 0, sound: 'bell' }]
        if (lead) cues.push({ at: 0.5, say: item.intro })
        const guided = detail === 'quiet' ? 0 : Math.min(cycles, item.guidedCycles ?? 3)
        for (let c = 0; c < guided; c++) {
          const base = lead + c * length
          const phases: [number, string][] = [
            [item.pattern.inhale, 'Breathe in'],
            [item.pattern.holdIn, 'Hold'],
            [item.pattern.exhale, 'Breathe out'],
            [item.pattern.holdOut, 'Hold']
          ]
          let t = base
          for (const [len, word] of phases) {
            if (len > 0) cues.push({ at: t, say: word })
            t += len
          }
        }
        segments.push({
          kind: 'breath',
          title: item.title,
          label: `${cycles} breaths`,
          text: item.intro,
          durationSec: lead + cycles * length,
          figure: figureFor(posture, undefined),
          pose: posture?.id,
          breath: item.pattern,
          cues,
          breathLeadSec: lead,
          item: index
        })
        return
      }
      case 'rest': {
        const pose = lookup(item.pose)
        const duration = roundTo(item.durationSec * scale, 5)
        if (pose) prepare(index, item.title, undefined, figureFor(pose, undefined), pose, undefined, first)
        segments.push({
          kind: 'rest',
          title: item.title,
          text: item.text,
          durationSec: duration,
          figure: figureFor(pose, undefined),
          pose: pose?.id,
          cues: [{ at: 0, sound: 'bell' }, ...(item.text && detail !== 'quiet' ? [{ at: 1, say: item.text }] : [])],
          item: index
        })
      }
    }
  })

  return { segments, totalSec: segments.reduce((sum, s) => sum + s.durationSec, 0) }
}

function countdown(duration: number, settings: Settings): Cue[] {
  if (!settings.sound.countdown || duration < 5) return []
  return [3, 2, 1].map(n => ({ at: -n, sound: 'tick' as const }))
}

function holdCues(pose: Pose, itemCue: string | undefined, hold: number, detail: Settings['voice']['detail']): Cue[] {
  if (detail !== 'full') return []
  const lines = [...(itemCue ? [itemCue] : []), ...pose.cues]
  if (lines.length === 0 || hold < 15) return []
  // Space cues evenly through the hold, leaving quiet at the start and the end.
  const slots = Math.min(lines.length, Math.max(1, Math.floor(hold / 15)))
  return lines.slice(0, slots).map((say, i) => ({ at: Math.round(4 + (i * (hold - 10)) / slots), say }))
}

export function authoredSec(item: PracticeItem): number {
  switch (item.type) {
    case 'pose':
      return item.holdSec
    case 'flow':
      return item.rounds * item.steps.reduce((s, step) => s + step.breaths * item.breathSec, 0)
    case 'sit':
    case 'rest':
      return item.durationSec
    case 'breath':
      return item.cycles * cycleSec(item.pattern)
  }
}

// Estimate for cards and lists, including the gaps the timeline will insert.
export const estimateSec = (practice: Practice, library: ReadonlyMap<PoseId, Pose>, settings: Settings, options?: CompileOptions) =>
  compile(practice, library, settings, options).totalSec
