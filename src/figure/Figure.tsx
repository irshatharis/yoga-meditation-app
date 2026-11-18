import { createMemo, For } from 'solid-js'
import { BONES, WIDTH, bounds, solve, type Bounds, type FigurePose, type Joints, type Point } from './skeleton'

export const VIEW = { width: 220, height: 212, ground: 198 } as const

const MAT = { width: 92, inset: 10 }

type Tone = 'near' | 'body' | 'far'
type Stroke = { from: Point; to: Point; width: number; tone: Tone }

// Near limbs are lighter so an arm in front of the torso still reads; far limbs are darker.
const TONE: Record<Tone, string> = {
  near: 'var(--fig-near, color-mix(in oklab, var(--fig) 80%, white))',
  body: 'var(--fig)',
  far: 'var(--fig-far)'
}
type Rect = { x0: number; y0: number; x1: number; y1: number }

function curve(a: Point, mid: Point, b: Point) {
  const c = { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 }
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

const rect = (x0: number, x1: number, y0: number, y1: number): Rect => ({
  x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1)
})

// Props are placed from the solved joints, in the same unshifted space, so they
// follow the figure through mirroring and morphs without any stored position.
function propRects(pose: FigurePose, j: Joints, ground: number): Rect[] {
  if (pose.prop === 'chair') {
    const dir = Math.sign(j.kneeA.x - j.pelvis.x) || 1
    const seat = j.pelvis.y + 9
    const back = j.pelvis.x - dir * 17
    const front = j.pelvis.x + dir * 26
    return [
      rect(back, front, seat, seat + 5),
      rect(front, front - dir * 4.5, seat, ground),
      rect(back, back + dir * 4.5, seat - 46, ground)
    ]
  }
  if (pose.prop === 'wall') {
    const dir = Math.sign(j.hipA.x - j.waist.x) || 1
    const legs = [j.hipA, j.kneeA, j.ankleA, j.kneeB, j.ankleB]
    const face = Math.max(...legs.map(p => p.x * dir)) * dir + dir * 8
    return [rect(face, face + dir * 12, ground - 150, ground)]
  }
  return []
}

function strapLines(pose: FigurePose, j: Joints): { from: Point; to: Point }[] {
  if (pose.prop !== 'strap') return []
  const sole = { x: (j.ankleA.x + j.toeA.x * 2) / 3, y: (j.ankleA.y + j.toeA.y * 2) / 3 }
  return [{ from: j.handA, to: sole }, { from: j.handB, to: sole }]
}

export function layout(pose: FigurePose) {
  const j = solve(pose)
  const b = bounds(j)
  const props = propRects(pose, j, b.maxY)
  const minX = Math.min(b.minX, ...props.map(r => r.x0))
  const maxX = Math.max(b.maxX, ...props.map(r => r.x1))
  const top = pose.view === 'top'
  const dx = VIEW.width / 2 - (minX + maxX) / 2
  const dy = top ? VIEW.height / 2 - (b.minY + b.maxY) / 2 : VIEW.ground - b.maxY - (pose.lift ?? 0)
  const at = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  const side = pose.view === 'side'
  const limbs = (s: 'A' | 'B', tone: Tone): Stroke[] => [
    { from: at(j[`hip${s}`]), to: at(j[`knee${s}`]), width: WIDTH.thigh, tone },
    { from: at(j[`knee${s}`]), to: at(j[`ankle${s}`]), width: WIDTH.shin, tone },
    { from: at(j[`ankle${s}`]), to: at(j[`toe${s}`]), width: WIDTH.foot, tone }
  ]
  const arms = (s: 'A' | 'B', tone: Tone): Stroke[] => [
    { from: at(j[`shoulder${s}`]), to: at(j[`elbow${s}`]), width: WIDTH.upperArm, tone },
    { from: at(j[`elbow${s}`]), to: at(j[`wrist${s}`]), width: WIDTH.forearm, tone },
    { from: at(j[`wrist${s}`]), to: at(j[`hand${s}`]), width: WIDTH.hand, tone }
  ]
  const shifted = props.map(r => ({ x0: r.x0 + dx, x1: r.x1 + dx, y0: r.y0 + dy, y1: r.y1 + dy }))
  const box: Bounds = {
    minX: minX + dx,
    maxX: maxX + dx,
    minY: Math.min(b.minY, ...props.map(r => r.y0)) + dy,
    maxY: Math.max(b.maxY, ...props.map(r => r.y1)) + dy
  }
  return {
    back: side ? [...limbs('B', 'far'), ...arms('B', 'far')] : [...limbs('A', 'body'), ...limbs('B', 'body')],
    torso: curve(at(j.pelvis), at(j.waist), at(j.neck)),
    hips: side ? null : { from: at(j.hipA), to: at(j.hipB) },
    shoulders: side ? null : { from: at(j.shoulderA), to: at(j.shoulderB) },
    head: at(j.head),
    neck: { from: at(j.neck), to: at(j.head) },
    front: side ? [...limbs('A', 'near'), ...arms('A', 'near')] : [...arms('A', 'near'), ...arms('B', 'near')],
    props: shifted
      .map(r => `M${r.x0.toFixed(1)} ${r.y0.toFixed(1)}H${r.x1.toFixed(1)}V${r.y1.toFixed(1)}H${r.x0.toFixed(1)}Z`)
      .join(''),
    straps: strapLines(pose, j).map(l => ({ from: at(l.from), to: at(l.to) })),
    shadow: top ? null : { cx: (b.minX + b.maxX) / 2 + dx, w: Math.max(30, (b.maxX - b.minX) * 0.42) },
    // Seen from above, the mat runs head to toe under the body.
    mat: top
      ? { x: j.pelvis.x + dx - MAT.width / 2, y: MAT.inset, width: MAT.width, height: VIEW.height - MAT.inset * 2, rx: 8 }
      : { x: 14, y: VIEW.ground + 1, width: VIEW.width - 28, height: 5, rx: 2.5 },
    box
  }
}

