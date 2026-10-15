'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navButtonClass } from '@/components/ui/NavButton';

const SECTIONS = [
  { href: '/chat', label: 'Chat' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/trips', label: 'Trips' },
] as const;

export function CommunitySubnav() {
  const pathname = usePathname();
  const here = ['/chat', '/peaks', '/trips', '/community', '/gear'].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
  if (!here) return null;

  return (
    <nav aria-label="Community sections" className="border-b-2 border-[#3d2412] bg-[#5c3a1e]">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-2">
        {SECTIONS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={navButtonClass(active, 'h-8 px-3 text-xs')}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
