'use client';

import { DataTable, type DataColumn } from '@/components/ui/DataTable';

export type TideRow = {
  id: string;
  day: string;
  time: string;
  tide: string;
  feet: string;
  sort: number;
};

const columns: DataColumn<TideRow>[] = [
  { id: 'day', header: 'Day', sticky: true, sortValue: (row) => row.sort, cell: (row) => row.day },
  { id: 'time', header: 'Time', sortValue: (row) => row.sort, cell: (row) => row.time },
  { id: 'tide', header: 'Tide', sortValue: (row) => row.tide, cell: (row) => row.tide },
  { id: 'feet', header: 'Feet', align: 'right', sortValue: (row) => Number(row.feet), cell: (row) => row.feet },
];

export function TideTable({ rows }: { rows: TideRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No tide predictions."
      defaultSort={{ id: 'time', dir: 'asc' }}
      collapsed
    />
  );
}
