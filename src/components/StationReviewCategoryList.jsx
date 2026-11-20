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
            <span className="station-review-category-icon"><ReviewCategoryIcon category={category.key} /></span>
            <span className="station-review-category-name">{category.label}</span>
            <RatingStars value={value} size={14} />
            <span className="station-review-category-value">{categoryRatingLabel(value)}</span>
          </div>
        )
      })}
    </div>
  )
}
