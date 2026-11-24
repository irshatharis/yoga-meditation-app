import { expect, test, type Locator } from '@playwright/test'

const playing = (video: Locator) => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2)
const time = (video: Locator) => video.evaluate((v: HTMLVideoElement) => v.currentTime)

test('a pose page shows a real person doing the pose, with credit', async ({ page }) => {
  await page.goto('/poses/child')
  const video = page.locator('.pose-stage video')
  await expect(video).toHaveAttribute('src', '/media/poses/child.mp4')
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(0.5)
  await expect(page.locator('.video-credit')).toContainText('Gezond10')
})

test('a pose without a video keeps its drawing', async ({ page }) => {
  await page.goto('/poses/mountain')
  await expect(page.locator('.pose-stage .figure')).toBeVisible()
  await expect(page.locator('.pose-stage video')).toHaveCount(0)
})

test('the player shows the video and moves it only while practising', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const video = page.locator('.stage-video video')
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)

  await page.getByRole('button', { name: 'Pause' }).click()
  await expect.poll(() => playing(video)).toBe(false)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(video).toHaveCount(0)
  await expect(page.locator('.stage-figure .figure')).toBeVisible()
})
