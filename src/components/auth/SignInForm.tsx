'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInWithPassword } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';
import { PasswordField } from '@/components/auth/PasswordField';

export function SignInForm({ next = '' }: { next?: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, null);

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      <PasswordField name="password" label="Password" autoComplete="current-password" />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot your password?
        </Link>
      </p>
      <p className="text-sm">
        <Link href="/sign-up" className="underline">
          New here? Make an account
        </Link>
      </p>
    </form>
  );
}
