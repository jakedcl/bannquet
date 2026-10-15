import Image from 'next/image';
import Link from 'next/link';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { DeleteReport } from '@/components/posts/DeleteReport';
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

function Line({ href, title, detail, action }: { href: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-sm">
        <Link href={href} className="font-bold underline">{title}</Link>
        {detail ? <span className="text-gray-700">{` · ${detail}`}</span> : null}
      </p>
      {action}
    </li>
  );
}

export function PostRows({
  posts,
  manage,
  profilePath,
}: {
  posts: Array<{ id: string; title: string; tripDate: string | null; activity: string | null; tagged: boolean }>;
  manage: boolean;
  profilePath: string;
}) {
  return (
    <ul className="space-y-2">
      {posts.map((post) => (
        <Line
          key={post.id}
          href={`/posts/${post.id}`}
          title={post.title}
          detail={[
            formatTripDate(post.tripDate),
            post.activity && isActivity(post.activity) ? ACTIVITY_META[post.activity].label : '',
            post.tagged ? 'tagged' : '',
          ].filter(Boolean).join(' · ')}
          action={manage && !post.tagged ? <DeleteReport id={post.id} returnTo={profilePath} /> : null}
        />
      ))}
    </ul>
  );
}

export function RouteRows({
  routes,
  manage,
  profilePath,
}: {
  routes: Array<{ id: string; name: string; activity: string; distanceM: number | null; elevGainM: number | null }>;
  manage: boolean;
  profilePath: string;
}) {
  return (
    <ul className="space-y-2">
      {routes.map((route) => (
        <Line
          key={route.id}
          href={`/routes/${route.id}`}
          title={route.name}
          detail={[
            isActivity(route.activity) ? ACTIVITY_META[route.activity].label : route.activity,
            route.distanceM != null ? formatMiles(route.distanceM) : '',
            route.elevGainM != null ? formatFeetGain(route.elevGainM) : '',
          ].filter(Boolean).join(' · ')}
          action={manage ? (
            <ConfirmDelete
              action={deleteRouteAction}
              confirm="Delete this route?"
              fields={{ id: route.id, returnTo: profilePath }}
            />
          ) : null}
        />
      ))}
    </ul>
  );
}

export function PinRows({
  pins,
  manage,
}: {
  pins: Array<{ id: string; title: string; visitedOn: string | null; activity: string | null; kind: string }>;
  manage: boolean;
}) {
  return (
    <ul className="space-y-2">
      {pins.map((pin) => (
        <Line
          key={pin.id}
          href={`/pins/${pin.id}`}
          title={pin.title}
          detail={[
            formatTripDate(pin.visitedOn),
            pin.activity && isActivity(pin.activity) ? ACTIVITY_META[pin.activity].label : '',
            isPinKind(pin.kind) ? PIN_KIND_LABELS[pin.kind] : '',
          ].filter(Boolean).join(' · ')}
          action={manage ? (
            <ConfirmDelete action={deletePinAction} confirm="Delete this pin?" fields={{ id: pin.id }} />
          ) : null}
        />
      ))}
    </ul>
  );
}

export function PhotoGrid({
  photos,
  manage,
  profilePath,
}: {
  photos: Array<{ id: string; url: string; caption: string | null }>;
  manage: boolean;
  profilePath: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <figure key={photo.id} className="relative">
          <Link href={`/photos/${photo.id}`}>
            <Image src={photo.url} alt={photo.caption || ''} width={240} height={240} className="h-28 w-full object-cover retro-box" />
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
}: {
  trips: Array<{ id: string; title: string; tripDate: string | null }>;
  manage: boolean;
}) {
  return (
    <ul className="space-y-2">
      {trips.map((trip) => (
        <Line
          key={trip.id}
          href={`/trips/${trip.id}`}
          title={trip.title}
          detail={formatTripDate(trip.tripDate)}
          action={manage ? (
            <ConfirmDelete action={deleteTripAction} confirm="Delete this trip?" fields={{ id: trip.id }} />
          ) : null}
        />
      ))}
    </ul>
  );
}

export function ClimbRows({
  climbs,
  names,
  manage,
}: {
  climbs: Array<{ id: string; peakSlug: string }>;
  names: Map<string, string>;
  manage: boolean;
}) {
  return (
    <ul className="space-y-2">
      {climbs.map((climb) => (
        <Line
          key={climb.id}
          href={`/peaks/${climb.peakSlug}`}
          title={names.get(climb.peakSlug) ?? 'Peak'}
          action={manage ? (
            <ConfirmDelete
              action={deleteClimbAction}
              confirm="Delete this climb?"
              fields={{ id: climb.id, peakSlug: climb.peakSlug }}
            />
          ) : null}
        />
      ))}
    </ul>
  );
}
