import {describe, it} from 'node:test'
import {expect} from './test-expect'

import {
  dragHeight,
  estimateVelocity,
  FLICK_VELOCITY,
  keyboardLayout,
  listGestureOwner,
  PEEK_CONTENT_PX,
  settleSnap,
  snapHeights,
  stepSnap,
  toggleSnap,
} from './sheet-snap'

const heights = snapHeights(800, 0) // peek 84, half 400, full 784

describe('snapHeights', () => {
  it('has a peek, a half and an almost-full height, in order', () => {
    expect(heights.peek).toBe(PEEK_CONTENT_PX)
    expect(heights.half).toBe(400)
    expect(heights.full).toBe(800 - 16)
    expect(heights.peek).toBeLessThan(heights.half)
    expect(heights.half).toBeLessThan(heights.full)
  })

  it('keeps the home-bar space under the peek', () => {
    expect(snapHeights(800, 34).peek).toBe(PEEK_CONTENT_PX + 34)
  })

  it('still gives three distinct heights on a very short screen', () => {
    const short = snapHeights(300, 0)
    expect(short.peek).toBeLessThan(short.half)
    expect(short.half).toBeLessThan(short.full)
  })
})

describe('toggleSnap and stepSnap', () => {
  it('a tap goes peek to half, half to peek, and full down to half', () => {
    expect(toggleSnap('peek')).toBe('half')
    expect(toggleSnap('half')).toBe('peek')
    expect(toggleSnap('full')).toBe('half')
  })

  it('steps a level and stops at the ends', () => {
    expect(stepSnap('peek', 1)).toBe('half')
    expect(stepSnap('half', 1)).toBe('full')
    expect(stepSnap('full', 1)).toBe('full')
    expect(stepSnap('peek', -1)).toBe('peek')
    expect(stepSnap('full', -1)).toBe('half')
  })
})

describe('settleSnap', () => {
  it('lands on the nearest height when let go slowly', () => {
    expect(settleSnap({height: 120, velocity: 0, heights, from: 'peek'})).toBe('peek')
    expect(settleSnap({height: 300, velocity: 0, heights, from: 'peek'})).toBe('half')
    expect(settleSnap({height: 600, velocity: 0, heights, from: 'half'})).toBe('full')
    expect(settleSnap({height: 250, velocity: 0, heights, from: 'half'})).toBe('half')
    expect(settleSnap({height: 200, velocity: 0, heights, from: 'half'})).toBe('peek')
  })

  it('carries on a little with a gentle flick', () => {
    // let go a bit below half but moving up
    expect(settleSnap({height: 330, velocity: 500, heights, from: 'peek'})).toBe('half')
    // let go just under the halfway point to full, moving up gently: carried over it
    expect(settleSnap({height: 560, velocity: 700, heights, from: 'half'})).toBe('full')
    // the same place moving down: back to half
    expect(settleSnap({height: 560, velocity: -300, heights, from: 'full'})).toBe('half')
  })

  it('a fast swipe up jumps a level, even from a short drag', () => {
    expect(settleSnap({height: 100, velocity: FLICK_VELOCITY + 100, heights, from: 'peek'})).toBe('half')
    expect(settleSnap({height: 420, velocity: FLICK_VELOCITY + 100, heights, from: 'half'})).toBe('full')
  })

  it('a fast swipe down jumps a level', () => {
    expect(settleSnap({height: 700, velocity: -(FLICK_VELOCITY + 100), heights, from: 'full'})).toBe('half')
    expect(settleSnap({height: 380, velocity: -(FLICK_VELOCITY + 100), heights, from: 'half'})).toBe('peek')
  })

  it('a fast swipe past the ends stays at the end', () => {
    expect(settleSnap({height: 780, velocity: 3000, heights, from: 'full'})).toBe('full')
    expect(settleSnap({height: 90, velocity: -3000, heights, from: 'peek'})).toBe('peek')
  })

  it('a fast swipe that has already crossed a height goes to the next one in its direction', () => {
    // dragged up past half, then flicked up: full (not back to half)
    expect(settleSnap({height: 450, velocity: 1500, heights, from: 'peek'})).toBe('full')
    // dragged down below half, then flicked down: peek
    expect(settleSnap({height: 350, velocity: -1500, heights, from: 'full'})).toBe('peek')
  })
})

