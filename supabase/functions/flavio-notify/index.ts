import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPublicFormHandler } from '../_shared/publicFormHandler.js'
import { formOrigins, hashFormIp } from '../_shared/formRuntime.ts'

Deno.serve(createPublicFormHandler('notify', {
  origins: formOrigins(), hashIp: hashFormIp,
  submit: async (input: { email: string }, ipHash: string) => {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await db.rpc('submit_flavio_notification', { p_email: input.email, p_ip_hash: ipHash })
    if (error) throw error
    return data
  },
}))
