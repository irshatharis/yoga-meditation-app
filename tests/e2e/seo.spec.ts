import { expect, test } from '@playwright/test'

test('every public page ships its own title, description and share card without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/practices/morning-flow')
  await expect(page).toHaveTitle(/^Morning flow, a free \d+ minute yoga practice \| still\.$/)
  await expect(page.locator('h1')).toHaveText('Morning flow')
  await expect(page.locator('main li').first()).toContainText('Child')
  const meta = (selector: string) => page.locator(selector).getAttribute('content')
  expect(await meta('meta[name="description"]')).toContain('gentle full-body morning')
  expect(await meta('meta[property="og:url"]')).toBe('https://still.irshath.com/practices/morning-flow')
  expect(await meta('meta[property="og:image"]')).toBe('https://still.irshath.com/og.jpg')
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://still.irshath.com/practices/morning-flow')

  await page.goto('/poses/warrior-2')
  await expect(page).toHaveTitle('Warrior two pose (Virabhadrasana II), how to do it | still.')
  await context.close()

  const og = await fetch(new URL('/og.jpg', baseURL)).then(r => r.headers.get('content-type'))
  expect(og).toBe('image/jpeg')
  const sitemap = await fetch(new URL('/sitemap.xml', baseURL)).then(r => r.text())
  expect(sitemap).toContain('<loc>https://still.irshath.com/poses/warrior-2</loc>')
  expect(sitemap).not.toContain('/journal')
  const robots = await fetch(new URL('/robots.txt', baseURL)).then(r => r.text())
  expect(robots).toContain('Sitemap: https://still.irshath.com/sitemap.xml')
})

test('the app keeps the title in step with the route and hides private pages from search', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('still. Free yoga, breathwork and meditation app')
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await page.goto('/journal')
  await expect(page).toHaveTitle('Journal | still.')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await page.locator('a[href="/poses"]').first().click()
  await expect(page).toHaveTitle('Yoga pose library with step by step guides | still.')
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://still.irshath.com/poses')
  await expect(page.locator('.boot-copy')).toHaveCount(0)
})

test('opening the app never interrupts with an offline notice', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __toasts: string[] }
    w.__toasts = []
    new MutationObserver(() => {
      const text = document.querySelector('.toast span')?.textContent
      if (text && !w.__toasts.includes(text)) w.__toasts.push(text)
    }).observe(document, { subtree: true, childList: true })
  })
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts)).toEqual([])
})
