'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
import { navButtonClass } from '@/components/ui/NavButton';
import { linkOn, matchSection } from '@/lib/sections';

export function SectionChrome() {
  const pathname = usePathname();
  const search = useSearchParams();
  const account = useAccount();
  const query = search.toString();
  const section = matchSection(pathname, query, account);
  const showNav = Boolean(section && !section.landing && section.links.length > 0);
  if (!showNav || !section) return null;

  return (
    <nav aria-label={`${section.label} sections`} className="w-full border-b-2 border-[#3d2412] bg-[#5c3a1e]">
      <div className="flex w-full flex-wrap items-center justify-start gap-2 py-2 pl-2 pr-2">
        {section.links.map((item) => {
          const active = linkOn(pathname, query, item.href);
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
