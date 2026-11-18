import { expect, test } from '@playwright/test'

test('Chrome sees the app as installable', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest.short_name).toBe('still.')
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
})
