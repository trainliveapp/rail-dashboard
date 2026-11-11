import test from 'node:test'
import assert from 'node:assert/strict'
import { createAdvertisingSubmit } from '../supabase/functions/_shared/advertisingDelivery.js'
import { validatePublicForm } from '../src/lib/publicFormValidation.js'
const input = { email: 'business@example.test', company: 'Example Ltd', message: 'Please send information about station advertising.', consent: true }

test('advertising validates minimum required business details and explicit consent', () => {
  assert.deepEqual(validatePublicForm('advertising', input).value, input)
  for (const bad of [{ company: '' }, { company: 'A\nB' }, { message: 'short' }, { message: 'x'.repeat(4001) }, { consent: false }, { email: 'invalid' }]) assert.ok(validatePublicForm('advertising', { ...input, ...bad }).error)
})
test('missing destination configuration collects nothing and sends nothing', async () => {
  let touched = false
  const submit = createAdvertisingSubmit({ configured: false, prepare() { touched = true } })
  assert.equal(await submit(input, 'hash'), 'unavailable')
  assert.equal(touched, false)
})
test('successful delivery requires provider receipt and database acknowledgement', async () => {
  const calls = []
  const submit = createAdvertisingSubmit({ configured: true, prepare: async () => ({ id: 'stable-enquiry-id', state: 'pending' }), deliver: async (body, id) => { calls.push(['deliver', id]); assert.equal(body.company, input.company); return { id: 'receipt' } }, markDelivered: async (id, receipt) => { calls.push(['saved', id, receipt]) } })
  assert.equal(await submit(input, 'hash'), 'success')
  assert.deepEqual(calls, [['deliver', 'stable-enquiry-id'], ['saved', 'stable-enquiry-id', 'receipt']])
})
test('duplicates do not resend and rate limiting never calls delivery', async () => {
  for (const [record, expected] of [[{ id: 'id', state: 'sent' }, 'success'], [{ state: 'rate_limited' }, 'rate_limited']]) {
    const submit = createAdvertisingSubmit({ configured: true, prepare: async () => record, deliver() { assert.fail('must not send') } })
    assert.equal(await submit(input, 'hash'), expected)
  }
})
test('failed provider, missing receipt and failed persistence never claim delivery', async () => {
  const base = { configured: true, prepare: async () => ({ id: 'id', state: 'pending' }), deliver: async () => ({ id: 'receipt' }), markDelivered: async () => {} }
  assert.equal(await createAdvertisingSubmit({ ...base, deliver: async () => ({}) })(input, 'hash'), 'unavailable')
  await assert.rejects(createAdvertisingSubmit({ ...base, deliver: async () => { throw Error('provider offline') } })(input, 'hash'))
  await assert.rejects(createAdvertisingSubmit({ ...base, markDelivered: async () => { throw Error('database offline') } })(input, 'hash'))
})
