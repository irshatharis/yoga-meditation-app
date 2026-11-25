import { expect, test } from '@playwright/test'

test('a setting changed just before the app closes is kept', async ({ page }) => {
  await page.goto('/settings')
  for (const theme of ['Dark', 'Light', 'Dark', 'Light', 'Dark', 'Light']) {
    await page.getByRole('button', { name: theme }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: theme })).toHaveAttribute('aria-pressed', 'true')
  }
})

test('a journal note saved just before the app closes is kept', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T09:00:00') })
  await page.goto('/')
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => {
      const req = indexedDB.open('still')
      req.onsuccess = () => resolve(req.result)
    })
    const tx = db.transaction('logs', 'readwrite')
    const t = new Date('2026-11-18T08:00:00').getTime()
    tx.objectStore('logs').put({ id: 'log-1', practice: 'desk-break', title: 'Desk break', kind: 'yoga', startedAt: t, endedAt: t + 600_000, plannedSec: 600, practicedSec: 600, completed: true })
    await new Promise(resolve => (tx.oncomplete = resolve))
    db.close()
  })
  await page.goto('/journal')
  for (const note of ['first', 'second', 'third', 'fourth']) {
    await page.getByRole('button', { name: /Desk break/ }).click()
    await page.getByPlaceholder('Notes').fill(note)
    await page.getByRole('button', { name: 'Save' }).click()
    await page.reload()
    await expect(page.getByText(note, { exact: true })).toBeVisible()
  }
})

test('the chosen voice is named once the device voices load', async ({ page }) => {
  await page.addInitScript(() => {
    const voices = [
      { name: 'Alice', lang: 'en-GB', voiceURI: 'alice', default: false, localService: true },
      { name: 'Bob', lang: 'en-US', voiceURI: 'bob', default: true, localService: true }
    ]
    let ready = false
    setTimeout(() => {
      ready = true
      speechSynthesis.dispatchEvent(new Event('voiceschanged'))
    }, 300)
    // On the prototype, because WebKit ignores an own property on speechSynthesis.
    Object.defineProperty(SpeechSynthesis.prototype, 'getVoices', { configurable: true, value: () => (ready ? voices : []) })
  })
  await page.goto('/settings')
  await page.getByLabel('Voice', { exact: true }).selectOption('alice')
  await page.reload()
  await expect(page.getByLabel('Voice', { exact: true })).toHaveValue('alice')
  await expect(page.locator('.setting', { has: page.getByLabel('Voice', { exact: true }) }).locator('small')).toHaveText('Alice')
})
