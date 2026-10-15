'use client';

import { useActionState } from 'react';
import { deleteReportAction } from '@/app/library/actions';

export function DeleteReport({ id, returnTo = '/posts' }: { id: string; returnTo?: string }) {
  const [state, action, pending] = useActionState(deleteReportAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <p className="text-sm font-bold">Delete this trip report?</p>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="mode"
          value="report"
          disabled={pending}
          className="retro-button rounded-none px-3 py-2 text-xs font-bold uppercase"
          onClick={(event) => {
            if (!window.confirm('Delete just the report? Routes, pins, and photos stay.')) event.preventDefault();
          }}
        >
          Delete just the report
        </button>
        <button
          type="submit"
          name="mode"
          value="all"
          disabled={pending}
          className="retro-button rounded-none px-3 py-2 text-xs font-bold uppercase"
          onClick={(event) => {
            if (!window.confirm('Delete the report and all its routes, pins, and photos?')) event.preventDefault();
          }}
        >
          Delete the report and all its routes, pins, and photos
        </button>
      </div>
    </form>
  );
}
