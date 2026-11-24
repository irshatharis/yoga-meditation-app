import type { BlobId, Pose, Side } from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

// Real people showing each pose, cut from yoga videos released under CC BY.
// `node scripts/pose-videos.mjs` downloads, trims and crops each one into
// public/media/poses from the cut written here, and
// `uv run --with ultralytics scripts/frame-person.py` finds the crop.
export const SOURCES = {
  gezond10: { by: 'Gezond10', url: 'https://www.youtube.com/@Gezond10Nl' },
  yogaes: { by: 'Yogaes', url: 'https://www.youtube.com/channel/UCk3ZDhpeSQ75WXiT1VtX-iA' },
  yogavidya: { by: 'Yoga Vidya', url: 'https://www.youtube.com/channel/UCTVmueSg-pv7e4H7JlW2PWQ' },
  dreamgarden: { by: 'Dream Garden Yoga Studio', url: 'https://www.youtube.com/channel/UC6I3Ej-o4oG5XD2MR1F1rkg' }
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
  // box that cannot be square, to fit a wide pose or to leave out someone
  // else in the room, gives a width and height, and the clip shows that whole
  // box over a blurred copy of itself.
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
  'bound-angle': { source: 'yogavidya', youtube: '5ZP-CjEqCvw', title: 'Yoga Vidya Lexikon 266 Baddha Konasana', from: 24, to: 50, crop: [1050, 140, 850, 760] },
  bow: { source: 'yogaes', youtube: 'VC8kakVj_0E', title: 'El arco - Dhanurasana', from: 14.5, to: 44.5, crop: [0, 0, 1920, 1080] },
  bridge: { source: 'gezond10', youtube: 'YgR3qwX-XHI', title: 'Bridge Pose (Setu Bandha Sarvangasana)', from: 6.5, to: 29.5, crop: [233, 34, 1046] },
  camel: { source: 'gezond10', youtube: 'o6O_k47VV_0', title: 'Camel Pose (Ustrasana)', from: 6.5, to: 35.5, crop: [497, 272, 704] },
  cat: { source: 'gezond10', youtube: '6v0voosGm-A', title: 'Cat pose (Marjaryasana)', from: 6.5, to: 21.5, crop: [488, 458, 536] },
  chair: { source: 'yogaes', youtube: 'iAclKRoyOjU', title: 'Chair Pose - Utkatasana', from: 15.5, to: 45.5, crop: [394, 0, 1080] },
  chaturanga: { source: 'yogaes', youtube: '4KwZBU3zv6o', title: 'Baston cuatro apoyos - Chaturanga Dandasana', from: 31, to: 56, crop: [310, 260, 1400, 788] },
  child: { source: 'gezond10', youtube: '34VqmhcuKHI', title: 'Child pose (Balasana)', from: 6.1, to: 32.2, crop: [399, 284, 796] },
  cobra: { source: 'gezond10', youtube: 'aOGo_PmQcII', title: 'Cobra (Bhujangasana)', from: 6.5, to: 25.5, crop: [250, 60, 1000] },
  corpse: { source: 'gezond10', youtube: '0RdsNOYzqd4', title: 'Corpse Pose (Savasana)', from: 12.5, to: 32.5, crop: [212, 4, 1076] },
  cow: { source: 'gezond10', youtube: 'lOb1UOoNYM0', title: 'Cat Stretch', from: 8, to: 30, crop: [451, 274, 806] },
  dancer: { source: 'gezond10', youtube: 'q9C-6eq4gJs', title: 'Dancer (Natarajasana)', from: 6.5, to: 20.5, crop: [224, 0, 1080] },
  'downward-dog': { source: 'gezond10', youtube: 'fdhpObFKZfg', title: 'Downward Dog (Adho Mukha Svanasana)', from: 7.5, to: 30.5, crop: [275, 70, 1010] },
  eagle: { source: 'gezond10', youtube: 'H7c5T8L1wEE', title: 'Eagle Pose Right (Garudasana)', from: 6.5, to: 31.5, crop: [339, 43, 962] },
  'easy-seat': { source: 'yogavidya', youtube: 'mVZLAUHjWWE', title: 'Opening of the CC BY Yoga Vidya Phalakasana clip (same teacher as plank and liza', from: 0, to: 13, crop: [440, 0, 1080] },
  'extended-side-angle': { source: 'gezond10', youtube: '-KBQ5eD78qg', title: 'Extended Side Angle (Utthita Parsvakonasana)', from: 6.5, to: 33.5, crop: [283, 0, 1080] },
  fish: { source: 'yogaes', youtube: 'BAhOz-b_dEc', title: 'Fish Pose - Matsyasana', from: 37.5, to: 58.5, crop: [0, 0, 1920, 1080] },
  garland: { source: 'gezond10', youtube: '--qnzZEZ_Lc', title: 'Garland pose (Malasana)', from: 6.5, to: 33.5, crop: [378, 46, 936] },
  gate: { source: 'yogaes', youtube: 'Apk_gVJ1QEo', title: 'El cerrojo - Parighasana', from: 14.5, to: 44.5, crop: [203, 0, 1564, 1080], shows: 'left' },
  'half-splits': { source: 'yogavidya', youtube: 'DDcj_pMjasg', title: 'Yoga Vidya Lexikon 93 Ardha Hanumanasana', from: 12, to: 30, crop: [650, 270, 1050, 700] },
  'happy-baby': { source: 'gezond10', youtube: '1E0izixrU3A', title: 'Happy Baby pose (Ananda Balasana)', from: 6.5, to: 34.5, crop: [213, 2, 1078] },
  hero: { source: 'yogaes', youtube: 'GUO8s4d1slA', title: 'Reclined Hero Pose - Supta Virasana', from: 14, to: 21, crop: [814, 17, 1020] },
  'high-lunge': { source: 'dreamgarden', youtube: 'hYifFwBwZ9s', title: 'Dream Garden Yoga Studio \'Crescent Lunge\', same teacher as the legs-up-the-wall ', from: 21, to: 32, crop: [470, 0, 1080] },
  'knees-chest-chin': { source: 'yogavidya', youtube: '7cPwCkzs3BM', title: 'Yoga Vidya Lexikon 177 Ashtanga Pranama', from: 28, to: 52, crop: [840, 380, 900, 506] },
  'knees-to-chest': { source: 'yogavidya', youtube: 'vZTYdGqb6H8', title: 'Yoga Vidya Lexikon 419 Dvi Pada Pavana Muktasana', from: 53, to: 66, crop: [960, 570, 840, 472] },
  'legs-up-the-wall': { source: 'dreamgarden', youtube: 'hgrBpPxWe8w', title: 'Dream Garden Yoga Studio \'Legs up the wall\' (CC BY on YouTube)', from: 1, to: 26, crop: [40, 0, 1860, 1080] },
  lizard: { source: 'yogavidya', youtube: 'kH7yuAugdMM', title: 'Yoga Vidya Lexikon 1640 Uttana Prishthasana', from: 26, to: 56, crop: [282, 160, 1636, 920] },
  locust: { source: 'gezond10', youtube: '2JHx1UmUw6c', title: 'Locust pose (Salabhasana)', from: 6.5, to: 21.5, crop: [290, 90, 990] },
  mountain: { source: 'yogavidya', youtube: 'acNpIg7QRQ0', title: 'Yoga Vidya Lexikon 152 (Ardha Uttanasana) opening section', from: 0, to: 26, crop: [1100, 20, 600, 1050] },
  pigeon: { source: 'gezond10', youtube: 'NnB3aC_yiOQ', title: 'Pigeon Pose', from: 6.5, to: 35.5, crop: [358, 108, 972] },
  plank: { source: 'yogaes', youtube: '4KwZBU3zv6o', title: 'Baston cuatro apoyos - Chaturanga Dandasana', from: 23, to: 31, crop: [310, 260, 1400, 788] },
  puppy: { source: 'yogavidya', youtube: 'tZ69vWxjREY', title: 'Yoga Vidya Lexikon 1636 Uttana Shishvasana', from: 14, to: 40, crop: [250, 420, 1420, 620] },
  'reclined-bound-angle': { source: 'gezond10', youtube: '_50E7eC3lyY', title: 'Laying Bound angle Pose (Supta Baddha Konasana)', from: 17.5, to: 33.5, crop: [252, 56, 1024] },
  'reclined-hamstring': { source: 'yogavidya', youtube: 'YdbQbBTCu8A', title: 'Yoga Vidya Lexikon 1417 Supta Padangushthasana (no strap, holds big toe)', from: 11, to: 30, crop: [570, 230, 1320, 742] },
  'reverse-warrior': { source: 'yogavidya', youtube: 'NnGzfIvZURo', title: 'Yoga Vidya Lexikon 1788 Viparita Virabhadrasana', from: 12, to: 38, crop: [700, 0, 1080] },
  'seated-forward-fold': { source: 'gezond10', youtube: 'nwdyOjT-lW0', title: 'Seated Forward (Paschimottanasana)', from: 6.5, to: 30.5, crop: [512, 373, 668] },
  'seated-side-bend': { source: 'yogavidya', youtube: 'OtZ3gQHAf-U', title: 'Yoga Vidya Lexikon 1121 Parshva Sukhasana', from: 14, to: 36, crop: [740, 40, 1180, 1040] },
  'seated-twist': { source: 'gezond10', youtube: '3bQ6bm8c00M', title: 'Half Lord of the Fishes (Ardha Matsyendrasana)', from: 6.5, to: 35.5, crop: [455, 320, 760] },
  'side-plank': { source: 'yogavidya', youtube: '4leuns-WoT8', title: 'Yoga Vidya Lexikon 1742 Vasishthasana', from: 170, to: 191, crop: [86, 0, 1834, 1080] },
  sphinx: { source: 'gezond10', youtube: '7YPzCoGp5Pg', title: 'Sphinx Pose', from: 6.5, to: 32.5, crop: [289, 50, 1030] },
  staff: { source: 'yogavidya', youtube: 'iYpbXYwaD6U', title: 'Yoga Vidya Lexikon 353 Dandasana', from: 5, to: 30, crop: [1090, 230, 780, 720] },
  'standing-forward-fold': { source: 'gezond10', youtube: 'sspWXm4xqu0', title: 'Standing Forward Bend (Uttanasana)', from: 6.5, to: 32.5, crop: [320, 80, 930] },
  'standing-side-bend': { source: 'gezond10', youtube: 'gvpkIPdpZRE', title: 'Half moon right (Ardha Chandrasana right)', from: 6.5, to: 32.5, crop: [230, 40, 1020] },
  'supine-figure-four': { source: 'yogavidya', youtube: 'PS50LgkzogM', title: 'Yoga Vidya Lexikon 1386 Suchirandhrasana', from: 16, to: 44, crop: [840, 0, 1080] },
  'supine-twist': { source: 'yogaes', youtube: '0qFxyQvi18w', title: 'Flexion de Cadera - Jathara Parivarttanasana', from: 14.5, to: 44.5, crop: [0, 0, 1920, 1080] },
  tabletop: { source: 'yogavidya', youtube: 'UcgZ80Y2NCo', title: 'Yoga Vidya Asana Lexikon 293 Bharmanasana', from: 18, to: 40, crop: [600, 200, 1200, 700] },
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

