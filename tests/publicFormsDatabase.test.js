import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { CHAT_CHANNELS } from '../src/data/chatChannels.js'

test('public forms SQL enforces consent storage, deduplication, rate limits and private access', { skip: !process.env.PUBLIC_FORMS_TEST_PSQL }, async t => {
  const psql = process.env.PUBLIC_FORMS_TEST_PSQL
  const env = { ...process.env, PGDATABASE: 'postgres' }
  const run = (sql, connection = env) => execFileSync(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { env: connection, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  const name = `qa_public_forms_${Date.now()}`
  run(`create database ${name}`)
  const isolated = { ...env, PGDATABASE: name }
  const query = sql => run(sql, isolated)
  try {
    query(`do $$ begin create role anon; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
      grant usage on schema public to anon, authenticated, service_role;`)
    execFileSync(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', fileURLToPath(new URL('../supabase/migrations/20261111000000_public_enquiry_forms.sql', import.meta.url))], { env: isolated, stdio: ['pipe', 'pipe', 'pipe'] })
    const hash = 'a'.repeat(64)
    await t.test('deduplicates normalized notification addresses with consent provenance', () => {
      for (let i = 0; i < 2; i++) assert.equal(query(`set role service_role; select public.submit_flavio_notification('Person@Example.test','${hash}');`), 'success')
      assert.equal(query('select count(*) from public.flavio_notifications'), '1')
      assert.equal(query("select email || ':' || consent_version from public.flavio_notifications"), 'person@example.test:flavio-launch-only-v1')
    })
    await t.test('sixth hourly attempt is rejected without inserting an address', () => {
      for (let i = 2; i < 5; i++) assert.equal(query(`set role service_role; select public.submit_flavio_notification('person@example.test','${hash}');`), 'success')
      assert.equal(query(`set role service_role; select public.submit_flavio_notification('other@example.test','${hash}');`), 'rate_limited')
      assert.equal(query('select count(*) from public.flavio_notifications'), '1')
    })
    await t.test('concurrent submissions share one atomic hourly budget', async () => {
      const sql = `set role service_role; select public.submit_flavio_notification('concurrent@example.test','${'e'.repeat(64)}');`
      const results = await Promise.all(Array.from({ length: 10 }, () => promisify(execFile)(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { env: isolated })))
      const states = results.map(result => result.stdout.trim())
      assert.equal(states.filter(state => state === 'success').length, 5)
      assert.equal(states.filter(state => state === 'rate_limited').length, 5)
      assert.equal(query("select count(*) from public.flavio_notifications where email='concurrent@example.test'"), '1')
    })
    await t.test('anonymous and authenticated clients cannot read private details or invoke writers', () => {
      for (const role of ['anon', 'authenticated']) {
        for (const table of ['flavio_notifications', 'advertising_enquiries', 'form_rate_limits']) assert.throws(() => query(`set role ${role}; select * from public.${table};`), /permission denied/)
        assert.throws(() => query(`set role ${role}; select public.submit_flavio_notification('evil@example.test','${hash}');`), /permission denied/)
      }
    })
    await t.test('enquiry retries reuse the ID and retain delivered state', () => {
      const args = `'business@example.test','Example Ltd','Please send details about advertising.','${'b'.repeat(64)}','${'c'.repeat(64)}'`
      const first = JSON.parse(query(`set role service_role; select public.prepare_advertising_enquiry(${args});`))
      assert.equal(first.state, 'pending')
      const retry = JSON.parse(query(`set role service_role; select public.prepare_advertising_enquiry(${args});`))
      assert.equal(retry.id, first.id)
      query(`set role service_role; update public.advertising_enquiries set delivered_at=now(), delivery_receipt='test-receipt' where id='${first.id}';`)
      assert.equal(JSON.parse(query(`set role service_role; select public.prepare_advertising_enquiry(${args});`)).state, 'sent')
      assert.equal(query('select count(*) from public.advertising_enquiries'), '1')
      assert.throws(() => query(`set role service_role; select public.submit_flavio_notification('invalid','${'d'.repeat(64)}');`), /check constraint/)
    })
    await t.test('every active line/operator ID resolves to its explicit report mapping', () => {
      execFileSync(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', fileURLToPath(new URL('../supabase/migrations/20261110000000_fix_hammersmith_channel_mapping.sql', import.meta.url))], { env: isolated, stdio: ['pipe', 'pipe', 'pipe'] })
      for (const channel of CHAT_CHANNELS) assert.equal(query(`select public.channel_report_line_id('${channel.id}')`), channel.reportLineId || '', channel.id)
    })
  } finally { run(`drop database ${name} with (force)`) }
})
