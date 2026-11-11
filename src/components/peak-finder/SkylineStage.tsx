'use client';

import { useEffect, useRef, useState } from 'react';
import { cardinalLabel, formatDirection } from '@/lib/peak-finder/format';
import type { SkylinePayload } from '@/lib/peak-finder/payload';
import { projectDirection, verticalFov } from '@/lib/peak-finder/projection';
import { LABEL_BOX_HEIGHT_PX, LABEL_TICK_PX, labelsInView, type LabelCandidate } from '@/lib/peak-finder/declutter';
import { wrap180 } from '@/lib/peak-finder/geo';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';

export type ViewPose = { heading: number; pitch: number; roll: number; hfov: number };

export function SkylineStage({
  payload,
  appearance,
  getView,
  onPick,
  selectedName,
  onLook,
  onSettle,
  showReadout,
}: {
  payload: SkylinePayload | null;
  appearance: 'camera' | 'drawn';
  getView: () => ViewPose;
  onPick: (peak: VisiblePeak, anchor: { x: number; y: number }) => void;
  selectedName: string | null;
  onLook: ((headingDelta: number, pitchDelta: number, fovScale: number) => void) | null;
  onSettle?: () => void;
  showReadout: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const payloadRef = useRef(payload);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pose, setPose] = useState<ViewPose>(() => ({ ...getView() }));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; dist: number | null } | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => setSize({ width: wrap.clientWidth, height: wrap.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 2 || size.height < 2) return;
    let frame = 0;
    let lastLabels = 0;
    const loop = (time: number) => {
      frame = requestAnimationFrame(loop);
      const view = getView();
      paint(canvas, payloadRef.current, view, appearance);
      if (time - lastLabels > 32) {
        lastLabels = time;
        setPose((prev) => (
          prev.heading === view.heading && prev.pitch === view.pitch && prev.roll === view.roll && prev.hfov === view.hfov
            ? prev
            : { heading: view.heading, pitch: view.pitch, roll: view.roll, hfov: view.hfov }
        ));
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [appearance, getView, size.height, size.width]);

  const labels = labelsFor(payload, pose, size.width, size.height);

  function pinchDistance(): number | null {
    const points = [...pointers.current.values()];
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 ${onLook ? 'touch-none' : ''}`}
      onPointerDown={onLook ? (event) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        last.current = { x: event.clientX, y: event.clientY, dist: pinchDistance() };
      } : undefined}
      onPointerMove={onLook ? (event) => {
        if (!pointers.current.has(event.pointerId) || size.width < 2) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const dist = pinchDistance();
        const prev = last.current;
        if (!prev) return;
        if (dist && prev.dist) {
          onLook(0, 0, dist / prev.dist);
          last.current = { x: event.clientX, y: event.clientY, dist };
          return;
        }
        const dx = event.clientX - prev.x;
        const dy = event.clientY - prev.y;
        const vfov = verticalFov(pose.hfov, size.width, size.height);
        onLook(-(dx / size.width) * pose.hfov, (dy / size.height) * vfov, 1);
        last.current = { x: event.clientX, y: event.clientY, dist };
      } : undefined}
      onPointerUp={onLook ? (event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) {
          last.current = null;
          onSettle?.();
        }
      } : undefined}
      onPointerCancel={onLook ? (event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) last.current = null;
      } : undefined}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full" />
      {showReadout ? (
        <p className="pointer-events-none absolute left-2 top-2 bg-[#e7e1d4]/90 px-2 py-1 text-xs font-bold text-[#5c3a1e]">
          Looking {formatDirection(pose.heading)}
        </p>
      ) : null}
      {labels.map((label) => {
        const onCamera = appearance === 'camera';
        const color = onCamera ? '#e7f6c8' : '#2d5016';
        return (
          <div
            key={`${label.name}-${label.lat.toFixed(3)}-${label.lng.toFixed(3)}`}
            className="pointer-events-none absolute z-10 h-0 w-0"
            style={{ left: label.x, top: label.y }}
          >
            <span
              className="absolute left-0 w-px"
              style={{ bottom: 0, height: LABEL_TICK_PX, background: color }}
            />
            {label.slidePx > 0 ? (
              <span
                className="absolute left-0 h-px"
                style={{
                  bottom: LABEL_TICK_PX,
                  width: label.slidePx,
                  background: color,
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'left center',
                }}
              />
            ) : null}
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onPick(label, { x: label.x, y: label.y })}
              className="pointer-events-auto absolute whitespace-nowrap px-0.5 text-left text-[13px] font-bold"
              style={{
                left: label.slidePx * Math.SQRT1_2,
                bottom: LABEL_TICK_PX + label.slidePx * Math.SQRT1_2,
                height: LABEL_BOX_HEIGHT_PX,
                lineHeight: `${LABEL_BOX_HEIGHT_PX}px`,
                transform: 'rotate(-45deg)',
                transformOrigin: 'left bottom',
                color,
                textShadow: onCamera ? '0 0 2px #000, 0 1px 2px #000' : 'none',
              }}
              aria-pressed={selectedName === label.name}
            >
              {label.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function labelsFor(payload: SkylinePayload | null, pose: ViewPose, width: number, height: number): LabelCandidate[] {
  if (!payload) return [];
  return labelsInView(payload.peaks, pose, width, height);
}

function paint(
  canvas: HTMLCanvasElement,
  payload: SkylinePayload | null,
  pose: ViewPose,
  appearance: 'camera' | 'drawn',
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx || width < 2 || height < 2) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (appearance === 'drawn') {
    const horizon = projectDirection(pose.heading, 0, pose.heading, pose.pitch, 0, pose.hfov, width, height).y;
    ctx.fillStyle = '#c5d7ea';
    ctx.fillRect(0, 0, width, Math.max(0, horizon));
    ctx.fillStyle = '#e7e1d4';
    ctx.fillRect(0, Math.max(0, horizon), width, height);
    paintTicks(ctx, pose, width);
  }
  if (!payload) return;
  const step = payload.stepDeg;
  for (const layer of payload.layers) {
    strokeAngles(ctx, layer.angleDeg, step, pose, width, height, appearance === 'camera' ? 'rgba(255,255,255,0.7)' : 'rgba(92,58,30,0.55)', 1.25);
  }
  if (appearance === 'camera') {
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, 'rgba(0,0,0,0.75)', 3.5);
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, '#ffffff', 1.5);
  } else {
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, '#5c3a1e', 1.75);
  }
}

function paintTicks(ctx: CanvasRenderingContext2D, pose: ViewPose, width: number) {
  ctx.fillStyle = '#5c3a1e';
  ctx.font = '700 11px Verdana, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  for (let bearing = 0; bearing < 360; bearing += 15) {
    const delta = wrap180(bearing - pose.heading);
    if (Math.abs(delta) > pose.hfov / 2 + 5) continue;
    const x = width / 2 + (delta / pose.hfov) * width;
    ctx.fillRect(x, 28, 1, bearing % 45 === 0 ? 10 : 6);
    const label = cardinalLabel(bearing);
    if (label) ctx.fillText(label, x, 24);
  }
}

function strokeAngles(
  ctx: CanvasRenderingContext2D,
  angles: readonly number[],
  step: number,
  pose: ViewPose,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  let drawing = false;
  for (let i = 0; i < angles.length; i += 1) {
    const angle = angles[i];
    if (!Number.isFinite(angle)) {
      drawing = false;
      continue;
    }
    const bearing = i * step;
    const point = projectDirection(bearing, angle, pose.heading, pose.pitch, pose.roll, pose.hfov, width, height);
    const onScreen = point.x >= -40 && point.x <= width + 40;
    if (!drawing || !onScreen) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
    drawing = onScreen;
  }
  ctx.stroke();
}
