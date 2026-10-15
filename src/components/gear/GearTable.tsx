'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { deleteGearHoldAction, deleteGearItemAction, setHoldAction } from '@/app/gear/actions';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
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
  category?: string | null;
  addedBy: string | null;
  holds: GearHoldRow[];
};

export function GearTable({
  items,
  viewer,
  canEdit,
}: {
  items: GearTableRow[];
  viewer: { id: string; role: MemberRole } | null;
  canEdit: boolean;
}) {
  const [query, setQuery] = useState('');
  const [held, setHeld] = useState<'all' | 'some' | 'none'>('all');
  const [category, setCategory] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(items.flatMap((item) => (item.category ? [item.category] : [])))].sort(),
    [items],
  );
  const showCategory = categories.length > 0;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (category && item.category !== category) return false;
      if (held === 'some' && item.holds.length < 1) return false;
      if (held === 'none' && item.holds.length > 0) return false;
      return true;
    });
  }, [items, query, held, category]);

  if (items.length === 0) {
    return <p className="text-sm">Nothing on the list yet. Microspikes, poles, insulated boots.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-bold uppercase">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Microspikes"
            className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase">Show</span>
          <select
            value={held}
            onChange={(event) => setHeld(event.target.value as 'all' | 'some' | 'none')}
            className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
          >
            <option value="all">All items</option>
            <option value="some">Someone has it</option>
            <option value="none">Nobody has it</option>
          </select>
        </label>
        {showCategory ? (
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm">No items match.</p>
      ) : (
        <div className="retro-box-inset overflow-x-auto bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-beige font-mono text-xs uppercase">
              <tr>
                <th className="border border-border-gray px-3 py-2 font-bold">Item</th>
                {showCategory ? <th className="border border-border-gray px-3 py-2 font-bold">Category</th> : null}
                <th className="border border-border-gray px-3 py-2 text-right font-bold">Total count</th>
                <th className="border border-border-gray px-3 py-2 text-right font-bold"># of people who have it</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => {
                const open = openId === item.id;
                const total = item.holds.reduce((sum, hold) => sum + hold.qty, 0);
                const mine = viewer ? item.holds.find((hold) => hold.userId === viewer.id) : null;
                return (
                  <GearRows
                    key={item.id}
                    item={item}
                    open={open}
                    total={total}
                    mineQty={mine?.qty ?? 0}
                    showCategory={showCategory}
                    viewer={viewer}
                    canEdit={canEdit}
                    onToggle={() => setOpenId(open ? null : item.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GearRows({
  item,
  open,
  total,
  mineQty,
  showCategory,
  viewer,
  canEdit,
  onToggle,
}: {
  item: GearTableRow;
  open: boolean;
  total: number;
  mineQty: number;
  showCategory: boolean;
  viewer: { id: string; role: MemberRole } | null;
  canEdit: boolean;
  onToggle: () => void;
}) {
  const span = showCategory ? 4 : 3;
  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="cursor-pointer hover:bg-beige/70"
      >
        <td className="border border-border-gray px-3 py-2 font-bold">{item.name}</td>
        {showCategory ? <td className="border border-border-gray px-3 py-2">{item.category}</td> : null}
        <td className="border border-border-gray px-3 py-2 text-right">{total}</td>
        <td className="border border-border-gray px-3 py-2 text-right">{item.holds.length}</td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={span} className="border border-border-gray bg-beige/40 px-3 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {item.holds.length === 0 ? (
                  <p className="text-sm text-gray-700">Nobody has marked this yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {item.holds.map((hold) => (
                      <li key={hold.userId} className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate">
                          {hold.handle ? (
                            <Link href={`/user/${hold.handle}`} className="underline" onClick={(event) => event.stopPropagation()}>
                              {hold.name}
                            </Link>
                          ) : hold.name}
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
                {canEdit ? (
                  <form action={setHoldAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="gearId" value={item.id} />
                    <label className="text-sm">
                      <span className="sr-only">How many you have</span>
                      <input
                        name="qty"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={mineQty}
                        className="w-16 retro-box-inset bg-white px-2 py-1"
                      />
                    </label>
                    <button type="submit" className="retro-button-yellow rounded-none px-3 py-1 text-xs font-bold uppercase">
                      I have this
                    </button>
                  </form>
                ) : null}
              </div>
              {viewer && canDeleteOwned({ actorRole: viewer.role, actorId: viewer.id, ownerId: item.addedBy }) ? (
                <ConfirmDelete
                  action={deleteGearItemAction}
                  confirm="Remove this item from the list?"
                  fields={{ id: item.id }}
                />
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
