import { useRef, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Plus, Minus, LocateFixed, CloudLightning } from 'lucide-react'
import { lines, housingPins, coffeePins, liveEventPin, stations } from '../data/mockData'
import { tubeLineGeometry } from '../data/tubeLineGeometry'
import { getStationScores } from '../lib/stationRatings'
import StationPopup from './StationPopup'
import DisruptionPopup from './DisruptionPopup'

const CENTER = [51.5246, -0.1339]

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

function stationIcon(score, size = 28) {
  if (!score || !score.ratingCount) {
    return badgeIcon('metro', '#1e293b', size)
  }
  return L.divIcon({
    html: `<div style="position:relative;width:${size + 4}px;height:${size + 4}px;">
      <div style="width:${size}px;height:${size}px;border-radius:9999px;background:#1e293b;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35);">${ICONS.metro}</div>
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

const scatterMarkers = [
  {
    type: 'delay', color: '#dc2626', lat: 51.52138, lng: -0.13873,
    title: 'Signal failure', description: 'Trains held at the platform. Delays of 10-15 minutes expected while engineers investigate.',
    reportedAgo: '6 min ago', confirmations: 12,
  },
  {
    type: 'delay', color: '#dc2626', lat: 51.51517, lng: -0.14793,
    title: 'Train fault', description: 'A defective train is being taken out of service. Following trains are running with a short gap.',
    reportedAgo: '14 min ago', confirmations: 5,
  },
  {
    type: 'report', color: '#7c3aed', lat: 51.52046, lng: -0.12723,
    title: 'Broken escalator', description: 'Southbound escalator out of service, stairs available as an alternative.',
    reportedAgo: '22 min ago', confirmations: 3,
  },
  {
    type: 'report', color: '#7c3aed', lat: 51.51632, lng: -0.13758,
    title: 'Ticket barrier fault', description: 'One gate line is out of action, staff are letting people through manually.',
    reportedAgo: '9 min ago', confirmations: 7,
  },
  {
    type: 'crowding', color: '#f59e0b', lat: 51.51747, lng: -0.12263,
    title: 'Platform crowding', description: 'Heavier than usual footfall on the platform, allow extra time to board.',
    reportedAgo: '3 min ago', confirmations: 18,
  },
  {
    type: 'crowding', color: '#f59e0b', lat: 51.52552, lng: -0.11803,
    title: 'Platform crowding', description: 'Busy due to a nearby event finishing, expect a wait to board.',
    reportedAgo: '11 min ago', confirmations: 9,
  },
]

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

export default function MapPanel({ layers, nearby, activeLines = [], highlightLines = [], className = 'h-[420px] lg:h-[520px]' }) {
  const mapRef = useRef(null)
  const [stationScores, setStationScores] = useState({})

  useEffect(() => {
    getStationScores(stations.map((s) => s.id)).then(setStationScores)
  }, [])

  const isOn = (list, label) => list.find((i) => i.label === label)?.enabled
  const visibleLines = highlightLines.length ? highlightLines : activeLines

  return (
    <div className={`relative w-full ${className} overflow-hidden bg-slate-100`}>
      <MapContainer center={CENTER} zoom={16} zoomControl={false} className="w-full h-full">
        <MapBridge mapRef={mapRef} />
        <TileLayer
          attribution='&copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />

{Object.entries(tubeLineGeometry)
          .filter(([name]) => visibleLines.includes(name))
          .map(([name, segments]) => {
            const isJourneyLine = highlightLines.includes(name)
            const color = lines.find((l) => l.name === name)?.color
            return segments.map((positions, i) => (
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

        {stations.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={stationIcon(stationScores[s.id])}>
            <Tooltip direction="top" permanent offset={[0, -16]} className="!bg-transparent !border-0 !shadow-none !text-[11px] !font-semibold !text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {s.name}
            </Tooltip>
            <Popup minWidth={260}>
              <StationPopup stationId={s.id} stationName={s.name} />
            </Popup>
          </Marker>
        ))}

        {scatterMarkers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={badgeIcon(m.type, m.color)}>
            <Popup minWidth={220}>
              <DisruptionPopup marker={m} />
            </Popup>
          </Marker>
        ))}

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

      <div className="absolute top-3 left-3 z-[1000] w-56 max-w-[70vw] bg-slate-900 text-white rounded-xl p-4 shadow-lg">
        <CloudLightning size={20} className="mb-3 text-slate-300" />
        <p className="text-sm font-semibold leading-snug">Expect Disruption 43% Chance Of Service Changes.</p>
        <p className="text-xs text-slate-400 mt-2">📍 Ealing</p>
      </div>

      <div className="absolute right-3 bottom-24 z-[1000] flex flex-col gap-2">
        <button aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="w-11 h-11 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50">
          <Plus size={18} />
        </button>
        <button aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="w-11 h-11 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50">
          <Minus size={18} />
        </button>
        <button aria-label="Recenter map" onClick={() => mapRef.current?.setView(CENTER, 16)} className="w-11 h-11 bg-white shadow-sm rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50">
          <LocateFixed size={18} />
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