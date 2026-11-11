import { parseLaunchTimestamp } from '../../../src/lib/flavioCountdown.js'

Deno.serve((request) => {
  const origin = request.headers.get('Origin') || ''
  const allowed = (Deno.env.get('PUBLIC_FORM_ORIGINS') || '').split(',').map(value => value.trim())
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers })
  const launchAt = Deno.env.get('FLAVIO_LAUNCH_AT')
  if (!parseLaunchTimestamp(launchAt)) return new Response(JSON.stringify({ error: 'Launch date not confirmed.' }), { status: 503, headers })
  return new Response(JSON.stringify({ launchAt }), { headers })
})
