import { describe, expect, it } from 'vitest'
import { compile } from '../../src/domain/timeline'
import { advance, back, dueCues, extend, locate, next, pause, play, position, practiced, start, steps } from '../../src/domain/player'
import { DEFAULT_SETTINGS, poseId, practiceId, type Pose, type PoseId, type Practice, type Settings } from '../../src/domain/types'

const pose = (id: string, sided: boolean): Pose => ({
  id: poseId(id),
  name: id,
  family: 'standing',
  level: 'gentle',
  focus: [],
  sided,
  summary: `${id} summary`,
  setup: [`Set up ${id}.`],
  cues: ['Breathe.', 'Soften.'],
  cautions: [],
  figure: null,
  media: [],
  origin: 'builtin'
})

const library = new Map<PoseId, Pose>([pose('tree', true), pose('child', false), pose('cobra', false)].map(p => [p.id, p]))

const practice = (items: Practice['items'], pacing?: Practice['pacing']): Practice => ({
  id: practiceId('t'),
  title: 'Test',
  summary: '',
  kind: 'yoga',
  level: 'gentle',
  focus: [],
  items,
  pacing,
  origin: 'builtin'
})

const settings = (patch: Partial<Settings['pacing']> = {}): Settings => ({ ...DEFAULT_SETTINGS, pacing: { ...DEFAULT_SETTINGS.pacing, ...patch } })

describe('compile', () => {
  it('puts a prepare gap before every pose and a switch between sides', () => {
    const t = compile(
      practice([
        { type: 'pose', pose: poseId('child'), holdSec: 30 },
        { type: 'pose', pose: poseId('tree'), holdSec: 30 }
      ]),
      library,
      settings({ prepareSec: 10, switchSec: 6 })
    )
    expect(t.segments.map(s => `${s.kind}:${s.title}${s.side ? ':' + s.side : ''}:${s.durationSec}`)).toEqual([
      'prepare:child:10',
      'hold:child:30',
      'prepare:tree:right:10',
      'hold:tree:right:30',
      'switch:tree:left:6',
      'hold:tree:left:30'
    ])
    expect(t.totalSec).toBe(116)
  })

  it('honours per-practice pacing over settings', () => {
    const t = compile(practice([{ type: 'pose', pose: poseId('child'), holdSec: 30 }], { prepareSec: 20 }), library, settings({ prepareSec: 5 }))
    expect(t.segments[0]).toMatchObject({ kind: 'prepare', durationSec: 20 })
  })

  it('omits the prepare gap when set to zero', () => {
    const t = compile(practice([{ type: 'pose', pose: poseId('child'), holdSec: 30 }]), library, settings({ prepareSec: 0 }))
    expect(t.segments.map(s => s.kind)).toEqual(['hold'])
  })

  it('alternates the lead side of sided steps across flow rounds', () => {
    const t = compile(
      practice([{ type: 'flow', title: 'Flow', rounds: 2, breathSec: 4, alternate: true, steps: [{ pose: poseId('tree'), breaths: 1, cue: 'Inhale' }, { pose: poseId('cobra'), breaths: 2, cue: 'Exhale' }] }]),
      library,
      settings()
    )
    expect(t.segments.filter(s => s.kind === 'flow').map(s => s.side ?? '-')).toEqual(['right', '-', 'left', '-'])
    expect(t.segments.filter(s => s.kind === 'flow').map(s => s.durationSec)).toEqual([4, 8, 4, 8])
  })

  it('stretches meditation guidance when the length changes', () => {
    const t = compile(
      practice([{ type: 'sit', title: 'Sit', durationSec: 600, guidance: [{ at: 300, text: 'Halfway' }] }]),
      library,
      settings(),
      { lengthSec: 1200 }
    )
    const sit = t.segments.find(s => s.kind === 'sit')!
    expect(sit.durationSec).toBe(1200)
    expect(sit.cues.find(c => c.say === 'Halfway')?.at).toBe(600)
  })

  it('places interval bells inside a sit', () => {
    const t = compile(practice([{ type: 'sit', title: 'Sit', durationSec: 300, guidance: [], intervalBellSec: 120 }]), library, settings())
    const sit = t.segments.find(s => s.kind === 'sit')!
    expect(sit.cues.filter(c => c.sound === 'bell').map(c => c.at)).toEqual([0, 120, 240])
  })

  it('stays quiet when voice detail is quiet', () => {
    const quiet = { ...DEFAULT_SETTINGS, voice: { ...DEFAULT_SETTINGS.voice, detail: 'quiet' as const } }
    const t = compile(practice([{ type: 'pose', pose: poseId('tree'), holdSec: 60 }]), library, quiet)
    expect(t.segments.flatMap(s => s.cues).filter(c => c.say)).toEqual([])
  })
})

