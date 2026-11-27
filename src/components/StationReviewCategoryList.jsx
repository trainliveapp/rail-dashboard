import { ratingCategories } from '../lib/stationRatings'
import RatingStars from './RatingStars'
import ReviewCategoryIcon from './ReviewCategoryIcon'
import { categoryRatingLabel } from '../lib/reviewPresentation'

export default function StationReviewCategoryList({ categoryScores }) {
  return (
    <div className="station-review-categories" aria-label="Ratings by category">
      {ratingCategories.map(category => {
        const value = categoryScores?.[category.key]
        return (
          <div className="station-review-category" key={category.key}>
            <span className={`station-review-category-icon${category.key === 'facilities' ? ' station-review-category-icon--facilities' : ''}`}>
              <ReviewCategoryIcon
                category={category.key}
                width={category.key === 'facilities' ? 56 : 48}
                height={category.key === 'facilities' ? 42 : 48}
              />
            </span>
            <div className="station-review-category-content">
              <span className="station-review-category-name">{category.label}</span>
              <div className="station-review-category-rating">
                <RatingStars value={value} size={22} />
                <span className="station-review-category-value">{categoryRatingLabel(value)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
