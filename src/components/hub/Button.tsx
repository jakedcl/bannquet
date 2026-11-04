import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type HubButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
export type HubButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<HubButtonVariant, string> = {
  filled: 'bg-ui-accent text-ui-on-accent hover:brightness-110',
  tinted: 'bg-ui-accent-soft text-ui-accent hover:bg-ui-fill-2',
  gray: 'bg-ui-fill text-ui-label hover:bg-ui-fill-2',
  plain: 'bg-transparent text-ui-accent hover:bg-ui-fill',
  destructive: 'bg-ui-fill text-ui-danger hover:bg-ui-fill-2',
};

const SIZE: Record<HubButtonSize, string> = {
  sm: 'min-h-8 px-3 text-[0.9375rem] rounded-full',
  md: 'min-h-11 px-4 text-[1.0625rem] rounded-xl',
  lg: 'min-h-[3.25rem] px-5 text-[1.0625rem] rounded-2xl w-full',
};

export function hubButtonClass(variant: HubButtonVariant = 'filled', size: HubButtonSize = 'md', extra = ''): string {
  return `ui-press inline-flex select-none items-center justify-center gap-1.5 font-semibold tracking-[-0.01em] no-underline disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
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
    ? 'bg-ui-accent-soft text-ui-accent'
    : tone === 'warn'
      ? 'bg-ui-warn-bg text-ui-warn'
      : 'bg-ui-fill text-ui-label-2';
  return (
    <span className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ${look} ${className}`}>
      {children}
    </span>
  );
}
