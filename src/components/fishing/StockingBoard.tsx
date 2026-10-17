'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { SearchBar } from '@/components/ui/SearchBar';

export type StockRow = {
  id: string;
  water: string;
  when: string;
  species: string;
  number: string;
  place: string;
};

function line(value: string) {
  return <span className="block max-w-xs truncate" title={value}>{value || '—'}</span>;
}

export function StockingBoard({ rows }: { rows: StockRow[] }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.water, row.when, row.species, row.place].some((value) => value.toLowerCase().includes(needle)));
  }, [query, rows]);

  const columns: DataColumn<StockRow>[] = [
    { id: 'water', header: 'Water', sticky: true, sortValue: (row) => row.water, cell: (row) => <span className="font-bold">{row.water}</span> },
    { id: 'when', header: 'When', sortValue: (row) => row.when, cell: (row) => row.when },
    { id: 'species', header: 'Species', sortValue: (row) => row.species, cell: (row) => line(row.species) },
    { id: 'number', header: 'Number', align: 'right', sortValue: (row) => Number(row.number) || null, cell: (row) => row.number || '—' },
  ];

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder="Water or species" />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(row) => row.id}
        empty={query.trim() ? 'No stockings match.' : 'No stockings came back.'}
        defaultSort={{ id: 'water', dir: 'asc' }}
        collapsed
      />
    </div>
  );
}
