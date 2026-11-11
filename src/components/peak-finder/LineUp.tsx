'use client';

export function LineUpCaption() {
  return (
    <div
      className="pointer-events-none mx-2 mt-2 bg-black/75 px-3 py-2 text-white"
      role="status"
    >
      <p className="text-sm leading-snug">
        Drag in any direction to line up the skyline with the real ridges. Pinch to zoom.
      </p>
    </div>
  );
}
