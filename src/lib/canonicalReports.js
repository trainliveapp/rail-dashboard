import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export const REPORT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export function canonicalStationId(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function summarizeUniqueReports(rows, now = Date.now()) {
  const unique = new Set()
  for (const row of rows || []) {
    const createdAt = new Date(row.createdAt || row.created_at).getTime()
    if (!row || !['ACTIVE', 'CONFIRMED'].includes(row.status) || !Number.isFinite(createdAt) || now - createdAt >= REPORT_EXPIRY_MS) continue
    unique.add(row.id)
  }
  return unique.size
}

export async function getStationLineReportSummary(stationId) {
  if (!isSupabaseConfigured || !stationId) return []
  const { data, error } = await supabase.rpc('get_station_line_report_summary', { p_station_id: stationId })
  if (error) throw error
  return (data || []).map((row) => ({ lineId: row.line_id, reportCount: Number(row.report_count) || 0 }))
}

export async function getStationReportSummary(stationId) {
  if (!isSupabaseConfigured || !stationId) return 0
  const { data, error } = await supabase.rpc('get_station_report_summary', { p_station_id: stationId })
  if (error) throw error
  return Number(data) || 0
}

export async function getLineReportSummary(lineId) {
  if (!isSupabaseConfigured || !lineId) return 0
  const { data, error } = await supabase.rpc('get_line_report_summary', { p_line_id: lineId })
  if (error) throw error
  return Number(data) || 0
}

export async function getLineReportBreakdown(lineId) {
  if (!isSupabaseConfigured || !lineId) return []
  const { data, error } = await supabase.rpc('get_line_report_breakdown', { p_line_id: lineId })
  if (error) throw error
  return (data || []).map((row) => ({ category: row.category, scope: row.scope, reportCount: Number(row.report_count) || 0 }))
}

export function subscribeToCanonicalReports(onRefresh) {
  if (!isSupabaseConfigured) return () => {}
  let disposed = false
  const channel = supabase
    .channel(`canonical-reports-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_lines' }, onRefresh)
    .subscribe((status) => {
      if (!disposed && status === 'SUBSCRIBED') onRefresh()
    })
  return () => {
    disposed = true
    supabase.removeChannel(channel)
  }
}
