// One range per request is all a media element asks for.
export type ByteRange = { start: number; end: number }

export function byteRange(header: string, size: number): ByteRange | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (!m[1] && !m[2]) || size === 0) return null
  if (!m[1]) {
    const suffix = Number(m[2])
    return suffix > 0 ? { start: Math.max(0, size - suffix), end: size - 1 } : null
  }
  const start = Number(m[1])
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
  return start <= end ? { start, end } : null
}

export async function partial(header: string, response: Response): Promise<Response> {
  const body = await response.arrayBuffer()
  const range = byteRange(header, body.byteLength)
  const headers = new Headers(response.headers)
  headers.set('Accept-Ranges', 'bytes')
  if (!range) {
    headers.set('Content-Range', `bytes */${body.byteLength}`)
    headers.delete('Content-Length')
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${body.byteLength}`)
  headers.set('Content-Length', String(range.end - range.start + 1))
  return new Response(body.slice(range.start, range.end + 1), { status: 206, headers })
}
