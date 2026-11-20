import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Buttons, chips and small tags. The looks live in src/app/styles/components.css;
 * this file only picks classes. Use `Button` / `buttonClass` in new code.
 */

export type ButtonKind = 'yellow' | 'green' | 'brown' | 'gray' | 'danger' | 'plain' | 'admin';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'full' | 'icon';

const KIND: Record<ButtonKind, string> = {
  yellow: 'btn btn-yellow',
  green: 'btn btn-green',
  brown: 'btn btn-brown',
  gray: 'btn',
  danger: 'btn btn-danger',
  plain: 'btn btn-plain',
  admin: 'btn btn-admin',
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
} & Omit<ComponentProps<'button'>, 'className' | 'children'>;

export function Button({ kind = 'gray', size = 'md', href, className = '', children, type = 'button', disabled, ...rest }: ButtonProps) {
  const classes = buttonClass(kind, size, className);
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

/** A small plain button for secondary actions. */
export const smallButtonClass = buttonClass('gray', 'sm');
