import { useRef, useState } from 'react'
import { ArrowRight, Building2, CircleCheck, Mail, Megaphone, MessageSquare, X } from 'lucide-react'
import BrandLogo from './BrandLogo'
import ModalDialog from './ModalDialog'
import { supabase } from '../supabase'
import { submitPublicForm, validatePublicForm } from '../lib/publicFormValidation'
import './PublicForms.css'

export default function AdvertisingEnquiryDialog({ onClose }) {
  const [values, setValues] = useState({ email: '', company: '', message: '', consent: false })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const handleGesture = useRef(null)
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
  return <ModalDialog className="form-dialog advertising-dialog" aria-labelledby="advertising-title" onClose={onClose}>
    <header className="advertising-dialog-header">
      <button type="button" className="advertising-sheet-handle" aria-label="Close advertising enquiry" onClick={() => {
        if (!handleGesture.current?.moved) onClose()
        handleGesture.current = null
      }} onPointerDown={event => {
        handleGesture.current = { y: event.clientY, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }} onPointerUp={event => {
        if (!handleGesture.current) return
        const distance = event.clientY - handleGesture.current.y
        handleGesture.current.moved = Math.abs(distance) > 10
        if (distance >= 40) onClose()
      }} onPointerCancel={() => { handleGesture.current = { moved: true } }}><span aria-hidden="true" /></button>
      <div className="advertising-header-top"><BrandLogo className="advertising-navbar-logo" />
      <button type="button" className="dialog-close" aria-label="Close advertising enquiry" onClick={onClose}><X size={20} /></button>
      </div>
    <div className="advertising-dialog-intro"><Megaphone aria-hidden="true" /><div>
      <h2 id="advertising-title">Advertise with StationLive</h2>
      <p>Reach thousands of rail travellers across London and the UK.</p>
    </div></div>
    </header>
    <div className="advertising-dialog-body">
    {status === 'success' ? <div role="status" className="advertising-success"><CircleCheck aria-hidden="true" /><p>Your enquiry has been sent. The advertising team will reply to your business email.</p><button type="button" className="public-form-submit" onClick={onClose}>Done</button></div> : <form onSubmit={submit}>
      <label htmlFor="advertising-email">Business email</label>
      <div className="advertising-field"><Mail aria-hidden="true" /><input id="advertising-email" type="email" placeholder="you@company.com" autoComplete="email" maxLength={254} required value={values.email} onChange={event => update('email', event.target.value)} autoFocus /></div>
      <label htmlFor="advertising-company">Company</label>
      <div className="advertising-field"><Building2 aria-hidden="true" /><input id="advertising-company" placeholder="Company / Business" autoComplete="organization" minLength={2} maxLength={120} required value={values.company} onChange={event => update('company', event.target.value)} /></div>
      <label htmlFor="advertising-message">Message</label>
      <div className="advertising-field advertising-field-message"><MessageSquare aria-hidden="true" /><textarea id="advertising-message" placeholder="Tell us about your campaign" minLength={20} maxLength={4000} required value={values.message} onChange={event => update('message', event.target.value)} /></div>
      <label className="public-form-consent"><input type="checkbox" required checked={values.consent} onChange={event => update('consent', event.target.checked)} /><span>I agree to be contacted about this advertising enquiry.</span></label>
      <p className="public-form-privacy">We use these details to respond to your enquiry, not unrelated marketing.</p>
      <button type="submit" className="public-form-submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send enquiry'}<ArrowRight size={18} aria-hidden="true" /></button>
      <p className="advertising-reply-note"><CircleCheck size={16} aria-hidden="true" />We’ll get back to you soon.</p>
      {error && <p className="public-form-error" role="alert">{error}</p>}
    </form>}
    </div>
  </ModalDialog>
}
