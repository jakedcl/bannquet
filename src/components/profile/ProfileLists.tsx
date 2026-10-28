'use client';

import { SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import Link from 'next/link';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { DeleteReport } from '@/components/posts/DeleteReport';
import { BrowseTable } from '@/components/ui/BrowseTable';
import type { DataColumn } from '@/components/ui/DataTable';
import { deletePhotoAction, deleteRouteAction } from '@/app/library/actions';
import { deleteClimbAction } from '@/app/peaks/actions';
import { deletePinAction } from '@/app/pins/actions';
import { deleteTripAction } from '@/app/trips/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { PROFILE_PREVIEW } from '@/lib/list-page';
import { formatTripDate } from '@/lib/utils';

export function SeeAll({ href, total }: { href: string; total: number }) {
  if (total <= PROFILE_PREVIEW) return null;
  return (
    <p className="mt-3 text-sm">
      <Link href={href} className="font-bold underline">See all ({total})</Link>
    </p>
  );
}

export function Pager({ page, pages, path }: { page: number; pages: number; path: string }) {
  if (pages < 2) return null;
  const href = (n: number) => (n <= 1 ? path : `${path}?page=${n}`);
  return (
    <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="retro-button-yellow rounded-none px-3 py-1 text-xs font-bold uppercase">Previous</Link>
      ) : null}
      <span>Page {page} of {pages}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="retro-button-yellow rounded-none px-3 py-1 text-xs font-bold uppercase">Next</Link>
      ) : null}
    </p>
  );
}

function activityLabel(activity: string | null | undefined): string | null {
  if (!activity) return null;
  return isActivity(activity) ? ACTIVITY_META[activity].label : activity;
}

