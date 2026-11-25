'use client';

import { useActionState } from 'react';
import { createMemberResetLink } from '@/app/sign-in/actions';
import { adminPowerLabel } from '@/lib/admin-ui';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ResetMemberPassword({ userId }: { userId: string }) {
  const [state, action] = useActionState(createMemberResetLink, null);
  const resetAdmin = adminPowerLabel('Reset member password');

  return (
    <form action={action} className="flex w-44 flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="flex items-center gap-2 whitespace-nowrap text-caption">
        <input type="checkbox" name="emailToo" value="yes" />
        Email the link too
      </label>
      <SubmitButton
        kind="admin"
        className="w-full whitespace-nowrap"
        pendingLabel="Making a link…"
        title={resetAdmin.title}
        ariaLabel={resetAdmin.ariaLabel}
      >
        Reset password
      </SubmitButton>
      {state?.error ? <p className="text-sm font-bold text-danger">{state.error}</p> : null}
      {state?.emailNote ? <p className="text-sm text-brand-dark">{state.emailNote}</p> : null}
      {state?.url ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Reset link</span>
          <input readOnly value={state.url} className="w-full" />
        </label>
      ) : null}
    </form>
  );
}
