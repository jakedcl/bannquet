'use client';

import { useEffect, useRef } from 'react';
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
  const navRef = useRef<HTMLElement>(null);

  // Anchors clear the bar even when its buttons wrap to a second row.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--sub-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--sub-h');
    };
  }, [showNav]);

  if (!showNav || !section) return null;

  return (
    <nav ref={navRef} aria-label={`${section.label} sections`} className="section-nav sticky z-40 w-full border-b-2 border-[#3d2412] bg-[#5c3a1e]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-start gap-2 px-3 py-2">
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
