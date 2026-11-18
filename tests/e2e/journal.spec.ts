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
})
