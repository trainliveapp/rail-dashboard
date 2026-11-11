import { useState } from 'react'
import { X } from 'lucide-react'
import stationLiveLogo from '../assets/logo.png'
import ModalDialog from './ModalDialog'
import { supabase } from '../supabase'
import { submitPublicForm, validatePublicForm } from '../lib/publicFormValidation'
import './PublicForms.css'

export default function AdvertisingEnquiryDialog({ onClose }) {
  const [values, setValues] = useState({ email: '', company: '', message: '', consent: false })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const update = (key, value) => setValues(previous => ({ ...previous, [key]: value }))
  async function submit(event) {
    event.preventDefault()
    if (status === 'sending') return
    const result = validatePublicForm('advertising', values)
    if (result.error) { setError(result.error); return }
    setStatus('sending'); setError('')
    try { await submitPublicForm(supabase.functions, 'advertising-enquiry', result.value); setStatus('success') }
    catch (err) { setError(err.message); setStatus('idle') }
  }
  return <ModalDialog className="form-dialog" aria-labelledby="advertising-title" onClose={onClose}>
    <button type="button" className="dialog-close" aria-label="Close advertising enquiry" onClick={onClose}><X size={20} /></button>
    <img className="advertising-enquiry-logo" src={stationLiveLogo} width={1048} height={490} alt="StationLive" />
    <h2 id="advertising-title">Advertise with StationLive</h2>
    {status === 'success' ? <div role="status"><p>Your enquiry has been sent. The advertising team will reply to your business email.</p><button type="button" className="public-form-submit" onClick={onClose}>Done</button></div> : <form onSubmit={submit}>
      <p>Tell us how you would like to reach rail travellers.</p>
      <label htmlFor="advertising-email">Business email</label>
      <input id="advertising-email" type="email" autoComplete="email" maxLength={254} required value={values.email} onChange={event => update('email', event.target.value)} autoFocus />
      <label htmlFor="advertising-company">Company</label>
      <input id="advertising-company" autoComplete="organization" minLength={2} maxLength={120} required value={values.company} onChange={event => update('company', event.target.value)} />
      <label htmlFor="advertising-message">Message</label>
      <textarea id="advertising-message" minLength={20} maxLength={4000} required value={values.message} onChange={event => update('message', event.target.value)} />
      <label className="public-form-consent"><input type="checkbox" required checked={values.consent} onChange={event => update('consent', event.target.checked)} /><span>I agree to be contacted about this advertising enquiry.</span></label>
      <p className="public-form-privacy">We use these details to respond to your enquiry, not unrelated marketing.</p>
      <button type="submit" className="public-form-submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
      {error && <p className="public-form-error" role="alert">{error}</p>}
    </form>}
  </ModalDialog>
}
