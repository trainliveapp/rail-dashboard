import promoImage from '../assets/splash-promo.jpg'

export default function PretPromoScreen({ fadingOut }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        backgroundImage: `url(${promoImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  )
}