'use client';

import { useMemo, useState, type ReactNode } from 'react';

/** Rows shown before "See all" on an embedded table. */
export const TABLE_PREVIEW = 8;

export type SortValue = string | number | null;

export type DataColumn<T> = {
  id: string;
  header: string;
  /** Phone-only header. Sorting still uses `id` and `sortValue`. */
  shortHeader?: string;
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
  collapsed = false,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  empty: string;
  defaultSort?: { id: string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  expanded?: (row: T) => ReactNode | null;
  /** Show the first rows, then "See all (N)" / "Show less". Sort still uses every row. */
  collapsed?: boolean;
}) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const [open, setOpen] = useState(false);
  const ordered = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => dir * compare(column.sortValue(a), column.sortValue(b)));
  }, [rows, columns, sort]);

  if (ordered.length === 0) return <p className="text-sm">{empty}</p>;

  const canFold = collapsed && ordered.length > TABLE_PREVIEW;
  const visible = canFold && !open ? ordered.slice(0, TABLE_PREVIEW) : ordered;

  return (
    <div>
    <div className="overflow-x-auto bg-white max-md:border max-md:border-solid max-md:border-[#ccc] md:retro-box-inset">
      <table className="w-full border-collapse text-left text-sm max-md:[&_a]:font-normal max-md:[&_a]:text-[#6b4423] max-md:[&_a]:no-underline md:min-w-[36rem]">
        <thead className="bg-beige font-mono text-[11px] uppercase leading-none md:text-xs md:leading-normal">
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id;
              return (
                <th
                  key={column.id}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`border border-border-gray px-0 py-0 font-bold max-md:border-[#e6e6e6] ${
                    column.sticky || column === columns[0]
                      ? 'cell-primary sticky left-0 z-20 bg-beige max-md:shadow-[1px_0_0_#e6e6e6]'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSort((current) => (
                      current?.id === column.id && current.dir === 'asc'
                        ? { id: column.id, dir: 'desc' }
                        : { id: column.id, dir: 'asc' }
                    ))}
                    className={`flex w-full items-center gap-1 whitespace-nowrap px-1.5 py-1 font-bold uppercase md:px-3 md:py-2 ${column.align === 'right' ? 'justify-end' : 'justify-start'}`}
                  >
                    {column.shortHeader ? (
                      <>
                        <span className="md:hidden">{column.shortHeader}</span>
                        <span className="hidden md:inline">{column.header}</span>
                      </>
                    ) : (
                      <span>{column.header}</span>
                    )}
                    {active ? <span aria-hidden="true">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
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
    {canFold ? (
      <p className="mt-3 text-sm">
        <button
          type="button"
          className="font-bold underline"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Show less' : `See all (${ordered.length})`}
        </button>
      </p>
    ) : null}
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
            className={`border border-border-gray px-3 py-2 align-middle max-md:border-[#e6e6e6] max-md:px-1.5 max-md:leading-5 ${column.align === 'right' ? 'text-right' : ''} ${
              column.sticky || column === columns[0]
                ? 'cell-primary sticky left-0 z-10 bg-white group-hover:bg-beige max-md:shadow-[1px_0_0_#e6e6e6]'
                : 'group-hover:bg-beige/70 max-md:whitespace-nowrap'
            }`}
          >
            {column.cell(row)}
          </td>
        ))}
      </tr>
      {extra ? (
        <tr>
          <td colSpan={columns.length} className="border border-border-gray bg-beige/40 px-3 py-3 max-md:border-[#e6e6e6] max-md:px-2 max-md:py-2">
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
