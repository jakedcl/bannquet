/**
 * The phone bottom sheet's snap logic, as plain functions (no DOM), so it can be tested.
 *
 * The sheet has three resting heights: `peek` (just the handle and the search bar), `half` (the pills and the top of
 * the list) and `full` (almost the whole screen). Heights are in pixels, measured up from the bottom of the screen.
 * Velocities are in pixels per second, positive when the sheet is moving up (getting taller).
 */

export type SnapName = 'peek' | 'half' | 'full'
export type SnapHeights = Record<SnapName, number>

export const SNAP_ORDER: SnapName[] = ['peek', 'half', 'full']

/** The handle and the search bar, without the home-bar space under them. */
export const PEEK_CONTENT_PX = 84
/** How much map is left showing above the sheet when it is fully up. */
export const FULL_TOP_GAP_PX = 16
/** Faster than this and a swipe jumps a whole level instead of settling where it landed. */
export const FLICK_VELOCITY = 900
/** How far ahead (seconds) a moving sheet is assumed to carry on, when choosing where it settles. */
const MOMENTUM_SECONDS = 0.12
/** Movement under this (pixels) is a tap, not a drag. */
export const TAP_SLOP_PX = 6

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The three resting heights for a screen `containerHeight` tall, with `safeBottom` pixels kept clear for a home bar. */
export function snapHeights(containerHeight: number, safeBottom = 0): SnapHeights {
  const peek = PEEK_CONTENT_PX + Math.max(0, safeBottom)
  const full = Math.max(peek + 160, containerHeight - FULL_TOP_GAP_PX)
  const half = clamp(Math.round(containerHeight * 0.5), peek + 120, full - 100)
  return {peek, half, full}
}

/** Move up or down one level (staying put at the ends). */
export function stepSnap(from: SnapName, direction: 1 | -1): SnapName {
  const index = SNAP_ORDER.indexOf(from) + direction
  return SNAP_ORDER[clamp(index, 0, SNAP_ORDER.length - 1)]!
}

/** A tap on the handle: peek opens to half; half closes to peek; full comes down to half. */
export function toggleSnap(current: SnapName): SnapName {
  return current === 'peek' ? 'half' : current === 'half' ? 'peek' : 'half'
}

/**
 * Where the sheet settles when let go at `height` moving at `velocity`, having started from `from`.
 * A fast swipe (over FLICK_VELOCITY) jumps one level the way it went. A slower one carries on a little and lands on
 * the nearest resting height.
 */
export function settleSnap(params: {height: number; velocity: number; heights: SnapHeights; from: SnapName}): SnapName {
  const {height, velocity, heights, from} = params
  if (Math.abs(velocity) > FLICK_VELOCITY) {
    // From wherever it is now: a flick up from between half and full goes to full, not just one past where it began.
    const direction = velocity > 0 ? 1 : -1
    const passed = SNAP_ORDER.filter((name) => (direction > 0 ? heights[name] > height : heights[name] < height))
    const next = direction > 0 ? passed[0] : passed[passed.length - 1]
    return next ?? stepSnap(from, direction)
  }
  const projected = height + velocity * MOMENTUM_SECONDS
  let best: SnapName = SNAP_ORDER[0]!
  for (const name of SNAP_ORDER) {
    if (Math.abs(heights[name] - projected) < Math.abs(heights[best] - projected)) best = name
  }
  return best
}

/**
 * The height to show while dragging: it follows the finger, but past the lowest or highest point it resists (like
 * a rubber band) instead of going on forever.
 */
export function dragHeight(requested: number, heights: SnapHeights): number {
  const {peek, full} = heights
  const stretch = 40
  if (requested > full) return full + stretch * (1 - Math.exp(-(requested - full) / 120))
  if (requested < peek) return peek - stretch * (1 - Math.exp(-(peek - requested) / 120))
  return requested
}

/** Speed (pixels per second, positive = up) from recent touch/pointer positions, using the last ~100 ms. */
export function estimateVelocity(samples: {y: number; t: number}[], windowMs = 100): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]!
  let first = last
  for (let i = samples.length - 2; i >= 0; i -= 1) {
    if (last.t - samples[i]!.t > windowMs) break
    first = samples[i]!
  }
  const elapsed = (last.t - first.t) / 1000
  if (elapsed <= 0) return 0
  // screen y grows downward, so moving up is a negative change in y
  return -(last.y - first.y) / elapsed
}

/**
 * Who owns a touch that starts on the list inside the sheet: the list (it scrolls) or the sheet (it moves).
 * The sheet only takes over when the list is already scrolled to the top and the finger pulls down.
 * `dy` is how far the finger has moved since it touched (positive = down).
 */
export function listGestureOwner(params: {scrollTop: number; dy: number}): 'list' | 'sheet' {
  return params.scrollTop <= 0 && params.dy > 0 ? 'sheet' : 'list'
}

/** A keyboard is at least this tall (pixels); smaller changes in the visible height are browser bars, not a keyboard. */
export const KEYBOARD_MIN_PX = 120

/**
 * Where the sheet goes while the on-screen keyboard is open: it rises to sit just above the keyboard and grows to
 * fill all the room above it, so the search bar is at the very top of what the person can see and as many results
 * as possible are showing. Comes from the page's visual viewport (the part of the page not covered by the keyboard).
 */
export function keyboardLayout(params: {
  /** Height of the whole page area (window.innerHeight). */
  layoutHeight: number
  /** Height of what is actually visible (visualViewport.height). */
  viewportHeight: number
  /** How far the visible part has been scrolled down from the top (visualViewport.offsetTop). */
  viewportOffsetTop: number
  /** Height of the box the sheet sits in. */
  containerHeight: number
}): {open: boolean; bottom: number; height: number} {
  const covered = Math.max(0, params.layoutHeight - params.viewportHeight - params.viewportOffsetTop)
  if (covered < KEYBOARD_MIN_PX) return {open: false, bottom: 0, height: 0}
  return {
    open: true,
    bottom: covered,
    height: Math.max(PEEK_CONTENT_PX, Math.min(params.viewportHeight - 4, params.containerHeight - covered)),
  }
}
