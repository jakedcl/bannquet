'use client';

export function LineUp({ onDone }: { onDone: () => void }) {
  return (
    <div className="pointer-events-auto mx-2 mt-2 flex items-center gap-2 bg-black/75 px-3 py-2 text-white">
      <p className="min-w-0 flex-1 text-sm leading-snug">
        Drag the skyline onto a peak you know. Pinch to match its size.
      </p>
      <button type="button" onClick={onDone} className="retro-button min-h-11 shrink-0 px-3 text-xs">
        Done
      </button>
    </div>
  );
}
