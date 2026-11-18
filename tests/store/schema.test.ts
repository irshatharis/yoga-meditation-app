import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { POSES } from '../../src/content/poses'
import { PRACTICES } from '../../src/content/practices'
import { DEFAULT_SETTINGS } from '../../src/domain/types'
import { parseSettings, PoseSchema, PracticeSchema, settingsRecord } from '../../src/store/schema'

// Built-in content goes through the same schemas as imports and share links,
// so a renderer or model change that the schema misses fails here.
describe('import schemas accept every built-in record', () => {
  it.each(POSES.map(p => [p.id, p] as const))('pose %s', (_, pose) => {
    const out = v.safeParse(PoseSchema, pose)
    expect(out.issues?.map(i => `${i.path?.map(p => p.key).join('.')}: ${i.message}`) ?? []).toEqual([])
  })
  it.each(PRACTICES.map(p => [p.id, p] as const))('practice %s', (_, practice) => {
    const out = v.safeParse(PracticeSchema, practice)
    expect(out.issues?.map(i => `${i.path?.map(p => p.key).join('.')}: ${i.message}`) ?? []).toEqual([])
  })
})

describe('pose media links from files and share links', () => {
  const withLink = (href: string) => ({ ...POSES[0], origin: 'mine', media: [{ kind: 'link', href }] })
  it('accepts web links', () => {
    expect(v.is(PoseSchema, withLink('https://example.com/video'))).toBe(true)
  })
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd'])('rejects %s', href => {
    expect(v.is(PoseSchema, withLink(href))).toBe(false)
  })
})

describe('parseSettings', () => {
  it('speaks pose names only by default', () => {
    expect(parseSettings(undefined).voice.detail).toBe('names')
  })

  it('moves settings saved under the old full-guidance default to names', () => {
    const old = { ...DEFAULT_SETTINGS, voice: { ...DEFAULT_SETTINGS.voice, detail: 'full' } }
    expect(parseSettings(old).voice.detail).toBe('names')
  })

  it('keeps full guidance once someone has chosen it', () => {
    const chosen = settingsRecord({ ...DEFAULT_SETTINGS, voice: { ...DEFAULT_SETTINGS.voice, detail: 'full' } })
    expect(parseSettings(chosen).voice.detail).toBe('full')
  })

  it('keeps quiet as it was', () => {
    expect(parseSettings({ voice: { detail: 'quiet' } }).voice.detail).toBe('quiet')
  })
})
