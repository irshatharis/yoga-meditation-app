// Angles are absolute, in degrees, in screen space: 0 points straight down,
// 90 points right, 180 points up, -90 points left. Authors describe where a
// bone points, never how it relates to its parent, so a pose reads like a
// description ("shin vertical, thigh forward").

export type Bone2 = readonly [upper: number, lower: number, hand?: number]
export type Leg = readonly [thigh: number, shin: number, foot?: number]

export type FigurePose = {
  // side: limbs overlap, `a` is drawn nearest the viewer and the figure faces right.
  // front: the figure faces the viewer, `a` is on screen left.
  // top: front view seen from above a mat, for poses lying on the back.
  view: 'side' | 'front' | 'top'
  spine: readonly [lumbar: number, thoracic: number]
  head: number
  armA: Bone2
  armB: Bone2
  legA: Leg
  legB: Leg
  // Raise the lowest point off the ground (for poses resting on a prop or the heels).
  lift?: number
  // Front and top view: tilt of the hip line in degrees, so hips can stack
  // (side plank, half moon, lying on one side). Positive drops hip `a`.
  hips?: number
  // Front and top view: scales the spine to show a torso folding toward the viewer.
  torso?: number
  // A simple object the pose uses, drawn around the figure.
  prop?: Prop
}

export type Prop = 'chair' | 'wall' | 'strap'

export const BONES = {
  lumbar: 26,
  thoracic: 26,
  neck: 8,
  headR: 11.5,
  upperArm: 28,
  forearm: 23,
  hand: 12,
  thigh: 38,
  shin: 36,
  foot: 12,
  hipHalf: 8,
  shoulderHalf: 13
} as const

// Stroke widths double as joint radii, so grounding and bounds match what is drawn.
export const WIDTH = { torso: 25, thigh: 16, shin: 12.5, foot: 8, upperArm: 11, forearm: 8.5, hand: 7, neck: 9 } as const

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
  wristA: Point
  wristB: Point
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
  const side = pose.view === 'side'
  const scale = side ? 1 : (pose.torso ?? 1)
  const pelvis = { x: 0, y: 0 }
  const waist = step(pelvis, pose.spine[0], BONES.lumbar * scale)
  const neck = step(waist, pose.spine[1], BONES.thoracic * scale)
  const head = step(neck, pose.head, BONES.neck + BONES.headR * 0.62)

  // Shoulders sit perpendicular to the upper spine in front view.
  const across = pose.spine[1] - 90
  const shoulderA = side ? step(neck, pose.spine[1] + 180, 3) : step(neck, across, -BONES.shoulderHalf)
  const shoulderB = side ? step(neck, pose.spine[1] + 180, 3) : step(neck, across, BONES.shoulderHalf)
  // The pelvis stays level in front view unless told to tilt, even when the
  // torso leans (triangle, side bends keep the hips facing forward).
  const tilt = pose.hips ?? 0
  const hipA = side ? pelvis : step(pelvis, tilt - 90, BONES.hipHalf)
  const hipB = side ? pelvis : step(pelvis, tilt + 90, BONES.hipHalf)

  const elbowA = step(shoulderA, pose.armA[0], BONES.upperArm)
  const elbowB = step(shoulderB, pose.armB[0], BONES.upperArm)
  const wristA = step(elbowA, pose.armA[1], BONES.forearm)
  const wristB = step(elbowB, pose.armB[1], BONES.forearm)
  const handA = step(wristA, pose.armA[2] ?? pose.armA[1], BONES.hand)
  const handB = step(wristB, pose.armB[2] ?? pose.armB[1], BONES.hand)
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

  return {
    pelvis, waist, neck, head, shoulderA, shoulderB, elbowA, elbowB, wristA, wristB, handA, handB,
    hipA, hipB, kneeA, kneeB, ankleA, ankleB, toeA, toeB
  }
}

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

