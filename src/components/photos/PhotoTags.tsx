import Link from 'next/link';
import type { PhotoDetail } from '@/lib/library';
import { formatTripDate } from '@/lib/utils';

type Tag = { key: string; label: string; href?: string };

/** One quiet line of what a photo connects to. A tag only shows when the data exists. */
export function PhotoTags({ photo }: { photo: PhotoDetail }) {
  const tags: Tag[] = [
    photo.handle
      ? { key: 'who', label: photo.who, href: `/user/${photo.handle}` }
      : { key: 'who', label: photo.who },
    photo.takenOn
      ? { key: 'date', label: `Taken ${formatTripDate(photo.takenOn, 'long')}` }
      : photo.addedOn
        ? { key: 'date', label: `Added ${formatTripDate(photo.addedOn, 'long')}` }
        : null,
    photo.route ? { key: 'route', label: `Route: ${photo.route.title}`, href: `/routes/${photo.route.id}` } : null,
    photo.pinId ? { key: 'pin', label: `Pin: ${photo.pinTitle ?? 'Pin'}`, href: `/pins/${photo.pinId}` } : null,
  ].filter((tag): tag is Tag => Boolean(tag));

  return (
    <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-gray-700">
      {tags.map((tag) => (tag.href ? (
        <Link key={tag.key} href={tag.href} className="inline-flex min-h-11 items-center underline">{tag.label}</Link>
      ) : (
        <span key={tag.key} className="inline-flex min-h-11 items-center">{tag.label}</span>
      )))}
    </p>
  );
}
