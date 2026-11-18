import { describe, expect, it } from 'vitest'
import { PATHS } from '../../src/content/paths'
import { POSE_IDS } from '../../src/content/pose-ids'
import { PRACTICES } from '../../src/content/practices'
import { compile } from '../../src/domain/timeline'
import { DEFAULT_SETTINGS, type Pose, type PoseId, type Practice, type PracticeItem } from '../../src/domain/types'

const SIDED = new Set<string>([
  'warrior-1', 'warrior-2', 'reverse-warrior', 'extended-side-angle', 'triangle', 'pyramid', 'high-lunge', 'low-lunge',
  'standing-side-bend', 'tree', 'warrior-3', 'half-moon', 'eagle', 'dancer', 'side-plank', 'thread-the-needle', 'bird-dog',
  'gate', 'half-splits', 'lizard', 'pigeon', 'head-to-knee', 'seated-twist', 'seated-side-bend', 'neck-release',
  'supine-twist', 'supine-figure-four', 'reclined-hamstring', 'side-lying-leg-raise'
])

const library = new Map<PoseId, Pose>(
  POSE_IDS.map(id => [
    id as PoseId,
    {
      id: id as PoseId,
      name: id,
      family: 'standing',
      level: 'gentle',
      focus: [],
      sided: SIDED.has(id),
      summary: id,
      setup: ['Set up.'],
      cues: ['Breathe.', 'Stay steady.'],
      cautions: [],
      figure: null,
      media: [],
      origin: 'builtin'
    }
  ])
)

// The length each practice promises in its card copy, in minutes.
const STATED_MIN: Record<string, number> = {
  'morning-flow': 17,
  'sun-salutation-a': 6,
  'sun-salutation-b': 9,
  'gentle-wake-up': 10,
  'beginner-foundations': 15,
  'hips-and-hamstrings': 20,
  'lower-back-relief': 12,
  'desk-break': 5,
  'standing-strength': 20,
  'balance-and-focus': 15,
  'evening-wind-down': 15,
  'yin-long-holds': 30,
  'full-practice': 45,
  'silent-meditation': 15,
  'guided-meditation': 15,
  'breath-awareness': 10,
  'body-scan': 15,
  'loving-kindness': 12,
  noting: 10,
  'open-awareness': 15,
  'breathing-space': 3,
  'morning-intention': 5,
  'sleep-wind-down': 15,
  'walking-meditation': 10,
  gratitude: 8,
  'box-breathing': 5,
  'relaxing-breath': 5,
  'coherent-breathing': 10,
  'extended-exhale': 7,
  'energizing-breath': 6,
  'alternate-nostril': 7
}

const poseRefs = (item: PracticeItem): string[] => {
  switch (item.type) {
    case 'pose':
      return [item.pose]
    case 'flow':
      return item.steps.map(s => s.pose)
    case 'sit':
    case 'breath':
      return item.posture ? [item.posture] : []
    case 'rest':
      return item.pose ? [item.pose] : []
  }
}

const spoken = (p: Practice): string[] =>
  p.items.flatMap(item => {
    switch (item.type) {
      case 'pose':
        return item.cue ? [item.cue] : []
      case 'flow':
        return [item.title, ...item.steps.map(s => s.cue)]
      case 'sit':
        return [item.title, ...(item.intro ? [item.intro] : []), ...item.guidance.map(g => g.text)]
      case 'breath':
        return [item.title, ...(item.intro ? [item.intro] : [])]
      case 'rest':
        return [item.title, ...(item.text ? [item.text] : [])]
    }
  })

// Rough speaking rate of the default voice, used to keep spoken lines from overlapping.
const CHARS_PER_SEC = 14

const byId = new Map(PRACTICES.map(p => [p.id as string, p]))

