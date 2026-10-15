'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createPublicAccount } from '@/app/sign-in/actions';
import { Button } from '@/components/retro/Button';
import { PasswordField } from '@/components/auth/PasswordField';
import { SignupTraps } from '@/components/auth/SignupTraps';

export function SignUpForm({ stamp }: { stamp: string }) {
  const [state, action, pending] = useActionState(createPublicAccount, null);
  if (state?.done) {
    return (
      <p className="text-sm">
        Account made.{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <SignupTraps stamp={stamp} />
      <p className="text-sm text-gray-700">
        Pick the name your friends know, a username, and a password. You can look around right away.
        Jake approves you before you can post.
      </p>
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
      <p className="text-sm">
        Already have one?{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
