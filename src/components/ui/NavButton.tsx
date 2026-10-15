import Link from 'next/link';
import type { ReactNode } from 'react';

export function navButtonClass(active = false, extra = '', size: 'md' | 'lg' = 'md'): string {
  const mark = active ? 'shadow-[inset_0_0_0_3px_#ffd700]' : '';
  const scale = size === 'lg' ? 'nav-button-lg' : 'px-3 text-sm lg:px-4';
  return `nav-button rounded-none font-bold uppercase tracking-wide retro-button-blue ${scale} ${mark} ${extra}`.trim();
}

export function menuItemClass(stacked: boolean, size: 'md' | 'lg' = 'md'): string {
  if (size === 'lg') {
    return 'retro-button-yellow block w-full rounded-none px-4 py-3 text-center text-lg font-bold uppercase';
  }
  return stacked
    ? 'retro-button-yellow block w-full rounded-none px-3 py-2 text-center text-sm font-bold uppercase'
    : 'retro-button-yellow block w-full rounded-none px-3 py-1 text-left text-xs font-bold uppercase';
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
