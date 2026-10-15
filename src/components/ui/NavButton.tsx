import Link from 'next/link';
import type { ReactNode } from 'react';

export function navButtonClass(active = false, extra = ''): string {
  const mark = active ? 'shadow-[inset_0_0_0_3px_#ffd700]' : '';
  return `nav-button rounded-none px-3 text-sm font-bold uppercase tracking-wide lg:px-4 retro-button-blue ${mark} ${extra}`.trim();
}

export function menuItemClass(stacked: boolean): string {
  return stacked
    ? 'retro-button-yellow block w-full rounded-none px-3 py-2 text-center text-sm font-bold uppercase'
    : 'retro-button-yellow block w-full rounded-none px-3 py-1 text-left text-xs font-bold uppercase';
}

export function NavButton({
  href,
  active = false,
  className = '',
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={navButtonClass(active, className)}>
      {children}
    </Link>
  );
}
