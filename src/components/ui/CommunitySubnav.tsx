'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { href: '/posts', label: 'Posts' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/stats', label: 'Stats' },
  { href: '/trips', label: 'Trips' },
] as const;

export function CommunitySubnav() {
  const pathname = usePathname();
  const here = SECTIONS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!here) return null;

  return (
    <nav aria-label="Community sections" className="border-b-2 border-brand-green-dark bg-beige">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-2">
        {SECTIONS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-none px-3 py-1 text-xs font-bold uppercase ${active ? 'retro-button-yellow' : 'retro-button'}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
