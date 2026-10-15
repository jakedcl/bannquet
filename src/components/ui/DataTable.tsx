'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type SortValue = string | number | null;

export type DataColumn<T> = {
  id: string;
  header: string;
  align?: 'left' | 'right';
  sticky?: boolean;
  sortValue: (row: T) => SortValue;
  cell: (row: T) => ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  defaultSort,
  onRowClick,
  expanded,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  empty: string;
  defaultSort?: { id: string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  expanded?: (row: T) => ReactNode | null;
}) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const ordered = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => dir * compare(column.sortValue(a), column.sortValue(b)));
  }, [rows, columns, sort]);

  if (ordered.length === 0) return <p className="text-sm">{empty}</p>;

  return (
    <div className="retro-box-inset overflow-x-auto bg-white">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="bg-beige font-mono text-xs uppercase">
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id;
              return (
                <th
                  key={column.id}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`border border-border-gray px-0 py-0 font-bold ${column.sticky ? 'sticky left-0 z-20 bg-beige' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setSort((current) => (
                      current?.id === column.id && current.dir === 'asc'
                        ? { id: column.id, dir: 'desc' }
                        : { id: column.id, dir: 'asc' }
                    ))}
                    className={`flex w-full items-center gap-1 px-3 py-2 font-bold uppercase ${column.align === 'right' ? 'justify-end' : 'justify-start'}`}
                  >
                    <span>{column.header}</span>
                    {active ? <span aria-hidden="true">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => {
            const key = rowKey(row);
            const extra = expanded?.(row) ?? null;
            return (
              <Row
                key={key}
                row={row}
                columns={columns}
                clickable={Boolean(onRowClick)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                extra={extra}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Row<T>({
  row,
  columns,
  clickable,
  onClick,
  extra,
}: {
  row: T;
  columns: DataColumn<T>[];
  clickable: boolean;
  onClick?: () => void;
  extra: ReactNode | null;
}) {
  return (
    <>
      <tr
        className={`group ${clickable ? 'cursor-pointer' : ''}`}
        onClick={onClick ? (event) => {
          const target = event.target as HTMLElement;
          if (target.closest('a, button, input, form, select, textarea, label')) return;
          onClick();
        } : undefined}
      >
        {columns.map((column) => (
          <td
            key={column.id}
            className={`border border-border-gray px-3 py-2 align-middle ${column.align === 'right' ? 'text-right' : ''} ${
              column.sticky ? 'sticky left-0 z-10 bg-white group-hover:bg-beige' : 'group-hover:bg-beige/70'
            }`}
          >
            {column.cell(row)}
          </td>
        ))}
      </tr>
      {extra ? (
        <tr>
          <td colSpan={columns.length} className="border border-border-gray bg-beige/40 px-3 py-3">
            {extra}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function compare(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}
