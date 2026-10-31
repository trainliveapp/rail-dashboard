import { images } from '../data/optimizedImages'

const logo = images.brandLogo.src

export default function BrandLogo({ className = '', framed = false, iconOnly = false }) {
  if (iconOnly) {
    return (
      <span className={`relative inline-block overflow-hidden ${className}`}>
        <svg role="img" aria-label="Avviso Live" viewBox="460 1050 850 900" className="h-full w-full">
          <image href={logo} width="3000" height="3000" />
        </svg>
      </span>
    )
  }

  return (
      <svg role="img" aria-label="Avviso Live" viewBox="450 1040 2100 920" width="2100" height="920" className={`inline-block h-auto w-auto object-contain ${framed ? 'rounded-xl bg-[#17233f] p-1.5' : ''} ${className}`}>
        <image href={logo} width="3000" height="3000" />
      </svg>
  )
}
