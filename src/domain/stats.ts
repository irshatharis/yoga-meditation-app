import type { SessionLog } from './types'

export type DayKey = string

export const dayKey = (ms: number): DayKey => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const parseDay = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export const addDays = (key: DayKey, n: number): DayKey => {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d.getTime())
}

// A session counts toward the streak and calendar once a minute of practice happened.
export const counts = (log: SessionLog) => log.practicedSec >= 60 || log.completed

export function byDay(logs: readonly SessionLog[]): Map<DayKey, SessionLog[]> {
  const map = new Map<DayKey, SessionLog[]>()
  for (const log of [...logs].sort((a, b) => a.startedAt - b.startedAt)) {
    const key = dayKey(log.startedAt)
    const list = map.get(key)
    if (list) list.push(log)
    else map.set(key, [log])
  }
  return map
}

export type Streaks = { current: number; longest: number; practicedToday: boolean }

export function streaks(logs: readonly SessionLog[], today: DayKey): Streaks {
  const days = new Set(logs.filter(counts).map(l => dayKey(l.startedAt)))
  const practicedToday = days.has(today)
  let current = 0
  // An unbroken run ending today, or ending yesterday when today is still open.
  for (let d = practicedToday ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++
  let longest = 0
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue
    let run = 0
    for (let x = d; days.has(x); x = addDays(x, 1)) run++
    longest = Math.max(longest, run)
  }
  return { current, longest, practicedToday }
}

export function minutesOn(logs: readonly SessionLog[], day: DayKey) {
  return Math.round(logs.filter(l => dayKey(l.startedAt) === day).reduce((s, l) => s + l.practicedSec, 0) / 60)
}

export function weekDays(today: DayKey, weekStart: 0 | 1): DayKey[] {
  const dow = parseDay(today).getDay()
  const offset = (dow - weekStart + 7) % 7
  const first = addDays(today, -offset)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

export type Totals = { sessions: number; minutes: number; byKind: Record<SessionLog['kind'], number> }

export function totals(logs: readonly SessionLog[]): Totals {
  const byKind = { yoga: 0, meditation: 0, breath: 0 }
  let seconds = 0
  for (const l of logs) {
    seconds += l.practicedSec
    byKind[l.kind] += l.practicedSec / 60
  }
  return {
    sessions: logs.filter(counts).length,
    minutes: Math.round(seconds / 60),
    byKind: { yoga: Math.round(byKind.yoga), meditation: Math.round(byKind.meditation), breath: Math.round(byKind.breath) }
  }
}
