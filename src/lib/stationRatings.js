import { supabase } from './supabaseClient'

// Submits a rating. Only send keys for categories the person actually
// rated, exactly like the spec's request body, partial ratings are fine.
export async function submitStationRating(stationId, ratings) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id ?? null

  const { error } = await supabase.from('station_ratings').insert({
    station_id: stationId,
    user_id: userId,
    ...ratings,
  })

  if (error) throw error
}

// One station's score. Returns an "unrated" shape (nulls, count 0) if the
// station has no ratings yet, rather than throwing, matching the spec.
export async function getStationScore(stationId) {
  const { data, error } = await supabase
    .from('station_scores')
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
  if (!stationIds.length) return {}

  const { data, error } = await supabase
    .from('station_scores')
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