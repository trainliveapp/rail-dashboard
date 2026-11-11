import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import ModalDialog from './ModalDialog'
import { supabase } from '../supabase'
import { submitPublicForm, validatePublicForm } from '../lib/publicFormValidation'
import './PublicForms.css'

export default function FlavioNotifyDialog({ onClose }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (status === 'sending') return
    const result = validatePublicForm('notify', { email, consent })
    if (result.error) { setError(result.error); return }
    setStatus('sending'); setError('')
    try { await submitPublicForm(supabase.functions, 'flavio-notify', result.value); setStatus('success') }
    catch (err) { setError(err.message); setStatus('idle') }
  }
  return <ModalDialog className="form-dialog" aria-labelledby="notify-title" onClose={onClose}>
    <button type="button" className="dialog-close" aria-label="Close launch notification" onClick={onClose}><X size={20} /></button>
    <Bell size={32} className="form-dialog-icon" aria-hidden="true" />
    <h2 id="notify-title">Be first to meet Flavio.</h2>
    {status === 'success' ? <div role="status"><p>You’re on the list. We’ll email you when Flavio launches.</p><button type="button" className="public-form-submit" onClick={onClose}>Done</button></div> : <form onSubmit={submit}>
      <p>Get one email when your AI Travel Companion is ready.</p>
      <label htmlFor="notify-email">Email address</label>
      <input id="notify-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} autoFocus />
      <label className="public-form-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I agree to receive a Flavio launch notification by email.</span></label>
      <p className="public-form-privacy">Your email is stored only for this notification, not unrelated marketing.</p>
      <button type="submit" className="public-form-submit" disabled={status === 'sending'}>{status === 'sending' ? 'Saving…' : 'Notify me'}</button>
      <p className="public-form-privacy">Launch notification only. No spam.</p>
      {error && <p role="alert" className="public-form-error">{error}</p>}
    </form>}
  </ModalDialog>
}
