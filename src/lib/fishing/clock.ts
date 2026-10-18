const ZONE = 'America/New_York'

export function easternDate(time: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(time)
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return utc.toISOString().slice(0, 10)
}

export function compactDate(isoDate: string): string {
  return isoDate.replaceAll('-', '')
}

/** Interpret a NOAA lst_ldt stamp, "yyyy-mm-dd hh:mm", as America/New_York. */
export function zonedStamp(stamp: string, timeZone = ZONE): number {
  const [date, time] = stamp.trim().split(/[T ]/)
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  let utc = wanted
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = Object.fromEntries(format.formatToParts(new Date(utc)).map((part) => [part.type, part.value]))
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    const delta = wanted - shown
    if (delta === 0) break
    utc += delta
  }
  return utc
}

export function easternMidnight(isoDate: string): number {
  return zonedStamp(`${isoDate} 00:00`)
}

export function formatEasternTime(time: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(time)
}

export function formatEasternDay(time: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(time)
}

export function formatEasternRange(start: number, end: number): string {
  return `${formatEasternTime(start)}–${formatEasternTime(end)}`
}
