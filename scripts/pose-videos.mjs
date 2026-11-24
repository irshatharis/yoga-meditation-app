// Cuts each pose video in src/content/demos.ts from its YouTube source into
// public/media/poses/<pose>.mp4: trimmed, cropped square around the person, muted.
//   node scripts/pose-videos.mjs           every pose
//   node scripts/pose-videos.mjs child     only the poses named
// Needs ffmpeg and uv (for yt-dlp). Sources are cached outside the repo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEMOS, ENCODING, demoFile } from '../src/content/demos.ts'

const out = fileURLToPath(new URL('../public/media/poses/', import.meta.url))
const cache = join(tmpdir(), 'still-pose-videos')
const wanted = process.argv.slice(2)
mkdirSync(out, { recursive: true })

for (const [pose, demo] of Object.entries(DEMOS)) {
  if (wanted.length && !wanted.includes(pose)) continue
  const dir = join(cache, demo.youtube)
  const source = join(dir, 'source.mp4')
  if (!existsSync(source)) {
    mkdirSync(dir, { recursive: true })
    execFileSync('uvx', ['yt-dlp', '-q', '--no-playlist', '-f', 'bv*[height<=1080][ext=mp4]', '-o', source, `https://www.youtube.com/watch?v=${demo.youtube}`], { stdio: 'inherit' })
  }
  const [x, y, size] = demo.crop
  const target = join(out, demoFile(pose))
  // The ffmpeg flags: seek, trim, crop and scale, no audio, H.264 that every phone plays, and the index first so playback starts before the download ends.
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-ss', String(demo.from), '-i', source, '-t', String(demo.to - demo.from),
    '-vf', `crop=${size}:${size}:${x}:${y},scale=${ENCODING.size}:${ENCODING.size},fps=${ENCODING.fps}`,
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(ENCODING.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    target
  ], { stdio: 'inherit' })
  console.log(`${pose}: ${(statSync(target).size / 1024).toFixed(0)} KB`)
}
