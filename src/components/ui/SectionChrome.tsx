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
    <nav aria-label={`${section.label} sections`} className="section-nav hub-bar ui-bar ui-hairline-b w-full">
      <div className="ui-scroll-x mx-auto flex w-full max-w-6xl flex-nowrap items-center justify-start gap-1.5 overflow-x-auto px-3 py-2 md:px-5">
        {section.links.map((item) => {
          const active = linkOn(pathname, query, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="section-nav-link ui-press"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
