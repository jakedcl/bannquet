'use client';

import { useEffect, useRef, useState } from 'react';
import { confirmSummitAction } from '@/app/peaks/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export type SummitSuggestion = {
  slug: string;
  name: string;
};

export function SummitPrompts({
  peaks,
  onClear,
}: {
  peaks: SummitSuggestion[];
  onClear?: () => void;
}) {
  const [left, setLeft] = useState(peaks);
  const cleared = useRef(false);

  useEffect(() => {
    if (left.length > 0 || peaks.length === 0 || cleared.current) return;
    cleared.current = true;
    onClear?.();
  }, [left.length, onClear, peaks.length]);

  if (left.length === 0) return null;

  return (
    <ul className="space-y-2">
      {left.map((peak) => (
        <li key={peak.slug} className="retro-box-inset flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2">
          <p className="min-w-0 text-sm">Looks like you summited {peak.name}, but you&apos;ve never logged a climb there.</p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <form
              action={async (formData) => {
                try {
                  const result = await confirmSummitAction(formData);
                  if (!result.ok) return;
                  setLeft((current) => current.filter((item) => item.slug !== peak.slug));
                } catch {
                  // The climb did not confirm. Leave the prompt so it can be tried again.
                }
              }}
            >
              <input type="hidden" name="peakSlug" value={peak.slug} />
              <SubmitButton tone="yellow" pendingLabel="Logging…" className="px-3 py-1 text-xs">
                Log
              </SubmitButton>
            </form>
            <button
              type="button"
              className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase tracking-wide"
              onClick={() => setLeft((current) => current.filter((item) => item.slug !== peak.slug))}
            >
              Dismiss
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
