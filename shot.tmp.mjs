import { chromium } from '@playwright/test'
const [url, out, w = '960', h = '800'] = process.argv.slice(2)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const logs = []; p.on('console', m => { if (m.type() !== 'debug') logs.push(m.type()+': '+m.text()) }); p.on('pageerror', e => logs.push('ERR '+e.message))
await p.goto(url); await p.waitForTimeout(1500)
await p.screenshot({ path: out, fullPage: true })
console.log(logs.join('\n').slice(0, 3000))
await b.close()
