'use client';

import { useState } from 'react';

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
};

export function PasswordField({ name, label, autoComplete, hint }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block space-y-1">
      <span className="text-sm font-bold">{label}</span>
      <span className="flex gap-2">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={128}
          className="min-w-0 flex-1 retro-box-inset bg-white px-3 py-2 text-base"
        />
        <button
          type="button"
          className="retro-button inline-flex min-h-11 shrink-0 items-center px-3 !py-0 text-sm font-bold"
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint ? <span className="block text-xs text-gray-600">{hint}</span> : null}
    </label>
  );
}
