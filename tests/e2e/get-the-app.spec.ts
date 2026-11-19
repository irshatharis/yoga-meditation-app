import { expect, test, type Page } from '@playwright/test'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'

const card = (page: Page) => page.getByRole('region', { name: 'Get the app' })

const offerInstall = (page: Page, outcome: 'accepted' | 'dismissed') =>
  page.evaluate(outcome => {
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => void ((window as unknown as { prompted: boolean }).prompted = true),
      userChoice: Promise.resolve({ outcome })
    })
    dispatchEvent(e)
  }, outcome)

test.describe('on an iPhone in Safari', () => {
  test.use({ userAgent: IPHONE_SAFARI })

  test('Today leads to a picture guide for Safari', async ({ page }) => {
    await page.goto('/')
    await card(page).getByRole('link', { name: 'Show me how' }).click()
    await expect(page).toHaveURL(/\/install$/)
    await expect(page.getByRole('button', { name: 'iPhone' })).toHaveAttribute('aria-pressed', 'true')
    const steps = page.locator('.install-step')
    await expect(steps).toHaveCount(6)
    await expect(steps.nth(0)).toContainText('tap the ≡ button')
    await expect(steps.nth(2)).toContainText('View More')
    await expect(steps.nth(3)).toContainText('Add to Home Screen')
    await expect(steps.locator('svg.install-art')).toHaveCount(6)
    await expect(page.getByText('Install before you begin')).toBeVisible()
  })

  test('"Not now" keeps Today clear after a reload, and Settings still offers it', async ({ page }) => {
    await page.goto('/')
    await card(page).getByRole('button', { name: 'Not now' }).click()
    await expect(card(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(card(page)).toHaveCount(0)
    await page.goto('/settings')
    await expect(card(page).getByRole('link', { name: 'Show me how' })).toBeVisible()
  })

  test('another device shows its own steps', async ({ page }) => {
    await page.goto('/install')
    await page.getByRole('button', { name: 'Android' }).click()
    await expect(page.locator('.install-step').first()).toContainText('⋮ menu')
    await expect(page.getByText('Install before you begin')).toHaveCount(0)
  })
})

test('an iPhone in another app is sent to Safari', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0',
    isMobile: true,
    hasTouch: true,
    viewport: { width: 393, height: 852 }
  })
  const page = await context.newPage()
  await page.goto('/install')
  await expect(page.getByText('Open this page in Safari first.')).toBeVisible()
  await expect(page.locator('.install-step').first()).toContainText('In Safari')
  await context.close()
})

test('where the browser can install, one tap opens its dialog and the card goes away', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await offerInstall(page, 'accepted')
  await card(page).getByRole('button', { name: 'Install' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true)
  await expect(card(page)).toHaveCount(0)
})

test('turning the dialog down falls back to the guide', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await offerInstall(page, 'dismissed')
  await card(page).getByRole('button', { name: 'Install' }).click()
  await expect(card(page).getByRole('link', { name: 'Show me how' })).toBeVisible()
})

test('the installed app does not ask to be installed', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(card(page)).toHaveCount(0)
  await page.goto('/install')
  await expect(page.getByText('still. is installed.')).toBeVisible()
})