describe('player', () => {
  const timeline = compile(
    practice([
      { type: 'pose', pose: poseId('child'), holdSec: 30 },
      { type: 'pose', pose: poseId('cobra'), holdSec: 30 }
    ]),
    library,
    settings({ prepareSec: 10 })
  )

  it('derives position from the wall clock and catches up after a freeze', () => {
    let s = play(start(timeline), 1_000)
    // 60 s pass with no ticks at all (screen locked, tab frozen).
    s = advance(s, 61_000)
    const at = locate(s.timeline, position(s, 61_000))
    expect(at.segment).toMatchObject({ kind: 'hold', title: 'cobra' })
    expect(at).toMatchObject({ index: 3, intoMs: 10_000, posMs: 60_000 })
  })

  it('pauses and resumes without losing time', () => {
    let s = play(start(timeline), 0)
    s = pause(s, 5_000)
    expect(position(s, 999_999)).toBe(5_000)
    s = play(s, 100_000)
    expect(position(s, 101_000)).toBe(6_000)
  })

  it('finishes at the end', () => {
    const s = advance(play(start(timeline), 0), 10_000_000)
    expect(s.phase.status).toBe('done')
  })

  it('waits at gates when "wait for me" is on, then continues into the pose', () => {
    const gated = compile(practice([{ type: 'pose', pose: poseId('child'), holdSec: 30 }]), library, settings({ prepareSec: 10, waitForMe: true }))
    let s = advance(play(start(gated), 0), 50_000)
    expect(s.phase.status).toBe('waiting')
    s = play(s, 200_000)
    const at = locate(s.timeline, position(s, 200_000))
    expect(at.segment.kind).toBe('hold')
    expect(at.intoMs).toBe(0)
    expect(advance(s, 205_000).phase.status).toBe('running')
  })

  it('skips a whole step at a time, get-ready gap included', () => {
    let s = play(start(timeline), 0)
    s = next(s, 2_000)
    expect(locate(s.timeline, position(s, 2_000))).toMatchObject({ index: 2, intoMs: 0, segment: { kind: 'prepare', title: 'cobra' } })
    s = back(s, 3_000)
    expect(locate(s.timeline, position(s, 3_000))).toMatchObject({ index: 0, intoMs: 0 })
  })

  it('goes back to the start of the step once it is under way', () => {
    let s = play(start(timeline), 0)
    s = back(s, 20_000)
    expect(locate(s.timeline, position(s, 20_000))).toMatchObject({ index: 0, intoMs: 0 })
  })

  it('treats a flow as one step and each side of a pose as its own', () => {
    const t = compile(
      practice([
        { type: 'flow', title: 'Cat and cow', rounds: 3, breathSec: 4, alternate: false, steps: [{ pose: poseId('child'), breaths: 1, cue: 'In.' }, { pose: poseId('cobra'), breaths: 1, cue: 'Out.' }] },
        { type: 'pose', pose: poseId('tree'), holdSec: 30 }
      ]),
      library,
      settings({ prepareSec: 10 })
    )
    expect(steps(t).map(st => t.segments.slice(st.first, st.last + 1).map(seg => seg.kind).join(' '))).toEqual(['prepare flow flow flow flow flow flow', 'prepare hold', 'switch hold'])
    const s = next(play(start(t), 0), 12_000)
    expect(locate(s.timeline, position(s, 12_000)).segment).toMatchObject({ kind: 'prepare', title: 'tree' })
  })

  it('extends the current segment', () => {
    let s = play(start(timeline), 0)
    s = extend(s, 12_000, 15)
    expect(s.timeline.segments[1]!.durationSec).toBe(45)
    expect(s.timeline.totalSec).toBe(timeline.totalSec + 15)
  })

  it('moves the get-ready countdown to the new end when the gap is extended', () => {
    const s = extend(play(start(timeline), 0), 2_000, 15)
    const ticks = dueCues(s.timeline, 0, 26_000, Infinity).filter(c => c.sound === 'tick')
    expect(ticks.map(c => c.key.split(':')[0])).toEqual(['0', '0', '0'])
    expect(dueCues(s.timeline, 6_500, 10_000, Infinity).filter(c => c.sound === 'tick')).toEqual([])
    expect(dueCues(s.timeline, 21_500, 22_000).filter(c => c.sound === 'tick')).toHaveLength(1)
  })

  it('counts time spent practising, not time skipped', () => {
    let s = play(start(timeline), 0)
    s = next(next(s, 4_000), 5_000)
    expect(s.phase.status).toBe('done')
    expect(practiced(s, 50_000)).toBe(5_000)
  })

  it('leaves paused time out of the practised time', () => {
    let s = play(start(timeline), 0)
    s = pause(s, 20_000)
    s = play(s, 500_000)
    expect(practiced(s, 510_000)).toBe(30_000)
    s = advance(s, 10_000_000)
    expect(s.phase.status).toBe('done')
    expect(practiced(s, 10_000_000)).toBe(timeline.totalSec * 1000)
  })

  it('counts a part replayed after going back', () => {
    let s = play(start(timeline), 0)
    s = back(s, 2_000)
    expect(practiced(s, 4_000)).toBe(4_000)
  })

  it('keeps going when skipping from a "wait for me" stop', () => {
    const gated = compile(practice([{ type: 'pose', pose: poseId('child'), holdSec: 30 }, { type: 'pose', pose: poseId('cobra'), holdSec: 30 }]), library, settings({ prepareSec: 10, waitForMe: true }))
    let s = advance(play(start(gated), 0), 12_000)
    expect(s.phase.status).toBe('waiting')
    s = next(s, 15_000)
    expect(s.phase.status).toBe('running')
    expect(locate(s.timeline, position(s, 15_000)).segment).toMatchObject({ kind: 'prepare', title: 'cobra' })
    expect(practiced(s, 16_000)).toBe(11_000)
  })
})

describe('cues', () => {
  const timeline = compile(practice([{ type: 'pose', pose: poseId('child'), holdSec: 30 }]), library, settings({ prepareSec: 10 }))

  it('fires each cue once across consecutive windows', () => {
    const keys = [...dueCues(timeline, -1, 500), ...dueCues(timeline, 500, 10_500), ...dueCues(timeline, 10_500, 11_000)].map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('1:0')
  })

  it('drops stale cues after a long gap instead of replaying them', () => {
    expect(dueCues(timeline, 0, 39_000)).toEqual([])
    expect(dueCues(timeline, 0, 10_400).map(c => c.key)).toContain('1:0')
  })
})
