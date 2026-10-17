import { easternDate, easternMidnight, addCalendarDays } from '@/lib/fishing/clock'

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

function rev(degrees: number): number {
  const wrapped = degrees % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

function sin(degrees: number): number {
  return Math.sin(degrees * DEG)
}

function cos(degrees: number): number {
  return Math.cos(degrees * DEG)
}

function atan2deg(y: number, x: number): number {
  return Math.atan2(y, x) * RAD
}

function dayNumber(time: number): number {
  return time / 86_400_000 + 2_440_587.5 - 2_451_543.5
}

type SunElements = { M: number; w: number; lon: number; ra: number; dec: number }

function sunElements(time: number): SunElements {
  const d = dayNumber(time)
  const w = rev(282.9404 + 4.70935e-5 * d)
  const e = 0.016709 - 1.151e-9 * d
  const M = rev(356.047 + 0.9856002585 * d)
  const ecl = 23.4393 - 3.563e-7 * d
  let E = M + e * RAD * sin(M) * (1 + e * cos(M))
  for (let pass = 0; pass < 4; pass += 1) {
    E -= (E - e * RAD * sin(E) - M) / (1 - e * cos(E))
  }
  const xv = cos(E) - e
  const yv = Math.sqrt(1 - e * e) * sin(E)
  const lon = rev(atan2deg(yv, xv) + w)
  const radius = Math.hypot(xv, yv)
  const xe = radius * cos(lon)
  const ye = radius * sin(lon) * cos(ecl)
  const ze = radius * sin(lon) * sin(ecl)
  return { M, w, lon, ra: rev(atan2deg(ye, xe)), dec: atan2deg(ze, Math.hypot(xe, ye)) }
}

type MoonPlace = { lon: number; ra: number; dec: number; r: number }

function moonPlace(time: number): MoonPlace {
  const d = dayNumber(time)
  const N = rev(125.1228 - 0.0529538083 * d)
  const i = 5.1454
  const w = rev(318.0634 + 0.1643573223 * d)
  const a = 60.2666
  const e = 0.0549
  const M = rev(115.3654 + 13.0649929509 * d)
  const ecl = 23.4393 - 3.563e-7 * d
  let E = M + e * RAD * sin(M) * (1 + e * cos(M))
  for (let pass = 0; pass < 6; pass += 1) {
    E -= (E - e * RAD * sin(E) - M) / (1 - e * cos(E))
  }
  const xv = a * (cos(E) - e)
  const yv = a * Math.sqrt(1 - e * e) * sin(E)
  const v = atan2deg(yv, xv)
  let r = Math.hypot(xv, yv)
  const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i))
  const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i))
  const zh = r * sin(v + w) * sin(i)
  let lonecl = rev(atan2deg(yh, xh))
  let latecl = atan2deg(zh, Math.hypot(xh, yh))

  const sun = sunElements(time)
  const Ls = rev(sun.M + sun.w)
  const Lm = rev(M + w + N)
  const D = rev(Lm - Ls)
  const F = rev(Lm - N)
  lonecl = rev(
    lonecl
    - 1.274 * sin(M - 2 * D)
    + 0.658 * sin(2 * D)
    - 0.186 * sin(sun.M)
    - 0.059 * sin(2 * M - 2 * D)
    - 0.057 * sin(M - 2 * D + sun.M)
    + 0.053 * sin(M + 2 * D)
    + 0.046 * sin(2 * D - sun.M)
    + 0.041 * sin(M - sun.M)
    - 0.035 * sin(D)
    - 0.031 * sin(M + sun.M)
    - 0.015 * sin(2 * F - 2 * D)
    + 0.011 * sin(M - 4 * D),
  )
  latecl +=
    -0.173 * sin(F - 2 * D)
    - 0.055 * sin(M - F - 2 * D)
    - 0.046 * sin(M + F - 2 * D)
    + 0.033 * sin(F + 2 * D)
    + 0.017 * sin(2 * M + F)
  r += -0.58 * cos(M - 2 * D) - 0.46 * cos(2 * D)

  const x = r * cos(lonecl) * cos(latecl)
  const y = r * sin(lonecl) * cos(latecl)
  const z = r * sin(latecl)
  const xe = x
  const ye = y * cos(ecl) - z * sin(ecl)
  const ze = y * sin(ecl) + z * cos(ecl)
  return { lon: lonecl, ra: rev(atan2deg(ye, xe)), dec: atan2deg(ze, Math.hypot(xe, ye)), r }
}

function localSidereal(time: number, longitude: number): number {
  const sun = sunElements(time)
  const gmst0 = rev(rev(sun.M + sun.w) + 180)
  const ut = new Date(time)
  const hours = ut.getUTCHours() + ut.getUTCMinutes() / 60 + ut.getUTCSeconds() / 3600 + ut.getUTCMilliseconds() / 3_600_000
  return rev(gmst0 + hours * 15 + longitude)
}

function altitude(time: number, latitude: number, longitude: number, body: 'sun' | 'moon'): number {
  const lst = localSidereal(time, longitude)
  if (body === 'sun') {
    const sun = sunElements(time)
    const hour = lst - sun.ra
    return Math.asin(sin(latitude) * sin(sun.dec) + cos(latitude) * cos(sun.dec) * cos(hour)) * RAD
  }
  const moon = moonPlace(time)
  const hour = lst - moon.ra
  const geocentric = Math.asin(sin(latitude) * sin(moon.dec) + cos(latitude) * cos(moon.dec) * cos(hour)) * RAD
  const parallax = Math.asin(1 / moon.r) * RAD
  return geocentric - parallax * Math.cos(geocentric * DEG)
}

