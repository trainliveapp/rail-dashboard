import logo from '../assets/avviso-logo-transparent.png'

export default function BrandLogo({ className = '', framed = false, iconOnly = false }) {
  if (iconOnly) {
    return (
      <span className={`relative inline-block overflow-hidden ${className}`}>
        <img
          src={logo}
          alt="Avviso"
          className="absolute left-0 top-0 h-[200%] max-w-none object-contain"
        />
      </span>
    )
  }

  return (
    <span className={framed ? 'inline-flex rounded-xl bg-[#17233f] p-1.5' : ''}>
      <img src={logo} alt="Avviso" className={`h-auto w-auto object-contain ${className}`} />
    </span>
  )
}
