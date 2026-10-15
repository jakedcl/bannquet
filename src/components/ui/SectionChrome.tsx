'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
import { navButtonClass } from '@/components/ui/NavButton';
import { linkOn, matchSection, profileListCrumb } from '@/lib/sections';

export function SectionChrome() {
  const pathname = usePathname();
  const search = useSearchParams();
  const account = useAccount();
  const query = search.toString();
  const listCrumb = profileListCrumb(pathname);
  const section = listCrumb ? null : matchSection(pathname, query, account);
  const crumb = listCrumb ?? section?.crumb ?? null;
  const showNav = Boolean(section && !section.landing && section.links.length > 0);

  if (!showNav && !crumb) return null;

  return (
    <>
      {showNav && section ? (
        <nav aria-label={`${section.label} sections`} className="border-b-2 border-[#3d2412] bg-[#5c3a1e]">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-start gap-2 px-4 py-2">
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
      ) : null}
      {crumb ? (
        <p className="border-b border-[#3d2412] bg-beige px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#5c3a1e]">
          <Link href={crumb.parentHref} className="underline">
            {crumb.parent}
          </Link>
          <span>{` / ${crumb.current}`}</span>
        </p>
      ) : null}
    </>
  );
}
