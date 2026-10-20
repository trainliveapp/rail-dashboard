import { supabase, isSupabaseConfigured } from './supabaseClient'

export const ratingCategories = [
  { key: 'cleanliness', dbKey: 'cleanliness', label: 'Cleanliness' },
  { key: 'staffFriendliness', dbKey: 'staff_friendliness', label: 'Customer service' },
  { key: 'staffVisibility', dbKey: 'staff_visibility', label: 'Staff visibility' },
  { key: 'accessibility', dbKey: 'accessibility', label: 'Accessibility' },
  { key: 'facilities', dbKey: 'facilities', label: 'Facilities' },
]

export function subscribeToStationReviews(stationId, onChange) {
  const onLocalChange = (event) => { if (event.detail === stationId) onChange() }
  window.addEventListener('station-review-saved', onLocalChange)
  const channel = isSupabaseConfigured ? supabase
    .channel(`station-reviews-${stationId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'station_ratings', filter: `station_id=eq.${stationId}` }, onChange)
    .subscribe() : null
  return () => {
    window.removeEventListener('station-review-saved', onLocalChange)
    if (channel) supabase.removeChannel(channel)
  }
}

// Submits a rating. Only send keys for categories the person actually
// rated, exactly like the spec's request body, partial ratings are fine.
export async function submitStationRating(stationId, ratings) {
  if (!isSupabaseConfigured) throw new Error('Station reviews are currently unavailable.')
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id ?? null

  const { error } = await supabase.from('station_ratings').insert({
    station_id: stationId,
    user_id: userId,
    ...ratings,
  })

  if (error) throw error
  window.dispatchEvent(new CustomEvent('station-review-saved', { detail: stationId }))
}

export async function getStationReviews(stationId, page = 0) {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('station_ratings')
    .select('id, review_text, overall_rating, created_at')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * 20, page * 20 + 19)

  if (error) throw error
  return data || []
}

// One station's score. Returns an "unrated" shape (nulls, count 0) if the
// station has no ratings yet, rather than throwing, matching the spec.
export async function getStationScore(stationId) {
  if (!isSupabaseConfigured) {
    return { stationId, overallScore: null, ratingCount: 0, categoryScores: null }
  }

  const { data, error } = await supabase
    .from('station_review_scores')
    .select('*')
    .eq('station_id', stationId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return { stationId, overallScore: null, ratingCount: 0, categoryScores: null }
  }

  return {
    stationId: data.station_id,
    overallScore: data.overall_score,
    ratingCount: data.rating_count,
    categoryScores: {
      staffFriendliness: data.staff_friendliness_avg,
      accessibility: data.accessibility_avg,
      staffVisibility: data.staff_visibility_avg,
      cleanliness: data.cleanliness_avg,
      facilities: data.facilities_avg,
    },
  }
}

// Bulk fetch for the map, one request for every visible station marker
// instead of one request per marker, per the spec's note on this.
export async function getStationScores(stationIds) {
  if (!stationIds.length || !isSupabaseConfigured) return {}

  const { data, error } = await supabase
    .from('station_review_scores')
    .select('*')
    .in('station_id', stationIds)

  if (error) throw error

  const byId = {}
  for (const row of data) {
    byId[row.station_id] = {
      overallScore: row.overall_score,
      ratingCount: row.rating_count,
    }
  }
  return byId
}
