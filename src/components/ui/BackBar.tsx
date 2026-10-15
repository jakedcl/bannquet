'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
import { allPeaks } from '@/lib/challenges';
import { canGoBackInApp, noteFallback } from '@/lib/nav-history';
import { pageTrail, type Crumb } from '@/lib/sections';

const LeafValue = createContext<string | null>(null);
const SetLeaf = createContext<(label: string | null) => void>(() => {});

export function LeafProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <SetLeaf.Provider value={setLabel}>
      <LeafValue.Provider value={label}>{children}</LeafValue.Provider>
    </SetLeaf.Provider>
  );
}

export function CrumbLeaf({ label }: { label: string }) {
  const setLabel = useContext(SetLeaf);
  useLayoutEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}

function peakName(pathname: string): string | null {
  const match = pathname.match(/^\/peaks\/([^/]+)$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  return allPeaks().find((peak) => peak.slug === slug)?.name ?? null;
}

function CrumbList({ crumbs }: { crumbs: Crumb[] }) {
  return crumbs.map((crumb, index) => {
    const last = index === crumbs.length - 1;
    return (
      <span key={`${crumb.href}-${crumb.label}`}>
        {index > 0 ? ' / ' : null}
        {last ? crumb.label : <Link href={crumb.href} className="underline">{crumb.label}</Link>}
      </span>
    );
  });
}

export function BackBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const account = useAccount();
  const leaf = useContext(LeafValue);
  const peak = useMemo(() => peakName(pathname), [pathname]);
  const trail = pageTrail(pathname, search.toString(), account, leaf || peak);
  const crumbs = trail.crumbs;

  return (
    <nav aria-label="Page" className="back-bar">
      <button
        type="button"
        className="retro-button back-bar-button"
        onClick={() => {
          if (canGoBackInApp()) {
            router.back();
            return;
          }
          noteFallback(trail.parentHref);
          router.push(trail.parentHref);
        }}
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden="true">
          <path d="M12.5 4 L6.5 10 L12.5 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
        Back
      </button>
      {crumbs && crumbs.length > 0 ? (
        <p className="crumb-trail">
          <span className="crumb-wide">
            {crumbs.length > 2 ? '… / ' : null}
            <CrumbList crumbs={crumbs.length > 2 ? crumbs.slice(-2) : crumbs} />
          </span>
          <span className="crumb-narrow">
            {crumbs.length > 1 ? '… / ' : null}
            <CrumbList crumbs={crumbs.slice(-2)} />
          </span>
        </p>
      ) : null}
    </nav>
  );
}
