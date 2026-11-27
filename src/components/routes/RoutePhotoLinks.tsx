'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { Button } from '@/components/hub/Button';
import { toggleRoutePhotoLinkAction } from '@/app/routes/actions';
import type { LinkedRoutePhoto, RouteLinkPickerPhoto } from '@/lib/photo-route-links';

export function RoutePhotoGrid({ photos }: { photos: LinkedRoutePhoto[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo) => (
        <Link key={photo.id} href={`/photos/${photo.id}`} className="block panel overflow-hidden">
          <SmallPhotoImage
            url={photo.url}
            thumbUrl={photo.thumbUrl}
            alt={photo.caption ?? 'Photo on this route'}
            width={240}
            height={240}
            className="aspect-square w-full object-cover"
          />
        </Link>
      ))}
    </div>
  );
}

export function RoutePhotoLinkManager({
  trackId,
  photos,
}: {
  trackId: string;
  photos: RouteLinkPickerPhoto[];
}) {
  const [state, action, pending] = useActionState(toggleRoutePhotoLinkAction, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="trackId" value={trackId} />
      <p className="text-sm font-bold">Link photos</p>
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {photos.map((photo) => (
          <li key={photo.id} className="flex items-center gap-2 bg-white p-2 well">
            <SmallPhotoImage
              url={photo.url}
              thumbUrl={photo.thumbUrl}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-cover panel"
            />
            <span className="min-w-0 flex-1 truncate text-sm">{photo.label}</span>
            <Button
              type="submit"
              name="toggle"
              value={photo.linked ? `unlink:${photo.id}` : `link:${photo.id}`}
              kind={photo.linked ? 'gray' : 'yellow'}
              disabled={pending}
            >
              {photo.linked ? 'Unlink' : 'Link'}
            </Button>
          </li>
        ))}
      </ul>
    </form>
  );
}