'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { changeHoldAction, deleteGearHoldAction, deleteGearItemAction } from '@/app/gear/actions';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { CountControl } from '@/components/ui/CountControl';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { FilterPills } from '@/components/ui/FilterPills';
import { SearchBar } from '@/components/ui/SearchBar';
import { canDeleteOwned, type MemberRole } from '@/lib/membership';

type GearHoldRow = {
  userId: string;
  name: string;
  handle: string | null;
  qty: number;
};

export type GearTableRow = {
  id: string;
  name: string;
  category: string | null;
  addedBy: string | null;
  holds: GearHoldRow[];
  owners: number;
  total: number;
  mine: number;
};

export function GearTable({
  items: source,
  viewer,
  canEdit,
}: {
  items: Array<Omit<GearTableRow, 'owners' | 'total' | 'mine'>>;
  viewer: { id: string; role: MemberRole } | null;
  canEdit: boolean;
}) {
  const items = useMemo(() => source.map((item) => ({
    ...item,
    category: item.category ?? null,
    owners: item.holds.length,
    total: item.holds.reduce((sum, hold) => sum + hold.qty, 0),
    mine: viewer ? item.holds.find((hold) => hold.userId === viewer.id)?.qty ?? 0 : 0,
  })), [source, viewer]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [owned, setOwned] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(items.flatMap((item) => (item.category ? [item.category] : [])))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !`${item.name} ${item.category ?? ''}`.toLowerCase().includes(needle)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (owned === 'yes' && item.mine < 1) return false;
      if (owned === 'no' && item.mine > 0) return false;
      return true;
    });
  }, [items, query, category, owned]);

  const columns: DataColumn<GearTableRow>[] = [
    {
      id: 'name',
      header: 'Item',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => <Link href={`/gear/${row.id}`} className="font-bold underline">{row.name}</Link>,
    },
    {
      id: 'category',
      header: 'Category',
      sortValue: (row) => row.category,
      cell: (row) => row.category || '—',
    },
    {
      id: 'owners',
      header: 'Owners',
      align: 'right',
      sortValue: (row) => row.owners,
      cell: (row) => String(row.owners),
    },
    {
      id: 'total',
      header: 'Total qty',
      align: 'right',
      sortValue: (row) => row.total,
      cell: (row) => String(row.total),
    },
    {
      id: 'you',
      header: 'You',
      sortValue: (row) => row.mine,
      cell: (row) => canEdit ? (
        <CountControl
          count={row.mine}
          zeroLabel="I have this"
          addLabel="Add one"
          removeLabel="Remove one"
          add={{ action: changeHoldAction, fields: { gearId: row.id, delta: '1' } }}
          remove={{ action: changeHoldAction, fields: { gearId: row.id, delta: '-1' } }}
        />
      ) : (
        <span>{row.mine > 0 ? row.mine : '—'}</span>
      ),
    },
  ];

  if (items.length === 0) {
    return <p className="text-sm">Nothing on the list yet. Microspikes, poles, insulated boots.</p>;
  }

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder="Microspikes" />
      {categories.length > 0 ? (
        <FilterPills
          label="Category"
          value={category}
          onChange={setCategory}
          options={[{ id: 'all', label: 'All' }, ...categories.map((item) => ({ id: item, label: item }))]}
        />
      ) : null}
      <FilterPills
        label="Yours"
        value={owned}
        onChange={setOwned}
        options={[
          { id: 'all', label: 'All' },
          { id: 'yes', label: 'I have' },
          { id: 'no', label: "I don't" },
        ]}
      />
      <DataTable
        rows={shown}
        columns={columns}
        rowKey={(row) => row.id}
        empty="No items match."
        defaultSort={{ id: 'name', dir: 'asc' }}
        onRowClick={(row) => setOpenId((current) => (current === row.id ? null : row.id))}
        expanded={(row) => (openId === row.id ? <GearDetail item={row} viewer={viewer} /> : null)}
      />
    </div>
  );
}

function GearDetail({
  item,
  viewer,
}: {
  item: GearTableRow;
  viewer: { id: string; role: MemberRole } | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {item.holds.length === 0 ? (
          <p className="text-sm text-gray-700">Nobody has marked this yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {item.holds.map((hold) => (
              <li key={hold.userId} className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate">
                  {hold.handle ? <Link href={`/user/${hold.handle}`} className="underline">{hold.name}</Link> : hold.name}
                  {` ×${hold.qty}`}
                </p>
                {viewer && canDeleteOwned({ actorRole: viewer.role, actorId: viewer.id, ownerId: hold.userId }) ? (
                  <ConfirmDelete
                    action={deleteGearHoldAction}
                    confirm="Remove this mark?"
                    fields={{ gearId: item.id, userId: hold.userId }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      {viewer && canDeleteOwned({ actorRole: viewer.role, actorId: viewer.id, ownerId: item.addedBy }) ? (
        <ConfirmDelete
          action={deleteGearItemAction}
          confirm="Remove this item from the list?"
          fields={{ id: item.id }}
        />
      ) : null}
    </div>
  );
}
