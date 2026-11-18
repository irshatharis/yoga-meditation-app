import { expect, test, type Page } from '@playwright/test'
import { stubWakeLock } from './helpers'

test.beforeEach(async ({ page }) => {
  await stubWakeLock(page)
  await page.clock.install()
})

type Box = { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

async function boxes(page: Page, stage: string) {
  const box = async (selector: string) => {
    const b = await page.locator(selector).boundingBox()
    if (!b) throw new Error(`${selector} is not visible`)
    return b
  }
  return { stage: await box(stage), clock: await box('.player-clock .ring'), controls: await box('.player-controls'), foot: await box('.player-foot') }
}

const SIZES = [
  { name: 'a 360 by 640 phone', width: 360, height: 640 },
  { name: 'a phone on its side', width: 851, height: 393 }
]

for (const size of SIZES) {
  test(`the pose, the clock and the controls each keep their own space on ${size.name}`, async ({ page }) => {
    await page.setViewportSize(size)
    for (const [id, stage] of [['morning-flow', '.stage-figure svg'], ['box-breathing', '.breath-orb'], ['guided-meditation', '.player-stage > *']]) {
      await page.goto(`/practices/${id}`)
      await page.getByRole('button', { name: /^Begin/ }).click()
      await page.clock.runFor(14_000)
      const b = await boxes(page, stage!)
      expect(overlaps(b.stage, b.clock), `${id}: stage and clock`).toBe(false)
      expect(overlaps(b.stage, b.controls), `${id}: stage and controls`).toBe(false)
      expect(b.foot.y + b.foot.height, `${id}: footer on screen`).toBeLessThanOrEqual(size.height)
    }
  })
}
