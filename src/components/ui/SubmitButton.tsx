'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { BUTTON_TONE_CLASS, type ButtonTone } from '@/components/retro/Button';

export function SubmitButton({
  children,
  pendingLabel = 'Sending…',
  tone = 'default',
  className = '',
  disabled = false,
  name,
  value,
  ariaLabel,
  title,
  icon = false,
  unstyled = false,
  onClick,
}: {
  children: ReactNode;
  pendingLabel?: string;
  tone?: ButtonTone;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  ariaLabel?: string;
  title?: string;
  /** Square control. The spinner replaces the icon and the label stays for screen readers. */
  icon?: boolean;
  /** Use className as the whole look, for menu rows and text links. */
  unstyled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending, data } = useFormStatus();
  const mine = name == null || data?.get(name) === value;
  const spinning = pending && mine;
  const look = unstyled
    ? `inline-flex items-center justify-center gap-2 disabled:opacity-60 ${className}`
    : icon
      ? `retro-button-yellow inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none p-0 text-lg font-bold disabled:opacity-60 ${className}`
      : `${BUTTON_TONE_CLASS[tone]} inline-flex items-center justify-center gap-2 rounded-none px-4 py-2 text-sm font-bold uppercase tracking-wide disabled:opacity-60 ${className}`;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      aria-label={spinning ? pendingLabel : ariaLabel}
      aria-busy={spinning}
      disabled={pending || disabled}
      onClick={onClick}
      className={look}
    >
      {spinning ? (
        <>
          <Spinner />
          {icon ? <span className="sr-only">{pendingLabel}</span> : pendingLabel}
        </>
      ) : children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 animate-spin" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
