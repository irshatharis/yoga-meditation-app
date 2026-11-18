import { describe, expect, it } from 'vitest'
import worker from '../redirect/worker'

describe('old domain redirect', () => {
  it('moves every path and query to still.irshath.com permanently', () => {
    const res = worker.fetch(new Request('https://yoga.irshath.com/practices/morning-flow?len=600'))
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://still.irshath.com/practices/morning-flow?len=600')
  })

  it('answers the old service worker with one that unregisters itself', async () => {
    const res = worker.fetch(new Request('https://yoga.irshath.com/sw.js'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/javascript')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.text()
    expect(body).toContain('registration.unregister()')
    expect(body).toContain('caches.delete')
  })
})
