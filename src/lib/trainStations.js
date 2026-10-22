import northernIreland from '../data/northernIrelandStations.json' with { type: 'json' }
import { reportStations, normalizeStationSearch } from './reportStations.js'

// Keep the reporting directory unchanged; train lookup also covers Translink.
export const trainStations = [
  ...reportStations.filter((station) => station.code).map((station) => ({ ...station, network: 'national-rail' })),
  ...northernIreland.stations.map((name) => ({
    name, code: '', network: 'translink', searchName: normalizeStationSearch(name), searchCode: '',
  })),
].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))

export function findTrainStations(query) {
  const search = normalizeStationSearch(query)
  if (!search) return trainStations
  return trainStations.filter((station) => station.searchName.includes(search) || station.searchCode.includes(search))
    .sort((a, b) => Number(b.searchCode === search) - Number(a.searchCode === search)
      || Number(b.searchName.startsWith(search)) - Number(a.searchName.startsWith(search))
      || a.name.localeCompare(b.name, 'en-GB'))
}

export function resolveTrainStation(query) {
  const search = normalizeStationSearch(query)
  if (!search) return undefined
  return trainStations.find((station) => station.searchName === search || station.searchCode === search)
}

export function trainSearchLink(station) {
  if (!station) return null
  if (station.network === 'translink') return 'https://www.translink.co.uk/'
  return `https://www.nationalrail.co.uk/live-trains/departures/${encodeURIComponent(station.code)}/`
}
