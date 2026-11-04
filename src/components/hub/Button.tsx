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
  sm: '!px-3 !py-1 text-xs',
  md: 'text-sm',
  lg: 'w-full !py-3 text-base',
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

export function HubLinkButton({
  href,
  variant = 'filled',
  size = 'md',
  className = '',
  children,
}: { href: string; variant?: HubButtonVariant; size?: HubButtonSize; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={hubButtonClass(variant, size, className)}>
      {children}
    </Link>
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
    <span className={`inline-flex max-w-full items-center truncate px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${look} ${className}`}>
      {children}
    </span>
  );
}
