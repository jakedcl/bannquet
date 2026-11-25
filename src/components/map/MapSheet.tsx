'use client'

import {useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode} from 'react'
import {
  dragHeight,
  estimateVelocity,
  keyboardLayout,
  listGestureOwner,
  settleSnap,
  snapHeights,
  stepSnap,
  TAP_SLOP_PX,
  toggleSnap,
  type SnapName,
} from '@/lib/sheet-snap'

type Sample = {y: number; t: number}

/**
 * The phone panel: a bottom sheet with a grab handle and three resting heights (peek: the handle and the search
 * bar; half; full). Drag the handle or the top area to move it; it settles on the nearest height, and a fast swipe
 * jumps a level. Tapping the handle toggles peek and half. The list inside scrolls on its own; only pulling down
 * while it is already at the top lowers the sheet.
 */
export function MapSheet({
  snap,
  onSnapChange,
  onHeightChange,
  header,
  children,
}: {
  snap: SnapName
  onSnapChange: (snap: SnapName) => void
  /** Tells the map how tall the sheet is when it rests, so it can keep what's selected clear of it. */
  onHeightChange?: (height: number) => void
  /** The search bar, pinned under the handle. */
  header: ReactNode
  children: ReactNode
}) {
  const sheetRef = useRef<HTMLElement | null>(null)
  const probeRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({container: 0, safe: 0})
  const heights = snapHeights(size.container || 700, size.safe)
  // With the on-screen keyboard up, the sheet rises onto it and fills the room above, so the search bar is at the
  // top of what's visible and more results show.
  const [keyboard, setKeyboard] = useState({open: false, bottom: 0, height: 0})
  // The drag handlers below outlive a render, so they read the latest values from here.
  const heightsRef = useRef(heights)
  const snapRef = useRef(snap)
  const onSnapChangeRef = useRef(onSnapChange)
  useEffect(() => {
    heightsRef.current = heights
    snapRef.current = snap
    onSnapChangeRef.current = onSnapChange
  })

  // How tall the screen is, and how much room the home bar needs.
  useEffect(() => {
    const sheet = sheetRef.current
    const container = sheet?.parentElement
    if (!sheet || !container) return
    const measure = () => {
      const safe = Number.parseFloat(getComputedStyle(probeRef.current!).paddingBottom) || 0
      setSize((current) => {
        const next = {container: container.clientHeight, safe}
        return current.container === next.container && current.safe === next.safe ? current : next
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    const container = sheetRef.current?.parentElement
    if (!viewport || !container) return
    const update = () => {
      const next = keyboardLayout({
        layoutHeight: window.innerHeight,
        viewportHeight: viewport.height,
        viewportOffsetTop: viewport.offsetTop,
        containerHeight: container.clientHeight,
      })
      setKeyboard((current) =>
        current.open === next.open && current.bottom === next.bottom && current.height === next.height ? current : next,
      )
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  const restingHeight = heights[snap]
  useEffect(() => {
    onHeightChange?.(restingHeight)
  }, [restingHeight, onHeightChange])

  /** Puts the sheet at a snap point (with the slide, unless the person is moving reduced motion). */
  const rest = useCallback((name: SnapName) => {
    const el = sheetRef.current
    if (el) {
      el.style.transition = ''
      el.style.height = `${heightsRef.current[name]}px`
    }
    if (name !== snapRef.current) onSnapChangeRef.current(name)
  }, [])

  const drag = useRef<{
    startY: number
    startHeight: number
    from: SnapName
    samples: Sample[]
    moved: boolean
    pointerId: number
    onHandle: boolean
  } | null>(null)

  const currentHeight = () => sheetRef.current?.getBoundingClientRect().height ?? heightsRef.current[snapRef.current]

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (keyboard.open) return // the sheet is parked above the keyboard
    // The search box and other controls are for tapping, not for dragging the sheet.
    if (target.closest('input, textarea, a, select, button:not([data-sheet-handle])')) return
    const el = sheetRef.current
    if (!el) return
    event.currentTarget.setPointerCapture(event.pointerId)
    el.style.transition = 'none'
    drag.current = {
      startY: event.clientY,
      startHeight: currentHeight(),
      from: snapRef.current,
      samples: [{y: event.clientY, t: event.timeStamp}],
      moved: false,
      pointerId: event.pointerId,
      onHandle: Boolean(target.closest('[data-sheet-handle]')),
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    const el = sheetRef.current
    if (!d || !el || event.pointerId !== d.pointerId) return
    if (!d.moved && Math.abs(event.clientY - d.startY) < TAP_SLOP_PX) return
    d.moved = true
    d.samples.push({y: event.clientY, t: event.timeStamp})
    if (d.samples.length > 12) d.samples.shift()
    el.style.height = `${dragHeight(d.startHeight + (d.startY - event.clientY), heightsRef.current)}px`
  }

  const finishDrag = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current
    if (!d || event.pointerId !== d.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (cancelled) return rest(d.from)
    if (!d.moved) {
      // A tap on the handle toggles peek and half.
      return rest(d.onHandle ? toggleSnap(d.from) : d.from)
    }
    rest(
      settleSnap({
        height: currentHeight(),
        velocity: estimateVelocity(d.samples),
        heights: heightsRef.current,
        from: d.from,
      }),
    )
  }

  // Pulling the list down while it is at the top lowers the sheet. (Needs a touch listener that can cancel the
  // scroll, which React's own handlers can't.)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const body = bodyRef.current
    const el = sheetRef.current
    if (!body || !el) return
    let touch: {
      startY: number
      scroller: HTMLElement
      mode: 'undecided' | 'list' | 'sheet'
      startHeight: number
      from: SnapName
      samples: Sample[]
    } | null = null

    const onStart = (event: TouchEvent) => {
      const scroller = (event.target as HTMLElement).closest<HTMLElement>('[data-sheet-scroll]')
      if (!scroller || event.touches.length !== 1) {
        touch = null
        return
      }
      const y = event.touches[0]!.clientY
      touch = {
        startY: y,
        scroller,
        mode: 'undecided',
        startHeight: currentHeight(),
        from: snapRef.current,
        samples: [{y, t: event.timeStamp}],
      }
    }
    const onMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return
      const y = event.touches[0]!.clientY
      const dy = y - touch.startY
      if (touch.mode === 'undecided') {
        if (Math.abs(dy) < 4) return
        touch.mode = listGestureOwner({scrollTop: touch.scroller.scrollTop, dy})
        if (touch.mode === 'sheet') el.style.transition = 'none'
      }
      if (touch.mode !== 'sheet') return
      const requested = touch.startHeight - dy
      if (requested > touch.startHeight) {
        // Back up past where it started: now it's the list's turn to scroll.
        touch.mode = 'list'
        el.style.height = `${touch.startHeight}px`
        return
      }
      event.preventDefault()
      touch.samples.push({y, t: event.timeStamp})
      if (touch.samples.length > 12) touch.samples.shift()
      el.style.height = `${dragHeight(requested, heightsRef.current)}px`
    }
    const onEnd = () => {
      const t = touch
      touch = null
      if (!t || t.mode !== 'sheet') return
      rest(
        settleSnap({
          height: currentHeight(),
          velocity: estimateVelocity(t.samples),
          heights: heightsRef.current,
          from: t.from,
        }),
      )
    }
    body.addEventListener('touchstart', onStart, {passive: true})
    body.addEventListener('touchmove', onMove, {passive: false})
    body.addEventListener('touchend', onEnd)
    body.addEventListener('touchcancel', onEnd)
    return () => {
      body.removeEventListener('touchstart', onStart)
      body.removeEventListener('touchmove', onMove)
      body.removeEventListener('touchend', onEnd)
      body.removeEventListener('touchcancel', onEnd)
    }
  }, [rest])

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onSnapChange(stepSnap(snap, 1))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      onSnapChange(stepSnap(snap, -1))
    }
  }

  return (
    <section
      ref={sheetRef}
      aria-label="Map results"
      style={keyboard.open ? {height: keyboard.height, bottom: keyboard.bottom, paddingBottom: 0} : {height: restingHeight}}
      className="hub absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-sheet border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar transition-[height] duration-200 ease-out motion-reduce:transition-none"
    >
      {/* Measures the home-bar space (zero where there is none). */}
      <div ref={probeRef} aria-hidden className="pointer-events-none absolute h-0 w-0 pb-[env(safe-area-inset-bottom)]" />
      <div
        className="shrink-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishDrag(event, false)}
        onPointerCancel={(event) => finishDrag(event, true)}
      >
        <div className="flex h-7 items-center justify-center">
          <button
            type="button"
            data-sheet-handle
            aria-label={snap === 'peek' ? 'Open results' : 'Lower results'}
            aria-expanded={snap !== 'peek'}
            onClick={(event) => {
              // A pointer tap is handled on release (so a drag isn't also a tap); this is for the keyboard.
              if (event.detail === 0) onSnapChange(toggleSnap(snap))
            }}
            onKeyDown={onHandleKeyDown}
            className="flex h-7 w-24 items-center justify-center rounded-full"
          >
            <span aria-hidden className="h-1.5 w-11 rounded-full bg-ink-3/40" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">{header}</div>
      </div>
      <div ref={bodyRef} inert={snap === 'peek' && !keyboard.open} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </section>
  )
}
