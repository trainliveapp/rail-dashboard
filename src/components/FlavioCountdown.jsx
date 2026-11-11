import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { calendarCountdown, parseLaunchTimestamp } from '../lib/flavioCountdown'

export default function FlavioCountdown() {
  const [target, setTarget] = useState(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let cancelled = false
    supabase.functions.invoke('flavio-config', { method: 'GET' }).then(({ data, error }) => {
      if (!cancelled && !error) setTarget(parseLaunchTimestamp(data?.launchAt))
    }).catch(() => { /* An unconfirmed launch date must never become a visitor-specific countdown. */ })
    const refresh = () => { if (!document.hidden) setNow(new Date()) }
    const timer = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('pageshow', refresh) }
  }, [])
  if (!target) return <p className="flavio-launch-pending" role="status">Launch date to be announced</p>
  const countdown = calendarCountdown(now, target)
  return <section className="flavio-countdown" aria-label="Flavio launch countdown">
    <strong>{now >= target ? 'Launch time reached' : 'Launching in'}</strong>
    <dl>{Object.entries(countdown).map(([unit, value]) => <div key={unit}><dt>{unit}</dt><dd>{String(value).padStart(2, '0')}</dd></div>)}</dl>
  </section>
}
