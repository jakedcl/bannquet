'use client';

import { useActionState, useEffect, useState } from 'react';
import { addGearAction } from '@/app/gear/actions';

export function GearAddForm({
  action,
  onAdded,
}: {
  action: typeof addGearAction;
  onAdded?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state && !state.error) onAdded?.();
  }, [state, onAdded]);
  return (
    <form action={formAction} className="space-y-2">
      <label className="block">
        <span className="sr-only">Item</span>
        <input name="name" maxLength={80} placeholder="Microspikes" className="w-full retro-box-inset bg-white px-3 py-2 text-sm" />
      </label>
      <label className="block">
        <span className="sr-only">Category</span>
        <input name="category" maxLength={40} placeholder="Category (optional)" className="w-full retro-box-inset bg-white px-3 py-2 text-sm" />
      </label>
      <button type="submit" disabled={pending} className="retro-button-yellow rounded-none px-3 py-2 text-xs font-bold uppercase disabled:opacity-60">
        {pending ? 'Adding…' : 'Add'}
      </button>
      {state?.error ? <p className="w-full text-sm font-bold text-red-700">{state.error}</p> : null}
    </form>
  );
}

export function GearAddButton() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button
        type="button"
        aria-label="Add gear"
        onClick={() => {
          setFormKey((key) => key + 1);
          setOpen(true);
        }}
        className="retro-button-yellow inline-flex h-6 w-6 items-center justify-center rounded-none p-0 text-base font-bold leading-none"
      >
        +
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Add gear"
            className="retro-box w-full max-w-sm bg-beige p-4 text-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold uppercase">Add gear</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-sm font-bold">
                ×
              </button>
            </div>
            <GearAddForm key={formKey} action={addGearAction} onAdded={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
