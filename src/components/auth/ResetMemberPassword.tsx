'use client';

import { useActionState } from 'react';
import { createMemberResetLink } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ResetMemberPassword({ userId }: { userId: string }) {
  const [state, action] = useActionState(createMemberResetLink, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="emailToo" value="yes" />
        Also email a reset link
      </label>
      <SubmitButton pendingLabel="Making a link…">Reset password</SubmitButton>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.emailNote ? <p className="text-sm text-brand-green-dark">{state.emailNote}</p> : null}
      {state?.url ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Reset link</span>
          <input readOnly value={state.url} className="w-full retro-box-inset bg-white px-2 py-1 text-xs" />
        </label>
      ) : null}
    </form>
  );
}
