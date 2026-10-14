'use client';

import { useActionState } from 'react';
import { createAccount } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';
import { PasswordField } from '@/components/auth/PasswordField';

export function CreateAccountForm({ email, inviteCode }: { email: string; inviteCode: string }) {
  const [state, action, pending] = useActionState(createAccount, null);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-gray-700">
        This invite is for the email below. Choose a password you can remember. At least 8 characters.
      </p>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          readOnly
          value={email}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <input type="hidden" name="inviteCode" value={inviteCode} />
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <PasswordField name="confirm" label="Password again" autoComplete="new-password" />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending}>
        {pending ? 'Making the account…' : 'Create account'}
      </Button>
    </form>
  );
}
