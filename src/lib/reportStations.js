import nationalRail from '../data/nationalRailStations.json' with { type: 'json' }
import { stations } from '../data/mockData.js'

export const normalizeStationSearch = (value) => value
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')

// Keep local station names so reports still match the map and journey feeds.
const byName = new Map(stations.map((station) => [
  normalizeStationSearch(station.name), { name: station.name, code: '' },
]))
for (const station of nationalRail.stations) {
  const key = normalizeStationSearch(station.name)
  byName.set(key, { ...station, name: byName.get(key)?.name || station.name })
}

export const reportStations = [...byName.values()]
  .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
  .map((station) => ({
    ...station,
    searchName: normalizeStationSearch(station.name),
    searchCode: station.code.toLowerCase(),
  }))

export function findReportStations(query) {
  const search = normalizeStationSearch(query)
  if (!search) return reportStations
  return reportStations.filter((station) =>
    station.searchName.includes(search) || station.searchCode.includes(search)
  ).sort((a, b) =>
    Number(b.searchCode === search) - Number(a.searchCode === search)
    || Number(b.searchName.startsWith(search)) - Number(a.searchName.startsWith(search))
    || a.name.localeCompare(b.name, 'en-GB')
  )
}

export function resolveReportStation(query) {
  const search = normalizeStationSearch(query)
  if (!search) return undefined
  return reportStations.find((station) =>
    station.searchName === search || station.searchCode === search
  )
}
