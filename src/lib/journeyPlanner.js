// Real journey planning via TransportAPI (developer.transportapi.com).
// Needs VITE_TRANSPORTAPI_APP_ID and VITE_TRANSPORTAPI_APP_KEY in .env.local.
//
// fromStation/toStation are station objects from src/data/mockData.js's
// `stations` array: { id, name, lat, lng }. Real coordinates are required,
// free text isn't enough for a real routing engine.
//
// TransportAPI's response includes a `routes` array, one entry per
// itinerary, not just one. Earlier this only read routes[0] and threw the
// rest away, which is why the app could only ever show a single option.
// planJourney() now returns all of them (capped and sorted by duration) so
// the results screen can show real alternatives, the same way Waze offers
// more than one road route.

const APP_ID = import.meta.env.VITE_TRANSPORTAPI_APP_ID
const APP_KEY = import.meta.env.VITE_TRANSPORTAPI_APP_KEY

const MAX_OPTIONS = 4

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

function isNumericLabel(value) {
  return typeof value === 'string' && /^\d+$/.test(value.trim())
}

// TransportAPI's route_parts carry a real `mode` (bus, tube, train, dlr,
// overground, foot...), but everything downstream was previously collapsing
// all of that into a generic 'train', which is why a bus route number was
// showing up labelled "line". This keeps the real mode and resolves a
// sensible display name per mode:
//  - buses have a route number, not a line name
//  - the Underground/DLR/Overground have real named lines
//  - National Rail doesn't really have "lines" the way the Underground
//    does, TransportAPI sometimes returns a numeric service ID as
//    line_name for these, which is meaningless to a rider, operator name
//    is the honest fallback there.
// NOTE: exact TransportAPI field names (mode strings, whether it's
// `operator` or something else) are inferred from behaviour, not verified
// against live docs, since this sandbox can't reach transportapi.com. If a
// leg still looks wrong after this, the raw response is logged to the
// console, paste it over and the matching can be tightened precisely.
function resolveLeg(part) {
  const rawMode = part.mode
  if (rawMode === 'foot') {
    return { transitMode: 'walk', mode: 'walk', line: null, label: 'Walk', showsPlatform: false }
  }
  if (rawMode === 'bus') {
    const line = part.line_name || part.line || null
    return { transitMode: 'bus', mode: 'transit', line, label: line ? `${line} bus` : 'Bus', showsPlatform: false }
  }
  if (rawMode === 'tube' || rawMode === 'underground') {
    const line = part.line_name || part.line || null
    return { transitMode: 'tube', mode: 'transit', line, label: line ? `${line} line` : 'Underground', showsPlatform: true }
  }
  if (rawMode === 'dlr') {
    return { transitMode: 'dlr', mode: 'transit', line: 'DLR', label: 'DLR', showsPlatform: true }
  }
  if (rawMode === 'overground') {
    const line = part.line_name || 'London Overground'
    return { transitMode: 'overground', mode: 'transit', line, label: line, showsPlatform: true }
  }
  // National Rail and anything else non-bus/foot/tube/dlr/overground.
  const rawName = part.line_name || part.line
  const operator = part.operator || part.train_operating_company || null
  const line = rawName && !isNumericLabel(rawName) ? rawName : operator
  return { transitMode: rawMode || 'train', mode: 'transit', line, label: line || 'Train', showsPlatform: true }
}

function buildOption(route, fromStation, toStation, index) {
  const allParts = route.route_parts || []
  // Keep a leading/trailing walk leg (the walk to/from the station matters,
  // Waze shows that too), but drop foot legs sandwiched between two train
  // legs, those are just platform-to-platform interchange noise.
  const parts = allParts.filter((p, i) => p.mode !== 'foot' || i === 0 || i === allParts.length - 1)

  const legs = parts.map((part) => {
    const resolved = resolveLeg(part)
    return {
      mode: resolved.mode, // 'walk' | 'transit', coarse, used for icon choice
      transitMode: resolved.transitMode, // exact mode, used for platform display and map matching
      line: resolved.line, // raw line/operator name, used for map line-matching
      label: resolved.label, // human-facing text, already has "bus"/"line" suffix where appropriate
      color: part.line_colour ? `#${part.line_colour}` : '#334155',
      from: part.from_point_name || fromStation.name,
      to: part.to_point_name || toStation.name,
      platform: resolved.showsPlatform ? part.departure_platform || null : null,
      departTime: toHHMM(part.departure_time),
      arriveTime: toHHMM(part.arrival_time),
      durationMin: parseDurationToMin(part) ?? '-',
    }
  })

  const totalMin = parseDurationToMin(route) ?? legs.reduce((sum, l) => sum + (Number(l.durationMin) || 0), 0)
  const transitLegs = legs.filter((l) => l.mode === 'transit')
  // Only the Underground/DLR/Overground have real geometry to highlight on
  // the map, a bus route number or rail operator name won't match anything
  // in tubeLineGeometry, and shouldn't be passed through as if it would.
  const mapLines = [...new Set(legs.filter((l) => ['tube', 'dlr', 'overground'].includes(l.transitMode) && l.line).map((l) => l.line))]

  return {
    id: `route-${index}-${route.duration ?? index}`,
    departTime: legs[0]?.departTime ?? '--:--',
    arriveTime: legs[legs.length - 1]?.arriveTime ?? '--:--',
    totalMin,
    changes: Math.max(0, transitLegs.length - 1),
    legs,
    lines: mapLines,
  }
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

  const routes = data.routes || []
  if (routes.length === 0) {
    throw new Error('No route found between those two stations.')
  }

  const options = routes
    .slice(0, MAX_OPTIONS)
    .map((route, i) => buildOption(route, fromStation, toStation, i))
    .sort((a, b) => a.totalMin - b.totalMin)

  return {
    origin: fromStation.name,
    destination: toStation.name,
    originStation: fromStation,
    destinationStation: toStation,
    options,
  }
}
