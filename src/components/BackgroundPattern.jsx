const colors = ['#2563EB', '#059669', '#7C3AED', '#DC2626', '#EA580C', '#0D9488', '#4F46E5']

// Deterministic pseudo-random layout so the pattern is stable across renders
// instead of reshuffling every time the component re-mounts.
function seededLayout(count) {
  let seed = 42
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  return Array.from({ length: count }).map((_, i) => ({
    top: `${(i % 6) * 17 + rand() * 8}%`,
    left: `${Math.floor(i / 6) * 13 + rand() * 8}%`,
    rotate: Math.floor(rand() * 40 - 20),
    color: colors[i % colors.length],
    scale: 0.85 + rand() * 0.3,
  }))
}

const badges = seededLayout(48)

function Badge({ color }) {
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="26" height="20" rx="6" stroke={color} strokeWidth="1.5" />
      <circle cx="10" cy="9" r="1.4" fill={color} />
      <circle cx="18" cy="9" r="1.4" fill={color} />
      <path d="M9 14 Q14 17 19 14" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M6 1 L4 -3 M22 1 L24 -3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <rect x="31" y="6" width="31" height="12" rx="6" stroke={color} strokeWidth="1.3" />
      <circle cx="37" cy="12" r="2" fill={color} />
      <text x="43" y="15.5" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="bold" fill={color}>LIVE</text>
    </svg>
  )
}

export default function BackgroundPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-800">
      {badges.map((b, i) => (
        <span
          key={i}
          className="absolute opacity-25"
          style={{ top: b.top, left: b.left, transform: `rotate(${b.rotate}deg) scale(${b.scale})` }}
        >
          <Badge color={b.color} />
        </span>
      ))}
    </div>
  )
}
