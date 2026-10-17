'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';

export type NamedRow = {
  id: string;
  name: string;
  detail: string;
  extra: string;
  href?: string;
};

const columns: DataColumn<NamedRow>[] = [
  {
    id: 'name',
    header: 'Name',
    sticky: true,
    sortValue: (row) => row.name,
    cell: (row) => <span className="font-bold">{row.name}</span>,
  },
  { id: 'detail', header: 'Detail', sortValue: (row) => row.detail, cell: (row) => row.detail },
  { id: 'extra', header: 'More', sortValue: (row) => row.extra, cell: (row) => row.extra },
];

export function FishingRows({
  rows,
  empty,
  headers,
}: {
  rows: NamedRow[];
  empty: string;
  headers?: { name?: string; detail?: string; extra?: string };
}) {
  const router = useRouter();
  const labeled = columns.map((column) => ({
    ...column,
    header: (headers && headers[column.id as 'name' | 'detail' | 'extra']) || column.header,
  }));
  return (
    <DataTable
      rows={rows}
      columns={labeled}
      rowKey={(row) => row.id}
      empty={empty}
      defaultSort={{ id: 'name', dir: 'asc' }}
      collapsed={rows.length > 8}
      onRowClick={rows.some((row) => row.href) ? (row) => { if (row.href) router.push(row.href); } : undefined}
    />
  );
}
