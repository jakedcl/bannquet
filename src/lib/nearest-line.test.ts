import {describe, it} from 'node:test'
import {expect} from './test-expect'

import {distanceToPolyline, nearestTrack, TIE_PIXELS, type TrackCandidate} from './nearest-line'

const line = (...points: [number, number][]) => points.map(([x, y]) => ({x, y}))

describe('distanceToPolyline', () => {
  it('is zero on the line and the straight-across distance beside it', () => {
    const l = line([0, 0], [100, 0])
    expect(distanceToPolyline(50, 0, l)).toBe(0)
    expect(distanceToPolyline(50, 7, l)).toBe(7)
    expect(distanceToPolyline(50, -7, l)).toBe(7)
  })

  it('measures to the end of a line when the click is past it', () => {
    expect(distanceToPolyline(103, 4, line([0, 0], [100, 0]))).toBe(5)
  })

  it('finds the nearest of several segments, bends and all', () => {
    const l = line([0, 0], [100, 0], [100, 100])
    expect(distanceToPolyline(90, 50, l)).toBe(10)
    expect(distanceToPolyline(40, 3, l)).toBe(3)
  })

  it('copes with a single point, a zero-length segment and no line at all', () => {
    expect(distanceToPolyline(3, 4, line([0, 0]))).toBe(5)
    expect(distanceToPolyline(3, 4, line([0, 0], [0, 0]))).toBe(5)
    expect(distanceToPolyline(3, 4, [])).toBe(Infinity)
  })
})

describe('nearestTrack', () => {
  const route = (id: string, order: number, y: number): TrackCandidate => ({kind: 'track', id, order, line: line([0, y], [200, y])})
  const flight = (id: string, order: number, y: number): TrackCandidate => ({kind: 'flight', id, order, line: line([0, y], [200, y])})

  it('picks the line nearest the click, however the lines are stacked', () => {
    // the one drawn on top is further from the click than the one underneath
    const top = flight('top', 0, 20)
    const under = route('under', 1, 54)
    expect(nearestTrack({x: 100, y: 50}, [top, under], 40)?.id).toBe('under')
    expect(nearestTrack({x: 100, y: 25}, [top, under], 40)?.id).toBe('top')
  })

  it('picks the nearest of many overlapping lines', () => {
    const many = [flight('a', 0, 40), flight('b', 1, 47), route('c', 2, 51), route('d', 3, 60)]
    expect(nearestTrack({x: 50, y: 50}, many, 30)?.id).toBe('c')
    expect(nearestTrack({x: 50, y: 41}, many, 30)?.id).toBe('a')
    expect(nearestTrack({x: 50, y: 59}, many, 30)?.id).toBe('d')
  })

  it('prefers the one drawn on top when two are effectively tied', () => {
    const top = flight('top', 0, 50)
    const under = route('under', 1, 50 + TIE_PIXELS / 2)
    expect(nearestTrack({x: 100, y: 50}, [under, top], 20)?.id).toBe('top')
    // exactly the same line (a route and a flight drawn over each other): the top one
    expect(nearestTrack({x: 100, y: 50}, [route('r', 5, 50), flight('f', 2, 50)], 20)?.id).toBe('f')
  })

  it('does not let a tie-break beat a clearly nearer line', () => {
    const top = flight('top', 0, 50 + TIE_PIXELS * 3)
    const under = route('under', 1, 50)
    expect(nearestTrack({x: 100, y: 50}, [top, under], 20)?.id).toBe('under')
  })

  it('ignores lines out of reach, and says nothing when none are in reach', () => {
    expect(nearestTrack({x: 100, y: 50}, [route('far', 0, 90)], 20)).toBeNull()
    expect(nearestTrack({x: 100, y: 50}, [route('far', 0, 90), route('near', 1, 62)], 20)?.id).toBe('near')
    expect(nearestTrack({x: 100, y: 50}, [], 20)).toBeNull()
  })

  it('uses a distance that is already known (a floating flight tube)', () => {
    const tube: TrackCandidate = {kind: 'flight', id: 'tube', order: -1, distance: 3}
    expect(nearestTrack({x: 0, y: 0}, [route('flat', 0, 15), tube], 20)?.id).toBe('tube')
    expect(nearestTrack({x: 0, y: 0}, [{...tube, distance: 30}], 20)).toBeNull()
  })

  it('gives the same answer at every zoom: the same picture, enlarged', () => {
    for (const scale of [0.25, 1, 4, 16]) {
      const a = {kind: 'track' as const, id: 'a', order: 0, line: line([0, 0], [100 * scale, 20 * scale])}
      const b = {kind: 'flight' as const, id: 'b', order: 1, line: line([0, 10 * scale], [100 * scale, 0])}
      // near the start of a (a is clearly nearer there), and near the start of b
      expect(nearestTrack({x: 10 * scale, y: 1 * scale}, [a, b], 1000)?.id).toBe('a')
      expect(nearestTrack({x: 10 * scale, y: 9.5 * scale}, [a, b], 1000)?.id).toBe('b')
    }
  })

  it('a wider reach (a finger) finds what a narrow one (a mouse) misses', () => {
    const l = [route('r', 0, 70)]
    expect(nearestTrack({x: 100, y: 50}, l, 12)).toBeNull()
    expect(nearestTrack({x: 100, y: 50}, l, 22)?.id).toBe('r')
  })
})
