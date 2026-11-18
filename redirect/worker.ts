// yoga.irshath.com was the app's old home. Every request moves to
// still.irshath.com, except the old service worker script: browsers refuse a
// redirected service worker update, so installed copies would keep serving
// the stale app forever. Answering /sw.js with a worker that unregisters
// itself frees them on their next update check.
const TARGET = 'https://still.irshath.com'

const RETIRE_SW = `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
  })())
})
`

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url)
    if (url.pathname === '/sw.js') {
      return new Response(RETIRE_SW, { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } })
    }
    return Response.redirect(`${TARGET}${url.pathname}${url.search}`, 301)
  }
}
