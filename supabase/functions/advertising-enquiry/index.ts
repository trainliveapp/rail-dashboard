import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPublicFormHandler } from '../_shared/publicFormHandler.js'
import { createAdvertisingSubmit } from '../_shared/advertisingDelivery.js'
import { formOrigins, hashFormIp } from '../_shared/formRuntime.ts'
import { normalizeEmail } from '../../../src/lib/publicFormValidation.js'

// Set only to the founder-confirmed destination; never infer it from a mock-up.
const to = normalizeEmail(Deno.env.get('ADVERTISING_TO_EMAIL'))
const from = Deno.env.get('FORMS_FROM_EMAIL')
const apiKey = Deno.env.get('RESEND_API_KEY')
const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const configured = Boolean(to && normalizeEmail(from) && apiKey && url && serviceKey)
const submit = createAdvertisingSubmit({
  configured,
  prepare: async (input: { email: string; company: string; message: string }, ipHash: string) => {
    const db = createClient(url!, serviceKey!)
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([input.email, input.company, input.message])))
    const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
    const { data, error } = await db.rpc('prepare_advertising_enquiry', { p_email: input.email, p_company: input.company, p_message: input.message, p_ip_hash: ipHash, p_fingerprint: fingerprint })
    if (error) throw error
    return data
  },
  deliver: async (input: { email: string; company: string; message: string }, id: string) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `stationlive-advertising-${id}` },
      body: JSON.stringify({ from, to: [to], reply_to: input.email, subject: `StationLive advertising enquiry: ${input.company}`, text: `Company: ${input.company}\nBusiness email: ${input.email}\n\n${input.message}` }),
    })
    if (!response.ok) throw new Error('Delivery failed.')
    return await response.json()
  },
  markDelivered: async (id: string, receiptId: string) => {
    const db = createClient(url!, serviceKey!)
    const { error } = await db.from('advertising_enquiries').update({ delivered_at: new Date().toISOString(), delivery_receipt: receiptId }).eq('id', id)
    if (error) throw error
  },
})
Deno.serve(createPublicFormHandler('advertising', { origins: formOrigins(), hashIp: hashFormIp, submit }))