function Bone(props: { s: Stroke }) {
  return (
    <line
      x1={props.s.from.x} y1={props.s.from.y} x2={props.s.to.x} y2={props.s.to.y}
      stroke-width={props.s.width}
      stroke={TONE[props.s.tone]}
      stroke-linecap="round"
    />
  )
}

export function Figure(props: { pose: FigurePose; class?: string; title?: string; mat?: boolean }) {
  const shape = createMemo(() => layout(props.pose))
  return (
    <svg class={['figure', props.class]} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="img" aria-label={props.title ?? 'Pose illustration'}>
      {props.mat !== false && <rect x={shape().mat.x} y={shape().mat.y} width={shape().mat.width} height={shape().mat.height} rx={shape().mat.rx} fill="var(--fig-mat)" />}
      {shape().shadow && <ellipse cx={shape().shadow!.cx} cy={VIEW.ground + 1} rx={shape().shadow!.w} ry="3.2" fill="var(--fig-shadow)" />}
      {shape().props && <path d={shape().props} fill="var(--fig-prop)" stroke="var(--fig-prop)" stroke-width="3" stroke-linejoin="round" />}
      <For each={shape().back} keyed={false}>{s => <Bone s={s()} />}</For>
      <path d={shape().torso} stroke="var(--fig)" stroke-width={WIDTH.torso} stroke-linecap="round" fill="none" />
      <line x1={shape().neck.from.x} y1={shape().neck.from.y} x2={shape().neck.to.x} y2={shape().neck.to.y} stroke="var(--fig)" stroke-width={WIDTH.neck} stroke-linecap="round" />
      {shape().hips && <line x1={shape().hips!.from.x} y1={shape().hips!.from.y} x2={shape().hips!.to.x} y2={shape().hips!.to.y} stroke="var(--fig)" stroke-width="20" stroke-linecap="round" />}
      {shape().shoulders && <line x1={shape().shoulders!.from.x} y1={shape().shoulders!.from.y} x2={shape().shoulders!.to.x} y2={shape().shoulders!.to.y} stroke="var(--fig)" stroke-width="14" stroke-linecap="round" />}
      <circle cx={shape().head.x} cy={shape().head.y} r={BONES.headR} fill="var(--fig)" />
      <For each={shape().front} keyed={false}>{s => <Bone s={s()} />}</For>
      <For each={shape().straps} keyed={false}>{l => (
        <line x1={l().from.x} y1={l().from.y} x2={l().to.x} y2={l().to.y} stroke="var(--fig-prop)" stroke-width="2.5" stroke-linecap="round" />
      )}</For>
    </svg>
  )
}
