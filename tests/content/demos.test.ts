import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEMOS } from '../../src/content/demos'
import { POSE_IDS } from '../../src/content/pose-ids'

describe('pose videos', () => {
  it('ship a cut file for every built-in pose that lists one', () => {
    for (const [pose, demo] of Object.entries(DEMOS)) {
      expect(POSE_IDS, pose).toContain(pose)
      expect(existsSync(`public/media/poses/${pose}.mp4`), `run node scripts/pose-videos.mjs ${pose}`).toBe(true)
      expect(existsSync(`public/media/stills/${pose}.jpg`), `run node scripts/pose-videos.mjs ${pose}`).toBe(true)
      expect(demo.to, pose).toBeGreaterThan(demo.from)
    }
  })
})
