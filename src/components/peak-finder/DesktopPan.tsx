'use client';

export function DesktopPan({
  onPan,
  showHint,
  onDismissHint,
}: {
  onPan: (headingDelta: number) => void;
  showHint: boolean;
  onDismissHint: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Pan left"
        className="retro-button pointer-events-auto absolute left-2 top-1/2 z-20 min-h-11 w-11 -translate-y-1/2 px-0 text-lg"
        onClick={() => {
          onDismissHint();
          onPan(-12);
        }}
      >
        ←
      </button>
      <button
        type="button"
        aria-label="Pan right"
        className="retro-button pointer-events-auto absolute right-2 top-1/2 z-20 min-h-11 w-11 -translate-y-1/2 px-0 text-lg"
        onClick={() => {
          onDismissHint();
          onPan(12);
        }}
      >
        →
      </button>
      {showHint ? (
        <p className="pointer-events-none absolute inset-x-0 top-14 z-20 px-4 text-center text-xs font-bold text-[#1a1a1a] motion-safe:animate-[fadeIn_0.5s_ease-in-out]">
          Drag to look around
        </p>
      ) : null}
    </>
  );
}
