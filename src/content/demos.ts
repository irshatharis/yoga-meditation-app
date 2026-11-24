import type { BlobId, Pose, Side } from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

// Real people showing each pose, cut from yoga videos released under CC BY.
// `node scripts/pose-videos.mjs` downloads, trims and crops each one into
// public/media/poses from the cut written here, and
// `uv run --with ultralytics scripts/frame-person.py` finds the crop.
export const SOURCES = {
  gezond10: { by: 'Gezond10', url: 'https://www.youtube.com/@Gezond10Nl' },
  yogaes: { by: 'Yogaes', url: 'https://www.youtube.com/channel/UCk3ZDhpeSQ75WXiT1VtX-iA' }
} as const satisfies Record<string, { by: string; url: string }>

export type SourceId = keyof typeof SOURCES

export const LICENSE = { name: 'CC BY', url: 'https://creativecommons.org/licenses/by/4.0/' }

export type Demo = {
  source: SourceId
  youtube: string
  title: string
  // Seconds of the source to keep.
  from: number
  to: number
  // Left, top and side of a square around the person in the source frame. A
  // pose too wide for a square gives a width and height instead, and the clip
  // shows that whole box over a blurred copy of itself.
  crop: [x: number, y: number, size: number] | [x: number, y: number, width: number, height: number]
  // The side the clip shows, for sided poses. The other side plays mirrored.
  shows?: Side
  // Seconds into the cut clip for the still photo in lists. Defaults to 60% through, when the pose is usually held.
  still?: number
}

// Changing how clips are encoded changes every file, so it is part of each file's address.
export const ENCODING = { size: 720, crf: 28, fps: 30 }

export const DEMOS: Partial<Record<BuiltinPoseId, Demo>> = {
  boat: { source: 'gezond10', youtube: 'c9lGlqQIR6c', title: 'Boat Pose (Paripurna Navasana)', from: 6.5, to: 17.5, crop: [514, 304, 776] },
  bow: { source: 'yogaes', youtube: 'VC8kakVj_0E', title: 'El arco - Dhanurasana', from: 14.5, to: 44.5, crop: [0, 0, 1920, 1080] },
  bridge: { source: 'gezond10', youtube: 'YgR3qwX-XHI', title: 'Bridge Pose (Setu Bandha Sarvangasana)', from: 6.5, to: 29.5, crop: [233, 34, 1046] },
  camel: { source: 'gezond10', youtube: 'o6O_k47VV_0', title: 'Camel Pose (Ustrasana)', from: 6.5, to: 35.5, crop: [497, 272, 704] },
  cat: { source: 'gezond10', youtube: '6v0voosGm-A', title: 'Cat pose (Marjaryasana)', from: 6.5, to: 21.5, crop: [488, 458, 536] },
  chair: { source: 'yogaes', youtube: 'iAclKRoyOjU', title: 'Chair Pose - Utkatasana', from: 15.5, to: 45.5, crop: [394, 0, 1080] },
  chaturanga: { source: 'yogaes', youtube: '4KwZBU3zv6o', title: 'Baston cuatro apoyos - Chaturanga Dandasana', from: 31, to: 56, crop: [310, 260, 1400, 788] },
  child: { source: 'gezond10', youtube: '34VqmhcuKHI', title: 'Child pose (Balasana)', from: 6.1, to: 32.2, crop: [399, 284, 796] },
  cobra: { source: 'gezond10', youtube: 'aOGo_PmQcII', title: 'Cobra (Bhujangasana)', from: 6.5, to: 25.5, crop: [250, 60, 1000] },
  corpse: { source: 'gezond10', youtube: '0RdsNOYzqd4', title: 'Corpse Pose (Savasana)', from: 12.5, to: 32.5, crop: [212, 4, 1076] },
  dancer: { source: 'gezond10', youtube: 'q9C-6eq4gJs', title: 'Dancer (Natarajasana)', from: 6.5, to: 20.5, crop: [224, 0, 1080] },
  'downward-dog': { source: 'gezond10', youtube: 'fdhpObFKZfg', title: 'Downward Dog (Adho Mukha Svanasana)', from: 7.5, to: 30.5, crop: [275, 70, 1010] },
  eagle: { source: 'gezond10', youtube: 'H7c5T8L1wEE', title: 'Eagle Pose Right (Garudasana)', from: 6.5, to: 31.5, crop: [339, 43, 962] },
  'extended-side-angle': { source: 'gezond10', youtube: '-KBQ5eD78qg', title: 'Extended Side Angle (Utthita Parsvakonasana)', from: 6.5, to: 33.5, crop: [283, 0, 1080] },
  fish: { source: 'yogaes', youtube: 'BAhOz-b_dEc', title: 'Fish Pose - Matsyasana', from: 37.5, to: 58.5, crop: [0, 0, 1920, 1080] },
  garland: { source: 'gezond10', youtube: '--qnzZEZ_Lc', title: 'Garland pose (Malasana)', from: 6.5, to: 33.5, crop: [378, 46, 936] },
  gate: { source: 'yogaes', youtube: 'Apk_gVJ1QEo', title: 'El cerrojo - Parighasana', from: 14.5, to: 44.5, crop: [203, 0, 1564, 1080], shows: 'left' },
  'happy-baby': { source: 'gezond10', youtube: '1E0izixrU3A', title: 'Happy Baby pose (Ananda Balasana)', from: 6.5, to: 34.5, crop: [213, 2, 1078] },
  hero: { source: 'yogaes', youtube: 'GUO8s4d1slA', title: 'Reclined Hero Pose - Supta Virasana', from: 14, to: 21, crop: [814, 17, 1020] },
  locust: { source: 'gezond10', youtube: '2JHx1UmUw6c', title: 'Locust pose (Salabhasana)', from: 6.5, to: 21.5, crop: [290, 90, 990] },
  pigeon: { source: 'gezond10', youtube: 'NnB3aC_yiOQ', title: 'Pigeon Pose', from: 6.5, to: 35.5, crop: [358, 108, 972] },
  plank: { source: 'yogaes', youtube: '4KwZBU3zv6o', title: 'Baston cuatro apoyos - Chaturanga Dandasana', from: 23, to: 31, crop: [310, 260, 1400, 788] },
  'reclined-bound-angle': { source: 'gezond10', youtube: '_50E7eC3lyY', title: 'Laying Bound angle Pose (Supta Baddha Konasana)', from: 17.5, to: 33.5, crop: [252, 56, 1024] },
  'seated-forward-fold': { source: 'gezond10', youtube: 'nwdyOjT-lW0', title: 'Seated Forward (Paschimottanasana)', from: 6.5, to: 30.5, crop: [512, 373, 668] },
  'seated-twist': { source: 'gezond10', youtube: '3bQ6bm8c00M', title: 'Half Lord of the Fishes (Ardha Matsyendrasana)', from: 6.5, to: 35.5, crop: [455, 320, 760] },
  sphinx: { source: 'gezond10', youtube: '7YPzCoGp5Pg', title: 'Sphinx Pose', from: 6.5, to: 32.5, crop: [289, 50, 1030] },
  'standing-forward-fold': { source: 'gezond10', youtube: 'sspWXm4xqu0', title: 'Standing Forward Bend (Uttanasana)', from: 6.5, to: 32.5, crop: [320, 80, 930] },
  'standing-side-bend': { source: 'gezond10', youtube: 'gvpkIPdpZRE', title: 'Half moon right (Ardha Chandrasana right)', from: 6.5, to: 32.5, crop: [230, 40, 1020] },
  'supine-twist': { source: 'yogaes', youtube: '0qFxyQvi18w', title: 'Flexion de Cadera - Jathara Parivarttanasana', from: 14.5, to: 44.5, crop: [0, 0, 1920, 1080] },
  tree: { source: 'yogaes', youtube: '6g5zC1B2EDQ', title: 'The Tree Pose - Vrksasana', from: 15.5, to: 45.5, crop: [512, 18, 1062] },
  triangle: { source: 'gezond10', youtube: 'mwCWKLyLpdk', title: 'Right Triangle (Trikonasana right)', from: 6.5, to: 36.5, crop: [210, 40, 1040] },
  'upward-dog': { source: 'gezond10', youtube: 'vCeIU96qQtE', title: 'Upward Dog (Urdhva Mukha Svanasana)', from: 6.5, to: 33.5, crop: [268, 72, 1008] },
  'upward-salute': { source: 'yogaes', youtube: 'iAclKRoyOjU', title: 'Chair Pose - Utkatasana', from: 15, to: 26, crop: [394, 0, 1080] },
  'warrior-1': { source: 'yogaes', youtube: 'NgCY67xHwMI', title: 'Warrior I - Virabhadrasana I', from: 36, to: 53.5, crop: [67, 0, 1080] },
  'warrior-2': { source: 'gezond10', youtube: 'ZiJNNFs2XMs', title: 'Warrior Pose Right (Virabhadrasana)', from: 6.5, to: 27.5, crop: [279, 32, 988] },
  'wide-leg-forward-fold': { source: 'gezond10', youtube: 'oSWzttrk4Vw', title: 'Wide Legged Forward Bend (Prasarita Padottanasana)', from: 6.5, to: 35.5, crop: [338, 52, 966] }
}

