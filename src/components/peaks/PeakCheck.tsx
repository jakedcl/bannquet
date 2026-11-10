'use client';

import { useActionState } from 'react';
import { addPeakAction, removePeakAction } from '@/app/peaks/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * The "I've been here" control for one peak. `count` is how many times the
 * viewer has been up: +1 logs another visit, × takes the latest one off.
 */
export function PeakCheck({ peakSlug, count }: { peakSlug: string; count: number }) {
  const [addState, addAction, addPending] = useActionState(addPeakAction, null);
  const [removeState, removeAction, removePending] = useActionState(removePeakAction, null);
  const error = addState?.error ?? removeState?.error;

  if (count < 1) {
    return (
      <ButtonStack onClick={stop} onKeyDown={stop}>
        <form action={addAction}>
          <input type="hidden" name="peakSlug" value={peakSlug} />
          <SubmitButton tone="yellow" pendingLabel="Saving…" disabled={addPending} className="px-3">
            Add to my peaks
          </SubmitButton>
        </form>
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      </ButtonStack>
    );
  }
  return (
    <ButtonStack onClick={stop} onKeyDown={stop}>
      <div className="inline-flex items-center gap-2">
        <span className="text-sm font-bold">✓ Been here{count > 1 ? ` ×${count}` : ''}</span>
        <form action={addAction}>
          <input type="hidden" name="peakSlug" value={peakSlug} />
          <SubmitButton icon tone="yellow" pendingLabel="Saving…" disabled={addPending} ariaLabel="Been up again" title="Been up again" className="text-xs">
            +1
          </SubmitButton>
        </form>
        <form action={removeAction}>
          <input type="hidden" name="peakSlug" value={peakSlug} />
          <SubmitButton icon tone="yellow" pendingLabel="Saving…" disabled={removePending} ariaLabel="Take one visit off" title="Take one visit off">
            ×
          </SubmitButton>
        </form>
      </div>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </ButtonStack>
  );
}

function ButtonStack({
  children,
  onClick,
  onKeyDown,
}: {
  children: React.ReactNode;
  onClick: (event: { stopPropagation: () => void }) => void;
  onKeyDown: (event: { stopPropagation: () => void }) => void;
}) {
  return (
    <div className="inline-flex flex-col items-end gap-1" onClick={onClick} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
