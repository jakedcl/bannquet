'use client';

import { useActionState } from 'react';
import { inviteFriend } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteFriend, null);

  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Friend&apos;s email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.emailNote ? <p className="text-sm text-brand-green-dark">{state.emailNote}</p> : null}
      {state?.url ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Page link</span>
          <input readOnly value={state.url} className="w-full retro-box-inset bg-white px-3 py-2 text-sm" />
        </label>
      ) : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Invite'}
      </Button>
    </form>
  );
}
