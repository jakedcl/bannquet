'use client';

import { useActionState } from 'react';
import { addGearAction } from '@/app/gear/actions';

export function GearAddForm({ action }: { action: typeof addGearAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Item</span>
        <input name="name" maxLength={80} placeholder="Microspikes" className="w-full retro-box-inset bg-white px-3 py-2 text-sm" />
      </label>
      <button type="submit" disabled={pending} className="retro-button-yellow rounded-none px-3 py-2 text-xs font-bold uppercase disabled:opacity-60">
        {pending ? 'Adding…' : 'Add'}
      </button>
      {state?.error ? <p className="w-full text-sm font-bold text-red-700">{state.error}</p> : null}
    </form>
  );
}