describe('dragHeight', () => {
  it('follows the finger within the range', () => {
    expect(dragHeight(300, heights)).toBe(300)
    expect(dragHeight(heights.peek, heights)).toBe(heights.peek)
    expect(dragHeight(heights.full, heights)).toBe(heights.full)
  })

  it('resists beyond the ends, and never runs away', () => {
    const over = dragHeight(heights.full + 200, heights)
    expect(over).toBeGreaterThan(heights.full)
    expect(over).toBeLessThan(heights.full + 41)
    const under = dragHeight(heights.peek - 200, heights)
    expect(under).toBeLessThan(heights.peek)
    expect(under).toBeGreaterThan(heights.peek - 41)
    expect(dragHeight(heights.full + 5, heights)).toBeLessThan(heights.full + 5)
  })
})

describe('estimateVelocity', () => {
  it('is positive for a finger moving up, negative for down', () => {
    const up = [
      {y: 500, t: 0},
      {y: 480, t: 50},
      {y: 460, t: 100},
    ]
    expect(estimateVelocity(up)).toBeCloseTo(400, 0)
    expect(estimateVelocity(up.map((s) => ({...s, y: -s.y})))).toBeCloseTo(-400, 0)
  })

  it('uses only the last moments, not the whole drag', () => {
    const samples = [
      {y: 700, t: 0},
      {y: 300, t: 500}, // fast early on
      {y: 299, t: 550},
      {y: 298, t: 600}, // then nearly still
    ]
    expect(Math.abs(estimateVelocity(samples))).toBeLessThan(50)
  })

  it('is zero with too little to go on', () => {
    expect(estimateVelocity([])).toBe(0)
    expect(estimateVelocity([{y: 1, t: 1}])).toBe(0)
    expect(estimateVelocity([{y: 1, t: 5}, {y: 9, t: 5}])).toBe(0)
  })
})

describe('listGestureOwner', () => {
  it('the list scrolls unless it is at the top and the finger pulls down', () => {
    expect(listGestureOwner({scrollTop: 120, dy: 30})).toBe('list') // scrolled down the list, pulling down: scroll back up
    expect(listGestureOwner({scrollTop: 120, dy: -30})).toBe('list')
    expect(listGestureOwner({scrollTop: 0, dy: -30})).toBe('list') // at the top, pushing up: scrolls the list
    expect(listGestureOwner({scrollTop: 0, dy: 30})).toBe('sheet') // at the top, pulling down: lowers the sheet
  })

  it('a small overscroll at the top still counts as the top', () => {
    expect(listGestureOwner({scrollTop: -3, dy: 12})).toBe('sheet')
  })
})

describe('keyboardLayout', () => {
  const base = {layoutHeight: 800, containerHeight: 704, viewportOffsetTop: 0}

  it('is closed when nothing covers the page, or only a small browser bar does', () => {
    expect(keyboardLayout({...base, viewportHeight: 800}).open).toBe(false)
    expect(keyboardLayout({...base, viewportHeight: 740}).open).toBe(false)
  })

  it('with a keyboard up, sits on top of it and fills the room above it', () => {
    const layout = keyboardLayout({...base, containerHeight: 800, viewportHeight: 500})
    expect(layout.open).toBe(true)
    expect(layout.bottom).toBe(300) // the keyboard's height
    expect(layout.height).toBe(496) // all the visible room
    // with a header above the map, the sheet fills the room below it instead
    expect(keyboardLayout({...base, viewportHeight: 500}).height).toBe(404)
  })

  it('never grows taller than the box it sits in', () => {
    const layout = keyboardLayout({...base, containerHeight: 400, viewportHeight: 500})
    expect(layout.height).toBe(100) // 400 - 300
    expect(layout.bottom + layout.height).toBeLessThanOrEqual(400)
  })

  it('takes a scrolled page into account (the visible part moved down)', () => {
    const layout = keyboardLayout({...base, viewportHeight: 500, viewportOffsetTop: 100})
    expect(layout.bottom).toBe(200)
  })

  it('keeps at least the search bar showing even in a tiny window', () => {
    expect(keyboardLayout({...base, viewportHeight: 150}).height).toBeGreaterThanOrEqual(PEEK_CONTENT_PX)
  })
})
