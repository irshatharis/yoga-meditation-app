// Renders public/og.jpg, the 1200x630 card that link previews show.
// It photographs the real app, so rerun it after a visual change:
//   npx vite build && npx vite preview --port 4390 &
//   node scripts/og.mjs http://localhost:4390
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const base = process.argv[2] ?? 'http://localhost:4390'
const file = path => new URL(`../${path}`, import.meta.url)
const dataUrl = (buf, type) => `data:${type};base64,${buf.toString('base64')}`

const browser = await chromium.launch()

async function phone(route, act) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-06-03T07:40:00') })
  await page.goto(base + route)
  await page.locator('.boot-copy').waitFor({ state: 'detached' })
  if (act) await act(page)
  await page.waitForTimeout(400)
  const shot = await page.screenshot()
  await context.close()
  return dataUrl(shot, 'image/png')
}

const today = await phone('/')
const player = await phone('/practices/morning-flow', async page => {
  await page.getByRole('button', { name: /^Begin/ }).click()
  const name = page.locator('.player-name')
  for (let i = 0; i < 120 && (await name.textContent()) !== 'Warrior two'; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.clock.runFor(200)
  }
  await page.clock.runFor(14_000)
})

const fraunces = dataUrl(await readFile(file('node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')), 'font/woff2')
const frauncesItalic = dataUrl(await readFile(file('node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2')), 'font/woff2')
const inter = dataUrl(await readFile(file('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')), 'font/woff2')
const mark = dataUrl(await readFile(file('public/icons/icon.svg')), 'image/svg+xml')

const html = `<!doctype html><html><head><style>
@font-face { font-family: Fraunces; src: url(${fraunces}); font-weight: 100 900; }
@font-face { font-family: Fraunces; src: url(${frauncesItalic}); font-weight: 100 900; font-style: italic; }
@font-face { font-family: Inter; src: url(${inter}); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; font-family: Inter; color: #2a241d;
  background: radial-gradient(circle at 78% 42%, #f0d9c6 0, transparent 46%), linear-gradient(160deg, #f8f3ea, #f1e8da); }
.copy { position: absolute; left: 76px; top: 70px; width: 560px; }
.brand { display: flex; align-items: center; gap: 18px; }
.brand img { width: 64px; height: 64px; border-radius: 16px; }
.brand span { font: 500 64px/1 Fraunces; letter-spacing: -1px; }
.brand span b { color: #c0603f; font-weight: 500; }
h1 { margin-top: 54px; font: 400 66px/1.04 Fraunces; letter-spacing: -1.5px; }
h1 em { color: #c0603f; }
p { margin-top: 26px; font-size: 27px; line-height: 1.4; color: #6b5f52; }
.pills { position: absolute; left: 76px; bottom: 66px; display: flex; gap: 12px; }
.pills span { padding: 10px 20px; border-radius: 99px; background: #fffaf2; border: 1px solid #e6d9c6; font-size: 21px; font-weight: 500; }
.phone { position: absolute; width: 300px; border-radius: 44px; padding: 10px; background: #221d18; box-shadow: 0 40px 80px -30px rgba(80, 45, 20, .45), 0 2px 0 #3a332c inset; }
.phone img { display: block; width: 100%; border-radius: 34px; }
.back { left: 680px; top: 92px; transform: rotate(-6deg); opacity: .96; }
.front { left: 862px; top: 52px; transform: rotate(4deg); }
</style></head><body>
<div class="copy">
  <div class="brand"><img src="${mark}"><span>still<b>.</b></span></div>
  <h1>Yoga, breathwork <em>and</em> meditation.</h1>
  <p>Guided practices with clear pose figures. Free, private, and it works offline.</p>
</div>
<div class="pills"><span>No account</span><span>No ads</span><span>Offline</span></div>
<div class="phone back"><img src="${today}"></div>
<div class="phone front"><img src="${player}"></div>
</body></html>`

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await card.setContent(html)
await card.evaluate(() => document.fonts.ready)
// Under 300 KB, or WhatsApp drops the preview image.
await sharp(await card.screenshot()).jpeg({ quality: 86, mozjpeg: true }).toFile(file('public/og.jpg').pathname)
await browser.close()
console.log('wrote public/og.jpg')
