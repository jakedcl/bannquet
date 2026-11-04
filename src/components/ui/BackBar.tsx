'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
import { allPeaks } from '@/lib/challenges';
import { canGoBackInApp, noteFallback } from '@/lib/nav-history';
import { pageTrail, type Crumb } from '@/lib/sections';
import { BackIcon } from '@/components/hub/Icons';

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
        {index > 0 ? <span aria-hidden="true" className="px-1 opacity-60">›</span> : null}
        {last ? crumb.label : <Link href={crumb.href}>{crumb.label}</Link>}
      </span>
    );
  });
}

/**
 * The page passes its own title as `leaf` from the server, so the server and
 * the browser render the same trail. Setting it from a child effect changed
 * the text mid-hydration (React error #418).
 */
export function BackBar({ leaf = null }: { leaf?: string | null }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const account = useAccount();
  const peak = useMemo(() => peakName(pathname), [pathname]);
  const trail = pageTrail(pathname, search.toString(), account, leaf || peak);
  const crumbs = trail.crumbs;

  return (
    <nav aria-label="Page" className="back-bar">
      <button
        type="button"
        className="back-bar-button ui-press"
        onClick={() => {
          if (canGoBackInApp()) {
            router.back();
            return;
          }
          noteFallback(trail.parentHref);
          router.push(trail.parentHref);
        }}
      >
        <BackIcon className="h-[17px] w-[11px]" />
        Back
      </button>
      {crumbs && crumbs.length > 0 ? (
        <p className="crumb-trail">
          <span className="crumb-wide">
            <CrumbList crumbs={crumbs} />
          </span>
          <span className="crumb-narrow">
            {crumbs.length > 2 ? <span aria-hidden="true" className="pr-1">… ›</span> : null}
            <CrumbList crumbs={crumbs.slice(-2)} />
          </span>
        </p>
      ) : null}
    </nav>
  );
}
