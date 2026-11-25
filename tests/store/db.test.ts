import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { getAllBlobs, getBlob, put, putBlobs } from '../../src/store/db'

describe('stored photos and videos', () => {
  it('reads back what was saved, with its type', async () => {
    await putBlobs([{ id: 'media-new', blob: new Blob(['frames'], { type: 'video/mp4' }), mime: 'video/mp4', name: 'me.mp4' }])
    const got = await getBlob('media-new')
    expect(got?.blob.type).toBe('video/mp4')
    expect(await got?.blob.text()).toBe('frames')
  })

  it('still reads files saved before they were kept as bytes', async () => {
    await put('blobs', { id: 'media-old', blob: new Blob(['old frames'], { type: 'video/mp4' }), mime: 'video/mp4', name: 'old.mp4' })
    expect(await (await getBlob('media-old'))?.blob.text()).toBe('old frames')
    expect((await getAllBlobs()).map(b => b.id).sort()).toEqual(['media-new', 'media-old'])
  })
})
