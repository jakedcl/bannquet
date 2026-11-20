import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Buttons, chips and small tags. The looks live in src/app/styles/components.css;
 * this file only picks classes. Use `Button` / `buttonClass` in new code.
 */

export type ButtonKind = 'yellow' | 'green' | 'brown' | 'gray' | 'danger' | 'plain';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'full' | 'icon';

const KIND: Record<ButtonKind, string> = {
  yellow: 'btn btn-yellow',
  green: 'btn btn-green',
  brown: 'btn btn-brown',
  gray: 'btn',
  danger: 'btn btn-danger',
  plain: 'btn btn-plain',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  full: 'btn-lg btn-full',
  icon: 'btn-icon',
};

/** Class string for a button-looking element (links, labels, summary). */
export function buttonClass(kind: ButtonKind = 'gray', size: ButtonSize = 'md', extra = ''): string {
  return [KIND[kind], SIZE[size], extra].filter(Boolean).join(' ');
}

type ButtonProps = {
  kind?: ButtonKind;
  size?: ButtonSize;
  /** Renders a Next link instead of a button. */
  href?: string;
  className?: string;
  children: ReactNode;
  /** Old color name, mapped onto a kind. Prefer `kind`. */
  tone?: ButtonTone;
} & Omit<ComponentProps<'button'>, 'className' | 'children'>;

export function Button({ kind, size = 'md', href, className = '', children, tone, type = 'button', disabled, ...rest }: ButtonProps) {
  const classes = tone && !kind ? toneClass(tone, size, className) : buttonClass(kind ?? 'gray', size, className);
  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

/** A filter or tab chip: yellow when on. 36px tall. */
export function chipClass(on: boolean, extra = ''): string {
  return ['chip', on ? 'chip-on' : '', extra].filter(Boolean).join(' ');
}

/** Small label tag. */
export type TagKind = 'outline' | 'arrow' | 'green' | 'gray' | 'warn';

export function tagClass(kind: TagKind = 'outline', extra = ''): string {
  return ['tag', `tag-${kind}`, extra].filter(Boolean).join(' ');
}

export function Tag({ kind = 'outline', className = '', children }: { kind?: TagKind; className?: string; children: ReactNode }) {
  return <span className={tagClass(kind, `truncate ${className}`)}>{children}</span>;
}

/* ---- Old API, kept until the page stages move callers over ---------- */

/** @deprecated Use `ButtonKind`. */
export type HubButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
/** @deprecated Use `ButtonSize`. */
export type HubButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_KIND: Record<HubButtonVariant, ButtonKind> = {
  filled: 'yellow',
  tinted: 'green',
  gray: 'gray',
  plain: 'plain',
  destructive: 'danger',
};

/** @deprecated Use `buttonClass`. */
export function hubButtonClass(variant: HubButtonVariant = 'filled', size: HubButtonSize = 'md', extra = ''): string {
  return buttonClass(VARIANT_KIND[variant], size === 'lg' ? 'full' : size, extra);
}

/** @deprecated Use `<Button kind=...>`. */
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

/** @deprecated Use `<Tag>`. */
export function Pill({
  children,
  tone = 'gray',
  className = '',
}: {
  children: ReactNode;
  tone?: 'gray' | 'accent' | 'warn';
  className?: string;
}) {
  const kind: TagKind = tone === 'accent' ? 'green' : tone === 'warn' ? 'arrow' : 'gray';
  return <Tag kind={kind} className={className}>{children}</Tag>;
}

export const BUTTON_TONES = ['default', 'primary', 'yellow', 'blue', 'green', 'admin'] as const;

/** @deprecated Old color names. New code uses `ButtonKind`. */
export type ButtonTone = (typeof BUTTON_TONES)[number];

/** Old tones onto the new kinds. */
export const BUTTON_TONE_CLASS: Record<ButtonTone, string> = {
  default: 'btn',
  primary: 'btn btn-green',
  yellow: 'btn btn-yellow',
  blue: 'btn btn-brown',
  green: 'btn btn-green',
  admin: 'btn btn-admin',
};

function toneClass(tone: ButtonTone, size: ButtonSize, extra: string): string {
  return [BUTTON_TONE_CLASS[tone], SIZE[size], extra].filter(Boolean).join(' ');
}

/** @deprecated The size is part of `.btn` now; kept so old class strings still compose. */
export const BUTTON_SIZE = '';

/** @deprecated Use `buttonClass('gray', 'sm')`. */
export const smallButtonClass = buttonClass('gray', 'sm');
