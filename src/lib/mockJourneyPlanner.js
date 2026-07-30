import { lines } from '../data/mockData'

// Everything in this file is fake data shaped like a real journey planner
// response would be. When a real API (TransportAPI or similar) is wired
// up, only this function needs to change, JourneyResults.jsx doesn't care
// where the data comes from as long as the shape stays the same.

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function pickLine(seed) {
  return lines[seed % lines.length]
}

function seedFrom(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 997
  return h
}

export function planJourney(from, to) {
  const originName = from?.trim() || 'Current location'
  const destName = to?.trim() || 'Nearest interchange'
  const seed = seedFrom(originName + destName)

  const changeCount = seed % 3 === 0 ? 1 : 0
  const now = new Date()
  let cursor = new Date(now.getTime() + ((seed % 6) + 2) * 60000)

  const legs = []
  const stopoverStations = ['Bank', 'Oxford Circus', "King's Cross St Pancras", 'Stratford']
  const midStation = stopoverStations[seed % stopoverStations.length]

  const leg1Line = pickLine(seed)
  const leg1Duration = 12 + (seed % 10)
  const leg1Depart = new Date(cursor)
  const leg1Arrive = new Date(cursor.getTime() + leg1Duration * 60000)

  legs.push({
    line: leg1Line.name,
    color: leg1Line.color,
    from: originName,
    to: changeCount ? midStation : destName,
    platform: String(1 + (seed % 8)),
    departTime: formatTime(leg1Depart),
    arriveTime: formatTime(leg1Arrive),
    durationMin: leg1Duration,
  })

  cursor = leg1Arrive

  if (changeCount) {
    const changeWait = 3 + (seed % 5)
    const leg2Depart = new Date(cursor.getTime() + changeWait * 60000)
    const leg2Line = pickLine(seed + 1)
    const leg2Duration = 9 + (seed % 8)
    const leg2Arrive = new Date(leg2Depart.getTime() + leg2Duration * 60000)

    legs.push({
      line: leg2Line.name,
      color: leg2Line.color,
      from: midStation,
      to: destName,
      platform: String(1 + ((seed + 3) % 6)),
      departTime: formatTime(leg2Depart),
      arriveTime: formatTime(leg2Arrive),
      durationMin: leg2Duration,
    })

    cursor = leg2Arrive
  }

  const totalMin = Math.round((cursor.getTime() - leg1Depart.getTime()) / 60000)

  return {
    origin: originName,
    destination: destName,
    departTime: legs[0].departTime,
    arriveTime: legs[legs.length - 1].arriveTime,
    totalMin,
    changes: legs.length - 1,
    legs,
  }
}