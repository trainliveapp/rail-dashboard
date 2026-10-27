import delaysImage from '../assets/2303.png'
import policeImage from '../assets/2290.png'
import safetyImage from '../assets/2306.png'
import revenueImage from '../assets/2293.png'
import antisocialImage from '../assets/2312.png'
import harassmentImage from '../assets/2302.png'
import fareDodgersImage from '../assets/2313.png'

const categoryImages = {
  delays: delaysImage,
  police: policeImage,
  safety: safetyImage,
  revenue: revenueImage,
  antisocial: antisocialImage,
  harassment_violence: harassmentImage,
  fare_dodgers: fareDodgersImage,
}

export default function ReportCategoryImage({ category, className = '' }) {
  return (
    <img
      src={categoryImages[category]}
      alt=""
      draggable={false}
      width={80}
      height={80}
      className={`shrink-0 rounded-full object-contain ${className}`}
    />
  )
}
