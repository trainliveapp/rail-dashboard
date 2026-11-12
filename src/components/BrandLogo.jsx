const logo = `${import.meta.env.BASE_URL}StationLive_HandBuilt_Master.svg`

export default function BrandLogo({ className = '', framed = false }) {
  return (
    <img
      src={logo}
      alt="Station Live"
      width="1536"
      height="768"
      className={`inline-block object-contain ${framed ? 'rounded-xl bg-[#17233f] p-1.5' : ''} ${className}`}
    />
  )
}
