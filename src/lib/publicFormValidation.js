export function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null
}

export function validatePublicForm(kind, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Please check your form details.' }
  const email = normalizeEmail(input.email)
  if (!email) return { error: 'Enter a valid email address.' }
  if (input.consent !== true) return { error: 'Please give permission for us to respond.' }
  if (kind === 'notify') return { value: { email, consent: true } }
  if (kind !== 'advertising') return { error: 'Unknown form.' }
  const company = typeof input.company === 'string' ? input.company.trim() : ''
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  if (company.length < 2 || company.length > 120 || /[\r\n]/.test(company)) return { error: 'Enter a company name between 2 and 120 characters.' }
  if (message.length < 20 || message.length > 4000) return { error: 'Enter a message between 20 and 4,000 characters.' }
  return { value: { email, company, message, consent: true } }
}

export async function submitPublicForm(functions, name, body) {
  const { data, error } = await functions.invoke(name, { body })
  if (error?.context?.status === 429) throw new Error('Too many attempts. Please try again later.')
  if (error || data?.ok !== true) throw new Error(data?.error || 'Could not submit your details. Please try again.')
  return data
}
