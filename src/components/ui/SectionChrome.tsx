'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
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
    <nav aria-label={`${section.label} sections`} className="section-nav w-full border-b-2 border-[#3d2412] bg-[#5c3a1e]">
      <div className="flex w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto py-1.5 pl-1.5 pr-1.5 sm:gap-2 sm:py-2 sm:pl-2 sm:pr-2">
        {section.links.map((item) => {
          const active = linkOn(pathname, query, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`section-nav-link ${active ? 'retro-button-yellow' : 'retro-button-blue'}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
