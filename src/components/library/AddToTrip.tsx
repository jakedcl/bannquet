'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { attachToReportAction, detachFromReportAction } from '@/app/library/actions';

export function AddToTrip({
  kind,
  entityId,
  reports,
  attached,
}: {
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
  reports: Array<{ id: string; title: string }>;
  attached: { id: string; title: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [attachState, attach, attachPending] = useActionState(attachToReportAction, null);
  const [detachState, detach, detachPending] = useActionState(detachFromReportAction, null);
  const returnTo = kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`;

  return (
    <div className="text-sm">
      <button type="button" className="underline" onClick={() => setOpen(true)}>
        {attached ? `On ${attached.title}` : 'Add to trip'}
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Add to a trip report"
            className="w-full max-w-sm bg-beige p-3 retro-box"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-bold uppercase">Trip reports</p>
              <Link href="/posts/new" className="shrink-0 text-xs font-bold uppercase underline">
                + New trip report
              </Link>
            </div>
            {attached ? (
              <p className="mb-2 text-sm">Already on {attached.title}.</p>
            ) : null}
            {reports.length === 0 ? (
              <p className="text-sm">No trip reports yet.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {reports.map((report) => (
                  <li key={report.id}>
                    <form action={attach}>
                      <input type="hidden" name="kind" value={kind} />
                      <input type="hidden" name="entityId" value={entityId} />
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button type="submit" disabled={attachPending} className="w-full py-1 text-left text-sm underline disabled:opacity-60">
                        {report.title}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {attachState?.error ? <p className="mt-2 text-sm font-bold text-red-700">{attachState.error}</p> : null}
            {attached ? (
              <form action={detach} className="mt-3">
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="entityId" value={entityId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" disabled={detachPending} className="text-xs font-bold uppercase underline">
                  {detachPending ? 'Detaching…' : 'Detach'}
                </button>
                {detachState?.error ? <p className="mt-1 text-sm font-bold text-red-700">{detachState.error}</p> : null}
              </form>
            ) : null}
            <button type="button" className="mt-3 text-xs uppercase underline" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
