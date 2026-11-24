// Cuts each pose video in src/content/demos.ts from its YouTube source into
// public/media/poses/<pose>.mp4: trimmed, cropped square around the person, muted.
//   node scripts/pose-videos.mjs           every pose
//   node scripts/pose-videos.mjs child     only the poses named
// Needs ffmpeg and uv (for yt-dlp). Sources are cached outside the repo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEMOS, ENCODING, demoFile } from '../src/content/demos.ts'

const out = fileURLToPath(new URL('../public/media/poses/', import.meta.url))
const stills = fileURLToPath(new URL('../public/media/stills/', import.meta.url))
const cache = join(tmpdir(), 'still-pose-videos')
const wanted = process.argv.slice(2)
mkdirSync(out, { recursive: true })
mkdirSync(stills, { recursive: true })

for (const [pose, demo] of Object.entries(DEMOS)) {
  if (wanted.length && !wanted.includes(pose)) continue
  const dir = join(cache, demo.youtube)
  const source = join(dir, 'source.mp4')
  const url = `https://www.youtube.com/watch?v=${demo.youtube}`
  const ytdlp = (...args) => execFileSync('uvx', ['--from', 'yt-dlp[default]', 'yt-dlp', '-q', '--no-warnings', '--no-playlist', '--js-runtimes', 'node', ...args, url], { encoding: 'utf8' })
  mkdirSync(dir, { recursive: true })
  // Many channels mix CC BY uploads with ones under YouTube's standard licence, so every clip is checked on its own.
  const licenseFile = join(dir, 'license.txt')
  if (!existsSync(licenseFile)) writeFileSync(licenseFile, ytdlp('--skip-download', '--print', 'license').trim())
  const license = readFileSync(licenseFile, 'utf8')
  if (!license.startsWith('Creative Commons Attribution')) throw new Error(`${pose}: ${url} is not CC BY (${license})`)
  if (!existsSync(source) || statSync(source).size === 0) ytdlp('-f', 'bv*[height<=1080][ext=mp4]', '-o', source)
  const [x, y, width, height = width] = demo.crop
  const n = ENCODING.size
  const frame =
    width === height
      ? `crop=${width}:${height}:${x}:${y},scale=${n}:${n}`
      : `crop=${width}:${height}:${x}:${y},split[a][b];[a]scale=${n}:${n}:force_original_aspect_ratio=increase,crop=${n}:${n},boxblur=24[bg];[b]scale=${n}:-2[fg];[bg][fg]overlay=0:(H-h)/2`
  const target = join(out, demoFile(pose))
  // The ffmpeg flags: seek, trim, crop and scale, no audio, H.264 that every phone plays, and the index first so playback starts before the download ends.
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-ss', String(demo.from), '-i', source, '-t', String(demo.to - demo.from),
    '-filter_complex', `${frame},fps=${ENCODING.fps}`,
    '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(ENCODING.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    target
  ], { stdio: 'inherit' })
  const still = join(stills, `${pose}.jpg`)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(demo.still ?? (demo.to - demo.from) * 0.6), '-i', target, '-frames:v', '1', '-vf', 'scale=320:320', '-q:v', '5', still], { stdio: 'inherit' })
  console.log(`${pose}: ${(statSync(target).size / 1024).toFixed(0)} KB, still ${(statSync(still).size / 1024).toFixed(0)} KB`)
}
