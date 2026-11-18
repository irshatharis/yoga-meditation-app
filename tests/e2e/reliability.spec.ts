import { expect, test, type Page } from '@playwright/test'
import { fakeSpeech, spoken, stubWakeLock } from './helpers'

// Records every spoken line with its voice, and every lock-screen handler the page registers.
async function watch(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __lines: { text: string; voice: string }[]; __handlers: string[] }
    w.__lines = []
    w.__handlers = []
    const speak = SpeechSynthesis.prototype.speak
    SpeechSynthesis.prototype.speak = function (this: SpeechSynthesis, u: SpeechSynthesisUtterance) {
      if (u.text.trim()) w.__lines.push({ text: u.text, voice: u.voice?.name ?? '' })
      speak.call(this, u)
    }
    if ('mediaSession' in navigator) {
      const set = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession)
      navigator.mediaSession.setActionHandler = (action, handler) => {
        if (handler) w.__handlers.push(action)
        set(action, handler)
      }
    }
  })
}
const lines = (page: Page) => page.evaluate(() => (window as unknown as { __lines: { text: string; voice: string }[] }).__lines)

test.beforeEach(async ({ page }) => {
  await stubWakeLock(page)
  await watch(page)
  await page.clock.install()
})

test('each tap on Next moves on exactly one step, however fast', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  const count = page.locator('.player-title small')
  await expect(count).toContainText(/^1 of (\d+)/)
  const of = Number((await count.textContent())!.match(/of (\d+)/)![1])
  const next = page.getByRole('button', { name: 'Next', exact: true })
  // A two-sided pose is two steps with the same name, so the side counts too.
  const shown = async () => `${await page.locator('.player-name').textContent()} ${await page.locator('.player-info .eyebrow').textContent()} ${(await page.locator('.side-label').allTextContents()).join('')}`
  const titles = [await shown()]
  for (let i = 2; i <= 6; i++) {
    await next.click()
    await expect(count).toContainText(`${i} of ${of}`)
    titles.push(await shown())
  }
  for (let i = 1; i < titles.length; i++) expect(titles[i], `step ${i + 1} shows a new pose`).not.toBe(titles[i - 1])
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(count).toContainText(`5 of ${of}`)
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('the skip buttons are big enough to hit without looking', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  for (const name of ['Previous', 'Next']) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
    expect(Math.min(box.width, box.height), name).toBeGreaterThanOrEqual(52)
  }
})

test('the voice says each line once, in one voice, through quick skipping', async ({ page }) => {
  await fakeSpeech(page)
  await page.goto('/practices/morning-flow')
  // Page time stands still between taps, so Previous lands by the step rule, not by how slow the run was.
  await page.clock.pauseAt(Date.now() + 1_000)
  await page.getByRole('button', { name: /^Begin/ }).click()
  const next = page.getByRole('button', { name: 'Next', exact: true })
  for (let i = 0; i < 4; i++) await next.click()
  await page.getByRole('button', { name: 'Previous' }).click()
  await page.clock.runFor(40_000)
  const said = await spoken(page)
  expect(said[0]!.text).toBe('First, Child')
  expect(said.slice(-2).map(l => l.text), 'the step landed on is announced in full').toEqual(['Next, Warrior two.', 'Right side'])
  expect(said.filter(l => l.overlap), 'a line started while another was still being said').toEqual([])
  expect(new Set(said.map(l => l.voice))).toEqual(new Set(['Samantha']))
  for (let i = 1; i < said.length; i++) expect(said[i]!.text, 'no line is said twice in a row').not.toBe(said[i - 1]!.text)
})

test('speaks pose names, not instructions, unless asked to', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(60_000)
  const said = (await lines(page)).map(l => l.text).join(' | ')
  expect(said).toContain('First, Child')
  expect(said).not.toContain('Kneel')
})

test('only a tap pauses the practice', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  for (let i = 0; i < 6; i++) {
    await page.clock.runFor(30_000)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  }
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __handlers: string[] }).__handlers)).toEqual([])
})
