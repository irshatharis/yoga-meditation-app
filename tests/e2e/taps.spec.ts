import { expect, test, type Page } from '@playwright/test'
import { stubWakeLock } from './helpers'

test.beforeEach(async ({ page }) => {
  await stubWakeLock(page)
  await page.clock.install()
})

const endPractice = async (page: Page) => {
  await page.getByRole('button', { name: 'End practice' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'End practice' }).click()
}

test('ending a practice in its first minute does not offer to resume it', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  await page.clock.runFor(20_000)
  await endPractice(page)
  await expect(page).toHaveURL(/\/practices\/morning-flow$/)

  await page.locator('.tabbar').getByRole('link', { name: 'Today' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Resume Morning flow')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Resume Morning flow')).toHaveCount(0)
})

for (const link of ['Save to journal', 'Done']) {
  test(`going back after "${link}" on a finished practice does not start it again`, async ({ page }) => {
    await page.goto('/practices/box-breathing')
    await page.getByRole('button', { name: /^Begin/ }).click()
    await page.clock.runFor(90_000)
    await endPractice(page)
    await page.getByRole('link', { name: link }).click()
    await expect(page).not.toHaveURL(/\/play\//)

    await page.goBack()
    await expect(page).toHaveURL(/\/practices\/box-breathing$/)
    await expect(page.getByRole('button', { name: /^Begin/ })).toBeVisible()
  })
}

test('a quick double tap on Save makes one practice', async ({ page }) => {
  await page.goto('/practices/new')
  await page.getByLabel('Title').fill('Only once')
  await page.getByRole('button', { name: 'Rest' }).click()
  await page.getByRole('button', { name: 'Save practice' }).dblclick()
  await expect(page).toHaveURL(/\/practices\/practice-/)

  await page.locator('.tabbar').getByRole('link', { name: 'Practices' }).click()
  await page.getByRole('button', { name: 'Mine' }).click()
  await expect(page.locator('.pcard')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.pcard')).toHaveCount(1)
})

test('a quick double tap on Save makes one pose', async ({ page }) => {
  await page.goto('/poses/new')
  await page.getByLabel('Name', { exact: true }).fill('Only once')
  await page.getByRole('button', { name: 'Save pose' }).dblclick()
  await expect(page).toHaveURL(/\/poses\/pose-/)

  await page.locator('.tabbar').getByRole('link', { name: 'Poses' }).click()
  await page.getByRole('button', { name: 'Mine' }).click()
  await expect(page.locator('.pose-tile')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.pose-tile')).toHaveCount(1)
})

test('Back in settings stays in the app after opening settings straight from a link', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/localhost:4173\/$/)
})

// A fingertip covers about 44 by 44 CSS pixels. A tap anywhere in that square,
// centred on a control, should land on the control. Controls scrolled off screen,
// under the tab bar or past the edge of a sideways scrolling row are left out.
async function missedTaps(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(els => {
    const bottom = document.querySelector('.tabbar')?.getBoundingClientRect().top ?? innerHeight
    return els.flatMap(el => {
      const b = el.getBoundingClientRect()
      const cx = b.left + b.width / 2
      const cy = b.top + b.height / 2
      if (!b.width || cy - 22 < 0 || cy + 22 > bottom || cx - 22 < 0 || cx + 22 > innerWidth) return []
      const row = el.parentElement!.getBoundingClientRect()
      if (b.left < row.left || b.right > row.right) return []
      const points = [
        [cx, cy - 21],
        [cx, cy + 21],
        [cx - 21, cy],
        [cx + 21, cy]
      ]
      const missed = points.filter(([x, y]) => !el.contains(document.elementFromPoint(x!, y!)))
      return missed.length ? [`${el.getAttribute('aria-label') ?? el.textContent?.trim()} (${Math.round(b.width)}x${Math.round(b.height)})`] : []
    })
  })
}

const CONTROLS = '.chip, .segmented button, .switch, .stepper button, .btn.small, .pill, .media-remove, input[type="range"]'

for (const path of ['/practices', '/practices/morning-flow', '/practices/body-scan', '/poses', '/settings', '/practices/new?from=morning-flow', '/poses/new']) {
  test(`every small control on ${path} can be hit with a fingertip`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator(CONTROLS).first()).toBeVisible()
    const missed: string[] = []
    for (let y = 0; ; y += 200) {
      await page.evaluate(top => scrollTo(0, top), y)
      missed.push(...(await missedTaps(page, CONTROLS)))
      if (await page.evaluate(top => scrollY < top, y)) break
    }
    expect([...new Set(missed)]).toEqual([])
  })
}

test('+15 s in the player can be hit with a fingertip', async ({ page }) => {
  await page.goto('/practices/morning-flow')
  await page.getByRole('button', { name: /^Begin/ }).click()
  expect(await missedTaps(page, '.pill')).toEqual([])
})
