import { createSignal, For, onSettled, Show } from 'solid-js'
import type { BlobId, MediaRef } from '../domain/types'
import { getBlob, put } from '../store/db'
import { newId } from '../store/transfer'
import { Icon } from '../ui/icons'
import { pickFile, toast } from '../ui/kit'

const MAX_BYTES = 60 * 1024 * 1024

export async function addMediaFromFile(): Promise<MediaRef | null> {
  const file = await pickFile('image/*,video/*')
  if (!file) return null
  if (file.size > MAX_BYTES) {
    toast('That file is over 60 MB. Try a shorter clip.')
    return null
  }
  const kind = file.type.startsWith('video/') ? 'video' : 'image'
  const id = newId('media') as BlobId
  await put('blobs', { id, blob: file, mime: file.type, name: file.name })
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
  onSettled(() => {
    let objectUrl: string | null = null
    void getBlob(props.item.blob).then(stored => {
      if (!stored) return
      objectUrl = URL.createObjectURL(stored.blob)
      setUrl(objectUrl)
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  })
  return (
    <Show when={url()} fallback={<div class="media-missing">Media not on this device</div>}>
      {u => (props.item.kind === 'video' ? <video src={u()} controls playsinline loop muted /> : <img src={u()} alt="" loading="lazy" />)}
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
