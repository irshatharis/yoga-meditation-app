import { expect, test } from '@playwright/test'
import { secondsLeft, stubWakeLock, wakeLog } from './helpers'

test.beforeEach(async ({ page }) => {
  await stubWakeLock(page)
  await page.clock.install()
})

test('gives time to get ready before each pose', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const eyebrow = page.locator('.player-info .eyebrow')
  const name = page.locator('.player-name')
  await expect(eyebrow).toHaveText('Next up')
  await expect(name).toHaveText('Child')
  await expect(page.locator('.player-clock')).toHaveText('10')

  await page.clock.runFor(6_000)
  await expect(eyebrow).toHaveText('Next up')

  await page.clock.runFor(5_000)
  await expect(eyebrow).not.toHaveText('Next up')
  await expect(name).toHaveText('Child')
})

test('keeps the screen awake while practising and lets go after', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(1_000)
  expect(await wakeLog(page)).toContain('request:screen')

  await page.getByRole('button', { name: 'End practice' }).click()
  await page.getByRole('button', { name: /^End/ }).last().click()
  await expect.poll(() => wakeLog(page)).toContain('release')
})

test('keeps time when the page was frozen in the background', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(1_000)
  const before = await secondsLeft(page)

  await page.clock.fastForward(60_000)
  await page.clock.runFor(1_000)
  const after = await secondsLeft(page)
  expect(before - after).toBeGreaterThanOrEqual(60)
  expect(before - after).toBeLessThanOrEqual(63)
})

test('pausing stops the clock', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(2_000)
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await secondsLeft(page)
  await page.clock.runFor(30_000)
  expect(await secondsLeft(page)).toBe(paused)
})

test('a finished practice lands in the journal with a note', async ({ page }) => {
  await page.goto('/practices/breathing-space')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(1_000)
  for (let i = 0; i < 40 && !(await page.locator('.summary-card').isVisible()); i++) {
    await page.getByRole('button', { name: 'Next' }).click()
    await page.clock.runFor(300)
  }
  await expect(page.locator('.summary-card')).toBeVisible()
  await page.getByRole('button', { name: 'Calm' }).click()
  await page.getByPlaceholder(/note/i).fill('Shoulders softer.')
  await page.getByRole('link', { name: 'Save to journal' }).click()

  await page.goto('/journal')
  await expect(page.getByText('Three-minute breathing space')).toBeVisible()
  await expect(page.getByText('Shoulders softer.')).toBeVisible()
})
