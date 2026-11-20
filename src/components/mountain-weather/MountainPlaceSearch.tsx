'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type MountainPlaceSearchItem = {
  name: string;
  href: string;
  sectionTitle: string;
  stateName: string;
};

export function MountainPlaceSearch({ places }: { places: MountainPlaceSearchItem[] }) {
  const [query, setQuery] = useState('');
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) => p.name.toLowerCase().includes(q) || p.sectionTitle.toLowerCase().includes(q))
      .slice(0, 12);
  }, [places, query]);

  return (
    <div className="panel px-4 py-3">
      <label className="block text-sm font-bold uppercase tracking-wide" htmlFor="mw-place-search">
        Find a mountain
      </label>
      <input
        id="mw-place-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Marcy, Washington, Stratton…"
        className="mt-2 w-full border border-hairline bg-white px-3 py-2 text-sm"
        autoComplete="off"
      />
      {query.trim() && hits.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No matching places.</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto border border-hairline bg-white text-sm">
          {hits.map((hit) => (
            <li key={hit.href} className="border-b border-hairline last:border-0">
              <Link href={hit.href} className="block px-3 py-2 no-underline hover:bg-surface-cream">
                <span className="font-bold text-ink">{hit.name}</span>
                <span className="text-ink-2">
                  {' '}
                  · {hit.sectionTitle}, {hit.stateName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}