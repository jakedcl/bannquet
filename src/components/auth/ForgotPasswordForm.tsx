'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetEmail } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetEmail, null);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-gray-700">
        Type the email you used for Bannquet. If it can sign in, we will email a reset link.
      </p>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.sent ? (
        <p className="text-sm text-brand-green-dark">
          If that email can sign in, a reset link is on the way. It can take a minute.
        </p>
      ) : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Email me a reset link'}
      </Button>
      <p className="text-sm">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
