import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type HubButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
export type HubButtonSize = 'sm' | 'md' | 'lg';

/** Retro bevel buttons. `filled` is the yellow call to action. */
const VARIANT: Record<HubButtonVariant, string> = {
  filled: 'retro-button retro-button-yellow',
  tinted: 'retro-button retro-button-green',
  gray: 'retro-button text-gray-800',
  plain: 'text-ui-accent underline',
  destructive: 'retro-button text-red-700',
};

const SIZE: Record<HubButtonSize, string> = {
  sm: 'min-h-11 !px-3 !py-0 text-sm',
  md: 'min-h-11 !py-0 text-sm',
  lg: 'min-h-12 w-full !py-0 text-base',
};

export function hubButtonClass(variant: HubButtonVariant = 'filled', size: HubButtonSize = 'md', extra = ''): string {
  return `ui-press inline-flex select-none items-center justify-center gap-2 rounded-none font-bold uppercase tracking-wide no-underline disabled:opacity-60 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

export function HubButton({
  variant = 'filled',
  size = 'md',
  className = '',
  children,
  ...rest
}: { variant?: HubButtonVariant; size?: HubButtonSize; className?: string; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <button type="button" className={hubButtonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/** Small label tag, like the old badges. */
export function Pill({
  children,
  tone = 'gray',
  className = '',
}: {
  children: ReactNode;
  tone?: 'gray' | 'accent' | 'warn';
  className?: string;
}) {
  const look = tone === 'accent'
    ? 'bg-brand-green text-white'
    : tone === 'warn'
      ? 'bg-[#5c3a1e] text-white'
      : 'border border-[#999999] bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex max-w-full items-center truncate px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${look} ${className}`}>
      {children}
    </span>
  );
}

export const BUTTON_TONES = ['default', 'primary', 'yellow', 'orange', 'pink', 'blue', 'green', 'purple', 'admin'] as const;

export type ButtonTone = (typeof BUTTON_TONES)[number];

export const BUTTON_TONE_CLASS: Record<ButtonTone, string> = {
  default: 'retro-button text-gray-800',
  primary: 'retro-button retro-button-primary',
  yellow: 'retro-button retro-button-yellow',
  orange: 'retro-button retro-button-orange',
  pink: 'retro-button retro-button-pink',
  blue: 'retro-button retro-button-blue',
  green: 'retro-button retro-button-green',
  purple: 'retro-button retro-button-purple',
  admin: 'retro-button retro-button-admin',
};

/** The shared size for a retro button in any tone: 44px tall, readable label. */
export const BUTTON_SIZE = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-none px-4 !py-0 text-sm font-bold uppercase tracking-wide disabled:opacity-60';

/** A retro button in one of the old tones. Pass `href` for a link. */
export function Button({
  tone = 'default',
  href,
  type = 'button',
  className = '',
  children,
  onClick,
  disabled = false,
}: {
  tone?: ButtonTone;
  href?: string;
  type?: 'button' | 'submit';
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const classes = `${BUTTON_TONE_CLASS[tone]} ${BUTTON_SIZE} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}

/** A filter or tab chip: yellow when on. 44px tall. */
export function chipClass(on: boolean, extra = ''): string {
  return `${on ? 'retro-button-yellow' : 'retro-button text-gray-800'} inline-flex min-h-11 shrink-0 items-center justify-center rounded-none px-3 !py-0 text-sm font-bold uppercase ${extra}`.trim();
}

/** A small plain retro button for secondary actions. 44px tall. */
export const smallButtonClass = 'retro-button inline-flex min-h-11 items-center justify-center rounded-none px-3 !py-0 text-sm font-bold uppercase text-gray-800';
