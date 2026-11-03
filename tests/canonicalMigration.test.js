import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = new URL('../supabase/migrations/20261103000000_canonical_station_reporting.sql', import.meta.url)

test('canonical migration protects station-line mappings and supports station-wide reports', async () => {
  const sql = await readFile(migrationPath, 'utf8')
  assert.match(sql, /create table if not exists public\.stations/)
  assert.match(sql, /create table if not exists public\.lines/)
  assert.match(sql, /create table if not exists public\.station_lines/)
  assert.match(sql, /external_source_id/)
  assert.match(sql, /valid_from date/)
  assert.match(sql, /colour/)
  assert.match(sql, /on conflict \(normalized_name\) do update set id = excluded\.id/)
  assert.match(sql, /group by lower\(regexp_replace\(trim\(station_name\).*on conflict \(normalized_name\) do nothing/s)
  assert.match(sql, /create table if not exists public\.reports/)
  assert.match(sql, /create table if not exists public\.report_lines/)
  assert.match(sql, /That line is not mapped to this station/)
  assert.match(sql, /select canonical\.id, sl\.line_id/)
  assert.match(sql, /count\(distinct r\.id\)/)
  assert.match(sql, /get_station_report_summary/)
  assert.match(sql, /get_line_report_summary/)
  assert.match(sql, /get_line_report_breakdown/)
  assert.match(sql, /station_updates su/)
  assert.match(sql, /union/)
  assert.match(sql, /security_invoker = true/)
  assert.match(sql, /expires_at > now\(\)/)
  assert.match(sql, /interval '24 hours'/)
  assert.match(sql, /scope in \('station_wide', 'line_specific'\)/)
  assert.match(sql, /alter publication supabase_realtime add table public\.reports/)
  assert.match(sql, /alter table public\.reports enable row level security/)
  assert.match(sql, /drop policy if exists "Public can read active canonical reports"/)
  assert.match(sql, /drop policy if exists "Public can read report line mappings"/)
  assert.match(sql, /revoke insert, update, delete on public\.reports/)
  assert.match(sql, /on conflict do nothing/)
  assert.match(sql, /Duplicate submissions return the same row|next_allowed_at/)
})

test('client refreshes on realtime reconnect and expiry without duplicating rows', async () => {
  const [updates, canonical] = await Promise.all([
    readFile(new URL('../src/lib/stationUpdates.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/canonicalReports.js', import.meta.url), 'utf8'),
  ])
  assert.match(updates, /status === 'SUBSCRIBED'/)
  assert.match(updates, /onReconnect\?\.\(\)/)
  assert.match(canonical, /status === 'SUBSCRIBED'/)
  assert.match(canonical, /removeChannel/)
  assert.match(canonical, /station-report-saved/)
})
