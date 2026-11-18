import type { OutputAsset } from 'rollup'
import type { Plugin } from 'vite'
import { PATHS } from '../src/content/paths'
import { POSES } from '../src/content/poses'
import { PRACTICES } from '../src/content/practices'
import { estimateSec } from '../src/domain/timeline'
import { DEFAULT_SETTINGS, type Practice, type PracticeItem } from '../src/domain/types'
import { pageMeta, SITE_URL, type Lookup, type PageMeta } from '../src/seo'

// Crawlers and link previews do not run JavaScript, so every public route gets
// its own HTML file with the right title, description, share card and a plain
// text version of the page. The app replaces that text as soon as it boots.

const library = new Map(POSES.map(p => [p.id, p]))
const lookup: Lookup = {
  practice: id => PRACTICES.find(p => p.id === id),
  pose: id => library.get(id as never),
  path: id => PATHS.find(p => p.id === id),
  minutes: p => Math.max(1, Math.round(estimateSec(p, library, DEFAULT_SETTINGS) / 60))
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const link = (href: string, text: string) => `<a href="${href}">${esc(text)}</a>`
const list = (tag: 'ul' | 'ol', items: string[]) => (items.length ? `<${tag}>${items.map(i => `<li>${i}</li>`).join('')}</${tag}>` : '')
const para = (text?: string) => (text ? `<p>${esc(text)}</p>` : '')

const poseName = (id: string) => library.get(id as never)?.name ?? id

function itemLine(item: PracticeItem): string {
  switch (item.type) {
    case 'pose':
      return `${link(`/poses/${item.pose}`, poseName(item.pose))}, ${item.holdSec} seconds${library.get(item.pose)?.sided ? ' each side' : ''}`
    case 'flow':
      return `${esc(item.title)}, ${item.rounds} ${item.rounds === 1 ? 'round' : 'rounds'}: ${item.steps.map(s => link(`/poses/${s.pose}`, poseName(s.pose))).join(', ')}`
    case 'sit':
    case 'rest':
      return `${esc(item.title)}, ${Math.round(item.durationSec / 60) || 1} min`
    case 'breath':
      return `${esc(item.title)}, ${item.cycles} breaths`
  }
}

const practiceBody = (p: Practice) =>
  para(p.summary) + para(p.description) + '<h2>What you will do</h2>' + list('ol', p.items.map(itemLine)) + `<p>${link(`/play/${p.id}`, 'Start this practice')}</p>`

type Page = { path: string; heading: string; body: string }

function pages(): Page[] {
  const home: Page = {
    path: '/',
    heading: 'still. Yoga, breathwork and meditation',
    body:
      para('A free, quiet place to practice. Guided yoga flows with clear pose figures, breathwork with a gentle pacer and meditations from three minutes up. No account, no ads and no tracking. Everything stays on your device and works offline.') +
      '<h2>Programs</h2>' +
      list('ul', PATHS.map(p => `${link(`/paths/${p.id}`, p.title)}. ${esc(p.summary)}`)) +
      `<p>${link('/practices', 'All practices')} · ${link('/poses', 'Pose library')} · ${link('/about', 'About')}</p>`
  }
  const index: Page[] = [
    home,
    { path: '/practices', heading: 'Practices', body: list('ul', PRACTICES.map(p => `${link(`/practices/${p.id}`, p.title)}. ${esc(p.summary)}`)) },
    { path: '/poses', heading: 'Pose library', body: list('ul', POSES.map(p => `${link(`/poses/${p.id}`, p.name)}${p.sanskrit ? ` (${esc(p.sanskrit)})` : ''}. ${esc(p.summary)}`)) },
    {
      path: '/about',
      heading: 'About still.',
      body: para('still. is a free app for yoga, breathwork and meditation. There is no account, no ads and no tracking. Your practices, journal and settings live only on your device, and you can export them at any time. The whole app works offline once it has loaded, and you can add it to your home screen.')
    }
  ]
  const practices = PRACTICES.map(p => ({ path: `/practices/${p.id}`, heading: p.title, body: practiceBody(p) }))
  const poses = POSES.map(p => ({
    path: `/poses/${p.id}`,
    heading: p.sanskrit ? `${p.name} (${p.sanskrit})` : p.name,
    body:
      para(p.summary) +
      '<h2>How to do it</h2>' +
      list('ol', p.setup.map(esc)) +
      '<h2>Cues</h2>' +
      list('ul', p.cues.map(esc)) +
      (p.easier ? `<h2>Easier option</h2>${para(p.easier)}` : '') +
      (p.cautions.length ? `<h2>Take care</h2>${list('ul', p.cautions.map(esc))}` : '')
  }))
  const paths = PATHS.map(p => ({
    path: `/paths/${p.id}`,
    heading: p.title,
    body: para(p.summary) + list('ol', p.days.map(d => `${link(`/practices/${d.practice}`, lookup.practice(d.practice)?.title ?? d.practice)}. ${esc(d.note)}`))
  }))
  return [...index, ...practices, ...poses, ...paths]
}

function setTag(html: string, pattern: RegExp, value: string) {
  if (!pattern.test(html)) throw new Error(`seo: index.html is missing ${pattern}`)
  return html.replace(pattern, (_, open: string, close: string) => `${open}${esc(value)}${close}`)
}

function render(shell: string, page: Page, meta: PageMeta) {
  const url = SITE_URL + (page.path === '/' ? '/' : page.path)
  let html = shell
  html = setTag(html, /(<title>)[^<]*(<\/title>)/, meta.title)
  for (const [attr, key, value] of [
    ['name', 'description', meta.description],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', url],
    ['name', 'twitter:title', meta.title],
    ['name', 'twitter:description', meta.description]
  ] as const)
    html = setTag(html, new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), value)
  html = setTag(html, /(<link rel="canonical" href=")[^"]*(")/, url)
  return html.replace('<div id="root">', `<div id="root"><main class="boot-copy"><h1>${esc(page.heading)}</h1>${page.body}</main>`)
}

export function seo(): Plugin {
  return {
    name: 'still:seo',
    apply: 'build',
    enforce: 'post',
    applyToEnvironment: env => env.name === 'client',
    generateBundle(_, bundle) {
      const shell = bundle['index.html'] as OutputAsset | undefined
      if (!shell) throw new Error('seo: no index.html in the bundle')
      const source = String(shell.source)
      const all = pages()
      const urls: string[] = []
      for (const page of all) {
        const meta = pageMeta(page.path, lookup)
        if (!meta.index) throw new Error(`seo: ${page.path} is not indexable`)
        const html = render(source, page, meta)
        if (page.path === '/') shell.source = html
        else this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}.html`, source: html })
        urls.push(SITE_URL + page.path)
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
      })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` })
    }
  }
}
