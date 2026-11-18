import { expect, test } from '@playwright/test'

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
    Object.defineProperty(speechSynthesis, 'getVoices', { configurable: true, value: () => (ready ? voices : []) })
  })
  await page.goto('/settings')
  await page.getByLabel('Voice', { exact: true }).selectOption('alice')
  await page.reload()
  await expect(page.getByLabel('Voice', { exact: true })).toHaveValue('alice')
  await expect(page.locator('.setting', { has: page.getByLabel('Voice', { exact: true }) }).locator('small')).toHaveText('Alice')
})
