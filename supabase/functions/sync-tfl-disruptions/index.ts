import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODES = 'tube,dlr,overground,elizabeth-line,national-rail'
const GOOD_SERVICE = 'Good Service'

function sourceKey(reason: string, description: string) {
  const value = `${reason.trim().toLowerCase()}|${description.trim().toLowerCase()}`
  return btoa(encodeURIComponent(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

Deno.serve(async () => {
  const observedAt = new Date().toISOString()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const tflAppKey = Deno.env.get('TFL_APP_KEY')

  if (!supabaseUrl || !serviceRoleKey || !tflAppKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase or TfL function secrets.' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const endpoint = `https://api.tfl.gov.uk/Line/Mode/${MODES}/Status?app_key=${encodeURIComponent(tflAppKey)}`
  const response = await fetch(endpoint, { headers: { 'Cache-Control': 'no-cache' } })

  if (!response.ok) {
    return new Response(JSON.stringify({ error: `TfL returned HTTP ${response.status}.` }), { status: 502 })
  }

  const lines = await response.json()
  const grouped = new Map<string, {
    source_key: string
    line_names: string[]
    severity: number
    status_description: string
    reason: string
  }>()

  for (const line of lines) {
    for (const status of line.lineStatuses || []) {
      const description = status.statusSeverityDescription || GOOD_SERVICE
      const reason = status.reason || description
      if (description === GOOD_SERVICE) continue

      const key = sourceKey(reason, description)
      const existing = grouped.get(key)
      if (existing) {
        if (!existing.line_names.includes(line.name)) existing.line_names.push(line.name)
        existing.severity = Math.min(existing.severity, status.statusSeverity ?? 10)
      } else {
        grouped.set(key, {
          source_key: key,
          line_names: [line.name],
          severity: status.statusSeverity ?? 10,
          status_description: description,
          reason,
        })
      }
    }
  }

  const rows = [...grouped.values()].map((item) => ({
    ...item,
    last_seen_at: observedAt,
    resolved_at: null,
    updated_at: observedAt,
  }))

  if (rows.length > 0) {
    const { error } = await supabase.from('tfl_disruptions').upsert(rows, { onConflict: 'source_key' })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const { error: resolveError } = await supabase
    .from('tfl_disruptions')
    .update({ resolved_at: observedAt, updated_at: observedAt })
    .is('resolved_at', null)
    .lt('last_seen_at', observedAt)

  if (resolveError) return new Response(JSON.stringify({ error: resolveError.message }), { status: 500 })

  return new Response(JSON.stringify({ synced: rows.length, synced_at: observedAt }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
