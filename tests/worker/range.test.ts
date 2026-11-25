import { describe, expect, it } from 'vitest'
import { byteRange, partial } from '../../src/worker/range'

describe('byte ranges for video', () => {
  it('reads the ranges a media element asks for', () => {
    expect(byteRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 })
    expect(byteRange('bytes=40-', 100)).toEqual({ start: 40, end: 99 })
    expect(byteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(byteRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 })
  })

  it('refuses ranges outside the file or in another unit', () => {
    expect(byteRange('bytes=100-', 100)).toBeNull()
    expect(byteRange('bytes=5-2', 100)).toBeNull()
    expect(byteRange('bytes=-', 100)).toBeNull()
    expect(byteRange('items=0-1', 100)).toBeNull()
    expect(byteRange('bytes=0-1,4-5', 100)).toBeNull()
  })

  it('answers with exactly the bytes asked for', async () => {
    const file = new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), { headers: { 'Content-Type': 'video/mp4' } })
    const res = await partial('bytes=2-4', file)
    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe('bytes 2-4/10')
    expect(res.headers.get('Content-Type')).toBe('video/mp4')
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([2, 3, 4])
  })

  it('says which sizes exist when the range is past the end', async () => {
    const res = await partial('bytes=20-', new Response(new Uint8Array(10)))
    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBe('bytes */10')
  })
})
