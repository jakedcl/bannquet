'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/retro/Button';
import { requestMagicLink, requestSignInCode } from '@/app/sign-in/actions';

type SignInPanelProps = {
  lockedEmail?: string;
  intro: string;
};

export function SignInPanel({ lockedEmail, intro }: SignInPanelProps) {
  const [email, setEmail] = useState(lockedEmail ?? '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  function sendCode() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestSignInCode(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCodeSent(true);
      setMessage('Check your email for a code. It can take a minute.');
    });
  }

  function sendLink() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestMagicLink(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Check your email for a sign-in link. It can take a minute.');
    });
  }

  async function submitCode() {
    setError(null);
    setChecking(true);
    const { error: signInError } = await authClient.signIn.emailOtp({
      email: email.trim().toLowerCase(),
      otp: code.trim(),
    });
    setChecking(false);
    if (signInError) {
      setError('That code did not work. Check the email and try again, or ask for a new one.');
      return;
    }
    router.push('/auth/continue');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">{intro}</p>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          readOnly={Boolean(lockedEmail)}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>

      {codeSent ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">Code from the email</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full retro-box-inset bg-white px-3 py-2 text-base tracking-widest"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-brand-green-dark">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        {codeSent ? (
          <Button tone="green" type="button" disabled={checking || code.trim().length < 4} onClick={submitCode}>
            {checking ? 'Checking…' : 'Sign in'}
          </Button>
        ) : (
          <Button tone="green" type="button" disabled={pending || email.trim().length < 3} onClick={sendCode}>
            {pending ? 'Sending…' : 'Email me a code'}
          </Button>
        )}
        <Button tone="default" type="button" disabled={pending || email.trim().length < 3} onClick={sendLink}>
          Email me a link
        </Button>
      </div>
      {codeSent ? (
        <button type="button" className="text-sm underline" onClick={sendCode} disabled={pending}>
          Send a new code
        </button>
      ) : null}
    </div>
  );
}
