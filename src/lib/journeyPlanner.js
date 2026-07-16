// Real journey planning via TransportAPI (developer.transportapi.com).
// Needs VITE_TRANSPORTAPI_APP_ID and VITE_TRANSPORTAPI_APP_KEY in .env.local.
//
// fromStation/toStation are station objects from src/data/mockData.js's
// `stations` array: { id, name, lat, lng }. Real coordinates are required,
// free text isn't enough for a real routing engine.

const APP_ID = import.meta.env.VITE_TRANSPORTAPI_APP_ID
const APP_KEY = import.meta.env.VITE_TRANSPORTAPI_APP_KEY

function toHHMM(timeStr) {
  if (!timeStr) return '--:--'
  return timeStr.slice(0, 5)
}

function parseDurationToMin(routePart) {
  if (typeof routePart.duration === 'number') return Math.round(routePart.duration / 60)
  if (typeof routePart.duration === 'string') {
    const parts = routePart.duration.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 60 + parts[1]
    if (parts.length === 2) return parts[0]
  }
  return null
}

export async function planJourney(fromStation, toStation) {
  if (!fromStation || !toStation) {
    throw new Error('Pick a station from the list for both fields.')
  }
  if (!APP_ID || !APP_KEY) {
    throw new Error('Missing TransportAPI credentials, check .env.local.')
  }

  const fromParam = `lonlat:${fromStation.lng},${fromStation.lat}`
  const toParam = `lonlat:${toStation.lng},${toStation.lat}`

  const url =
    `https://transportapi.com/v3/uk/public/journey/from/${encodeURIComponent(fromParam)}` +
    `/to/${encodeURIComponent(toParam)}.json` +
    `?app_id=${APP_ID}&app_key=${APP_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  console.log('TransportAPI raw response:', data)

  if (!res.ok || data.error) {
    throw new Error(data.error || 'Journey planner request failed.')
  }

  const route = data.routes?.[0]
  if (!route) {
    throw new Error('No route found between those two stations.')
  }

  const parts = (route.route_parts || []).filter((p) => p.mode !== 'foot' || route.route_parts.length === 1)

  const legs = parts.map((part) => ({
    line: part.line_name || part.mode || 'Walk',
    color: part.line_colour ? `#${part.line_colour}` : '#334155',
    from: part.from_point_name || fromStation.name,
    to: part.to_point_name || toStation.name,
    platform: part.departure_platform || '-',
    departTime: toHHMM(part.departure_time),
    arriveTime: toHHMM(part.arrival_time),
    durationMin: parseDurationToMin(part) ?? '-',
  }))

  const totalMin = parseDurationToMin(route) ?? legs.reduce((sum, l) => sum + (Number(l.durationMin) || 0), 0)

  return {
    origin: fromStation.name,
    destination: toStation.name,
    departTime: legs[0]?.departTime ?? '--:--',
    arriveTime: legs[legs.length - 1]?.arriveTime ?? '--:--',
    totalMin,
    changes: Math.max(0, legs.length - 1),
    legs,
  }
}