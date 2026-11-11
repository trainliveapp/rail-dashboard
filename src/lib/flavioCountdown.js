export function parseLaunchTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null
  const timestamp = new Date(value)
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString().slice(0, 19) === value.slice(0, 19) ? timestamp : null
}

function plusMonths(date, count) {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + count)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export function calendarCountdown(now, target) {
  if (!Number.isFinite(+now) || !Number.isFinite(+target)) throw new TypeError('Valid dates are required.')
  if (now >= target) return { months: 0, days: 0, hours: 0, minutes: 0 }
  let months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + target.getUTCMonth() - now.getUTCMonth()
  while (months > 0 && plusMonths(now, months) > target) months--
  let ms = target - plusMonths(now, months)
  const days = Math.floor(ms / 86400000); ms %= 86400000
  const hours = Math.floor(ms / 3600000); ms %= 3600000
  return { months, days, hours, minutes: Math.floor(ms / 60000) }
}
