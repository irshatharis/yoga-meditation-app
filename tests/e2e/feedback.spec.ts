import { expect, test } from '@playwright/test'

const source = 'https://github.com/irshatharis/yoga-meditation-app'

for (const route of ['/about', '/settings']) {
  test(`${route} lets people email feedback and find the source`, async ({ page }) => {
    await page.goto(route)
    const mail = page.locator('a[href^="mailto:irshatharis@gmail.com?subject=still.%20feedback"]').first()
    await expect(mail).toBeVisible()
    await expect(page.locator(`a[href="${source}"]`).first()).toBeAttached()
  })
}

test('the home screen points to feedback and the source', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Feedback' }).click()
  await expect(page.locator('#feedback')).toBeInViewport()
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Open source' })).toHaveAttribute('href', source)
})
