import { readFile } from 'node:fs/promises'
import { expect, test, type Locator, type Page } from '@playwright/test'

const playing = (video: Locator) => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2)
const time = (video: Locator) => video.evaluate((v: HTMLVideoElement) => v.currentTime)

test('a pose page shows a real person doing the pose, with credit', async ({ page }) => {
  await page.goto('/poses/child')
  const video = page.locator('.pose-stage video')
  await expect(video).toHaveAttribute('src', /^\/media\/poses\/child\.mp4\?v=/)
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(0.5)
  await expect(page.locator('.video-credit')).toContainText('Gezond10')
})

test('pose lists show a photo of the pose', async ({ page }) => {
  await page.goto('/poses')
  const still = page.locator('.pose-tile', { hasText: 'Child' }).locator('img.pose-still')
  await expect(still).toHaveAttribute('src', '/media/stills/child.jpg')
  await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(320)
})

test('a pose without a video keeps its drawing', async ({ page }) => {
  await page.goto('/poses/new')
  await page.getByLabel('Name', { exact: true }).fill('Drawn only')
  await page.getByLabel('Looks like').selectOption({ label: 'Looks like Tree' })
  await page.getByRole('button', { name: 'Save pose' }).click()
  await expect(page).toHaveURL(/\/poses\/pose-/)
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
  await expect(page.locator('.stage-video video[src*="/child.mp4"]')).toHaveCount(0)
  await expect(page.locator('.stage-video video, .stage-figure .figure').first()).toBeVisible()
})

const clip = () => readFile('public/media/poses/child.mp4')

test('a new pose plays the video it was given', async ({ page }) => {
  await page.goto('/poses/new')
  await page.getByLabel('Name', { exact: true }).fill('My flow')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: /Add a video of the pose/ }).click()])
  await chooser.setFiles({ name: 'me.mp4', mimeType: 'video/mp4', buffer: await clip() })
  await expect.poll(() => time(page.locator('.pose-stage video')), { timeout: 5_000 }).toBeGreaterThan(0.5)
  await page.getByRole('button', { name: 'Save pose' }).click()

  await expect(page).toHaveURL(/\/poses\/pose-/)
  await page.reload()
  const video = page.locator('.pose-stage video')
  await expect(video).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(0.5)
})

test('a video added to a pose plays in its place during practice', async ({ page }) => {
  await page.goto('/poses/child')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Add photo or video' }).click()])
  await chooser.setFiles({ name: 'me.mp4', mimeType: 'video/mp4', buffer: await clip() })
  await expect(page.locator('.pose-stage video')).toHaveAttribute('src', /^blob:/)
  await expect(page.locator('.video-credit')).toHaveCount(0)

  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const video = page.locator('.stage-video video')
  await expect(video).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)
})

test('the server answers the byte ranges an iPhone asks a video for', async ({ request }) => {
  const first = await request.get('/media/poses/child.mp4', { headers: { Range: 'bytes=0-1' } })
  expect(first.status()).toBe(206)
  expect(first.headers()['content-range']).toMatch(/^bytes 0-1\/\d+$/)
  expect((await first.body()).length).toBe(2)
  const size = Number(first.headers()['content-range']!.split('/')[1])
  const tail = await request.get('/media/poses/child.mp4', { headers: { Range: `bytes=${size - 10}-` } })
  expect(tail.status()).toBe(206)
  expect((await tail.body()).length).toBe(10)
})

// An iPhone, in Low Power Mode for one, lets a video start without a tap only
// if that same element was once started from a tap.
async function iphonePlayRules(page: Page) {
  await page.addInitScript(() => {
    let tapping = false
    // The tap lasts until the task that handled it is over.
    const after = new MessageChannel()
    after.port1.onmessage = () => (tapping = false)
    for (const type of ['click', 'keydown'])
      addEventListener(
        type,
        () => {
          tapping = true
          after.port2.postMessage(null)
        },
        true
      )
    const allowed = new WeakSet<HTMLMediaElement>()
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (tapping) allowed.add(this)
      if (!allowed.has(this)) return Promise.reject(new DOMException('A tap is needed to play this video.', 'NotAllowedError'))
      return play.call(this)
    }
  })
}

test('each pose plays its video when the practice moves on by itself, as an iPhone allows', async ({ page }) => {
  await iphonePlayRules(page)
  await page.clock.install()
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const video = page.locator('.stage-video video')
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)
  const first = await video.getAttribute('src')
  for (let i = 0; i < 60 && (await video.getAttribute('src')) === first; i++) await page.clock.fastForward(1_000)
  expect(await video.getAttribute('src')).not.toBe(first)
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)
  const at = await time(video)
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(at + 0.5)
})

test('a skipped-to pose plays its video, and shows its photo while the clip loads', async ({ page }) => {
  await iphonePlayRules(page)
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const video = page.locator('.stage-video video')
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(video).toHaveAttribute('src', /^\/media\/poses\/.+\.mp4\?v=/)
  const pose = (await video.getAttribute('src'))!.match(/poses\/(.+)\.mp4/)![1]
  expect(await video.evaluate(v => getComputedStyle(v).backgroundImage)).toContain(`/media/stills/${pose}.jpg`)
  await expect.poll(() => playing(video), { timeout: 5_000 }).toBe(true)
  const at = await time(video)
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(at + 0.5)
})

test('a pose page shows the photo and plays on a tap when the phone will not autoplay', async ({ page }) => {
  await iphonePlayRules(page)
  await page.addInitScript(() => {
    // Low Power Mode: a video that starts by itself, not through play(), is stopped.
    const asked = new WeakSet<EventTarget>()
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      asked.add(this)
      return play.call(this)
    }
    addEventListener('play', e => e.target instanceof HTMLMediaElement && !asked.has(e.target) && e.target.pause(), true)
  })
  await page.goto('/poses/child')
  const video = page.locator('.pose-stage video')
  await expect(video).toHaveAttribute('src', /child\.mp4/)
  expect(await video.evaluate(v => getComputedStyle(v).backgroundImage)).toContain('/media/stills/child.jpg')
  await page.waitForTimeout(1_000)
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused), 'nothing plays before the tap').toBe(true)
  await video.click()
  await expect.poll(() => time(video), { timeout: 5_000 }).toBeGreaterThan(0.5)
})
