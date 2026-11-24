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

test('plays every pose video offline, including the byte ranges iPhones ask for', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  const saved = () => page.evaluate(() => caches.open('pose-videos').then(c => c.match('/media/poses/child.mp4')).then(Boolean))
  await expect.poll(saved, { timeout: 15_000 }).toBe(true)

  await context.setOffline(true)
  const range = await page.evaluate(() => fetch('/media/poses/child.mp4', { headers: { Range: 'bytes=0-99' } }).then(async r => [r.status, (await r.arrayBuffer()).byteLength]))
  expect(range).toEqual([206, 100])
  await page.goto('/poses/child')
  const video = page.locator('.pose-stage video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 8_000 }).toBeGreaterThan(0.5)
})
