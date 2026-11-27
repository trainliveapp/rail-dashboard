import cleanliness from '../assets/review-cleanliness.webp'
import customerService from '../assets/review-customer-service.webp'
import staffVisibility from '../assets/review-staff-visibility.webp'
import accessibility from '../assets/review-accessibility.webp'
import facilities from '../assets/review-facilities.webp'

const icons = {
  cleanliness,
  staffFriendliness: customerService,
  staffVisibility,
  accessibility,
  facilities,
}

export default function ReviewCategoryIcon({ category, size = 24, width, height }) {
  const src = icons[category]
  if (!src) return null
  const iconWidth = width ?? (category === 'facilities' ? 46 : size)
  const iconHeight = height ?? (category === 'facilities' ? 46 : size)
  return <img src={src} width={iconWidth} height={iconHeight} alt="" aria-hidden="true" />
}
