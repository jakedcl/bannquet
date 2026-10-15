'use client';

import { useActionState } from 'react';
import { createAccount } from '@/app/sign-in/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PasswordField } from '@/components/auth/PasswordField';
import { SignupTraps } from '@/components/auth/SignupTraps';

export function CreateAccountForm({
  email,
  inviteCode,
  stamp,
}: {
  email: string;
  inviteCode: string;
  stamp: string;
}) {
  const [state, action] = useActionState(createAccount, null);
  if (state?.done) {
    return <p className="text-sm">Account made. Sign in with that email.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <SignupTraps stamp={stamp} />
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
      <label className="block space-y-1">
        <span className="text-sm font-bold">Display name</span>
        <input
          name="displayName"
          required
          maxLength={80}
          autoComplete="name"
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Username</span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={24}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
        <span className="block text-xs text-gray-600">
          Lowercase letters, numbers, and underscores. This becomes your page address.
        </span>
      </label>
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <PasswordField name="confirm" label="Password again" autoComplete="new-password" />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <SubmitButton tone="green" pendingLabel="Making the account…">Create account</SubmitButton>
    </form>
  );
}