function nearest(target: number, delta: number): number {
  const wrapped = rev(delta - target + 180) - 180
  return Math.abs(wrapped)
}

export function moonPhaseName(time: number): string {
  const elong = rev(moonPlace(time).lon - sunElements(time).lon)
  if (nearest(0, elong) <= 8) return 'New moon'
  if (nearest(90, elong) <= 8) return 'First quarter'
  if (nearest(180, elong) <= 8) return 'Full moon'
  if (nearest(270, elong) <= 8) return 'Last quarter'
  if (elong < 90) return 'Waxing crescent'
  if (elong < 180) return 'Waxing gibbous'
  if (elong < 270) return 'Waning gibbous'
  return 'Waning crescent'
}

type Sample = { time: number; alt: number }

function samples(start: number, end: number, latitude: number, longitude: number, body: 'sun' | 'moon'): Sample[] {
  const step = 5 * 60 * 1000
  const rows: Sample[] = []
  for (let time = start; time <= end; time += step) {
    rows.push({ time, alt: altitude(time, latitude, longitude, body) })
  }
  return rows
}

function refineCrossing(left: Sample, right: Sample, latitude: number, longitude: number, body: 'sun' | 'moon', horizon: number): number {
  let lo = left.time
  let hi = right.time
  const rising = right.alt > left.alt
  for (let pass = 0; pass < 12; pass += 1) {
    const mid = (lo + hi) / 2
    const above = altitude(mid, latitude, longitude, body) >= horizon
    if (above === rising) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

function refineExtreme(seed: number, latitude: number, longitude: number, body: 'sun' | 'moon', kind: 'max' | 'min'): number {
  let lo = seed - 20 * 60 * 1000
  let hi = seed + 20 * 60 * 1000
  for (let pass = 0; pass < 12; pass += 1) {
    const left = lo + (hi - lo) / 3
    const right = hi - (hi - lo) / 3
    const leftAlt = altitude(left, latitude, longitude, body)
    const rightAlt = altitude(right, latitude, longitude, body)
    if ((kind === 'max' && leftAlt < rightAlt) || (kind === 'min' && leftAlt > rightAlt)) lo = left
    else hi = right
  }
  return (lo + hi) / 2
}

function crossings(rows: Sample[], latitude: number, longitude: number, body: 'sun' | 'moon', horizon: number): { rise: number | null; set: number | null } {
  let rise: number | null = null
  let set: number | null = null
  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index]
    const right = rows[index + 1]
    const below = left.alt < horizon
    const above = right.alt >= horizon
    if (below && above && rise == null) rise = refineCrossing(left, right, latitude, longitude, body, horizon)
    if (!below && right.alt < horizon && set == null) set = refineCrossing(left, right, latitude, longitude, body, horizon)
  }
  return { rise, set }
}

function extreme(rows: Sample[], latitude: number, longitude: number, body: 'sun' | 'moon', kind: 'max' | 'min'): number | null {
  let best: Sample | null = null
  for (let index = 1; index < rows.length - 1; index += 1) {
    const row = rows[index]
    const local = kind === 'max'
      ? row.alt >= rows[index - 1].alt && row.alt >= rows[index + 1].alt
      : row.alt <= rows[index - 1].alt && row.alt <= rows[index + 1].alt
    if (!local) continue
    if (!best || (kind === 'max' ? row.alt > best.alt : row.alt < best.alt)) best = row
  }
  return best ? refineExtreme(best.time, latitude, longitude, body, kind) : null
}

export type SolunarPeriod = {
  label: 'Major' | 'Minor'
  start: number
  end: number
}

export type SkyDay = {
  sunrise: number | null
  sunset: number | null
  moonPhase: string
  periods: SolunarPeriod[]
}

function windowFor(center: number | null, minutes: number, label: SolunarPeriod['label'], dayStart: number, dayEnd: number): SolunarPeriod | null {
  if (center == null || center < dayStart || center >= dayEnd) return null
  return { label, start: center - minutes * 60 * 1000, end: center + minutes * 60 * 1000 }
}

/** Sunrise, sunset, moon phase, and solunar periods for the Eastern calendar day. */
export function skyFor(latitude: number, longitude: number, now: number): SkyDay {
  const date = easternDate(now)
  const start = easternMidnight(date)
  const end = easternMidnight(addCalendarDays(date, 1))
  const sun = crossings(samples(start, end, latitude, longitude, 'sun'), latitude, longitude, 'sun', -0.833)
  const moonRows = samples(start, end, latitude, longitude, 'moon')
  const moon = crossings(moonRows, latitude, longitude, 'moon', -0.125)
  const overhead = extreme(moonRows, latitude, longitude, 'moon', 'max')
  const underfoot = extreme(moonRows, latitude, longitude, 'moon', 'min')
  const periods = [
    windowFor(overhead, 60, 'Major', start, end),
    windowFor(underfoot, 60, 'Major', start, end),
    windowFor(moon.rise, 30, 'Minor', start, end),
    windowFor(moon.set, 30, 'Minor', start, end),
  ].flatMap((period) => (period ? [period] : []))
  periods.sort((a, b) => a.start - b.start)
  return {
    sunrise: sun.rise,
    sunset: sun.set,
    moonPhase: moonPhaseName(start + 12 * 60 * 60 * 1000),
    periods,
  }
}
