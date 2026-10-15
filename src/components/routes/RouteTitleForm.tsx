'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateRouteTitleAction } from '@/app/library/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function RouteTitleForm({ id, title, notes }: { id: string; title: string; notes: string }) {
  const router = useRouter();
  const [state, action] = useActionState(updateRouteTitleAction, null);

  useEffect(() => {
    if (!state?.saved) return;
    router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input
          name="title"
          maxLength={120}
          defaultValue={title}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Notes</span>
        <textarea
          name="notes"
          rows={5}
          maxLength={4000}
          defaultValue={notes}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.saved ? <p className="text-sm">Saved.</p> : null}
      <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
    </form>
  );
}
