'use client';

import { useEffect, useRef } from 'react';
import type { SkylinePayload } from '@/lib/peak-finder/payload';
import type { GestureMode } from '@/lib/peak-finder/explore-gestures';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';
import { SkylineStage, type ViewPose } from './SkylineStage';

export function CameraView({
  stream,
  payload,
  getView,
  onPick,
  selectedName,
  onLook,
  gestureMode,
}: {
  stream: MediaStream | null;
  payload: SkylinePayload | null;
  getView: () => ViewPose;
  onPick: (peak: VisiblePeak, anchor: { x: number; y: number }) => void;
  selectedName: string | null;
  onLook: ((headingDelta: number, pitchDelta: number, fovScale: number) => void) | null;
  gestureMode: GestureMode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (!stream) return;
    void video.play().catch(() => {
      // iOS may want another tap. The Start button is already gone; a play()
      // from the gesture usually works, and the skyline still draws if it doesn't.
    });
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <SkylineStage
        payload={payload}
        appearance="camera"
        getView={getView}
        onPick={onPick}
        selectedName={selectedName}
        onLook={onLook}
        gestureMode={gestureMode}
        showReadout={false}
        reserveSummitName={payload?.onSummit?.name ?? null}
      />
    </div>
  );
}
