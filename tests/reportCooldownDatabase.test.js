import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

test('database limits report submissions and permits only the reporter to undo without resetting cooldown', {
  skip: !process.env.REVIEW_TEST_PGLITE_MODULE,
}, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.REVIEW_TEST_PGLITE_MODULE).href)
  const db = new PGlite()
  const token = '00000000-0000-0000-0000-000000000001'
  const other = '00000000-0000-0000-0000-000000000002'
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      create publication supabase_realtime;
    `)
    await db.exec(await readFile(new URL('../supabase/migrations/20240819000000_station_reporting_schema.sql', import.meta.url), 'utf8'))
    await db.exec('grant usage on schema public, auth to anon, authenticated; grant select, insert, update, delete on public.station_updates to anon, authenticated;')
    await db.exec(await readFile(new URL('../supabase/migrations/20261031000000_station_report_cooldown.sql', import.meta.url), 'utf8'))
    const submit = (guest = token) => db.query('select public.submit_station_report($1, $2::jsonb) as state', [guest, JSON.stringify({ station_name: 'Victoria', category: 'delays', message: 'Delays' })])
    const undo = (guest = token) => db.query('select public.undo_station_report($1) as state', [guest])
    await db.exec('set role anon')
    const state = (await submit()).rows[0].state
    await assert.rejects(submit(), /30 minutes/)
    await assert.rejects(undo(other), /No report/)
    await assert.rejects(db.exec("insert into public.station_updates(kind) values ('report')"), /row-level security/)
    await assert.rejects(db.exec("update public.station_updates set status = 'RESOLVED'"), /permission denied/)
    const undone = (await undo()).rows[0].state
    assert.equal(undone.report.status, 'RESOLVED')
    assert.equal(undone.undone, true)
    assert.equal(undone.next_allowed_at, state.next_allowed_at)
    assert.equal((await undo()).rows[0].state.next_allowed_at, state.next_allowed_at)
    await assert.rejects(submit(), /30 minutes/)
    await submit(other)
    await db.exec("reset role; update public.station_report_submissions set next_allowed_at = now() - interval '1 second'; set role anon;")
    await assert.rejects(undo(), /window has ended/)
    assert.notEqual((await submit()).rows[0].state.report.id, state.report.id)

    // Account limits follow the account even with a different guest token.
    await db.exec(`reset role; insert into auth.users values ('${token}'); set role authenticated;`)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [token])
    await submit()
    await assert.rejects(submit(other), /30 minutes/)
    assert.equal((await undo(other)).rows[0].state.report.status, 'RESOLVED')
  } finally { await db.close() }
})
