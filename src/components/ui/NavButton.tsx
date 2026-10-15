import Link from 'next/link';
import type { ReactNode } from 'react';

export function navButtonClass(active: boolean): string {
  const tone = active ? 'retro-button-yellow' : 'retro-button-blue';
  return `nav-button rounded-none px-3 text-sm font-bold uppercase tracking-wide lg:px-4 ${tone}`;
}

export function NavButton({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={navButtonClass(active)}>
      {children}
    </Link>
  );
}
