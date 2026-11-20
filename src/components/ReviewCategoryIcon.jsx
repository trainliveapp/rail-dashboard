import { Accessibility } from 'lucide-react'

const icons = {
  staffFriendliness: null,
  accessibility: Accessibility,
  staffVisibility: null,
  cleanliness: null,
  facilities: null,
}

export default function ReviewCategoryIcon({ category, size = 24 }) {
  const Icon = icons[category]
  if (!Icon && category === 'cleanliness') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h14"/><path d="M7 16h9l2 4H5l2-4Z"/><path d="m8 3 7 12"/><path d="m6 4 3-2 8 12-3 2z"/><path d="M7 15h9"/></svg>
  if (!Icon && category === 'staffFriendliness') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/><path d="M7.5 6.5a4.6 4.6 0 0 1 9 0"/><path d="M6 7h12"/><path d="M10.5 12.5 12 15l1.5-2.5"/></svg>
  if (!Icon && category === 'staffVisibility') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 3 4 2 4-2 4 3-2 15H6L4 6l4-3Z" fill="var(--color-brand-primary)"/><path d="m8 3 4 6 4-6"/><path d="M6 14h12"/><path d="M8 17h8"/><path d="M12 9v3"/></svg>
  if (!Icon && category === 'facilities') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 3v7h5V3M6.5 10v11M14 3v8h6l-2-8"/><path d="M14 21v-5h6v5M13 16h8"/></svg>
  if (!Icon) return null
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}
