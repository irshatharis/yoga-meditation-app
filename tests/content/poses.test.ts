import { describe, expect, it } from 'vitest'
import { POSES } from '../../src/content/poses'
import { POSE_IDS } from '../../src/content/pose-ids'
import { FAMILIES, FOCUSES, type Pose } from '../../src/domain/types'
import { layout, VIEW } from '../../src/figure/Figure'
import { mirror, type FigurePose } from '../../src/figure/skeleton'

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const spoken = (p: Pose) => [p.summary, ...p.setup, ...p.cues, p.release ?? '', ...p.cautions, p.easier ?? ''].filter(Boolean)
const sentence = /^[A-Z][^.!?]*[.!?]$/

// Normalized difference a - b in degrees, in (-180, 180].
const turn = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180

describe('built-in poses', () => {
  it('define exactly the ids practices may reference', () => {
    const ids = POSES.map(p => p.id as string)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual([...POSE_IDS].sort())
  })

  it.each(POSES.map(p => [p.id, p] as const))('%s has complete, speakable text', (_, p) => {
    expect(p.name.length).toBeGreaterThan(0)
    expect(FAMILIES).toContain(p.family)
    expect(p.focus.length).toBeGreaterThan(0)
    for (const f of p.focus) expect(FOCUSES).toContain(f)
    expect(p.summary).toMatch(sentence)
    expect(p.setup.length).toBeGreaterThanOrEqual(2)
    expect(p.setup.length).toBeLessThanOrEqual(5)
    expect(p.cues.length).toBeGreaterThanOrEqual(2)
    expect(p.cues.length).toBeLessThanOrEqual(4)
    expect(p.cautions.length).toBeLessThanOrEqual(3)
    expect(p.release).toMatch(sentence)
    expect(p.easier).toMatch(sentence)
    for (const s of [...p.setup, ...p.cues, ...p.cautions]) {
      expect(s).toMatch(sentence)
      expect(words(s)).toBeLessThanOrEqual(25)
    }
    for (const s of spoken(p)) {
      // Read aloud by text to speech: no symbols, digits, or asides.
      expect(s).not.toMatch(/[()[\]{}/&%#*+=<>@\d\u2013\u2014]/)
    }
    expect(p.media).toEqual([])
    expect(p.origin).toBe('builtin')
  })

  it('keep setup short enough to speak during the prepare countdown', () => {
    const counts = POSES.map(p => words(p.setup.join(' ')))
    expect(Math.max(...counts)).toBeLessThanOrEqual(32)
    expect(counts.filter(n => n <= 24).length / counts.length).toBeGreaterThanOrEqual(0.8)
  })

  it('use side-neutral words for sided poses, since the same text serves both sides', () => {
    for (const p of POSES.filter(p => p.sided)) {
      for (const s of spoken(p)) expect(s, p.id).not.toMatch(/\b(right|left)\b/i)
    }
  })
})

const figures = POSES.flatMap(p => {
  const f = p.figure!
  return p.sided ? [[`${p.id}`, f] as const, [`${p.id} mirrored`, mirror(f)] as const] : [[`${p.id}`, f] as const]
})

describe('pose figures', () => {
  it('every pose has a figure', () => {
    for (const p of POSES) expect(p.figure, p.id).not.toBeNull()
  })

  it.each(figures)('%s fits inside the view box', (_, f) => {
    const { box } = layout(f)
    expect(box.minX).toBeGreaterThanOrEqual(0)
    expect(box.maxX).toBeLessThanOrEqual(VIEW.width)
    expect(box.minY).toBeGreaterThanOrEqual(0)
    expect(box.maxY).toBeLessThanOrEqual(VIEW.height)
  })

  // Side view faces right, so a knee bends with the shin turning clockwise from
  // the thigh and an elbow bends with the forearm turning counterclockwise.
  // Anything else is a joint bending backwards.
  it.each(POSES.filter(p => p.figure?.view === 'side').map(p => [p.id, p.figure!] as const))(
    '%s bends knees and elbows the way joints bend',
    (_, f: FigurePose) => {
      for (const leg of [f.legA, f.legB]) {
        const flex = turn(leg[0], leg[1])
        expect(flex).toBeGreaterThanOrEqual(-3)
        expect(flex).toBeLessThanOrEqual(178)
      }
      for (const arm of [f.armA, f.armB]) {
        const flex = turn(arm[1], arm[0])
        expect(flex).toBeGreaterThanOrEqual(-3)
        expect(flex).toBeLessThanOrEqual(175)
      }
    }
  )
})
