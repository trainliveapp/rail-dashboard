export default function ReviewCategoryIcon({ category, size = 24 }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true, focusable: false }

  if (category === 'cleanliness') return (
    <svg {...common}>
      <path d="M4 18c2-3 19-3 22 0l-2 11c-.4 2.2-2.2 3.5-4.6 3.5h-8.8c-2.4 0-4.2-1.3-4.6-3.5L4 18Z" fill="#0753a8" stroke="#092b68" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M6 20c4 2 14 2 18 0M8 25c3 1.5 11 1.5 14 0" stroke="#d9f4ff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M33 5 28 35" stroke="#092b68" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m31 5 6 1-2 5-6-1 2-5Z" fill="#fff" stroke="#092b68" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="28" cy="37" r="4.5" fill="#0753a8" stroke="#092b68" strokeWidth="2" />
      <path d="m39 16 1.5 4.5L45 22l-4.5 1.5L39 28l-1.5-4.5L33 22l4.5-1.5L39 16Z" fill="#ffd21a" />
      <path d="m34 28 1 2.5 2.5 1-2.5 1L34 35l-1-2.5-2.5-1 2.5-1 1-2.5Z" fill="#ffd21a" />
      <path d="M2 39h24" stroke="#092b68" strokeWidth="1.6" />
    </svg>
  )

  if (category === 'staffFriendliness') return (
    <svg {...common}>
      <path d="M8 41c.5-5 2.2-10 5.5-12.5L17 26h14l4 3.5 4 11.5H8Z" fill="#092b68" />
      <path d="M17 26v-4h14v4l-7 6-7-6Z" fill="#fff" stroke="#092b68" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 11c0-6 4.5-9 11-9s11 3 11 9v4c0 7-4.8 12-11 12s-11-5-11-12v-4Z" fill="#fff" stroke="#092b68" strokeWidth="2.5" />
      <path d="M12 11 24 5l12 6-2 4H14l-2-4Z" fill="#0753a8" stroke="#092b68" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 15h16v2c0 5-3.2 8-8 8s-8-3-8-8v-2Z" fill="#fff" stroke="#092b68" strokeWidth="1.8" />
      <circle cx="24" cy="19" r="1.6" fill="#092b68" />
      <path d="m21 23 3 2 3-2" stroke="#092b68" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m19 30 5 5 5-5M24 35v5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )

  if (category === 'staffVisibility') return (
    <svg {...common}>
      <path d="m11 5 9 3 9-3 7 5-3 32H9L6 10l5-5Z" fill="#ffd21a" stroke="#092b68" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m11 5 9 13 9-13M20 18v9M8 26h24M10 35h20" stroke="#092b68" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M13 28v6m14-6v6" stroke="#fff" strokeWidth="2.2" />
    </svg>
  )

  if (category === 'accessibility') return (
    <svg {...common}>
      {/* Standard wheelchair mark: seated figure, forward arm, footrest, and open wheel. */}
      <circle cx="18" cy="7" r="3.8" fill="#0753a8" />
      <path d="m17 13 2 10 9 1 4 7h8" stroke="#0753a8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m18 16 8 1 4 7" stroke="#0753a8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 25a10 10 0 1 1-9-2" stroke="#0753a8" strokeWidth="3.6" strokeLinecap="round" />
      <path d="m28 32 4 5h7" stroke="#0753a8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  if (category === 'facilities') return (
    <svg {...common}>
      {/* Restroom silhouettes beside a simple backless bench, as in the reference. */}
      <circle cx="8" cy="7" r="3.2" fill="#0753a8" />
      <path d="M5 12h6v13H5zM6 25v12m4-12v12M4 16l-1 8m9-8 1 8" fill="#0753a8" stroke="#0753a8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 15v8" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="23" cy="7" r="3.2" fill="#0753a8" />
      <path d="M20 12h6l2 9h-9l1-9ZM21 21l-1 9m6-9 1 9m-1-9 4 8" fill="#0753a8" stroke="#0753a8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 15h3" stroke="#fff" strokeWidth="1.2" />
      <path d="M32 23h14v3H32zM34 26v11m10-11v11" fill="#0753a8" stroke="#0753a8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return null
}
