import cleanliness from '../assets/01_cleanliness.svg'
import customerService from '../assets/02_customer_service.svg'
import staffVisibility from '../assets/03_staff_visibility.svg'
import accessibility from '../assets/04_accessibility.svg'
import facilities from '../assets/Restroom and Bed Amenities Icons.png'

const icons = {
  cleanliness,
  staffFriendliness: customerService,
  staffVisibility,
  accessibility,
  facilities,
}

export default function ReviewCategoryIcon({ category, size = 24 }) {
  const src = icons[category]
  if (!src) return null
  const iconSize = category === 'facilities' ? 46 : size
  return <img src={src} width={iconSize} height={iconSize} alt="" aria-hidden="true" />
}
