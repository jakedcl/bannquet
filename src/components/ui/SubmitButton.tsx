'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { BUTTON_SIZE, BUTTON_TONE_CLASS, type ButtonTone } from '@/components/hub/Button';

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
      ? `retro-button-yellow inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-none p-0 text-lg font-bold disabled:opacity-60 ${className}`
      : `${BUTTON_TONE_CLASS[tone]} ${BUTTON_SIZE} ${tone === 'admin' ? '!p-0' : ''} ${className}`;

  const label = spinning ? (
    <>
      <Spinner />
      {icon ? <span className="sr-only">{pendingLabel}</span> : pendingLabel}
    </>
  ) : tone === 'admin' ? (
    <span className="retro-button-admin-label">{children}</span>
  ) : (
    children
  );

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
      {label}
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
