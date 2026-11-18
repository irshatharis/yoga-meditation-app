// Renders every PWA and Apple icon size from public/icons/icon.svg.
// Run with `node scripts/icons.mjs` after changing the source SVG.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url))
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname

const sizes = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1],
  // Maskable icons need their mark inside the central 80% safe zone.
  ['maskable-512.png', 512, 0.78],
  ['maskable-192.png', 192, 0.78]
]

for (const [name, size, scale] of sizes) {
  const inner = Math.round(size * scale)
  const mark = await sharp(svg).resize(inner, inner).png().toBuffer()
  const pad = Math.round((size - inner) / 2)
  await sharp({ create: { width: size, height: size, channels: 4, background: '#b85a3c' } })
    .composite([{ input: mark, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(out(name))
  console.log('wrote', name)
}
