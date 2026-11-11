import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEmail, validatePublicForm, submitPublicForm } from '../src/lib/publicFormValidation.js'
import { createPublicFormHandler } from '../supabase/functions/_shared/publicFormHandler.js'
const origin = 'https://stationlive.example'
const valid = { email: ' Person@Example.com ', consent: true }
const request = (body, options = {}) => new Request(origin + '/api', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.1' }, body: JSON.stringify(body), ...options })
function handler(submit) { return createPublicFormHandler('notify', { origins: [origin], hashIp: async () => 'hashed-ip', submit }) }

test('notification validation normalizes email and requires explicit consent', () => {
  assert.equal(normalizeEmail(valid.email), 'person@example.com')
  for (const email of ['no-at', 'a@b', 'a@b.com\r\nBcc:attacker@example.com', '<x>@b.com', 'x'.repeat(255)+'@b.com']) assert.equal(normalizeEmail(email), null)
  assert.ok(validatePublicForm('notify', { ...valid, consent: 'true' }).error)
  assert.deepEqual(validatePublicForm('notify', { ...valid, extra: 'never stored' }).value, { email: 'person@example.com', consent: true })
})
test('successful notification only confirms after storage succeeds', async () => {
  let saved
  const response = await handler(async (input, hash) => { saved = { input, hash }; return 'success' })(request(valid))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(saved.hash, 'hashed-ip')
  assert.equal(saved.input.email, 'person@example.com')
})
test('invalid email, missing consent, untrusted origin and oversized body never write', async () => {
  let writes = 0
  const handle = handler(async () => { writes++; return 'success' })
  assert.equal((await handle(request({ ...valid, email: 'bad' }))).status, 400)
  assert.equal((await handle(request({ ...valid, consent: false }))).status, 400)
  assert.equal((await handle(request(valid, { headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' } }))).status, 403)
  assert.equal((await handle(request({ ...valid, extra: 'x'.repeat(20001) }))).status, 413)
  assert.equal(writes, 0)
})
test('rate limiting and storage failures never return signup success', async () => {
  assert.equal((await handler(async () => 'rate_limited')(request(valid))).status, 429)
  const response = await handler(async () => { throw Error('private database secret') })(request(valid))
  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes('private database secret'), false)
})
test('malformed JSON and unsupported methods are rejected', async () => {
  const handle = handler(async () => 'success')
  assert.equal((await handle(request(valid, { body: '{' }))).status, 400)
  assert.equal((await handle(new Request(origin, { headers: { Origin: origin } }))).status, 405)
  assert.equal((await handle(request(valid, { headers: { Origin: origin, 'Content-Type': 'text/plain' } }))).status, 415)
})
test('client requires affirmative backend success', async () => {
  for (const result of [{ data: null, error: Error('offline') }, { data: { ok: false }, error: null }, { data: {}, error: null }]) {
    await assert.rejects(submitPublicForm({ invoke: async () => result }, 'flavio-notify', valid))
  }
  assert.deepEqual(await submitPublicForm({ invoke: async () => ({ data: { ok: true } }) }, 'flavio-notify', valid), { ok: true })
})

test('client explains unavailable endpoints, authorization, rate limits and outages without claiming success', async () => {
  for (const [status, message] of [[404, /temporarily unavailable/], [401, /connect securely/], [403, /connect securely/], [429, /Too many attempts/], [503, /could not save/]]) {
    await assert.rejects(submitPublicForm({ invoke: async () => ({ data: null, error: { context: new Response('{}', { status }) } }) }, 'flavio-notify', valid), message)
  }
  await assert.rejects(submitPublicForm({ invoke: async () => ({ error: { name: 'FunctionsFetchError' } }) }, 'flavio-notify', valid), /Check your connection/)
})