describe('built-in practices', () => {
  it('have unique ids and a stated length for every one', () => {
    expect(byId.size).toBe(PRACTICES.length)
    expect(Object.keys(STATED_MIN).sort()).toEqual([...byId.keys()].sort())
  })

  it('reference only built-in poses', () => {
    const known = new Set<string>(POSE_IDS)
    for (const p of PRACTICES) for (const ref of p.items.flatMap(poseRefs)) expect(known, `${p.id} uses ${ref}`).toContain(ref)
  })

  it('carry the copy every card needs', () => {
    for (const p of PRACTICES) {
      expect(p.origin).toBe('builtin')
      expect(p.summary.length, p.id).toBeGreaterThan(10)
      expect(p.description?.length ?? 0, p.id).toBeGreaterThan(60)
      expect(p.focus.length, p.id).toBeGreaterThan(0)
    }
  })

  it('keep guidance inside each sit, in order, without overlapping speech', () => {
    for (const p of PRACTICES)
      for (const item of p.items) {
        if (item.type !== 'sit') continue
        const lines = [...(item.intro ? [{ at: 1, text: item.intro }] : []), ...item.guidance]
        lines.forEach((line, i) => {
          expect(line.at, `${p.id}: "${line.text}"`).toBeGreaterThanOrEqual(0)
          expect(line.at + line.text.length / CHARS_PER_SEC, `${p.id}: "${line.text}" runs past the end`).toBeLessThanOrEqual(item.durationSec)
          const prev = lines[i - 1]
          if (prev) expect(line.at, `${p.id}: "${line.text}" starts before the line before it ends`).toBeGreaterThanOrEqual(prev.at + prev.text.length / CHARS_PER_SEC + 1)
        })
      }
  })

  it('fit each flow cue inside its step', () => {
    for (const p of PRACTICES)
      for (const item of p.items)
        if (item.type === 'flow')
          for (const s of item.steps) expect(s.cue.length / CHARS_PER_SEC, `${p.id}: "${s.cue}"`).toBeLessThanOrEqual(s.breaths * item.breathSec)
  })

  it('use breath patterns with a real breath in and out', () => {
    for (const p of PRACTICES)
      for (const item of p.items)
        if (item.type === 'breath') {
          expect(item.pattern.inhale, p.id).toBeGreaterThan(0)
          expect(item.pattern.exhale, p.id).toBeGreaterThan(0)
          expect(item.cycles, p.id).toBeGreaterThan(0)
        }
  })

  it('speak plain words a voice can read', () => {
    for (const p of PRACTICES) for (const text of spoken(p)) expect(text, p.id).not.toMatch(/[()[\]{}/\\&;:0-9%+=*#@<>|_~"\u2013\u2014\u2026]/)
    expect(JSON.stringify([PRACTICES, PATHS])).not.toMatch(/[\u2013\u2014]/)
  })

  it('compile to roughly the length they promise', () => {
    for (const p of PRACTICES) {
      const stated = STATED_MIN[p.id]! * 60
      const total = compile(p, library, DEFAULT_SETTINGS).totalSec
      expect(total, `${p.id} runs ${Math.round(total)} s, promised ${stated} s`).toBeGreaterThanOrEqual(stated * 0.8)
      expect(total, `${p.id} runs ${Math.round(total)} s, promised ${stated} s`).toBeLessThanOrEqual(stated * 1.2)
    }
  })

  it('honor every length an adjustable practice offers', () => {
    for (const p of PRACTICES) {
      if (!p.adjustable) continue
      for (const lengthSec of [p.adjustable.minSec, p.adjustable.maxSec]) {
        const total = compile(p, library, DEFAULT_SETTINGS, { lengthSec }).totalSec
        expect(Math.abs(total - lengthSec), `${p.id} at ${lengthSec} s runs ${Math.round(total)} s`).toBeLessThanOrEqual(Math.max(30, lengthSec * 0.15))
      }
    }
  })

  it('hold yoga poses for realistic times', () => {
    for (const p of PRACTICES)
      for (const item of p.items)
        if (item.type === 'pose') expect(item.holdSec, `${p.id}: ${item.pose}`).toSatisfy((s: number) => s >= 15 && s <= 240)
  })
})

describe('built-in paths', () => {
  it('point every day at an existing practice of the same kind', () => {
    for (const path of PATHS)
      for (const day of path.days) {
        const practice = byId.get(day.practice)
        expect(practice, `${path.id} references ${day.practice}`).toBeDefined()
        expect(practice?.kind, `${path.id}: ${day.practice}`).toBe(path.kind)
        expect(day.note.length).toBeGreaterThan(10)
      }
  })

  it('have unique ids and the promised number of days', () => {
    expect(new Set(PATHS.map(p => p.id)).size).toBe(PATHS.length)
    expect(Object.fromEntries(PATHS.map(p => [p.id, p.days.length]))).toEqual({
      'first-week-of-yoga': 7,
      'ten-days-of-meditation': 10,
      'breathe-better': 5
    })
  })
})
