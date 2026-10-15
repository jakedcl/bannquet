'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';

export type BrowseFacet<T> = {
  id: string;
  label: string;
  value: (row: T) => string | null;
  labelFor?: (id: string) => string;
};

export function BrowseTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  defaultSort,
  placeholder,
  searchText,
  facets = [],
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  empty: string;
  defaultSort?: { id: string; dir: 'asc' | 'desc' };
  placeholder: string;
  searchText: (row: T) => string;
  facets?: BrowseFacet<T>[];
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});

  const groups = useMemo(() => facets.flatMap((facet) => {
    const ids = [...new Set(rows.map((row) => facet.value(row)).filter((id): id is string => Boolean(id)))].sort((a, b) => a.localeCompare(b));
    if (ids.length < 2) return [];
    return [{
      facet,
      options: ids.map((id) => ({ id, label: facet.labelFor?.(id) ?? id })),
    }];
  }), [rows, facets]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !searchText(row).toLowerCase().includes(needle)) return false;
      for (const group of groups) {
        const value = picked[group.facet.id] ?? 'all';
        if (value !== 'all' && group.facet.value(row) !== value) return false;
      }
      return true;
    });
  }, [rows, query, picked, groups, searchText]);

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder={placeholder} />
      {groups.map((group) => (
        <FilterPills
          key={group.facet.id}
          label={group.facet.label}
          value={picked[group.facet.id] ?? 'all'}
          options={[{ id: 'all', label: 'All' }, ...group.options]}
          onChange={(id) => setPicked((current) => ({ ...current, [group.facet.id]: id }))}
        />
      ))}
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={rowKey}
        empty={query.trim() || Object.values(picked).some((value) => value !== 'all') ? 'Nothing matches.' : empty}
        defaultSort={defaultSort}
      />
    </div>
  );
}
