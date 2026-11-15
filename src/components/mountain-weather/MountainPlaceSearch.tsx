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
    <div className="retro-box border-[#5c3a1e] bg-beige/80 px-4 py-3">
      <label className="block text-sm font-bold uppercase tracking-wide" htmlFor="mw-place-search">
        Find a mountain
      </label>
      <input
        id="mw-place-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Marcy, Washington, Stratton…"
        className="mt-2 w-full border border-[#5c3a1e]/50 bg-white px-3 py-2 text-sm"
        autoComplete="off"
      />
      {query.trim() && hits.length === 0 ? (
        <p className="mt-2 text-sm text-gray-700">No matching places.</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto border border-[#5c3a1e]/25 bg-white text-sm">
          {hits.map((hit) => (
            <li key={hit.href} className="border-b border-[#5c3a1e]/15 last:border-0">
              <Link href={hit.href} className="block px-3 py-2 no-underline hover:bg-beige/60">
                <span className="font-bold text-gray-900">{hit.name}</span>
                <span className="text-gray-700">
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