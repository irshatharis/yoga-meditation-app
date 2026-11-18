import type { Page } from '@playwright/test'

// Records wake lock calls so tests can assert the screen is held awake.
export async function stubWakeLock(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __wake: string[] }
    w.__wake = []
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async (type: string) => {
          w.__wake.push(`request:${type}`)
          const sentinel = {
            released: false,
            async release() {
              sentinel.released = true
              w.__wake.push('release')
            },
            addEventListener() {},
            removeEventListener() {}
          }
          return sentinel
        }
      }
    })
  })
}

export const wakeLog = (page: Page) => page.evaluate(() => (window as unknown as { __wake: string[] }).__wake)

export const secondsLeft = async (page: Page) => {
  const text = (await page.locator('.player-foot .tabular').last().textContent()) ?? ''
  const parts = text.replace(' left', '').split(':').map(Number)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}
