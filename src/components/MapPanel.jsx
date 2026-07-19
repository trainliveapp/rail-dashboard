import { useRef, useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import { lines, housingPins, coffeePins, liveEventPin, stations } from '../data/mockData'
import { tubeLineGeometry } from '../data/tubeLineGeometry'
import { getStationScores } from '../lib/stationRatings'
import StationPopup from './StationPopup'

const CENTER = [51.5246, -0.1339]

// A journey's line highlight should only light up the stretch of track
// actually being used, not the entire line across London, this bounds the
// segments rendered to the area around the journey's own points, with a
// little padding so the highlighted line doesn't end abruptly right at a
// station.
function boundsFromPoints(points, paddingDeg = 0.02) {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  return {
    minLat: Math.min(...lats) - paddingDeg,
    maxLat: Math.max(...lats) + paddingDeg,
    minLng: Math.min(...lngs) - paddingDeg,
    maxLng: Math.max(...lngs) + paddingDeg,
  }
}
function segmentInBounds(segment, bounds) {
  return segment.some(
    ([lat, lng]) => lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng
  )
}

function liveArrowIcon(heading = 0) {
  return L.divIcon({
    html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="width:34px;height:34px;border-radius:9999px;background:rgba(37,99,235,0.18);position:absolute;"></div>
      <div style="width:22px;height:22px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform 0.4s ease;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2 L19 21 L12 17 L5 21 Z"/></svg>
      </div>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

const svg = (inner, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`


const ICONS = {
  metro: svg('<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>'),
  delay: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  report: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>'),
  crowding: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>'),
  home: svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', 15),
  coffee: svg('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>', 15),
  music: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', 15),
  building: svg('<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>', 15),
  bike: svg('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>', 15),
}

function badgeIcon(type, color, size = 28) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35)">${ICONS[type]}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function priceIcon(price) {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;gap:6px;">
      <div style="width:28px;height:28px;border-radius:9999px;background:#0d9488;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.3);flex-shrink:0;">${ICONS.home}</div>
      <div style="background:white;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:#0f172a;box-shadow:0 1px 4px rgba(0,0,0,.15);white-space:nowrap;">${price}</div>
    </div>`,
    className: '',
    iconSize: [140, 28],
    iconAnchor: [14, 14],
  })
}

function endpointIcon(kind) {
  const isStart = kind === 'start'
  const color = isStart ? '#16a34a' : '#0f172a'
  const label = isStart ? 'Start' : 'End'
  const inner = isStart
    ? svg('<circle cx="12" cy="12" r="6" fill="white" stroke="none"/>', 14)
    : svg('<path d="M4 22V4"/><path d="M4 5h13l-2.5 3.5L17 12H4"/>', 16)
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="background:white;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;color:${color};box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;">${label}</div>
      <div style="width:26px;height:26px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);border:3px solid white;">${inner}</div>
    </div>`,
    className: '',
    iconSize: [60, 48],
    iconAnchor: [30, 48],
  })
}

function stationIcon(score, size = 18) {
  if (!score || !score.ratingCount) {
    return badgeIcon('metro', '#1e293b', size)
  }
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${`<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#1e293b;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35);">${ICONS.metro}</div>`}
      <div style="position:absolute;top:-8px;right:-22px;background:white;padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:600;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;">★ ${score.overallScore.toFixed(1)}</div>
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function ratingIcon(rating, color = '#7f1d1d') {
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:36px;">
      <div style="width:32px;height:32px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.3);">${ICONS.coffee}</div>
      <div style="position:absolute;top:-8px;right:-20px;background:white;padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:600;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;">★ ${rating}</div>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [16, 16],
  })
}

const hotelPins = [
  { lat: 51.52322, lng: -0.11343 },
  { lat: 51.51402, lng: -0.14103 },
]

const cycleParkingPins = [
  { lat: 51.52667, lng: -0.12033 },
  { lat: 51.51816, lng: -0.13183 },
]

function MapBridge({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  return null
}

// Pans/zooms to fit every station touched by the planned journey (not just
// the two endpoints, changes can bow a route well away from a straight
// line between them), whenever a new journey comes in from the sheet.
// Padding is asymmetric on purpose: the journey sheet covers roughly the
// bottom half of this container while results are showing, so a route
// framed with even padding would end up with its lower half tucked behind
// it. Biasing padding toward the bottom keeps the route inside the part of
// the map that's actually visible.
function RouteFit({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    if (points.length === 1) {
      map.flyTo(points[0], 16, { duration: 0.75 })
      return
    }
    map.flyToBounds(L.latLngBounds(points), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 260],
      maxZoom: 16,
      duration: 0.75,
    })
  }, [points, map])
  return null
}

