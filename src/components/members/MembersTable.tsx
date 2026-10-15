'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';
import type { DirectoryMember } from '@/lib/members-directory';
import { homeStateLabel } from '@/lib/us-states';

export function MembersTable({ rows }: { rows: DirectoryMember[] }) {
  const columns: DataColumn<DirectoryMember>[] = [
    {
      id: 'name',
      header: 'Name',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => {
        const initial = row.name.slice(0, 1).toUpperCase();
        const face = row.avatarUrl ? (
          <Image src={row.avatarUrl} alt="" width={32} height={32} className="avatar-frame h-8 w-8 object-cover" />
        ) : (
          <span className="avatar-frame flex h-8 w-8 items-center justify-center bg-beige text-xs font-bold">{initial}</span>
        );
        const label = (
          <span className="flex items-center gap-2">
            {face}
            <span className="font-bold">{row.name}</span>
          </span>
        );
        return row.handle ? <Link href={`/user/${row.handle}`} className="underline">{label}</Link> : label;
      },
    },
    {
      id: 'username',
      header: 'Username',
      sortValue: (row) => row.handle,
      cell: (row) => (row.handle ? `@${row.handle}` : '—'),
    },
    {
      id: 'climbs',
      header: 'Climbs',
      align: 'right',
      sortValue: (row) => row.climbs,
      cell: (row) => String(row.climbs),
    },
    {
      id: 'routes',
      header: 'Routes',
      align: 'right',
      sortValue: (row) => row.routes,
      cell: (row) => String(row.routes),
    },
  ];

  return (
    <BrowseTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No members match."
      defaultSort={{ id: 'name', dir: 'asc' }}
      placeholder="Name or username"
      searchText={(row) => `${row.name} ${row.handle ?? ''}`}
      facets={[
        {
          id: 'region',
          label: 'Region',
          value: (row) => homeStateLabel(row.region),
        },
      ]}
    />
  );
}
