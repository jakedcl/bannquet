'use client';

import Link from 'next/link';
import { ResetMemberPassword } from '@/components/auth/ResetMemberPassword';
import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';

export type InviteRow = {
  code: string;
  email: string;
  status: string;
};

export function InviteTable({ rows }: { rows: InviteRow[] }) {
  const columns: DataColumn<InviteRow>[] = [
    {
      id: 'email',
      header: 'Email',
      sticky: true,
      sortValue: (row) => row.email,
      cell: (row) => row.email,
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => row.status,
    },
    {
      id: 'link',
      header: 'Link',
      sortValue: (row) => row.code,
      cell: (row) => <Link href={`/invite/${row.code}`} className="underline">/invite/{row.code}</Link>,
    },
  ];
  return (
    <BrowseTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.code}
      empty="No invites yet."
      defaultSort={{ id: 'email', dir: 'asc' }}
      placeholder="Email or status"
      searchText={(row) => `${row.email} ${row.status} ${row.code}`}
      facets={[{ id: 'status', label: 'Status', value: (row) => row.status }]}
      collapsed
    />
  );
}

export type AdminMemberRow = {
  id: string;
  name: string;
  href: string | null;
  email: string;
  role: string;
  lastSignIn: string;
  canReset: boolean;
};

export function AdminMemberTable({ rows }: { rows: AdminMemberRow[] }) {
  const columns: DataColumn<AdminMemberRow>[] = [
    {
      id: 'name',
      header: 'Name',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => (row.href ? <Link href={row.href} className="font-bold underline">{row.name}</Link> : row.name),
    },
    {
      id: 'email',
      header: 'Email',
      sortValue: (row) => row.email,
      cell: (row) => row.email,
    },
    {
      id: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      cell: (row) => row.role,
    },
    {
      id: 'lastSignIn',
      header: 'Last sign-in',
      sortValue: (row) => row.lastSignIn,
      cell: (row) => row.lastSignIn,
    },
    {
      id: 'password',
      header: 'Password',
      sortValue: () => null,
      cell: (row) => (row.canReset ? <ResetMemberPassword userId={row.id} /> : '—'),
    },
  ];
  return (
    <BrowseTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      empty="Nobody has signed in yet."
      defaultSort={{ id: 'name', dir: 'asc' }}
      placeholder="Name, email, or role"
      searchText={(row) => `${row.name} ${row.email} ${row.role} ${row.lastSignIn}`}
      facets={[{ id: 'role', label: 'Role', value: (row) => row.role }]}
      collapsed
    />
  );
}
