const iconAssets = {
  delays: {
    webp: new URL('../assets/Reporting icons/webp/delays.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/delays.png', import.meta.url).href,
  },
  police: {
    webp: new URL('../assets/Reporting icons/webp/police.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/police.png', import.meta.url).href,
  },
  safety: {
    webp: new URL('../assets/Reporting icons/webp/violence.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/violence.png', import.meta.url).href,
  },
  revenue: {
    webp: new URL('../assets/Reporting icons/webp/revenue-protection.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/revenue-protection.png', import.meta.url).href,
  },
  antisocial: {
    webp: new URL('../assets/Reporting icons/webp/antisocial-behaviour.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/antisocial-behaviour.png', import.meta.url).href,
  },
  harassment_violence: {
    webp: new URL('../assets/Reporting icons/webp/harassment.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/harassment.png', import.meta.url).href,
  },
  fare_dodgers: {
    webp: new URL('../assets/Reporting icons/webp/fare-dodgers.webp', import.meta.url).href,
    png: new URL('../assets/Reporting icons/png/fare-dodgers.png', import.meta.url).href,
  },
}

export default function ReportCategoryImage({ category, className = '' }) {
  const assets = iconAssets[category]
  if (!assets) return null

  return (
    <picture>
      <source srcSet={assets.webp} type="image/webp" />
      <img
        src={assets.png}
        sizes="80px"
        loading="eager"
        alt=""
        draggable={false}
        width={80}
        height={80}
        className={`shrink-0 rounded-full object-contain ${className}`}
      />
    </picture>
  )
}
