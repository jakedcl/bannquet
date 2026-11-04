'use client';

import { addPeakAction, removePeakAction } from '@/app/peaks/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** The "I've been here" checkbox for one peak: add it to my peaks, or take it off. */
export function PeakCheck({ peakSlug, added }: { peakSlug: string; added: boolean }) {
  if (!added) {
    return (
      <form action={addPeakAction} onClick={stop} onKeyDown={stop}>
        <input type="hidden" name="peakSlug" value={peakSlug} />
        <SubmitButton tone="yellow" pendingLabel="Saving…" className="px-3 py-2 text-xs">
          Add to my peaks
        </SubmitButton>
      </form>
    );
  }
  return (
    <form action={removePeakAction} className="inline-flex items-center gap-2" onClick={stop} onKeyDown={stop}>
      <input type="hidden" name="peakSlug" value={peakSlug} />
      <span className="text-sm font-bold">✓ Been here</span>
      <SubmitButton icon tone="yellow" pendingLabel="Saving…" ariaLabel="Take off my peaks" title="Take off my peaks">
        ×
      </SubmitButton>
    </form>
  );
}

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
