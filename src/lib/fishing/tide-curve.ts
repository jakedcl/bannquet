import type { TideExtreme, TidePoint } from '@/lib/fishing/tides'

/** Smooth half-cosine between successive high and low waters. */
export function cosineCurve(extremes: TideExtreme[], stepMs = 15 * 60 * 1000): TidePoint[] {
  if (extremes.length < 2) return []
  const ordered = [...extremes].sort((a, b) => a.time - b.time)
  const points: TidePoint[] = []
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index]
    const end = ordered[index + 1]
    const span = end.time - start.time
    if (span <= 0) continue
    const steps = Math.max(2, Math.round(span / stepMs))
    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps
      const eased = (1 - Math.cos(Math.PI * progress)) / 2
      points.push({
        time: start.time + span * progress,
        feet: start.feet + (end.feet - start.feet) * eased,
      })
    }
  }
  const last = ordered[ordered.length - 1]
  points.push({ time: last.time, feet: last.feet })
  return points
}

export function heightAt(points: TidePoint[], time: number): number | null {
  if (points.length === 0) return null
  if (time <= points[0].time || time >= points[points.length - 1].time) {
    return time <= points[0].time ? points[0].feet : points[points.length - 1].feet
  }
  for (let index = 1; index < points.length; index += 1) {
    const end = points[index]
    const start = points[index - 1]
    if (time > end.time) continue
    const span = end.time - start.time || 1
    const progress = (time - start.time) / span
    return start.feet + (end.feet - start.feet) * progress
  }
  return null
}

export function tideAxisTicks(min: number, max: number): number[] {
  const span = Math.max(1, max - min)
  const step = span <= 6 ? 1 : span <= 12 ? 2 : 5
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 10; value += step) ticks.push(value)
  return ticks
}
