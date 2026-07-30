import promoImage from '../assets/splash-promo.jpg'

export default function PretPromoScreen({ fadingOut }) {
  return (
    <div className={`fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @keyframes pretSlowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.12); }
        }
      `}</style>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${promoImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'pretSlowZoom 2.5s ease-out forwards',
        }}
      />
    </div>
  )
}