import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Bike, Map, ShoppingBag, X } from 'lucide-react'
import flavioAvatar from '../assets/flavio-avatar.webp'
import FlavioLauncher from './FlavioLauncher'

const FEATURES = [
  { icon: Map, title: 'Journey planning', text: 'routes and connections', tone: 'blue' },
  { icon: Bell, title: 'Station updates', text: 'disruption, engineering works and live information', tone: 'blue' },
  { icon: Bike, title: 'Greener travel', text: 'cycling between stations and walking alternatives', tone: 'green' },
  { icon: ShoppingBag, title: 'Station discoveries', text: 'retail, food, facilities and services', tone: 'blue' },
]

export default function FlavioComingSoonSheet({ launcherTarget = null }) {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef(null)
  const closeButtonRef = useRef(null)

  const close = () => {
    setOpen(false)
    window.requestAnimationFrame(() => launcherRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        close()
        return
      }

      if (event.key !== 'Tab') return
      const dialog = document.querySelector('.flavio-sheet')
      const focusable = dialog?.querySelectorAll('button:not([disabled])')
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      {!open && launcherTarget && createPortal(
        <FlavioLauncher buttonRef={launcherRef} onOpen={() => setOpen(true)} />,
        launcherTarget
      )}

      {open && (
        <div className="flavio-overlay" role="presentation">
          <button type="button" className="flavio-backdrop" aria-label="Close Flavio panel" onClick={close} />
          <section className="flavio-sheet" role="dialog" aria-modal="true" aria-labelledby="flavio-title">
            <div className="flavio-sheet__handle" aria-hidden="true"><span /></div>
            <header className="flavio-sheet__header">
              <img src={flavioAvatar} alt="Flavio" className="flavio-sheet__avatar" />
              <div>
                <h2 id="flavio-title">Flavio</h2>
                <p>Your AI Travel Companion</p>
              </div>
              <button ref={closeButtonRef} type="button" className="flavio-sheet__close" aria-label="Close Flavio panel" onClick={close}>
                <X size={20} />
              </button>
            </header>

            <div className="flavio-sheet__body">
              <h3>Flavio is coming soon</h3>
              <p className="flavio-sheet__description">
                Your personal AI companion for smarter journeys, station updates, greener travel and station discoveries — from cycling between stations to retail, food and more.
              </p>
              <div className="flavio-features">
                {FEATURES.map(({ icon: Icon, title, text, tone }) => (
                  <article className={`flavio-feature flavio-feature--${tone}`} key={title}>
                    <span className="flavio-feature__icon" aria-hidden="true"><Icon size={18} strokeWidth={2.2} /></span>
                    <div><h4>{title}</h4><p>{text}</p></div>
                  </article>
                ))}
              </div>
              <div className="flavio-preview" aria-disabled="true">
                <span>Ask Flavio anything…</span>
                <strong>Coming soon</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
