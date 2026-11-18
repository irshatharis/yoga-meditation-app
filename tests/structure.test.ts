import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => (statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]))

describe('app code', () => {
  // Behaviour runs from taps and timers the code starts on purpose, never from reactions to state.
  it('uses no effects', () => {
    const offenders = files('src')
      .filter(f => /\.tsx?$/.test(f))
      .filter(f => /\b(createEffect|createRenderEffect|createTrackedEffect|createReaction|onSettled|onMount)\b/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
