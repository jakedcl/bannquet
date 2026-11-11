/** Top-left Back control — same on every Peak Finder sub-screen. */
export const PEAK_FINDER_BACK_BUTTON_CLASS =
  'retro-button min-h-9 px-2 text-[11px]';

export function PeakFinderBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${PEAK_FINDER_BACK_BUTTON_CLASS} absolute left-2 top-2 z-30`}
      onClick={onClick}
    >
      Back
    </button>
  );
}
