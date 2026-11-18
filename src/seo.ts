import type { Path, Pose, Practice } from './domain/types'

export const SITE_URL = 'https://still.irshath.com'
export const SITE_NAME = 'still.'
export const SITE_TITLE = 'still. Free yoga, breathwork and meditation app'
export const SITE_DESCRIPTION =
  'Guided yoga, breathwork and meditation that works offline. Free, private and ad free, with no account. Clear pose figures, gentle pacing, your own practices and a journal.'

export type PageMeta = { title: string; description: string; index: boolean }

export type Lookup = {
  practice: (id: string) => Practice | undefined
  pose: (id: string) => Pose | undefined
  path: (id: string) => Path | undefined
  minutes: (practice: Practice) => number
}

const KIND_NOUN: Record<Practice['kind'], string> = { yoga: 'yoga practice', meditation: 'guided meditation', breath: 'breathwork practice' }

const page = (title: string, description: string, index = true): PageMeta => ({ title: `${title} | ${SITE_NAME}`, description, index })

const STATIC: Record<string, PageMeta> = {
  '/': { title: SITE_TITLE, description: SITE_DESCRIPTION, index: true },
  '/practices': page(
    'Yoga, meditation and breathwork practices',
    'Guided yoga flows, meditations and breathing exercises for every level. Free, offline and private. Build your own practice from the full pose library.'
  ),
  '/poses': page('Yoga pose library with step by step guides', 'Yoga poses with clear figures, step by step setup, alignment cues, easier options and safety notes. Free and works offline.'),
  '/about': page('About', 'still. is a free, private yoga and meditation app. No account, no ads, no tracking. Everything stays on your device and works offline.'),
  '/journal': page('Journal', SITE_DESCRIPTION, false),
  '/settings': page('Settings', SITE_DESCRIPTION, false),
  '/share': page('Shared practice', 'Someone shared a practice with you on still., the free yoga and meditation app.', false)
}

export function pageMeta(pathname: string, lookup: Lookup): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const known = STATIC[path]
  if (known) return known
  const [, section, id, action] = path.split('/')
  if (section === 'play' && id) {
    const p = lookup.practice(id)
    return page(p ? p.title : 'Practice', SITE_DESCRIPTION, false)
  }
  if (action || id === 'new') return page(section === 'poses' ? 'Pose editor' : 'Practice builder', SITE_DESCRIPTION, false)
  if (section === 'practices' && id) {
    const p = lookup.practice(id)
    if (!p) return notFound()
    const length = p.adjustable ? '' : `${lookup.minutes(p)} minute `
    return page(`${p.title}, a free ${length}${KIND_NOUN[p.kind]}`, `${p.summary} Free, guided and works offline on still.`, p.origin === 'builtin')
  }
  if (section === 'poses' && id) {
    const p = lookup.pose(id)
    if (!p) return notFound()
    const name = p.sanskrit ? `${p.name} pose (${p.sanskrit})` : `${p.name} pose`
    return page(`${name}, how to do it`, `${p.summary} Step by step setup, cues, an easier option and safety notes.`, p.origin === 'builtin')
  }
  if (section === 'paths' && id) {
    const p = lookup.path(id)
    if (!p) return notFound()
    return page(`${p.title}, a ${p.days.length} day ${p.kind === 'breath' ? 'breathwork' : p.kind} program`, `${p.summary} Free and guided, one short practice a day.`)
  }
  return notFound()
}

const notFound = () => page('Page not found', SITE_DESCRIPTION, false)
