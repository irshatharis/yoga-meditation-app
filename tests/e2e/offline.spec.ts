import { expect, test } from '@playwright/test'

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.brand')).toBeVisible()
  await page.goto('/practices/morning-flow')
  await expect(page.locator('h1')).toHaveText('Morning flow')
  await page.goto('/poses/warrior-2')
  await expect(page.locator('h1')).toContainText('Warrior two')
  const bell = await page.evaluate(() => fetch('/sounds/bowl.mp3').then(r => r.ok))
  expect(bell).toBe(true)
})
