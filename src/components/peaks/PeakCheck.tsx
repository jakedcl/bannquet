'use client';

import { addPeakAction, removePeakAction } from '@/app/peaks/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * The "I've been here" control for one peak. `count` is how many times the
 * viewer has been up: +1 logs another visit, × takes the latest one off.
 */
export function PeakCheck({ peakSlug, count }: { peakSlug: string; count: number }) {
  if (count < 1) {
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
    <div className="inline-flex items-center gap-2" onClick={stop} onKeyDown={stop}>
      <span className="text-sm font-bold">✓ Been here{count > 1 ? ` ×${count}` : ''}</span>
      <form action={addPeakAction}>
        <input type="hidden" name="peakSlug" value={peakSlug} />
        <SubmitButton icon tone="yellow" pendingLabel="Saving…" ariaLabel="Been up again" title="Been up again" className="text-xs">
          +1
        </SubmitButton>
      </form>
      <form action={removePeakAction}>
        <input type="hidden" name="peakSlug" value={peakSlug} />
        <SubmitButton icon tone="yellow" pendingLabel="Saving…" ariaLabel="Take one visit off" title="Take one visit off">
          ×
        </SubmitButton>
      </form>
    </div>
  );
}

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