// Keeps the live position marker in view as it updates, panning at the
// current zoom level rather than resetting it, this is meant to feel like a
// gentle continuous follow, not the (comparatively jarring) fit-to-bounds
// RouteFit does when a journey is first planned or a different route is
// picked. Stops following the moment the user manually drags the map, so it
// never fights their own panning, that's what MapInteractionWatcher is for.
function LiveFollow({ lat, lng, suspended }) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lng == null || suspended) return
    map.panTo([lat, lng], { animate: true, duration: 0.5 })
  }, [lat, lng, suspended, map])
  return null
}

function MapInteractionWatcher({ onUserDrag }) {
  useMapEvents({
    dragstart: () => onUserDrag(),
  })
  return null
}

function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  })
  return null
}

// Below this zoom, station markers don't render at all, at a city-wide
// view the basemap's own city/borough labels are what should carry the
// map, not hundreds of our train icons stacked on top of each other.
// They (and their name labels) fade in once you've zoomed to roughly
// town/neighbourhood scale, the same progressive reveal every serious map
// app uses.
const STATION_VISIBLE_ZOOM = 14

export default function MapPanel({
  layers,
  nearby,
  activeLines = [],
  highlightLines = [],
  route = null,
  liveLocation = null,
  className = 'h-[420px] lg:h-[520px]',
}) {
  const mapRef = useRef(null)
  const [stationScores, setStationScores] = useState({})
  const [followSuspended, setFollowSuspended] = useState(false)
  const [zoom, setZoom] = useState(16)

  useEffect(() => {
    getStationScores(stations.map((s) => s.id)).then(setStationScores)
  }, [])

  // A new live-tracked journey should resume auto-follow, even if the user
  // had paused it (by dragging) on a previous one.
  useEffect(() => {
    setFollowSuspended(false)
  }, [route?.selectedOption?.id])

  const isOn = (list, label) => list.find((i) => i.label === label)?.enabled
  const visibleLines = highlightLines.length ? highlightLines : activeLines

  // Memoized on the actual coordinates, not recomputed as a fresh array
  // every render, RouteFit's effect depends on this array by reference, and
  // an unrelated re-render (toggling a layer, ticking station scores in)
  // would otherwise snap the map back to the route underneath the user's
  // own pan/zoom. Keyed on lat/lng rather than station id, "current
  // location" reuses the same id on every fix but a different position.
  const originKey = route?.originStation ? `${route.originStation.lat},${route.originStation.lng}` : null
  const destinationKey = route?.destinationStation ? `${route.destinationStation.lat},${route.destinationStation.lng}` : null
  const selectedOptionId = route?.selectedOption?.id
  const routeFitPoints = useMemo(() => {
    if (!route) return []
    const points = []
    if (route.originStation) points.push([route.originStation.lat, route.originStation.lng])
    if (route.destinationStation) points.push([route.destinationStation.lat, route.destinationStation.lng])
    for (const leg of route.selectedOption?.legs || []) {
      const match = stations.find((s) => s.name === leg.from || s.name === leg.to)
      if (match) points.push([match.lat, match.lng])
    }
    return points
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, destinationKey, selectedOptionId])

  // Only meaningful when a journey's highlighting specific lines, this is
  // what keeps a District line trip from Putney lighting up the entire
  // District line out to Upminster.
  const journeyBounds = highlightLines.length && routeFitPoints.length ? boundsFromPoints(routeFitPoints) : null

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-slate-100`}>
      <MapContainer center={CENTER} zoom={16} zoomControl={false} className="w-full h-full">
        <MapBridge mapRef={mapRef} />
        <ZoomTracker onZoomChange={setZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxNativeZoom={19}
          maxZoom={19}
        />

        {routeFitPoints.length > 0 && <RouteFit points={routeFitPoints} />}
        {route?.originStation && route?.destinationStation && (
          <Polyline
            positions={[
              [route.originStation.lat, route.originStation.lng],
              [route.destinationStation.lat, route.destinationStation.lng],
            ]}
            pathOptions={
              route.selectedOption
                ? { color: '#1d4ed8', weight: 4, opacity: 0.45 } // planned: understated guide line, real line segments render on top of this when they match
                : { color: '#2563eb', weight: 3, opacity: 0.8, dashArray: '2 10' } // still choosing: dashed preview
            }
          />
        )}
        {route?.originStation && (
          <Marker position={[route.originStation.lat, route.originStation.lng]} icon={endpointIcon('start')} />
        )}
        {route?.destinationStation && (
          <Marker position={[route.destinationStation.lat, route.destinationStation.lng]} icon={endpointIcon('end')} />
        )}

{Object.entries(tubeLineGeometry)
          .filter(([name]) => visibleLines.includes(name))
          .map(([name, segments]) => {
            const isJourneyLine = highlightLines.includes(name)
            const color = lines.find((l) => l.name === name)?.color
            const segmentsToRender =
              isJourneyLine && journeyBounds ? segments.filter((seg) => segmentInBounds(seg, journeyBounds)) : segments
            return segmentsToRender.map((positions, i) => (
              <Polyline
                key={`${name}-${i}`}
                positions={positions}
                pathOptions={{
                  color,
                  weight: isJourneyLine ? 7 : 4,
                  opacity: 1,
                }}
              />
            ))
          })}

        {liveLocation && (
          <>
            <MapInteractionWatcher onUserDrag={() => setFollowSuspended(true)} />
            <LiveFollow lat={liveLocation.lat} lng={liveLocation.lng} suspended={followSuspended} />
            <Marker position={[liveLocation.lat, liveLocation.lng]} icon={liveArrowIcon(liveLocation.heading)} zIndexOffset={1000} />
          </>
        )}

        {zoom >= STATION_VISIBLE_ZOOM &&
          stations.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={stationIcon(stationScores[s.id])}>
              <Tooltip
                direction="top"
                permanent
                offset={[0, -12]}
                className="!bg-transparent !border-0 !shadow-none !text-[11px] !font-semibold !text-slate-800"
                style={{ textShadow: '0 0 3px white, 0 0 3px white, 0 1px 2px white' }}
              >
                {s.name}
              </Tooltip>
              <Popup minWidth={260}>
                <StationPopup stationId={s.id} stationName={s.name} />
              </Popup>
            </Marker>
          ))}

        {/* Disruption markers removed for now, scatterMarkers below is
            hardcoded demo data with made-up locations, not real incidents.
            Wiring in real disruptions is realistic though: TfL's Line
            Status API (free, no key needed) returns current line-level
            status/severity, and combined with each line's stations you
            could plot real markers the same way this block did. National
            Rail doesn't have an equivalent free real-time incident feed,
            Rail Data Marketplace has service-alert data but it's a
            different integration than the journey planner's TransportAPI. */}

        {isOn(layers, 'Housebuddy') &&
          housingPins.map((p) => <Marker key={p.id} position={[p.lat, p.lng]} icon={priceIcon(p.price)} />)}

        {isOn(layers, 'Station Retail') &&
          coffeePins.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={ratingIcon(p.rating)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-amber-500 text-xs mb-1">★★★★☆ {p.rating}</p>
                  <p className="text-xs text-slate-500">Coffee Shop · <span className={p.status === 'Open' ? 'text-emerald-600' : 'text-red-600'}>{p.status}</span></p>
                  <p className="text-xs text-slate-400 mt-1">{p.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {isOn(layers, 'Live Events') && (
          <Marker position={[liveEventPin.lat, liveEventPin.lng]} icon={badgeIcon('music', '#9333ea', 34)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 mb-1">LIVE EVENT</p>
                <p className="text-slate-700">{liveEventPin.name}</p>
                <p className="text-xs text-slate-500">{liveEventPin.location}</p>
                <p className="text-xs text-slate-400">{liveEventPin.date}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {isOn(nearby, 'Hotels') &&
          hotelPins.map((p, i) => <Marker key={i} position={[p.lat, p.lng]} icon={badgeIcon('building', '#16a34a')} />)}

        {isOn(nearby, 'Cycle Parking') &&
          cycleParkingPins.map((p, i) => <Marker key={i} position={[p.lat, p.lng]} icon={badgeIcon('bike', '#db2777')} />)}
      </MapContainer>


      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5 sm:gap-2">
        <button aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50">
          <Plus size={15} />
        </button>
        <button aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50">
          <Minus size={15} />
        </button>
        <button
          aria-label="Recenter map"
          onClick={() => {
            if (liveLocation) {
              mapRef.current?.panTo([liveLocation.lat, liveLocation.lng], { animate: true })
              setFollowSuspended(false)
            } else {
              mapRef.current?.setView(CENTER, 16)
            }
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 shadow-sm rounded-lg flex items-center justify-center active:bg-slate-50 ${
            liveLocation && followSuspended ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
          }`}
        >
          <LocateFixed size={15} />
        </button>
      </div>

      <div className="hidden sm:block absolute bottom-24 left-3 z-[1000] bg-white shadow-sm rounded-xl px-4 py-3 text-xs text-slate-600">
        <p className="font-bold tracking-widest text-[10px] text-slate-400 mb-2">LEGEND</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" /> Delay</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Crowding</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-600" /> Report</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> On time</span>
        </div>
      </div>
    </div>
  )
}