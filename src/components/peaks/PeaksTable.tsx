'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { logClimbAction, removeLatestClimbAction } from '@/app/peaks/actions';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import { CountControl } from '@/components/ui/CountControl';

export type PeakTableRow = {
  slug: string;
  name: string;
  elevationFt: number;
  state: string;
  climbs: number;
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
  const [climbed, setClimbed] = useState('all');
  const states = useMemo(() => {
    const found = new Set(rows.map((row) => row.state));
    return [...STATE_ORDER.filter((code) => found.has(code)), ...[...found].filter((code) => !STATE_ORDER.includes(code)).sort()];
  }, [rows]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      if (state !== 'all' && row.state !== state) return false;
      if (climbed === 'yes' && row.mine < 1) return false;
      if (climbed === 'no' && row.mine > 0) return false;
      return true;
    });
  }, [rows, query, state, climbed]);

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
      align: 'right',
      sortValue: (row) => row.elevationFt,
      cell: (row) => `${row.elevationFt.toLocaleString('en-US')} ft`,
    },
    {
      id: 'climbs',
      header: 'Climbs',
      align: 'right',
      sortValue: (row) => row.climbs,
      cell: (row) => String(row.climbs),
    },
    {
      id: 'you',
      header: 'You',
      sortValue: (row) => row.mine,
      cell: (row) => canMark ? (
        <CountControl
          count={row.mine}
          zeroLabel="I climbed this"
          addLabel="Log another climb"
          removeLabel="Remove a climb"
          add={{ action: logClimbAction, fields: { peakSlug: row.slug } }}
          remove={{ action: removeLatestClimbAction, fields: { peakSlug: row.slug } }}
        />
      ) : (
        <span>{row.mine > 0 ? row.mine : '—'}</span>
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
        label="Climbed"
        value={climbed}
        onChange={setClimbed}
        options={[
          { id: 'all', label: 'All' },
          { id: 'yes', label: 'Climbed' },
          { id: 'no', label: 'Not climbed' },
        ]}
      />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(row) => row.slug}
        empty={rows.length === 0 ? 'No peaks yet.' : 'No peaks match.'}
        defaultSort={{ id: 'climbs', dir: 'desc' }}
      />
    </div>
  );
}
