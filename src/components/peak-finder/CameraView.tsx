'use client';

import { useLayoutEffect, useRef } from 'react';
import type { SkylinePayload } from '@/lib/peak-finder/payload';
import { attachVideoStream } from '@/lib/peak-finder/video-playback';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';
import { SkylineStage, type ViewPose } from './SkylineStage';

export function CameraView({
  stream,
  payload,
  getView,
  onPick,
  selectedName,
  onLook,
}: {
  stream: MediaStream | null;
  payload: SkylinePayload | null;
  getView: () => ViewPose;
  onPick: (peak: VisiblePeak, anchor: { x: number; y: number }) => void;
  selectedName: string | null;
  onLook: ((headingDelta: number, pitchDelta: number, fovScale: number) => void) | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    attachVideoStream(video, stream);
    if (!stream) return;
    const onReady = () => {
      void video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', onReady);
    return () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 h-full w-full object-cover"
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
        showReadout={false}
      />
    </div>
  );
}
