'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Table } from '@/components/retro/Table';

export type PeakTableRow = {
  slug: string;
  name: string;
  elevationFt: number;
  listId: string;
  listName: string;
  area: string;
  climbs: number;
};

export function PeaksTable({
  rows,
  lists,
  areas,
}: {
  rows: PeakTableRow[];
  lists: Array<{ id: string; name: string }>;
  areas: string[];
}) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [listId, setListId] = useState('');
  const [climbedOnly, setClimbedOnly] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (area && row.area !== area) return false;
      if (listId && row.listId !== listId) return false;
      if (climbedOnly && row.climbs < 1) return false;
      return true;
    });
  }, [rows, query, area, listId, climbedOnly]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-bold uppercase">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Peak name"
            className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase">Area</span>
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
          >
            <option value="">All areas</option>
            {areas.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase">List</span>
          <select
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
          >
            <option value="">All lists</option>
            {lists.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
          <input
            type="checkbox"
            checked={climbedOnly}
            onChange={(event) => setClimbedOnly(event.target.checked)}
          />
          Climbed only
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm">No peaks match.</p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {shown.map((row) => (
              <li key={row.slug}>
                <Link href={`/peaks/${row.slug}`} className="block bg-white p-3 retro-box-inset">
                  <span className="font-bold">{row.name}</span>
                  <span className="mt-1 block text-sm text-gray-700">
                    {row.elevationFt.toLocaleString('en-US')} ft · {row.area}
                  </span>
                  <span className="block text-sm text-gray-700">
                    {row.listName} · {row.climbs} {row.climbs === 1 ? 'climb' : 'climbs'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Table
              headers={['Peak', 'Elevation', 'Area', 'Climbs']}
              rows={shown.map((row) => [
                <Link key={row.slug} href={`/peaks/${row.slug}`} className="font-bold underline">{row.name}</Link>,
                `${row.elevationFt.toLocaleString('en-US')} ft`,
                row.area,
                String(row.climbs),
              ])}
            />
          </div>
        </>
      )}
    </div>
  );
}
