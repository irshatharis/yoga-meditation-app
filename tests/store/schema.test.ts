import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { POSES } from '../../src/content/poses'
import { PRACTICES } from '../../src/content/practices'
import { PoseSchema, PracticeSchema } from '../../src/store/schema'

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
