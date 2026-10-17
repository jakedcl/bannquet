'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { SearchBar } from '@/components/ui/SearchBar';
import type { FishingLake } from '@/lib/fishing/lakes';

function line(value: string | null) {
  if (!value) return '—';
  return <span className="block max-w-xs truncate" title={value}>{value}</span>;
}

export function LakesBoard({ lakes }: { lakes: FishingLake[] }) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lakes;
    return lakes.filter((lake) => [lake.name, lake.county, lake.species, lake.launch, lake.note].some((value) => value?.toLowerCase().includes(needle)));
  }, [lakes, query]);

  const columns: DataColumn<FishingLake>[] = [
    { id: 'name', header: 'Water', sticky: true, sortValue: (lake) => lake.name, cell: (lake) => <span className="font-bold">{lake.name}</span> },
    { id: 'county', header: 'County', sortValue: (lake) => lake.county, cell: (lake) => line(lake.county) },
    { id: 'species', header: 'Species', sortValue: (lake) => lake.species, cell: (lake) => line(lake.species) },
    { id: 'launch', header: 'Launch', sortValue: (lake) => lake.launch, cell: (lake) => line(lake.launch) },
  ];

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder="Lake or species" />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(lake) => lake.id}
        empty={query.trim() ? 'No lakes match.' : 'No lakes came back.'}
        defaultSort={{ id: 'name', dir: 'asc' }}
        collapsed
      />
    </div>
  );
}
