export function formOrigins() { return (Deno.env.get('PUBLIC_FORM_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean) }
export async function hashFormIp(ip: string) {
  const secret = Deno.env.get('FORM_RATE_LIMIT_SECRET')
  if (!secret || secret.length < 32) throw new Error('Rate limiting is not configured.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
