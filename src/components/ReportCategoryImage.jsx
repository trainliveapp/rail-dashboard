import { images } from '../data/optimizedImages'
import SmoothImage from './SmoothImage'

const categoryImages = {
  delays: images.reportDelays,
  police: images.reportPolice,
  safety: images.reportSafety,
  revenue: images.reportRevenue,
  antisocial: images.reportAntisocial,
  harassment_violence: images.reportHarassment,
  fare_dodgers: images.reportFareDodgers,
}

export default function ReportCategoryImage({ category, className = '' }) {
  return (
    <SmoothImage
      {...categoryImages[category]}
      sizes="80px"
      loading="eager"
      alt=""
      draggable={false}
      width={80}
      height={80}
      className={`shrink-0 rounded-full object-contain ${className}`}
    />
  )
}
