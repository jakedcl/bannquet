'use client';

import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';

export type BrowserRow = {
  id: string;
  county: string;
  search: string;
  cells: string[];
  sort?: Array<string | number | null>;
};

export function RecordBrowser({
  rows,
  headers,
  empty,
  placeholder,
  defaultSort,
  collapsed = false,
}: {
  rows: BrowserRow[];
  headers: string[];
  empty: string;
  placeholder: string;
  defaultSort?: { id: string; dir: 'asc' | 'desc' };
  collapsed?: boolean;
}) {
  const columns: DataColumn<BrowserRow>[] = headers.map((header, index) => ({
    id: header,
    header,
    sticky: index === 0,
    sortValue: (row) => row.sort?.[index] ?? row.cells[index] ?? null,
    cell: (row) => row.cells[index] ?? '',
  }));

  return (
    <BrowseTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      empty={empty}
      placeholder={placeholder}
      searchText={(row) => row.search}
      defaultSort={defaultSort}
      facets={[{ id: 'county', label: 'County', value: (row) => row.county || null }]}
      collapsed={collapsed}
    />
  );
}
