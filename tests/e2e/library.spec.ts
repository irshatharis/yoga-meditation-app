import { expect, test } from '@playwright/test'

const addLink = async (page: import('@playwright/test').Page, href: string) => {
  await page.getByRole('button', { name: 'Add a link' }).click()
  await page.getByPlaceholder('https://').fill(href)
  await page.getByRole('button', { name: 'Add link' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('edits to a saved practice survive a reload', async ({ page }) => {
  await page.goto('/practices/new')
  await page.getByLabel('Title').fill('Edit me')
  await page.getByRole('button', { name: 'Rest' }).click()
  await page.getByRole('button', { name: 'Save practice' }).click()
  await expect(page).toHaveURL(/\/practices\/practice-/)
  const url = new URL(page.url()).pathname

  await page.goto(`${url}/edit`)
  await page.getByLabel('Title').fill('Edited title')
  await page.getByRole('button', { name: 'Save practice' }).click()
  await expect(page.locator('h1')).toHaveText('Edited title')

  await page.reload()
  await expect(page.locator('h1')).toHaveText('Edited title')
})

test('every link added to a pose survives a reload', async ({ page }) => {
  await page.goto('/poses/new')
  await page.getByLabel('Name', { exact: true }).fill('My pose')
  await page.getByRole('button', { name: 'Save pose' }).click()
  await expect(page).toHaveURL(/\/poses\/pose-/)
  await addLink(page, 'https://example.com/one')
  await addLink(page, 'https://example.com/two')
  await expect(page.locator('.media-link')).toHaveCount(2)

  await page.reload()
  await expect(page.locator('.media-link')).toHaveCount(2)

  await page.goto('/poses/mountain')
  await addLink(page, 'https://example.com/three')
  await addLink(page, 'https://example.com/four')
  await page.reload()
  await expect(page.locator('.media-link')).toHaveCount(2)
})

test('a very long practice name never makes the page scroll sideways', async ({ page }) => {
  const name = 'Morningstretchandbreathe'.repeat(6)
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await page.goto('/practices/new')
  await page.getByLabel('Title').fill(name)
  await page.getByRole('button', { name: 'Rest' }).click()
  await page.getByRole('button', { name: 'Save practice' }).click()
  await expect(page.locator('h1')).toHaveText(name)
  expect(await sideways()).toBe(0)
  await page.goto('/practices?kind=mine')
  await expect(page.getByText(name)).toBeVisible()
  expect(await sideways()).toBe(0)
  await page.goto('/')
  await expect(page.getByText(name)).toBeVisible()
  expect(await sideways()).toBe(0)
})

test('a sheet keeps keyboard focus inside and hands it back when it closes', async ({ page }) => {
  await page.goto('/practices/new')
  const opener = page.getByRole('button', { name: 'Pose', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Add a pose' })
  await expect(sheet.getByRole('button', { name: 'Done' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('a photo that does not fit in storage says so instead of vanishing', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'blobs') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return put.apply(this, args)
    }
  })
  await page.goto('/poses/tree')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Add photo or video' }).click()])
  await chooser.setFiles({ name: 'tree.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') })
  await expect(page.locator('.toast')).toContainText('could not store that file')
})

test('dismissing the share sheet does not copy the link anyway', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] }
    w.__copied = []
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => Promise.reject(new DOMException('Share canceled', 'AbortError')) })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void w.__copied.push(t) } })
  })
  await page.goto('/practices/desk-break')
  await page.getByRole('button', { name: 'Share' }).click()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([])
  await expect(page.locator('.toast')).toHaveCount(0)
})

test('search and filters are still there after looking at a result', async ({ page }) => {
  await page.goto('/practices')
  await page.getByLabel('Search practices').fill('hip')
  await page.getByRole('button', { name: 'Over 25 min' }).click()
  await page.locator('.pcard').first().click()
  await expect(page).toHaveURL(/\/practices\/[a-z-]+$/)
  await page.goBack()
  await expect(page.getByLabel('Search practices')).toHaveValue('hip')
  await expect(page.getByRole('button', { name: 'Over 25 min' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/poses')
  await page.getByRole('button', { name: 'Balance' }).click()
  await page.getByLabel('Search poses').fill('tree')
  await page.locator('.pose-tile').first().click()
  await expect(page).toHaveURL(/\/poses\/tree$/)
  await page.goBack()
  await expect(page.getByLabel('Search poses')).toHaveValue('tree')
  await expect(page.getByRole('button', { name: 'Balance' })).toHaveAttribute('aria-pressed', 'true')
})

test('cancelling a copy of a built-in practice leaves nothing behind', async ({ page }) => {
  await page.goto('/practices')
  await page.goto('/practices/desk-break')
  await page.getByRole('button', { name: 'Make it yours' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Desk break (my version)')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/practices\/desk-break$/)

  await page.goto('/practices?kind=mine')
  await expect(page.getByText('Practices you create or import will show up here.')).toBeVisible()
})

test('cancel and back stay in the app after opening a link straight to a page', async ({ page }) => {
  await page.goto('/practices/new')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/practices$/)

  await page.goto('/poses/new')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/poses$/)

  await page.goto('/poses/tree')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/poses$/)
})
