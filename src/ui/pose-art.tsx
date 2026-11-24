import { Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { DEMOS, stillSrc } from '../content/demos'
import type { BuiltinPoseId } from '../content/pose-ids'
import type { Pose, Side } from '../domain/types'
import { Figure } from '../figure/Figure'
import type { FigurePose } from '../figure/skeleton'

// A pose in a list: a still from its video when it has a built-in one, otherwise its drawing.
export function PoseArt(props: { pose: Pose | undefined; figure?: FigurePose | null; side?: Side; fallback?: JSX.Element }) {
  const demo = () => props.pose && DEMOS[props.pose.id as BuiltinPoseId]
  const figure = () => (props.figure === undefined ? props.pose?.figure : props.figure)
  return (
    <Show
      when={demo() && props.pose}
      keyed
      fallback={
        <Show when={figure()} fallback={props.fallback}>
          {f => <Figure pose={f()} mat={false} title="" />}
        </Show>
      }
    >
      {pose => <img class={['pose-still', { mirrored: !!props.side && props.side !== (demo()!.shows ?? 'right') }]} src={stillSrc(pose.id)} alt="" loading="lazy" decoding="async" />}
    </Show>
  )
}
