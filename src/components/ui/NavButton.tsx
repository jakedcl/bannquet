import Link from 'next/link';
import type { ReactNode } from 'react';

export function navButtonClass(active = false, extra = '', size: 'md' | 'lg' = 'md'): string {
  const mark = active ? 'nav-button-on' : '';
  const scale = size === 'lg' ? 'nav-button-lg' : 'px-3 text-sm lg:px-4';
  return `nav-button rounded-none font-bold uppercase tracking-wide retro-button-blue ${scale} ${mark} ${extra}`.trim();
}

export function NavButton({
  href,
  active = false,
  className = '',
  size = 'md',
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  return (
    <Link href={href} className={navButtonClass(active, className, size)}>
      {children}
    </Link>
  );
}
