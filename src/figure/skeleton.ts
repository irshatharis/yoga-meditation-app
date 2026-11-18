// Angles are absolute, in degrees, in screen space: 0 points straight down,
// 90 points right, 180 points up, -90 points left. Authors describe where a
// bone points, never how it relates to its parent, so a pose reads like a
// description ("shin vertical, thigh forward").

export type Bone2 = readonly [upper: number, lower: number]
export type Leg = readonly [thigh: number, shin: number, foot?: number]

export type FigurePose = {
  // side: limbs overlap, `a` is drawn nearest the viewer. front: `a` is on screen left.
  view: 'side' | 'front'
  spine: readonly [lumbar: number, thoracic: number]
  head: number
  armA: Bone2
  armB: Bone2
  legA: Leg
  legB: Leg
  // Raise the lowest point off the ground (for poses resting on a prop or the heels).
  lift?: number
}

export const BONES = {
  lumbar: 26,
  thoracic: 26,
  neck: 8,
  headR: 10.5,
  upperArm: 27,
  forearm: 25,
  hand: 5,
  thigh: 38,
  shin: 36,
  foot: 12,
  hipHalf: 8,
  shoulderHalf: 13
} as const

export type Point = { x: number; y: number }

export type Joints = {
  pelvis: Point
  waist: Point
  neck: Point
  head: Point
  shoulderA: Point
  shoulderB: Point
  elbowA: Point
  elbowB: Point
  handA: Point
  handB: Point
  hipA: Point
  hipB: Point
  kneeA: Point
  kneeB: Point
  ankleA: Point
  ankleB: Point
  toeA: Point
  toeB: Point
}

const rad = (deg: number) => (deg * Math.PI) / 180
const step = (from: Point, angle: number, length: number): Point => ({
  x: from.x + Math.sin(rad(angle)) * length,
  y: from.y + Math.cos(rad(angle)) * length
})

export function solve(pose: FigurePose): Joints {
  const pelvis = { x: 0, y: 0 }
  const waist = step(pelvis, pose.spine[0], BONES.lumbar)
  const neck = step(waist, pose.spine[1], BONES.thoracic)
  const head = step(neck, pose.head, BONES.neck + BONES.headR * 0.7)

  const side = pose.view === 'side'
  // Shoulders sit perpendicular to the upper spine in front view.
  const across = pose.spine[1] - 90
  const shoulderA = side ? step(neck, pose.spine[1] + 180, 3) : step(neck, across, -BONES.shoulderHalf)
  const shoulderB = side ? step(neck, pose.spine[1] + 180, 3) : step(neck, across, BONES.shoulderHalf)
  // The pelvis stays level in front view even when the torso tilts (triangle, side bends).
  const hipA = side ? pelvis : step(pelvis, -90, BONES.hipHalf)
  const hipB = side ? pelvis : step(pelvis, 90, BONES.hipHalf)

  const elbowA = step(shoulderA, pose.armA[0], BONES.upperArm)
  const elbowB = step(shoulderB, pose.armB[0], BONES.upperArm)
  const handA = step(elbowA, pose.armA[1], BONES.forearm)
  const handB = step(elbowB, pose.armB[1], BONES.forearm)
  const kneeA = step(hipA, pose.legA[0], BONES.thigh)
  const kneeB = step(hipB, pose.legB[0], BONES.thigh)
  const ankleA = step(kneeA, pose.legA[1], BONES.shin)
  const ankleB = step(kneeB, pose.legB[1], BONES.shin)
  // Unless told otherwise, a foot sits at a right angle to its shin, toes
  // pointing the way the figure faces. In front view the foot points at the
  // viewer, so it collapses to the ankle.
  const toe = (ankle: Point, leg: Leg) =>
    leg[2] !== undefined ? step(ankle, leg[2], BONES.foot) : side ? step(ankle, leg[1] + 90, BONES.foot) : ankle
  const toeA = toe(ankleA, pose.legA)
  const toeB = toe(ankleB, pose.legB)

  return { pelvis, waist, neck, head, shoulderA, shoulderB, elbowA, elbowB, handA, handB, hipA, hipB, kneeA, kneeB, ankleA, ankleB, toeA, toeB }
}

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

export function bounds(j: Joints): Bounds {
  const pts = Object.entries(j).map(([key, p]) => ({ key, p }))
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const { key, p } of pts) {
    const r = key === 'head' ? BONES.headR : key.startsWith('hand') || key.startsWith('toe') ? 3 : 5
    minX = Math.min(minX, p.x - r)
    maxX = Math.max(maxX, p.x + r)
    minY = Math.min(minY, p.y - r)
    maxY = Math.max(maxY, p.y + r)
  }
  return { minX, maxX, minY, maxY }
}

// Shortest angular path, so a morph never spins a limb the long way round.
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180
  return a + d * t
}
const lerpPair = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => lerpAngle(v, b[i] ?? v, t))

export function blend(from: FigurePose, to: FigurePose, t: number): FigurePose {
  const leg = (a: Leg, b: Leg): Leg => {
    const thigh = lerpAngle(a[0], b[0], t)
    const shin = lerpAngle(a[1], b[1], t)
    if (a[2] === undefined && b[2] === undefined) return [thigh, shin]
    return [thigh, shin, lerpAngle(a[2] ?? a[1] + 90, b[2] ?? b[1] + 90, t)]
  }
  return {
    view: t < 0.5 ? from.view : to.view,
    spine: lerpPair(from.spine, to.spine, t) as unknown as FigurePose['spine'],
    head: lerpAngle(from.head, to.head, t),
    armA: lerpPair(from.armA, to.armA, t) as unknown as Bone2,
    armB: lerpPair(from.armB, to.armB, t) as unknown as Bone2,
    legA: leg(from.legA, to.legA),
    legB: leg(from.legB, to.legB),
    lift: (from.lift ?? 0) + ((to.lift ?? 0) - (from.lift ?? 0)) * t
  }
}

const flipBone = (b: Bone2): Bone2 => [-b[0], -b[1]]
const flipLeg = (l: Leg): Leg => (l[2] === undefined ? [-l[0], -l[1]] : [-l[0], -l[1], -l[2]])

// Left/right mirror. In front view the limbs also swap sides of the screen.
export function mirror(pose: FigurePose): FigurePose {
  const swap = pose.view === 'front'
  return {
    ...pose,
    spine: [-pose.spine[0], -pose.spine[1]],
    head: -pose.head,
    armA: flipBone(swap ? pose.armB : pose.armA),
    armB: flipBone(swap ? pose.armA : pose.armB),
    legA: flipLeg(swap ? pose.legB : pose.legA),
    legB: flipLeg(swap ? pose.legA : pose.legB)
  }
}
