'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { attachToTripAction, detachFromTripAction } from '@/app/trips/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function AddToTrip({
  kind,
  entityId,
  trips,
  attached,
  startOpen = false,
  attachBlocked,
}: {
  kind: 'route' | 'pin' | 'photo';
  entityId: string;
  trips: Array<{ id: string; title: string }>;
  attached: Array<{ id: string; title: string }>;
  startOpen?: boolean;
  attachBlocked?: string | null;
}) {
  const [open, setOpen] = useState(startOpen);
  const [attachState, attach] = useActionState(attachToTripAction, null);
  const [detachState, detach] = useActionState(detachFromTripAction, null);
  const on = new Set(attached.map((trip) => trip.id));

  return (
    <div className="text-sm">
      {attachBlocked ? (
        <p className="text-sm font-bold text-gray-900">{attachBlocked}</p>
      ) : null}
      <button type="button" className="min-h-11 text-left font-bold underline" onClick={() => setOpen(true)} disabled={Boolean(attachBlocked)}>
        {attached.length > 0 ? `On ${attached.map((trip) => trip.title).join(', ')}` : 'Add to trip'}
      </button>
      {open ? (
        <div className="motion-sheet fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Add to a trip"
            className="motion-panel w-full max-w-sm bg-beige p-3 retro-box"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-bold uppercase">Trips</p>
              <Link href="/upload?kind=trip" className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold uppercase underline">+ New trip</Link>
            </div>
            {trips.length === 0 ? <p className="text-sm">No trips yet.</p> : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {trips.map((trip) => (
                  <li key={trip.id} className="flex items-center gap-2">
                    {on.has(trip.id) ? (
                      <form action={detach} className="min-w-0 flex-1">
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="entityId" value={entityId} />
                        <input type="hidden" name="tripId" value={trip.id} />
                        <SubmitButton unstyled pendingLabel="Removing…" className="min-h-11 w-full justify-start text-left text-sm underline">
                          {trip.title} · remove
                        </SubmitButton>
                      </form>
                    ) : (
                      <form action={attach} className="min-w-0 flex-1">
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="entityId" value={entityId} />
                        <input type="hidden" name="tripId" value={trip.id} />
                        <SubmitButton unstyled pendingLabel="Adding…" className="min-h-11 w-full justify-start text-left text-sm underline">
                          {trip.title}
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {attachState?.error ? <p className="mt-2 text-sm font-bold text-red-700">{attachState.error}</p> : null}
            {detachState?.error ? <p className="mt-2 text-sm font-bold text-red-700">{detachState.error}</p> : null}
            <button type="button" className="mt-3 min-h-11 text-sm font-bold uppercase underline" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
