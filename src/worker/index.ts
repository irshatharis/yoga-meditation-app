import { partial } from './range'

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } }

// Static assets answer a byte-range request with the whole file, and an iPhone
// will not play a video from a server that does. Pose videos come through here
// so they can be cut to the range asked for.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request)
    const range = request.headers.get('Range')
    if (response.status !== 200) return response
    if (!range) {
      const whole = new Response(response.body, response)
      whole.headers.set('Accept-Ranges', 'bytes')
      return whole
    }
    return partial(range, response)
  }
}
