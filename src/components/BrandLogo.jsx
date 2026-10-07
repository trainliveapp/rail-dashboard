import logo from '../assets/avviso-logo-transparent.png'

export default function BrandLogo({ className = '', framed = false }) {
  return (
    <span className={framed ? 'inline-flex rounded-xl bg-[#17233f] p-1.5' : ''}>
      <img src={logo} alt="Avviso" className={`h-auto w-auto object-contain ${className}`} />
    </span>
  )
}
