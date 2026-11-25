/** A spot on the screen, in pixels. */
export type ScreenPoint = {x: number; y: number}

/** A line (a route) that is near a click, as the line it's drawn with on the screen. */
export type TrackCandidate = {
  kind: string
  id: string
  /** The line, projected to screen pixels. Leave out when `distance` is already known (a floating flight tube). */
  line?: ScreenPoint[]
  /** Pixels from the click to the line, when it's already worked out. */
  distance?: number
  /** Stacking order: 0 is drawn on top, higher is further down. */
  order: number
}

/** Shortest distance, in pixels, from a point to a line made of segments. */
export function distanceToPolyline(px: number, py: number, line: ScreenPoint[]): number {
  if (line.length === 0) return Infinity
  if (line.length === 1) return Math.hypot(px - line[0]!.x, py - line[0]!.y)
  let best = Infinity
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1]!
    const b = line[i]!
    const abx = b.x - a.x
    const aby = b.y - a.y
    const length2 = abx * abx + aby * aby
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / length2))
    best = Math.min(best, Math.hypot(px - (a.x + t * abx), py - (a.y + t * aby)))
  }
  return best
}

/** Two lines closer than this (pixels) to the click count as tied. */
export const TIE_PIXELS = 1.5

/**
 * Which track a click means: the one whose line passes nearest the click point. Lines further than `reach` pixels
 * away don't count. If two are effectively tied, the one drawn on top wins. Because it works on screen pixels
 * of what's drawn, it is the same at every zoom level and for a finger as for a mouse (only `reach` differs).
 */
export function nearestTrack(
  point: ScreenPoint,
  candidates: TrackCandidate[],
  reach: number,
): TrackCandidate | null {
  let best: {candidate: TrackCandidate; distance: number} | null = null
  for (const candidate of candidates) {
    const distance = candidate.distance ?? distanceToPolyline(point.x, point.y, candidate.line ?? [])
    if (distance > reach) continue
    if (
      !best ||
      distance < best.distance - TIE_PIXELS ||
      (Math.abs(distance - best.distance) <= TIE_PIXELS && candidate.order < best.candidate.order)
    ) {
      best = {candidate, distance}
    }
  }
  return best?.candidate ?? null
}
