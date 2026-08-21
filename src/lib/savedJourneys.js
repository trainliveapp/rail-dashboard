import { supabase } from './supabaseClient'

/**
 * Save a journey search for the current user.
 * @param {object} journey - { fromStation, toStation, isFavorite }
 * @returns {Promise<{id, error}>}
 */
export async function saveJourney(journey) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    return { error: 'Must be signed in to save journeys' }
  }

  if (!journey.fromStation || !journey.toStation) {
    return { error: 'Both stations required' }
  }

  const { data, error } = await supabase
    .from('saved_journeys')
    .insert({
      user_id: userId,
      from_station_id: journey.fromStation.id,
      from_station_name: journey.fromStation.name,
      from_lat: journey.fromStation.lat,
      from_lng: journey.fromStation.lng,
      to_station_id: journey.toStation.id,
      to_station_name: journey.toStation.name,
      to_lat: journey.toStation.lat,
      to_lng: journey.toStation.lng,
      is_favorite: journey.isFavorite || false,
    })
    .select()

  if (error) {
    console.error('Error saving journey:', error)
    return { error: error.message }
  }

  return { id: data?.[0]?.id, error: null }
}

/**
 * Get all saved journeys for the current user.
 * @returns {Promise<{journeys, error}>}
 */
export async function getSavedJourneys() {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    return { journeys: [], error: null }
  }

  const { data, error } = await supabase
    .from('saved_journeys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching saved journeys:', error)
    return { journeys: [], error: error.message }
  }

  return {
    journeys: (data || []).map((j) => ({
      id: j.id,
      route: `${j.from_station_name} → ${j.to_station_name}`,
      stations: `${j.from_station_name} → ${j.to_station_name}`,
      favorite: j.is_favorite,
      fromStation: {
        id: j.from_station_id,
        name: j.from_station_name,
        lat: j.from_lat,
        lng: j.from_lng,
      },
      toStation: {
        id: j.to_station_id,
        name: j.to_station_name,
        lat: j.to_lat,
        lng: j.to_lng,
      },
    })),
    error: null,
  }
}

/**
 * Toggle favorite status for a saved journey.
 * @param {string} journeyId - ID of the saved journey
 * @param {boolean} isFavorite - New favorite status
 * @returns {Promise<{error}>}
 */
export async function toggleFavorite(journeyId, isFavorite) {
  const { error } = await supabase
    .from('saved_journeys')
    .update({ is_favorite: isFavorite })
    .eq('id', journeyId)

  if (error) {
    console.error('Error updating favorite:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Delete a saved journey.
 * @param {string} journeyId - ID of the saved journey
 * @returns {Promise<{error}>}
 */
export async function deleteSavedJourney(journeyId) {
  const { error } = await supabase.from('saved_journeys').delete().eq('id', journeyId)

  if (error) {
    console.error('Error deleting journey:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Get journey history (last 20 searches) for current user.
 * @returns {Promise<{history, error}>}
 */
export async function getJourneyHistory() {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    return { history: [], error: null }
  }

  const { data, error } = await supabase
    .from('journey_history')
    .select('*')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching history:', error)
    return { history: [], error: error.message }
  }

  return {
    history: (data || []).map((h) => ({
      id: h.id,
      route: `${h.from_station_name} → ${h.to_station_name}`,
      stations: `${h.from_station_name} → ${h.to_station_name}`,
      searchedAt: h.searched_at,
      fromStation: {
        id: h.from_station_id,
        name: h.from_station_name,
        lat: h.from_lat,
        lng: h.from_lng,
      },
      toStation: {
        id: h.to_station_id,
        name: h.to_station_name,
        lat: h.to_lat,
        lng: h.to_lng,
      },
    })),
    error: null,
  }
}

/**
 * Track a journey search in history.
 * @param {object} journey - { fromStation, toStation }
 * @returns {Promise<{error}>}
 */
export async function trackJourneySearch(journey) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId || !journey.fromStation || !journey.toStation) {
    return { error: null }
  }

  // Insert into history
  const { error } = await supabase.from('journey_history').insert({
    user_id: userId,
    from_station_id: journey.fromStation.id,
    from_station_name: journey.fromStation.name,
    from_lat: journey.fromStation.lat,
    from_lng: journey.fromStation.lng,
    to_station_id: journey.toStation.id,
    to_station_name: journey.toStation.name,
    to_lat: journey.toStation.lat,
    to_lng: journey.toStation.lng,
  })

  if (error) {
    console.error('Error tracking journey:', error)
  }

  return { error }
}
