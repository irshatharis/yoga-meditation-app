import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('export, erase and import bring everything back', async ({ page }) => {
  await page.goto('/practices/new')
  await page.getByLabel('Title').fill('Round trip flow')
  await page.getByRole('button', { name: 'Rest' }).click()
  await page.getByRole('button', { name: 'Save practice' }).click()
  await expect(page).toHaveURL(/\/practices\/practice-/)

  await page.goto('/settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()])
  const file = await download.path()
  const backup = JSON.parse(await readFile(file, 'utf8'))
  expect(backup.app).toBe('still')
  expect(backup.practices.map((p: { title: string }) => p.title)).toContain('Round trip flow')

  await page.getByRole('button', { name: 'Erase', exact: true }).click()
  await page.getByLabel('Type ERASE to confirm').fill('erase')
  await page.getByRole('button', { name: 'Erase all data' }).click()
  await page.waitForURL('/')
  await page.goto('/practices?kind=mine')
  await expect(page.getByText('Round trip flow')).toHaveCount(0)

  await page.goto('/settings')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import backup' }).click()])
  await chooser.setFiles(file)
  await expect(page.getByText('1 new practice,')).toBeVisible()
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('Imported 1 practice,')

  await page.goto('/practices?kind=mine')
  await expect(page.getByText('Round trip flow')).toBeVisible()
})

test('a share link of a built-in practice opens the copy the friend already has', async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: { url: string }) => void ((window as unknown as { __shared: string }).__shared = d.url) })
  })
  await page.goto('/practices/desk-break')
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await expect.poll(() => page.evaluate(() => (window as unknown as { __shared?: string }).__shared)).toBeTruthy().then(() => page.evaluate(() => (window as unknown as { __shared: string }).__shared))
  expect(url).toContain('/share#')

  const other = await browser.newContext()
  const friend = await other.newPage()
  await friend.goto(new URL(url).pathname + new URL(url).hash)
  await expect(friend.getByText('Someone shared a practice with you')).toBeVisible()
  await expect(friend.getByText('You already have this practice.')).toBeVisible()
  await friend.getByRole('button', { name: 'Open it' }).click()
  await expect(friend).toHaveURL('/practices/desk-break')
  await expect(friend.locator('h1')).toContainText('Desk break')
  await other.close()
})

test('opening the same share link twice adds the practice once', async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: { url: string }) => void ((window as unknown as { __shared: string }).__shared = d.url) })
  })
  await page.goto('/practices/new')
  await page.getByLabel('Title').fill('Shared twice')
  await page.getByRole('button', { name: 'Rest' }).click()
  await page.getByRole('button', { name: 'Save practice' }).click()
  await expect(page).toHaveURL(/\/practices\/practice-/)
  await page.getByRole('button', { name: 'Share' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shared?: string }).__shared)).toBeTruthy()
  const url = new URL(await page.evaluate(() => (window as unknown as { __shared: string }).__shared))

  const other = await browser.newContext()
  const friend = await other.newPage()
  await friend.goto(url.pathname + url.hash)
  await friend.getByRole('button', { name: 'Add to my practices' }).dblclick()
  await expect(friend.locator('h1')).toContainText('Shared twice')
  await friend.goto(url.pathname + url.hash)
  await expect(friend.getByText('You already have this practice.')).toBeVisible()
  await friend.getByRole('button', { name: 'Open it' }).click()
  await expect(friend.locator('h1')).toContainText('Shared twice')
  await friend.goto('/practices?kind=mine')
  await expect(friend.getByText('Shared twice')).toHaveCount(1)
  await other.close()
})

test('an import that runs out of storage says so', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'blobs') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return put.apply(this, args)
    }
  })
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const pose = { id: 'pose-x', name: 'With photo', family: 'standing', level: 'gentle', focus: [], sided: false, summary: '', setup: [], cues: [], cautions: [], figure: null, media: [{ kind: 'image', blob: 'media-x', mime: 'image/png' }], origin: 'mine' }
  const backup = { app: 'still', format: 1, exportedAt: Date.now(), poses: [pose], media: [{ id: 'media-x', mime: 'image/png', name: 'x.png', data: png }] }
  await page.goto('/settings')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import backup' }).click()])
  await chooser.setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('could not be saved')
})
