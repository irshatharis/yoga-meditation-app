import { createSignal, For, onCleanup, Show, untrack } from 'solid-js'
import type { StageVideo } from '../content/demos'
import type { BlobId, MediaRef } from '../domain/types'
import { getBlob, putBlobs } from '../store/db'
import { newId } from '../store/transfer'
import { Icon } from '../ui/icons'
import { pickFile, toast } from '../ui/kit'

const MAX_BYTES = 60 * 1024 * 1024

export async function addMediaFromFile(accept = 'image/*,video/*'): Promise<MediaRef | null> {
  const file = await pickFile(accept)
  if (!file) return null
  if (file.size > MAX_BYTES) {
    toast('That file is over 60 MB. Try a shorter clip.')
    return null
  }
  const kind = file.type.startsWith('video/') ? 'video' : 'image'
  const id = newId('media') as BlobId
  try {
    await putBlobs([{ id, blob: file, mime: file.type, name: file.name }])
  } catch {
    toast('This device could not store that file. Try a smaller one.')
    return null
  }
  return { kind, blob: id, mime: file.type }
}

export function addMediaLink(raw: string): MediaRef | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return { kind: 'link', href: url.href, label: url.hostname.replace(/^www\./, '') }
  } catch {
    return null
  }
}

function BlobMedia(props: { item: Extract<MediaRef, { blob: BlobId }> }) {
  const [url, setUrl] = createSignal<string | null>(null)
  let objectUrl: string | null = null
  let gone = false
  void getBlob(untrack(() => props.item.blob)).then(stored => {
    if (!stored || gone) return
    objectUrl = URL.createObjectURL(stored.blob)
    setUrl(objectUrl)
  })
  onCleanup(() => {
    gone = true
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  })
  return (
    <Show when={url()} fallback={<div class="media-missing">Media not on this device</div>}>
      {u => (
        <Show when={props.item.kind === 'video'} fallback={<img src={u()} alt="" loading="lazy" />}>
          <video src={u()} controls playsinline loop muted />
        </Show>
      )}
    </Show>
  )
}

export function MediaGallery(props: { media: MediaRef[]; onRemove?: (index: number) => void }) {
  return (
    <Show when={props.media.length}>
      <div class="media-grid">
        <For each={props.media}>
          {(m, i) => (
            <figure class="media-item">
              <Show
                when={m.kind !== 'link' && m}
                fallback={
                  <a class="media-link" href={(m as Extract<MediaRef, { kind: 'link' }>).href} target="_blank" rel="noopener noreferrer">
                    <Icon name="link" />
                    <span>{(m as Extract<MediaRef, { kind: 'link' }>).label ?? 'Open link'}</span>
                  </a>
                }
              >
                {b => <BlobMedia item={b() as Extract<MediaRef, { blob: BlobId }>} />}
              </Show>
              <Show when={props.onRemove}>
                <button class="media-remove" aria-label="Remove" onClick={() => props.onRemove!(i())}>
                  <Icon name="close" size={14} />
                </button>
              </Show>
            </figure>
          )}
        </For>
      </div>
    </Show>
  )
}

// The video on a pose's stage. It loops without sound, since the voice does the teaching.
// `still` shows until the first frame, and stays when a phone in Low Power Mode
// will not autoplay, in which case a tap starts it.
export function PoseVideo(props: { video: StageVideo; title: string; mirrored?: boolean; autoplay?: boolean; still?: string; ref?: (video: HTMLVideoElement) => void }) {
  const [src, setSrc] = createSignal(untrack(() => (props.video.kind === 'builtin' ? props.video.src : undefined)))
  const own = untrack(() => props.video)
  if (own.kind === 'own') {
    let objectUrl: string | undefined
    let gone = false
    void getBlob(own.blob).then(stored => {
      if (!stored || gone) return
      objectUrl = URL.createObjectURL(stored.blob)
      setSrc(objectUrl)
    })
    onCleanup(() => {
      gone = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    })
  }
  return (
    <video
      class={['pose-video', { mirrored: props.mirrored }]}
      src={src()}
      style={props.still ? { background: `center / cover no-repeat url("${props.still}")` } : undefined}
      onClick={e => e.currentTarget.paused && void e.currentTarget.play().catch(() => {})}
      aria-label={props.title}
      autoplay={props.autoplay}
      loop
      muted
      playsinline
      preload="auto"
      ref={video => {
        video.muted = true
        props.ref?.(video)
      }}
    />
  )
}

