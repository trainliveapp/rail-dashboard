import { validatePublicForm } from '../../../src/lib/publicFormValidation.js'

// Dependency injection allows request/response tests without emailing anyone.
export function createPublicFormHandler(kind, { origins, submit, hashIp }) {
  return async request => {
    const origin = request.headers.get('Origin') || ''
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origins.includes(origin) ? origin : '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' }
    const respond = (status, body) => new Response(JSON.stringify(body), { status, headers })
    if (!origins.includes(origin)) return respond(403, { error: 'Origin not allowed.' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' })
    if (!request.headers.get('Content-Type')?.includes('application/json')) return respond(415, { error: 'Send JSON form details.' })
    if (Number(request.headers.get('Content-Length')) > 20000) return respond(413, { error: 'Form is too large.' })
    let input
    try {
      const reader = request.body?.getReader()
      const decoder = new TextDecoder()
      let bytes = 0
      let text = ''
      if (reader) while (true) {
        const { value, done } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 20000) { await reader.cancel(); return respond(413, { error: 'Form is too large.' }) }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
      input = JSON.parse(text)
    }
    catch { return respond(400, { error: 'Invalid form details.' }) }
    const result = validatePublicForm(kind, input)
    if (result.error) return respond(400, { error: result.error })
    try {
      // The hosted gateway owns X-Forwarded-For. Retain only a keyed hash, never the raw address.
      const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      const outcome = await submit(result.value, await hashIp(address))
      if (outcome === 'rate_limited') return respond(429, { error: 'Too many attempts. Please try again later.' })
      if (outcome !== 'success') return respond(503, { error: 'Could not save your details. Please try again.' })
      return respond(200, { ok: true })
    } catch { return respond(503, { error: 'Could not save your details. Please try again.' }) }
  }
}
