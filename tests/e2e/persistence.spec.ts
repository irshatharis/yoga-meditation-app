import { expect, test, type Page } from '@playwright/test'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const pathLog = (day: string) => {
  const t = new Date(`${day}T08:00:00`).getTime()
  return { id: 'log-path', practice: 'desk-break', title: 'Desk break', kind: 'yoga', startedAt: t, endedAt: t + 600_000, plannedSec: 600, practicedSec: 600, completed: true, path: { id: 'foundations', day: 1 } }
}

async function seedLogs(page: Page, logs: unknown[]) {
  await page.evaluate(async logs => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('still')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('logs', 'readwrite')
    for (const log of logs) tx.objectStore('logs').put(log)
    await new Promise(resolve => (tx.oncomplete = resolve))
    db.close()
  }, logs)
}

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test('a journal note on a path session survives a reload', async ({ page }) => {
  await page.goto('/')
  await seedLogs(page, [pathLog(today())])
  await page.goto('/journal')
  await page.getByRole('button', { name: /Desk break/ }).click()
  await page.getByPlaceholder('Notes').fill('Hips felt open')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByPlaceholder('Notes')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Hips felt open')).toBeVisible()
})

test('undoing a removed session keeps it after a reload', async ({ page }) => {
  await page.goto('/')
  await seedLogs(page, [pathLog(today())])
  await page.goto('/journal')
  await page.getByRole('button', { name: /Desk break/ }).click()
  await page.getByRole('button', { name: 'Remove from journal' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: /Desk break/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Desk break/ })).toBeVisible()
})

test('a second photo on a pose survives a reload', async ({ page }) => {
  await page.goto('/poses/mountain')
  for (let i = 0; i < 2; i++) {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Add photo or video' }).click()])
    await chooser.setFiles({ name: `dot-${i}.png`, mimeType: 'image/png', buffer: png })
    await expect(page.locator('.media-item')).toHaveCount(i + 1)
  }
  await page.reload()
  await expect(page.locator('.media-item')).toHaveCount(2)
})

test('removing a photo frees its storage', async ({ page }) => {
  await page.goto('/poses/mountain')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Add photo or video' }).click()])
  await chooser.setFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('.media-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.locator('.media-item')).toHaveCount(0)
  const blobs = () =>
    page.evaluate(
      () =>
        new Promise<number>(resolve => {
          const req = indexedDB.open('still')
          req.onsuccess = () => {
            const count = req.result.transaction('blobs').objectStore('blobs').count()
            count.onsuccess = () => resolve(count.result)
          }
        })
    )
  await expect.poll(blobs).toBe(0)
})
