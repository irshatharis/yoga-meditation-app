import { createMemo, For } from 'solid-js'
import { bounds, solve, type FigurePose, type Point } from './skeleton'

export const VIEW = { width: 220, height: 200, ground: 186 } as const

type Stroke = { from: Point; to: Point; width: number; tone: 'near' | 'far' }

function curve(a: Point, mid: Point, b: Point) {
  const c = { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 }
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

export function layout(pose: FigurePose) {
  const j = solve(pose)
  const b = bounds(j)
  const dx = VIEW.width / 2 - (b.minX + b.maxX) / 2
  const dy = VIEW.ground - b.maxY - (pose.lift ?? 0)
  const at = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  const side = pose.view === 'side'
  const far = side ? 'far' : 'near'
  const limbs = (s: 'A' | 'B', tone: Stroke['tone']): Stroke[] => [
    { from: at(j[`hip${s}`]), to: at(j[`knee${s}`]), width: 16, tone },
    { from: at(j[`knee${s}`]), to: at(j[`ankle${s}`]), width: 12.5, tone },
    { from: at(j[`ankle${s}`]), to: at(j[`toe${s}`]), width: 8, tone }
  ]
  const arms = (s: 'A' | 'B', tone: Stroke['tone']): Stroke[] => [
    { from: at(j[`shoulder${s}`]), to: at(j[`elbow${s}`]), width: 11, tone },
    { from: at(j[`elbow${s}`]), to: at(j[`hand${s}`]), width: 8.5, tone }
  ]
  return {
    back: side ? [...limbs('B', far), ...arms('B', far)] : [...limbs('A', 'near'), ...limbs('B', 'near')],
    torso: curve(at(j.pelvis), at(j.waist), at(j.neck)),
    hips: side ? null : { from: at(j.hipA), to: at(j.hipB) },
    shoulders: side ? null : { from: at(j.shoulderA), to: at(j.shoulderB) },
    head: at(j.head),
    neck: { from: at(j.neck), to: at(j.head) },
    front: side ? [...limbs('A', 'near'), ...arms('A', 'near')] : [...arms('A', 'near'), ...arms('B', 'near')],
    shadow: { cx: (b.minX + b.maxX) / 2 + dx, w: Math.max(30, (b.maxX - b.minX) * 0.42) }
  }
}

function Bone(props: { s: Stroke }) {
  return (
    <line
      x1={props.s.from.x} y1={props.s.from.y} x2={props.s.to.x} y2={props.s.to.y}
      stroke-width={props.s.width}
      stroke={props.s.tone === 'far' ? 'var(--fig-far)' : 'var(--fig)'}
      stroke-linecap="round"
    />
  )
}

export function Figure(props: { pose: FigurePose; class?: string; title?: string; mat?: boolean }) {
  const shape = createMemo(() => layout(props.pose))
  return (
    <svg class={['figure', props.class]} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="img" aria-label={props.title ?? 'Pose illustration'}>
      {props.mat !== false && <rect x="14" y={VIEW.ground + 1} width={VIEW.width - 28} height="5" rx="2.5" fill="var(--fig-mat)" />}
      <ellipse cx={shape().shadow.cx} cy={VIEW.ground + 1} rx={shape().shadow.w} ry="3.2" fill="var(--fig-shadow)" />
      <For each={shape().back} keyed={false}>{s => <Bone s={s()} />}</For>
      <path d={shape().torso} stroke="var(--fig)" stroke-width="25" stroke-linecap="round" fill="none" />
      <line x1={shape().neck.from.x} y1={shape().neck.from.y} x2={shape().neck.to.x} y2={shape().neck.to.y} stroke="var(--fig)" stroke-width="9" stroke-linecap="round" />
      {shape().hips && <line x1={shape().hips!.from.x} y1={shape().hips!.from.y} x2={shape().hips!.to.x} y2={shape().hips!.to.y} stroke="var(--fig)" stroke-width="20" stroke-linecap="round" />}
      {shape().shoulders && <line x1={shape().shoulders!.from.x} y1={shape().shoulders!.from.y} x2={shape().shoulders!.to.x} y2={shape().shoulders!.to.y} stroke="var(--fig)" stroke-width="14" stroke-linecap="round" />}
      <circle cx={shape().head.x} cy={shape().head.y} r="11.5" fill="var(--fig)" />
      <For each={shape().front} keyed={false}>{s => <Bone s={s()} />}</For>
    </svg>
  )
}