const RADIUS: Record<keyof Joints, number> = {
  pelvis: WIDTH.torso / 2,
  waist: WIDTH.torso / 2,
  neck: WIDTH.torso / 2,
  head: BONES.headR,
  shoulderA: WIDTH.upperArm / 2,
  shoulderB: WIDTH.upperArm / 2,
  elbowA: WIDTH.upperArm / 2,
  elbowB: WIDTH.upperArm / 2,
  wristA: WIDTH.forearm / 2,
  wristB: WIDTH.forearm / 2,
  handA: WIDTH.hand / 2,
  handB: WIDTH.hand / 2,
  hipA: WIDTH.thigh / 2,
  hipB: WIDTH.thigh / 2,
  kneeA: WIDTH.thigh / 2,
  kneeB: WIDTH.thigh / 2,
  ankleA: WIDTH.shin / 2,
  ankleB: WIDTH.shin / 2,
  toeA: WIDTH.foot / 2,
  toeB: WIDTH.foot / 2
}

export function bounds(j: Joints): Bounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const key of Object.keys(j) as (keyof Joints)[]) {
    const p = j[key], r = RADIUS[key]
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// The optional third angle (hand or foot) falls back to each pose's own
// default, so a morph between a pose that sets it and one that does not stays continuous.
function lerpLimb<T extends Bone2 | Leg>(a: T, b: T, t: number, ea: number | undefined, eb: number | undefined): T {
  const upper = lerpAngle(a[0], b[0], t)
  const lower = lerpAngle(a[1], b[1], t)
  if (a[2] === undefined && b[2] === undefined) return [upper, lower] as unknown as T
  if (ea === undefined || eb === undefined) return [upper, lower] as unknown as T
  return [upper, lower, lerpAngle(ea, eb, t)] as unknown as T
}

export function blend(from: FigurePose, to: FigurePose, t: number): FigurePose {
  const foot = (p: FigurePose, l: Leg) => l[2] ?? (p.view === 'side' ? l[1] + 90 : undefined)
  const hand = (b: Bone2) => b[2] ?? b[1]
  return {
    view: t < 0.5 ? from.view : to.view,
    spine: [lerpAngle(from.spine[0], to.spine[0], t), lerpAngle(from.spine[1], to.spine[1], t)],
    head: lerpAngle(from.head, to.head, t),
    armA: lerpLimb(from.armA, to.armA, t, hand(from.armA), hand(to.armA)),
    armB: lerpLimb(from.armB, to.armB, t, hand(from.armB), hand(to.armB)),
    legA: lerpLimb(from.legA, to.legA, t, foot(from, from.legA), foot(to, to.legA)),
    legB: lerpLimb(from.legB, to.legB, t, foot(from, from.legB), foot(to, to.legB)),
    lift: lerp(from.lift ?? 0, to.lift ?? 0, t),
    hips: lerp(from.hips ?? 0, to.hips ?? 0, t),
    torso: lerp(from.torso ?? 1, to.torso ?? 1, t),
    prop: t < 0.5 ? from.prop : to.prop
  }
}

const flipBone = (b: Bone2): Bone2 => (b[2] === undefined ? [-b[0], -b[1]] : [-b[0], -b[1], -b[2]])
// A side-view foot defaults to pointing the way the figure faces, so the mirror
// has to spell it out or the toes would keep facing the old way.
const flipLeg = (l: Leg, side: boolean): Leg =>
  l[2] !== undefined ? [-l[0], -l[1], -l[2]] : side ? [-l[0], -l[1], -(l[1] + 90)] : [-l[0], -l[1]]

// Left/right mirror. In front and top view the limbs also swap sides of the screen.
export function mirror(pose: FigurePose): FigurePose {
  const side = pose.view === 'side'
  return {
    ...pose,
    spine: [-pose.spine[0], -pose.spine[1]],
    head: -pose.head,
    armA: flipBone(side ? pose.armA : pose.armB),
    armB: flipBone(side ? pose.armB : pose.armA),
    legA: flipLeg(side ? pose.legA : pose.legB, side),
    legB: flipLeg(side ? pose.legB : pose.legA, side),
    hips: pose.hips === undefined ? undefined : -pose.hips
  }
}
