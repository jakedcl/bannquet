'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import { PeakCheck } from '@/components/peaks/PeakCheck';

export type PeakTableRow = {
  slug: string;
  name: string;
  elevationFt: number;
  state: string;
  /** How many members have this peak on their peaks. */
  visitors: number;
  /** How many times the viewer has been up (0 = not yet). */
  mine: number;
};

const STATE_ORDER = ['NY', 'NH', 'VT', 'ME'];

export function PeaksTable({
  rows,
  canMark,
}: {
  rows: PeakTableRow[];
  canMark: boolean;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const [been, setBeen] = useState('all');
  const states = useMemo(() => {
    const found = new Set(rows.map((row) => row.state));
    return [...STATE_ORDER.filter((code) => found.has(code)), ...[...found].filter((code) => !STATE_ORDER.includes(code)).sort()];
  }, [rows]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (state !== 'all' && row.state !== state) return false;
      if (been === 'yes' && row.mine < 1) return false;
      if (been === 'no' && row.mine > 0) return false;
      return true;
    });
  }, [rows, query, state, been]);

  const columns: DataColumn<PeakTableRow>[] = [
    {
      id: 'name',
      header: 'Peak',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => <Link href={`/peaks/${row.slug}`} className="font-bold underline">{row.name}</Link>,
    },
    {
      id: 'state',
      header: 'State',
      sortValue: (row) => row.state,
      cell: (row) => row.state,
    },
    {
      id: 'elevation',
      header: 'Elevation',
      shortHeader: 'Elev',
      align: 'right',
      sortValue: (row) => row.elevationFt,
      cell: (row) => (
        <>
          <span className="md:hidden">{`${(row.elevationFt / 1000).toFixed(1)}k`}</span>
          <span className="hidden md:inline">{`${row.elevationFt.toLocaleString('en-US')} ft`}</span>
        </>
      ),
    },
    {
      id: 'visitors',
      header: 'Friends',
      align: 'right',
      sortValue: (row) => row.visitors,
      cell: (row) => String(row.visitors),
    },
    {
      id: 'you',
      header: 'You',
      sortValue: (row) => row.mine,
      cell: (row) => canMark ? (
        <PeakCheck peakSlug={row.slug} count={row.mine} />
      ) : (
        <span>{row.mine > 1 ? `✓ ×${row.mine}` : row.mine ? '✓' : '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder="Peak name" />
      <FilterPills
        label="State"
        value={state}
        onChange={setState}
        options={[{ id: 'all', label: 'All' }, ...states.map((code) => ({ id: code, label: code }))]}
      />
      <FilterPills
        label="Mine"
        value={been}
        onChange={setBeen}
        options={[
          { id: 'all', label: 'All' },
          { id: 'yes', label: 'Been' },
          { id: 'no', label: 'Not yet' },
        ]}
      />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(row) => row.slug}
        empty={rows.length === 0 ? 'No peaks yet.' : 'No peaks match.'}
        defaultSort={{ id: 'visitors', dir: 'desc' }}
      />
    </div>
  );
}
