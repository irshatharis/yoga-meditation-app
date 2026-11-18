import type { Cue, Segment, Timeline } from './timeline'

// Position is always derived from the wall clock (running) or stored (paused),
// never accumulated from ticks. A frozen tab or a locked screen therefore
// lands on the right segment the moment code runs again.
export type Phase =
  | { status: 'ready'; posMs: 0 }
  // `sinceMs` is when this run began, for counting practised time.
  | { status: 'running'; originMs: number; sinceMs: number }
  | { status: 'paused'; posMs: number }
  | { status: 'waiting'; posMs: number; gate: number }
  | { status: 'done'; posMs: number }

export type PlayerState = {
  timeline: Timeline
  phase: Phase
  // Gates the person already tapped through.
  opened: number[]
  // Time spent running before the current run. Skipped steps do not count.
  practicedMs: number
}

export type Location = {
  index: number
  segment: Segment
  intoMs: number
  remainingMs: number
  posMs: number
  totalMs: number
}

export const start = (timeline: Timeline): PlayerState => ({ timeline, phase: { status: 'ready', posMs: 0 }, opened: [], practicedMs: 0 })

const ends = (timeline: Timeline) => {
  let acc = 0
  return timeline.segments.map(s => (acc += s.durationSec * 1000))
}

export const totalMs = (timeline: Timeline) => timeline.totalSec * 1000

export function position(state: PlayerState, now: number): number {
  const { phase } = state
  return phase.status === 'running' ? now - phase.originMs : phase.posMs
}

export function practiced(state: PlayerState, now: number): number {
  const { phase } = state
  return state.practicedMs + (phase.status === 'running' ? Math.max(0, now - phase.sinceMs) : 0)
}

export function locate(timeline: Timeline, posMs: number): Location {
  const bounds = ends(timeline)
  const total = bounds.at(-1) ?? 0
  const pos = Math.min(Math.max(0, posMs), total)
  let index = bounds.findIndex(end => pos < end)
  if (index === -1) index = timeline.segments.length - 1
  const startMs = index > 0 ? bounds[index - 1]! : 0
  const endMs = bounds[index]!
  return { index, segment: timeline.segments[index]!, intoMs: pos - startMs, remainingMs: endMs - pos, posMs: pos, totalMs: total }
}

export const segmentStartMs = (timeline: Timeline, index: number) => (index <= 0 ? 0 : ends(timeline)[index - 1]!)

// Settle the state for `now`: stop at an unopened gate, finish at the end.
export function advance(state: PlayerState, now: number): PlayerState {
  const { phase } = state
  if (phase.status !== 'running') return state
  const pos = position(state, now)
  const bounds = ends(state.timeline)
  // A frozen tab may only notice the stop late. Practice ended when the stop was reached.
  const stopAt = (posMs: number) => practiced(state, Math.min(now, phase.originMs + posMs))
  const gate = state.timeline.segments.findIndex((s, i) => s.gate && !state.opened.includes(i) && bounds[i]! <= pos)
  if (gate !== -1) return { ...state, practicedMs: stopAt(bounds[gate]!), phase: { status: 'waiting', posMs: bounds[gate]! - 1, gate } }
  const total = totalMs(state.timeline)
  if (pos >= total) return { ...state, practicedMs: stopAt(total), phase: { status: 'done', posMs: total } }
  return state
}

export function play(state: PlayerState, now: number): PlayerState {
  switch (state.phase.status) {
    case 'ready':
    case 'paused':
      return { ...state, phase: { status: 'running', originMs: now - state.phase.posMs, sinceMs: now } }
    case 'waiting':
      return {
        ...state,
        opened: [...state.opened, state.phase.gate],
        phase: { status: 'running', originMs: now - (state.phase.posMs + 1), sinceMs: now }
      }
    default:
      return state
  }
}

export function pause(state: PlayerState, now: number): PlayerState {
  if (state.phase.status !== 'running') return state
  return { ...state, practicedMs: practiced(state, now), phase: { status: 'paused', posMs: position(state, now) } }
}

export function seek(state: PlayerState, now: number, posMs: number): PlayerState {
  const pos = Math.min(Math.max(0, posMs), totalMs(state.timeline) - 1)
  const location = locate(state.timeline, pos)
  // Seeking past a gate counts as passing it.
  const opened = [...new Set([...state.opened, ...state.timeline.segments.flatMap((s, i) => (s.gate && i < location.index ? [i] : []))])]
  // Skipping on from a "wait for me" stop means carry on.
  const phase: Phase =
    state.phase.status === 'running'
      ? { status: 'running', originMs: now - pos, sinceMs: state.phase.sinceMs }
      : state.phase.status === 'waiting'
        ? { status: 'running', originMs: now - pos, sinceMs: now }
        : { status: 'paused', posMs: pos }
  return { ...state, opened, phase }
}

export function next(state: PlayerState, now: number): PlayerState {
  const { index } = locate(state.timeline, position(state, now))
  if (index >= state.timeline.segments.length - 1) return { ...state, practicedMs: practiced(state, now), phase: { status: 'done', posMs: totalMs(state.timeline) } }
  return seek(state, now, segmentStartMs(state.timeline, index + 1))
}

// Back restarts the current segment, or goes to the previous one when already near its start.
export function back(state: PlayerState, now: number): PlayerState {
  const at = locate(state.timeline, position(state, now))
  const target = at.intoMs > 3000 || at.index === 0 ? at.index : at.index - 1
  return seek(state, now, segmentStartMs(state.timeline, target))
}

export function extend(state: PlayerState, now: number, seconds: number): PlayerState {
  const pos = position(state, now)
  const { index } = locate(state.timeline, pos)
  const segments = state.timeline.segments.map((s, i) => (i === index ? { ...s, durationSec: s.durationSec + seconds } : s))
  const timeline = { segments, totalSec: state.timeline.totalSec + seconds }
  return { ...state, timeline }
}

export type DueCue = Cue & { key: string }

// Cues that became due in (fromMs, toMs]. Cues more than `staleMs` old are
// dropped, so returning from a long freeze does not play a burst of speech.
export function dueCues(timeline: Timeline, fromMs: number, toMs: number, staleMs = 2500): DueCue[] {
  if (toMs <= fromMs) return []
  const out: DueCue[] = []
  let startMs = 0
  timeline.segments.forEach((segment, index) => {
    segment.cues.forEach((cue, c) => {
      const at = startMs + (cue.at < 0 ? segment.durationSec + cue.at : cue.at) * 1000
      if (at > fromMs && at <= toMs && toMs - at <= staleMs) out.push({ ...cue, key: `${index}:${c}` })
    })
    startMs += segment.durationSec * 1000
  })
  return out
}
