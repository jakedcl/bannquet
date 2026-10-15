'use client';

import { useActionState } from 'react';
import { deleteReportAction } from '@/app/library/actions';
import { TrashButton } from '@/components/delete/ConfirmDelete';

export function DeleteReport({ id, returnTo = '/posts' }: { id: string; returnTo?: string }) {
  const [state, action, pending] = useActionState(deleteReportAction, null);
  return (
    <form action={action} className="relative flex shrink-0 items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {state?.error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-44 text-right text-xs font-bold text-red-700">{state.error}</p>
      ) : null}
      <TrashButton
        pending={pending}
        name="mode"
        value="report"
        label="Delete"
        onClick={(event) => {
          if (!window.confirm('Delete just the report? Routes, pins, and photos stay.')) event.preventDefault();
        }}
      />
      <TrashButton
        pending={pending}
        name="mode"
        value="all"
        label="Delete everything"
        onClick={(event) => {
          if (!window.confirm('Delete the report and all its routes, pins, and photos?')) event.preventDefault();
        }}
      />
    </form>
  );
}