function Trash({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

export function PostRows({
  posts,
  manage,
  profilePath,
  collapsed = false,
}: {
  posts: Array<{ id: string; title: string; tripDate: string | null; activity: string | null; tagged: boolean }>;
  manage: boolean;
  profilePath: string;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof posts)[number]>[] = [
    {
      id: 'title',
      header: 'Title',
      sticky: true,
      sortValue: (row) => row.title,
      cell: (row) => <Link href={`/posts/${row.id}`} className="font-bold underline">{row.title}</Link>,
    },
    {
      id: 'date',
      header: 'Date',
      sortValue: (row) => row.tripDate,
      cell: (row) => formatTripDate(row.tripDate),
    },
    {
      id: 'activity',
      header: 'Activity',
      sortValue: (row) => activityLabel(row.activity),
      cell: (row) => activityLabel(row.activity) ?? '—',
    },
  ];
  if (manage) {
    columns.push({
      id: 'delete',
      header: '',
      sortValue: () => null,
      cell: (row) => (row.tagged ? null : (
        <Trash><DeleteReport id={row.id} returnTo={profilePath} /></Trash>
      )),
    });
  }
  return (
    <BrowseTable
      rows={posts}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No posts yet."
      defaultSort={{ id: 'date', dir: 'desc' }}
      placeholder="Post title"
      searchText={(row) => `${row.title} ${activityLabel(row.activity) ?? ''}`}
      facets={[{ id: 'activity', label: 'Activity', value: (row) => activityLabel(row.activity) }]}
      collapsed={collapsed}
    />
  );
}

export function RouteRows({
  routes,
  manage,
  profilePath,
  collapsed = false,
}: {
  routes: Array<{ id: string; name: string; activity: string; distanceM: number | null; elevGainM: number | null; date: string | null }>;
  manage: boolean;
  profilePath: string;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof routes)[number]>[] = [
    {
      id: 'name',
      header: 'Route',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => <Link href={`/routes/${row.id}`} className="font-bold underline">{row.name}</Link>,
    },
    {
      id: 'date',
      header: 'Date',
      sortValue: (row) => row.date,
      cell: (row) => formatTripDate(row.date),
    },
    {
      id: 'activity',
      header: 'Activity',
      sortValue: (row) => activityLabel(row.activity),
      cell: (row) => activityLabel(row.activity) ?? row.activity,
    },
    {
      id: 'distance',
      header: 'Distance',
      align: 'right',
      sortValue: (row) => row.distanceM,
      cell: (row) => (row.distanceM != null ? formatMiles(row.distanceM) : '—'),
    },
    {
      id: 'gain',
      header: 'Gain',
      align: 'right',
      sortValue: (row) => row.elevGainM,
      cell: (row) => (row.elevGainM != null ? formatFeetGain(row.elevGainM) : '—'),
    },
  ];
  if (manage) {
    columns.push({
      id: 'delete',
      header: '',
      sortValue: () => null,
      cell: (row) => (
        <Trash>
          <ConfirmDelete action={deleteRouteAction} confirm="Delete this route?" fields={{ id: row.id, returnTo: profilePath }} />
        </Trash>
      ),
    });
  }
  return (
    <BrowseTable
      rows={routes}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No routes yet."
      defaultSort={{ id: 'date', dir: 'desc' }}
      placeholder="Route name"
      searchText={(row) => `${row.name} ${activityLabel(row.activity) ?? ''}`}
      facets={[{ id: 'activity', label: 'Activity', value: (row) => activityLabel(row.activity) }]}
      collapsed={collapsed}
    />
  );
}

export function PinRows({
  pins,
  manage,
  collapsed = false,
}: {
  pins: Array<{ id: string; title: string; visitedOn: string | null; activity: string | null; kind: string }>;
  manage: boolean;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof pins)[number]>[] = [
    {
      id: 'title',
      header: 'Pin',
      sticky: true,
      sortValue: (row) => row.title,
      cell: (row) => <Link href={`/pins/${row.id}`} className="font-bold underline">{row.title}</Link>,
    },
    {
      id: 'date',
      header: 'Date',
      sortValue: (row) => row.visitedOn,
      cell: (row) => formatTripDate(row.visitedOn),
    },
    {
      id: 'kind',
      header: 'Kind',
      sortValue: (row) => (isPinKind(row.kind) ? PIN_KIND_LABELS[row.kind] : row.kind),
      cell: (row) => (isPinKind(row.kind) ? PIN_KIND_LABELS[row.kind] : row.kind),
    },
  ];
  if (manage) {
    columns.push({
      id: 'delete',
      header: '',
      sortValue: () => null,
      cell: (row) => (
        <Trash>
          <ConfirmDelete action={deletePinAction} confirm="Delete this pin?" fields={{ id: row.id }} />
        </Trash>
      ),
    });
  }
  return (
    <BrowseTable
      rows={pins}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No pins yet."
      defaultSort={{ id: 'title', dir: 'asc' }}
      placeholder="Pin name"
      searchText={(row) => `${row.title} ${activityLabel(row.activity) ?? ''} ${isPinKind(row.kind) ? PIN_KIND_LABELS[row.kind] : ''}`}
      facets={[
        { id: 'activity', label: 'Activity', value: (row) => activityLabel(row.activity) },
        { id: 'kind', label: 'Kind', value: (row) => (isPinKind(row.kind) ? PIN_KIND_LABELS[row.kind] : null) },
      ]}
      collapsed={collapsed}
    />
  );
}

export function PhotoGrid({
  photos,
  manage,
  profilePath,
}: {
  photos: Array<{ id: string; url: string; thumbUrl: string | null; caption: string | null }>;
  manage: boolean;
  profilePath: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <figure key={photo.id} className="relative">
          <Link href={`/photos/${photo.id}`}>
            <SmallPhotoImage
              url={photo.url}
              thumbUrl={photo.thumbUrl}
              alt={photo.caption || ''}
              width={240}
              height={240}
              className="h-28 w-full object-cover retro-box"
            />
          </Link>
          {manage ? (
            <div className="absolute right-1 top-1">
              <ConfirmDelete
                action={deletePhotoAction}
                confirm="Delete this photo?"
                fields={{ id: photo.id, returnTo: profilePath }}
              />
            </div>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

export function TripRows({
  trips,
  manage,
  collapsed = false,
}: {
  trips: Array<{ id: string; title: string; tripDate: string | null; activity?: string | null }>;
  manage: boolean;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof trips)[number]>[] = [
    {
      id: 'title',
      header: 'Trip',
      sticky: true,
      sortValue: (row) => row.title,
      cell: (row) => <Link href={`/trips/${row.id}`} className="font-bold underline">{row.title}</Link>,
    },
    {
      id: 'date',
      header: 'Date',
      sortValue: (row) => row.tripDate,
      cell: (row) => formatTripDate(row.tripDate),
    },
    {
      id: 'activity',
      header: 'Activity',
      sortValue: (row) => activityLabel(row.activity),
      cell: (row) => activityLabel(row.activity) ?? '—',
    },
  ];
  if (manage) {
    columns.push({
      id: 'delete',
      header: '',
      sortValue: () => null,
      cell: (row) => (
        <Trash>
          <ConfirmDelete action={deleteTripAction} confirm="Delete this trip?" fields={{ id: row.id }} />
        </Trash>
      ),
    });
  }
  return (
    <BrowseTable
      rows={trips}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No trips yet."
      defaultSort={{ id: 'date', dir: 'desc' }}
      placeholder="Trip name"
      searchText={(row) => `${row.title} ${activityLabel(row.activity) ?? ''}`}
      facets={[{ id: 'activity', label: 'Activity', value: (row) => activityLabel(row.activity) }]}
      collapsed={collapsed}
    />
  );
}

export function ClimbRows({
  climbs,
  names,
  manage,
  collapsed = false,
}: {
  climbs: Array<{ id: string; peakSlug: string }>;
  names: Record<string, string>;
  manage: boolean;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof climbs)[number]>[] = [
    {
      id: 'peak',
      header: 'Peak',
      sticky: true,
      sortValue: (row) => names[row.peakSlug] ?? 'Peak',
      cell: (row) => (
        <Link href={`/peaks/${row.peakSlug}`} className="font-bold underline">{names[row.peakSlug] ?? 'Peak'}</Link>
      ),
    },
  ];
  if (manage) {
    columns.push({
      id: 'delete',
      header: '',
      sortValue: () => null,
      cell: (row) => (
        <Trash>
          <ConfirmDelete
            action={deleteClimbAction}
            confirm="Delete this climb?"
            fields={{ id: row.id, peakSlug: row.peakSlug }}
          />
        </Trash>
      ),
    });
  }
  return (
    <BrowseTable
      rows={climbs}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No climbs yet."
      defaultSort={{ id: 'peak', dir: 'asc' }}
      placeholder="Peak name"
      searchText={(row) => names[row.peakSlug] ?? ''}
      collapsed={collapsed}
    />
  );
}

export function GearRows({
  items,
  collapsed = false,
}: {
  items: Array<{ id: string; name: string; qty: number }>;
  collapsed?: boolean;
}) {
  const columns: DataColumn<(typeof items)[number]>[] = [
    {
      id: 'name',
      header: 'Item',
      sticky: true,
      sortValue: (row) => row.name,
      cell: (row) => <Link href={`/gear/${row.id}`} className="font-bold underline">{row.name}</Link>,
    },
    {
      id: 'qty',
      header: 'Qty',
      align: 'right',
      sortValue: (row) => row.qty,
      cell: (row) => String(row.qty),
    },
  ];
  return (
    <BrowseTable
      rows={items}
      columns={columns}
      rowKey={(row) => row.id}
      empty="No gear yet."
      defaultSort={{ id: 'name', dir: 'asc' }}
      placeholder="Gear name"
      searchText={(row) => row.name}
      collapsed={collapsed}
    />
  );
}
