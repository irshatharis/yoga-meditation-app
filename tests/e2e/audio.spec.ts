import { expect, test, type Page } from '@playwright/test'

// Taps every connection to the speakers so the test can read the real output level.
async function tapOutput(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __level: () => number; __tap?: AnalyserNode }
    const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => AudioNode
    AudioNode.prototype.connect = function (this: AudioNode, target: unknown, ...rest: unknown[]) {
      if (target instanceof AudioDestinationNode) {
        w.__tap ??= Object.assign(target.context.createAnalyser(), { fftSize: 2048 })
        connect.call(this, w.__tap)
      }
      return connect.call(this, target, ...rest)
    } as typeof AudioNode.prototype.connect
    w.__level = () => {
      if (!w.__tap) return 0
      const data = new Float32Array(w.__tap.fftSize)
      w.__tap.getFloatTimeDomainData(data)
      return Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length)
    }
  })
}

const level = (page: Page) => page.evaluate(() => (window as unknown as { __level: () => number }).__level())

test('ending a practice silences ringing bells and background sound', async ({ page }) => {
  await tapOutput(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Rain', exact: true }).click()
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => level(page), { timeout: 8_000 }).toBeGreaterThan(0.01)

  await page.getByRole('button', { name: 'End practice' }).click()
  await page.getByRole('button', { name: 'End practice' }).last().click()
  await page.waitForTimeout(1_500)
  expect(await level(page)).toBeLessThan(0.001)
})

test('pausing silences a ringing bell', async ({ page }) => {
  await tapOutput(page)
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => level(page), { timeout: 8_000 }).toBeGreaterThan(0.01)

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.waitForTimeout(1_500)
  expect(await level(page)).toBeLessThan(0.001)
})