// A file's address changes whenever its cut does, so a phone that saved the old clip fetches the new one.
const version = (demo: Demo) => {
  let h = 2166136261
  for (const c of JSON.stringify([demo.youtube, demo.from, demo.to, demo.crop, ENCODING])) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(36)
}

export const demoFile = (pose: string) => `${pose}.mp4`

export const demoSrc = (pose: BuiltinPoseId, demo: Demo) => `/media/poses/${demoFile(pose)}?v=${version(demo)}`

// The still ships with the app (it is precached), so lists show photos offline from the first visit.
export const stillSrc = (pose: string) => `/media/stills/${pose}.jpg`

export const youtubeUrl = (demo: Demo) => `https://www.youtube.com/watch?v=${demo.youtube}`

// What plays on a pose's stage: the person's own video first, then the built-in clip.
export type StageVideo = { kind: 'own'; blob: BlobId } | { kind: 'builtin'; src: string; demo: Demo }

export function stageVideo(pose: Pose | undefined): StageVideo | null {
  if (!pose) return null
  const own = pose.media.find(m => m.kind === 'video')
  if (own && own.kind === 'video') return { kind: 'own', blob: own.blob }
  const demo = DEMOS[pose.id as BuiltinPoseId]
  return demo ? { kind: 'builtin', src: demoSrc(pose.id as BuiltinPoseId, demo), demo } : null
}

export const builtinVideoUrls = () => Object.entries(DEMOS).map(([pose, demo]) => demoSrc(pose as BuiltinPoseId, demo!))

// Whether the stage plays the clip mirrored for the side being practised.
export const mirrorFor = (video: StageVideo, side: Side | undefined) => !!side && side !== (video.kind === 'builtin' ? (video.demo.shows ?? 'right') : 'right')

