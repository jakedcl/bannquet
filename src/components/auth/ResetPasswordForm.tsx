'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { completePasswordReset } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PasswordField } from '@/components/auth/PasswordField';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(completePasswordReset, null);

  if (!token) {
    return (
      <p className="text-sm">
        That reset link is missing.{' '}
        <Link href="/forgot-password" className="underline">
          Ask for a new one
        </Link>
        , or text Jake.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <PasswordField name="confirm" label="New password again" autoComplete="new-password" />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <SubmitButton tone="green" pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}
