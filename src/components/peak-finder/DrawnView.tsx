'use client';

import { useEffect, useRef } from 'react';
import type { SkylinePayload } from '@/lib/peak-finder/payload';
import type { GestureMode } from '@/lib/peak-finder/explore-gestures';
import { SkylineStage, type ViewPose } from './SkylineStage';

export function DrawnView({
  payload,
  getView,
  onLook,
  gestureMode,
  onSettle,
  listenKeys,
}: {
  payload: SkylinePayload | null;
  getView: () => ViewPose;
  onLook: ((headingDelta: number, pitchDelta: number, fovScale: number) => void) | null;
  gestureMode: GestureMode;
  onSettle?: () => void;
  listenKeys: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!listenKeys || !onLook) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onLook(-8, 0, 1);
      else if (event.key === 'ArrowRight') onLook(8, 0, 1);
      else if (event.key === 'ArrowUp') onLook(0, 3, 1);
      else if (event.key === 'ArrowDown') onLook(0, -3, 1);
      else if (event.key === '+' || event.key === '=') onLook(0, 0, 1.08);
      else if (event.key === '-' || event.key === '_') onLook(0, 0, 1 / 1.08);
      else return;
      event.preventDefault();
      onSettle?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listenKeys, onLook, onSettle]);

  useEffect(() => {
    const node = boxRef.current;
    if (!node || !onLook) return;
    let settleTimer = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) onLook(0, 0, event.deltaY > 0 ? 1 / 1.06 : 1.06);
      else onLook((event.deltaX + event.deltaY) * 0.05, 0, 1);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => onSettle?.(), 200);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.clearTimeout(settleTimer);
      node.removeEventListener('wheel', onWheel);
    };
  }, [onLook, onSettle]);

  return (
    <div ref={boxRef} className="relative h-full w-full">
      <SkylineStage
        payload={payload}
        appearance="drawn"
        getView={getView}
        onLook={onLook}
        gestureMode={gestureMode}
        onSettle={onSettle}
        showReadout
        reserveSummitName={payload?.onSummit?.name ?? null}
      />
    </div>
  );
}
