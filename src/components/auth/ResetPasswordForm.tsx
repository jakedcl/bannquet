'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { completePasswordReset } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';
import { PasswordField } from '@/components/auth/PasswordField';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordReset, null);

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
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save password'}
      </Button>
    </form>
  );
}
