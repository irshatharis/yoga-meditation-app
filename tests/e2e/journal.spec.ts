import { expect, test } from '@playwright/test'

test('the journal moves to the new day when the app is reopened after midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T23:50:00') })
  await page.goto('/journal')
  await expect(page.getByRole('button', { name: /^11\/18\/2026/ })).toHaveAttribute('aria-current', 'date')
  await expect(page.getByRole('button', { name: /^11\/19\/2026/ })).toBeDisabled()

  await page.clock.fastForward('20:00')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('button', { name: /^11\/19\/2026/ })).toBeEnabled()
  await expect(page.getByRole('button', { name: /^11\/19\/2026/ })).toHaveAttribute('aria-current', 'date')
  await expect(page.getByRole('heading', { name: 'Thursday, November 19' })).toBeVisible()
})

test('the home screen moves to the new day when the app is reopened in the morning', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T23:50:00') })
  await page.goto('/')
  await expect(page.locator('.eyebrow').first()).toHaveText('Late night')

  await page.clock.fastForward('08:30:00')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.locator('.eyebrow').first()).toHaveText('Good morning')
  await expect(page.locator('.dot.today')).toHaveCount(1)
})
