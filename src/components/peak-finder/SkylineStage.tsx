'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cardinalLabel, formatDirection } from '@/lib/peak-finder/format';
import type { SkylinePayload } from '@/lib/peak-finder/payload';
import { projectDirection, verticalFov } from '@/lib/peak-finder/projection';
import { LABEL_BOX_HEIGHT_PX, LABEL_TICK_PX, type LabelCandidate } from '@/lib/peak-finder/declutter';
import { labelFontWeight, labelOpacity } from '@/lib/peak-finder/label-ranking';
import { placeLabels } from '@/lib/peak-finder/label-placement';
import { wrap180 } from '@/lib/peak-finder/geo';
import type { GestureMode } from '@/lib/peak-finder/explore-gestures';

export type ViewPose = { heading: number; pitch: number; roll: number; hfov: number };

export function SkylineStage({
  payload,
  appearance,
  getView,
  onLook,
  gestureMode,
  onSettle,
  showReadout,
  reserveSummitName,
}: {
  payload: SkylinePayload | null;
  appearance: 'camera' | 'drawn';
  getView: () => ViewPose;
  onLook: ((headingDelta: number, pitchDelta: number, fovScale: number) => void) | null;
  gestureMode: GestureMode;
  onSettle?: () => void;
  showReadout: boolean;
  reserveSummitName?: string | null;
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
  const gesturesActive = gestureMode !== 'off' && onLook != null;

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

  const placement = useMemo(() => {
    if (!payload || size.width < 2 || size.height < 2) {
      return { labels: [] as LabelCandidate[], markers: [] };
    }
    const reserve = reserveSummitName ? [reserveSummitName] : [];
    return placeLabels(payload.peaks, pose, size.width, size.height, reserve);
  }, [payload, pose, reserveSummitName, size.height, size.width]);
  const labelByKey = useMemo(() => {
    const map = new Map<string, LabelCandidate>();
    for (const label of placement.labels) {
      map.set(`${label.name}-${label.lat.toFixed(4)}-${label.lng.toFixed(4)}`, label);
    }
    return map;
  }, [placement.labels]);
  const labelTiltDeg = placement.labels.length < 12 ? -40 : -45;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || gestureMode !== 'adjust') return;
    const block = (event: Event) => event.preventDefault();
    wrap.addEventListener('gesturestart', block, { passive: false });
    wrap.addEventListener('gesturechange', block, { passive: false });
    wrap.addEventListener('gestureend', block);
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    wrap.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      wrap.removeEventListener('gesturestart', block);
      wrap.removeEventListener('gesturechange', block);
      wrap.removeEventListener('gestureend', block);
      wrap.removeEventListener('touchmove', onTouchMove);
    };
  }, [gestureMode]);

  function pinchDistance(): number | null {
    const points = [...pointers.current.values()];
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 ${gestureMode === 'adjust' ? 'touch-none' : gestureMode === 'pan' ? 'touch-none' : ''}`}
      style={gestureMode === 'adjust' ? { touchAction: 'none' } : gestureMode === 'pan' ? { touchAction: 'none' } : undefined}
      onPointerDown={gesturesActive ? (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        last.current = { x: event.clientX, y: event.clientY, dist: pinchDistance() };
      } : undefined}
      onPointerMove={gesturesActive ? (event) => {
        if (!pointers.current.has(event.pointerId) || size.width < 2 || !onLook) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const dist = pinchDistance();
        const prev = last.current;
        if (!prev) return;
        if (gestureMode === 'adjust' && dist && prev.dist) {
          onLook(0, 0, dist / prev.dist);
          last.current = { x: event.clientX, y: event.clientY, dist };
          return;
        }
        if (gestureMode === 'pan' && pointers.current.size > 1) return;
        const dx = event.clientX - prev.x;
        const dy = event.clientY - prev.y;
        const vfov = verticalFov(pose.hfov, size.width, size.height);
        onLook(-(dx / size.width) * pose.hfov, (dy / size.height) * vfov, 1);
        last.current = { x: event.clientX, y: event.clientY, dist: gestureMode === 'adjust' ? dist : null };
      } : undefined}
      onPointerUp={gesturesActive ? (event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) {
          last.current = null;
          onSettle?.();
        }
      } : undefined}
      onPointerCancel={gesturesActive ? (event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) last.current = null;
      } : undefined}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      {showReadout ? (
        <p className="pointer-events-none absolute left-2 top-2 bg-[#e7e1d4]/90 px-2 py-1 text-xs font-bold text-[#5c3a1e]">
          Looking {formatDirection(pose.heading)}
        </p>
      ) : null}
      {placement.markers.map((marker) => {
        const key = `${marker.name}-${marker.lat.toFixed(4)}-${marker.lng.toFixed(4)}`;
        const label = labelByKey.get(key);
        const onCamera = appearance === 'camera';
        const color = onCamera ? '#e7f6c8' : '#2d5016';
        const tickColor = onCamera ? 'rgba(231,246,200,0.85)' : 'rgba(45,80,22,0.72)';
        if (!label) {
          return (
            <div key={key} className="pointer-events-none absolute z-[9] h-0 w-0" style={{ left: marker.x, top: marker.y }}>
              <span
                className="absolute left-0 w-px"
                style={{ bottom: 0, height: 9, background: tickColor }}
              />
            </div>
          );
        }
        const fontSize = label.fontSizePx ?? 13;
        const weight = labelFontWeight(label.distanceM);
        const opacity = labelOpacity(label.distanceM);
        return (
          <div
            key={key}
            className="pointer-events-none absolute z-10 h-0 w-0"
            style={{ left: label.x, top: label.y }}
          >
            <span
              className="absolute left-0 w-px"
              style={{ bottom: 0, height: LABEL_TICK_PX, background: color, opacity }}
            />
            {label.slidePx > 0 ? (
              <span
                className="absolute left-0 h-px"
                style={{
                  bottom: LABEL_TICK_PX,
                  width: label.slidePx,
                  background: color,
                  opacity,
                  transform: `rotate(${-labelTiltDeg}deg)`,
                  transformOrigin: 'left center',
                }}
              />
            ) : null}
            <span
              className="pointer-events-none absolute whitespace-nowrap px-0.5 text-left"
              style={{
                left: label.slidePx * Math.SQRT1_2,
                bottom: LABEL_TICK_PX + label.slidePx * Math.SQRT1_2,
                height: LABEL_BOX_HEIGHT_PX,
                lineHeight: `${LABEL_BOX_HEIGHT_PX}px`,
                transform: `rotate(${labelTiltDeg}deg)`,
                transformOrigin: 'left bottom',
                color,
                opacity,
                fontSize,
                fontWeight: weight,
                textShadow: onCamera ? '0 0 2px #000, 0 1px 2px #000' : 'none',
              }}
            >
              {label.name}
            </span>
          </div>
        );
      })}
    </div>
  );
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
    const ridge = appearance === 'camera' ? 'rgba(255,255,255,0.7)' : 'rgba(92,58,30,0.55)';
    const ridgeHidden = appearance === 'camera' ? 'rgba(255,255,255,0.45)' : 'rgba(92,58,30,0.32)';
    strokeAngles(ctx, layer.angleDeg, step, pose, width, height, ridge, 1.25, false);
    strokeAngles(ctx, layer.hiddenAngleDeg, step, pose, width, height, ridgeHidden, 1.1, true);
  }
  if (appearance === 'camera') {
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, 'rgba(0,0,0,0.75)', 3.5, false);
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, '#ffffff', 1.5, false);
  } else {
    strokeAngles(ctx, payload.angleDeg, step, pose, width, height, '#5c3a1e', 1.75, false);
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
  dashed: boolean,
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ? [5, 5] : []);
  let drawing = false;
  let started = false;
  for (let i = 0; i < angles.length; i += 1) {
    const angle = angles[i];
    if (!Number.isFinite(angle)) {
      if (started) {
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
      drawing = false;
      continue;
    }
    const bearing = i * step;
    const point = projectDirection(bearing, angle, pose.heading, pose.pitch, pose.roll, pose.hfov, width, height);
    const onScreen = point.x >= -40 && point.x <= width + 40;
    if (!drawing || !onScreen) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
    drawing = onScreen;
    started = true;
  }
  if (started) ctx.stroke();
  ctx.setLineDash([]);
}
