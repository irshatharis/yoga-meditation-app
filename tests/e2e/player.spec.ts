import { expect, test } from '@playwright/test'
import { said, savedSession, secondsLeft, spySpeech, stored, stubWakeLock, wakeLog } from './helpers'

test.beforeEach(async ({ page }) => {
  await stubWakeLock(page)
  await page.clock.install()
})

test('gives time to get ready before each pose', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  // Page time stands still between steps, so a slow machine does not eat into the countdown.
  await page.clock.pauseAt(Date.now() + 1_000)
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
  await page.clock.runFor(70_000)
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

test('leaves the screen alone when "Keep screen on" is off', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Keep screen on').click()
  await expect.poll(async () => ((await stored(page, 'settings')) as { keepAwake?: boolean } | undefined)?.keepAwake).toBe(false)
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(1_000)
  expect(await wakeLog(page)).toEqual([])
})

test('can be closed before it begins', async ({ page }) => {
  await page.goto('/play/morning-flow')
  await page.getByRole('button', { name: 'End practice' }).click()
  await expect(page.getByRole('dialog', { name: 'End practice' })).toBeVisible()
})

test('announces a step skipped to while paused once it plays', async ({ page }) => {
  await spySpeech(page)
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(2_000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.player-info .eyebrow')).toHaveText('Next up')
  const before = (await said(page)).length
  await page.getByRole('button', { name: 'Play' }).click()
  await page.clock.runFor(500)
  expect((await said(page)).slice(before).join(' ')).toContain('Next, Cat and cow')
})

test('going back to the start while paused stays in the practice', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(2_000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Previous' }).click()
  await page.clock.runFor(500)
  await expect(page.locator('.gate-card')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('a reload mid-practice picks up where it was', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(30_000)
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => savedSession(page), { timeout: 1_000 }).toBe('running Cat and cow')
  await page.reload()
  await expect(page.getByRole('button', { name: /^Resume/ })).toBeVisible()
  await expect(page.locator('.player-name')).toHaveText('Cat and cow')

  await page.getByRole('button', { name: /^Resume/ }).click()
  await page.clock.runFor(5_000)
  await page.getByRole('button', { name: 'Pause' }).click()
  const left = await secondsLeft(page)
  await expect.poll(() => savedSession(page)).toMatch(/^paused/)
  await page.reload()
  await expect(page.getByRole('button', { name: /^Resume/ })).toBeVisible()
  expect(await secondsLeft(page)).toBe(left)
})

test('skipping to the end does not count the skipped time as practised', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(100_000)
  for (let i = 0; i < 200 && !(await page.locator('.summary-card').isVisible()); i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.locator('.summary-card')).toContainText('2 min of Morning flow')
})

test('skipping straight through in under a minute saves nothing', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.pauseAt(Date.now() + 1_000)
  const of = Number((await page.locator('.player-title small').textContent())!.match(/of (\d+)/)![1])
  for (let i = 0; i < of; i++) await page.getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(/\/practices\/morning-flow$/)
  await page.goto('/journal')
  await expect(page.getByText('Nothing yet today')).toBeVisible()
})

test('closing the sound sheet with Escape does not offer to end the practice', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.getByRole('button', { name: 'Sound and voice' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})
