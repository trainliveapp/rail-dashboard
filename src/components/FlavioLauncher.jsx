import { Sparkles } from 'lucide-react'
import flavioAvatar from '../assets/flavio-avatar.webp'

export default function FlavioLauncher({ buttonRef, onOpen }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="flavio-launcher"
      aria-label="Open Flavio AI Travel Companion"
      onClick={onOpen}
    >
      <img src={flavioAvatar} alt="Flavio, your AI Travel Companion" />
      <span className="flavio-launcher__sparkle" aria-hidden="true">
        <Sparkles size={11} strokeWidth={3} />
      </span>
    </button>
  )
}
