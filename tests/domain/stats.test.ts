import { describe, expect, it } from 'vitest'
import { addDays, dayKey, parseDay, streaks, totals, weekDays } from '../../src/domain/stats'
import { practiceId, type SessionLog } from '../../src/domain/types'

const at = (day: string, hour = 8) => parseDay(day).getTime() + hour * 3600_000
const log = (day: string, practicedSec = 600, completed = true): SessionLog => ({
  id: day + practicedSec,
  practice: practiceId('p'),
  title: 'p',
  kind: 'yoga',
  startedAt: at(day),
  endedAt: at(day) + practicedSec * 1000,
  plannedSec: practicedSec,
  practicedSec,
  completed
})

describe('streaks', () => {
  it('counts a run ending today', () => {
    expect(streaks([log('2026-11-16'), log('2026-11-17'), log('2026-11-18')], '2026-11-18')).toEqual({ current: 3, longest: 3, practicedToday: true })
  })

  it('keeps the streak alive until today is over', () => {
    expect(streaks([log('2026-11-16'), log('2026-11-17')], '2026-11-18').current).toBe(2)
  })

  it('breaks after a missed day and remembers the longest run', () => {
    const s = streaks([log('2026-11-01'), log('2026-11-02'), log('2026-11-03'), log('2026-11-04'), log('2026-11-17')], '2026-11-18')
    expect(s).toMatchObject({ current: 1, longest: 4 })
  })

  it('ignores sessions shorter than a minute that were not completed', () => {
    expect(streaks([log('2026-11-18', 20, false)], '2026-11-18').current).toBe(0)
  })
})

describe('calendar helpers', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('builds a week starting on Monday or Sunday', () => {
    expect(weekDays('2026-11-18', 1)[0]).toBe('2026-11-16')
    expect(weekDays('2026-11-18', 0)[0]).toBe('2026-11-15')
  })

  it('round-trips local day keys', () => {
    expect(dayKey(at('2026-11-18', 23))).toBe('2026-11-18')
  })

  it('totals minutes by kind', () => {
    expect(totals([log('2026-11-18', 600), log('2026-11-17', 300)])).toMatchObject({ sessions: 2, minutes: 15, byKind: { yoga: 15 } })
  })
})
