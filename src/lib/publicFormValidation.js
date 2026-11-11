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
  const status = error?.context?.status
  if (status === 429) throw new Error('Too many attempts. Please try again later.')
  if (status === 404) throw new Error('This form is temporarily unavailable. Please try again later.')
  if (status === 401 || status === 403) throw new Error('This form could not connect securely. Please try again later.')
  if (status >= 500) throw new Error('We could not save your details right now. Please try again shortly.')
  if (error?.name === 'FunctionsFetchError' || error?.name === 'FunctionsRelayError') {
    throw new Error('Unable to reach the notification service. Check your connection and try again.')
  }
  if (error || data?.ok !== true) throw new Error(data?.error || 'Could not submit your details. Please try again.')
  return data
}
