'use client';

import { useActionState } from 'react';
import { inviteFriend } from '@/app/sign-in/actions';
import { adminPowerLabel } from '@/lib/admin-ui';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function InviteForm() {
  const [state, action] = useActionState(inviteFriend, null);
  const inviteAdmin = adminPowerLabel('Send invite');

  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Friend&apos;s email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          className="w-full"
        />
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.emailNote ? <p className="text-sm text-brand-dark">{state.emailNote}</p> : null}
      {state?.url ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Page link</span>
          <input readOnly value={state.url} className="w-full" />
        </label>
      ) : null}
      <SubmitButton
        kind="admin"
        pendingLabel="Sending…"
        title={inviteAdmin.title}
        ariaLabel={inviteAdmin.ariaLabel}
      >
        Invite
      </SubmitButton>
    </form>
  );
}
