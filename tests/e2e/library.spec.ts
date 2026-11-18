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
