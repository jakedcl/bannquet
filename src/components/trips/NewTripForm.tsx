'use client';

import { useActionState } from 'react';
import { Button } from '@/components/retro/Button';
import { createTripAction } from '@/app/trips/actions';

export function NewTripForm() {
  const [state, action, pending] = useActionState(createTripAction, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input name="title" required maxLength={80} className="w-full retro-box-inset bg-white px-3 py-2" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Date</span>
        <input name="tripDate" type="date" required className="w-full retro-box-inset bg-white px-3 py-2" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Notes</span>
        <textarea name="notes" rows={5} maxLength={4000} placeholder="AllTrails link, where to meet, how it went" className="w-full retro-box-inset bg-white px-3 py-2" />
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button type="submit" tone="yellow" disabled={pending}>{pending ? 'Saving…' : 'Save trip'}</Button>
    </form>
  );
}
